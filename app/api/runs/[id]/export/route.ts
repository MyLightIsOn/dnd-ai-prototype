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
