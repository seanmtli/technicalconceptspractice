import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseSessionTimerReturn {
  /** Seconds remaining */
  timeRemaining: number;
  /** Whether the timer is actively counting down */
  isRunning: boolean;
  /** Whether the timer has reached 0 */
  isExpired: boolean;
  /** Whether the timer is paused */
  isPaused: boolean;
  /** Formatted time string (MM:SS) */
  formattedTime: string;
  /** Start the timer */
  start: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Resume the timer */
  resume: () => void;
  /** Add more time */
  extend: (minutes: number) => void;
  /** Reset the timer to initial duration */
  reset: () => void;
}

export function useSessionTimer(durationMinutes: number = 10): UseSessionTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundTimeRef = useRef<number | null>(null);
  const initialDuration = useRef(durationMinutes * 60);

  // Format time as MM:SS
  const formattedTime = `${Math.floor(timeRemaining / 60)
    .toString()
    .padStart(2, '0')}:${(timeRemaining % 60).toString().padStart(2, '0')}`;

  const isExpired = timeRemaining <= 0;

  // Clear interval helper
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' && isRunning && !isPaused) {
        // App going to background - record time and stop interval
        backgroundTimeRef.current = Date.now();
        clearTimer();
      } else if (nextAppState === 'active' && backgroundTimeRef.current && isRunning) {
        // App returning to foreground - subtract elapsed time
        const elapsedSeconds = Math.floor(
          (Date.now() - backgroundTimeRef.current) / 1000
        );
        backgroundTimeRef.current = null;

        setTimeRemaining((prev) => {
          const newTime = Math.max(0, prev - elapsedSeconds);

          // Restart timer if not expired
          if (newTime > 0 && !isPaused) {
            intervalRef.current = setInterval(() => {
              setTimeRemaining((t) => {
                if (t <= 1) {
                  clearTimer();
                  setIsRunning(false);
                  return 0;
                }
                return t - 1;
              });
            }, 1000);
          } else if (newTime <= 0) {
            setIsRunning(false);
          }

          return newTime;
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isRunning, isPaused, clearTimer]);

  // Main timer effect
  useEffect(() => {
    if (isRunning && !isPaused && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearTimer();
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return clearTimer;
  }, [isRunning, isPaused, clearTimer]);

  // Stop timer when time runs out
  useEffect(() => {
    if (timeRemaining <= 0 && isRunning) {
      setIsRunning(false);
      clearTimer();
    }
  }, [timeRemaining, isRunning, clearTimer]);

  const start = useCallback(() => {
    if (timeRemaining > 0) {
      setIsRunning(true);
      setIsPaused(false);
    }
  }, [timeRemaining]);

  const pause = useCallback(() => {
    setIsPaused(true);
    clearTimer();
  }, [clearTimer]);

  const resume = useCallback(() => {
    if (timeRemaining > 0) {
      setIsPaused(false);
      // Timer will restart via useEffect
    }
  }, [timeRemaining]);

  const extend = useCallback(
    (minutes: number) => {
      setTimeRemaining((prev) => prev + minutes * 60);
      if (!isRunning) {
        setIsRunning(true);
      }
      setIsPaused(false);
    },
    [isRunning]
  );

  const reset = useCallback(() => {
    clearTimer();
    setTimeRemaining(initialDuration.current);
    setIsRunning(false);
    setIsPaused(false);
  }, [clearTimer]);

  return {
    timeRemaining,
    isRunning,
    isExpired,
    isPaused,
    formattedTime,
    start,
    pause,
    resume,
    extend,
    reset,
  };
}
