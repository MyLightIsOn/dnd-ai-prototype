'use client';
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface TrendPoint {
  started_at: number;
  total_cost: number | null;
  status: string;
}

interface ModelUsage {
  model: string;
  count: number;
}

interface TrendChartsProps {
  trend: TrendPoint[];
  statusCounts: { completed: number; error: number; cancelled: number };
  models: ModelUsage[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e',
  error: '#ef4444',
  cancelled: '#f59e0b',
};

function formatMs(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function TrendCharts({ trend, statusCounts, models }: TrendChartsProps) {
  // Cost over time — oldest first for left-to-right timeline
  const costData = [...trend]
    .reverse()
    .map((p) => ({
      date: formatMs(p.started_at),
      cost: p.total_cost ?? 0,
    }));

  // Status breakdown for donut
  const statusData = [
    { name: 'Completed', value: statusCounts.completed, color: STATUS_COLORS.completed },
    { name: 'Error', value: statusCounts.error, color: STATUS_COLORS.error },
    { name: 'Cancelled', value: statusCounts.cancelled, color: STATUS_COLORS.cancelled },
  ].filter((d) => d.value > 0);

  // Model usage
  const modelData = models.map((m) => ({
    model: m.model.split('/').pop() ?? m.model, // shorten "openai/gpt-4o-mini" → "gpt-4o-mini"
    count: m.count,
  }));

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Cost over time */}
      <div className="bg-white border rounded-xl p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Cost Over Time (last 30 runs)</div>
        {costData.length === 0 ? (
          <div className="text-gray-400 text-sm h-32 flex items-center justify-center">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={costData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(3)}`} />
              <Tooltip formatter={(v: unknown) => [`$${typeof v === 'number' ? v.toFixed(4) : v}`, 'Cost']} />
              <Line type="monotone" dataKey="cost" stroke="#6366f1" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Status breakdown */}
      <div className="bg-white border rounded-xl p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Status Breakdown</div>
        {statusData.length === 0 ? (
          <div className="text-gray-400 text-sm h-32 flex items-center justify-center">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                dataKey="value"
              >
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Model usage */}
      <div className="bg-white border rounded-xl p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Top Models Used</div>
        {modelData.length === 0 ? (
          <div className="text-gray-400 text-sm h-32 flex items-center justify-center">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={modelData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="model" tick={{ fontSize: 10 }} width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
