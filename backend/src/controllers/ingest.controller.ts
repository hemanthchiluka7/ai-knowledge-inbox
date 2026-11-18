import { Request, Response } from 'express';
import { ingestItem } from '../services/ingestion.service';
import type { Item } from '../db/items.repository';

function toIngestResponse(item: Item) {
  return {
    id: item.id,
    sourceType: item.source_type,
    sourceUrl: item.source_url,
    status: item.status,
    createdAt: item.created_at,
  };
}

export async function postIngest(req: Request, res: Response): Promise<void> {
  const item = await ingestItem(req.parsed?.body ?? req.body);
  res.status(202).json({ item: toIngestResponse(item) });
}
