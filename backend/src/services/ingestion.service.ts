import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection';
import { createItemsRepository } from '../db/items.repository';
import { chunkText } from './chunking.service';
import { fetchUrl } from '../clients/urlFetcher';
import { getAiProvider } from '../clients/ai/aiProvider';
import { jobQueue } from './jobQueue';
import { logger } from '../lib/logger';
import { AppError, ErrorCode } from '../lib/errors';
import type { IngestBody } from '../schemas/ingest.schema';

const itemsRepo = createItemsRepository(db);

export async function ingestItem(input: IngestBody) {
  const contentKey = input.type === 'url' ? input.url : input.content;
  const hash = createHash('sha256').update(contentKey).digest('hex');

  const existing = itemsRepo.findByHash(hash);
  if (existing) {
    throw new AppError(ErrorCode.DUPLICATE_ITEM, 'Content already exists', { id: existing.id });
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  itemsRepo.create({
    id,
    source_type: input.type,
    source_url: input.type === 'url' ? input.url : null,
    title: input.type === 'note' ? (input.title ?? null) : null,
    // Store note content immediately so crash recovery can re-embed it
    raw_content: input.type === 'note' ? input.content : null,
    content_hash: hash,
    status: 'pending',
    created_at: now,
    updated_at: now,
  });

  logger.info({ itemId: id, type: input.type }, 'ingest.received');
  jobQueue.enqueue(() => processItem(id, input));

  return itemsRepo.findById(id)!;
}

async function processItem(id: string, input: IngestBody): Promise<void> {
  try {
    let content: string;
    let title: string | null = null;

    if (input.type === 'url') {
      const fetched = await fetchUrl(input.url);
      content = fetched.text;
      title = fetched.title;
      db.prepare('UPDATE items SET raw_content = @c, title = @t, updated_at = @u WHERE id = @id')
        .run({ c: content, t: title, u: new Date().toISOString(), id });
    } else {
      content = input.content;
      title = input.title ?? (content.split('\n')[0].slice(0, 100) || null);
      db.prepare('UPDATE items SET title = @t, updated_at = @u WHERE id = @id')
        .run({ t: title, u: new Date().toISOString(), id });
    }

    const rawChunks = chunkText(content);
    logger.info({ itemId: id, chunkCount: rawChunks.length }, 'ingest.chunked');

    const provider = getAiProvider();
    const embedStart = Date.now();
    const embeddings: number[][] = [];

    for (let i = 0; i < rawChunks.length; i += 100) {
      const batch = rawChunks.slice(i, i + 100).map((c) => c.content);
      const batchEmbs = await provider.embed(batch, 'document');
      embeddings.push(...batchEmbs);
    }
    logger.info({ itemId: id, ms: Date.now() - embedStart }, 'ingest.embedded');

    db.transaction(() => {
      const chunkInsert = db.prepare(`
        INSERT INTO chunks (item_id, chunk_index, content, token_count, start_offset, end_offset)
        VALUES (@item_id, @chunk_index, @content, @token_count, @start_offset, @end_offset)
      `);
      // sqlite-vec v0.1.6 does not support explicit PK on insert; rowid is auto-assigned
      const vecInsert = db.prepare('INSERT INTO chunks_vec (embedding) VALUES (?)');
      const setVecRowid = db.prepare('UPDATE chunks SET vec_rowid = ? WHERE id = ?');

      for (let i = 0; i < rawChunks.length; i++) {
        const c = rawChunks[i];
        const chunkResult = chunkInsert.run({
          item_id: id,
          chunk_index: i,
          content: c.content,
          token_count: c.tokenCount,
          start_offset: c.startOffset,
          end_offset: c.endOffset,
        });
        const emb = embeddings[i];
        if (emb) {
          const vecResult = vecInsert.run(new Float32Array(emb));
          setVecRowid.run(vecResult.lastInsertRowid, chunkResult.lastInsertRowid);
        }
      }
    })();

    itemsRepo.updateChunkCount(id, rawChunks.length);
    logger.info({ itemId: id, chunkCount: rawChunks.length }, 'ingest.ready');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed';
    const code = err instanceof AppError ? err.code : ErrorCode.INTERNAL_ERROR;
    itemsRepo.updateStatus(id, 'failed', message);
    logger.error({ itemId: id, code }, 'ingest.failed');
  }
}

/** On startup, re-enqueue any items left pending from a previous crash. */
export function reEnqueuePending(): void {
  const pending = itemsRepo.findPending();
  for (const item of pending) {
    logger.info({ itemId: item.id }, 'Crash recovery: re-enqueuing pending item');
    if (item.source_type === 'url' && item.source_url) {
      jobQueue.enqueue(() => processItem(item.id, { type: 'url', url: item.source_url! }));
    } else if (item.raw_content) {
      jobQueue.enqueue(() =>
        processItem(item.id, { type: 'note', content: item.raw_content!, title: item.title ?? undefined }),
      );
    } else {
      itemsRepo.updateStatus(item.id, 'failed', 'Could not recover: content unavailable');
    }
  }
}
