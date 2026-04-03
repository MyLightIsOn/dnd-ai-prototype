# Phase 3: Run History & Sharing — Design Spec

**Date:** 2026-04-03  
**Status:** Approved

## Overview

Add persistent run history to inference-sandbox. Every workflow execution is automatically saved to a local SQLite database. A `/history` page lets users browse past runs, view details, and export/import runs for sharing.

## Decisions Made

| Question | Decision |
|---|---|
| Storage backend | `better-sqlite3` via Next.js API routes, local `data/runs.db` file |
| Sharing mechanism | Export to JSON file + Import from JSON file (no cloud/URL sharing) |
| History UI | Full spec: table + filters + trend charts |
| Data stored per run | Full snapshot: logs, outputs, cost, duration, status, complete workflow JSON |
| Save trigger | Automatic after every run (completed, error, or cancelled) |

---

## 1. Data Layer

### Database

File location: `data/runs.db` (project root, gitignored).

Initialized on first API route request via a `getDb()` singleton that runs `CREATE TABLE IF NOT EXISTS` on startup.

### Schema

```sql
CREATE TABLE IF NOT EXISTS runs (
  id          TEXT PRIMARY KEY,   -- uuid v4
  name        TEXT NOT NULL,       -- workflow name or "Untitled"
  started_at  INTEGER NOT NULL,    -- Unix ms
  finished_at INTEGER,             -- Unix ms, null if still running
  status      TEXT NOT NULL,       -- 'completed' | 'error' | 'cancelled'
  total_cost  REAL,                -- USD, null if no LLM calls
  node_count  INTEGER,
  workflow    TEXT NOT NULL        -- JSON: { nodes: TypedNode[], edges: Edge[] }
);

CREATE TABLE IF NOT EXISTS run_outputs (
  id        TEXT PRIMARY KEY,      -- uuid v4
  run_id    TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  node_id   TEXT NOT NULL,
  node_name TEXT,
  output    TEXT                   -- full text output from node
);
```

### API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/runs` | List runs. Query params: `status`, `search` (name), `limit`, `offset` |
| `GET` | `/api/runs/[id]` | Single run with all outputs |
| `GET` | `/api/runs/stats` | Aggregate stats (total, success rate, total cost, avg duration) for charts |
| `POST` | `/api/runs` | Create run (called by store after execution) |
| `DELETE` | `/api/runs/[id]` | Delete run and cascade outputs |
| `GET` | `/api/runs/[id]/export` | Download run as JSON file |
| `POST` | `/api/runs/import` | Import a previously exported JSON run |

All routes live in `app/api/runs/`.

### New files

- `lib/db/index.ts` — `getDb()` singleton: opens `better-sqlite3`, runs migrations, returns `Database` instance
- `lib/db/runs-repo.ts` — typed query functions: `insertRun`, `listRuns`, `getRunById`, `deleteRun`

---

## 2. Auto-Save Integration

### Trigger

The Zustand store's `run()` action (`lib/store/workflow-store.ts`) saves in its `finally` block, after `runParallel` resolves. This covers all terminal states: completed, error, and cancelled.

### Output collection

Node outputs are not stored on node data — they live in the `nodeOutputs: Record<Id, string>` map local to `runParallel`. The store collects them by subscribing to `node:complete` events from the `ExecutionEventEmitter` during the run:

```typescript
// Inside run() action, before calling runParallel:
const collectedOutputs: Map<string, string> = new Map();
const unsub = engine.emitter.on('node:complete', (e) => {
  collectedOutputs.set(e.nodeId, e.output);
});

try {
  await runParallel(nodes, edges, engine, options);
} finally {
  unsub();
  // save to history using collectedOutputs + get().nodes for node names
}
```

Node names are looked up from `get().nodes` after the run completes.

### Error handling

Save is fire-and-forget. A `fetch` failure logs to console but does not surface an error dialog or block the UI. The run is still visible to the user on the canvas.

