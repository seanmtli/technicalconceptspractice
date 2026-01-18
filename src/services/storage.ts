import * as SecureStore from 'expo-secure-store';

const KEYS = {
  CLAUDE_API_KEY: 'claude_api_key',
  WHISPER_API_KEY: 'whisper_api_key',
} as const;

// ============ Claude API Key ============

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS.CLAUDE_API_KEY);
  } catch {
    return null;
  }
}

export async function setApiKey(key: string): Promise<void> {
  const trimmedKey = key.trim();

  if (!trimmedKey) {
    throw new Error('API key cannot be empty');
  }

  // Basic validation: Claude keys start with 'sk-ant-'
  if (!trimmedKey.startsWith('sk-ant-')) {
    throw new Error(
      'Invalid Claude API key format. Key should start with "sk-ant-"'
    );
  }

  await SecureStore.setItemAsync(KEYS.CLAUDE_API_KEY, trimmedKey);
}

export async function deleteApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.CLAUDE_API_KEY);
}

export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return key !== null && key.length > 0;
}

// ============ Whisper API Key ============

export async function getWhisperApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS.WHISPER_API_KEY);
  } catch {
    return null;
  }
}

export async function setWhisperApiKey(key: string): Promise<void> {
  const trimmedKey = key.trim();

  if (!trimmedKey) {
    throw new Error('API key cannot be empty');
  }

  // Basic validation: OpenAI keys start with 'sk-'
  if (!trimmedKey.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format. Key should start with "sk-"');
  }

  await SecureStore.setItemAsync(KEYS.WHISPER_API_KEY, trimmedKey);
}

export async function deleteWhisperApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.WHISPER_API_KEY);
}

export async function hasWhisperApiKey(): Promise<boolean> {
  const key = await getWhisperApiKey();
  return key !== null && key.length > 0;
}

// ============ Clear All ============

export async function clearAllSecureData(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.CLAUDE_API_KEY),
    SecureStore.deleteItemAsync(KEYS.WHISPER_API_KEY),
  ]);
}

// ============ Utilities ============

/**
 * Mask an API key for display (show first 7 and last 4 characters)
 */
export function maskApiKey(key: string): string {
  if (key.length <= 15) {
    return '***';
  }
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}
