/**
 * OpenAI provider implementation.
 * Supports GPT-4o, GPT-4o-mini, GPT-4-turbo, and GPT-3.5-turbo models.
 */

import OpenAI from "openai";
import type {
  ModelProvider,
  CompletionParams,
  CompletionResponse,
  StreamChunk,
  TokenUsage,
} from "./base";
import { openaiModels } from "./pricing";
import { registerProvider } from "./registry";

/**
 * OpenAI provider implementation using the official OpenAI SDK.
 * Handles completions, streaming, API key validation, and cost calculation.
 */
class OpenAIProvider implements ModelProvider {
  name = "openai" as const;
  models = openaiModels;
  supportsStreaming = true;

  /**
   * Create an OpenAI client instance with the provided API key.
   * Note: dangerouslyAllowBrowser is enabled for prototype/demo purposes.
   * In production, API keys should be handled server-side.
   */
  private createClient(apiKey: string): OpenAI {
    return new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  /**
   * Request a non-streaming completion from OpenAI.
   */
  async complete(params: CompletionParams): Promise<CompletionResponse> {
    const client = this.createClient(params.apiKey);

    try {
      const response = await client.chat.completions.create({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        stream: false,
      });

      const content = response.choices[0]?.message?.content || "";
      const usage: TokenUsage = {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };

      return {
        content,
        usage,
        model: response.model,
      };
    } catch (error: any) {
      this.handleError(error);
    }
  }

  /**
   * Request a streaming completion from OpenAI.
   * Yields tokens as they arrive from the API.
   */
  async *stream(params: CompletionParams): AsyncIterator<StreamChunk> {
    const client = this.createClient(params.apiKey);

    try {
      const stream = await client.chat.completions.create({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      });

      let totalUsage: TokenUsage | undefined;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";

        // OpenAI sends usage in the final chunk when stream_options.include_usage is true
        if (chunk.usage) {
          totalUsage = {
            inputTokens: chunk.usage.prompt_tokens || 0,
            outputTokens: chunk.usage.completion_tokens || 0,
            totalTokens: chunk.usage.total_tokens || 0,
          };
        }

        // Yield content deltas
        if (delta) {
          yield { delta, done: false };
        }
      }

      // Yield final chunk with usage information
      yield {
        delta: "",
        done: true,
        usage: totalUsage,
      };
    } catch (error: any) {
      this.handleError(error);
    }
  }

  /**
   * Validate an OpenAI API key by making a minimal API call.
   * Returns true if the key is valid, false otherwise.
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    const client = this.createClient(apiKey);

    try {
      // Make a minimal call to list models
      await client.models.list();
      return true;
    } catch (error: any) {
      // 401 indicates invalid API key
      if (error.status === 401) {
        return false;
      }
      // Other errors might be network issues, so we'll return false
      // but ideally we'd distinguish between invalid key and other errors
      return false;
    }
  }

  /**
   * Calculate the cost in USD for the given token usage.
   * Uses pricing from the pricing table.
   */
  calculateCost(modelId: string, tokens: TokenUsage): number {
    const modelConfig = this.models.find((m) => m.id === modelId);

    if (!modelConfig) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    const inputCost =
      (tokens.inputTokens * modelConfig.inputPricePerMillion) / 1_000_000;
    const outputCost =
      (tokens.outputTokens * modelConfig.outputPricePerMillion) / 1_000_000;

    return inputCost + outputCost;
  }

  /**
   * Handle errors from the OpenAI API and throw descriptive errors.
   */
  private handleError(error: any): never {
    if (error.status === 401) {
      throw new Error(
        "Invalid OpenAI API key. Please check your API key and try again."
      );
    }

    if (error.status === 429) {
      const retryAfter = error.headers?.["retry-after"];
      const message = retryAfter
        ? `Rate limit exceeded. Retry after ${retryAfter} seconds.`
        : "Rate limit exceeded. Please try again later.";
      throw new Error(message);
    }

    if (error.status === 500 || error.status >= 500) {
      throw new Error(
        `OpenAI service error (${error.status}): ${error.message || "Unknown error"}`
      );
    }

    // Network or timeout errors
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      throw new Error(
        `Network error: Unable to connect to OpenAI API. Please check your internet connection.`
      );
    }

    // Re-throw the original error if we don't have specific handling
    throw error;
  }
}

// Create singleton instance and register it
const openaiProvider = new OpenAIProvider();
registerProvider(openaiProvider);

export { openaiProvider };
