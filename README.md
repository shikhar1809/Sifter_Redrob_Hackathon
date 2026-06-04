# Sifter

Sifter helps recruiters turn a messy candidate list into a clear, explainable shortlist.

Instead of saying “trust the AI,” Sifter shows why each person was ranked, what evidence was used, and what still needs to be checked by a human. It is built to stay cheap, private, and useful for real hiring work.

## What We Built

This project now does two important things:

1. Regular recruiter screening  
   Upload a simple CSV, describe the role, and Sifter creates a shortlist with reasons, risks, missing evidence, and interview questions.

2. Redrob Hackathon ranking  
   Take the Redrob challenge candidate files, rank the best 100 candidates for the Senior AI Engineer job, and export a valid submission CSV.

## Screenshots

### Sifter App

![Sifter app home screen](docs/screenshots/sifter-home.png)

### Redrob Challenge Output

![Redrob submission preview](docs/screenshots/redrob-output.png)

## The Hero Work

- Added a Redrob challenge ranker that reads JSON, JSONL, and gzipped JSONL candidate files.
- Ranked the full `100,000` candidate challenge file locally.
- Produced a validator-ready `redrob_submission.csv`.
- Passed the official Redrob submission validator.
- Finished the full ranking run in `248.7s`, under the 5-minute challenge limit.
- Added a streaming CLI so huge files do not need to be loaded into the browser.
- Added a web UI mode switch between normal `CSV` screening and `Redrob` challenge data.
- Added clear ranking reasons for every selected candidate.
- Avoided hosted AI calls during challenge ranking.
- Avoided using candidate names or school prestige as scoring boosts.
- Updated documentation so the project can be understood and run by someone new.

## In Plain English

The Redrob challenge asks:

> “Out of 100,000 people, who are the best 100 for this Senior AI Engineer role?”

Sifter answers that by looking for real evidence from the job description:

- Have they built AI systems used in production?
- Do they know retrieval, embeddings, vector search, and ranking?
- Have they worked with evaluation metrics like NDCG, MRR, MAP, A/B tests, or feedback loops?
- Are they strong with Python and hands-on ML systems?
- Do they look like someone who ships product, not just experiments?
- Are they recently active and likely to respond to recruiters?
- Is their notice period, work mode, and location realistic for the role?

Then Sifter creates a CSV with:

- candidate ID
- rank
- score
- plain-English reasoning

## Current Result

Generated file:

```text
redrob_submission.csv
```

Validation result:

```text
Submission is valid.
```

Recent full run:

- Candidates ranked: `100,000`
- Output rows: `100`
- Runtime: `248.7s`
- Top candidate: `CAND_0081846`

## What Is Done

- Regular CSV candidate screening flow.
- Role requirement builder.
- Deterministic local scoring for normal recruiter CSVs.
- Redrob candidate schema parsing.
- Redrob challenge ranking logic.
- Top-100 CSV export in the exact challenge format.
- CLI command for large challenge files.
- API endpoints for Redrob parsing and ranking.
- Web UI support for smaller Redrob JSON/JSONL samples.
- README screenshots and plain-language handoff.

## What Is Not Done Yet

- No trained ML model yet. The current Redrob ranker is deterministic and rule/feature based.
- No guarantee that the ranking perfectly matches Redrob’s hidden ground truth.
- No hosted LLM calls during the challenge ranking step. This is intentional for the rules.
- No GPU ranking path. Also intentional for the rules.
- No browser upload for the full 487 MB challenge file. Use the CLI for that.
- No resume/PDF parsing yet.
- No full fairness audit dashboard yet.
- No production-grade auth hardening yet.
- No automated test suite for every scoring edge case yet.

## How To Run The App

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

API health check:

```text
http://127.0.0.1:4000/health
```

## How To Run The Redrob Challenge Ranker

Put the official challenge bundle in the local `Challenge/` folder.

Then run:

```bash
npm run challenge:rank -- --input "Challenge/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/candidates.jsonl" --output redrob_submission.csv
```

PowerShell version:

```powershell
npm.cmd run challenge:rank -- --input "Challenge\[PUB] India_runs_data_and_ai_challenge\India_runs_data_and_ai_challenge\candidates.jsonl" --output redrob_submission.csv
```

Run on the sample file:

```bash
npm run challenge:rank -- --input sample_candidates.json --output sample_submission.csv --limit 50
```

## Validate The Submission

Use the official validator from the challenge bundle:

```powershell
python validate_submission.py redrob_submission.csv
```

Expected result:

```text
Submission is valid.
```

## Normal CSV Format

For the regular recruiter flow, Sifter expects:

- `name`
- `experience_years`
- `location`
- `skills`
- `github_url`
- `salary_expectation_lpa`
- `summary`

Optional:

- `email`

## API Endpoints

Regular Sifter flow:

- `POST /csv/parse`
- `POST /pipeline-runs`

Redrob challenge flow:

- `POST /redrob/parse`
- `POST /redrob/rank`

## Privacy And Cost

- Local-only mode is the default.
- The Redrob ranker runs locally.
- The challenge ranking step does not call OpenAI, Gemini, Anthropic, or any hosted AI API.
- Optional Gemini review exists only for the regular recruiter flow and is capped.
- Candidate data should be treated as sensitive.

## Developer Checks

```bash
npm run typecheck
npm run build
```

Already verified:

- `npm.cmd run typecheck`
- `npm.cmd run build`
- full Redrob challenge rank
- official validator on `redrob_submission.csv`

One UI smoke test through the Codex in-app browser could not be completed because the browser bridge crashed with a Windows sandbox startup error. The screenshots in this README were captured from the production build using local Chrome headless.

## Next Best Improvements

- Add tests for Redrob scoring and CSV tie-breaking.
- Add a fairness audit view.
- Add clearer score breakdowns per candidate.
- Add resume and PDF parsing.
- Add a hosted demo with a small public sample.
- Add a PDF report export.
- Improve ranking with real feedback or labels if available.

Sifter should stay focused: shortlist candidates clearly, cheaply, privately, and honestly.
