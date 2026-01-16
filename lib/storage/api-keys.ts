/**
 * API key storage utilities.
 * Simple localStorage wrapper for managing provider API keys.
 * Note: Encryption will be added in a future task (Task 6).
 */

/**
 * Retrieve an API key for a specific provider from localStorage.
 * @param provider - The provider name (e.g., "openai", "anthropic")
 * @returns The API key string, or empty string if not found
 */
export function getApiKey(provider: string): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(`apiKey_${provider}`) || '';
}

/**
 * Store an API key for a specific provider in localStorage.
 * @param provider - The provider name (e.g., "openai", "anthropic")
 * @param key - The API key to store
 */
export function setApiKey(provider: string, key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`apiKey_${provider}`, key);
}
