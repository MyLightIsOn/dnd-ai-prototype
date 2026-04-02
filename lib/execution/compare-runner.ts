import type { Dispatch, SetStateAction } from 'react'
import type { Edge } from '@xyflow/react'
import type { TypedNode } from '@/types'
import type { RunStats } from '@/types'
import type { ExecutionStatus, ExecutionEngine } from '@/lib/execution/parallel-runner'
import { runParallel } from '@/lib/execution/parallel-runner'
import { ExecutionEventEmitter } from './events'

export interface CompareProvider {
  /** "provider/model-id" e.g. "anthropic/claude-3-5-sonnet-20241022" */
  model: string
  /** Display label e.g. "Claude 3.5 Sonnet" */
  displayName: string
  /** When true, this provider is locked (Shadow Test — must be Ollama) */
  isLocked: boolean
}

/**
 * Build an ExecutionEngine for a single provider slot in compare mode.
 * Wires log:append / log:update events to the shared compareLogs state updater.
 */
function buildCompareEngine(
  index: number,
  setCompareLogs: Dispatch<SetStateAction<string[][]>>,
  executionControl: { current: ExecutionStatus },
): ExecutionEngine {
  const emitter = new ExecutionEventEmitter();

  emitter.on('log:append', (e) => {
    if (e.type === 'log:append') {
      setCompareLogs(prev => {
        const updated = prev.map(l => [...l]);
        updated[index] = [...(updated[index] ?? []), e.message];
        return updated;
      });
    }
  });

  emitter.on('log:update', (e) => {
    if (e.type === 'log:update') {
      setCompareLogs(prev => {
        const updated = prev.map(l => [...l]);
        const logs = updated[index] ?? [];
        const idx = e.index === 'last' ? logs.length - 1 : e.index;
        if (idx >= 0 && idx < logs.length) {
          logs[idx] = e.message;
        }
        updated[index] = logs;
        return updated;
      });
    }
  });

  return {
    emitter,
    control: executionControl,
    errorRecovery: { current: null },
    reviewDecision: { current: null },
  };
}

/**
 * Runs the same workflow against N providers in parallel.
 * Each provider gets its own log array and emitter. Node visual states are
 * suppressed (no node/edge state listeners registered on the emitter).
 */
export async function runCompare(
  providers: CompareProvider[],
  nodes: TypedNode[],
  edges: Edge[],
  setCompareLogs: Dispatch<SetStateAction<string[][]>>,
  executionControls: Array<{ current: ExecutionStatus }>,
): Promise<RunStats[]> {
  if (executionControls.length < providers.length) {
    throw new Error(
      `runCompare: executionControls.length (${executionControls.length}) must be >= providers.length (${providers.length})`
    )
  }

  // providers may be empty — Promise.allSettled([]) resolves immediately with no runs
  const results = await Promise.allSettled(
    providers.map((provider, i) => {
      const engine = buildCompareEngine(i, setCompareLogs, executionControls[i]);
      return runParallel(
        nodes,
        edges,
        engine,
        { providerOverride: provider.model },
      );
    })
  )

  return results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value.stats
    return {
      provider: providers[i].model,
      totalLatencyMs: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      nodes: [],
    } satisfies RunStats
  })
}
