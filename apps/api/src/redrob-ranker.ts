import { createReadStream, existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { exportRedrobSubmissionCsv, parseRedrobCandidates, rankRedrobCandidates, redrobCandidateSchema, type RedrobCandidate } from "@seederpro/core";

type CliArgs = {
  input: string;
  output: string;
  limit: number;
};

const args = parseArgs(process.argv.slice(2));
const started = Date.now();
const candidates = await loadCandidates(resolveInputPath(args.input));
const rows = rankRedrobCandidates({ candidates, limit: args.limit });
const outputPath = resolveOutputPath(args.output);
await writeFile(outputPath, `${exportRedrobSubmissionCsv(rows)}\n`, "utf8");

console.log(
  [
    `Ranked ${candidates.length} candidates in ${((Date.now() - started) / 1000).toFixed(1)}s.`,
    `Wrote ${rows.length} rows to ${outputPath}.`,
    rows[0] ? `Top candidate: ${rows[0].candidate_id} (${rows[0].score.toFixed(4)}).` : "No rows were produced.",
  ].join(" "),
);

function parseArgs(argv: string[]): CliArgs {
  const valueAfter = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const positional = argv.filter((value, index) => !value.startsWith("-") && !argv[index - 1]?.startsWith("-"));
  const input = valueAfter("--input") ?? valueAfter("-i") ?? positional[0];
  const output = valueAfter("--output") ?? valueAfter("-o") ?? positional[1] ?? "redrob_submission.csv";
  const limit = Number(valueAfter("--limit") ?? positional[2] ?? 100);
  if (!input) {
    throw new Error("Usage: npm run challenge:rank --workspace @seederpro/api -- --input <candidates.jsonl|json|jsonl.gz> --output <team_id.csv>");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("--limit must be an integer from 1 to 100.");
  }
  return { input, output, limit };
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
    candidates.push(redrobCandidateSchema.parse(JSON.parse(trimmed)));
  }

  return candidates;
}

function resolveInputPath(input: string): string {
  if (isAbsolute(input) || existsSync(input)) return input;
  const repoRelative = resolve(process.cwd(), "../..", input);
  return existsSync(repoRelative) ? repoRelative : input;
}

function resolveOutputPath(output: string): string {
  if (isAbsolute(output)) return output;
  return resolve(process.cwd(), "../..", output);
}
