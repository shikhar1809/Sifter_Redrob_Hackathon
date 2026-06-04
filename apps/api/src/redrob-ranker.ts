import { createReadStream, existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import {
  createRedrobBiasAudit,
  exportRedrobSubmissionCsv,
  parseRedrobCandidates,
  rankRedrobCandidates,
  type RedrobCandidate,
} from "@seederpro/core";

type CliArgs = {
  input: string;
  output: string;
  assetOutput: string | null;
  limit: number;
};

const args = parseArgs(process.argv.slice(2));
const started = Date.now();
const candidates = await loadCandidates(resolveInputPath(args.input));
const rows = rankRedrobCandidates({ candidates, limit: args.limit });
const outputPath = resolveOutputPath(args.output);
await writeFile(outputPath, `${exportRedrobSubmissionCsv(rows)}\n`, "utf8");
if (args.assetOutput) {
  const assetOutputPath = resolveOutputPath(args.assetOutput);
  const asset = {
    label: "Full Redrob challenge output",
    processedCandidates: candidates.length,
    selectedRows: rows.length,
    sourceFile: "candidates.jsonl",
    runtimeSeconds: Number(((Date.now() - started) / 1000).toFixed(1)),
    generatedAt: new Date().toISOString().slice(0, 10),
    note: "This public asset contains the validator-ready top-100 output produced after ranking the full Redrob dataset. It does not bundle the private raw candidate file into the browser.",
    biasAudit: createRedrobBiasAudit(candidates, rows),
    rows,
  };
  await writeFile(assetOutputPath, `${JSON.stringify(asset, null, 2)}\n`, "utf8");
}

console.log(
  [
    `Ranked ${candidates.length} candidates in ${((Date.now() - started) / 1000).toFixed(1)}s.`,
    `Wrote ${rows.length} rows to ${outputPath}.`,
    args.assetOutput ? `Wrote live asset to ${resolveOutputPath(args.assetOutput)}.` : "",
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
  if (!input) {
    throw new Error("Usage: npm run challenge:rank --workspace @seederpro/api -- --input <candidates.jsonl|json|jsonl.gz> --output <team_id.csv>");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("--limit must be an integer from 1 to 100.");
  }
  return { input, output, assetOutput, limit };
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
