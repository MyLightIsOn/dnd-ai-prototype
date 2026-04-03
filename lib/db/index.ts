import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let _db: Database.Database | null = null;

/** Run schema migrations on a Database instance. Exported for test use. */
export function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      started_at  INTEGER NOT NULL,
      finished_at INTEGER,
      status      TEXT NOT NULL,
      workflow    TEXT NOT NULL,
      total_cost  REAL,
      node_count  INTEGER
    );
    CREATE TABLE IF NOT EXISTS run_outputs (
      id        TEXT PRIMARY KEY,
      run_id    TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      node_id   TEXT NOT NULL,
      node_name TEXT,
      output    TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_run_outputs_run_id ON run_outputs(run_id);
  `);
}

/**
 * Returns a singleton better-sqlite3 Database connected to data/runs.db.
 * Creates the file and runs migrations on first call.
 * Server-only — never import this in client components.
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  _db = new Database(path.join(dataDir, 'runs.db'));
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  migrate(_db);
  return _db;
}
