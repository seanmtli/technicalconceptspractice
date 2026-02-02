import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getDatabase, getUserPreferences, hasCompletedOnboarding } from '../services/database';
import { AppState, AppAction, UserPreferences } from '../types';
import { logger } from '../utils/logger';

// ============ Initial State ============

const initialState: AppState = {
  isOnline: true,
  isInitialized: false,
  currentSessionId: null,
  hasCompletedOnboarding: false,
  userPreferences: null,
};

// ============ Reducer ============

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: true };
    case 'SET_SESSION':
      return { ...state, currentSessionId: action.payload };
    case 'SET_ONBOARDING_COMPLETE':
      return {
        ...state,
        hasCompletedOnboarding: action.payload.completed,
        userPreferences: action.payload.preferences,
      };
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        userPreferences: action.payload,
      };
    default:
      return state;
  }
}

// ============ Context ============

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  refreshOnboardingState: () => Promise<void>;
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

  // Load onboarding state
  const loadOnboardingState = useCallback(async () => {
    try {
      const completed = await hasCompletedOnboarding();
      const preferences = await getUserPreferences();
      dispatch({
        type: 'SET_ONBOARDING_COMPLETE',
        payload: { completed, preferences },
      });
    } catch (error) {
      logger.error('Failed to load onboarding state', error);
    }
  }, []);

  // Initialize app
  useEffect(() => {
    async function initialize() {
      try {
        // Initialize database (creates tables and seeds data if needed)
        await getDatabase();

        // Load onboarding state
        await loadOnboardingState();

        // Mark as initialized
        dispatch({ type: 'SET_INITIALIZED' });
      } catch (error) {
        logger.error('Failed to initialize app', error);
        // Still mark as initialized so app doesn't hang
        dispatch({ type: 'SET_INITIALIZED' });
      }
    }

    initialize();
  }, [loadOnboardingState]);

  return (
    <AppContext.Provider value={{ state, dispatch, refreshOnboardingState: loadOnboardingState }}>
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

export function useCanPractice(): { canPractice: boolean; reason: string | null } {
  const { state } = useApp();

  if (!state.isOnline) {
    return { canPractice: false, reason: 'No internet connection' };
  }

  return { canPractice: true, reason: null };
}

export function useUserPreferences(): UserPreferences | null {
  const { state } = useApp();
  return state.userPreferences;
}

export function useHasCompletedOnboarding(): boolean {
  const { state } = useApp();
  return state.hasCompletedOnboarding;
}
