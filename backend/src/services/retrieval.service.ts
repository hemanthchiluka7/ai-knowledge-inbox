import { db } from '../db/connection';
import { getAiProvider } from '../clients/ai/aiProvider';
import { env } from '../config/env';
import { logger } from '../lib/logger';

export interface RetrievedChunk {
  chunkId: number;
  itemId: string;
  title: string | null;
  sourceType: 'note' | 'url';
  sourceUrl: string | null;
  content: string;
  startOffset: number;
  endOffset: number;
  score: number;       // RRF score
  vectorScore: number; // cosine similarity (1 - distance)
}

/** Strip FTS5 special operators to prevent query syntax errors */
function sanitizeFtsQuery(q: string): string {
  return q.replace(/["'*^():<>{}|?!]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function retrieveChunks(question: string, topK: number): Promise<RetrievedChunk[]> {
  const provider = getAiProvider();
  const [[queryEmbedding]] = await Promise.all([provider.embed([question], 'query')]);

  // 1. Vector search — top 20 nearest neighbours
  const vecRows = db
    .prepare<unknown[], { rowid: number; distance: number }>(`
      SELECT rowid, distance
      FROM chunks_vec
      WHERE embedding MATCH ?
      AND k = 20
      ORDER BY distance
    `)
    .all(new Float32Array(queryEmbedding));

  if (vecRows.length === 0) return [];

  // Map vec rowid → {rank, distance}
  const vecRankMap = new Map<number, { rank: number; distance: number }>();
  vecRows.forEach((r, i) => vecRankMap.set(r.rowid, { rank: i + 1, distance: r.distance }));

  // sqlite-vec returns L2 (Euclidean) distance for float vectors.
  // For unit vectors: cosine_similarity = 1 - (L2² / 2)
  const topDistance = vecRows[0]?.distance ?? 2;
  const topSimilarity = 1 - (topDistance * topDistance) / 2;
  if (topSimilarity < env.RELEVANCE_THRESHOLD) {
    logger.info({ topSimilarity, threshold: env.RELEVANCE_THRESHOLD }, 'query.below_threshold');
    return [];
  }

  // 2. FTS5 BM25 search — top 20 keyword matches
  const ftsQuery = sanitizeFtsQuery(question);
  const ftsRows = ftsQuery
    ? db
        .prepare<unknown[], { rowid: number; score: number }>(`
          SELECT rowid, bm25(chunks_fts) AS score
          FROM chunks_fts
          WHERE chunks_fts MATCH ?
          ORDER BY score
          LIMIT 20
        `)
        .all(ftsQuery)
    : [];

  const ftsRankMap = new Map<number, number>();
  ftsRows.forEach((r, i) => ftsRankMap.set(r.rowid, i + 1));

  // 3. Reciprocal Rank Fusion — score = Σ 1/(60 + rank)
  const allChunkDbIds = new Set([...vecRankMap.keys(), ...ftsRankMap.keys()]);
  const rrfScores = new Map<number, number>();

  for (const id of allChunkDbIds) {
    const vecRank = vecRankMap.get(id)?.rank;
    const ftsRank = ftsRankMap.get(id);
    let score = 0;
    if (vecRank !== undefined) score += 1 / (60 + vecRank);
    if (ftsRank !== undefined) score += 1 / (60 + ftsRank);
    rrfScores.set(id, score);
  }

  // 4. Sort by RRF score, take topK chunk vec rowids
  const ranked = [...rrfScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK);

  if (ranked.length === 0) return [];

  // 5. Fetch chunk + item metadata for each result
  const placeholders = ranked.map(() => '?').join(', ');
  const vecRowids = ranked.map(([id]) => id);

  const rows = db
    .prepare<unknown[], {
      chunk_id: number;
      item_id: string;
      content: string;
      start_offset: number;
      end_offset: number;
      vec_rowid: number;
      title: string | null;
      source_type: 'note' | 'url';
      source_url: string | null;
    }>(`
      SELECT c.id AS chunk_id, c.item_id, c.content, c.start_offset, c.end_offset, c.vec_rowid,
             i.title, i.source_type, i.source_url
      FROM chunks c
      JOIN items i ON c.item_id = i.id
      WHERE c.vec_rowid IN (${placeholders})
        AND i.status = 'ready'
    `)
    .all(...vecRowids);

  // Build result preserving RRF order
  const rowByVecRowid = new Map(rows.map((r) => [r.vec_rowid, r]));

  return ranked
    .map(([vecRowid, rrfScore]) => {
      const row = rowByVecRowid.get(vecRowid);
      if (!row) return null;
      const vecInfo = vecRankMap.get(vecRowid);
      const vectorScore = vecInfo ? 1 - (vecInfo.distance * vecInfo.distance) / 2 : 0;
      return {
        chunkId: row.chunk_id,
        itemId: row.item_id,
        title: row.title,
        sourceType: row.source_type,
        sourceUrl: row.source_url,
        content: row.content,
        startOffset: row.start_offset,
        endOffset: row.end_offset,
        score: rrfScore,
        vectorScore,
      };
    })
    .filter((r): r is RetrievedChunk => r !== null);
}
