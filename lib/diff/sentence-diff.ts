import type { DiffToken, WordDiffResult } from './word-diff'

/** Split text into sentence tokens, trimming whitespace. Empty strings are filtered out. */
function tokeniseSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/** O(m*n) LCS on sentence arrays */
function lcs(a: string[], b: string[]): string[] {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const result: string[] = []
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { result.unshift(a[i - 1]); i--; j-- }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--
    else j--
  }
  return result
}

function buildCountMap(tokens: string[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of tokens) {
    map.set(t, (map.get(t) ?? 0) + 1)
  }
  return map
}

export function sentenceDiff(a: string, b: string): WordDiffResult {
  const aTokens = tokeniseSentences(a)
  const bTokens = tokeniseSentences(b)

  if (aTokens.length === 0 && bTokens.length === 0) {
    return { left: [], right: [], divergencePct: 0 }
  }

  const common = lcs(aTokens, bTokens)

  // Build left tokens
  const leftCommon = buildCountMap(common)
  const left: DiffToken[] = []
  for (const tok of aTokens) {
    const remaining = leftCommon.get(tok) ?? 0
    if (remaining > 0) {
      left.push({ text: tok, type: 'equal' })
      leftCommon.set(tok, remaining - 1)
    } else {
      left.push({ text: tok, type: 'left-only' })
    }
  }

  // Build right tokens
  const rightCommon = buildCountMap(common)
  const right: DiffToken[] = []
  for (const tok of bTokens) {
    const remaining = rightCommon.get(tok) ?? 0
    if (remaining > 0) {
      right.push({ text: tok, type: 'equal' })
      rightCommon.set(tok, remaining - 1)
    } else {
      right.push({ text: tok, type: 'right-only' })
    }
  }

  // Jaccard distance: |symdiff| / |union| over sentences
  const totalUnique = aTokens.length + bTokens.length - common.length
  const different = (aTokens.length - common.length) + (bTokens.length - common.length)
  const divergencePct = totalUnique === 0 ? 0 : Math.round((different / totalUnique) * 100)

  return { left, right, divergencePct }
}
