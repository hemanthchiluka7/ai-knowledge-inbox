import type Database from 'better-sqlite3';

export interface Chunk {
  id: number;
  item_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  start_offset: number;
  end_offset: number;
  vec_rowid: number | null;
}

export interface NewChunk {
  item_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  start_offset: number;
  end_offset: number;
}

export function createChunksRepository(db: Database.Database) {
  const stmtInsert = db.prepare<NewChunk>(`
    INSERT INTO chunks (item_id, chunk_index, content, token_count, start_offset, end_offset)
    VALUES (@item_id, @chunk_index, @content, @token_count, @start_offset, @end_offset)
  `);

  // Wraps multiple inserts in a single transaction for performance
  const insertManyTx = db.transaction((chunks: NewChunk[]) => {
    for (const chunk of chunks) {
      stmtInsert.run(chunk);
    }
  });

  const stmtFindById = db.prepare<[number], Chunk>('SELECT * FROM chunks WHERE id = ?');

  const stmtFindByItemId = db.prepare<[string], Chunk>(
    'SELECT * FROM chunks WHERE item_id = ? ORDER BY chunk_index ASC',
  );

  // Note: also delete from chunks_vec (virtual table, no cascade) in the
  // ingestion service after connection.ts wires up sqlite-vec.
  const stmtDeleteByItemId = db.prepare<[string]>('DELETE FROM chunks WHERE item_id = ?');

  return {
    insertMany: (chunks: NewChunk[]): void => { insertManyTx(chunks); },

    findById: (id: number): Chunk | undefined => stmtFindById.get(id),

    findByItemId: (itemId: string): Chunk[] => stmtFindByItemId.all(itemId),

    deleteByItemId: (itemId: string): void => { stmtDeleteByItemId.run(itemId); },
  };
}

export type ChunksRepository = ReturnType<typeof createChunksRepository>;
