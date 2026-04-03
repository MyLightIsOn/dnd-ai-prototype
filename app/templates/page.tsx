'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/lib/store/workflow-store';
import { BUILT_IN_TEMPLATES } from '@/lib/templates/built-in';
import { TemplateCard } from '@/components/templates/template-card';
import { SaveTemplateModal } from '@/components/templates/save-template-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { TemplateRow } from '@/lib/db/templates-repo';
import type { TypedNode } from '@/types';
import type { Edge } from '@xyflow/react';

/** Regenerate all node/edge IDs to avoid collisions when loading a template more than once. */
function regenerateIds(workflow: { nodes: TypedNode[]; edges: Edge[] }): { nodes: TypedNode[]; edges: Edge[] } {
  const idMap = new Map<string, string>();
  const nodes = workflow.nodes.map((n) => {
    const newId = crypto.randomUUID();
    idMap.set(n.id, newId);
    return { ...n, id: newId };
  });
  const edges = workflow.edges.map((e) => ({
    ...e,
    id: crypto.randomUUID(),
    source: idMap.get(e.source) ?? e.source,
    target: idMap.get(e.target) ?? e.target,
  }));
  return { nodes, edges };
}

export default function TemplatesPage() {
  const [userTemplates, setUserTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveOpen, setSaveOpen] = useState(false);
  const [pendingWorkflow, setPendingWorkflow] = useState<{ nodes: TypedNode[]; edges: Edge[]; name: string } | null>(null);

  const nodes = useWorkflowStore((s) => s.nodes);
  const setNodes = useWorkflowStore((s) => s.setNodes);
  const setEdges = useWorkflowStore((s) => s.setEdges);
  const setWorkflowName = useWorkflowStore((s) => s.setWorkflowName);
  const workflowName = useWorkflowStore((s) => s.workflowName);
  const router = useRouter();

  const fetchUserTemplates = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch('/api/templates', { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => setUserTemplates(data.templates ?? []))
      .catch((err) => { if (err.name !== 'AbortError') console.error(err); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const cancel = fetchUserTemplates();
    return cancel;
  }, [fetchUserTemplates]);

  const handleLoad = (workflow: { nodes: TypedNode[]; edges: Edge[] }, name: string) => {
    if (nodes.length > 0) {
      setPendingWorkflow({ ...workflow, name });
    } else {
      applyWorkflow(workflow, name);
    }
  };

  const applyWorkflow = (workflow: { nodes: TypedNode[]; edges: Edge[] }, name: string) => {
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
    setWorkflowName(name);
    router.push('/');
  };

  const handleDelete = (id: string) => {
    fetch(`/api/templates/${id}`, { method: 'DELETE' })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return fetchUserTemplates(); })
      .catch(console.error);
  };

  const handleSave = async (name: string, description: string) => {
    const currentNodes = useWorkflowStore.getState().nodes;
    const currentEdges = useWorkflowStore.getState().edges;
    const body = {
      name,
      description: description || null,
      node_count: currentNodes.length,
      node_types: currentNodes.map((n) => n.type as string),
      workflow: { nodes: currentNodes, edges: currentEdges },
    };
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? 'Save failed');
    }
    fetchUserTemplates();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Workflow Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Start from a built-in template or one you&apos;ve saved</p>
        </div>
        <button
          onClick={() => setSaveOpen(true)}
          disabled={nodes.length === 0}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          + Save Current Workflow
        </button>
      </div>

      {/* Built-in templates */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Built-in Templates</h2>
        <div className="grid grid-cols-3 gap-3">
          {BUILT_IN_TEMPLATES.map((t) => (
            <TemplateCard
              key={t.id}
              name={t.name}
              description={t.description}
              nodeCount={t.node_count}
              nodeTypes={t.node_types}
              onLoad={() => handleLoad(t.buildWorkflow(), t.name)}
            />
          ))}
        </div>
      </section>

      {/* User templates */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">My Templates</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : userTemplates.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-400">Save your current workflow to create a template</p>
            <p className="text-xs text-gray-300 mt-1">Click &quot;+ Save Current Workflow&quot; above</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {userTemplates.map((t) => (
              <TemplateCard
                key={t.id}
                name={t.name}
                description={t.description}
                nodeCount={t.node_count}
                nodeTypes={(() => { try { return JSON.parse(t.node_types) as string[]; } catch { return []; } })()}
                createdAt={t.created_at}
                showDelete
                onLoad={() => {
                  try {
                    const workflow = regenerateIds(JSON.parse(t.workflow) as { nodes: TypedNode[]; edges: Edge[] });
                    handleLoad(workflow, t.name);
                  } catch {
                    console.error('Failed to parse template workflow JSON for:', t.id);
                  }
                }}
                onDelete={() => handleDelete(t.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Confirmation dialog when canvas has nodes */}
      <Dialog open={pendingWorkflow !== null} onOpenChange={(open) => { if (!open) setPendingWorkflow(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Replace current workflow?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            This will replace your current canvas with <strong>&quot;{pendingWorkflow?.name}&quot;</strong>. Unsaved work will be lost.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setPendingWorkflow(null)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (pendingWorkflow) {
                  applyWorkflow(pendingWorkflow, pendingWorkflow.name);
                  setPendingWorkflow(null);
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
            >
              Load Template
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <SaveTemplateModal
        open={saveOpen}
        defaultName={workflowName || 'My Workflow'}
        onSave={handleSave}
        onClose={() => setSaveOpen(false)}
      />
    </div>
  );
}
