import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getAnnotations,
  getAnnotation,
  upsertAnnotation,
  deleteAnnotation,
  clearAnnotations,
} from '@/lib/annotation/storage'

// Mock localStorage
const store: Record<string, string> = {}
beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k])
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  })
})

describe('getAnnotations', () => {
  it('returns empty array when no annotations exist', () => {
    expect(getAnnotations()).toEqual([])
  })
})

describe('upsertAnnotation', () => {
  it('creates a new annotation when none exists', () => {
    const ann = upsertAnnotation('run-1', 'anthropic/claude-sonnet-4', { thumbs: true })
    expect(ann.runId).toBe('run-1')
    expect(ann.provider).toBe('anthropic/claude-sonnet-4')
    expect(ann.thumbs).toBe(true)
    expect(ann.rating).toBeNull()
    expect(ann.notes).toBe('')
    expect(ann.id).toBeTruthy()
    expect(ann.createdAt).toBeTruthy()
  })

  it('updates an existing annotation without overwriting untouched fields', () => {
    upsertAnnotation('run-1', 'openai/gpt-4o', { thumbs: true })
    const updated = upsertAnnotation('run-1', 'openai/gpt-4o', { rating: 4 })
    expect(updated.thumbs).toBe(true)    // preserved
    expect(updated.rating).toBe(4)       // updated
    expect(updated.notes).toBe('')       // preserved
  })

  it('preserves createdAt and updates updatedAt on subsequent upsert', () => {
    const first = upsertAnnotation('run-1', null, { notes: 'hello' })
    const second = upsertAnnotation('run-1', null, { notes: 'world' })
    expect(second.createdAt).toBe(first.createdAt)
    expect(second.updatedAt).not.toBe(first.updatedAt)
  })

  it('stores provider=null annotation separately from provider-scoped one', () => {
    upsertAnnotation('run-1', null, { thumbs: false })
    upsertAnnotation('run-1', 'openai/gpt-4o', { thumbs: true })
    expect(getAnnotations()).toHaveLength(2)
    expect(getAnnotation('run-1', null)?.thumbs).toBe(false)
    expect(getAnnotation('run-1', 'openai/gpt-4o')?.thumbs).toBe(true)
  })
})

describe('deleteAnnotation', () => {
  it('removes the annotation by id', () => {
    const ann = upsertAnnotation('run-2', 'openai/gpt-4o', { thumbs: true })
    deleteAnnotation(ann.id)
    expect(getAnnotation('run-2', 'openai/gpt-4o')).toBeUndefined()
  })
})

describe('clearAnnotations', () => {
  it('removes all annotations', () => {
    upsertAnnotation('run-3', null, { thumbs: true })
    upsertAnnotation('run-4', null, { thumbs: false })
    clearAnnotations()
    expect(getAnnotations()).toHaveLength(0)
  })
})
