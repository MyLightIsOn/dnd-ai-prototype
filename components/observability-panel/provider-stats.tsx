"use client"

import type { RunStats } from '@/types'

interface ProviderStatsProps {
  stats: RunStats
  /** When true, render the provider label header (compare mode). Hidden in single mode. */
  showHeader: boolean
}

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`
}

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function formatCost(usd: number): string {
  if (usd === 0) return '$0.00'
  if (usd < 0.001) return `$${usd.toFixed(6)}`
  return `$${usd.toFixed(4)}`
}

export function ProviderStats({ stats, showHeader }: ProviderStatsProps) {
  return (
    <div className="flex flex-col gap-3 min-w-0 flex-1 p-4">
      {showHeader && (
        <div className="text-xs font-semibold text-zinc-400 truncate">{stats.provider || 'Single run'}</div>
      )}

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-zinc-500">Latency</span>
          <span className="font-mono text-zinc-200">{formatMs(stats.totalLatencyMs)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-zinc-500">Tokens</span>
          <span className="font-mono text-zinc-200">{formatTokens(stats.totalTokens)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-zinc-500">Cost</span>
          <span className="font-mono text-zinc-200">{formatCost(stats.totalCostUsd)}</span>
        </div>
      </div>

      {/* Token breakdown */}
      <div className="text-xs text-zinc-500">
        <span className="text-zinc-400">Prompt:</span>{' '}
        <span className="font-mono">{formatTokens(stats.promptTokens)}</span>
        {'  '}
        <span className="text-zinc-400">Completion:</span>{' '}
        <span className="font-mono">{formatTokens(stats.completionTokens)}</span>
      </div>

      {/* Per-node breakdown */}
      {stats.nodes.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-xs text-zinc-500 mb-0.5">Nodes</div>
          {stats.nodes.map((node) => (
            <div key={node.nodeId} className="flex items-center gap-2 text-xs">
              <span
                className={
                  node.status === 'completed'
                    ? 'text-green-400'
                    : node.status === 'error'
                      ? 'text-red-400'
                      : 'text-zinc-500'
                }
              >
                {node.status === 'completed' ? '✓' : node.status === 'error' ? '✗' : '–'}
              </span>
              <span className="truncate text-zinc-300 flex-1">{node.nodeName}</span>
              <span className="font-mono text-zinc-500 shrink-0">{formatMs(node.latencyMs)}</span>
              {node.costUsd > 0 && (
                <span className="font-mono text-zinc-500 shrink-0">{formatCost(node.costUsd)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
