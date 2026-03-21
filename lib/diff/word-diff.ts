// lib/diff/word-diff.ts

export type DiffTokenType = 'equal' | 'left-only' | 'right-only'

export interface DiffToken {
  text: string
  type: DiffTokenType
}

export interface WordDiffResult {
  /** Tokens for the left panel: 'equal' shown plain, 'left-only' highlighted purple */
  left: DiffToken[]
  /** Tokens for the right panel: 'equal' shown plain, 'right-only' highlighted blue */
  right: DiffToken[]
  /** 0–100: percentage of content that differs */
  divergencePct: number
}

/** Check if a token is whitespace */
function isWhitespace(s: string): boolean {
  return /^\s+$/.test(s)
}

/** Tokenise a string into words + whitespace runs */
function tokenise(text: string): string[] {
  return text.split(/(\s+)/).filter(t => t.length > 0)
}

/** O(m*n) LCS on token arrays */
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

/** Build a frequency map from a token array (used for count-based LCS matching) */
function buildCountMap(tokens: string[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of tokens) {
    map.set(t, (map.get(t) ?? 0) + 1)
  }
  return map
}

export function wordDiff(a: string, b: string): WordDiffResult {
  const aTokens = tokenise(a)
  const bTokens = tokenise(b)

  if (aTokens.length === 0 && bTokens.length === 0) {
    return { left: [], right: [], divergencePct: 0 }
  }

  // LCS only on non-whitespace tokens
  const aWords = aTokens.filter(t => !isWhitespace(t))
  const bWords = bTokens.filter(t => !isWhitespace(t))
  const common = lcs(aWords, bWords)
  // common contains only non-whitespace tokens (lcs was run on aWords/bWords, not aTokens/bTokens)

  // Build left tokens — consume from left count map
  const leftCommon = buildCountMap(common)
  const left: DiffToken[] = []
  for (const tok of aTokens) {
    if (isWhitespace(tok)) {
      left.push({ text: tok, type: 'equal' })  // whitespace always equal
    } else {
      const remaining = leftCommon.get(tok) ?? 0
      if (remaining > 0) {
        left.push({ text: tok, type: 'equal' })
        leftCommon.set(tok, remaining - 1)
      } else {
        left.push({ text: tok, type: 'left-only' })
      }
    }
  }

  // Build right tokens — consume from right count map
  const rightCommon = buildCountMap(common)
  const right: DiffToken[] = []
  for (const tok of bTokens) {
    if (isWhitespace(tok)) {
      right.push({ text: tok, type: 'equal' })  // whitespace always equal
    } else {
      const remaining = rightCommon.get(tok) ?? 0
      if (remaining > 0) {
        right.push({ text: tok, type: 'equal' })
        rightCommon.set(tok, remaining - 1)
      } else {
        right.push({ text: tok, type: 'right-only' })
      }
    }
  }

  // Jaccard distance: |symdiff| / |union| over non-whitespace tokens
  const totalUnique = aWords.length + bWords.length - common.length
  const different = (aWords.length - common.length) + (bWords.length - common.length)
  const divergencePct = totalUnique === 0 ? 0 : Math.round((different / totalUnique) * 100)

  return { left, right, divergencePct }
}
