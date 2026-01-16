/**
 * Anthropic (Claude) provider implementation.
 * Handles Claude model integrations with proper message format transformation.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  ModelProvider,
  CompletionParams,
  CompletionResponse,
  StreamChunk,
  TokenUsage,
  Message,
} from "./base";
import { anthropicModels, getModelConfig } from "./pricing";
import { registerProvider } from "./registry";

/**
 * Transform our message format to Anthropic's format.
 * Anthropic requires system messages to be passed separately.
 */
function transformMessages(messages: Message[]): {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  const systemMessages = messages.filter((m) => m.role === "system");
  const otherMessages = messages.filter((m) => m.role !== "system");

  const system = systemMessages.map((m) => m.content).join("\n");

  return {
    system: system || undefined,
    messages: otherMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  };
}

/**
 * Anthropic provider implementation for Claude models.
 */
class AnthropicProvider implements ModelProvider {
  name = "anthropic";
  models = anthropicModels;
  supportsStreaming = true;

  /**
   * Request a non-streaming completion from Claude.
   */
  async complete(params: CompletionParams): Promise<CompletionResponse> {
    const client = new Anthropic({
      apiKey: params.apiKey,
      dangerouslyAllowBrowser: true
    });
    const { system, messages } = transformMessages(params.messages);

    try {
      const response = await client.messages.create({
        model: params.model,
        max_tokens: params.maxTokens || 4096,
        temperature: params.temperature,
        system,
        messages,
      });

      // Extract text content from the response
      const content = response.content
        .filter((block) => block.type === "text")
        .map((block) => (block as { type: "text"; text: string }).text)
        .join("");

      const usage: TokenUsage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      };

      return {
        content,
        usage,
        model: response.model,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Request a streaming completion from Claude.
   */
  async *stream(params: CompletionParams): AsyncIterator<StreamChunk> {
    const client = new Anthropic({
      apiKey: params.apiKey,
      dangerouslyAllowBrowser: true
    });
    const { system, messages } = transformMessages(params.messages);

    try {
      const stream = await client.messages.create({
        model: params.model,
        max_tokens: params.maxTokens || 4096,
        temperature: params.temperature,
        system,
        messages,
        stream: true,
      });

      let inputTokens = 0;
      let outputTokens = 0;

      for await (const event of stream) {
        if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            yield {
              delta: event.delta.text,
              done: false,
            };
          }
        } else if (event.type === "message_start") {
          inputTokens = event.message.usage.input_tokens;
        } else if (event.type === "message_delta") {
          outputTokens = event.usage.output_tokens;
        } else if (event.type === "message_stop") {
          const usage: TokenUsage = {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
          };

          yield {
            delta: "",
            done: true,
            usage,
          };
        }
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate an Anthropic API key by making a minimal API call.
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true
      });

      // Make a minimal API call to validate the key
      await client.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }],
      });

      return true;
    } catch (error) {
      // Invalid API key or authentication error
      if (
        error instanceof Anthropic.AuthenticationError ||
        (error as any)?.status === 401
      ) {
        return false;
      }
      // For other errors, rethrow to surface the issue
      throw this.handleError(error);
    }
  }

  /**
   * Calculate the cost in USD for the given token usage.
   */
  calculateCost(modelId: string, tokens: TokenUsage): number {
    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    const inputCost =
      (tokens.inputTokens / 1_000_000) * modelConfig.inputPricePerMillion;
    const outputCost =
      (tokens.outputTokens / 1_000_000) * modelConfig.outputPricePerMillion;

    return inputCost + outputCost;
  }

  /**
   * Handle and transform Anthropic SDK errors into consistent error messages.
   */
  private handleError(error: unknown): Error {
    if (error instanceof Anthropic.AuthenticationError) {
      return new Error("Invalid Anthropic API key");
    }

    if (error instanceof Anthropic.RateLimitError) {
      return new Error("Anthropic rate limit exceeded. Please try again later.");
    }

    if (error instanceof Anthropic.InternalServerError) {
      return new Error("Anthropic service error. Please try again later.");
    }

    if (error instanceof Anthropic.APIError) {
      return new Error(`Anthropic API error: ${error.message}`);
    }

    if (error instanceof Error) {
      // Network errors or other generic errors
      if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
        return new Error("Network error: Unable to reach Anthropic API");
      }
      return error;
    }

    return new Error("Unknown error occurred while calling Anthropic API");
  }
}

// Auto-register the provider
const anthropicProvider = new AnthropicProvider();
registerProvider(anthropicProvider);

export default anthropicProvider;
