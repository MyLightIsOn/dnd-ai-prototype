/**
 * Route Evaluation Logic
 *
 * Evaluates router conditions and determines which route to take based on input content.
 */

import type { Route, RouterData, KeywordCondition, SentimentCondition, LLMJudgeCondition } from "@/types/router";
import { isKeywordCondition, isSentimentCondition, isLLMJudgeCondition } from "@/types/router";
import { getProvider } from "@/lib/providers";
import { getApiKey } from "@/lib/storage/api-keys";
import type { Message } from "@/lib/providers/base";

/**
 * Result from LLM judge evaluation
 */
export interface LLMJudgeResult {
  cost: number;
  tokens: number;
  decision: string;
}

/**
 * Evaluates all routes and returns the ID of the matching route.
 * Returns null if no route matches (caller should use default route if configured).
 *
 * @param input - The input text to evaluate
 * @param routerData - Router configuration with strategy and routes
 * @param onLLMJudgeResult - Optional callback for LLM judge results (cost, tokens, decision)
 * @returns Route ID that matched, or null if no match
 */
export async function evaluateRoutes(
  input: string,
  routerData: RouterData,
  onLLMJudgeResult?: (result: LLMJudgeResult) => void
): Promise<string | null> {
  if (!routerData.routes || routerData.routes.length === 0) {
    return null;
  }

  // Evaluate each route in order
  for (const route of routerData.routes) {
    const matches = await evaluateRoute(input, route, routerData, onLLMJudgeResult);
    if (matches) {
      return route.id;
    }
  }

  return null;
}

/**
 * Evaluates a single route condition
 */
async function evaluateRoute(
  input: string,
  route: Route,
  routerData: RouterData,
  onLLMJudgeResult?: (result: LLMJudgeResult) => void
): Promise<boolean> {
  const { condition } = route;

  if (isKeywordCondition(condition)) {
    return evaluateKeywordCondition(input, condition);
  } else if (isSentimentCondition(condition)) {
    return await evaluateSentimentCondition(input, condition);
  } else if (isLLMJudgeCondition(condition)) {
    return await evaluateLLMJudgeCondition(input, route, routerData, onLLMJudgeResult);
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

/**
 * LLM Judge Evaluation
 *
 * Uses an LLM to classify input and determine if it should route to this path.
 * The LLM is asked to respond with the route label if it matches, or "none" if not.
 */
async function evaluateLLMJudgeCondition(
  input: string,
  route: Route,
  routerData: RouterData,
  onLLMJudgeResult?: (result: LLMJudgeResult) => void
): Promise<boolean> {
  const condition = route.condition as LLMJudgeCondition;

  // Get model (from condition override, router data, or default)
  const modelStr = condition.model || routerData.judgeModel;
  if (!modelStr) {
    throw new Error('LLM judge requires a model to be configured');
  }

  // Parse provider and model
  if (!modelStr.includes('/')) {
    throw new Error(`Invalid model format: "${modelStr}". Expected "provider/model-id"`);
  }

  const [providerName, modelId] = modelStr.split('/', 2);
  const provider = getProvider(providerName);

  if (!provider) {
    throw new Error(`Provider "${providerName}" not found`);
  }

  // Get API key
  const apiKey = getApiKey(providerName);
  if (!apiKey) {
    throw new Error(`No API key found for provider "${providerName}"`);
  }

  // Build prompt for the LLM judge
  const judgePrompt = condition.judgePrompt ||
    `Classify the following input and respond with "${route.label}" if it matches this route, or "none" if it doesn't.`;

  const messages: Message[] = [
    {
      role: 'system',
      content: `You are a routing classifier. Your job is to determine if the input should be routed to "${route.label}".

${judgePrompt}

Respond with ONLY the route label "${route.label}" if it matches, or "none" if it doesn't. Do not include any other text.`
    },
    {
      role: 'user',
      content: `Input to classify:\n\n${input}`
    }
  ];

  try {
    // Call LLM (non-streaming for simplicity)
    const response = await provider.complete({
      model: modelId,
      messages,
      temperature: 0.0, // Use deterministic output
      maxTokens: 50, // Short response expected
      apiKey
    });

    const cost = provider.calculateCost(modelId, response.usage);
    const decision = response.content.trim().toLowerCase();
    const routeLabel = route.label.toLowerCase();

    // Report result to callback
    if (onLLMJudgeResult) {
      onLLMJudgeResult({
        cost,
        tokens: response.usage.totalTokens,
        decision: response.content.trim()
      });
    }

    // Check if LLM response matches the route label
    const matches = decision === routeLabel || decision.includes(routeLabel);

    return matches;
  } catch (error) {
    // Re-throw with more context
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`LLM judge evaluation failed: ${errorMsg}`);
  }
}
