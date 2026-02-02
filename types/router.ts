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
  executedRoute?: string; // Which route was taken during execution
  executionState?: 'idle' | 'executing' | 'completed' | 'error';
  executionError?: string;
}

export type RouterStrategy = 'keyword' | 'sentiment';

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
  | SentimentCondition;

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
 * Type guards for route conditions
 */
export function isKeywordCondition(condition: RouteCondition): condition is KeywordCondition {
  return condition.type === 'keyword';
}

export function isSentimentCondition(condition: RouteCondition): condition is SentimentCondition {
  return condition.type === 'sentiment';
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
