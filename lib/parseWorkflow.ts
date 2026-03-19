import { MarkerType } from '@xyflow/react'
import type { Edge } from '@xyflow/react'
import type { TypedNode } from '@/types'

export interface WorkflowJSON {
  nodes: TypedNode[]
  edges: Edge[]
}

/**
 * Parses a raw JSON string into a workflow.
 * Returns null if the JSON is invalid or missing required fields.
 */
export function parseWorkflowJSON(text: string): WorkflowJSON | null {
  try {
    const parsed = JSON.parse(text) as { nodes?: unknown; edges?: unknown }
    if (!parsed || typeof parsed !== 'object') return null
    const nodes = Array.isArray(parsed.nodes) ? (parsed.nodes as TypedNode[]) : []
    const edges = Array.isArray(parsed.edges)
      ? (parsed.edges as Edge[]).map((ed) => ({
          ...ed,
          markerEnd: { type: MarkerType.ArrowClosed },
        }))
      : []
    return { nodes, edges }
  } catch {
    return null
  }
}
