import { describe, it, expect } from 'vitest'
import { getModelConfig, getModelsByProvider, allModels } from '@/lib/providers/pricing'

describe('pricing table', () => {
  it('returns model config for a known model ID', () => {
    const config = getModelConfig('gpt-4o')
    expect(config).toBeDefined()
    expect(config?.provider).toBe('openai')
    expect(config?.inputPricePerMillion).toBeGreaterThanOrEqual(0)
    expect(config?.outputPricePerMillion).toBeGreaterThanOrEqual(0)
  })

  it('returns undefined for an unknown model ID', () => {
    expect(getModelConfig('not-a-real-model')).toBeUndefined()
  })

  it('returns all models for a given provider', () => {
    const openaiModels = getModelsByProvider('openai')
    expect(openaiModels.length).toBeGreaterThan(0)
    openaiModels.forEach(m => expect(m.provider).toBe('openai'))
  })

  it('all models have required fields', () => {
    allModels.forEach(model => {
      expect(model.id).toBeTruthy()
      expect(model.displayName).toBeTruthy()
      expect(model.provider).toBeTruthy()
      expect(model.contextWindow).toBeGreaterThan(0)
      expect(typeof model.inputPricePerMillion).toBe('number')
      expect(typeof model.outputPricePerMillion).toBe('number')
    })
  })
})
