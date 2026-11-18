/**
 * Retrieval eval: measures hit@k and citation accuracy over seed data.
 * Usage: npx tsx scripts/eval.ts
 * Requires: backend server running (uses the live /query endpoint)
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

const API_BASE = process.env['API_BASE'] ?? 'http://localhost:4000';

interface QueryResponse {
  answer: string;
  citations: Array<{ ref: number; title: string | null; snippet: string; score: number }>;
  meta: { retrievedChunks: number; latencyMs: number };
}

async function query(question: string): Promise<QueryResponse> {
  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, topK: 5 }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<QueryResponse>;
}

// 10 Q&A pairs over the seed data
// expectedTitle: the seed note that should appear in top-5 citations
const evalPairs = [
  { question: 'What is RAG?', expectedTitle: 'What is RAG?' },
  { question: 'How does retrieval-augmented generation work?', expectedTitle: 'What is RAG?' },
  { question: 'What is a vector database?', expectedTitle: 'Vector Databases Explained' },
  { question: 'Which vector databases are popular?', expectedTitle: 'Vector Databases Explained' },
  { question: 'What is chunking in RAG?', expectedTitle: 'Chunking Strategies in RAG' },
  { question: 'What chunk size should I use?', expectedTitle: 'Chunking Strategies in RAG' },
  { question: 'What are embeddings?', expectedTitle: 'Embeddings and Semantic Search' },
  { question: 'How does semantic search differ from keyword search?', expectedTitle: 'Embeddings and Semantic Search' },
  { question: 'Is SQLite suitable for production?', expectedTitle: 'SQLite for Production Apps' },
  { question: 'What is WAL mode in SQLite?', expectedTitle: 'SQLite for Production Apps' },
];

async function run() {
  console.log(`Eval against ${API_BASE}\n`);
  console.log('Running 10 queries...\n');

  let hits = 0;
  let citationAccurate = 0;
  const latencies: number[] = [];

  for (const { question, expectedTitle } of evalPairs) {
    try {
      const result = await query(question);
      latencies.push(result.meta.latencyMs);

      // hit@5: did any citation title match the expected note?
      const hit = result.citations.some(
        (c) => c.title?.toLowerCase().includes(expectedTitle.toLowerCase().split(' ')[0]),
      );

      // citation accuracy: answer contains at least one [n] marker
      const hasCitation = /\[\d+\]/.test(result.answer);

      if (hit) hits++;
      if (hasCitation) citationAccurate++;

      const status = hit ? '✓' : '✗';
      console.log(`${status}  Q: "${question}"`);
      if (!hit) console.log(`     Expected: "${expectedTitle}" — got: ${result.citations.map((c) => c.title).join(', ') || 'none'}`);
    } catch (err) {
      console.log(`✗  Q: "${question}" — ERROR: ${err instanceof Error ? err.message : err}`);
    }
  }

  const n = evalPairs.length;
  const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

  console.log('\n─────────────────────────────');
  console.log(`hit@5:             ${hits}/${n}  (${Math.round((hits / n) * 100)}%)`);
  console.log(`citation accuracy: ${citationAccurate}/${n}  (${Math.round((citationAccurate / n) * 100)}%)`);
  console.log(`avg latency:       ${avgLatency}ms`);
  console.log('─────────────────────────────');
}

run().catch(console.error);
