/**
 * Loop Break Condition Evaluation
 *
 * Evaluates whether a loop should break based on configured break conditions.
 * Supports keyword matching and LLM-based judging.
 */

import type { LoopBreakCondition, KeywordBreakCondition, LLMJudgeBreakCondition } from "@/types/loop";
import { isAlwaysBreakCondition, isKeywordBreakCondition, isLLMJudgeBreakCondition } from "@/types/loop";
import { getProvider } from "@/lib/providers/registry";
import { getApiKey } from "@/lib/storage/api-keys";

/**
 * Evaluates whether a loop should break based on the current break condition.
 *
 * @param breakCondition - The break condition configuration
 * @param input - The current loop output to evaluate
 * @param iteration - The current iteration number (1-indexed)
 * @returns Promise<boolean> - true if loop should break, false to continue
 */
export async function shouldBreakLoop(
  breakCondition: LoopBreakCondition | undefined,
  input: string,
  iteration: number
): Promise<boolean> {
  // No break condition or 'always' type means never break early
  if (!breakCondition || isAlwaysBreakCondition(breakCondition)) {
    return false;
  }

  // Keyword-based break condition
  if (isKeywordBreakCondition(breakCondition)) {
    return evaluateKeywordBreak(input, breakCondition);
  }

  // LLM judge break condition
  if (isLLMJudgeBreakCondition(breakCondition)) {
    return await evaluateLLMBreak(input, breakCondition, iteration);
  }

  // Unknown condition type
  return false;
}

/**
 * Evaluates keyword break condition.
 * Checks if input contains any of the specified keywords (case-insensitive by default).
 *
 * @param input - The text to search for keywords
 * @param condition - The keyword break condition configuration
 * @returns boolean - true if any keyword is found
 */
export function evaluateKeywordBreak(
  input: string,
  condition: KeywordBreakCondition
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

  // Check if any keyword is found (substring match)
  return keywords.some(keyword => searchText.includes(keyword));
}

/**
 * Evaluates LLM judge break condition.
 * Calls an LLM to decide whether the loop should break based on current output.
 *
 * @param input - The current loop output
 * @param condition - The LLM judge configuration
 * @param iteration - The current iteration number
 * @returns Promise<boolean> - true if LLM says "BREAK", false if "CONTINUE"
 */
export async function evaluateLLMBreak(
  input: string,
  condition: LLMJudgeBreakCondition,
  iteration: number
): Promise<boolean> {
  try {
    // Get provider
    const provider = getProvider(condition.provider);
    if (!provider) {
      console.error(`[Loop Evaluator] Provider "${condition.provider}" not found`);
      return false; // Continue loop on error
    }

    // Get API key
    const apiKey = getApiKey(condition.provider);
    if (!apiKey) {
      console.error(`[Loop Evaluator] No API key found for provider "${condition.provider}"`);
      return false; // Continue loop on error
    }

    // Construct prompt for LLM
    const llmPrompt = `${condition.prompt}

Current iteration: ${iteration}
Current output:
${input}

Should we break the loop? Respond with only "BREAK" or "CONTINUE".`;

    // Call LLM (non-streaming)
    const response = await provider.complete({
      model: condition.model,
      messages: [
        {
          role: "user",
          content: llmPrompt
        }
      ],
      temperature: 0.3, // Low temperature for consistent decisions
      maxTokens: 10, // Only need one word
      apiKey
    });

    // Parse response - check if it contains "BREAK"
    const shouldBreak = response.content.toUpperCase().includes("BREAK");

    return shouldBreak;
  } catch (error) {
    // Handle API errors gracefully - continue loop on error
    console.error(`[Loop Evaluator] Error calling LLM judge:`, error);
    return false;
  }
}
