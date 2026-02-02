import * as SecureStore from 'expo-secure-store';

// Storage keys for future use (e.g., auth tokens)
const KEYS = {
  AUTH_TOKEN: 'auth_token',
} as const;

// ============ Auth Token ============

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS.AUTH_TOKEN);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.AUTH_TOKEN, token);
}

export async function deleteAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.AUTH_TOKEN);
}

// ============ Clear All ============

export async function clearAllSecureData(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.AUTH_TOKEN);
}
