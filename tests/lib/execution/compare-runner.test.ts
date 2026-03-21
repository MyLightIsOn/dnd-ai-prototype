import { describe, it, expect, vi } from 'vitest'
import { buildCompareSetLogs } from '@/lib/execution/compare-runner'

describe('buildCompareSetLogs', () => {
  it('returns a setter function that appends to the correct provider slot', () => {
    const logs: string[][] = [[], []]
    const setter0 = buildCompareSetLogs(0, logs, vi.fn())
    setter0((prev) => [...prev, 'hello from provider 0'])
    expect(logs[0]).toEqual(['hello from provider 0'])
    expect(logs[1]).toEqual([])
  })

  it('supports direct array replacement (not just function form)', () => {
    const logs: string[][] = [['old'], []]
    const setter0 = buildCompareSetLogs(0, logs, vi.fn())
    setter0(['new entry'])
    expect(logs[0]).toEqual(['new entry'])
  })

  it('calls the React state updater to trigger re-render', () => {
    const logs: string[][] = [[], []]
    const mockSetLogs = vi.fn()
    const setter0 = buildCompareSetLogs(0, logs, mockSetLogs)
    setter0(['entry'])
    expect(mockSetLogs).toHaveBeenCalled()
  })
})
