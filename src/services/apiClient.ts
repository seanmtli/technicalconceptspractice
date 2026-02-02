/**
 * Shared API configuration for OpenRouter services.
 * Centralizes API key management, headers, and base URL configuration.
 */

import Constants from 'expo-constants';
import Anthropic from '@anthropic-ai/sdk';

// ============ Configuration ============

const OPENROUTER_API_KEY = Constants.expoConfig?.extra?.openRouterApiKey ?? '';

export const API_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const COMMON_HEADERS = {
  'HTTP-Referer': 'https://datapractice.app',
  'X-Title': 'Data Practice App',
};

// ============ Model Configuration ============

export const MODELS = {
  chat: 'minimax/minimax-m2-her',
  transcription: 'mistralai/voxtral-small-24b-2507',
} as const;

// ============ Shared Functions ============

/**
 * Get API key for OpenRouter services.
 */
export function getApiKey(): string {
  return OPENROUTER_API_KEY;
}

/**
 * Check if API key is configured.
 */
export function isApiKeyConfigured(): boolean {
  return OPENROUTER_API_KEY.length > 0;
}

/**
 * Get headers for fetch-based API calls.
 */
export function getRequestHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    ...COMMON_HEADERS,
  };
}

// ============ Anthropic SDK Client ============

// Lazily created client for SDK-based calls
let anthropicClient: Anthropic | null = null;

/**
 * Get Anthropic SDK client configured for OpenRouter.
 * Used by services that need the full SDK capabilities.
 */
export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      baseURL: 'https://openrouter.ai/api',
      apiKey: OPENROUTER_API_KEY,
      defaultHeaders: COMMON_HEADERS,
    });
  }
  return anthropicClient;
}
