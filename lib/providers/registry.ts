/**
 * Provider registry for managing and accessing registered LLM providers.
 * Uses a Map-based registry pattern for simple, pure lookup operations.
 */

import type { ModelProvider, ModelConfig } from "./base";

/**
 * Global registry of all registered providers.
 */
export const providers = new Map<string, ModelProvider>();

/**
 * Register a provider in the global registry.
 * @param provider The provider instance to register
 */
export function registerProvider(provider: ModelProvider): void {
  providers.set(provider.name, provider);
}

/**
 * Get a provider by name from the registry.
 * @param name The provider name to lookup
 * @returns The provider instance, or undefined if not found
 */
export function getProvider(name: string): ModelProvider | undefined {
  return providers.get(name);
}

/**
 * Get all models from all registered providers.
 * @returns A flat array of all model configurations
 */
export function getAllModels(): ModelConfig[] {
  return Array.from(providers.values()).flatMap((p) => p.models);
}
