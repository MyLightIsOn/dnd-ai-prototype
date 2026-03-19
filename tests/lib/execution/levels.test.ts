// tests/lib/execution/levels.test.ts
import { describe, it, expect } from 'vitest'
import { groupNodesByLevel, getNodeDependencies, getNodeDependents } from '@/lib/execution/levels'
import type { Edge } from '@xyflow/react'
import type { Id } from '@/types'

function makeEdge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target }
}

describe('groupNodesByLevel', () => {
  it('places root nodes at level 0', () => {
    const result = groupNodesByLevel(['a', 'b'] as Id[], [])
    expect(result).toHaveLength(1)
    expect(result[0]).toContain('a')
    expect(result[0]).toContain('b')
  })

  it('groups a linear chain into sequential levels', () => {
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')]
    const result = groupNodesByLevel(['a', 'b', 'c'] as Id[], edges)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual(['a'])
    expect(result[1]).toEqual(['b'])
    expect(result[2]).toEqual(['c'])
  })

  it('groups parallel branches at the same level', () => {
    // A -> B, A -> C, B -> D, C -> D
    const edges = [makeEdge('a', 'b'), makeEdge('a', 'c'), makeEdge('b', 'd'), makeEdge('c', 'd')]
    const result = groupNodesByLevel(['a', 'b', 'c', 'd'] as Id[], edges)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual(['a'])
    expect(result[1]).toContain('b')
    expect(result[1]).toContain('c')
    expect(result[2]).toEqual(['d'])
  })

  it('handles a single node', () => {
    const result = groupNodesByLevel(['a'] as Id[], [])
    expect(result).toEqual([['a']])
  })

  it('places a node at the deepest required level when it has multiple parents', () => {
    // A(0) -> C(1), B(0) -> C(1) — C should be level 1, not 0
    const edges = [makeEdge('a', 'c'), makeEdge('b', 'c')]
    const result = groupNodesByLevel(['a', 'b', 'c'] as Id[], edges)
    expect(result[0]).toContain('a')
    expect(result[0]).toContain('b')
    expect(result[1]).toEqual(['c'])
  })
})

describe('getNodeDependencies', () => {
  it('returns source nodes for a given target', () => {
    const edges = [makeEdge('a', 'b'), makeEdge('c', 'b'), makeEdge('b', 'd')]
    const deps = getNodeDependencies('b' as Id, edges)
    expect(deps).toContain('a')
    expect(deps).toContain('c')
    expect(deps).not.toContain('d')
  })

  it('returns empty array for a root node', () => {
    const edges = [makeEdge('a', 'b')]
    expect(getNodeDependencies('a' as Id, edges)).toEqual([])
  })
})

describe('getNodeDependents', () => {
  it('returns target nodes for a given source', () => {
    const edges = [makeEdge('a', 'b'), makeEdge('a', 'c')]
    const deps = getNodeDependents('a' as Id, edges)
    expect(deps).toContain('b')
    expect(deps).toContain('c')
  })
})
