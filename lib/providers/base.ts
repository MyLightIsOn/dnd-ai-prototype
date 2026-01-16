/**
 * Base interfaces for LLM provider integration.
 * Defines the contract that all provider implementations must follow.
 */

/**
 * Represents a single message in a conversation.
 */
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Token usage statistics for a completion.
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Configuration for a specific model.
 */
export interface ModelConfig {
  id: string;
  displayName: string;
  provider: string;
  contextWindow: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}

/**
 * Parameters for requesting a completion from a model.
 */
export interface CompletionParams {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  apiKey: string;
}

/**
 * Response from a non-streaming completion request.
 */
export interface CompletionResponse {
  content: string;
  usage: TokenUsage;
  model: string;
}

/**
 * A single chunk from a streaming completion.
 */
export interface StreamChunk {
  delta: string;
  done: boolean;
  usage?: TokenUsage;
}

/**
 * Core interface that all LLM providers must implement.
 * Provides methods for completions, streaming, validation, and cost calculation.
 */
export interface ModelProvider {
  name: string;
  models: ModelConfig[];
  supportsStreaming: boolean;

  /**
   * Request a non-streaming completion from the provider.
   */
  complete(params: CompletionParams): Promise<CompletionResponse>;

  /**
   * Request a streaming completion from the provider.
   */
  stream(params: CompletionParams): AsyncIterator<StreamChunk>;

  /**
   * Validate that an API key is properly formatted and potentially valid.
   * Does not necessarily make a network request.
   */
  validateApiKey(apiKey: string): Promise<boolean>;

  /**
   * Calculate the cost in USD for the given token usage.
   */
  calculateCost(tokens: TokenUsage): number;
}