---

## 3. History Page

### Route

`app/history/page.tsx` — enabled by existing `NEXT_PUBLIC_FEATURE_HISTORY` feature flag in `components/nav/index.tsx`. No new flag needed.

### Layout (top to bottom)

#### Summary stats bar
Four stat cards:
- Total Runs
- Success Rate (% completed)
- Total Cost (USD)
- Avg Duration (seconds)

Stats are derived from the full unfiltered dataset via a `GET /api/runs/stats` aggregate query.

#### Trend charts

Built with `recharts`:

1. **Cost over time** — line chart, last 30 runs by `started_at`
2. **Status breakdown** — donut chart (completed / error / cancelled counts)
3. **Model usage** — horizontal bar chart (top models by call count, derived from stored workflow JSON)

#### Run table

Columns: Name · Status · Started At · Duration · Cost · Nodes · Actions

Actions per row: **View** · **Export** · **Delete**

Filters above table:
- Text search (name)
- Status dropdown (All / Completed / Error / Cancelled)
- Date range (from / to)
- Pagination: 25 runs per page

#### Run detail drawer

Clicking **View** opens a right-side drawer (`components/history/run-detail-drawer.tsx`) showing:
- Run metadata (id, status, timing, cost)
- Per-node outputs (accordion, one entry per node)
- Workflow JSON (collapsible code block)
- Two action buttons: **Export JSON** · **Restore Workflow** (loads saved nodes+edges back into canvas, navigates to `/`)

#### Import

A **Import Run** button (top-right of history page) opens a file picker. Accepts `.json` files exported by this app. Calls `POST /api/runs/import`. Duplicate IDs are rejected with a clear error message.

---

## 4. Export / Import Format

```json
{
  "version": 1,
  "exported_at": 1743724800000,
  "run": {
    "id": "...",
    "name": "...",
    "started_at": 1743724000000,
    "finished_at": 1743724100000,
    "status": "completed",
    "total_cost": 0.0042,
    "node_count": 4,
    "workflow": { "nodes": [...], "edges": [...] }
  },
  "outputs": [
    { "node_id": "...", "node_name": "...", "output": "..." }
  ]
}
```

`version` field reserved for future migration support.

---

## 5. New Files Summary

```
app/
  history/
    page.tsx                         # History page root
  api/
    runs/
      route.ts                       # GET (list) + POST (create)
      [id]/
        route.ts                     # GET (single) + DELETE
        export/
          route.ts                   # GET → JSON download
      import/
        route.ts                     # POST → import JSON
      stats/
        route.ts                     # GET → aggregate stats

components/
  history/
    stats-bar.tsx                    # Four summary stat cards
    trend-charts.tsx                 # Three recharts charts
    run-table.tsx                    # Filtered + paginated table
    run-detail-drawer.tsx            # Side drawer with run detail
    import-button.tsx                # File picker + import logic

lib/
  db/
    index.ts                         # getDb() singleton
    runs-repo.ts                     # insertRun, listRuns, getRunById, deleteRun
  store/
    # no new file needed — output collection inlined in run() action
```

---

## 6. Modified Files

| File | Change |
|---|---|
| `lib/store/workflow-store.ts` | Add `workflowName` state + setter; add `node:complete` subscriber + auto-save `fetch` in `run()` finally block |
| `package.json` | Add `better-sqlite3` + `@types/better-sqlite3` + `recharts` |
| `data/.gitkeep` | New `data/` directory, gitignored for `*.db` |
| `.gitignore` | Add `data/` |

---

## 7. Testing

- Unit tests for `lib/db/runs-repo.ts` using an in-memory `better-sqlite3` database (`:memory:`)
- Unit tests for `lib/store/collect-outputs.ts`
- Integration tests for each API route using `node-fetch` against a test DB
- No browser tests for charts (recharts rendering is a visual concern)
