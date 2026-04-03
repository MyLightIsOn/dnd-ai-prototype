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
