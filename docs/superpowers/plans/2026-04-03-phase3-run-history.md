# Phase 3: Run History & Sharing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local SQLite run history that auto-saves every workflow execution, with a `/history` page showing stats, trend charts, a filtered table, and a run detail drawer with export/import.

**Architecture:** `better-sqlite3` writes to `data/runs.db` via Next.js API routes. The Zustand store's `run()` action subscribes to `node:complete` events to collect outputs, then POSTs to `/api/runs` in its `finally` block. The `/history` page is a client component that fetches from those API routes and renders recharts trend charts.

**Tech Stack:** `better-sqlite3`, `recharts`, Next.js App Router API routes, Zustand, Vitest (tests), TypeScript strict mode, Tailwind CSS.

---

## File Map

**New files:**
```
lib/db/index.ts                          # getDb() singleton + migrate()
lib/db/runs-repo.ts                      # insertRun, listRuns, getRunById, deleteRun, countRuns, getRunStats, getModelUsage

app/api/runs/route.ts                    # GET (list) + POST (create)
app/api/runs/stats/route.ts              # GET aggregate stats + trend + model usage
app/api/runs/[id]/route.ts               # GET single run + DELETE
app/api/runs/[id]/export/route.ts        # GET → JSON file download
app/api/runs/import/route.ts             # POST → import JSON

app/history/page.tsx                     # History page (client component)
components/history/stats-bar.tsx         # Four summary stat cards
components/history/trend-charts.tsx      # Three recharts charts
components/history/run-table.tsx         # Filtered + paginated run table
components/history/run-detail-drawer.tsx # Slide-in drawer with run detail + export + restore

tests/lib/db/runs-repo.test.ts           # DB repo unit tests (in-memory SQLite)
```

**Modified files:**
```
next.config.ts                           # Add serverExternalPackages: ['better-sqlite3']
.gitignore                               # Add data/ entry
lib/store/workflow-store.ts              # Add workflowName + setWorkflowName; auto-save in run()
components/header.tsx                    # Replace static title with editable workflowName input
package.json                             # Add better-sqlite3, @types/better-sqlite3, recharts
```

---

## Task 1: Install dependencies and scaffold data directory

**Files:**
- Modify: `next.config.ts`
- Modify: `.gitignore`
- Create: `data/.gitkeep`
- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Install packages**

```bash
cd /path/to/project
pnpm add better-sqlite3 recharts
pnpm add -D @types/better-sqlite3
```

Expected: packages added to `package.json` and `node_modules/`.

- [ ] **Step 2: Mark better-sqlite3 as a server external package**

`better-sqlite3` is a native Node.js addon — Next.js must not bundle it. Open `next.config.ts` and add the `serverExternalPackages` key:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 3: Add data/ to .gitignore**

Open `.gitignore` and add the following two lines after the existing `# local dev / IDE` section at the bottom:

```
# sqlite database
data/*.db
```

- [ ] **Step 4: Create data directory placeholder**

```bash
mkdir -p data
touch data/.gitkeep
```

- [ ] **Step 5: Verify build still starts**

```bash
pnpm build
```

