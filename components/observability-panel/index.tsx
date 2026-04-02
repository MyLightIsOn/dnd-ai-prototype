"use client"

import { X } from 'lucide-react'
import type { RunStats } from '@/types'
import { ProviderStats } from './provider-stats'

interface ObservabilityPanelProps {
  stats: RunStats[]
  isOpen: boolean
  onClose: () => void
}

export function ObservabilityPanel({ stats, isOpen, onClose }: ObservabilityPanelProps) {
  if (!isOpen || stats.length === 0) return null

  const showHeaders = stats.length > 1

  return (
    <div className="border-t border-zinc-700 bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Run Stats</span>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Close stats panel"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex overflow-x-auto divide-x divide-zinc-800">
        {stats.map((s) => (
          <ProviderStats key={s.provider || 'single'} stats={s} showHeader={showHeaders} />
        ))}
      </div>
    </div>
  )
}
