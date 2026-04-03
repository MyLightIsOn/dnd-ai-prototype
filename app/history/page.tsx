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
