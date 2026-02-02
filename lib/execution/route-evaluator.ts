/**
 * Route Evaluation Logic
 *
 * Evaluates router conditions and determines which route to take based on input content.
 */

import type { Route, RouterData, KeywordCondition, SentimentCondition } from "@/types/router";
import { isKeywordCondition, isSentimentCondition } from "@/types/router";

/**
 * Evaluates all routes and returns the ID of the matching route.
 * Returns null if no route matches (caller should use default route if configured).
 *
 * @param input - The input text to evaluate
 * @param routerData - Router configuration with strategy and routes
 * @returns Route ID that matched, or null if no match
 */
export async function evaluateRoutes(
  input: string,
  routerData: RouterData
): Promise<string | null> {
  if (!routerData.routes || routerData.routes.length === 0) {
    return null;
  }

  // Evaluate each route in order
  for (const route of routerData.routes) {
    const matches = await evaluateRoute(input, route);
    if (matches) {
      return route.id;
    }
  }

  return null;
}

/**
 * Evaluates a single route condition
 */
async function evaluateRoute(input: string, route: Route): Promise<boolean> {
  const { condition } = route;

  if (isKeywordCondition(condition)) {
    return evaluateKeywordCondition(input, condition);
  } else if (isSentimentCondition(condition)) {
    return await evaluateSentimentCondition(input, condition);
  }

  return false;
}

/**
 * Keyword Matching Evaluation
 *
 * Checks if input contains the specified keywords based on match mode.
 */
function evaluateKeywordCondition(
  input: string,
  condition: KeywordCondition
): boolean {
  if (!condition.keywords || condition.keywords.length === 0) {
    return false;
  }

  // Prepare input for matching
  const searchText = condition.caseSensitive ? input : input.toLowerCase();

  // Prepare keywords
  const keywords = condition.keywords.map(k =>
    condition.caseSensitive ? k : k.toLowerCase()
  );

  // Evaluate based on match mode
  if (condition.matchMode === 'any') {
    // Match if ANY keyword is found (OR logic)
    return keywords.some(keyword => searchText.includes(keyword));
  } else {
    // Match if ALL keywords are found (AND logic)
    return keywords.every(keyword => searchText.includes(keyword));
  }
}

/**
 * Sentiment Analysis Evaluation
 *
 * Uses a simple sentiment scoring algorithm to classify text sentiment.
 * For production use, consider integrating a proper sentiment analysis API.
 */
async function evaluateSentimentCondition(
  input: string,
  condition: SentimentCondition
): Promise<boolean> {
  const sentiment = analyzeSentiment(input);
  const threshold = condition.threshold || 0.5;

  // Check if detected sentiment matches target sentiment above threshold
  if (condition.targetSentiment === 'positive') {
    return sentiment.positive >= threshold;
  } else if (condition.targetSentiment === 'negative') {
    return sentiment.negative >= threshold;
  } else {
    return sentiment.neutral >= threshold;
  }
}

/**
 * Simple sentiment analysis using keyword-based scoring
 *
 * Returns scores for positive, negative, and neutral sentiment (0-1 range).
 * The highest score indicates the detected sentiment.
 *
 * NOTE: This is a basic implementation. For production use cases, consider:
 * - Using a proper NLP library (e.g., sentiment.js, compromise)
 * - Integrating with an API (e.g., OpenAI for LLM-based classification)
 * - Training a custom model for domain-specific sentiment
 */
function analyzeSentiment(text: string): {
  positive: number;
  negative: number;
  neutral: number;
} {
  const lowerText = text.toLowerCase();

  // Positive sentiment keywords
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love',
    'happy', 'joy', 'excited', 'perfect', 'best', 'awesome', 'brilliant',
    'outstanding', 'superb', 'delighted', 'pleased', 'satisfied', 'positive',
    'nice', 'beautiful', 'impressive', 'remarkable'
  ];

  // Negative sentiment keywords
  const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'poor', 'worst', 'hate',
    'sad', 'angry', 'upset', 'disappointed', 'frustrated', 'annoyed',
    'negative', 'difficult', 'problem', 'issue', 'error', 'fail', 'wrong',
    'broken', 'useless', 'waste', 'disappointing'
  ];

  // Count keyword occurrences
  let positiveScore = 0;
  let negativeScore = 0;

  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      positiveScore += matches.length;
    }
  });

  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      negativeScore += matches.length;
    }
  });

  // Calculate scores (normalize to 0-1 range)
  const totalScore = positiveScore + negativeScore;

  if (totalScore === 0) {
    // No sentiment indicators found - classify as neutral
    return { positive: 0, negative: 0, neutral: 1.0 };
  }

  const positive = positiveScore / totalScore;
  const negative = negativeScore / totalScore;
  const neutral = 1.0 - (positive + negative);

  // Determine which sentiment is strongest
  const maxScore = Math.max(positive, negative, neutral);

  return {
    positive: positive === maxScore ? 1.0 : positive / maxScore,
    negative: negative === maxScore ? 1.0 : negative / maxScore,
    neutral: neutral === maxScore ? 1.0 : neutral / maxScore
  };
}

/**
 * Helper function to get human-readable sentiment label
 */
export function getSentimentLabel(text: string): 'positive' | 'negative' | 'neutral' {
  const scores = analyzeSentiment(text);

  if (scores.positive > scores.negative && scores.positive > scores.neutral) {
    return 'positive';
  } else if (scores.negative > scores.positive && scores.negative > scores.neutral) {
    return 'negative';
  } else {
    return 'neutral';
  }
}
