# AI Knowledge Inbox — Project Guide for Claude Code

This file is the single source of truth for this project. Read it fully before doing any work.
Build in the phases listed at the bottom, one phase at a time. After each phase: run lint,
typecheck and tests, fix failures, then stop and summarize what was done before starting the next phase.

## 1. What we are building

A small, production-style web app (interview assignment for Turium AI) that lets a single user:

1. Save short **text notes** or **URLs** (URL content is fetched server-side).
2. **Ask questions** over saved content.
3. Get **answers from a RAG pipeline** with **cited sources**.

Timebox: 6–12 hours of real work. Reviewers grade: API design, error handling, input validation,
structured logging, separation of concerns, no god files, clear naming, and tradeoff awareness.
**Clarity and correctness over features. Do not overengineer.**

Explicitly out of scope: authentication, Kubernetes, LangChain/LlamaIndex, external vector DBs,
Redis, message brokers.

## 2. Tech stack

**Runtime / tooling**
- Node.js 20 LTS, TypeScript strict mode, npm workspaces monorepo
- ESLint + Prettier, `tsx` for dev, `tsc` for build

**Backend (`/backend`)**
- `express` v5
- `zod` — request validation + env validation
- `pino` + `pino-http` — structured JSON logging with request IDs (`pino-pretty` in dev only)
- AI provider pluggable via `AI_PROVIDER` env var:
  - `ollama` (default) — `nomic-embed-text` (768 dims), `llama3.2:3b`
  - `openai` (optional) — `text-embedding-3-small` + `gpt-4o-mini`
  - Both implement `AiProvider` interface (`embed(texts[])`, `chat(messages)`)
- `better-sqlite3` + `sqlite-vec` — relational + vector search
- SQLite FTS5 — keyword search for hybrid retrieval
- `js-tiktoken` — token-aware chunking
- `@mozilla/readability` + `jsdom` — extract article text from URLs
- `ipaddr.js` — SSRF protection
- `cors`, `helmet`
- Tests: `vitest`, `supertest`, `nock`

**Frontend (`/frontend`)**
- React 18 + Vite + TypeScript
- `@tanstack/react-query` — server state, loading/error states, polling
- Tailwind CSS + shadcn/ui (Button, Input, Textarea, Card, Badge, Tabs)
- Tests: `vitest` + `@testing-library/react`

**Delivery**
- Docker + `docker-compose.yml` — one-command startup
- GitHub Actions CI: lint, typecheck, test (all AI calls mocked)

## 3. Repository structure

See the directory tree in the codebase. Key rules:
- Controllers never touch the DB directly. Services never import Express.
- No file over ~200 lines. If it grows, split it.
- No duplicated logic: shared helpers go in `lib/`.
- Every external dependency sits behind a small interface so tests can inject fakes.

## 4. Database schema

See `backend/src/db/migrations/001_init.sql`.

Tables: `items`, `chunks`, `meta`
Virtual tables: `chunks_vec` (sqlite-vec, created at runtime), `chunks_fts` (FTS5)

## 5. API contract

All responses are JSON. All errors use one envelope:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...], "requestId": "..." } }
```

Endpoints:
- `POST /ingest` — 202 Accepted (async processing via jobQueue)
- `GET /items?limit=20&cursor=...&status=ready` — paginated list
- `GET /items/:id` — single item with raw content
- `DELETE /items/:id` — 204
- `POST /query` — returns answer + citations
- `GET /health` — `{ "status": "ok", "db": "ok" }`

## 6. Core logic

- **URL fetching**: SSRF-safe (ipaddr.js), 10s timeout, 2 MB max, text/html only, max 3 redirects
- **Chunking**: ~400 tokens, ~60 token overlap, paragraph/sentence boundaries, track offsets
- **Embeddings**: batch embed, task prefixes for nomic-embed-text, exponential backoff
- **Retrieval**: vector (top 20) + FTS5 BM25 (top 20) → RRF fusion → relevance threshold → top K
- **Answer**: temperature 0.2, cite with [n], sources as numbered blocks, treat as untrusted data

## 7. Frontend

Three panels: Add Content (Note/URL tabs) | Saved Items (poll 2s while pending) | Ask (citation click-to-highlight)

## 8. Testing

- Unit: chunking, RRF, SSRF validator, schemas, citation parsing
- Integration (supertest): ingest → list → query with fake.provider.ts + nock
- Error cases: 400, 404, 409, 422 envelopes
- Tests must pass with no network, no Ollama, no API key

## 9. Documentation

- `README.md`: "For reviewers — run in 3 steps" section first
- `DESIGN.md`: architecture diagram, chunking rationale, provider tradeoffs, scale limitations, production roadmap, eval results

## 10. Build phases

- **Phase 0 — Scaffold**: monorepo, configs, stubs, /health works ✅
- **Phase 1 — Backend foundation**: env validation, logger, error handler, DB + migrations, repositories
- **Phase 2 — Ingestion**: POST /ingest, GET /items, job queue, URL fetcher, chunking, embeddings
- **Phase 3 — Retrieval + answers**: vector + FTS + RRF, answer service, POST /query
- **Phase 4 — Frontend**: full UI with citation click-to-highlight
- **Phase 5 — Quality**: seed, eval, remaining tests, lint clean
- **Phase 6 — Docs**: README, DESIGN.md, docker compose up from clean clone

## 11. Working rules

- Ask before adding any dependency not in section 2.
- Use conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Never hardcode secrets or model names outside `config/env.ts`.
- The app must cost nothing to run by default (`AI_PROVIDER=ollama`).
- If a library API differs from what is described, follow the actual API, note the deviation.
