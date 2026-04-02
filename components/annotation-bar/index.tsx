"use client"

import { ThumbsUp, ThumbsDown, MessageSquare, Download } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import type { Annotation } from '@/types'
import { getAnnotation, upsertAnnotation, getAnnotations } from '@/lib/annotation/storage'
import { downloadAnnotations } from '@/lib/annotation/export'
import { StarRating } from './star-rating'

interface AnnotationBarProps {
  runId: string
  /** null = single-run annotation (no provider scope) */
  provider: string | null
  /** Show the "Download annotations" button. Only one bar per run should show this. */
  showDownload?: boolean
}

export function AnnotationBar({ runId, provider, showDownload = false }: AnnotationBarProps) {
  const [annotation, setAnnotation] = useState<Annotation | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)

  useEffect(() => {
    setAnnotation(getAnnotation(runId, provider) ?? null)
  }, [runId, provider])

  const update = useCallback(
    (patch: Partial<Pick<Annotation, 'thumbs' | 'rating' | 'notes'>>) => {
      const updated = upsertAnnotation(runId, provider, patch)
      setAnnotation(updated)
    },
    [runId, provider],
  )

  const handleThumbsUp = () => update({ thumbs: annotation?.thumbs === true ? null : true })
  const handleThumbsDown = () => update({ thumbs: annotation?.thumbs === false ? null : false })
  const handleRating = (value: number | null) => update({ rating: value })
  const handleNotes = (e: React.ChangeEvent<HTMLTextAreaElement>) => update({ notes: e.target.value })

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-3 py-2 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {/* Thumbs */}
        <button
          type="button"
          aria-label="Thumbs up"
          aria-pressed={annotation?.thumbs === true}
          onClick={handleThumbsUp}
          className={`transition-colors focus:outline-none ${
            annotation?.thumbs === true ? 'text-green-400' : 'text-zinc-600 hover:text-green-400'
          }`}
        >
          <ThumbsUp size={14} />
        </button>
        <button
          type="button"
          aria-label="Thumbs down"
          aria-pressed={annotation?.thumbs === false}
          onClick={handleThumbsDown}
          className={`transition-colors focus:outline-none ${
            annotation?.thumbs === false ? 'text-red-400' : 'text-zinc-600 hover:text-red-400'
          }`}
        >
          <ThumbsDown size={14} />
        </button>

        {/* Stars */}
        <StarRating value={annotation?.rating ?? null} onChange={handleRating} />

        {/* Notes toggle */}
        <button
          type="button"
          aria-label="Toggle notes"
          onClick={() => setNotesOpen(o => !o)}
          className={`transition-colors focus:outline-none ml-1 ${
            annotation?.notes ? 'text-blue-400' : 'text-zinc-600 hover:text-zinc-400'
          }`}
        >
          <MessageSquare size={14} />
        </button>

        {/* Download */}
        {showDownload && (
          <button
            type="button"
            aria-label="Download annotations as JSON"
            title="Download annotations (JSON)"
            onClick={() => downloadAnnotations(getAnnotations(), 'json')}
            className="text-zinc-600 hover:text-zinc-400 transition-colors focus:outline-none ml-auto"
          >
            <Download size={14} />
          </button>
        )}
      </div>

      {/* Notes textarea — visible when open or when existing notes are non-empty */}
      {(notesOpen || !!annotation?.notes) && (
        <textarea
          value={annotation?.notes ?? ''}
          onChange={handleNotes}
          placeholder="Add notes…"
          rows={2}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-zinc-500"
        />
      )}
    </div>
  )
}
