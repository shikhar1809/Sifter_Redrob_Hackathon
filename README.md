# SeederPro

Open-source recruitment pipeline for role parsing, candidate screening, GitHub probing, simulation kits, and ranked shortlists.

## Stack

- Vite + React + TypeScript frontend
- Fastify + TypeScript API
- Postgres + pgvector for durable data and future retrieval
- Valkey for cache/rate-limit state
- NATS JetStream for background jobs
- MinIO for self-hosted object storage
- Keycloak for self-hosted auth
- vLLM/Ollama-compatible LLM endpoint when model-assisted scoring is enabled

## Run

```bash
cp .env.example .env
docker compose up -d postgres valkey nats minio keycloak
npm install
npm run dev
```

Web: http://127.0.0.1:3000  
API: http://127.0.0.1:4000/health

## Current Product Surface

- Paste or upload candidate CSV data
- Parse role requirements
- Run deterministic, auditable screening gates
- Generate invite previews and simulation prompts
- Enter live simulation scores
- Export ranked shortlist
- Persist pipeline runs when `DATABASE_URL` is available

The deterministic scorer is the default because it never depends on an LLM being available. LLM scoring should be added only behind strict schemas, citations, audit logs, and replayable inputs.
