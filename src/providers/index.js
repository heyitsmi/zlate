/**
 * AI Provider Factory
 * Registry and factory for all AI translation providers
 */
import { GeminiProvider } from './gemini.js';
import { OpenAIProvider } from './openai.js';
import { DeepSeekProvider } from './deepseek.js';
import { ClaudeProvider } from './claude.js';
import { GroqProvider } from './groq.js';

// Provider registry - add new providers here
const providers = {
  gemini: GeminiProvider,
  openai: OpenAIProvider,
  deepseek: DeepSeekProvider,
  claude: ClaudeProvider,
  groq: GroqProvider
};

/**
 * Get provider instance by ID
 */
export function getProvider(providerId, apiKey) {
  const ProviderClass = providers[providerId];
  if (!ProviderClass) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return new ProviderClass(apiKey);
}

/**
 * Get all available providers info
 */
export function getAvailableProviders() {
  return Object.entries(providers).map(([id, ProviderClass]) => ({
    id,
    name: ProviderClass.displayName
  }));
}

/**
 * Check if provider exists
 */
export function hasProvider(providerId) {
  return providerId in providers;
}

export { providers };
