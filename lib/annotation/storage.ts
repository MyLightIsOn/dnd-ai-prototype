// lib/annotation/storage.ts

import type { Annotation } from '@/types'

const STORAGE_KEY = 'inference-sandbox:annotations'

let _lastNow = ''
function nowIso(): string {
  const ts = new Date().toISOString()
  if (ts === _lastNow) {
    // Bump by 1ms to guarantee uniqueness within the same process tick
    const bumped = new Date(new Date(ts).getTime() + 1).toISOString()
    _lastNow = bumped
    return bumped
  }
  _lastNow = ts
  return ts
}

function readAll(): Annotation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Annotation[]
  } catch {
    return []
  }
}

function writeAll(annotations: Annotation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations))
}

export function getAnnotations(): Annotation[] {
  return readAll()
}

export function getAnnotation(runId: string, provider: string | null): Annotation | undefined {
  return readAll().find(a => a.runId === runId && a.provider === provider)
}

export function upsertAnnotation(
  runId: string,
  provider: string | null,
  patch: Partial<Pick<Annotation, 'thumbs' | 'rating' | 'notes'>>,
): Annotation {
  const all = readAll()
  const now = nowIso()
  const existing = all.find(a => a.runId === runId && a.provider === provider)

  if (existing) {
    const updated: Annotation = { ...existing, ...patch, updatedAt: now }
    writeAll(all.map(a => (a.id === existing.id ? updated : a)))
    return updated
  }

  const created: Annotation = {
    id: crypto.randomUUID(),
    runId,
    provider,
    thumbs: patch.thumbs ?? null,
    rating: patch.rating ?? null,
    notes: patch.notes ?? '',
    createdAt: now,
    updatedAt: now,
  }
  writeAll([...all, created])
  return created
}

export function deleteAnnotation(id: string): void {
  writeAll(readAll().filter(a => a.id !== id))
}

export function clearAnnotations(): void {
  writeAll([])
}
