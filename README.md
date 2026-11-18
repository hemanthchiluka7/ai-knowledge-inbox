# AI Knowledge Inbox

A production-style RAG (Retrieval-Augmented Generation) web app that lets you save notes and URLs, then ask questions and get answers with cited sources.

---

## For Reviewers — Run in 3 Steps

```bash
# 1. Clone and configure
git clone <repo-url>
cd ai-knowledge-inbox
cp .env.example .env

# 2. Start (first run downloads ~2.5 GB of models, takes a few minutes, needs ~8 GB RAM)
docker compose up

# 3. Load sample data
docker compose run --rm seed
```

Open **http://localhost:5173** — the app is ready.

> **Note:** The first `docker compose up` pulls the `llama3.2:3b` (~2 GB) and `nomic-embed-text` (~270 MB) models into a named Docker volume. Subsequent starts use the cached models and are fast.

---

## What It Does

- **Save content** — paste text notes or drop in a URL (server fetches and extracts article text)
- **Ask questions** — natural language questions over your saved content
- **Get cited answers** — answers reference specific sources with clickable `[1]` citation chips

---

## Prerequisites (Local Dev)

- Node.js 20 LTS
- [Ollama](https://ollama.com/download) (free, local AI — no API key needed)

```bash
# Pull the two models once
ollama pull nomic-embed-text   # embeddings (~270 MB)
ollama pull llama3.2:3b        # chat (~2 GB)
```

## Quick Start (Local Dev)

```bash
npm install

# Terminal 1 — backend API (port 4000)
npm run dev -w backend

# Terminal 2 — frontend (port 5173)
npm run dev -w frontend
```

Open **http://localhost:5173**

---

## Switch to OpenAI

Edit `.env`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
EMBEDDING_DIMENSIONS=1536
RELEVANCE_THRESHOLD=0.35
```

Restart the backend. The provider interface is identical — no code changes needed.

---

## API Examples

```bash
# Save a note
curl -X POST http://localhost:4000/ingest \
  -H "Content-Type: application/json" \
  -d '{"type":"note","content":"RAG combines retrieval with generation.","title":"RAG basics"}'

# Save a URL
curl -X POST http://localhost:4000/ingest \
  -H "Content-Type: application/json" \
  -d '{"type":"url","url":"https://en.wikipedia.org/wiki/Retrieval-augmented_generation"}'

# List saved items
curl http://localhost:4000/items

# Ask a question
curl -X POST http://localhost:4000/query \
  -H "Content-Type: application/json" \
  -d '{"question":"What is RAG?","topK":5}'

# Health check
curl http://localhost:4000/health
```

---

## Run Tests

```bash
npm run test          # all workspaces
npm run test -w backend   # backend only (56 tests, no Ollama needed)
```

Tests run against an in-memory SQLite database with a fake AI provider — no network, no API key required.

## Run Eval

With the backend running and seed data loaded:

```bash
npx tsx scripts/eval.ts
```

Reports `hit@5` and citation accuracy over 10 Q&A pairs.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `AI_PROVIDER` | `ollama` | `ollama` or `openai` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_EMBEDDING_MODEL` | `nomic-embed-text` | Embedding model |
| `OLLAMA_CHAT_MODEL` | `llama3.2:3b` | Chat model |
| `OPENAI_API_KEY` | — | Required if `AI_PROVIDER=openai` |
| `EMBEDDING_DIMENSIONS` | `768` | 768 for nomic, 1536 for OpenAI |
| `RELEVANCE_THRESHOLD` | `0.35` | Min cosine similarity to trigger LLM |
| `DATABASE_PATH` | `./data/inbox.db` | SQLite file path |
| `PORT` | `4000` | Backend port |

---

## Project Structure

```
ai-knowledge-inbox/
├── backend/src/
│   ├── config/env.ts          # Zod-validated env (fail-fast)
│   ├── clients/ai/            # AiProvider interface + Ollama/OpenAI/Fake
│   ├── clients/urlFetcher.ts  # SSRF-safe URL fetch + Readability
│   ├── services/
│   │   ├── chunking.service.ts   # ~400 token chunks, 60 overlap
│   │   ├── ingestion.service.ts  # fetch → chunk → embed → store
│   │   ├── retrieval.service.ts  # vec KNN + FTS5 + RRF fusion
│   │   └── answer.service.ts     # prompt + LLM + citation parse
│   └── db/
│       ├── connection.ts         # SQLite + sqlite-vec + migrations
│       ├── items.repository.ts
│       └── chunks.repository.ts
└── frontend/src/
    ├── hooks/                 # TanStack Query hooks
    └── components/            # IngestForm, ItemList, AskPanel, AnswerView
```
