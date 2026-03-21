/** A single run output stored for annotation in Phase 2. */
export interface StoredRunOutput {
  nodeId: string
  nodeName: string
  model: string
  output: string
  promptTokens: number
  completionTokens: number
  costUsd: number
}

/** A completed workflow run, stored for later annotation (Phase 2). */
export interface StoredRun {
  id: string
  workflowId: string
  createdAt: string   // ISO 8601
  mode: 'single' | 'compare'
  /** For compare runs: the provider model strings. For single: one entry. */
  providers: string[]
  outputs: StoredRunOutput[]
  totalCostUsd: number
}
