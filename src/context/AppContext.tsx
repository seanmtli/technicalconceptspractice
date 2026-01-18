import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getApiKey, getWhisperApiKey } from '../services/storage';
import { getDatabase } from '../services/database';
import { AppState, AppAction } from '../types';

// ============ Initial State ============

const initialState: AppState = {
  isOnline: true,
  hasClaudeApiKey: false,
  hasWhisperApiKey: false,
  isInitialized: false,
  currentSessionId: null,
};

// ============ Reducer ============

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };
    case 'SET_API_KEYS':
      return {
        ...state,
        hasClaudeApiKey: action.payload.claude,
        hasWhisperApiKey: action.payload.whisper,
      };
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: true };
    case 'SET_SESSION':
      return { ...state, currentSessionId: action.payload };
    default:
      return state;
  }
}

// ============ Context ============

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  refreshApiKeyStatus: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

// ============ Provider ============

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      dispatch({ type: 'SET_ONLINE', payload: netState.isConnected ?? false });
    });
    return () => unsubscribe();
  }, []);

  // Check API keys
  const refreshApiKeyStatus = useCallback(async () => {
    const [claudeKey, whisperKey] = await Promise.all([
      getApiKey(),
      getWhisperApiKey(),
    ]);
    dispatch({
      type: 'SET_API_KEYS',
      payload: {
        claude: !!claudeKey,
        whisper: !!whisperKey,
      },
    });
  }, []);

  // Initialize app
  useEffect(() => {
    async function initialize() {
      try {
        // Initialize database (creates tables and seeds data if needed)
        await getDatabase();

        // Check API keys
        await refreshApiKeyStatus();

        // Mark as initialized
        dispatch({ type: 'SET_INITIALIZED' });
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // Still mark as initialized so app doesn't hang
        dispatch({ type: 'SET_INITIALIZED' });
      }
    }

    initialize();
  }, [refreshApiKeyStatus]);

  return (
    <AppContext.Provider value={{ state, dispatch, refreshApiKeyStatus }}>
      {children}
    </AppContext.Provider>
  );
}

// ============ Hook ============

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// ============ Utility Hooks ============

export function useIsOnline(): boolean {
  const { state } = useApp();
  return state.isOnline;
}

export function useHasApiKey(): boolean {
  const { state } = useApp();
  return state.hasClaudeApiKey;
}

export function useCanPractice(): { canPractice: boolean; reason: string | null } {
  const { state } = useApp();

  if (!state.isOnline) {
    return { canPractice: false, reason: 'No internet connection' };
  }

  if (!state.hasClaudeApiKey) {
    return { canPractice: false, reason: 'API key not configured' };
  }

  return { canPractice: true, reason: null };
}
