'use client'

import React from 'react'
import { wordDiff } from '@/lib/diff/word-diff'
import { sentenceDiff } from '@/lib/diff/sentence-diff'
import type { DiffToken } from '@/lib/diff/word-diff'

export type DiffMode = 'word' | 'sentence'

interface DiffOverlayProps {
  mode: DiffMode
  /** Full text output from left (base) provider */
  leftOutput: string
  /** Full text output from right (compare) provider */
  rightOutput: string
  /** When true, swap which side is treated as baseline */
  flipped: boolean
}

function renderTokens(tokens: DiffToken[], highlight: 'purple' | 'blue'): React.ReactNode {
  return tokens.map((t, i) => {
    if (t.type === 'equal') return <span key={i}>{t.text}</span>
    const cls = highlight === 'purple'
      ? 'bg-purple-500/30 text-purple-200 rounded px-0.5'
      : 'bg-blue-500/30 text-blue-200 rounded px-0.5'
    return <span key={i} className={cls}>{t.text}</span>
  })
}

export function DiffOverlay({ mode, leftOutput, rightOutput, flipped }: DiffOverlayProps) {
  const base = flipped ? rightOutput : leftOutput
  const compare = flipped ? leftOutput : rightOutput

  const result = mode === 'word'
    ? wordDiff(base, compare)
    : sentenceDiff(base, compare)

  const isSentenceMode = mode === 'sentence'
  const gap = isSentenceMode ? 'space-y-1' : 'whitespace-pre-wrap'

  return (
    <div className="flex flex-col h-full">
      {/* Summary bar */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-white/10 bg-black/20 text-xs text-white/50 shrink-0">
        <span>
          Length Δ: {Math.abs(leftOutput.length - rightOutput.length)} chars
        </span>
        <span>
          Divergence: <span className="text-white/80 font-medium">{result.divergencePct}%</span>
        </span>
        <span className="ml-auto text-white/30">
          <span className="text-purple-400">■</span> base-only &nbsp;
          <span className="text-blue-400">■</span> compare-only
        </span>
      </div>

      {/* Two panels side by side */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel (base = purple highlights) */}
        <div className="flex-1 overflow-y-auto p-3 font-mono text-xs border-r border-white/10">
          <div className="text-white/40 text-[10px] mb-2 uppercase tracking-wider">
            {flipped ? 'Compare' : 'Base'}
          </div>
          <div className={gap}>
            {renderTokens(result.left, 'purple')}
          </div>
        </div>

        {/* Right panel (compare = blue highlights) */}
        <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
          <div className="text-white/40 text-[10px] mb-2 uppercase tracking-wider">
            {flipped ? 'Base' : 'Compare'}
          </div>
          <div className={gap}>
            {renderTokens(result.right, 'blue')}
          </div>
        </div>
      </div>
    </div>
  )
}
