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

This deploy hosts the web app. The **Redrob Challenge** button works live by loading the full-run challenge data state that was produced after ranking all 100,000 candidates locally. It does **not** auto-run the result screen; it fills the app, waits on the setup step, and lets the user click **Rank challenge** when they are ready. API-backed fresh ranking still needs the local API server or a separate hosted API deployment.

## Redrob Challenge Button

The live app has a **Redrob Challenge** button in Step 1.

In plain English, it does this:

1. Sets the role to the Redrob Senior AI Engineer challenge.
2. Loads the prepared 100,000-candidate challenge state.
3. Shows that the Redrob candidates are ready.
4. Waits for the user to click **Rank challenge**.
5. Then shows the top-100 challenge output, export CSV, and bias audit.

This is intentional. We do not want a button to silently process or jump ahead without user control.

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
- Finished the optimized full ranking run in `289.7s`, under the 5-minute challenge limit.
- Added a streaming CLI so huge files do not need to be loaded into the browser.
- Added a web UI mode switch between normal `CSV` screening and `Redrob` challenge data.
- Added a live `Redrob Challenge` button for the hosted app, so anyone can load the challenge, review the setup, then run and export the full-run challenge output without setting up the repo first.
- Added a visible bias guardrail that removes protected/proxy signals from scoring, caps logistics lift, and shows proxy-distribution warnings.
- Added clear ranking reasons for every selected candidate.
- Kept challenge ranking local, CPU-only, and no-network.
- Avoided using candidate names or school prestige as scoring boosts.
- Improved mobile readability after screenshot review found narrow-screen overflow.
- Added README screenshots and a plain-language handoff.

## Product Readiness Checklist

| Capability | What recruiters and enterprises need | Where Sifter stands today |
| --- | --- | --- |
| Robust, scalable parsing and data quality | Ingest huge volumes from job boards, referrals, career sites, and complex PDF/DOC resumes. Extract skills, roles, education, experience, and deduplicate candidates with NLP. | **Partly done.** The Redrob pipeline processes the full 100,000-candidate challenge dataset locally, including compressed data. Normal CSV/JSON flows work in the app. Complex PDF/DOC parsing and NLP-based deduplication are not production-ready yet. |
| Semantic matching instead of keyword filters | Understand that similar phrases mean the same thing, like "front-end engineer with JS frameworks" and "React developer". Match skills, seniority, location, salary, availability, and career path. | **Partly done.** Sifter already avoids simple keyword-only filtering by using multi-factor evidence and reasons. True embedding/transformer semantic matching is a next step. |
| Ranking plus reason | Produce a ranked shortlist with plain explanations, configurable weights, and feedback learning from recruiter outcomes. | **Strongest area.** The app ranks candidates and explains why each person appears. Challenge ranking returns the top 100 with evidence. Fully configurable weights and recruiter feedback learning are planned next. |
| Bias, fairness, and explainability | Mask protected attributes and obvious proxies. Show why a score happened and monitor score distributions for possible bias. | **Partly done.** The bias guardrail excludes protected/proxy fields from scoring and shows a plain-language audit. Full enterprise fairness dashboards across known demographic groups are not done because the challenge data does not safely provide those protected labels. |
| Candidate experience at scale | Send timely updates when a candidate is received, shortlisted, rejected, or moved to assessment. Collect missing info without overloading recruiters. | **Early.** Sifter includes recruiter-facing outputs and email-ready workflows, but automated candidate messaging and chatbot-style follow-up flows are not complete. |
| Enterprise integration and configurability | Provide APIs/webhooks for ATS/HRIS systems and support workflows by role, region, and compliance requirement. | **Early.** The project includes an API foundation, but full ATS integrations, webhooks, and enterprise workflow rules still need to be built. |
| Performance and reliability | Handle bursty hiring loads where tens of thousands of resumes arrive quickly, while keeping shortlists fast enough for recruiters. | **Proven for the challenge run, not yet production infrastructure.** The local challenge pipeline processed all 100,000 Redrob candidates. Production-grade queues, monitoring, retries, and cloud scaling are still future work. |

## Recruiter Problems And What We Fixed

