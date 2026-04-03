import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/index';
import { deleteTemplate } from '@/lib/db/templates-repo';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const deleted = deleteTemplate(getDb(), id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/templates/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
