'use client';
import { create } from 'zustand';
import type { Edge } from '@xyflow/react';
import type { TypedNode, NodeData, RunStats } from '@/types';
import type { ExecutionStatus, RunOptions, ExecutionEngine } from '@/lib/execution/parallel-runner';
import { runParallel } from '@/lib/execution/parallel-runner';
import { ExecutionEventEmitter } from '@/lib/execution/events';
import type { CompareProvider } from '@/lib/execution/compare-runner';
import type { LoopData } from '@/types';

interface WorkflowState {
  // Graph
  nodes: TypedNode[];
  edges: Edge[];
  selectedId: string | null;

  // Execution
  executionStatus: ExecutionStatus;
  logs: string[];
  currentError: { nodeId: string; nodeName: string; message: string } | null;
  reviewRequest: import('@/lib/execution/events').ReviewRequest | null;

  // Compare mode
  compareMode: boolean;
  compareProviders: CompareProvider[];
  compareLogs: string[][];
  runStats: RunStats[] | null;
  statsOpen: boolean;

  // Settings
  settingsOpen: boolean;

  // Workflow metadata
  workflowName: string;

  // Execution control (mutable ref-like objects — same shape as React.MutableRefObject)
  executionControl: { current: ExecutionStatus };
  errorRecoveryAction: { current: 'retry' | 'skip' | 'abort' | null };
  reviewDecision: { current: import('@/lib/execution/node-executor').ReviewDecisionResult | null };
  compareControls: Array<{ current: ExecutionStatus }>;

