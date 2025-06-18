
/**
 * Unified Loading indicator component for the plan generation process
 * Fixed to prevent timer resets and unnecessary API calls
 */
import { useState, useEffect, useRef } from 'react';
import { Loader2, X, Sparkles, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { marketingJokes } from '@/utils/jokeLoader';
import { addDbLog } from '@/components/ApiLogs';

interface LoadingStateProps {
  message?: string;
  onCancel?: () => void;
  onRetryConnection?: () => void;
  companyDomain?: string;
  progress?: number;
  pollCount?: number;
  elapsedTimeOverride?: number; // For when we want to control the elapsed time display
  initialStartTime?: number;    // Added to persist start time across renders
  isPaused?: boolean;           // To completely pause timer updates
}

const LoadingState = ({ 
  message,
  onCancel,
  onRetryConnection,
  companyDomain,
  progress = 5,
  pollCount = 0,
  elapsedTimeOverride,
  initialStartTime,
  isPaused = false
}: LoadingStateProps) => {
  const [currentJokeIndex, setCurrentJokeIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(elapsedTimeOverride || 0);
  const [progressValue, setProgressValue] = useState(progress);
  
  // Track timer state with refs for better cleanup
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  const jokeTimerIdRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerIdRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(initialStartTime || Date.now());
  const isMountedRef = useRef(true);
  const previousCountRef = useRef(pollCount);
  const componentIdRef = useRef<string>(`loading-${Date.now()}`);
  
  // Log important events for debugging - but only once at mount
  useEffect(() => {
    console.log(`LoadingState rendered [${componentIdRef.current}]: domain=${companyDomain}, pollCount=${pollCount}, message=${message}`);
    
    // Only log component mount once
    addDbLog({
      type: 'check',
      operation: 'LoadingState Mounted',
      data: { 
        componentId: componentIdRef.current,
        companyDomain,
        message,
        pollCount,
        progress,
        initialStartTime,
        timestamp: Date.now()
      },
      timestamp: new Date().toISOString()
    });
    
    return () => {
      console.log(`LoadingState unmounted [${componentIdRef.current}]`);
      isMountedRef.current = false;
    };
  }, []);
  
  // Handle elapsed time tracking with fixed initialization
  useEffect(() => {
    // If using an override or paused, just set it and don't start a timer
    if (elapsedTimeOverride !== undefined || isPaused) {
      if (elapsedTimeOverride !== undefined) {
        setElapsedTime(elapsedTimeOverride);
      }
      return;
    }
    
    // Only initialize startTime if it wasn't provided or on first mount
    if (!initialStartTime) {
      startTimeRef.current = Date.now();
    }
    
    // Log timer start
    console.log(`Starting timer [${componentIdRef.current}] from ${startTimeRef.current}`);
    
    // Start the timer
    const timerId = setInterval(() => {
      if (isMountedRef.current && !isPaused) {
        // Calculate from the stable reference time
        const newElapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(newElapsedSeconds);
      }
    }, 1000);
    
    timerIdRef.current = timerId;
    
    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [elapsedTimeOverride, initialStartTime, isPaused]);
  
  // Check for poll count changes to adjust progress
  useEffect(() => {
    if (pollCount !== undefined && pollCount > previousCountRef.current) {
      console.log(`Poll count updated [${componentIdRef.current}]: ${pollCount} (previous: ${previousCountRef.current})`);
      previousCountRef.current = pollCount;
      
      // Only log significant poll count updates (not every one) to reduce log spam
      if (pollCount % 5 === 0 || pollCount <= 3) {
        addDbLog({
          type: 'check',
          operation: 'Poll Count Updated',
          data: { 
            componentId: componentIdRef.current,
            pollCount, 
            elapsedSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
            companyDomain
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  }, [pollCount, companyDomain]);
  
  // Handle progress updates
  useEffect(() => {
    if (progress !== undefined && progress > 0) {
      setProgressValue(progress);
    } else {
      // Only auto-increase progress if no external progress is provided
      const progressTimer = setInterval(() => {
        if (isMountedRef.current) {
          setProgressValue(prev => {
            if (prev < 90) {
              const increment = prev < 30 ? 0.8 : prev < 60 ? 0.4 : 0.2;
              return Math.min(90, prev + increment);
            }
            return prev;
          });
        }
      }, 5000);
      
      progressTimerIdRef.current = progressTimer;
      
      return () => {
        if (progressTimerIdRef.current) {
          clearInterval(progressTimerIdRef.current);
          progressTimerIdRef.current = null;
        }
      };
    }
  }, [progress]);
  
  // Rotate jokes every 10 seconds
  useEffect(() => {
    const jokeTimer = setInterval(() => {
      if (isMountedRef.current) {
        setCurrentJokeIndex(prevIndex => (prevIndex + 1) % marketingJokes.length);
      }
    }, 10000);
    
    jokeTimerIdRef.current = jokeTimer;
    
    return () => {
      if (jokeTimerIdRef.current) {
        clearInterval(jokeTimerIdRef.current);
        jokeTimerIdRef.current = null;
      }
    };
  }, []);
  
  // Clean up ALL timers on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Log unmounting
      addDbLog({
        type: 'check',
        operation: 'LoadingState Unmounted',
        data: { 
          componentId: componentIdRef.current,
          elapsedSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
          pollCount: previousCountRef.current
        },
        timestamp: new Date().toISOString()
      });
      
      // Clear all timers
      [timerIdRef.current, jokeTimerIdRef.current, progressTimerIdRef.current].forEach(timer => {
        if (timer) {
          clearInterval(timer);
        }
      });
    };
  }, []);

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get a dynamic status message based on elapsed time or use provided message
  const getStatusMessage = (): string => {
    if (message) return message;
    
    if (elapsedTime < 60) {
      return `Initializing analysis for ${companyDomain || 'your company'}...`;
    } else if (elapsedTime < 120) {
      return "Analyzing company data and market trends...";
    } else if (elapsedTime < 180) {
      return "Processing marketing strategies...";
    } else if (elapsedTime < 240) {
      return "Finalizing your customized marketing plan...";
    } else {
      return "This is taking longer than usual, but we're still working on it...";
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-2xl font-bold flex items-center justify-center text-green-500">
          <Sparkles className="h-5 w-5 mr-2 text-yellow-400" />
          Drafting your Marketing Plan
        </CardTitle>
        <CardDescription className="text-center text-base mt-1">
          This might take 2–5 minutes...<br />
          Watch this space—they say good marketing is worth the wait!
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 py-4">
        {/* Simple pulsing loader */}
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-green-500" />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-dashed border-blue-100 animate-pulse-slow"></div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full max-w-md">
          <Progress value={progressValue} className="h-2" />
        </div>
        
        {/* Status message */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-gray-700 font-medium max-w-md">
            {getStatusMessage()}
          </p>
          <span className="text-sm text-gray-500">
            Time elapsed: {formatTime(elapsedTime)} · 
            Polls: {pollCount} · 
            Domain: {companyDomain || 'N/A'}
          </span>
        </div>
        
        {/* Retry button */}
        {onRetryConnection && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetryConnection}
            className="mt-1 flex items-center"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Retry connection
          </Button>
        )}
        
        {/* Jokes section */}
        <div className="text-center text-sm text-gray-600 mt-1 max-w-md">
          <p>
            We help marketers create beautiful customer experiences at Brevo.<br />
            And while you wait, enjoy our marketing jokes:
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2 w-full max-w-md">
          <div className="min-h-24 flex items-center justify-center text-center italic text-gray-700">
            "{marketingJokes[currentJokeIndex]}"
          </div>
        </div>
        
        {/* Cancel button only shows if provided */}
        {onCancel && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onCancel}
            className="mt-3 text-gray-500"
          >
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default LoadingState;
