'use client';
import { create } from 'zustand';
import type { Edge } from '@xyflow/react';
import type { TypedNode, NodeData, RunStats } from '@/types';
import type { ExecutionStatus } from '@/lib/execution/parallel-runner';
import type { CompareProvider } from '@/lib/execution/compare-runner';

interface WorkflowState {
  // Graph
  nodes: TypedNode[];
  edges: Edge[];
  selectedId: string | null;

  // Execution
  executionStatus: ExecutionStatus;
  logs: string[];
  currentError: { nodeId: string; nodeName: string; message: string } | null;

  // Compare mode
  compareMode: boolean;
  compareProviders: CompareProvider[];
  compareLogs: string[][];
  runStats: RunStats[] | null;
  statsOpen: boolean;

  // Settings
  settingsOpen: boolean;

  // Execution control (mutable ref-like objects — same shape as React.MutableRefObject)
  executionControl: { current: ExecutionStatus };
  errorRecoveryAction: { current: 'retry' | 'skip' | 'abort' | null };
  compareControls: Array<{ current: ExecutionStatus }>;

  // Actions
  setNodes: (updater: TypedNode[] | ((prev: TypedNode[]) => TypedNode[])) => void;
  setEdges: (updater: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  setSelectedId: (id: string | null) => void;
  setLogs: (updater: string[] | ((prev: string[]) => string[])) => void;
  setExecutionStatus: (status: ExecutionStatus) => void;
  setCurrentError: (error: { nodeId: string; nodeName: string; message: string } | null) => void;
  setCompareMode: (mode: boolean) => void;
  setCompareProviders: (providers: CompareProvider[]) => void;
  setCompareLogs: (updater: string[][] | ((prev: string[][]) => string[][])) => void;
  setRunStats: (stats: RunStats[] | null) => void;
  setStatsOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  updateNodeData: (nodeId: string, patch: Partial<NodeData>) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, _get) => ({
  nodes: [],
  edges: [],
  selectedId: null,
  executionStatus: 'idle',
  logs: [],
  currentError: null,
  compareMode: false,
  compareProviders: [
    { model: 'openai/gpt-4o', displayName: 'GPT-4o', isLocked: false },
    { model: 'anthropic/claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet', isLocked: false },
  ],
  compareLogs: [[], []],
  runStats: null,
  statsOpen: false,
  settingsOpen: false,
  executionControl: { current: 'idle' },
  errorRecoveryAction: { current: null },
  compareControls: [{ current: 'idle' }, { current: 'idle' }],

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
  setCurrentError: (error) => set({ currentError: error }),
  setCompareMode: (mode) => set({ compareMode: mode }),
  setCompareProviders: (providers) => set({ compareProviders: providers }),
  setCompareLogs: (updater) => set(state => ({
    compareLogs: typeof updater === 'function' ? updater(state.compareLogs) : updater,
  })),
  setRunStats: (stats) => set({ runStats: stats }),
  setStatsOpen: (open) => set({ statsOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  updateNodeData: (nodeId, patch) => set(state => ({
    nodes: state.nodes.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, ...patch } as NodeData } : n
    ),
  })),
}));
