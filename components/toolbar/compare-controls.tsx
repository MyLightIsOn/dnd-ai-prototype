'use client'

import React from 'react'
import { getAllModels } from '@/lib/providers/registry'
import type { CompareProvider } from '@/lib/execution/compare-runner'

interface CompareControlsProps {
  providers: CompareProvider[]
  onChange: (providers: CompareProvider[]) => void
}

const MAX_PROVIDERS = 4
const MIN_PROVIDERS = 2

export function CompareControls({ providers, onChange }: CompareControlsProps) {
  const allModels = getAllModels()

  const updateProvider = (index: number, update: Partial<CompareProvider>) => {
    const next = providers.map((p, i) => i === index ? { ...p, ...update } : p)
    onChange(next)
  }

  const addProvider = () => {
    if (providers.length >= MAX_PROVIDERS) return
    const firstUnused = allModels.find(m => !providers.some(p => p.model === `${m.provider}/${m.id}`))
    const model = firstUnused ? `${firstUnused.provider}/${firstUnused.id}` : allModels[0] ? `${allModels[0].provider}/${allModels[0].id}` : ''
    const displayName = firstUnused?.displayName ?? 'Model'
    onChange([...providers, { model, displayName, isLocked: false }])
  }

  const removeProvider = (index: number) => {
    if (providers.length <= MIN_PROVIDERS) return
    onChange(providers.filter((_, i) => i !== index))
  }

  const toggleLock = (index: number) => {
    // Lock toggles Ollama — find the first ollama model
    const ollamaModel = allModels.find(m => m.provider === 'ollama')
    const locked = !providers[index].isLocked
    const updates: Partial<CompareProvider> = { isLocked: locked }
    if (locked && ollamaModel) {
      updates.model = `ollama/${ollamaModel.id}`
      updates.displayName = ollamaModel.displayName
    }
    updateProvider(index, updates)
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {providers.map((p, i) => (
        <div
          key={i}
          className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs ${
            p.isLocked
              ? 'border-purple-500/50 bg-purple-500/10'
              : 'border-white/20 bg-white/5'
          }`}
        >
          {/* Lock toggle (only on first pill) */}
          {i === 0 && (
            <button
              onClick={() => toggleLock(0)}
              className={`text-[10px] font-bold transition-colors ${p.isLocked ? 'text-purple-400' : 'text-white/30 hover:text-white/60'}`}
              title={p.isLocked ? 'Unlock (Shadow Test off)' : 'Lock to local model (Shadow Test)'}
            >
              🔒
            </button>
          )}

          {/* Model selector */}
          <select
            value={p.model}
            onChange={e => {
              const m = allModels.find(m => `${m.provider}/${m.id}` === e.target.value)
              updateProvider(i, { model: e.target.value, displayName: m?.displayName ?? e.target.value })
            }}
            disabled={p.isLocked}
            className="bg-transparent text-white/80 border-none outline-none text-xs max-w-36 disabled:opacity-50"
          >
            {allModels.map(m => (
              <option key={`${m.provider}/${m.id}`} value={`${m.provider}/${m.id}`}>
                {m.displayName}
              </option>
            ))}
          </select>

          {/* Remove pill */}
          {providers.length > MIN_PROVIDERS && (
            <button
              onClick={() => removeProvider(i)}
              className="text-white/30 hover:text-white/70 ml-0.5"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {/* Add provider */}
      {providers.length < MAX_PROVIDERS && (
        <button
          onClick={addProvider}
          className="px-2 py-1 rounded-md border border-dashed border-white/20 text-white/40 hover:border-white/40 hover:text-white/70 text-xs transition-colors"
        >
          ＋ Add
        </button>
      )}
    </div>
  )
}
