
import { useEffect, useRef, useCallback } from 'react';

interface UseTimeoutOptions {
  onTimeout: () => void;
  timeoutDuration?: number;
  enabled?: boolean;
}

export const useTimeout = ({ 
  onTimeout, 
  timeoutDuration = 360000, // 6 minutes in milliseconds
  enabled = true 
}: UseTimeoutOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const clearTimeoutIfExists = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const getRemainingTime = useCallback(() => {
    const elapsedTime = Date.now() - startTimeRef.current;
    return Math.max(0, timeoutDuration - elapsedTime);
  }, [timeoutDuration]);

  // Set up the timeout
  useEffect(() => {
    if (!enabled) {
      clearTimeoutIfExists();
      return;
    }

    timeoutRef.current = setTimeout(() => {
      console.log('Operation timed out after 6 minutes');
      onTimeout();
    }, timeoutDuration);

    return () => {
      clearTimeoutIfExists();
    };
  }, [enabled, timeoutDuration, onTimeout, clearTimeoutIfExists]);

  return {
    clearTimeout: clearTimeoutIfExists,
    remainingTime: getRemainingTime,
    hasTimedOut: getRemainingTime() <= 0
  };
};
