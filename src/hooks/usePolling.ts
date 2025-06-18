import { useState, useEffect, useRef, useCallback } from 'react';

interface PollingOptions {
  interval: number;
  maxAttempts?: number;
  initialDelay?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  onMaxAttemptsReached?: () => void;
  shouldContinuePolling?: () => boolean;
  debugMode?: boolean;
}

interface PollingState {
  isPolling: boolean;
  attempt: number;
  lastPollTime: number | null;
  data: any | null;
  error: any | null;
  status: 'idle' | 'polling' | 'success' | 'error' | 'timeout';
}

interface PollableResponse {
  status?: string;
  response?: {
    state?: string;
    data?: any;
  };
}

export function usePolling<T>(
  pollingFn: () => Promise<T>,
  options: PollingOptions
) {
  const isMountedRef = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingFnRef = useRef(pollingFn);
  const optionsRef = useRef(options);
  const pollHistoryRef = useRef<Array<{ time: number; attempt: number }>>([]);
  const sessionIdRef = useRef<string>(`poll-${Date.now()}`);
  const isActivePollingRef = useRef<boolean>(false);
  const hasSuccessfulResponseRef = useRef<boolean>(false);
  const isLocked = useRef<boolean>(false);
  const lastSuccessDataRef = useRef<T | null>(null);
  const debug = options.debugMode === true;

  const [state, setState] = useState<PollingState>({
    isPolling: false,
    attempt: 0,
    lastPollTime: null,
    data: null,
    error: null,
    status: 'idle'
  });

  useEffect(() => {
    pollingFnRef.current = pollingFn;
    optionsRef.current = options;
  }, [pollingFn, options]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      if (debug) console.log(`[usePolling] Timer cleared for session ${sessionIdRef.current}`);
    }
  }, [debug]);

  const stopPolling = useCallback(() => {
    if (debug) console.log(`[usePolling] Stopping polling for session ${sessionIdRef.current}`);
    clearTimer();
    
    if (isMountedRef.current) {
      setState(prev => ({ 
        ...prev, 
        isPolling: false, 
        status: hasSuccessfulResponseRef.current ? 'success' : 'idle' 
      }));
    }
    
    isActivePollingRef.current = false;
    isLocked.current = false;
  }, [clearTimer, debug]);

  const executePoll = useCallback(async (attempt: number) => {
    if (isLocked.current) {
      if (debug) console.log(`[usePolling] Attempt ${attempt} skipped due to lock`);
      return;
    }
    
    isLocked.current = true;
    
    if (!isMountedRef.current || !isActivePollingRef.current) {
      if (debug) console.log(`[usePolling] Aborting poll ${attempt}: unmounted or inactive`);
      isLocked.current = false;
      return;
    }
    
    const now = Date.now();
    pollHistoryRef.current.push({ time: now, attempt });
    
    if (debug) console.log(`[usePolling] Executing poll attempt ${attempt}, session ${sessionIdRef.current}`);
    
    try {
      if (optionsRef.current.shouldContinuePolling && !optionsRef.current.shouldContinuePolling()) {
        if (debug) console.log(`[usePolling] Stopping based on shouldContinuePolling check`);
        stopPolling();
        return;
      }
      
      const result = await pollingFnRef.current();
      
      lastSuccessDataRef.current = result;
      
      const typedResult = result as unknown as PollableResponse;
      
      const isCompletedResponse = 
        typedResult && 
        typeof typedResult === 'object' && 
        (
          (typedResult.status === 'succeeded' && typedResult.response?.state === 'completed') ||
          (typedResult.response?.state === 'completed') ||
          (typedResult.response?.data?.content && Object.keys(typedResult.response.data.content).length > 0)
        );
      
      if (isCompletedResponse) {
        if (debug) console.log('[usePolling] Detected completed response:', result);
        hasSuccessfulResponseRef.current = true;
      }
      
      if (isMountedRef.current && isActivePollingRef.current) {
        setState(prev => ({
          ...prev,
          attempt,
          lastPollTime: now,
          data: result,
          status: isCompletedResponse ? 'success' : 'polling'
        }));
        
        if (isCompletedResponse) {
          console.log('[usePolling] Completed response detected, cleaning up states');
          if (optionsRef.current.onSuccess) {
            optionsRef.current.onSuccess(result);
          }
          
          // Ensure we stop polling on success
          isActivePollingRef.current = false;
          isLocked.current = false;
          return;
        }
        
        if (optionsRef.current.maxAttempts && attempt >= optionsRef.current.maxAttempts) {
          if (debug) console.log(`[usePolling] Max attempts (${optionsRef.current.maxAttempts}) reached`);
          
          if (isMountedRef.current && isActivePollingRef.current) {
            setState(prev => ({ ...prev, isPolling: false, status: 'timeout' }));
            
            if (optionsRef.current.onMaxAttemptsReached) {
              optionsRef.current.onMaxAttemptsReached();
            }
            
            isActivePollingRef.current = false;
            isLocked.current = false;
          }
          return;
        }
        
        if (optionsRef.current.shouldContinuePolling && !optionsRef.current.shouldContinuePolling()) {
          if (debug) console.log(`[usePolling] Stopping based on shouldContinuePolling after successful poll`);
          stopPolling();
          return;
        }
        
        if (isActivePollingRef.current && isMountedRef.current) {
          if (debug) console.log(`[usePolling] Scheduling next poll attempt ${attempt + 1} in ${optionsRef.current.interval}ms`);
          
          clearTimer();
          timerRef.current = setTimeout(() => {
            if (isActivePollingRef.current && isMountedRef.current) {
              isLocked.current = false;
              executePoll(attempt + 1);
            } else {
              isLocked.current = false;
            }
          }, optionsRef.current.interval);
        } else {
          isLocked.current = false;
        }
      } else {
        isLocked.current = false;
      }
    } catch (error) {
      if (debug) console.error(`[usePolling] Error in poll attempt ${attempt}:`, error);
      
      if (isMountedRef.current && isActivePollingRef.current) {
        setState(prev => ({
          ...prev,
          attempt,
          lastPollTime: now,
          error,
          status: 'error'
        }));
        
        if (optionsRef.current.onError) {
          optionsRef.current.onError(error);
        }
        
        if (optionsRef.current.maxAttempts && attempt >= optionsRef.current.maxAttempts) {
          if (debug) console.log(`[usePolling] Max attempts (${optionsRef.current.maxAttempts}) reached after error`);
          
          if (isMountedRef.current) {
            setState(prev => ({ ...prev, isPolling: false, status: 'timeout' }));
            
            if (optionsRef.current.onMaxAttemptsReached) {
              optionsRef.current.onMaxAttemptsReached();
            }
            
            isActivePollingRef.current = false;
            isLocked.current = false;
          }
          return;
        }
        
        if (isActivePollingRef.current && isMountedRef.current) {
          if (debug) console.log(`[usePolling] Scheduling next poll after error, attempt ${attempt + 1} in ${optionsRef.current.interval}ms`);
          
          clearTimer();
          timerRef.current = setTimeout(() => {
            if (isActivePollingRef.current && isMountedRef.current) {
              isLocked.current = false;
              executePoll(attempt + 1);
            } else {
              isLocked.current = false;
            }
          }, optionsRef.current.interval);
        } else {
          isLocked.current = false;
        }
      } else {
        isLocked.current = false;
      }
    }
  }, [stopPolling, debug, clearTimer]);

  const startPolling = useCallback(() => {
    if (isActivePollingRef.current || isLocked.current) {
      if (debug) console.log('[usePolling] Attempted to start polling when already active or locked. Ignoring.');
      return;
    }
    
    clearTimer();
    
    sessionIdRef.current = `poll-${Date.now()}`;
    
    isActivePollingRef.current = true;
    
    hasSuccessfulResponseRef.current = false;
    
    if (debug) console.log(`[usePolling] Starting new polling session ${sessionIdRef.current}`);
    
    pollHistoryRef.current = [];
    
    isLocked.current = false;
    
    setState({
      isPolling: true,
      attempt: 0,
      lastPollTime: null,
      data: null,
      error: null,
      status: 'polling'
    });
    
    const { initialDelay = 0 } = optionsRef.current;
    
    if (initialDelay > 0) {
      timerRef.current = setTimeout(() => {
        if (isMountedRef.current && isActivePollingRef.current) {
          executePoll(1);
        }
      }, initialDelay);
    } else {
      executePoll(1);
    }
  }, [clearTimer, executePoll, debug]);

  const restartPolling = useCallback(() => {
    if (debug) console.log('[usePolling] Restarting polling');
    stopPolling();
    
    setTimeout(() => {
      if (isMountedRef.current) {
        startPolling();
      }
    }, 100);
  }, [startPolling, stopPolling, debug]);

  const getPollHistory = useCallback(() => {
    return [...pollHistoryRef.current];
  }, []);

  const getLastSuccessData = useCallback(() => {
    return lastSuccessDataRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (debug) console.log(`[usePolling] Component unmounted, cleaning up session ${sessionIdRef.current}`);
      isMountedRef.current = false;
      isActivePollingRef.current = false;
      clearTimer();
    };
  }, [clearTimer, debug]);

  const resetPolling = useCallback(() => {
    stopPolling();
    pollHistoryRef.current = [];
    sessionIdRef.current = `poll-${Date.now()}`;
    lastSuccessDataRef.current = null;
    hasSuccessfulResponseRef.current = false;
    
    if (debug) console.log('[usePolling] Polling state fully reset');
    
    setState({
      isPolling: false,
      attempt: 0,
      lastPollTime: null,
      data: null,
      error: null,
      status: 'idle'
    });
  }, [stopPolling, debug]);

  return {
    ...state,
    startPolling,
    stopPolling,
    restartPolling,
    resetPolling,
    getPollHistory,
    getLastSuccessData,
    sessionId: sessionIdRef.current,
    isActive: isActivePollingRef.current,
    hasSuccessfulResponse: hasSuccessfulResponseRef.current
  };
}