  // Actions
  setNodes: (updater: TypedNode[] | ((prev: TypedNode[]) => TypedNode[])) => void;
  setEdges: (updater: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  setSelectedId: (id: string | null) => void;
  setLogs: (updater: string[] | ((prev: string[]) => string[])) => void;
  setExecutionStatus: (status: ExecutionStatus) => void;
  setCurrentError: (
    error:
      | { nodeId: string; nodeName: string; message: string }
      | null
      | ((prev: { nodeId: string; nodeName: string; message: string } | null) =>
          { nodeId: string; nodeName: string; message: string } | null)
  ) => void;
  setCompareMode: (mode: boolean) => void;
  setCompareProviders: (providers: CompareProvider[]) => void;
  setCompareLogs: (updater: string[][] | ((prev: string[][]) => string[][])) => void;
  setRunStats: (stats: RunStats[] | null) => void;
  setStatsOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setWorkflowName: (name: string) => void;
  setCompareControls: (controls: Array<{ current: ExecutionStatus }>) => void;
  setReviewRequest: (req: import('@/lib/execution/events').ReviewRequest | null) => void;
  setReviewDecision: (decision: import('@/lib/execution/node-executor').ReviewDecisionResult | null) => void;
  updateNodeData: (nodeId: string, patch: Partial<NodeData>) => void;
  run: (options?: RunOptions) => Promise<void>;
}

export const initialWorkflowState = {
  nodes: [] as TypedNode[],
  edges: [] as Edge[],
  selectedId: null as string | null,
  executionStatus: 'idle' as ExecutionStatus,
  logs: [] as string[],
  currentError: null as { nodeId: string; nodeName: string; message: string } | null,
  compareMode: false,
  compareProviders: [
    { model: 'openai/gpt-4o', displayName: 'GPT-4o', isLocked: false },
    { model: 'anthropic/claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet', isLocked: false },
  ] as CompareProvider[],
  compareLogs: [[], []] as string[][],
  runStats: null as RunStats[] | null,
  statsOpen: false,
  settingsOpen: false,
  workflowName: 'Untitled',
  executionControl: { current: 'idle' as ExecutionStatus },
  errorRecoveryAction: { current: null as 'retry' | 'skip' | 'abort' | null },
  reviewDecision: { current: null as import('@/lib/execution/node-executor').ReviewDecisionResult | null },
  compareControls: [{ current: 'idle' as ExecutionStatus }, { current: 'idle' as ExecutionStatus }],
  reviewRequest: null as import('@/lib/execution/events').ReviewRequest | null,
};

/**
 * Wire an ExecutionEventEmitter to store state setters.
 * Returns a cleanup function that removes all subscriptions.
 */
function createStoreBridge(
  emitter: ExecutionEventEmitter,
  store: {
    setLogs: WorkflowState['setLogs'];
    setNodes: WorkflowState['setNodes'];
    setEdges: WorkflowState['setEdges'];
    setCurrentError: WorkflowState['setCurrentError'];
    setReviewRequest: WorkflowState['setReviewRequest'];
  }
): () => void {
  const unsubs: Array<() => void> = [];

  unsubs.push(emitter.on('log:append', (e) => {
    if (e.type === 'log:append') store.setLogs(logs => [...logs, e.message]);
  }));

  unsubs.push(emitter.on('log:update', (e) => {
    if (e.type === 'log:update') store.setLogs(logs => {
      const updated = [...logs];
      const idx = e.index === 'last' ? updated.length - 1 : e.index;
      if (idx >= 0 && idx < updated.length) updated[idx] = e.message;
      return updated;
    });
  }));

  unsubs.push(emitter.on('node:start', (e) => {
    if (e.type === 'node:start') store.setNodes(nodes => nodes.map(n =>
      n.id === e.nodeId ? { ...n, data: { ...n.data, executionState: 'executing' as const } } : n
    ));
  }));

  unsubs.push(emitter.on('node:complete', (e) => {
    if (e.type === 'node:complete') store.setNodes(nodes => nodes.map(n =>
      n.id === e.nodeId ? { ...n, data: { ...n.data, executionState: 'completed' as const } } : n
    ));
  }));

  unsubs.push(emitter.on('node:error', (e) => {
    if (e.type === 'node:error') store.setNodes(nodes => nodes.map(n =>
      n.id === e.nodeId ? { ...n, data: { ...n.data, executionState: 'error' as const, executionError: e.error } } : n
    ));
  }));

  unsubs.push(emitter.on('node:data', (e) => {
    if (e.type === 'node:data') {
      const { tokenData: _t, ...patch } = e.patch as Record<string, unknown>;
      if (Object.keys(patch).length > 0) store.setNodes(nodes => nodes.map(n =>
        n.id === e.nodeId ? { ...n, data: { ...n.data, ...patch } } : n
      ));
    }
  }));

  unsubs.push(emitter.on('edge:style', (e) => {
    if (e.type === 'edge:style') {
      store.setEdges(edges => edges.map(edge => {
        const update = e.updates.find(u => u.edgeId === edge.id);
        return update ? { ...edge, style: update.style, animated: update.animated } : edge;
      }));
    }
  }));

  unsubs.push(emitter.on('execution:cancelled', () => {
    store.setNodes(nodes => nodes.map(n => ({
      ...n,
      data: { ...n.data, executionState: 'idle' as const }
    })));
  }));

  unsubs.push(emitter.on('execution:error', () => {
    store.setNodes(nodes => nodes.map(n => ({
      ...n,
      data: { ...n.data, executionState: 'idle' as const }
    })));
  }));

  unsubs.push(emitter.on('error-recovery:request', (e) => {
    if (e.type === 'error-recovery:request') {
      store.setCurrentError({ nodeId: e.nodeId, nodeName: e.nodeName, message: e.message });
    }
  }));

  unsubs.push(emitter.on('review:request', (e) => {
    if (e.type === 'review:request') {
      store.setReviewRequest(e.request);
    }
  }));

  return () => unsubs.forEach(fn => fn());
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  ...initialWorkflowState,

  setNodes: (updater) => set(state => ({
    nodes: typeof updater === 'function' ? updater(state.nodes) : updater,
  })),
  setEdges: (updater) => set(state => ({
    edges: typeof updater === 'function' ? updater(state.edges) : updater,
  })),
  setSelectedId: (id) => set({ selectedId: id }),
  setLogs: (updater) => set(state => ({
    logs: typeof updater === 'function' ? updater(state.logs) : updater,
  })),
  setExecutionStatus: (status) => set({ executionStatus: status }),
  setCurrentError: (error) => set(state => ({
    currentError: typeof error === 'function' ? error(state.currentError) : error,
  })),
  setCompareMode: (mode) => set({ compareMode: mode }),
  setCompareProviders: (providers) => set({ compareProviders: providers }),
  setCompareLogs: (updater) => set(state => ({
    compareLogs: typeof updater === 'function' ? updater(state.compareLogs) : updater,
  })),
  setRunStats: (stats) => set({ runStats: stats }),
  setStatsOpen: (open) => set({ statsOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setCompareControls: (controls) => set({ compareControls: controls }),
  setReviewRequest: (req) => set({ reviewRequest: req }),
  setReviewDecision: (decision) => set(state => {
    state.reviewDecision.current = decision;
    return {};
  }),
  updateNodeData: (nodeId, patch) => set(state => ({
    nodes: state.nodes.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, ...patch } as NodeData } : n
    ),
  })),

