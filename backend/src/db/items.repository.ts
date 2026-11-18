import type Database from 'better-sqlite3';

export interface Item {
  id: string;
  source_type: 'note' | 'url';
  source_url: string | null;
  title: string | null;
  raw_content: string | null;
  content_hash: string;
  status: 'pending' | 'ready' | 'failed';
  error_message: string | null;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface ItemSummary {
  id: string;
  source_type: 'note' | 'url';
  source_url: string | null;
  title: string | null;
  preview: string | null;
  status: 'pending' | 'ready' | 'failed';
  error_message: string | null;
  chunk_count: number;
  created_at: string;
}

export interface NewItem {
  id: string;
  source_type: 'note' | 'url';
  source_url: string | null;
  title: string | null;
  raw_content: string | null;
  content_hash: string;
  status: 'pending' | 'ready' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface ListParams {
  limit: number;
  cursor?: string;
  status?: string;
}

export function createItemsRepository(db: Database.Database) {
  const stmtFindById = db.prepare<[string], Item>('SELECT * FROM items WHERE id = ?');

  const stmtFindByHash = db.prepare<[string], Item>(
    'SELECT * FROM items WHERE content_hash = ?',
  );

  const stmtList = db.prepare<
    { status: string | null; cursor: string | null; limit: number },
    ItemSummary
  >(`
    SELECT id, source_type, source_url, title,
      SUBSTR(raw_content, 1, 300) AS preview,
      status, error_message, chunk_count, created_at
    FROM items
    WHERE (@status IS NULL OR status = @status)
      AND (@cursor IS NULL OR created_at < @cursor)
    ORDER BY created_at DESC
    LIMIT @limit
  `);

  const stmtCreate = db.prepare<NewItem>(`
    INSERT INTO items
      (id, source_type, source_url, title, raw_content, content_hash, status, created_at, updated_at)
    VALUES
      (@id, @source_type, @source_url, @title, @raw_content, @content_hash, @status, @created_at, @updated_at)
  `);

  const stmtUpdateStatus = db.prepare<{
    id: string;
    status: string;
    error_message: string | null;
    updated_at: string;
  }>(`
    UPDATE items
    SET status = @status, error_message = @error_message, updated_at = @updated_at
    WHERE id = @id
  `);

  const stmtUpdateChunkCount = db.prepare<{
    id: string;
    chunk_count: number;
    updated_at: string;
  }>(`
    UPDATE items
    SET chunk_count = @chunk_count, status = 'ready', updated_at = @updated_at
    WHERE id = @id
  `);

  const stmtDelete = db.prepare<[string]>('DELETE FROM items WHERE id = ?');

  const stmtFindPending = db.prepare<[], Item>(
    "SELECT * FROM items WHERE status = 'pending' ORDER BY created_at ASC",
  );

  const stmtFindVecRowids = db.prepare<[string], { vec_rowid: number | null }>(
    'SELECT vec_rowid FROM chunks WHERE item_id = ? AND vec_rowid IS NOT NULL',
  );

  // Prepared lazily — chunks_vec virtual table may not exist yet at module load
  let _stmtDeleteVec: ReturnType<typeof db.prepare> | undefined;
  const deleteVec = (rowid: number) => {
    _stmtDeleteVec ??= db.prepare('DELETE FROM chunks_vec WHERE rowid = ?');
    _stmtDeleteVec.run(rowid);
  };

  return {
    findById: (id: string): Item | undefined => stmtFindById.get(id),

    findByHash: (hash: string): Item | undefined => stmtFindByHash.get(hash),

    list: ({ limit, cursor, status }: ListParams): { items: ItemSummary[]; nextCursor: string | null } => {
      const rows = stmtList.all({ status: status ?? null, cursor: cursor ?? null, limit: limit + 1 });
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      return {
        items,
        nextCursor: hasMore ? (items[items.length - 1]?.created_at ?? null) : null,
      };
    },

    create: (input: NewItem): void => { stmtCreate.run(input); },

    updateStatus: (id: string, status: 'pending' | 'ready' | 'failed', errorMessage?: string): void => {
      stmtUpdateStatus.run({ id, status, error_message: errorMessage ?? null, updated_at: new Date().toISOString() });
    },

    updateChunkCount: (id: string, chunkCount: number): void => {
      stmtUpdateChunkCount.run({ id, chunk_count: chunkCount, updated_at: new Date().toISOString() });
    },

    deleteById: (id: string): boolean => stmtDelete.run(id).changes > 0,

    /** Deletes item + cascades chunks; also removes from chunks_vec (no FK cascade on virtual tables). */
    deleteByIdCascade: (id: string): boolean =>
      db.transaction(() => {
        for (const { vec_rowid } of stmtFindVecRowids.all(id)) {
          if (vec_rowid !== null) deleteVec(vec_rowid);
        }
        return stmtDelete.run(id).changes > 0;
      })(),

    findPending: (): Item[] => stmtFindPending.all(),
  };
}

export type ItemsRepository = ReturnType<typeof createItemsRepository>;
