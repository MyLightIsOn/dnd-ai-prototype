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
