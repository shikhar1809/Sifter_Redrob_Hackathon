# Sifter

Sifter is a local-first candidate screening tool for recruiters and hiring teams who need a shortlist they can explain. It supports the original CSV-based recruiter workflow and a new Redrob challenge workflow for ranking JSON/JSONL candidate profiles against a specific Senior AI Engineer job description.

Sifter assists screening. It does not make final hiring decisions.

## What Is Implemented

- CSV candidate parsing for the regular Sifter recruiter flow.
- Role requirement builder in the web app.
- Deterministic local scoring gates for ordinary candidate CSVs.
- Optional Gemini-assisted review for top recommended candidates when configured.
- Markdown recruiter report export.
- CSV export for regular Sifter shortlist results.
- Redrob JSON and JSONL candidate parsing.
- Redrob challenge ranker for the bundled Senior AI Engineer role.
- Validator-ready Redrob submission CSV export with exactly:
  - `candidate_id`
  - `rank`
  - `score`
  - `reasoning`
- Streaming CLI ranker for large `candidates.jsonl` files.
- Browser UI mode switch between regular `CSV` and `Redrob` candidate data.
- Generated challenge output file: `redrob_submission.csv`.

## Redrob Challenge Work

The challenge bundle in `Challenge/` contains the job description, candidate schema, Redrob behavioral signal reference, sample candidates, validator, and the large candidate pool. The folder is intentionally ignored by git because it contains a large local dataset. Put the official bundle in `Challenge/` locally before running the full ranker.

The challenge ranker is designed for the released Senior AI Engineer role at Redrob AI. It focuses on evidence tied to the job description:

- Production retrieval and ranking systems.
- Embeddings, vector search, hybrid retrieval, and search relevance.
- Evaluation frameworks such as NDCG, MRR, MAP, offline benchmarks, A/B tests, and feedback loops.
- Strong Python and hands-on ML systems work.
- Shipper mindset and production ownership.
- Redrob behavioral signals such as recency, recruiter response rate, notice period, verification, work mode, and relocation fit.

The scorer avoids using candidate name as a signal and does not reward school prestige as a scoring boost. Education fields are parsed for compatibility but are not used to inflate rank.

## What Is Not Done Yet

- No hidden-label training or learned model. The current ranker is deterministic and feature/rule based.
- No hosted LLM calls during challenge ranking. This is intentional to satisfy the challenge's CPU-only, no-network ranking constraint.
- No GPU or embedding model inference during the ranking step.
- No guarantee that the heuristic ranking matches the hidden ground truth perfectly.
- No automated fairness audit report yet beyond the current scoring design choices.
- No resume/PDF extraction for arbitrary recruiter inputs.
- No frontend upload path for the full 487 MB `candidates.jsonl`; use the streaming CLI for the full challenge file.
- No production auth hardening beyond the existing local prototype setup.

## Run Locally

```bash
npm install
npm run dev
```

Web app:

```text
http://127.0.0.1:3000
```

API health:

```text
http://127.0.0.1:4000/health
```

Docker services are available for future production-like setup:

```bash
docker compose up -d postgres valkey nats minio keycloak
```

## Regular CSV Flow

Sifter expects these CSV columns:

- `name`
- `experience_years`
- `location`
- `skills`
- `github_url`
- `salary_expectation_lpa`
- `summary`

Optional but supported:

- `email`

The web app includes a template download button.

## Redrob Challenge CLI

Run the full challenge ranker from the repo root:

```bash
npm run challenge:rank -- --input "Challenge/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/candidates.jsonl" --output redrob_submission.csv
```

For Windows PowerShell, the same command works with backslashes:

```powershell
npm.cmd run challenge:rank -- --input "Challenge\[PUB] India_runs_data_and_ai_challenge\India_runs_data_and_ai_challenge\candidates.jsonl" --output redrob_submission.csv
```

The CLI also supports `.json` sample files and `.jsonl.gz` files:

```bash
npm run challenge:rank -- --input sample_candidates.json --output sample_submission.csv --limit 50
```

## Validation

The generated file was validated with the official challenge validator:

```powershell
python validate_submission.py redrob_submission.csv
```

Result:

```text
Submission is valid.
```

Recent full run:

- Input: `100000` candidates.
- Runtime: `248.7s`.
- Output rows: `100`.
- Top candidate in the generated file: `CAND_0081846`.

## API Endpoints

Regular CSV:

- `POST /csv/parse`
- `POST /pipeline-runs`

Redrob challenge:

- `POST /redrob/parse`
- `POST /redrob/rank`

Example Redrob rank request:

```json
{
  "text": "{\"candidate_id\":\"CAND_0000001\", ...}",
  "limit": 100
}
```

The endpoint returns both structured rows and CSV text.

## Web UI Notes

The candidate upload section now has two modes:

- `CSV`: regular Sifter recruiter workflow.
- `Redrob`: JSON/JSONL challenge workflow for smaller samples.

Large Redrob files should be ranked through the CLI. The browser path intentionally refuses oversized files instead of trying to load hundreds of MB into the client.

## Cost And Privacy Model

- `Local only` remains the default mode.
- The Redrob challenge ranker is local and deterministic.
- No network API calls are made during challenge ranking.
- Optional AI review is only for the regular recruiter flow and remains capped.
- Candidate data should be treated as sensitive hiring data.

## Development Commands

```bash
npm run typecheck
npm run build
npm run challenge:rank -- --input "Challenge/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/candidates.jsonl" --output redrob_submission.csv
```

## Verification Performed

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd run challenge:rank -- --input "Challenge\[PUB] India_runs_data_and_ai_challenge\India_runs_data_and_ai_challenge\candidates.jsonl" --output redrob_submission.csv`
- Official validator on `redrob_submission.csv`

One local UI smoke test could not be completed through the Codex in-app browser because the browser bridge crashed with a Windows sandbox startup error. The TypeScript checks and production build both passed.

## Product Direction

Useful next steps:

- Add a compact fairness audit view for challenge and recruiter rankings.
- Add tests around Redrob scoring edge cases and validator sorting rules.
- Add resume/PDF extraction for real recruiter inputs.
- Add one-click PDF report export.
- Add a hosted sandbox/demo mode with a small sample candidate set.
- Improve the ranker with offline evaluation once labels or feedback data exist.

Sifter should stay focused: it is a transparent screening report tool, not a bloated ATS.
