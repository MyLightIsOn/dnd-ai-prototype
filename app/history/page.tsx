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
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
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
