'use client'

import React, { useState } from 'react'
import { ConsoleColumn } from './column'
import { DiffOverlay, type DiffMode } from './diff-overlay'
import type { CompareProvider } from '@/lib/execution/compare-runner'

interface CompareConsoleProps {
  providers: CompareProvider[]
  logs: string[][]
  onClear: () => void
}

/** Extract the last meaningful agent output from a log array for diffing */
function extractOutput(logs: string[]): string {
  const agentLogs = logs.filter(l => l.startsWith('🤖'))
  if (agentLogs.length === 0) return logs.join('\n')
  // Strip the header line (emoji + name + model) and return the content
  const last = agentLogs[agentLogs.length - 1]
  const lines = last.split('\n')
  return lines.slice(1).join('\n').trim()
}

export function CompareConsole({ providers, logs, onClear }: CompareConsoleProps) {
  const [diffMode, setDiffMode] = useState<DiffMode | 'off'>('off')
  const [flipped, setFlipped] = useState(false)

  const canDiff = providers.length >= 2
  const showDiff = diffMode !== 'off' && canDiff

  return (
    <div className="flex flex-col h-full border-t border-white/10">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10 bg-black/40 shrink-0">
        <span className="text-xs text-white/40 font-medium uppercase tracking-wider">Compare</span>

        <div className="ml-auto flex items-center gap-1.5">
          {canDiff && (
            <>
              {/* Diff mode toggle */}
              {(['off', 'word', 'sentence'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setDiffMode(mode)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    diffMode === mode
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {mode === 'off' ? 'Diff off' : `${mode.charAt(0).toUpperCase() + mode.slice(1)} diff`}
                </button>
              ))}

              {/* Flip button — only shown when diff is active */}
              {showDiff && (
                <button
                  onClick={() => setFlipped(f => !f)}
                  className="px-2 py-0.5 rounded text-xs text-white/40 hover:text-white/70 transition-colors"
                  title="Swap baseline"
                >
                  ⇄ Flip
                </button>
              )}
            </>
          )}

          <button
            onClick={onClear}
            className="px-2 py-0.5 rounded text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Body */}
      {showDiff ? (
        <div className="flex-1 overflow-hidden">
          <DiffOverlay
            mode={diffMode as DiffMode}
            leftOutput={extractOutput(logs[0] ?? [])}
            rightOutput={extractOutput(logs[1] ?? [])}
            flipped={flipped}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden overflow-x-auto">
          {providers.map((p, i) => (
            <ConsoleColumn
              key={p.model}
              provider={p.model}
              displayName={p.displayName}
              logs={logs[i] ?? []}
              isLocked={p.isLocked}
            />
          ))}
        </div>
      )}
    </div>
  )
}
