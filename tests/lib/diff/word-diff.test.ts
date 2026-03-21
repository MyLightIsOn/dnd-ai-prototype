import { describe, it, expect } from 'vitest'
import { wordDiff } from '@/lib/diff/word-diff'

describe('wordDiff', () => {
  it('marks all tokens equal when strings are identical', () => {
    const { left, right } = wordDiff('hello world', 'hello world')
    expect(left.every(t => t.type === 'equal')).toBe(true)
    expect(right.every(t => t.type === 'equal')).toBe(true)
  })

  it('marks all tokens as left-only and right-only when strings share nothing', () => {
    const { left, right } = wordDiff('foo bar', 'baz qux')
    expect(left.every(t => t.type === 'left-only')).toBe(true)
    expect(right.every(t => t.type === 'right-only')).toBe(true)
  })

  it('marks shared words as equal and unique words per side', () => {
    const { left, right } = wordDiff('the quick brown fox', 'the slow green fox')
    const leftTexts = left.map(t => `${t.type}:${t.text}`)
    const rightTexts = right.map(t => `${t.type}:${t.text}`)
    expect(leftTexts).toContain('equal:the')
    expect(leftTexts).toContain('left-only:quick')
    expect(leftTexts).toContain('left-only:brown')
    expect(leftTexts).toContain('equal:fox')
    expect(rightTexts).toContain('equal:the')
    expect(rightTexts).toContain('right-only:slow')
    expect(rightTexts).toContain('right-only:green')
    expect(rightTexts).toContain('equal:fox')
  })

  it('handles empty strings', () => {
    const { left, right } = wordDiff('', '')
    expect(left).toHaveLength(0)
    expect(right).toHaveLength(0)
  })

  it('handles one empty string', () => {
    const { left, right } = wordDiff('hello world', '')
    expect(left.every(t => t.type === 'left-only')).toBe(true)
    expect(right).toHaveLength(0)
  })

  it('computes divergence percentage as 0 for identical strings', () => {
    const { divergencePct } = wordDiff('hello world', 'hello world')
    expect(divergencePct).toBe(0)
  })

  it('computes divergence percentage as 100 for completely different strings', () => {
    const { divergencePct } = wordDiff('foo bar', 'baz qux')
    expect(divergencePct).toBe(100)
  })

  it('computes partial divergence correctly', () => {
    // 'the fox' are shared (2 words), 'quick brown' left-only (2), 'slow green' right-only (2)
    const { divergencePct } = wordDiff('the quick brown fox', 'the slow green fox')
    expect(divergencePct).toBeGreaterThan(50)
    expect(divergencePct).toBeLessThan(80)
  })
})
