/**
 * Provider index for auto-registration.
 * Importing this file ensures all providers are registered in the global registry.
 */

// Import all providers to trigger auto-registration
import './openai';
import './anthropic';
import './google';
import './ollama';

// Re-export registry functions for convenience
export { registerProvider, getProvider, getAllModels } from './registry';
