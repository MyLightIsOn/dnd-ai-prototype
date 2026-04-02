// lib/annotation/export.ts

import type { Annotation } from '@/types'

export function exportAnnotationsJson(annotations: Annotation[]): string {
  return JSON.stringify(annotations, null, 2)
}

function csvCell(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value)
  // Wrap in double-quotes if the value contains a comma, double-quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportAnnotationsCsv(annotations: Annotation[]): string {
  const headers = ['id', 'runId', 'provider', 'thumbs', 'rating', 'notes', 'createdAt', 'updatedAt']
  const rows = annotations.map(a => [
    a.id,
    a.runId,
    a.provider,
    a.thumbs,
    a.rating,
    a.notes,
    a.createdAt,
    a.updatedAt,
  ].map(csvCell).join(','))
  return [headers.join(','), ...rows].join('\n')
}

export function downloadAnnotations(annotations: Annotation[], format: 'json' | 'csv'): void {
  const content = format === 'json' ? exportAnnotationsJson(annotations) : exportAnnotationsCsv(annotations)
  const mimeType = format === 'json' ? 'application/json' : 'text/csv'
  const filename = `annotations-${new Date().toISOString().slice(0, 10)}.${format}`
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
