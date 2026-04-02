// types/stats.ts

export interface NodeStats {
  nodeId: string
  nodeName: string
  nodeType: string
  status: 'completed' | 'error' | 'skipped'
  latencyMs: number
  promptTokens: number
  completionTokens: number
  costUsd: number
  errorMessage?: string
}

export interface RunStats {
  /** "provider/model-id" e.g. "anthropic/claude-sonnet-4" — empty string for single-mode runs */
  provider: string
  totalLatencyMs: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  totalCostUsd: number
  nodes: NodeStats[]
}
