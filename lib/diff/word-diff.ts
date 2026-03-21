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
function isWhitespace(token: string): boolean {
  return /^\s+$/.test(token)
}

/** Tokenise a string into words + whitespace runs */
function tokenise(text: string): string[] {
  return text.split(/(\s+)/).filter(t => t.length > 0)
}

/** O(m*n) LCS on token arrays (only comparing non-whitespace tokens) */
function lcs(a: string[], b: string[]): string[] {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const isEqual = !isWhitespace(a[i - 1]) && !isWhitespace(b[j - 1]) && a[i - 1] === b[j - 1]
      dp[i][j] = isEqual ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const result: string[] = []
  let i = m, j = n
  while (i > 0 && j > 0) {
    const isEqual = !isWhitespace(a[i - 1]) && !isWhitespace(b[j - 1]) && a[i - 1] === b[j - 1]
    if (isEqual) { result.unshift(a[i - 1]); i--; j-- }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--
    else j--
  }
  return result
}

export function wordDiff(a: string, b: string): WordDiffResult {
  const aTokens = tokenise(a)
  const bTokens = tokenise(b)

  if (aTokens.length === 0 && bTokens.length === 0) {
    return { left: [], right: [], divergencePct: 0 }
  }

  const common = lcs(aTokens, bTokens)
  const commonSet = new Set(common)

  // Build left tokens - mark whitespace as equal only if surrounding words match
  const left: DiffToken[] = []
  for (let i = 0; i < aTokens.length; i++) {
    const tok = aTokens[i]
    const isWs = isWhitespace(tok)
    let type: DiffTokenType = commonSet.has(tok) ? 'equal' : 'left-only'

    if (isWs && !commonSet.has(tok)) {
      // Check if both neighbors are equal or this is at a boundary with equal neighbors
      const prevEqual = i === 0 || (i > 0 && commonSet.has(aTokens[i - 1]))
      const nextEqual = i === aTokens.length - 1 || (i < aTokens.length - 1 && commonSet.has(aTokens[i + 1]))
      if (prevEqual && nextEqual && aTokens.length === bTokens.length) {
        type = 'equal'
      }
    }

    left.push({ text: tok, type })
  }

  // Build right tokens - mark whitespace as equal only if surrounding words match
  const right: DiffToken[] = []
  for (let i = 0; i < bTokens.length; i++) {
    const tok = bTokens[i]
    const isWs = isWhitespace(tok)
    let type: DiffTokenType = commonSet.has(tok) ? 'equal' : 'right-only'

    if (isWs && !commonSet.has(tok)) {
      // Check if both neighbors are equal or this is at a boundary with equal neighbors
      const prevEqual = i === 0 || (i > 0 && commonSet.has(bTokens[i - 1]))
      const nextEqual = i === bTokens.length - 1 || (i < bTokens.length - 1 && commonSet.has(bTokens[i + 1]))
      if (prevEqual && nextEqual && aTokens.length === bTokens.length) {
        type = 'equal'
      }
    }

    right.push({ text: tok, type })
  }

  // For divergence calculation, only count non-whitespace tokens
  const aNonWs = aTokens.filter(t => !isWhitespace(t))
  const bNonWs = bTokens.filter(t => !isWhitespace(t))
  const commonNonWs = common

  const totalUnique = aNonWs.length + bNonWs.length - commonNonWs.length
  const different = (aNonWs.length - commonNonWs.length) + (bNonWs.length - commonNonWs.length)
  const divergencePct = totalUnique === 0 ? 0 : Math.round((different / totalUnique) * 100)

  return { left, right, divergencePct }
}
