import { createReadStream, existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { Worker } from "node:worker_threads";
import { createGunzip } from "node:zlib";
import {
  createRedrobCandidateSearchIndex,
  createRedrobBiasAudit,
  exportRedrobSubmissionCsv,
  parseRedrobCandidates,
  type RedrobCandidate,
  type RedrobRankingRow,
} from "@seederpro/core";

type CliArgs = {
  input: string;
  output: string;
  assetOutput: string | null;
  limit: number;
  batches: number;
  mergeSize: number;
};

const args = parseArgs(process.argv.slice(2));
const started = Date.now();
const candidates = await loadCandidates(resolveInputPath(args.input));
const ranking = await rankRedrobCandidatesInBatches(candidates, {
  limit: args.limit,
  batches: args.batches,
  mergeSize: args.mergeSize,
});
const rankingRuntimeSeconds = Number(((Date.now() - started) / 1000).toFixed(1));
const rows = ranking.rows;
const outputPath = resolveOutputPath(args.output);
await writeFile(outputPath, `${exportRedrobSubmissionCsv(rows)}\n`, "utf8");
if (args.assetOutput) {
  const assetOutputPath = resolveOutputPath(args.assetOutput);
  const searchOutputPath = assetOutputPath.replace(/\.json$/i, "-search-index.json");
  const searchStarted = Date.now();
  const searchIndex = createRedrobCandidateSearchIndex(candidates);
  const asset = {
    label: "Full Redrob challenge output",
    processedCandidates: candidates.length,
    selectedRows: rows.length,
    sourceFile: "candidates.jsonl",
    runtimeSeconds: rankingRuntimeSeconds,
    rankingPlan: ranking.plan,
    generatedAt: new Date().toISOString().slice(0, 10),
    note: "This public asset contains the validator-ready top-100 output produced after ranking the full Redrob dataset. It does not bundle the private raw candidate file into the browser.",
    searchIndexFile: "redrob-challenge-result-search-index.json",
    searchIndexRows: searchIndex.length,
    searchIndexRuntimeSeconds: Number(((Date.now() - searchStarted) / 1000).toFixed(1)),
    biasAudit: createRedrobBiasAudit(candidates, rows),
    rows,
  };
  await writeFile(assetOutputPath, `${JSON.stringify(asset, null, 2)}\n`, "utf8");
  await writeFile(searchOutputPath, `${JSON.stringify({ generatedAt: asset.generatedAt, rows: searchIndex })}\n`, "utf8");
}

console.log(
  [
    `Ranked ${candidates.length} candidates in ${rankingRuntimeSeconds.toFixed(1)}s.`,
    `Batch plan: ${ranking.plan.initialBatches} initial batches, merge size ${ranking.plan.mergeSize}, ${ranking.plan.rounds.length} merge rounds.`,
    args.assetOutput ? `Total asset build time with searchable index: ${((Date.now() - started) / 1000).toFixed(1)}s.` : "",
    `Wrote ${rows.length} rows to ${outputPath}.`,
    args.assetOutput ? `Wrote live asset and search index to ${resolveOutputPath(args.assetOutput)}.` : "",
    rows[0] ? `Top candidate: ${rows[0].candidate_id} (${rows[0].score.toFixed(4)}).` : "No rows were produced.",
  ].filter(Boolean).join(" "),
);

function parseArgs(argv: string[]): CliArgs {
  const valueAfter = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const positional = argv.filter((value, index) => !value.startsWith("-") && !argv[index - 1]?.startsWith("-"));
  const input = valueAfter("--input") ?? valueAfter("-i") ?? positional[0];
  const output = valueAfter("--output") ?? valueAfter("-o") ?? positional[1] ?? "redrob_submission.csv";
  const assetOutput = valueAfter("--asset-output") ?? null;
  const limit = Number(valueAfter("--limit") ?? positional[2] ?? 100);
  const batches = Number(valueAfter("--batches") ?? 10);
  const mergeSize = Number(valueAfter("--merge-size") ?? 2);
  if (!input) {
    throw new Error("Usage: npm run challenge:rank --workspace @seederpro/api -- --input <candidates.jsonl|json|jsonl.gz> --output <team_id.csv> [--batches 10] [--merge-size 2]");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("--limit must be an integer from 1 to 100.");
  }
  if (!Number.isInteger(batches) || batches < 1 || batches > 64) {
    throw new Error("--batches must be an integer from 1 to 64.");
  }
  if (!Number.isInteger(mergeSize) || mergeSize < 2 || mergeSize > 16) {
    throw new Error("--merge-size must be an integer from 2 to 16.");
  }
  return { input, output, assetOutput, limit, batches, mergeSize };
}

type BatchRankingPlan = {
  initialBatches: number;
  requestedBatches: number;
  mergeSize: number;
  rounds: Array<{ round: number; inputGroups: number; outputGroups: number; candidatesConsidered: number }>;
};

async function rankRedrobCandidatesInBatches(
  candidates: RedrobCandidate[],
  options: { limit: number; batches: number; mergeSize: number },
): Promise<{ rows: RedrobRankingRow[]; plan: BatchRankingPlan }> {
  if (!candidates.length) throw new Error("Provide at least one Redrob candidate.");

  const candidateById = new Map(candidates.map((candidate) => [candidate.candidate_id, candidate]));
  const initialBatches = splitIntoBatches(candidates, Math.min(options.batches, candidates.length));
  const plan: BatchRankingPlan = {
    initialBatches: initialBatches.length,
    requestedBatches: options.batches,
    mergeSize: options.mergeSize,
    rounds: [],
  };

  let groups = await Promise.all(
    initialBatches.map(async (batch, index) => {
      const rows = await rankBatch(batch, options.limit);
      console.log(`Batch ${index + 1}/${initialBatches.length}: ${batch.length} candidates -> ${rows.length} winners.`);
      return rowsToCandidates(rows, candidateById);
    }),
  );

  let round = 1;
  while (groups.length > 1) {
    const mergedInputs = chunk(groups, options.mergeSize).map((group) => group.flat());
    const nextGroups = await Promise.all(
      mergedInputs.map(async (batch, index) => {
        const rows = await rankBatch(batch, options.limit);
        console.log(`Merge round ${round}, group ${index + 1}/${mergedInputs.length}: ${batch.length} candidates -> ${rows.length} winners.`);
        return rowsToCandidates(rows, candidateById);
      }),
    );
    plan.rounds.push({
      round,
      inputGroups: groups.length,
      outputGroups: nextGroups.length,
      candidatesConsidered: mergedInputs.reduce((total, batch) => total + batch.length, 0),
    });
    groups = nextGroups;
    round += 1;
  }

  return { rows: await rankBatch(groups[0] ?? [], options.limit), plan };
}

async function rankBatch(candidates: RedrobCandidate[], limit: number): Promise<RedrobRankingRow[]> {
  if (!candidates.length) return [];
  const currentFile = fileURLToPath(import.meta.url);
  const workerFile = currentFile.endsWith(".ts") ? "redrob-batch-worker.ts" : "redrob-batch-worker.js";
  const workerPath = resolve(dirname(currentFile), workerFile);
  return new Promise((resolveRows, reject) => {
    const worker = new Worker(workerPath, { workerData: { candidates, limit } });
    worker.once("message", (message: { ok: boolean; rows?: RedrobRankingRow[]; error?: string }) => {
      if (message.ok && message.rows) {
        resolveRows(message.rows);
        return;
      }
      reject(new Error(message.error ?? "Batch ranking failed"));
    });
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code !== 0) reject(new Error(`Batch worker stopped with exit code ${code}.`));
    });
  });
}

