'use client';
import React, { useEffect, useState, useCallback } from 'react';

export interface RunSummary {
  id: string;
  name: string;
  started_at: number;
  finished_at: number | null;
  status: 'completed' | 'error' | 'cancelled';
  total_cost: number | null;
  node_count: number | null;
}

interface RunTableProps {
  onView: (run: RunSummary) => void;
}

const PAGE_SIZE = 25;

const STATUS_BADGE: Record<RunSummary['status'], string> = {
  completed: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  cancelled: 'bg-yellow-100 text-yellow-700',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(started: number, finished: number | null): string {
  if (!finished) return '—';
  const ms = finished - started;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function RunTable({ onView }: RunTableProps) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRuns = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (search) params.set('search', search);
    if (status) params.set('status', status);

    fetch(`/api/runs?${params}`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        setRuns(data.runs ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((err) => { if (err.name !== 'AbortError') console.error(err); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [page, search, status]);

  useEffect(() => {
    const cancel = fetchRuns();
    return cancel;
  }, [fetchRuns]);

  const handleDelete = (id: string) => {
    if (!confirm('Delete this run?')) return;
    fetch(`/api/runs/${id}`, { method: 'DELETE' })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return fetchRuns(); })
      .catch(console.error);
  };

  const handleExport = (id: string, name: string) => {
    const a = document.createElement('a');
    a.href = `/api/runs/${id}/export`;
    a.download = `run-${name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b">
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-56"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="error">Error</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">{total} run{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
      ) : runs.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No runs found.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Started</th>
              <th className="text-left px-4 py-3 font-medium">Duration</th>
              <th className="text-left px-4 py-3 font-medium">Cost</th>
              <th className="text-left px-4 py-3 font-medium">Nodes</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {runs.map((run) => (
              <tr key={run.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{run.name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[run.status] ?? ''}`}>
                    {run.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(run.started_at)}</td>
                <td className="px-4 py-3 text-gray-500">{formatDuration(run.started_at, run.finished_at)}</td>
                <td className="px-4 py-3 text-gray-500">
                  {run.total_cost != null ? `$${run.total_cost.toFixed(4)}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">{run.node_count ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onView(run)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleExport(run.id, run.name)}
                      className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                    >
                      Export
                    </button>
                    <button
                      onClick={() => handleDelete(run.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
