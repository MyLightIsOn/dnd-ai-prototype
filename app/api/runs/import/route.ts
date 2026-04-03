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
