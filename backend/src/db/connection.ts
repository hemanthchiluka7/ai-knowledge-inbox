import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { mkdirSync } from 'fs';
import { env } from '../config/env';
import { logger } from '../lib/logger';

function openDatabase(): Database.Database {
  // Ensure the data directory exists
  const dbDir = dirname(resolve(env.DATABASE_PATH));
  mkdirSync(dbDir, { recursive: true });

  const db = new Database(env.DATABASE_PATH);

  // Load sqlite-vec extension (must happen before any vec0 table access)
  sqliteVec.load(db);

  // WAL mode: readers don't block writers, writers don't block readers
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  ensureVecTable(db);
  checkEmbeddingModel(db);

  logger.info({ path: env.DATABASE_PATH }, 'Database opened');
  return db;
}

function runMigrations(db: Database.Database): void {
  const migrationPath = resolve(__dirname, 'migrations/001_init.sql');
  const sql = readFileSync(migrationPath, 'utf-8');
  db.exec(sql);
}

function ensureVecTable(db: Database.Database): void {
  // chunks_vec cannot live in the SQL file because the dimension is a runtime value.
  // IF NOT EXISTS is not supported on virtual tables in older SQLite — check manually.
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chunks_vec'")
    .get();

  if (!exists) {
    // No explicit PK — sqlite-vec v0.1.6 auto-assigns rowids for inserts
    db.exec(`
      CREATE VIRTUAL TABLE chunks_vec USING vec0(
        embedding float[${env.EMBEDDING_DIMENSIONS}]
      )
    `);
    logger.info({ dims: env.EMBEDDING_DIMENSIONS }, 'Created chunks_vec table');
  }
}

function checkEmbeddingModel(db: Database.Database): void {
  db.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");

  const stored = db
    .prepare<[], { value: string }>("SELECT value FROM meta WHERE key = 'embedding_model'")
    .get();

  const currentModel =
    env.AI_PROVIDER === 'openai' ? env.OPENAI_EMBEDDING_MODEL : env.OLLAMA_EMBEDDING_MODEL;

  if (!stored) {
    db.prepare("INSERT INTO meta (key, value) VALUES ('embedding_model', ?)").run(currentModel);
  } else if (stored.value !== currentModel) {
    logger.warn(
      { stored: stored.value, current: currentModel },
      'Embedding model changed — existing items must be re-embedded (dimension mismatch will break search)',
    );
  }
}

// Singleton — the whole app shares one connection
export const db: Database.Database = openDatabase();
