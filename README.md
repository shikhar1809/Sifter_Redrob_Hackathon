# Sifter

Sifter helps recruiters turn a messy candidate list into a clear, explainable shortlist.

It is built for people who do not have a big hiring budget, a paid AI account, a GPU, or a technical team sitting beside them. A recruiter should be able to open the app, describe the role, load candidates, and understand why someone was ranked.

Sifter is not trying to replace the recruiter. It does the heavy first pass, explains the evidence, shows possible risks, and leaves the final decision with a human.

## Live Demo

[Open the Firebase app](https://sifter1011.web.app/)

Mirror URL: [https://sifter1011.firebaseapp.com](https://sifter1011.firebaseapp.com/)

Firebase's free `web.app` URL uses the Firebase project id. This project is deployed under `sifter1011`, so the live URL is `sifter1011.web.app`.

## The Hiring Problem

Recruiters are often stuck with:

- too many resumes and not enough time
- candidate data coming from spreadsheets, referrals, job boards, and career pages
- pressure to explain why one person was shortlisted and another was not
- risk of AI bias or hidden unfair filters
- slow tools that break when the candidate list gets large
- expensive systems that small teams cannot afford
- candidates who feel ignored because no one updates them

Sifter was built around those problems first. The product goal is simple: make screening understandable, affordable, private, and fast enough to use in real hiring work.

## Research That Shaped The Solution

Before building the Redrob flow, we treated the challenge folder and hiring workflow as product research, not just data input.

| What we studied | What we learned | What Sifter does because of it |
| --- | --- | --- |
| Redrob challenge job description | The role is not just "AI". It needs production AI systems, retrieval, ranking, evaluation, Python, and product shipping signals. | Scores candidates on job evidence such as retrieval, embeddings, vector search, ranking, evaluation metrics, production ML systems, and shipped work. |
| Redrob candidate data | The dataset is large and cannot be treated like a small spreadsheet. | Added a streaming/local challenge ranker that can process the full 100,000-candidate file without loading it into the browser. |
| Recruiter review habits | Recruiters need a reason, not just a number. | Every shortlisted candidate gets a plain-English explanation with the evidence behind the rank. |
| Bias and compliance risk | Hiring tools can accidentally reward identity clues, school prestige, location shortcuts, or other proxy signals. | Added a bias guardrail that keeps protected/proxy fields out of scoring, caps logistics lift, and shows proxy-distribution warnings. |
| Enterprise hiring requirements | Larger companies need APIs, auditability, configurable workflows, and search across large pools. | Built the foundation for API-backed flows and documented the next production steps clearly. |
| Accessibility and cost | Many users will not have paid AI access, fast machines, or technical support. | Kept the main ranking deterministic, local-first, CPU-only, and explainable. |

## Problem To Solution

| Recruiter problem | Sifter solution |
| --- | --- |
| "I have too many resumes to read." | Creates a ranked shortlist so recruiters start with the strongest matches. |
| "I cannot trust a black-box score." | Shows why each candidate ranked where they did. |
| "AI screening might be biased." | Removes protected/proxy fields from scoring and shows a bias audit in plain English. |
| "My candidate data is sensitive." | Supports local-first ranking so private candidate data does not need to leave the user's machine. |
| "Huge files crash browser tools." | Uses a CLI path for large challenge files and keeps the hosted demo lightweight. |
| "I need something anyone can test." | Deploys a public Firebase app with a Redrob Challenge button. |
| "I need to find one specific candidate later." | Planned production search will index candidates server-side by candidate ID/name, location, skills, experience, salary, availability, rank, and score band. |
| "Candidates feel ignored." | Recruiter-ready outputs exist today; automated candidate status updates are a planned next step. |

## What Sifter Does Today

Sifter has two main workflows.

1. Regular recruiter screening

   Upload a CSV, describe the role, and Sifter creates a shortlist with scores, reasons, risks, missing evidence, and interview questions.

2. Redrob Challenge ranking

   Use the Redrob challenge files, rank candidates for the Senior AI Engineer role, and export a validator-ready submission CSV.

## Redrob Challenge Button

The live app has a **Redrob Challenge** button in Step 1.

In plain English, the button:

1. Sets the role to the Redrob Senior AI Engineer challenge.
2. Loads the prepared challenge result state.
3. Shows that the Redrob data is ready.
4. Waits for the user to click **Rank challenge**.
5. Shows the ranked output, CSV export, and bias audit.

It does not silently jump ahead or auto-process without user control.

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
- Produced `redrob_submission.csv`.
- Passed the official Redrob submission validator.
- Finished the optimized full run in `289.7s` on local hardware.
- Exported the required `candidate_id`, `rank`, `score`, and `reason` fields.
- Kept challenge ranking CPU-only and no-network.
- Avoided using candidate names or school prestige as scoring boosts.
- Added a visible bias guardrail and plain-English audit.
- Deployed the web app on Firebase Hosting.

## Product Readiness

| Capability | Status | Plain-English meaning |
| --- | --- | --- |
| Large data handling | **Working for the challenge.** | The local ranker processed all 100,000 Redrob candidates. Production cloud queues and monitoring are still future work. |
| Parsing and data quality | **Partly done.** | CSV, JSON, JSONL, and gzipped challenge data are supported. Complex PDF/DOC resume parsing and NLP deduplication are not done yet. |
| Semantic matching | **Partly done.** | Sifter uses multiple evidence signals instead of only keyword overlap. True embedding/transformer matching is still a next step. |
| Ranking with reasons | **Strong.** | Shortlisted candidates come with clear reasons that a recruiter can review and challenge. |
| Configurable weights | **Basic today.** | The scoring system is explainable, but recruiter-controlled sliders and saved role templates need more work. |
| Bias and fairness | **Guardrail built.** | Protected attributes and obvious proxy fields are not used for scoring. Full protected-class parity dashboards need more data and enterprise setup. |
| Candidate updates | **Not complete.** | Automatic received/shortlisted/rejected/update messages are planned. |
| ATS/HRIS integration | **Early.** | API foundations exist, but production webhooks and enterprise integrations are not complete. |
| Search across all candidates | **Planned backend feature.** | The right version should search an indexed backend instead of loading every candidate into the browser. |

## Bias Guardrail In Simple Words

Bias in hiring means a person can be helped or hurt by identity clues instead of job ability.

Sifter tries to prevent that by judging candidates on job proof:

- skills
- relevant experience
- production work
- ranking/retrieval/AI evidence
- availability for the role
- recruiter-reviewable reasons

It avoids scoring boosts from names, anonymized names, school prestige, education tier, language, or protected traits. It also limits logistics signals like location, notice period, response rate, and activity so they cannot overpower job evidence.

The app shows a bias audit with proxy-distribution warnings for fields like country, work mode, experience band, notice period, location, and salary band. If something looks uneven, the point is to flag it for human review instead of pretending the algorithm is automatically fair.

Important limitation: the Redrob dataset does not include protected demographic labels, so Sifter cannot prove protected-class parity on that data. What it can do today is remove unsafe scoring inputs, explain the score, and highlight proxy patterns.

## Why Local First

Local first means the heavy ranking can happen on the user's own machine.

That matters because candidate data is sensitive. A list can include names, work history, salary expectations, contact details, and private career signals.

Local-first ranking also helps with access:

- no paid AI account required
- no GPU required
- no per-candidate AI bill
- no hosted LLM dependency during Redrob challenge ranking
- easier to rerun and audit
- easier to explain how a result was produced

## Full Candidate Search Plan

Recruiters eventually need to search the whole pool, not just inspect a shortlist.

The production version should:

1. Ingest the full candidate pool in the backend.
2. Store clean profiles and ranking evidence in an indexed database or search engine.
3. Let recruiters search by candidate ID/name, location, skills, years of experience, salary, availability, education, rank, and score range.
4. Return a candidate's rank, score, and explanation when searched.
5. Load only the current search results page in the browser.
6. Keep raw candidate data private and expose only approved recruiter fields.

For the Redrob challenge, names are anonymized, so search should use candidate ID, location, skills, experience, education, and ranking reason. For normal recruiter uploads, name search can be supported.

## What Is Done

- Regular CSV candidate screening flow.
- Role requirement builder.
- Deterministic local scoring for normal recruiter CSVs.
- Redrob candidate schema parsing.
- Redrob challenge ranking logic.
- Top-100 CSV export in the exact challenge format.
- CLI command for large challenge files.
- Compiled production CLI path for faster full-file ranking.
- API endpoints for Redrob parsing and ranking.
- Web UI support for smaller Redrob JSON/JSONL samples.
- Redrob Challenge button in the hosted app.
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
npm run challenge:rank -- --input "Challenge/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/candidates.jsonl" --output redrob_submission.csv
```

PowerShell version:

```powershell
npm.cmd run challenge:rank -- --input "Challenge\[PUB] India_runs_data_and_ai_challenge\India_runs_data_and_ai_challenge\candidates.jsonl" --output redrob_submission.csv
```

Regenerate the hosted demo asset:

```powershell
npm.cmd run challenge:rank -- --input "Challenge\[PUB] India_runs_data_and_ai_challenge\India_runs_data_and_ai_challenge\candidates.jsonl" --output redrob_submission.csv --asset-output apps\web\public\redrob-challenge-result.json
```

Run on a sample file:

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
- Deployed app includes the Redrob Challenge button and visible bias guardrail.

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
