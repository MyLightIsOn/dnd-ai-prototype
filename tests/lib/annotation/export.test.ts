import { describe, it, expect } from 'vitest'
import { exportAnnotationsJson, exportAnnotationsCsv } from '@/lib/annotation/export'
import type { Annotation } from '@/types'

const sample: Annotation[] = [
  {
    id: 'id-1',
    runId: 'run-1',
    provider: 'anthropic/claude-sonnet-4',
    thumbs: true,
    rating: 5,
    notes: 'Great output',
    createdAt: '2026-04-02T10:00:00.000Z',
    updatedAt: '2026-04-02T10:01:00.000Z',
  },
  {
    id: 'id-2',
    runId: 'run-1',
    provider: null,
    thumbs: null,
    rating: null,
    notes: '',
    createdAt: '2026-04-02T10:00:00.000Z',
    updatedAt: '2026-04-02T10:00:00.000Z',
  },
]

describe('exportAnnotationsJson', () => {
  it('returns valid JSON containing all annotations', () => {
    const json = exportAnnotationsJson(sample)
    const parsed = JSON.parse(json)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].id).toBe('id-1')
  })
})

describe('exportAnnotationsCsv', () => {
  it('includes a header row and one data row per annotation', () => {
    const csv = exportAnnotationsCsv(sample)
    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(3)  // header + 2 data rows
    expect(lines[0]).toContain('runId')
    expect(lines[0]).toContain('provider')
    expect(lines[0]).toContain('thumbs')
    expect(lines[0]).toContain('rating')
    expect(lines[0]).toContain('notes')
  })

  it('escapes commas in notes with double-quotes', () => {
    const withComma: Annotation[] = [
      { ...sample[0], notes: 'Good, but verbose' },
    ]
    const csv = exportAnnotationsCsv(withComma)
    expect(csv).toContain('"Good, but verbose"')
  })

  it('renders null provider as empty string', () => {
    const csv = exportAnnotationsCsv([sample[1]])
    const lines = csv.trim().split('\n')
    expect(lines[1]).toMatch(/^id-2,run-1,,/)
  })
})
