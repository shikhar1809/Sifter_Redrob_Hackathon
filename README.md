# Sifter

Free, open-source candidate screening for recruiters who need a transparent shortlist before interviews.

Sifter is local-first by default: upload a CSV, define the role, run auditable gates, and export a recruiter report without spending on AI calls. Optional AI assistance can enrich the top recommendations, but it is capped so cost stays predictable.

## Product Promise

- Free local screening for CSV candidate lists
- Deterministic gates recruiters can audit
- Top-candidate reports with strengths, weaknesses, missing evidence, and interview questions
- Optional AI review only for recommended candidates
- No auth required for the local prototype
- Self-hostable, open-source stack

Sifter assists screening. It does not make final hiring decisions.

## Stack

- Vite + React + TypeScript frontend
- Fastify + TypeScript API
- Shared TypeScript core package for parsing and deterministic scoring
- Optional Postgres persistence when `DATABASE_URL` is configured
- Optional Gemini-compatible reviewer through the local API

The app is designed to keep the default path cheap: deterministic screening first, AI only when a user deliberately chooses it.

## Run Locally

```bash
cp .env.example .env
npm install
npm run dev
```

Web: http://127.0.0.1:3000  
API health: http://127.0.0.1:4000/health

Docker services are available for future production-like setup:

```bash
docker compose up -d postgres valkey nats minio keycloak
```

## CSV Columns

Sifter expects these columns:

- `name`
- `experience_years`
- `location`
- `skills`
- `github_url`
- `salary_expectation_lpa`
- `summary`

The web app includes a template download button.

## Cost And Privacy Model

- `Local only` is the default mode and uses deterministic scoring only.
- `AI assisted` is optional.
- AI review is capped to the top 5 recommended candidates.
- The API key stays in `.env` and must never be committed.
- Candidate data should be treated as sensitive hiring data.

For a free public launch, keep Local only as the default and make AI assistance an explicit choice.

## Current Product Surface

- Role requirement builder
- Candidate CSV upload and parser
- Phase-wise workflow
- Deterministic screening gates
- Invite cap and strict filter controls
- Progress/loading overlay
- Recommended candidate report
- CSV export
- Markdown recruiter report export
- Audit gate view
- Cost/privacy trust controls

## Product Direction

The next strongest product steps are:

- Resume/PDF parsing for real recruiter inputs
- Better evidence extraction from messy candidate data
- Bias and compliance audit notes
- One-click PDF report export
- Self-host deployment guide
- Public sample dataset for demos

Sifter should stay focused: it is a screening report tool, not a bloated ATS.
