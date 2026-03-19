import { describe, it, expect } from 'vitest'
import { parseWorkflowJSON } from '@/lib/parseWorkflow'

const validWorkflow = {
  nodes: [{ id: 'n1', type: 'prompt', position: { x: 0, y: 0 }, data: { text: 'hello' } }],
  edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
}

describe('parseWorkflowJSON', () => {
  it('parses a valid workflow JSON string', () => {
    const result = parseWorkflowJSON(JSON.stringify(validWorkflow))
    expect(result).not.toBeNull()
    expect(result!.nodes).toHaveLength(1)
    expect(result!.edges).toHaveLength(1)
  })

  it('returns null for invalid JSON', () => {
    expect(parseWorkflowJSON('not json {')).toBeNull()
  })

  it('returns null for non-object JSON', () => {
    expect(parseWorkflowJSON('"just a string"')).toBeNull()
  })

  it('returns empty arrays for missing nodes/edges fields', () => {
    const result = parseWorkflowJSON('{}')
    expect(result).not.toBeNull()
    expect(result!.nodes).toEqual([])
    expect(result!.edges).toEqual([])
  })

  it('adds markerEnd to edges', () => {
    const result = parseWorkflowJSON(JSON.stringify(validWorkflow))
    expect(result!.edges[0].markerEnd).toBeDefined()
  })

  it('round-trips a workflow without data loss', () => {
    const json = JSON.stringify(validWorkflow)
    const result = parseWorkflowJSON(json)
    expect(result!.nodes[0].id).toBe('n1')
    expect(result!.nodes[0].data).toEqual({ text: 'hello' })
  })
})
