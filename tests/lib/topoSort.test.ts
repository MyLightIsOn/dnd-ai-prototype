// tests/lib/topoSort.test.ts
import { describe, it, expect } from 'vitest'
import { topoSort } from '@/lib/topoSort'
import type { Edge } from '@xyflow/react'
import type { TypedNode } from '@/types'

function makeNode(id: string): TypedNode {
  return { id, type: 'prompt', position: { x: 0, y: 0 }, data: { text: '' } } as TypedNode
}

function makeEdge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target }
}

describe('topoSort', () => {
  it('returns nodes in dependency order for a linear chain', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')]
    const { order, hasCycle } = topoSort(nodes, edges)
    expect(hasCycle).toBe(false)
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'))
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'))
  })

  it('detects a cycle', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'a')]
    const { order, hasCycle } = topoSort(nodes, edges)
    expect(hasCycle).toBe(true)
    expect(order).toHaveLength(0)
  })

  it('handles a single node with no edges', () => {
    const nodes = [makeNode('a')]
    const { order, hasCycle } = topoSort(nodes, [])
    expect(hasCycle).toBe(false)
    expect(order).toEqual(['a'])
  })

  it('handles parallel branches (diamond shape)', () => {
    // A -> B, A -> C, B -> D, C -> D
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')]
    const edges = [makeEdge('a', 'b'), makeEdge('a', 'c'), makeEdge('b', 'd'), makeEdge('c', 'd')]
    const { order, hasCycle } = topoSort(nodes, edges)
    expect(hasCycle).toBe(false)
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'))
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('c'))
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('d'))
    expect(order.indexOf('c')).toBeLessThan(order.indexOf('d'))
  })

  it('handles multiple disconnected nodes', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
    const { order, hasCycle } = topoSort(nodes, [])
    expect(hasCycle).toBe(false)
    expect(order).toHaveLength(3)
  })
})
