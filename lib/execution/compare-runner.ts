import type React from 'react'
import type { Edge } from '@xyflow/react'
import type { TypedNode } from '@/types'
import type { RunStats } from '@/types'
import type { ExecutionStatus } from '@/lib/execution/parallel-runner'
import { runParallel } from '@/lib/execution/parallel-runner'

export interface CompareProvider {
  /** "provider/model-id" e.g. "anthropic/claude-3-5-sonnet-20241022" */
  model: string
  /** Display label e.g. "Claude 3.5 Sonnet" */
  displayName: string
  /** When true, this provider is locked (Shadow Test — must be Ollama) */
  isLocked: boolean
}

/**
 * Creates a React state-compatible setter for a specific provider slot.
 * Mutates the logs array in place and calls setCompareLogs to trigger
 * a React re-render.
 *
 * Exported for unit testing.
 */
export function buildCompareSetLogs(
  index: number,
  logs: string[][],
  setCompareLogs: React.Dispatch<React.SetStateAction<string[][]>>,
): React.Dispatch<React.SetStateAction<string[]>> {
  return (action: React.SetStateAction<string[]>) => {
    const prev = logs[index]
    const next = typeof action === 'function' ? action(prev) : action
    logs[index] = next
    // Trigger re-render with a new array reference
    setCompareLogs([...logs])
  }
}

/**
 * Runs the same workflow against N providers in parallel.
 * Each provider gets its own log array. Node visual states are suppressed
 * (no-op setNodes/setEdges) to avoid conflicting state updates across providers.
 */
export async function runCompare(
  providers: CompareProvider[],
  nodes: TypedNode[],
  edges: Edge[],
  setCompareLogs: React.Dispatch<React.SetStateAction<string[][]>>,
  executionControls: React.MutableRefObject<ExecutionStatus>[],
): Promise<RunStats[]> {
  if (executionControls.length < providers.length) {
    throw new Error(
      `runCompare: executionControls.length (${executionControls.length}) must be >= providers.length (${providers.length})`
    )
  }

  // providers may be empty — Promise.allSettled([]) resolves immediately with no runs
  // Mutable log buffer — updated in place, then spread to trigger re-render.
  // Concurrent writes from multiple providers are safe because each provider
  // exclusively writes to its own index slot (index = provider position).
  const logsBuffer: string[][] = providers.map(() => [])

  // No-op setters — we don't update visual node/edge state in compare mode
  const noopSetNodes: React.Dispatch<React.SetStateAction<TypedNode[]>> = () => {}
  const noopSetEdges: React.Dispatch<React.SetStateAction<Edge[]>> = () => {}

  const results = await Promise.allSettled(
    providers.map((provider, i) =>
      runParallel(
        nodes,
        edges,
        buildCompareSetLogs(i, logsBuffer, setCompareLogs),
        noopSetNodes,
        noopSetEdges,
        executionControls[i],
        undefined,
        undefined,
        undefined,
        undefined,
        { providerOverride: provider.model },
      )
    )
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
