import { describe, it, expect } from 'vitest'
import { registerProvider, getProvider, getAllModels } from '@/lib/providers/registry'
import type { ModelProvider, CompletionParams, CompletionResponse, StreamChunk, TokenUsage } from '@/lib/providers/base'
// Import index.ts to trigger auto-registration of built-in providers (OpenAI, Anthropic, Google, Ollama)
import '@/lib/providers/index'

function makeMockProvider(name: string, modelIds: string[]): ModelProvider {
  return {
    name,
    supportsStreaming: true,
    models: modelIds.map(id => ({ id, displayName: id, provider: name, contextWindow: 1000, inputPricePerMillion: 0, outputPricePerMillion: 0 })),
    async complete(_params: CompletionParams): Promise<CompletionResponse> {
      return { content: 'mock', model: _params.model, usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } }
    },
    stream(_params: CompletionParams): AsyncIterator<StreamChunk> {
      const chunks = [{ delta: 'mock', done: false }, { delta: '', done: true }]
      let i = 0
      return { next: async () => i < chunks.length ? { value: chunks[i++], done: false } : { value: undefined as unknown as StreamChunk, done: true } }
    },
    async validateApiKey(_key: string) { return true },
    calculateCost(_modelId: string, _tokens: TokenUsage) { return 0 },
  }
}

describe('provider registry', () => {
  it('registers and retrieves a provider by name', () => {
    const mock = makeMockProvider('test-provider', ['test-model'])
    registerProvider(mock)
    expect(getProvider('test-provider')).toBe(mock)
  })

  it('returns undefined for an unregistered provider', () => {
    expect(getProvider('does-not-exist')).toBeUndefined()
  })

  it('getAllModels returns at least the built-in models', () => {
    const models = getAllModels()
    expect(models.length).toBeGreaterThan(0)
    const modelIds = models.map(m => m.id)
    expect(modelIds).toContain('gpt-4o')
    expect(modelIds).toContain('claude-sonnet-4-6')
    expect(modelIds).toContain('gemini-2.0-flash-exp')
  })
})
