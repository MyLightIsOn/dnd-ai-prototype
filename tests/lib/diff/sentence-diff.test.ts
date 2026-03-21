import { describe, it, expect } from 'vitest'
import { sentenceDiff } from '@/lib/diff/sentence-diff'

describe('sentenceDiff', () => {
  it('marks all sentences equal when texts are identical', () => {
    const { left, right } = sentenceDiff('Hello world. Goodbye world.', 'Hello world. Goodbye world.')
    expect(left.every(t => t.type === 'equal')).toBe(true)
    expect(right.every(t => t.type === 'equal')).toBe(true)
  })

  it('marks sentences as left-only and right-only when nothing matches', () => {
    const { left, right } = sentenceDiff('Foo bar.', 'Baz qux.')
    expect(left.every(t => t.type === 'left-only')).toBe(true)
    expect(right.every(t => t.type === 'right-only')).toBe(true)
  })

  it('identifies shared sentences amid different ones', () => {
    const { left, right } = sentenceDiff(
      'The sky is blue. Cats are great. Dogs are loyal.',
      'The sky is blue. Fish are silent. Dogs are loyal.',
    )
    const leftTypes = left.map(t => t.type)
    const rightTypes = right.map(t => t.type)
    expect(leftTypes).toContain('equal')
    expect(leftTypes).toContain('left-only')
    expect(rightTypes).toContain('equal')
    expect(rightTypes).toContain('right-only')
  })

  it('handles empty strings', () => {
    const { left, right } = sentenceDiff('', '')
    expect(left).toHaveLength(0)
    expect(right).toHaveLength(0)
  })

  it('computes divergencePct as 0 for identical texts', () => {
    const { divergencePct } = sentenceDiff('Same text. Same again.', 'Same text. Same again.')
    expect(divergencePct).toBe(0)
  })
})
