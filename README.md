# Sifter

Sifter helps recruiters turn a messy candidate list into a clear, explainable shortlist.

It is built for people who need hiring help but may not have a big budget, a paid AI account, a GPU, or a technical team beside them. A recruiter should be able to open the app, describe the role, load candidates, and understand why someone was ranked.

Sifter is not trying to replace the recruiter. It does the heavy first pass, explains the evidence, points out risks, and leaves the final decision with a human.

## Live Demo

[Open Sifter on Firebase](https://sifter1011.web.app/)

Mirror URL: [https://sifter1011.firebaseapp.com](https://sifter1011.firebaseapp.com/)

The Firebase project id is `sifter1011`, so the default free Firebase domain is `sifter1011.web.app`.

## The Flow

Sifter was built as a chain of product decisions. Each feature exists because of a real recruiting problem.

## 1. Start With A Role, Not A Magic Score

**Problem:** Recruiters do not need a random AI score. They need to know what the job actually requires.

**Decision:** Make the role the first step. The user defines title, experience, stack, location, salary, project expectations, and extra notes.

**What we built:** A role builder with templates for common roles, including the Redrob Senior AI Engineer role.

**What is different:** Sifter does not start by ranking blindly. It first builds a job brief, then judges candidates against that brief.

## 2. Accept Simple Candidate Data

**Problem:** Many recruiters do not have a clean ATS export. They may only have a CSV or challenge file.

**Decision:** Support practical file formats first instead of forcing users into a heavy enterprise setup.

**What we built:** Candidate ingestion for CSV, JSON, JSONL, and gzipped Redrob challenge data. The normal app flow works with simple recruiter CSVs. The Redrob ranker works with the challenge candidate files.

**What is different:** Sifter is usable by a founder, recruiter, student, or hackathon reviewer without buying a recruiting platform first.

## 3. Keep Large Processing Out Of The Browser

**Problem:** Huge candidate lists can crash browser apps or make phones and older laptops unusable.

**Decision:** Use the browser for interaction and the local CLI for very large ranking jobs. For the large path, split the candidate pool into parallel batches, rank each batch, then merge the winners in rounds.

**What we built:** A batch-tournament Redrob ranker. By default, `100,000` candidates are split into `10` batches. Each batch is ranked in parallel. Then Sifter combines two ranked batches at a time, ranks that smaller winner pool, and repeats until one final top list remains.

**What is different:** The website stays lightweight, while the heavy ranking path becomes easier to scale. Instead of making one giant ranking pass carry all the pressure, Sifter reduces the problem in stages: `10 batches -> 5 merged batches -> 3 -> 2 -> 1 final ranking`.

## 4. Rank With Evidence, Not Just Keywords

**Problem:** Keyword filters miss good candidates and reward people who stuff resumes with exact words.

**Decision:** Use multiple evidence signals instead of a single keyword match.

**What we built:** The Redrob ranker looks for job-specific evidence such as Python, retrieval, embeddings, vector search, ranking, evaluation metrics, production ML systems, shipped work, recent activity, notice period, and recruiter response signals.

**What is different:** The rank is not only "does the resume contain this word?" It asks whether the candidate looks capable for this specific job.

## 5. Explain Every Shortlist

**Problem:** Recruiters, founders, and compliance teams cannot act on a black-box score.

**Decision:** Every recommended candidate should come with a reason.

**What we built:** Candidate output includes rank, score, and plain-English reasoning. Normal recruiter reports include strengths, weaknesses, missing evidence, next action, and interview questions.

**What is different:** Sifter does not just say "Rank 1". It explains why the candidate made the shortlist and what still needs to be checked.

## 6. Add Reviewer Agents To Challenge The Result

**Problem:** One ranking view can miss things. Hiring teams usually look at the same candidate from different angles.

**Decision:** Add small reviewer agents that cross-question the final output.

**What we built:** Final results now include four perspectives:

- **Hiring Manager:** can this person do the actual job?
- **Interview Designer:** what should we ask to test the weakest assumption?
- **Recruiter Ops:** are salary, location, notice, and availability practical?
- **Bias & Compliance:** are we deciding based on job proof, not identity clues or proxies?

**What is different:** The result is not one opinion pretending to be final truth. It is a shortlist plus 3-4 structured challenges before a human decision.

## 7. Build Bias Guardrails Into The Workflow

**Problem:** AI hiring tools can accidentally reward identity clues, school prestige, location shortcuts, or other proxy signals.

**Decision:** Keep protected and proxy fields out of scoring, then show a bias audit in plain English.

**What we built:** Sifter avoids scoring boosts from names, anonymized names, school prestige, education tier, language, or protected traits. It also limits logistics signals like location, notice period, response rate, and activity so they cannot overpower job evidence.

**What is different:** Sifter does not say "trust the AI". It shows what was excluded, what was checked, and where a human should review possible skew.

Important limitation: the Redrob dataset does not include protected demographic labels, so Sifter cannot prove protected-class parity on that data. What it can do today is remove unsafe scoring inputs, explain the score, and highlight proxy patterns.

## 8. Stay Local First

**Problem:** Candidate data is sensitive and AI calls can become expensive.

**Decision:** Make the main ranking flow local-first and deterministic.

**What we built:** The Redrob challenge ranking runs locally, CPU-only, and no-network. No hosted LLM call is required for the challenge ranking step.

**What is different:** Sifter can be cheaper, more private, easier to rerun, and easier to audit.

## 9. Make The Challenge Easy To Test Live

**Problem:** Reviewers should be able to try the app without setting up the repo.

**Decision:** Add a live Redrob Challenge button.

**What we built:** The button loads the prepared Redrob challenge result state, waits for the user to click **Rank challenge**, then shows ranked output, CSV export, reviewer agents, and bias audit.

**What is different:** The button does not silently jump ahead. It prepares the app and keeps the user in control.

## 10. Plan For Full Candidate Search

**Problem:** Recruiters eventually need to search a full pool by candidate, location, skill, experience, salary, availability, rank, and score.

**Decision:** Do not load the entire large dataset into every browser. Build search as a backend-indexed feature.

**What we built today:** The README documents the production search plan. Normal uploads can support name search. Redrob challenge names are anonymized, so that flow should search by candidate ID, location, skills, experience, education, and ranking reason.

**What is different:** The right production design keeps raw candidate data private and only loads the current search result page in the browser.

## Research That Shaped The Product

| Research input | What we learned | Product decision |
| --- | --- | --- |
| Redrob job description | The role needs production AI, retrieval, ranking, evaluation, Python, and shipping ability. | Score on role evidence, not generic "AI" labels. |
| Redrob candidate data | The data is too large for a browser-first ranking path. | Build a local streaming CLI for the full run. |
| Recruiter workflows | Recruiters need reasons they can defend. | Show rank, score, evidence, missing proof, and next questions. |
| Bias/compliance risk | Hiring tools can amplify unfair shortcuts. | Exclude protected/proxy scoring inputs and show an audit. |
| Small-team access | Many users cannot pay for AI or enterprise ATS tools. | Keep the core flow local, cheap, and simple. |
| Hiring team review | Different stakeholders ask different questions. | Add reviewer agents for hiring, interview, ops, and bias/compliance views. |

## Screenshots

### Desktop App

![Sifter desktop app](docs/screenshots/sifter-home.png)

### Simple Workflow

![Sifter workflow](docs/screenshots/sifter-workflow.png)

### Redrob Challenge Output

![Redrob submission preview](docs/screenshots/redrob-output.png)

## What We Proved

- Processed the full Redrob challenge dataset locally.
- Ranked `100,000` candidate records.
- Added a parallel batch-tournament ranking path with default `10` initial batches and pairwise merge rounds.
- Produced `redrob_submission.csv`.
- Passed the official Redrob submission validator.
- Finished the batch-tournament full run in `37.2s` on local hardware.
- Merged `10` initial batches down to the final ranking in `4` merge rounds.
- Exported the required `candidate_id`, `rank`, `score`, and `reason` fields.
- Kept challenge ranking CPU-only and no-network.
- Avoided using candidate names or school prestige as scoring boosts.
- Added a visible bias guardrail and plain-English audit.
- Added four reviewer agents on final output.
- Deployed the web app on Firebase Hosting.

## What Is Done

- Role requirement builder.
- Regular CSV candidate screening flow.
- Deterministic local scoring for normal recruiter CSVs.
- Redrob candidate schema parsing.
- Redrob challenge ranking logic.
- Parallel batch processing and merge-round ranking for large Redrob files.
- Top-100 CSV export in the exact challenge format.
- CLI command for large challenge files.
- Compiled production CLI path for faster full-file ranking.
- API endpoints for Redrob parsing and ranking.
- Web UI support for smaller Redrob JSON/JSONL samples.
- Redrob Challenge button in the hosted app.
- Cross-question reviewer agents on final results.
- Bias audit and AI-review sanitization guardrail.
- Firebase Hosting deployment.
- README screenshots and layman-first documentation.

## What Is Not Done Yet

- No trained ML model yet. The current Redrob ranker is deterministic and feature based.
- No embedding/transformer semantic matching yet.
- No live improvement loop yet. Recruiter feedback and hiring outcomes are not being used to retrain or reweight the ranker automatically.
- No complex PDF/DOC resume parsing yet.
- No NLP-based candidate deduplication yet.
- No full candidate search backend yet.
- No automated candidate status messaging yet.
- No production ATS/HRIS webhooks yet.
- No true protected-class parity report because the source data does not include protected attributes.
- No full fairness dashboard yet.
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

Run:

```bash
npm run challenge:rank -- --input "Challenge/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/candidates.jsonl" --output redrob_submission.csv --batches 10 --merge-size 2
```

PowerShell version:

```powershell
npm.cmd run challenge:rank -- --input "Challenge\[PUB] India_runs_data_and_ai_challenge\India_runs_data_and_ai_challenge\candidates.jsonl" --output redrob_submission.csv --batches 10 --merge-size 2
```

Regenerate the hosted demo asset:

```powershell
npm.cmd run challenge:rank -- --input "Challenge\[PUB] India_runs_data_and_ai_challenge\India_runs_data_and_ai_challenge\candidates.jsonl" --output redrob_submission.csv --asset-output apps\web\public\redrob-challenge-result.json --batches 10 --merge-size 2
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

## Developer Checks

Run these before shipping code changes:

```bash
npm run typecheck
npm run build
```

## Firebase Hosting

This repository includes Firebase Hosting config for the web app:

- Project id: `sifter1011`
- Hosting folder: `apps/web/dist`
- Default URL: `https://sifter1011.web.app`
- Mirror URL: `https://sifter1011.firebaseapp.com`
- Deployed app includes the Redrob Challenge button, reviewer agents, and visible bias guardrail.

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

## Next Best Improvements

- Add full candidate search with backend indexing.
- Add tests for Redrob scoring and CSV tie-breaking.
- Add a fairness audit dashboard.
- Add clearer score breakdowns per candidate.
- Add resume and PDF parsing.
- Add NLP-based candidate deduplication.
- Add ATS/HRIS webhooks.
- Add automated candidate status updates.
- Add recruiter feedback learning.

Sifter should stay focused: shortlist candidates clearly, cheaply, privately, and honestly.
