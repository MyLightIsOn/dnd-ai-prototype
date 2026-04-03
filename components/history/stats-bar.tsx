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
