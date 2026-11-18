/**
 * Seed script: loads sample notes so the app is demo-ready out of the box.
 * Usage: npx tsx scripts/seed.ts
 */
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { resolve } from 'path';
import { mkdirSync } from 'fs';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '../.env') });

const DB_PATH = process.env['DATABASE_PATH'] ?? './data/inbox.db';
mkdirSync(require('path').dirname(resolve(DB_PATH)), { recursive: true });

const db = new Database(resolve(DB_PATH));
sqliteVec.load(db);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const notes = [
  {
    title: 'What is RAG?',
    content: `Retrieval-Augmented Generation (RAG) is an AI architecture that combines information retrieval with Large Language Models (LLMs) to generate accurate, relevant, and context-aware responses. Traditional LLMs generate answers based on training knowledge which may be outdated or insufficient for private data. RAG solves this by retrieving relevant information from external sources before generating a response.

A typical RAG pipeline: documents are chunked, embedded into vectors, and stored in a vector database. When a user asks a question, the query is embedded and a similarity search retrieves the most relevant chunks. These chunks are passed to an LLM as context to generate a grounded answer.

RAG is used in AI chatbots, enterprise knowledge management, customer support, and document analysis. Key advantages: reduces hallucinations, supports private data, and improves relevance.`,
  },
  {
    title: 'Vector Databases Explained',
    content: `A vector database stores data as high-dimensional numerical vectors (embeddings) that capture semantic meaning. Unlike traditional databases that match exact values, vector databases perform similarity search — finding the nearest vectors to a query vector using metrics like cosine similarity or Euclidean distance.

Popular vector databases include Pinecone (managed cloud), Chroma (open-source, local), Qdrant (open-source, production-ready), and pgvector (PostgreSQL extension). Each has tradeoffs: managed services offer scalability, local options offer privacy and zero cost.

Vector databases are foundational to RAG systems, semantic search, recommendation engines, and image similarity search. The core operation — approximate nearest neighbour (ANN) search — is what makes them fast at scale.`,
  },
  {
    title: 'Chunking Strategies in RAG',
    content: `Chunking is the process of splitting documents into smaller pieces before embedding. The strategy significantly impacts retrieval quality.

Fixed-size chunking splits text every N tokens regardless of content boundaries — simple but can break sentences mid-thought. Sentence-based chunking respects natural boundaries but produces variable-size chunks. Paragraph-based chunking preserves semantic units and is a good default.

Chunk size tradeoffs: smaller chunks (128–256 tokens) give precise retrieval but lose context; larger chunks (512–1024 tokens) preserve context but reduce precision. Overlap (10–20% of chunk size) prevents answers that straddle boundaries from being missed.

This app uses ~400 token chunks with ~60 token overlap and paragraph/sentence boundary detection.`,
  },
  {
    title: 'Embeddings and Semantic Search',
    content: `Embeddings are dense numerical vector representations of text that capture semantic meaning. Similar concepts produce similar vectors regardless of exact wording — "car" and "automobile" will be close in embedding space.

Embedding models include OpenAI text-embedding-3-small (1536 dims, high quality, paid), nomic-embed-text (768 dims, free, runs locally via Ollama), and sentence-transformers (open-source, various sizes). The choice affects quality, cost, and latency.

Semantic search finds documents by meaning, not keywords. Combined with keyword search (BM25), hybrid retrieval outperforms either alone. Reciprocal Rank Fusion (RRF) is a simple, effective fusion method: score = Σ 1/(60 + rank) across result lists.`,
  },
  {
    title: 'SQLite for Production Apps',
    content: `SQLite is often underestimated as a production database. With WAL (Write-Ahead Logging) mode, it supports concurrent reads while a single writer is active, making it suitable for many web applications with moderate write volume.

SQLite strengths: zero configuration, single file, ACID compliant, extremely fast for reads, no network overhead. Weaknesses: single writer bottleneck, no built-in replication, file-based (not suitable for multi-server deployments).

sqlite-vec adds vector search to SQLite, eliminating the need for a separate vector database for small to medium workloads (up to ~100k vectors). FTS5 adds full-text search. Together they enable a complete RAG pipeline in a single SQLite file — perfect for local or single-server deployments.`,
  },
];

let inserted = 0;
let skipped = 0;

const checkStmt = db.prepare('SELECT id FROM items WHERE content_hash = ?');
const insertStmt = db.prepare(`
  INSERT INTO items (id, source_type, source_url, title, raw_content, content_hash, status, error_message, chunk_count, created_at, updated_at)
  VALUES (@id, @source_type, @source_url, @title, @raw_content, @content_hash, @status, @error_message, @chunk_count, @created_at, @updated_at)
`);

for (const note of notes) {
  const hash = createHash('sha256').update(note.content).digest('hex');
  const existing = checkStmt.get(hash);
  if (existing) {
    console.log(`  skip  "${note.title}" (already exists)`);
    skipped++;
    continue;
  }

  const now = new Date().toISOString();
  insertStmt.run({
    id: uuidv4(),
    source_type: 'note',
    source_url: null,
    title: note.title,
    raw_content: note.content,
    content_hash: hash,
    status: 'pending',
    error_message: null,
    chunk_count: 0,
    created_at: now,
    updated_at: now,
  });

  console.log(`  added "${note.title}"`);
  inserted++;
}

db.close();

console.log(`\nDone. ${inserted} added, ${skipped} skipped.`);
console.log('Start the backend server to process the pending items (embeddings will be generated automatically).');
