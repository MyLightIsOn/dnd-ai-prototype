/**
 * Loop Node Type
 *
 * Repeats a section of the workflow multiple times.
 * Supports iteration limits and break conditions.
 */

export interface LoopData {
  name: string;
  maxIterations: number; // Maximum number of iterations (default: 10)
  currentIteration: number; // Current iteration count (starts at 0)
  breakCondition?: LoopBreakCondition; // Optional condition to exit early
  executedExit?: boolean; // Whether the loop has exited (for visual indication)
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
  executionError?: string;
}

/**
 * Loop Break Conditions
 */
export type LoopBreakCondition =
  | AlwaysBreakCondition
  | KeywordBreakCondition
  | LLMJudgeBreakCondition;

/**
 * Always Break Condition
 * Exits loop only after max iterations (no early break)
 */
export interface AlwaysBreakCondition {
  type: 'always';
}

/**
 * Keyword Break Condition
 * Exits loop when output contains any of the specified keywords
 */
export interface KeywordBreakCondition {
  type: 'keyword';
  keywords: string[]; // List of keywords to match
  caseSensitive?: boolean; // Default: false
}

/**
 * LLM Judge Break Condition
 * Uses an LLM to decide whether to break the loop
 */
export interface LLMJudgeBreakCondition {
  type: 'llm-judge';
  prompt: string; // Prompt asking LLM if loop should break
  model: string; // Model to use for judging (e.g., "gpt-4o-mini")
  provider: string; // Provider name (e.g., "openai")
}

/**
 * Type guards for break conditions
 */
export function isAlwaysBreakCondition(
  condition: LoopBreakCondition
): condition is AlwaysBreakCondition {
  return condition.type === 'always';
}

export function isKeywordBreakCondition(
  condition: LoopBreakCondition
): condition is KeywordBreakCondition {
  return condition.type === 'keyword';
}

export function isLLMJudgeBreakCondition(
  condition: LoopBreakCondition
): condition is LLMJudgeBreakCondition {
  return condition.type === 'llm-judge';
}

/**
 * Helper to create a default loop node data
 */
export function createDefaultLoopData(): LoopData {
  return {
    name: 'Loop',
    maxIterations: 10,
    currentIteration: 0,
    executionState: 'idle'
  };
}
