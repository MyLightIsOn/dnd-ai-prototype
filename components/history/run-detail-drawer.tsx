'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/lib/store/workflow-store';
import type { TypedNode } from '@/types';
import type { Edge } from '@xyflow/react';

interface RunOutput {
  id: string;
  run_id: string;
  node_id: string;
  node_name: string | null;
  output: string | null;
}

interface RunDetail {
  id: string;
  name: string;
  started_at: number;
  finished_at: number | null;
  status: 'completed' | 'error' | 'cancelled';
  total_cost: number | null;
  node_count: number | null;
  workflow: string; // JSON string from DB
  outputs: RunOutput[];
}

interface RunDetailDrawerProps {
  runId: string | null;
  onClose: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  completed: 'text-green-600',
  error: 'text-red-600',
  cancelled: 'text-yellow-600',
};

export function RunDetailDrawer({ runId, onClose }: RunDetailDrawerProps) {
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [workflowExpanded, setWorkflowExpanded] = useState(false);
  const [openOutputs, setOpenOutputs] = useState<Set<string>>(new Set());
  const router = useRouter();
  const setNodes = useWorkflowStore((s) => s.setNodes);
  const setEdges = useWorkflowStore((s) => s.setEdges);
  const setWorkflowName = useWorkflowStore((s) => s.setWorkflowName);

  useEffect(() => {
    if (!runId) {
      setRun(null);
      return;
    }
    setLoading(true);
    setWorkflowExpanded(false);
    setOpenOutputs(new Set());
    fetch(`/api/runs/${runId}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setRun)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [runId]);

  const handleExport = () => {
    if (!run) return;
    const a = document.createElement('a');
    a.href = `/api/runs/${run.id}/export`;
    a.download = `run-${run.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRestore = () => {
    if (!run) return;
    let workflow: { nodes: TypedNode[]; edges: Edge[] };
    try {
      workflow = JSON.parse(run.workflow) as { nodes: TypedNode[]; edges: Edge[] };
    } catch {
      console.error('Failed to parse workflow JSON');
      return;
    }
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
    setWorkflowName(run.name);
    onClose();
    router.push('/');
  };

  const toggleOutput = (outputId: string) => {
    setOpenOutputs((prev) => {
      const next = new Set(prev);
      if (next.has(outputId)) next.delete(outputId);
      else next.add(outputId);
      return next;
    });
  };

  const isOpen = runId !== null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[480px] bg-white shadow-2xl z-50 overflow-y-auto transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{run?.name ?? '…'}</h2>
              {run && (
                <span className={`text-sm font-medium ${STATUS_COLOR[run.status] ?? ''}`}>
                  {run.status}
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>

          {loading && <div className="text-gray-400 text-sm">Loading…</div>}

          {run && !loading && (
            <>
              {/* Metadata */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-gray-500">Run ID</dt>
                <dd className="font-mono text-xs truncate text-gray-700">{run.id}</dd>
                <dt className="text-gray-500">Started</dt>
                <dd className="text-gray-700">{new Date(run.started_at).toLocaleString()}</dd>
                <dt className="text-gray-500">Duration</dt>
                <dd className="text-gray-700">
                  {run.finished_at
                    ? `${((run.finished_at - run.started_at) / 1000).toFixed(1)}s`
                    : '—'}
                </dd>
                <dt className="text-gray-500">Cost</dt>
                <dd className="text-gray-700">
                  {run.total_cost != null ? `$${run.total_cost.toFixed(4)}` : '—'}
                </dd>
                <dt className="text-gray-500">Nodes</dt>
                <dd className="text-gray-700">{run.node_count ?? '—'}</dd>
              </dl>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  className="flex-1 py-2 px-4 border rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Export JSON
                </button>
                <button
                  onClick={handleRestore}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Restore Workflow
                </button>
              </div>

              {/* Node outputs */}
              {run.outputs.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Node Outputs</div>
                  <div className="space-y-2">
                    {run.outputs.map((o) => (
                      <div key={o.id} className="border rounded-lg overflow-hidden">
                        <button
                          className="w-full text-left px-3 py-2 bg-gray-50 text-sm font-medium hover:bg-gray-100 flex items-center justify-between"
                          onClick={() => toggleOutput(o.id)}
                        >
                          <span>{o.node_name ?? o.node_id}</span>
                          <span className="text-gray-400">{openOutputs.has(o.id) ? '▲' : '▼'}</span>
                        </button>
                        {openOutputs.has(o.id) && (
                          <pre className="px-3 py-2 text-xs text-gray-700 whitespace-pre-wrap bg-white max-h-48 overflow-y-auto">
                            {o.output ?? '(empty)'}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workflow JSON */}
              <div>
                <button
                  className="text-xs text-gray-500 uppercase tracking-wide hover:text-gray-700 flex items-center gap-1"
                  onClick={() => setWorkflowExpanded((v) => !v)}
                >
                  Workflow JSON {workflowExpanded ? '▲' : '▼'}
                </button>
                {workflowExpanded && (() => {
                  let pretty = run.workflow;
                  try { pretty = JSON.stringify(JSON.parse(run.workflow), null, 2); } catch { /* use raw */ }
                  return (
                    <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 max-h-64 overflow-auto whitespace-pre-wrap">
                      {pretty}
                    </pre>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
