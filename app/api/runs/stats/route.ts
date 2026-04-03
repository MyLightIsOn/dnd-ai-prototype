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
