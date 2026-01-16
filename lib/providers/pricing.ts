/**
 * Pricing table for LLM models across all providers.
 * Prices are per million tokens in USD as of January 2025.
 */

import type { ModelConfig } from "./base";

/**
 * OpenAI model configurations and pricing.
 */
export const openaiModels: ModelConfig[] = [
  {
    id: "gpt-4o",
    displayName: "GPT-4o",
    provider: "openai",
    contextWindow: 128000,
    inputPricePerMillion: 2.50,
    outputPricePerMillion: 10.00,
  },
  {
    id: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    provider: "openai",
    contextWindow: 128000,
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.60,
  },
  {
    id: "gpt-4-turbo",
    displayName: "GPT-4 Turbo",
    provider: "openai",
    contextWindow: 128000,
    inputPricePerMillion: 10.00,
    outputPricePerMillion: 30.00,
  },
  {
    id: "gpt-3.5-turbo",
    displayName: "GPT-3.5 Turbo",
    provider: "openai",
    contextWindow: 16385,
    inputPricePerMillion: 0.50,
    outputPricePerMillion: 1.50,
  },
];

/**
 * Anthropic model configurations and pricing.
 */
export const anthropicModels: ModelConfig[] = [
  {
    id: "claude-3-opus-20240229",
    displayName: "Claude 3 Opus",
    provider: "anthropic",
    contextWindow: 200000,
    inputPricePerMillion: 15.00,
    outputPricePerMillion: 75.00,
  },
  {
    id: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet",
    provider: "anthropic",
    contextWindow: 200000,
    inputPricePerMillion: 3.00,
    outputPricePerMillion: 15.00,
  },
  {
    id: "claude-3-5-haiku-20241022",
    displayName: "Claude 3.5 Haiku",
    provider: "anthropic",
    contextWindow: 200000,
    inputPricePerMillion: 0.80,
    outputPricePerMillion: 4.00,
  },
];

/**
 * Google model configurations and pricing.
 */
export const googleModels: ModelConfig[] = [
  {
    id: "gemini-2.0-flash-exp",
    displayName: "Gemini 2.0 Flash (Exp)",
    provider: "google",
    contextWindow: 1000000,
    inputPricePerMillion: 0.00,
    outputPricePerMillion: 0.00,
  },
  {
    id: "gemini-1.5-pro-latest",
    displayName: "Gemini 1.5 Pro",
    provider: "google",
    contextWindow: 2000000,
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5.00,
  },
  {
    id: "gemini-1.5-flash-latest",
    displayName: "Gemini 1.5 Flash",
    provider: "google",
    contextWindow: 1000000,
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.30,
  },
];

/**
 * Ollama model configurations (local models, no API costs).
 */
export const ollamaModels: ModelConfig[] = [
  {
    id: "llama3.2",
    displayName: "Llama 3.2",
    provider: "ollama",
    contextWindow: 128000,
    inputPricePerMillion: 0.00,
    outputPricePerMillion: 0.00,
  },
  {
    id: "mistral",
    displayName: "Mistral",
    provider: "ollama",
    contextWindow: 32000,
    inputPricePerMillion: 0.00,
    outputPricePerMillion: 0.00,
  },
  {
    id: "qwen2.5",
    displayName: "Qwen 2.5",
    provider: "ollama",
    contextWindow: 32000,
    inputPricePerMillion: 0.00,
    outputPricePerMillion: 0.00,
  },
];

/**
 * All model configurations across all providers.
 */
export const allModels: ModelConfig[] = [
  ...openaiModels,
  ...anthropicModels,
  ...googleModels,
  ...ollamaModels,
];

/**
 * Get model configuration by ID.
 * @param modelId The model ID to lookup
 * @returns The model configuration, or undefined if not found
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return allModels.find((model) => model.id === modelId);
}

/**
 * Get all models for a specific provider.
 * @param provider The provider name
 * @returns Array of model configurations for that provider
 */
export function getModelsByProvider(provider: string): ModelConfig[] {
  return allModels.filter((model) => model.provider === provider);
}
