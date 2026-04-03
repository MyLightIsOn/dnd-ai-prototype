import type Database from 'better-sqlite3';

export interface RunRow {
  id: string;
  name: string;
  started_at: number;
  finished_at: number | null;
  status: 'completed' | 'error' | 'cancelled';
  total_cost: number | null;
  node_count: number | null;
  workflow: string; // JSON string
}

export interface RunOutputRow {
  id: string;
  run_id: string;
  node_id: string;
  node_name: string | null;
  output: string | null;
}

export interface ListRunsOptions {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface RunStatsRow {
  total: number;
  completed: number;
  error: number;
  cancelled: number;
  total_cost: number;
  avg_duration_ms: number;
}

export interface ModelUsageRow {
  model: string;
  count: number;
}

export function insertRun(
  db: Database.Database,
  run: RunRow,
  outputs: Omit<RunOutputRow, 'run_id'>[]
): void {
  const stmtRun = db.prepare(`
    INSERT INTO runs (id, name, started_at, finished_at, status, total_cost, node_count, workflow)
    VALUES (@id, @name, @started_at, @finished_at, @status, @total_cost, @node_count, @workflow)
  `);

  const stmtOutput = db.prepare(`
    INSERT INTO run_outputs (id, run_id, node_id, node_name, output)
    VALUES (@id, @run_id, @node_id, @node_name, @output)
  `);

  db.transaction(() => {
    stmtRun.run(run);
    for (const o of outputs) {
      stmtOutput.run({ ...o, run_id: run.id });
    }
  })();
}

export function listRuns(
  db: Database.Database,
  options: ListRunsOptions = {}
): RunRow[] {
  const { status, search, limit = 25, offset = 0 } = options;
  const conditions: string[] = [];
  const params: Record<string, unknown> = { limit, offset };

  if (status) {
    conditions.push('status = @status');
    params.status = status;
  }
  if (search) {
    conditions.push('name LIKE @search');
    params.search = `%${search}%`;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare<typeof params, RunRow>(`
    SELECT * FROM runs ${where}
    ORDER BY started_at DESC
    LIMIT @limit OFFSET @offset
  `).all(params);
}

export function countRuns(
  db: Database.Database,
  options: Pick<ListRunsOptions, 'status' | 'search'> = {}
): number {
  const { status, search } = options;
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (status) {
    conditions.push('status = @status');
    params.status = status;
  }
  if (search) {
    conditions.push('name LIKE @search');
    params.search = `%${search}%`;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const row = db.prepare<typeof params, { n: number }>(`SELECT COUNT(*) as n FROM runs ${where}`).get(params);
  return row?.n ?? 0;
}

export function getRunById(
  db: Database.Database,
  id: string
): (RunRow & { outputs: RunOutputRow[] }) | null {
  const run = db.prepare<[string], RunRow>('SELECT * FROM runs WHERE id = ?').get(id);
  if (!run) return null;
  const outputs = db.prepare<[string], RunOutputRow>('SELECT * FROM run_outputs WHERE run_id = ?').all(id);
  return { ...run, outputs };
}

export function deleteRun(db: Database.Database, id: string): boolean {
  const result = db.prepare('DELETE FROM runs WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getRunStats(db: Database.Database): RunStatsRow {
  return db.prepare<[], RunStatsRow>(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
      COALESCE(SUM(total_cost), 0) AS total_cost,
      COALESCE(AVG(
        CASE WHEN finished_at IS NOT NULL THEN finished_at - started_at END
      ), 0) AS avg_duration_ms
    FROM runs
  `).get() as RunStatsRow;
}

export function getRunTrend(
  db: Database.Database,
  limit = 30
): Pick<RunRow, 'started_at' | 'total_cost' | 'status'>[] {
  return db.prepare<[number], Pick<RunRow, 'started_at' | 'total_cost' | 'status'>>(`
    SELECT started_at, total_cost, status
    FROM runs
    ORDER BY started_at DESC
    LIMIT ?
  `).all(limit);
}

export function getModelUsage(db: Database.Database): ModelUsageRow[] {
  return db.prepare<[], ModelUsageRow>(`
    SELECT
      json_extract(value, '$.data.model') AS model,
      COUNT(*) AS count
    FROM runs, json_each(json_extract(workflow, '$.nodes'))
    WHERE json_extract(value, '$.type') = 'agent'
      AND json_extract(value, '$.data.model') IS NOT NULL
    GROUP BY model
    ORDER BY count DESC
    LIMIT 10
  `).all();
}
