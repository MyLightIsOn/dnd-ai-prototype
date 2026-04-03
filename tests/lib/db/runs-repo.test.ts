import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { migrate } from '@/lib/db/index';
import {
  insertRun,
  listRuns,
  countRuns,
  getRunById,
  deleteRun,
  getRunStats,
  getRunTrend,
  getModelUsage,
  type RunRow,
  type RunOutputRow,
} from '@/lib/db/runs-repo';

let db: Database.Database;

const makeRun = (overrides: Partial<RunRow> = {}): RunRow => ({
  id: crypto.randomUUID(),
  name: 'Test Run',
  started_at: Date.now() - 5000,
  finished_at: Date.now(),
  status: 'completed',
  total_cost: 0.01,
  node_count: 3,
  workflow: JSON.stringify({ nodes: [], edges: [] }),
  ...overrides,
});

const makeOutput = (overrides: Partial<Omit<RunOutputRow, 'run_id'>> = {}): Omit<RunOutputRow, 'run_id'> => ({
  id: crypto.randomUUID(),
  node_id: 'node-1',
  node_name: 'Agent',
  output: 'Hello world',
  ...overrides,
});

beforeEach(() => {
  db = new Database(':memory:');
  migrate(db);
});

describe('insertRun', () => {
  it('inserts a run and its outputs', () => {
    const run = makeRun();
    insertRun(db, run, [makeOutput()]);
    const result = getRunById(db, run.id);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(run.id);
    expect(result!.outputs).toHaveLength(1);
  });

  it('rejects duplicate run id', () => {
    const run = makeRun();
    insertRun(db, run, []);
    expect(() => insertRun(db, run, [])).toThrow();
  });
});

describe('listRuns', () => {
  beforeEach(() => {
    insertRun(db, makeRun({ id: 'r1', name: 'Alpha', status: 'completed', started_at: 1000 }), []);
    insertRun(db, makeRun({ id: 'r2', name: 'Beta', status: 'error', started_at: 2000 }), []);
    insertRun(db, makeRun({ id: 'r3', name: 'Alpha Two', status: 'completed', started_at: 3000 }), []);
  });

  it('returns all runs ordered by started_at DESC', () => {
    const runs = listRuns(db);
    expect(runs).toHaveLength(3);
    expect(runs[0].id).toBe('r3');
  });

  it('filters by status', () => {
    const runs = listRuns(db, { status: 'error' });
    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe('r2');
  });

  it('filters by name search (case insensitive partial match)', () => {
    const runs = listRuns(db, { search: 'alpha' });
    expect(runs).toHaveLength(2);
  });

  it('respects limit and offset', () => {
    const runs = listRuns(db, { limit: 2, offset: 1 });
    expect(runs).toHaveLength(2);
    expect(runs[0].id).toBe('r2');
  });
});

describe('countRuns', () => {
  beforeEach(() => {
    insertRun(db, makeRun({ status: 'completed' }), []);
    insertRun(db, makeRun({ status: 'error' }), []);
  });

  it('counts all runs', () => {
    expect(countRuns(db)).toBe(2);
  });

  it('counts filtered runs', () => {
    expect(countRuns(db, { status: 'error' })).toBe(1);
  });
});

describe('getRunById', () => {
  it('returns null for unknown id', () => {
    expect(getRunById(db, 'unknown')).toBeNull();
  });

  it('returns run with outputs', () => {
    const run = makeRun();
    const out = makeOutput({ output: 'result text' });
    insertRun(db, run, [out]);
    const result = getRunById(db, run.id);
    expect(result!.outputs[0].output).toBe('result text');
  });
});

describe('deleteRun', () => {
  it('deletes run and cascades to outputs', () => {
    const run = makeRun();
    insertRun(db, run, [makeOutput()]);
    expect(deleteRun(db, run.id)).toBe(true);
    expect(getRunById(db, run.id)).toBeNull();
    const outputs = db.prepare('SELECT * FROM run_outputs WHERE run_id = ?').all(run.id);
    expect(outputs).toHaveLength(0);
  });

  it('returns false for unknown id', () => {
    expect(deleteRun(db, 'nope')).toBe(false);
  });
});

describe('getRunStats', () => {
  it('returns zero stats for empty table', () => {
    const stats = getRunStats(db);
    expect(stats.total).toBe(0);
    expect(stats.total_cost).toBe(0);
  });

  it('calculates correct aggregates', () => {
    insertRun(db, makeRun({ status: 'completed', total_cost: 0.05, started_at: 1000, finished_at: 4000 }), []);
    insertRun(db, makeRun({ status: 'error', total_cost: 0.02, started_at: 2000, finished_at: 3000 }), []);
    const stats = getRunStats(db);
    expect(stats.total).toBe(2);
    expect(stats.completed).toBe(1);
    expect(stats.error).toBe(1);
    expect(stats.total_cost).toBeCloseTo(0.07);
    expect(stats.avg_duration_ms).toBe(2000); // (3000 + 1000) / 2
  });
});

describe('getRunTrend', () => {
  it('returns runs ordered by started_at DESC', () => {
    insertRun(db, makeRun({ id: 'old', started_at: 1000 }), []);
    insertRun(db, makeRun({ id: 'new', started_at: 9000 }), []);
    const trend = getRunTrend(db);
    expect(trend[0]).toHaveProperty('started_at', 9000);
  });

  it('respects limit', () => {
    for (let i = 0; i < 35; i++) {
      insertRun(db, makeRun({ started_at: i }), []);
    }
    expect(getRunTrend(db, 30)).toHaveLength(30);
  });
});

describe('getModelUsage', () => {
  it('counts models from agent nodes in workflow JSON', () => {
    const workflow = JSON.stringify({
      nodes: [
        { id: '1', type: 'agent', data: { model: 'openai/gpt-4o-mini', name: 'A' } },
        { id: '2', type: 'agent', data: { model: 'openai/gpt-4o-mini', name: 'B' } },
        { id: '3', type: 'agent', data: { model: 'anthropic/claude-haiku-4', name: 'C' } },
        { id: '4', type: 'prompt', data: { name: 'P' } },
      ],
      edges: [],
    });
    insertRun(db, makeRun({ workflow }), []);
    const usage = getModelUsage(db);
    expect(usage[0]).toEqual({ model: 'openai/gpt-4o-mini', count: 2 });
    expect(usage[1]).toEqual({ model: 'anthropic/claude-haiku-4', count: 1 });
  });

  it('returns empty array for empty table', () => {
    expect(getModelUsage(db)).toEqual([]);
  });
});
