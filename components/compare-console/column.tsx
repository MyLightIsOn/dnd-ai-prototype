'use client'

import React, { useRef, useState, useEffect } from 'react'
import { formatLog } from '@/components/console/format-log'

export interface ConsoleColumnProps {
  provider: string   // e.g. "anthropic/claude-3-5-sonnet-20241022"
  displayName: string
  logs: string[]
  isLocked?: boolean
}

export function ConsoleColumn({ displayName, logs, isLocked }: ConsoleColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const t = e.currentTarget
    const atBottom = Math.abs(t.scrollHeight - t.scrollTop - t.clientHeight) < 4
    setAutoScroll(atBottom)
  }

  return (
    <div className="flex flex-col flex-1 min-w-64 border-r border-white/10 last:border-r-0">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10 bg-black/30 text-xs text-white/60 font-medium shrink-0">
        {isLocked && (
          <span className="text-purple-400 text-[10px] font-bold uppercase tracking-wider">
            🔒 Local
          </span>
        )}
        <span className="truncate">{displayName}</span>
      </div>

      {/* Log output */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs"
      >
        {logs.length === 0 ? (
          <span className="text-white/30">Waiting for output…</span>
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed space-y-1">
            {logs.map((log, i) => (
              <div key={i}>{formatLog(log)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