| Recruiter problem | What Sifter does now |
| --- | --- |
| "I have too many resumes and no time to read all of them." | Creates a ranked shortlist with reasons, so recruiters can start with the strongest matches instead of opening files one by one. |
| "I do not trust a score if I cannot explain it." | Shows why each candidate ranked where they did, including the skills and role evidence that contributed. |
| "AI screening can become biased and create legal risk." | Removes protected attributes and obvious proxy fields from scoring, then displays a bias guardrail audit in plain English. |
| "Large datasets make browser apps slow or crash." | Processes the 100,000-candidate Redrob dataset through a local pipeline and only ships the lightweight shortlist/demo output to Firebase. |
| "I need something anyone can try without setup." | Deploys the app on Firebase at [sifter1011.web.app](https://sifter1011.web.app/), with a Redrob button that loads challenge data instantly. |
| "I do not want private candidate data sent everywhere." | Uses a local-first approach for heavy challenge processing, keeping raw candidate data off the public static website. |
| "I need to find one specific candidate by name, location, skill, or rank." | This is designed as the next backend feature: index the full dataset server-side and let recruiters search/filter without loading 100,000 rows into the browser. |
| "Candidates feel ignored after applying." | Sifter has the structure for recruiter outputs, but automatic candidate status updates are still on the roadmap. |

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
- Runtime: `289.7s`
- Top candidate: `CAND_0081846`

## Are We Processing All 100,000?

Yes, the challenge submission was produced by processing the full `candidates.jsonl` file:

- Raw challenge input: `100,000` candidates
- Raw file size: about `487 MB`
- Ranked output: top `100`
- Optimized full local runtime: `289.7s`

The hosted Firebase app does **not** bundle the raw 487 MB file into every visitor's browser. That would be slow, expensive, and unnecessary for public testing. Instead, the live `Redrob Challenge` button loads the validator-ready top-100 output created from the full run.

That is also how the app stays usable on almost any device. Phones, tablets, and older laptops do not need to score 100,000 profiles in the browser. The heavy ranking path is the compiled local CLI, while the live demo loads a small static result file with the same top-100 output and bias audit, then waits for the user to choose when to show it.

### Why The Website Shows Top 100, Not All 100,000

The live Firebase site is a public, static demo. It intentionally shows the **top 100 ranked candidates**, not the raw 100,000-candidate file.

That choice is deliberate:

- Loading 100,000 full candidate records into every visitor's browser would be slow on phones, tablets, and low-power laptops.
- Shipping the raw challenge file publicly would expose far more candidate data than a recruiter needs for a demo.
- Recruiters usually need a shortlist first, then search and drill-down tools for specific people.
- Firebase Hosting is great for the app and demo output, but the full searchable dataset belongs behind an API and indexed database.

So the current site proves the ranking result quickly. The heavy processing still happens on the full 100,000 candidates.

## Full Candidate Search Plan

The right production version should let recruiters search all candidates without making the website carry all 100,000 records.

For normal uploaded recruiter files, search can work by name, location, skill, experience, salary, availability, rank, and score band. For the Redrob challenge specifically, candidate names are anonymized, so search should use candidate ID, location, skills, experience, education, and ranking reason.

Recommended architecture:

1. Ingest the full dataset in the backend.
2. Store clean candidate profiles and ranking evidence in an indexed database or search engine.
3. Add filters for candidate ID/name, location, skills, years of experience, salary, availability, education, and score range.
4. Add a "find candidate" endpoint that returns that candidate's rank, score, and explanation.
5. Keep the browser fast by loading only the current search page, not the entire 100,000-row dataset.
6. Keep the raw data private and expose only recruiter-approved fields in the UI.

This is how Sifter can support huge hiring drives while still feeling fast on any device.

## What Is Innovative Here?

Sifter is not just doing one hard keyword filter. The Redrob ranker combines multiple evidence signals:

- job-description skill evidence like Python, retrieval, vector search, ranking, evaluation, and production ML systems
- profile and career text evidence
- Redrob platform signals like response rate, notice period, recent activity, profile completeness, and GitHub activity
- production proof and shipper signals
- concern penalties for stale profiles, long notice periods, weak domain evidence, and data-quality traps

Names and school prestige are not used as scoring boosts. The output includes reasoning so a recruiter can challenge the result instead of blindly trusting a score.

What is not live yet is a real learning loop. The current version is deterministic and explainable. A future version should learn from recruiter feedback, interview outcomes, rejection reasons, and successful hires so the weights improve over time instead of staying fixed.

## Bias Guardrail

Bias is a real risk in hiring tools, especially when AI or platform signals are involved. Sifter now has an explicit guardrail:

Layman version:

Sifter should not say someone is better or worse because of identity clues. So it tries to judge candidates by job proof: skills, shipped work, production experience, ranking/retrieval evidence, and availability for the actual role. It ignores things like names and school prestige. It also checks whether the shortlist is leaning too much toward proxy groups, such as one location or notice-period band. If something looks uneven, it marks it for human review instead of pretending the algorithm is automatically fair.

- Protected traits are not requested and are not used for scoring.
- Names, anonymized names, education institution, education tier, language, and school prestige are excluded from Redrob scoring.
- Optional AI review does not receive candidate names.
- AI review text is cleaned if it mentions protected traits like gender, caste, religion, race, disability, marital status, family status, photo, accent, or age.
- Logistics signals like location, notice period, response rate, and activity are capped so they cannot overpower technical and production evidence.
- Proxy-heavy profiles lose score lift when job evidence is weak.
- The UI shows a bias audit with proxy distribution warnings for fields like country, work mode, experience band, notice period, location, and salary band.

This does not prove perfect fairness. The Redrob dataset does not include protected attributes, so Sifter cannot calculate true protected-class parity. What it can do today is remove direct protected/proxy scoring, audit observable proxy fields, and force humans to review any skew before treating the shortlist as final.

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
- Bias audit and AI-review sanitization guardrail.
- Mobile readability fix for the main hero screen.
- README screenshots and plain-language documentation.

## What Is Not Done Yet

- No trained ML model yet. The current Redrob ranker is deterministic and rule/feature based.
- No live improvement loop yet. Recruiter feedback and hiring outcomes are not being used to retrain or reweight the ranker automatically.
- No true protected-class parity report because the source data does not include protected attributes.
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

Regenerate the hosted demo asset too:

```powershell
npm.cmd run challenge:rank -- --input "Challenge\[PUB] India_runs_data_and_ai_challenge\India_runs_data_and_ai_challenge\candidates.jsonl" --output redrob_submission.csv --asset-output apps\web\public\redrob-challenge-result.json
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
- Mirror URL: `https://sifter1011.firebaseapp.com`
- The deployed site includes the Redrob Challenge button, top-100 static challenge asset, and visible bias guardrail.

Why Firebase:

- It gives a simple public URL anyone can open.
- It serves the static web app quickly.
- It keeps the demo cheap and easy to share.
- It avoids forcing visitors to download the 487 MB raw Redrob file.
- It keeps the heavy 100,000-candidate run on the local/CLI path where it belongs.

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
