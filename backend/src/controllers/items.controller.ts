import { Request, Response } from 'express';
import { db } from '../db/connection';
import { createItemsRepository } from '../db/items.repository';
import type { Item, ItemSummary } from '../db/items.repository';
import type { ListItemsQuery } from '../schemas/items.schema';
import { AppError, ErrorCode } from '../lib/errors';

const repo = createItemsRepository(db);

function toSummary(item: ItemSummary) {
  return {
    id: item.id,
    sourceType: item.source_type,
    sourceUrl: item.source_url,
    title: item.title,
    preview: item.preview,
    status: item.status,
    errorMessage: item.error_message,
    chunkCount: item.chunk_count,
    createdAt: item.created_at,
  };
}

function toFull(item: Item) {
  return {
    id: item.id,
    sourceType: item.source_type,
    sourceUrl: item.source_url,
    title: item.title,
    rawContent: item.raw_content,
    status: item.status,
    errorMessage: item.error_message,
    chunkCount: item.chunk_count,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export function listItems(req: Request, res: Response): void {
  // Use req.parsed.query set by validate() middleware (req.query is getter-only in Express v5)
  const query = (req.parsed?.query ?? {}) as ListItemsQuery;
  const limit = typeof query.limit === 'number' ? query.limit : 20;
  const cursor = typeof query.cursor === 'string' ? query.cursor : undefined;
  const status = query.status;
  const { items, nextCursor } = repo.list({ limit, cursor, status });
  res.json({ items: items.map(toSummary), nextCursor });
}

export function getItem(req: Request, res: Response): void {
  const id = String(req.params['id']);
  const item = repo.findById(id);
  if (!item) throw new AppError(ErrorCode.NOT_FOUND, `Item ${id} not found`);
  res.json({ item: toFull(item) });
}

export function deleteItem(req: Request, res: Response): void {
  const id = String(req.params['id']);
  const deleted = repo.deleteByIdCascade(id);
  if (!deleted) throw new AppError(ErrorCode.NOT_FOUND, `Item ${id} not found`);
  res.status(204).send();
}
