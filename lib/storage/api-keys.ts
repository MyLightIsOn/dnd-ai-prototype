/**
 * API key storage utilities.
 * Priority: environment variable > localStorage
 * Note: Encryption will be added in a future task (Task 6).
 */

// Next.js only inlines NEXT_PUBLIC_ vars when accessed as static literals.
// Dynamic bracket access (process.env[varName]) evaluates to undefined in the browser.
const providerEnvKeyMap: Record<string, string> = {
  openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
  anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
  google: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
  ollama: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || '',
};

/**
 * Get the env var value for a provider, if set.
 */
function getEnvApiKey(provider: string): string {
  return providerEnvKeyMap[provider] || '';
}

/**
 * Returns true if the key for this provider comes from an environment variable.
 */
export function isEnvKey(provider: string): boolean {
  return getEnvApiKey(provider) !== '';
}

/**
 * Retrieve an API key for a specific provider.
 * Checks environment variable first, then falls back to localStorage.
 * @param provider - The provider name (e.g., "openai", "anthropic")
 * @returns The API key string, or empty string if not found
 */
export function getApiKey(provider: string): string {
  const envKey = getEnvApiKey(provider);
  if (envKey) return envKey;
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
