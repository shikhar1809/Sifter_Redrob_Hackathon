# Sifter

Sifter helps recruiters turn a messy candidate list into a clear, explainable shortlist.

The goal is simple: anyone should be able to use it, even if they do not have a big hiring budget, a paid AI account, a GPU, or a technical team sitting beside them.

Sifter does not ask people to blindly trust a black-box score. It shows the evidence, the risks, the missing proof, and the next question to ask. That makes hiring review easier to understand, easier to challenge, and easier to share with a team.

## Live Demo

The Firebase Hosting deployment is here:

```text
https://sifter1011.web.app
```

Firebase also serves the same build here:

```text
https://sifter1011.firebaseapp.com
```

Note: Firebase's free `web.app` URL is tied to the Firebase project id. Because this project id is `sifter1011`, the default domain is `sifter1011.web.app`. The typed domain `sifter.web,app` is not valid because of the comma, and `sifter.web.app` would require a Firebase project id of `sifter`.

This deploy hosts the web app. The API-backed ranking actions still need the local API server or a separate hosted API deployment.

## Why This Exists

Most hiring tools are either expensive, too opaque, or too heavy for small teams. Sifter is built for the opposite kind of user:

- A founder screening candidates alone.
- A recruiter with a spreadsheet and limited time.
- A small team that cannot afford expensive AI calls.
- A hackathon participant who needs a reproducible local ranker.
- Anyone who wants a shortlist with reasons, not just a mystery score.

## Built So Anyone Can Use It

We focused on access from the start:

- No paid AI account required for the main ranking flow.
- No GPU required.
- No external API calls during Redrob challenge ranking.
- Works with simple files like CSV, JSON, and JSONL.
- Runs locally on an ordinary machine.
- Uses plain-English explanations.
- Has a browser UI for smaller files and a CLI for huge files.
- Keeps candidate data under the user's control.
- Avoids using candidate names or school prestige as scoring boosts.
- Uses readable controls, large buttons, labels, and a step-by-step flow.
- Includes responsive screens so the product is usable on smaller devices too.

## Why Local First

Local first means the ranking can happen on your own machine before anything is sent anywhere else.

That matters because candidate data is sensitive. A candidate list can include names, work history, salary expectations, contact details, and private career signals. Sifter's default path keeps that data local and deterministic.

Local first also makes the tool cheaper and more reproducible:

- No per-candidate AI bill.
- No waiting on hosted LLM APIs.
- No network dependency during the Redrob challenge ranking step.
- Easier to rerun and audit.
- Easier to explain how a result was produced.
- Better fit for challenge rules that require CPU-only, no-network ranking.

## Screenshots

### Desktop App

![Sifter desktop app](docs/screenshots/sifter-home.png)

### Simple Workflow

![Sifter workflow](docs/screenshots/sifter-workflow.png)

### Redrob Challenge Output

![Redrob submission preview](docs/screenshots/redrob-output.png)

## What We Built

This project now has two major workflows.

1. Regular recruiter screening

   Upload a simple CSV, describe the role, and Sifter creates a shortlist with reasons, risks, missing evidence, and interview questions.

2. Redrob Hackathon ranking

   Take the Redrob challenge candidate files, rank the best 100 candidates for the Senior AI Engineer job, and export a valid submission CSV.

## The Hero Work

- Built a Redrob challenge ranker that reads JSON, JSONL, and gzipped JSONL candidate files.
- Ranked the full 100,000 candidate challenge file locally.
- Produced a validator-ready `redrob_submission.csv`.
- Passed the official Redrob submission validator.
- Finished the full ranking run in `248.7s`, under the 5-minute challenge limit.
- Added a streaming CLI so huge files do not need to be loaded into the browser.
- Added a web UI mode switch between normal `CSV` screening and `Redrob` challenge data.
- Added clear ranking reasons for every selected candidate.
- Kept challenge ranking local, CPU-only, and no-network.
- Avoided using candidate names or school prestige as scoring boosts.
- Improved mobile readability after screenshot review found narrow-screen overflow.
- Added README screenshots and a plain-language handoff.

## In Plain English

The Redrob challenge asks:

> Out of 100,000 people, who are the best 100 for this Senior AI Engineer role?

Sifter answers that by looking for evidence from the actual job description:

- Has this person built AI systems used in production?
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
- Mobile readability fix for the main hero screen.
- README screenshots and plain-language documentation.

## What Is Not Done Yet

- No trained ML model yet. The current Redrob ranker is deterministic and rule/feature based.
- No guarantee that the ranking perfectly matches Redrob's hidden ground truth.
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

## Firebase Hosting

This repository includes Firebase Hosting config for the web app:

- Project id: `sifter1011`
- Hosting folder: `apps/web/dist`
- Default URL: `https://sifter1011.web.app`

Deploy command:

```bash
npx firebase-tools deploy --only hosting --project sifter1011
```

Already verified:

- `npm.cmd run typecheck`
- `npm.cmd run build`
- Firebase Hosting deploy to `sifter1011`
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