function rowsToCandidates(rows: RedrobRankingRow[], candidateById: Map<string, RedrobCandidate>): RedrobCandidate[] {
  return rows.map((row) => candidateById.get(row.candidate_id)).filter((candidate): candidate is RedrobCandidate => Boolean(candidate));
}

function splitIntoBatches<T>(items: T[], batchCount: number): T[][] {
  const batches: T[][] = [];
  const size = Math.ceil(items.length / batchCount);
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function loadCandidates(input: string): Promise<RedrobCandidate[]> {
  if (input.endsWith(".json")) {
    return parseRedrobCandidates(await readFile(input, "utf8"));
  }

  const stream = input.endsWith(".gz") ? createReadStream(input).pipe(createGunzip()) : createReadStream(input);
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  const candidates: RedrobCandidate[] = [];

  for await (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    candidates.push(JSON.parse(trimmed) as RedrobCandidate);
  }

  return candidates;
}

function resolveInputPath(input: string): string {
  if (isAbsolute(input) || existsSync(input)) return input;
  const repoRelative = resolve(repoRoot(), input);
  return existsSync(repoRelative) ? repoRelative : input;
}

function resolveOutputPath(output: string): string {
  if (isAbsolute(output)) return output;
  return resolve(repoRoot(), output);
}

function repoRoot(): string {
  const cwd = process.cwd();
  if (existsSync(resolve(cwd, "apps")) && existsSync(resolve(cwd, "packages"))) return cwd;
  const workspaceRoot = resolve(cwd, "../..");
  return existsSync(resolve(workspaceRoot, "apps")) && existsSync(resolve(workspaceRoot, "packages")) ? workspaceRoot : cwd;
}
