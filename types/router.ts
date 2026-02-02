/**
 * Router Node Type
 *
 * Routes workflow execution to different paths based on input content analysis.
 * Supports multiple routing strategies for flexible conditional logic.
 */

export interface RouterData {
  name: string;
  strategy: RouterStrategy;
  routes: Route[];
  defaultRoute?: string; // Route ID to use if no matches found
  judgeModel?: string; // LLM model to use for llm-judge strategy (e.g., "openai/gpt-4o-mini")
  executedRoute?: string; // Which route was taken during execution
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
  executionError?: string;
}

export type RouterStrategy = 'keyword' | 'sentiment' | 'llm-judge';

export interface Route {
  id: string;
  label: string; // Display name for the route
  condition: RouteCondition;
}

/**
 * Route Conditions
 */
export type RouteCondition =
  | KeywordCondition
  | SentimentCondition
  | LLMJudgeCondition;

/**
 * Keyword Matching Condition
 * Checks if input contains specified keywords
 */
export interface KeywordCondition {
  type: 'keyword';
  keywords: string[]; // List of keywords to match
  matchMode: 'any' | 'all'; // Match any keyword (OR) or all keywords (AND)
  caseSensitive?: boolean; // Default: false
}

/**
 * Sentiment Analysis Condition
 * Classifies input sentiment and routes accordingly
 */
export interface SentimentCondition {
  type: 'sentiment';
  targetSentiment: 'positive' | 'negative' | 'neutral';
  threshold?: number; // Confidence threshold (0-1), default: 0.5
}

/**
 * LLM Judge Condition
 * Uses an LLM to classify input and route accordingly
 */
export interface LLMJudgeCondition {
  type: 'llm-judge';
  judgePrompt: string; // Instructions for the LLM judge
  model?: string; // Optional model override (defaults to workflow default)
}

/**
 * Type guards for route conditions
 */
export function isKeywordCondition(condition: RouteCondition): condition is KeywordCondition {
  return condition.type === 'keyword';
}

export function isSentimentCondition(condition: RouteCondition): condition is SentimentCondition {
  return condition.type === 'sentiment';
}

export function isLLMJudgeCondition(condition: RouteCondition): condition is LLMJudgeCondition {
  return condition.type === 'llm-judge';
}

/**
 * Helper to create a default router node data
 */
export function createDefaultRouterData(): RouterData {
  return {
    name: 'Router',
    strategy: 'keyword',
    routes: [
      {
        id: crypto.randomUUID(),
        label: 'Route A',
        condition: {
          type: 'keyword',
          keywords: ['example'],
          matchMode: 'any',
          caseSensitive: false
        }
      }
    ],
    executionState: 'idle'
  };
}