  run: async (options?: RunOptions) => {
    const state = get();
    const { executionControl, errorRecoveryAction, reviewDecision, setRunStats } = state;

    // Prevent double-run
    if (executionControl.current === 'running') return;

    // Set status to running
    set({ executionStatus: 'running' });
    executionControl.current = 'running';
    errorRecoveryAction.current = null;

    // Pre-execution: clear logs, reset node/edge states
    get().setLogs([]);
    get().setNodes(get().nodes.map(node => {
      const base = { ...node, data: { ...node.data, executionState: 'idle' as const, executionError: undefined } };
      if (node.type === 'loop') {
        return { ...base, data: { ...base.data, currentIteration: 0, executedExit: false } as LoopData & { executionState: 'idle'; executionError: undefined } };
      }
      return base;
    }));
    get().setEdges(get().edges.map(edge => ({
      ...edge,
      style: { stroke: '#e5e7eb', strokeWidth: 1, opacity: 1 },
      animated: false,
    })));

    // Create emitter and bridge
    const emitter = new ExecutionEventEmitter();

    // Collect node outputs for history save
    const collectedOutputs = new Map<string, string>();
    const unsubOutputs = emitter.on('node:complete', (e) => {
      collectedOutputs.set(e.nodeId, e.output);
    });

    const cleanup = createStoreBridge(emitter, {
      setLogs: get().setLogs,
      setNodes: get().setNodes,
      setEdges: get().setEdges,
      setCurrentError: get().setCurrentError,
      setReviewRequest: get().setReviewRequest,
    });

    const engine: ExecutionEngine = {
      emitter,
      control: executionControl,
      errorRecovery: errorRecoveryAction,
      reviewDecision,
    };

    const startedAt = Date.now();
    let finalStatus: 'completed' | 'error' | 'cancelled' = 'completed';
    let finalCostUsd: number | null = null;

    try {
      const { stats } = await runParallel(get().nodes, get().edges, engine, options);
      setRunStats([stats]);
      finalCostUsd = stats.totalCostUsd ?? null;
      if ((executionControl.current as ExecutionStatus) === 'cancelled') finalStatus = 'cancelled';
    } catch {
      finalStatus = 'error';
    } finally {
      unsubOutputs();
      cleanup();

      const currentStatus = executionControl.current;
      if (currentStatus === 'running' || currentStatus === 'paused') {
        set({ executionStatus: 'idle' });
        executionControl.current = 'idle';
      }

      // Auto-save to history (fire-and-forget)
      const nodes = get().nodes;
      const edges = get().edges;
      const runId = crypto.randomUUID();
      const outputs = nodes
        .filter((n) => collectedOutputs.has(n.id))
        .map((n) => ({
          id: crypto.randomUUID(),
          node_id: n.id,
          node_name: (n.data as { name?: string }).name ?? n.type ?? null,
          output: collectedOutputs.get(n.id) ?? null,
        }));

      fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: runId,
          name: get().workflowName || 'Untitled',
          started_at: startedAt,
          finished_at: Date.now(),
          status: finalStatus,
          total_cost: finalCostUsd,
          node_count: nodes.length,
          workflow: { nodes, edges },
          outputs,
        }),
      }).catch((err) => {
        console.error('[auto-save] Failed to save run to history:', err);
      });
    }
  },
}));
