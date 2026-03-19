// tests/lib/execution/route-evaluator.test.ts
import { describe, it, expect } from 'vitest'
import { evaluateRoutes, getSentimentLabel } from '@/lib/execution/route-evaluator'
import type { RouterData } from '@/types/router'

function makeKeywordRouter(keywords: string[], matchMode: 'any' | 'all' = 'any'): RouterData {
  return {
    name: 'test-router',
    strategy: 'keyword',
    routes: [
      {
        id: 'route-1',
        label: 'Route 1',
        condition: { type: 'keyword', keywords, matchMode, caseSensitive: false },
      },
    ],
  }
}

function makeSentimentRouter(targetSentiment: 'positive' | 'negative' | 'neutral', threshold = 0.5): RouterData {
  return {
    name: 'test-router',
    strategy: 'sentiment',
    routes: [
      {
        id: 'route-1',
        label: 'Route 1',
        condition: { type: 'sentiment', targetSentiment, threshold },
      },
    ],
  }
}

describe('evaluateRoutes — keyword', () => {
  it('matches when any keyword is present (matchMode: any)', async () => {
    const router = makeKeywordRouter(['error', 'fail'], 'any')
    const result = await evaluateRoutes('There was an error in the pipeline', router)
    expect(result).toBe('route-1')
  })

  it('does not match when no keyword is present', async () => {
    const router = makeKeywordRouter(['error', 'fail'], 'any')
    const result = await evaluateRoutes('Everything is working fine', router)
    expect(result).toBeNull()
  })

  it('requires all keywords when matchMode is all', async () => {
    const router = makeKeywordRouter(['error', 'critical'], 'all')
    expect(await evaluateRoutes('critical error occurred', router)).toBe('route-1')
    expect(await evaluateRoutes('just an error', router)).toBeNull()
  })

  it('is case-insensitive by default', async () => {
    const router = makeKeywordRouter(['ERROR'])
    const result = await evaluateRoutes('there was an error', router)
    expect(result).toBe('route-1')
  })

  it('returns null when routes array is empty', async () => {
    const router: RouterData = { name: 'test-router', strategy: 'keyword', routes: [] }
    expect(await evaluateRoutes('anything', router)).toBeNull()
  })
})

describe('evaluateRoutes — sentiment', () => {
  it('matches positive sentiment for clearly positive text', async () => {
    const router = makeSentimentRouter('positive', 0.5)
    const result = await evaluateRoutes('This is excellent and amazing work!', router)
    expect(result).toBe('route-1')
  })

  it('matches negative sentiment for clearly negative text', async () => {
    const router = makeSentimentRouter('negative', 0.5)
    const result = await evaluateRoutes('This is terrible and broken and awful', router)
    expect(result).toBe('route-1')
  })

  it('matches neutral sentiment for text with no sentiment words', async () => {
    const router = makeSentimentRouter('neutral', 0.5)
    const result = await evaluateRoutes('The server is running on port 3000', router)
    expect(result).toBe('route-1')
  })
})

describe('getSentimentLabel', () => {
  it('returns positive for positive text', () => {
    expect(getSentimentLabel('great excellent amazing')).toBe('positive')
  })

  it('returns negative for negative text', () => {
    expect(getSentimentLabel('terrible broken awful')).toBe('negative')
  })

  it('returns neutral for neutral text', () => {
    expect(getSentimentLabel('the quick brown fox')).toBe('neutral')
  })
})