Expected: build completes without errors. (`better-sqlite3` won't be imported at build time yet.)

- [ ] **Step 6: Commit**

```bash
git add next.config.ts .gitignore data/.gitkeep package.json pnpm-lock.yaml
git commit -m "chore: install better-sqlite3 and recharts for Phase 3"
```

---

## Task 2: DB layer — getDb singleton and schema migration

**Files:**
- Create: `lib/db/index.ts`

- [ ] **Step 1: Create `lib/db/index.ts`**

```typescript
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
      total_cost  REAL,
      node_count  INTEGER,
      workflow    TEXT NOT NULL
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/db/index.ts
git commit -m "feat: add getDb singleton and schema migration"
```

---

## Task 3: DB layer — runs repository

**Files:**
- Create: `lib/db/runs-repo.ts`
- Create: `tests/lib/db/runs-repo.test.ts`

- [ ] **Step 1: Create `lib/db/runs-repo.ts`**

```typescript
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
  const stmtRun = db.prepare<RunRow>(`
    INSERT INTO runs (id, name, started_at, finished_at, status, total_cost, node_count, workflow)
    VALUES (@id, @name, @started_at, @finished_at, @status, @total_cost, @node_count, @workflow)
  `);

  const stmtOutput = db.prepare<RunOutputRow>(`
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
  `).get()!;
}

export function getRunTrend(db: Database.Database, limit = 30): Pick<RunRow, 'started_at' | 'total_cost' | 'status'>[] {
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
```

- [ ] **Step 2: Write the failing tests in `tests/lib/db/runs-repo.test.ts`**

```typescript
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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm test tests/lib/db/runs-repo.test.ts
```

Expected: `FAIL` — `Cannot find module '@/lib/db/runs-repo'`.

- [ ] **Step 4: Run tests after implementation**

```bash
pnpm test tests/lib/db/runs-repo.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/db/runs-repo.ts tests/lib/db/runs-repo.test.ts
git commit -m "feat: add runs repository with CRUD, stats, trend, and model usage"
```

---

## Task 4: API route — GET /api/runs and POST /api/runs

**Files:**
- Create: `app/api/runs/route.ts`

- [ ] **Step 1: Create `app/api/runs/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/index';
import { listRuns, countRuns, insertRun, type RunRow, type RunOutputRow } from '@/lib/db/runs-repo';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const limit = Math.min(Number(searchParams.get('limit') ?? '25'), 100);
  const offset = Number(searchParams.get('offset') ?? '0');

  try {
    const db = getDb();
    const runs = listRuns(db, { status, search, limit, offset });
    const total = countRuns(db, { status, search });
    return NextResponse.json({ runs, total });
  } catch (err) {
    console.error('[GET /api/runs]', err);
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
  }
}

interface CreateRunBody {
  id: string;
  name: string;
  started_at: number;
  finished_at: number | null;
  status: 'completed' | 'error' | 'cancelled';
  total_cost: number | null;
  node_count: number;
  workflow: { nodes: unknown[]; edges: unknown[] };
  outputs: Array<{
    id: string;
    node_id: string;
    node_name: string | null;
    output: string | null;
  }>;
}

export async function POST(req: NextRequest) {
  let body: CreateRunBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.id || !body.name || !body.started_at || !body.status) {
    return NextResponse.json({ error: 'Missing required fields: id, name, started_at, status' }, { status: 400 });
  }

  const run: RunRow = {
    id: body.id,
    name: body.name,
    started_at: body.started_at,
    finished_at: body.finished_at ?? null,
    status: body.status,
    total_cost: body.total_cost ?? null,
    node_count: body.node_count ?? null,
    workflow: JSON.stringify(body.workflow),
  };

  const outputs: Omit<RunOutputRow, 'run_id'>[] = (body.outputs ?? []).map((o) => ({
    id: o.id,
    node_id: o.node_id,
    node_name: o.node_name ?? null,
    output: o.output ?? null,
  }));

  try {
    insertRun(getDb(), run, outputs);
    return NextResponse.json({ id: run.id }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: 'Run with this ID already exists' }, { status: 409 });
    }
    console.error('[POST /api/runs]', err);
    return NextResponse.json({ error: 'Failed to save run' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Start dev server and test endpoints manually**

```bash
pnpm dev
```

In a second terminal:
```bash
# List (empty)
curl http://localhost:3000/api/runs
# Expected: {"runs":[],"total":0}

# Create a test run
curl -X POST http://localhost:3000/api/runs \
  -H "Content-Type: application/json" \
  -d '{"id":"test-1","name":"Test","started_at":1000,"finished_at":2000,"status":"completed","total_cost":0.01,"node_count":2,"workflow":{"nodes":[],"edges":[]},"outputs":[]}'
# Expected: {"id":"test-1"} with status 201

# List again
curl http://localhost:3000/api/runs
# Expected: {"runs":[{"id":"test-1",...}],"total":1}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/runs/route.ts
git commit -m "feat: add GET /api/runs and POST /api/runs endpoints"
```

---

## Task 5: Remaining API routes

**Files:**
- Create: `app/api/runs/[id]/route.ts`
- Create: `app/api/runs/[id]/export/route.ts`
- Create: `app/api/runs/import/route.ts`
- Create: `app/api/runs/stats/route.ts`

- [ ] **Step 1: Create `app/api/runs/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/index';
import { getRunById, deleteRun } from '@/lib/db/runs-repo';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const run = getRunById(getDb(), id);
    if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(run);
  } catch (err) {
    console.error('[GET /api/runs/[id]]', err);
    return NextResponse.json({ error: 'Failed to fetch run' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const deleted = deleteRun(getDb(), id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/runs/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete run' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `app/api/runs/[id]/export/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/index';
import { getRunById } from '@/lib/db/runs-repo';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const run = getRunById(getDb(), id);
    if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const payload = {
      version: 1,
      exported_at: Date.now(),
      run: {
        id: run.id,
        name: run.name,
        started_at: run.started_at,
        finished_at: run.finished_at,
        status: run.status,
        total_cost: run.total_cost,
        node_count: run.node_count,
        workflow: JSON.parse(run.workflow),
      },
      outputs: run.outputs.map((o) => ({
        node_id: o.node_id,
        node_name: o.node_name,
        output: o.output,
      })),
    };

    const filename = `run-${run.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${run.id.slice(0, 8)}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/runs/[id]/export]', err);
    return NextResponse.json({ error: 'Failed to export run' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create `app/api/runs/import/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/index';
import { insertRun, type RunRow, type RunOutputRow } from '@/lib/db/runs-repo';

interface ImportPayload {
  version: number;
  run: {
    id: string;
    name: string;
    started_at: number;
    finished_at: number | null;
    status: 'completed' | 'error' | 'cancelled';
    total_cost: number | null;
    node_count: number | null;
    workflow: { nodes: unknown[]; edges: unknown[] };
  };
  outputs: Array<{
    node_id: string;
    node_name: string | null;
    output: string | null;
  }>;
}

export async function POST(req: NextRequest) {
  let payload: ImportPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (payload.version !== 1 || !payload.run?.id || !payload.run?.name) {
    return NextResponse.json({ error: 'Invalid export format' }, { status: 400 });
  }

  const run: RunRow = {
    id: payload.run.id,
    name: payload.run.name,
    started_at: payload.run.started_at,
    finished_at: payload.run.finished_at ?? null,
    status: payload.run.status,
    total_cost: payload.run.total_cost ?? null,
    node_count: payload.run.node_count ?? null,
    workflow: JSON.stringify(payload.run.workflow),
  };

  const outputs: Omit<RunOutputRow, 'run_id'>[] = (payload.outputs ?? []).map((o) => ({
    id: crypto.randomUUID(),
    node_id: o.node_id,
    node_name: o.node_name ?? null,
    output: o.output ?? null,
  }));

  try {
    insertRun(getDb(), run, outputs);
    return NextResponse.json({ id: run.id }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: 'A run with this ID already exists' }, { status: 409 });
    }
    console.error('[POST /api/runs/import]', err);
    return NextResponse.json({ error: 'Failed to import run' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create `app/api/runs/stats/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/index';
import { getRunStats, getRunTrend, getModelUsage } from '@/lib/db/runs-repo';

export async function GET() {
  try {
    const db = getDb();
    const stats = getRunStats(db);
    const trend = getRunTrend(db, 30);
    const models = getModelUsage(db);
    return NextResponse.json({ ...stats, trend, models });
  } catch (err) {
    console.error('[GET /api/runs/stats]', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/runs/
git commit -m "feat: add run detail, delete, export, import, and stats API routes"
```

---

## Task 6: Add workflowName to store and editable name input to header

**Files:**
- Modify: `lib/store/workflow-store.ts`
- Modify: `components/header.tsx`

- [ ] **Step 1: Add `workflowName` to `WorkflowState` interface in `lib/store/workflow-store.ts`**

In the `WorkflowState` interface, add after `settingsOpen: boolean;`:

```typescript
  // Workflow metadata
  workflowName: string;

  // Actions (existing + new)
  setWorkflowName: (name: string) => void;
```

- [ ] **Step 2: Add `workflowName` to `initialWorkflowState` in `lib/store/workflow-store.ts`**

In the `initialWorkflowState` object, add after `settingsOpen: false,`:

```typescript
  workflowName: 'Untitled',
```

- [ ] **Step 3: Add the `setWorkflowName` action in the `create<WorkflowState>((set, get) => ({` block**

After the existing `setSettingsOpen` action:

```typescript
  setWorkflowName: (name) => set({ workflowName: name }),
```

- [ ] **Step 4: Update `components/header.tsx` to show an editable workflow name input**

Replace the entire file with:

```typescript
'use client';
import React from "react";
import Toolbar from "./toolbar";
import { useWorkflowStore } from "@/lib/store/workflow-store";

function Header({
  onRun,
  onPause,
  onResume,
  onCancel,
  onClear,
  onExport,
  onImport,
  onAddSample,
}: {
  onRun: () => void | Promise<void>;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onClear: () => void;
  onExport: () => void;
  onImport: React.ChangeEventHandler<HTMLInputElement>;
  onAddSample: (sampleType: 'summarizer' | 'rag' | 'multi-agent' | 'keyword-router' | 'llm-judge-router' | 'refine-loop' | 'web-search' | 'code-gen' | 'api-fetch' | 'db-report' | 'research-code') => void;
}) {
  const executionStatus = useWorkflowStore(s => s.executionStatus);
  const compareMode = useWorkflowStore(s => s.compareMode);
  const compareProviders = useWorkflowStore(s => s.compareProviders);
  const runStats = useWorkflowStore(s => s.runStats);
  const statsOpen = useWorkflowStore(s => s.statsOpen);
  const setCompareMode = useWorkflowStore(s => s.setCompareMode);
  const setCompareProviders = useWorkflowStore(s => s.setCompareProviders);
  const setCompareLogs = useWorkflowStore(s => s.setCompareLogs);
  const compareControls = useWorkflowStore(s => s.compareControls);
  const setStatsOpen = useWorkflowStore(s => s.setStatsOpen);
  const setSettingsOpen = useWorkflowStore(s => s.setSettingsOpen);
  const workflowName = useWorkflowStore(s => s.workflowName);
  const setWorkflowName = useWorkflowStore(s => s.setWorkflowName);

  const handleToggleCompare = () => {
    setCompareMode(!compareMode);
    setCompareLogs(compareProviders.map(() => []));
  };

  const handleChangeCompareProviders = (ps: typeof compareProviders) => {
    setCompareProviders(ps);
    while (compareControls.length < ps.length) {
      compareControls.push({ current: 'idle' });
    }
    compareControls.splice(ps.length);
    setCompareLogs(ps.map(() => []));
  };

  return (
    <div className="col-span-3 flex items-center justify-between">
      <input
        type="text"
        value={workflowName}
        onChange={(e) => setWorkflowName(e.target.value)}
        className="text-xl font-semibold bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 min-w-0 max-w-[280px] truncate"
        aria-label="Workflow name"
      />
      <Toolbar
        onRun={onRun}
        onPause={onPause}
        onResume={onResume}
        onCancel={onCancel}
        executionStatus={executionStatus}
        onClear={onClear}
        onExport={onExport}
        onImport={onImport}
        onAddSample={onAddSample}
        onSettings={() => setSettingsOpen(true)}
        compareMode={compareMode}
        onToggleCompare={handleToggleCompare}
        compareProviders={compareProviders}
        onChangeCompareProviders={handleChangeCompareProviders}
        statsAvailable={runStats !== null}
        onStatsToggle={() => setStatsOpen(!statsOpen)}
      />
    </div>
  );
}

export default Header;
```

- [ ] **Step 5: Run tests to verify store tests still pass**

```bash
pnpm test tests/lib/store/workflow-store.test.ts
```

Expected: all tests pass (initialWorkflowState now includes `workflowName: 'Untitled'`, which is fine for existing tests since they reset to `initialWorkflowState`).

- [ ] **Step 6: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/store/workflow-store.ts components/header.tsx
git commit -m "feat: add workflowName to store and editable name in header"
```

---

## Task 7: Auto-save run to history in store's run() action

**Files:**
- Modify: `lib/store/workflow-store.ts`

- [ ] **Step 1: Add auto-save logic to the `run()` action**

In `lib/store/workflow-store.ts`, find the `run: async (options?: RunOptions) => {` action. Replace the existing `try/finally` block:

```typescript
  run: async (options?: RunOptions) => {
    const state = get();
    const { executionControl, errorRecoveryAction, reviewDecision, setRunStats } = state;

    if (executionControl.current === 'running') return;

    set({ executionStatus: 'running' });
    executionControl.current = 'running';
    errorRecoveryAction.current = null;

    get().setLogs([]);
    get().setNodes(get().nodes.map(node => {
      const base = { ...node, data: { ...node.data, executionState: 'idle' as const, executionError: undefined } };
      if (node.type === 'loop') {
        return { ...base, data: { ...base.data, currentIteration: 0, executedExit: false } as LoopData & { executionState: 'idle'; executionError: undefined } };
      }
      return base;
    }));
    get().setEdges(get().edges.map(edge => ({
      ...edge,
      style: { stroke: '#e5e7eb', strokeWidth: 1, opacity: 1 },
      animated: false,
    })));

    const emitter = new ExecutionEventEmitter();

    // Collect node outputs for history save
    const collectedOutputs = new Map<string, string>();
    const unsubOutputs = emitter.on('node:complete', (e) => {
      collectedOutputs.set(e.nodeId, e.output);
    });

    const cleanup = createStoreBridge(emitter, {
      setLogs: get().setLogs,
      setNodes: get().setNodes,
      setEdges: get().setEdges,
      setCurrentError: get().setCurrentError,
      setReviewRequest: get().setReviewRequest,
    });

    const engine: ExecutionEngine = {
      emitter,
      control: executionControl,
      errorRecovery: errorRecoveryAction,
      reviewDecision,
    };

    const startedAt = Date.now();
    let finalStatus: 'completed' | 'error' | 'cancelled' = 'completed';
    let finalCostUsd: number | null = null;

    try {
      const { stats } = await runParallel(get().nodes, get().edges, engine, options);
      setRunStats([stats]);
      finalCostUsd = stats.totalCostUsd ?? null;
      const ctrl = executionControl.current;
      if (ctrl === 'cancelled') finalStatus = 'cancelled';
    } catch {
      finalStatus = 'error';
    } finally {
      unsubOutputs();
      cleanup();

      const currentStatus = executionControl.current;
      if (currentStatus === 'running' || currentStatus === 'paused') {
        set({ executionStatus: 'idle' });
        executionControl.current = 'idle';
      }

      // Auto-save to history (fire-and-forget)
      const nodes = get().nodes;
      const edges = get().edges;
      const runId = crypto.randomUUID();
      const outputs = nodes
        .filter((n) => collectedOutputs.has(n.id))
        .map((n) => ({
          id: crypto.randomUUID(),
          node_id: n.id,
          node_name: (n.data as { name?: string }).name ?? n.type ?? null,
          output: collectedOutputs.get(n.id) ?? null,
        }));

      fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: runId,
          name: get().workflowName || 'Untitled',
          started_at: startedAt,
          finished_at: Date.now(),
          status: finalStatus,
          total_cost: finalCostUsd,
          node_count: nodes.length,
          workflow: { nodes, edges },
          outputs,
        }),
      }).catch((err) => {
        console.error('[auto-save] Failed to save run to history:', err);
      });
    }
  },
```

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```

Expected: all tests pass. The auto-save `fetch` won't fire in tests (no HTTP server).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Start the dev server (`pnpm dev`). Run a sample workflow (Samples → Document Summarizer → mock mode). Check:
```bash
curl http://localhost:3000/api/runs
```
Expected: the run appears in the response with `status: "completed"`.

- [ ] **Step 5: Commit**

```bash
git add lib/store/workflow-store.ts
git commit -m "feat: auto-save run to history after each execution"
```

---

## Task 8: History page skeleton and StatsBar component

**Files:**
- Create: `app/history/page.tsx`
- Create: `components/history/stats-bar.tsx`

- [ ] **Step 1: Create `components/history/stats-bar.tsx`**

```typescript
'use client';

interface StatsData {
  total: number;
  completed: number;
  error: number;
  cancelled: number;
  total_cost: number;
  avg_duration_ms: number;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border rounded-xl p-4 flex flex-col gap-1">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export function StatsBar({ stats }: { stats: StatsData }) {
  const successRate =
    stats.total > 0
      ? `${Math.round((stats.completed / stats.total) * 100)}%`
      : '—';
  const totalCost =
    stats.total_cost > 0 ? `$${stats.total_cost.toFixed(4)}` : '$0.00';
  const avgDuration =
    stats.avg_duration_ms > 0
      ? `${(stats.avg_duration_ms / 1000).toFixed(1)}s`
      : '—';

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard label="Total Runs" value={String(stats.total)} />
      <StatCard label="Success Rate" value={successRate} />
      <StatCard label="Total Cost" value={totalCost} />
      <StatCard label="Avg Duration" value={avgDuration} />
    </div>
  );
}
```

- [ ] **Step 2: Create `app/history/page.tsx`**

```typescript
'use client';
import React, { useEffect, useState } from 'react';
import { StatsBar } from '@/components/history/stats-bar';

interface StatsResponse {
  total: number;
  completed: number;
  error: number;
  cancelled: number;
  total_cost: number;
  avg_duration_ms: number;
  trend: Array<{ started_at: number; total_cost: number | null; status: string }>;
  models: Array<{ model: string; count: number }>;
}

const EMPTY_STATS: StatsResponse = {
  total: 0,
  completed: 0,
  error: 0,
  cancelled: 0,
  total_cost: 0,
  avg_duration_ms: 0,
  trend: [],
  models: [],
};

export default function HistoryPage() {
  const [stats, setStats] = useState<StatsResponse>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/runs/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Run History</h1>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : (
        <StatsBar stats={stats} />
      )}

      {/* Trend charts and run table will be added in subsequent tasks */}
    </div>
  );
}
```

- [ ] **Step 3: Enable the History nav link by creating `.env.local`**

Create a `.env.local` file at the project root (or append if it exists):

```bash
echo "NEXT_PUBLIC_FEATURE_HISTORY=true" >> .env.local
```

Then restart the dev server (`pnpm dev`). The "History" link in the nav should now be visible.

- [ ] **Step 4: Verify the history page loads at `http://localhost:3000/history`**

Expected: page renders with four stat cards (all showing `0` or `—` if no runs exist).

- [ ] **Step 5: Commit**

```bash
git add app/history/page.tsx components/history/stats-bar.tsx .env.local
git commit -m "feat: add history page skeleton and StatsBar component"
```

---

## Task 9: TrendCharts component

**Files:**
- Create: `components/history/trend-charts.tsx`
- Modify: `app/history/page.tsx`

- [ ] **Step 1: Create `components/history/trend-charts.tsx`**

```typescript
'use client';
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface TrendPoint {
  started_at: number;
  total_cost: number | null;
  status: string;
}

interface ModelUsage {
  model: string;
  count: number;
}

interface TrendChartsProps {
  trend: TrendPoint[];
  statusCounts: { completed: number; error: number; cancelled: number };
  models: ModelUsage[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e',
  error: '#ef4444',
  cancelled: '#f59e0b',
};

function formatMs(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function TrendCharts({ trend, statusCounts, models }: TrendChartsProps) {
  // Cost over time — oldest first for left-to-right timeline
  const costData = [...trend]
    .reverse()
    .map((p) => ({
      date: formatMs(p.started_at),
      cost: p.total_cost ?? 0,
    }));

  // Status breakdown for donut
  const statusData = [
    { name: 'Completed', value: statusCounts.completed, color: STATUS_COLORS.completed },
    { name: 'Error', value: statusCounts.error, color: STATUS_COLORS.error },
    { name: 'Cancelled', value: statusCounts.cancelled, color: STATUS_COLORS.cancelled },
  ].filter((d) => d.value > 0);

  // Model usage
  const modelData = models.map((m) => ({
    model: m.model.split('/').pop() ?? m.model, // shorten "openai/gpt-4o-mini" → "gpt-4o-mini"
    count: m.count,
  }));

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Cost over time */}
      <div className="bg-white border rounded-xl p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Cost Over Time (last 30 runs)</div>
        {costData.length === 0 ? (
          <div className="text-gray-400 text-sm h-32 flex items-center justify-center">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={costData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(3)}`} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(4)}`, 'Cost']} />
              <Line type="monotone" dataKey="cost" stroke="#6366f1" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Status breakdown */}
      <div className="bg-white border rounded-xl p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Status Breakdown</div>
        {statusData.length === 0 ? (
          <div className="text-gray-400 text-sm h-32 flex items-center justify-center">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                dataKey="value"
              >
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Model usage */}
      <div className="bg-white border rounded-xl p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Top Models Used</div>
        {modelData.length === 0 ? (
          <div className="text-gray-400 text-sm h-32 flex items-center justify-center">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={modelData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="model" tick={{ fontSize: 10 }} width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `TrendCharts` to `app/history/page.tsx`**

Add the import at the top of `app/history/page.tsx`:

```typescript
import { TrendCharts } from '@/components/history/trend-charts';
```

Replace the `{/* Trend charts and run table will be added in subsequent tasks */}` comment with:

```typescript
      <TrendCharts
        trend={stats.trend}
        statusCounts={{
          completed: stats.completed,
          error: stats.error,
          cancelled: stats.cancelled,
        }}
        models={stats.models}
      />

      {/* Run table will be added in the next task */}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/history/trend-charts.tsx app/history/page.tsx
git commit -m "feat: add TrendCharts component to history page"
```

---

## Task 10: RunTable component with filters and pagination

**Files:**
- Create: `components/history/run-table.tsx`
- Modify: `app/history/page.tsx`

- [ ] **Step 1: Create `components/history/run-table.tsx`**

```typescript
'use client';
import React, { useEffect, useState, useCallback } from 'react';

export interface RunSummary {
  id: string;
  name: string;
  started_at: number;
  finished_at: number | null;
  status: 'completed' | 'error' | 'cancelled';
  total_cost: number | null;
  node_count: number | null;
}

interface RunTableProps {
  onView: (run: RunSummary) => void;
}

const PAGE_SIZE = 25;

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  cancelled: 'bg-yellow-100 text-yellow-700',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(started: number, finished: number | null): string {
  if (!finished) return '—';
  const ms = finished - started;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function RunTable({ onView }: RunTableProps) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRuns = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (search) params.set('search', search);
    if (status) params.set('status', status);

    fetch(`/api/runs?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRuns(data.runs ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [search, status]);

  const handleDelete = (id: string) => {
    if (!confirm('Delete this run?')) return;
    fetch(`/api/runs/${id}`, { method: 'DELETE' })
      .then(() => fetchRuns())
      .catch(console.error);
  };

  const handleExport = (id: string, name: string) => {
    const a = document.createElement('a');
    a.href = `/api/runs/${id}/export`;
    a.download = `run-${name}.json`;
    a.click();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b">
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-56"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="error">Error</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">{total} run{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
      ) : runs.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No runs found.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Started</th>
              <th className="text-left px-4 py-3 font-medium">Duration</th>
              <th className="text-left px-4 py-3 font-medium">Cost</th>
              <th className="text-left px-4 py-3 font-medium">Nodes</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {runs.map((run) => (
              <tr key={run.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{run.name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[run.status] ?? ''}`}>
                    {run.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(run.started_at)}</td>
                <td className="px-4 py-3 text-gray-500">{formatDuration(run.started_at, run.finished_at)}</td>
                <td className="px-4 py-3 text-gray-500">
                  {run.total_cost != null ? `$${run.total_cost.toFixed(4)}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">{run.node_count ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onView(run)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleExport(run.id, run.name)}
                      className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                    >
                      Export
                    </button>
                    <button
                      onClick={() => handleDelete(run.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add `RunTable` to `app/history/page.tsx`**

Add the imports at the top of `app/history/page.tsx`:

```typescript
import { RunTable, type RunSummary } from '@/components/history/run-table';
```

Add state for selected run (needed for the drawer in the next task):

```typescript
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
```

Replace the `{/* Run table will be added in the next task */}` comment with:

```typescript
      <RunTable onView={(run) => setSelectedRunId(run.id)} />
      {/* RunDetailDrawer will be added in the next task */}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/history/run-table.tsx app/history/page.tsx
git commit -m "feat: add RunTable with filters and pagination to history page"
```

---

## Task 11: RunDetailDrawer — view detail, export, restore workflow

**Files:**
- Create: `components/history/run-detail-drawer.tsx`
- Create: `components/history/import-button.tsx`
- Modify: `app/history/page.tsx`

- [ ] **Step 1: Create `components/history/run-detail-drawer.tsx`**

```typescript
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/lib/store/workflow-store';
import type { TypedNode } from '@/types';
import type { Edge } from '@xyflow/react';

interface RunOutput {
  id: string;
  run_id: string;
  node_id: string;
  node_name: string | null;
  output: string | null;
}

interface RunDetail {
  id: string;
  name: string;
  started_at: number;
  finished_at: number | null;
  status: 'completed' | 'error' | 'cancelled';
  total_cost: number | null;
  node_count: number | null;
  workflow: string; // JSON string from DB
  outputs: RunOutput[];
}

interface RunDetailDrawerProps {
  runId: string | null;
  onClose: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  completed: 'text-green-600',
  error: 'text-red-600',
  cancelled: 'text-yellow-600',
};

export function RunDetailDrawer({ runId, onClose }: RunDetailDrawerProps) {
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [workflowExpanded, setWorkflowExpanded] = useState(false);
  const [openOutputs, setOpenOutputs] = useState<Set<string>>(new Set());
  const router = useRouter();
  const setNodes = useWorkflowStore((s) => s.setNodes);
  const setEdges = useWorkflowStore((s) => s.setEdges);
  const setWorkflowName = useWorkflowStore((s) => s.setWorkflowName);

  useEffect(() => {
    if (!runId) {
      setRun(null);
      return;
    }
    setLoading(true);
    setWorkflowExpanded(false);
    setOpenOutputs(new Set());
    fetch(`/api/runs/${runId}`)
      .then((r) => r.json())
      .then(setRun)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [runId]);

  const handleExport = () => {
    if (!run) return;
    const a = document.createElement('a');
    a.href = `/api/runs/${run.id}/export`;
    a.download = `run-${run.name}.json`;
    a.click();
  };

  const handleRestore = () => {
    if (!run) return;
    const workflow = JSON.parse(run.workflow) as { nodes: TypedNode[]; edges: Edge[] };
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
    setWorkflowName(run.name);
    onClose();
    router.push('/');
  };

  const toggleOutput = (nodeId: string) => {
    setOpenOutputs((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const isOpen = runId !== null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[480px] bg-white shadow-2xl z-50 overflow-y-auto transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{run?.name ?? '…'}</h2>
              {run && (
                <span className={`text-sm font-medium ${STATUS_COLOR[run.status] ?? ''}`}>
                  {run.status}
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>

          {loading && <div className="text-gray-400 text-sm">Loading…</div>}

          {run && !loading && (
            <>
              {/* Metadata */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-gray-500">Run ID</dt>
                <dd className="font-mono text-xs truncate text-gray-700">{run.id}</dd>
                <dt className="text-gray-500">Started</dt>
                <dd className="text-gray-700">{new Date(run.started_at).toLocaleString()}</dd>
                <dt className="text-gray-500">Duration</dt>
                <dd className="text-gray-700">
                  {run.finished_at
                    ? `${((run.finished_at - run.started_at) / 1000).toFixed(1)}s`
                    : '—'}
                </dd>
                <dt className="text-gray-500">Cost</dt>
                <dd className="text-gray-700">
                  {run.total_cost != null ? `$${run.total_cost.toFixed(4)}` : '—'}
                </dd>
                <dt className="text-gray-500">Nodes</dt>
                <dd className="text-gray-700">{run.node_count ?? '—'}</dd>
              </dl>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  className="flex-1 py-2 px-4 border rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Export JSON
                </button>
                <button
                  onClick={handleRestore}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Restore Workflow
                </button>
              </div>

              {/* Node outputs */}
              {run.outputs.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Node Outputs</div>
                  <div className="space-y-2">
                    {run.outputs.map((o) => (
                      <div key={o.id} className="border rounded-lg overflow-hidden">
                        <button
                          className="w-full text-left px-3 py-2 bg-gray-50 text-sm font-medium hover:bg-gray-100 flex items-center justify-between"
                          onClick={() => toggleOutput(o.node_id)}
                        >
                          <span>{o.node_name ?? o.node_id}</span>
                          <span className="text-gray-400">{openOutputs.has(o.node_id) ? '▲' : '▼'}</span>
                        </button>
                        {openOutputs.has(o.node_id) && (
                          <pre className="px-3 py-2 text-xs text-gray-700 whitespace-pre-wrap bg-white max-h-48 overflow-y-auto">
                            {o.output ?? '(empty)'}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workflow JSON */}
              <div>
                <button
                  className="text-xs text-gray-500 uppercase tracking-wide hover:text-gray-700 flex items-center gap-1"
                  onClick={() => setWorkflowExpanded((v) => !v)}
                >
                  Workflow JSON {workflowExpanded ? '▲' : '▼'}
                </button>
                {workflowExpanded && (
                  <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 max-h-64 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(JSON.parse(run.workflow), null, 2)}
                  </pre>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `components/history/import-button.tsx`**

```typescript
'use client';
import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface ImportButtonProps {
  onImported: () => void;
}

export function ImportButton({ onImported }: ImportButtonProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    let payload: unknown;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      setError('Invalid JSON file');
      return;
    }

    const res = await fetch('/api/runs/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 409) {
      setError('A run with this ID already exists');
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? 'Import failed');
      return;
    }

    onImported();
    // reset file input so same file can be imported again
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
      >
        <Upload size={14} /> Import Run
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 3: Wire `RunDetailDrawer` and `ImportButton` into `app/history/page.tsx`**

The final `app/history/page.tsx` should look like this (complete file):

```typescript
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { StatsBar } from '@/components/history/stats-bar';
import { TrendCharts } from '@/components/history/trend-charts';
import { RunTable } from '@/components/history/run-table';
import { RunDetailDrawer } from '@/components/history/run-detail-drawer';
import { ImportButton } from '@/components/history/import-button';

interface StatsResponse {
  total: number;
  completed: number;
  error: number;
  cancelled: number;
  total_cost: number;
  avg_duration_ms: number;
  trend: Array<{ started_at: number; total_cost: number | null; status: string }>;
  models: Array<{ model: string; count: number }>;
}

const EMPTY_STATS: StatsResponse = {
  total: 0,
  completed: 0,
  error: 0,
  cancelled: 0,
  total_cost: 0,
  avg_duration_ms: 0,
  trend: [],
  models: [],
};

export default function HistoryPage() {
  const [stats, setStats] = useState<StatsResponse>(EMPTY_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [tableKey, setTableKey] = useState(0);

  const fetchStats = useCallback(() => {
    setStatsLoading(true);
    fetch('/api/runs/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleImported = () => {
    fetchStats();
    setTableKey((k) => k + 1); // force RunTable to refetch
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Run History</h1>
        <ImportButton onImported={handleImported} />
      </div>

      {statsLoading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : (
        <StatsBar stats={stats} />
      )}

      {!statsLoading && (
        <TrendCharts
          trend={stats.trend}
          statusCounts={{
            completed: stats.completed,
            error: stats.error,
            cancelled: stats.cancelled,
          }}
          models={stats.models}
        />
      )}

      <RunTable key={tableKey} onView={(run) => setSelectedRunId(run.id)} />

      <RunDetailDrawer
        runId={selectedRunId}
        onClose={() => setSelectedRunId(null)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run all tests**

```bash
pnpm test
```

Expected: all tests pass (169+ passing).

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 6: End-to-end manual test**

1. Start dev server (`pnpm dev`)
2. Run a workflow (editor page, Samples → Document Summarizer → mock mode → Run)
3. Navigate to `/history` — confirm run appears in the table and stats update
4. Click **View** — drawer opens with run detail
5. Click **Export JSON** — file downloads
6. Delete the run from the table
7. Click **Import Run** — upload the exported file — run re-appears
8. Click **View** → **Restore Workflow** — canvas loads the saved nodes, redirects to `/`

- [ ] **Step 7: Commit**

```bash
git add components/history/run-detail-drawer.tsx components/history/import-button.tsx app/history/page.tsx
git commit -m "feat: add RunDetailDrawer and ImportButton, complete history page"
```
