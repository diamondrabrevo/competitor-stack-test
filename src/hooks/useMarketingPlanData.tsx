import { useState, useEffect, useCallback, useRef } from 'react';
import { usePolling } from './usePolling';
import { getAnalysisAnswer, isAnalysisComplete, delay } from '@/services/api';
import { parsePlanData, validatePlanData } from '@/utils/parsePlanData';
import { toast } from 'sonner';
import { getMarketingPlanByDomain, updateMarketingPlan, saveMarketingPlan, isEmptyObject } from '@/services/marketingPlanService';
import { shouldStopPolling, getInitialPollingDelay, isDomainLikelyValid, getProgressivePollingInterval } from '@/utils/pollingUtils';
import { useTimeout } from './useTimeout';
import { addDbLog } from '@/components/ApiLogs';
import { useNavigate } from 'react-router-dom';

interface UseMarketingPlanDataProps {
  companyDomain?: string;
  conversationId?: string;
  maxAttempts?: number;  // Maximum polling attempts
  pollingInterval?: number; // Interval between polls in ms
  email?: string; // Added email parameter
}

/**
 * Custom hook for managing marketing plan data with improved polling
 */
export const useMarketingPlanData = ({ 
  companyDomain: initialDomain, 
  conversationId: initialConversationId,
  maxAttempts = 30, // Increased from 15 to 30 attempts
  pollingInterval = 10000, // Increased base interval to 10 seconds
  email = '' // Default to empty string if not provided
}: UseMarketingPlanDataProps) => {
  // State variables
  const [planData, setPlanData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [companyDomain, setCompanyDomain] = useState<string>(initialDomain || '');
  const [originalDomain, setOriginalDomain] = useState<string>(initialDomain || '');
  const [loadingMessage, setLoadingMessage] = useState<string>('Initializing...');
  const [responseStatus, setResponseStatus] = useState<any>(null);
  const [rawApiData, setRawApiData] = useState<any>(null);
  const [hasValidPlan, setHasValidPlan] = useState<boolean>(false);
  const [pollCounter, setPollCounter] = useState<number>(0);
  const [noResultsFound, setNoResultsFound] = useState<boolean>(false);
  const [domainChecked, setDomainChecked] = useState<boolean>(false);
  const [databaseCheckComplete, setDatabaseCheckComplete] = useState<boolean>(false);
  const [continuePolling, setContinuePolling] = useState<boolean>(false); // Start with polling disabled
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [autoNavigating, setAutoNavigating] = useState<boolean>(false);
  
  // Track latest domain and conversation ID values for callbacks
  const latestDomainRef = useRef(initialDomain);
  const conversationIdRef = useRef(initialConversationId);
  const initialSetupCompleteRef = useRef(false);
  const hasStartedPollingRef = useRef(false);
  const navigateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(Date.now());
  const dataValidationPassedRef = useRef(false);
  const minimumPollingTimeReachedRef = useRef(false);
  
  // Track consecutive 404 errors to avoid infinite polling
  const consecutive404ErrorsRef = useRef(0);
  const notFoundErrorThreshold = 2; // Reduced from 3 to fail faster
  
  // Update refs whenever values change
  useEffect(() => {
    latestDomainRef.current = initialDomain;
  }, [initialDomain]);
  
  useEffect(() => {
    if (conversationId !== conversationIdRef.current) {
      console.log(`Conversation ID updated from ${conversationIdRef.current} to: ${conversationId}`);
      conversationIdRef.current = conversationId;
      
      // Log update for debugging
      addDbLog({
        type: 'check',
        operation: 'Conversation ID Updated',
        data: { 
          conversationId,
          initialConversationId,
          source: 'useEffect conversationId change'
        },
        timestamp: new Date().toISOString()
      });
    }
  }, [conversationId, initialConversationId]);
  
  // Clear any navigate timeout on unmount
  useEffect(() => {
    return () => {
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
    };
  }, []);

  const navigate = useNavigate();

  // New state for tracking save operation
  const [isSaving, setIsSaving] = useState(false);
  const hasNavigatedRef = useRef(false);
  const minimumWaitTimeMs = 3000; // Minimum wait time before navigation

  // Set a timer to mark minimum polling time as reached
  useEffect(() => {
    const timer = setTimeout(() => {
      minimumPollingTimeReachedRef.current = true;
      console.log('[useMarketingPlanData] Minimum polling time reached');
    }, minimumWaitTimeMs);
    
    return () => clearTimeout(timer);
  }, []);

  // Enhanced function to handle successful plan data
  const handleSuccessfulPlan = async (parsedData: any, rawData: any) => {
    console.log('Handling successful plan:', { 
      hasNavigated: hasNavigatedRef.current,
      pollCount: pollCounter,
      minimumTimeReached: minimumPollingTimeReachedRef.current,
      isDataValid: !isEmptyObject(parsedData)
    });
    
    if (hasNavigatedRef.current) return; // Prevent double processing
    
    // MODIFIED: Removed minimum poll count requirement and simplified validation
    // Only check if we have actual content
    if (!parsedData || isEmptyObject(parsedData)) {
      console.log('[handleSuccessfulPlan] Data validation failed - empty data:', parsedData);
      dataValidationPassedRef.current = false;
      return; // Don't proceed with empty data
    }
    
    // MODIFIED: Improved validation - check essential fields are present
    if (!parsedData.company_summary || 
        !parsedData.programs_list || 
        (Array.isArray(parsedData.programs_list) && parsedData.programs_list.length === 0)) {
      console.log('[handleSuccessfulPlan] Data validation failed - missing required fields:', {
        hasCompanySummary: !!parsedData.company_summary,
        hasProgramsList: !!parsedData.programs_list,
        programsListLength: parsedData.programs_list ? 
          (Array.isArray(parsedData.programs_list) ? parsedData.programs_list.length : 'not an array') 
          : 0
      });
      dataValidationPassedRef.current = false;
      return; // Don't proceed with incomplete data
    }
    
    dataValidationPassedRef.current = true;
    
    try {
      setIsSaving(true);
      
      if (latestDomainRef.current) {
        const dataToSave = {
          ...rawData.response.data,
          metadata: {
            ...rawData.metadata,
            conversation_id: conversationIdRef.current,
            generated_at: new Date().toISOString()
          }
        };

        await saveMarketingPlan(
          latestDomainRef.current,
          email,
          dataToSave
        );

        console.log('Plan saved successfully');
        addDbLog({
          type: 'check',
          operation: 'Plan Saved',
          data: { domain: latestDomainRef.current },
          timestamp: new Date().toISOString(),
          status: 'success'
        });
      }

      // Set success states
      setPlanData(parsedData);
      setHasValidPlan(true);
      setIsLoading(false);
      setContinuePolling(false);
      setError(null);
      
      // MODIFIED: Simplified navigation logic - only wait for minimum time to be reached
      const shouldNavigate = !hasNavigatedRef.current && 
                             latestDomainRef.current && 
                             dataValidationPassedRef.current && 
                             minimumPollingTimeReachedRef.current;
                             
      if (shouldNavigate) {
        console.log('[handleSuccessfulPlan] All navigation conditions met, navigating to results page');
        hasNavigatedRef.current = true;
        const path = `/results/${latestDomainRef.current}`;
        console.log('Navigating to:', path);
        
        // Small delay to ensure state is updated
        setTimeout(() => {
          navigate(path);
        }, 300);
      } else if (!minimumPollingTimeReachedRef.current) {
        console.log('[handleSuccessfulPlan] Minimum wait time not reached yet, delaying navigation');
      }
    } catch (error) {
      console.error('Error in handleSuccessfulPlan:', error);
      toast.error('Error saving plan data');
      setIsSaving(false);
    } finally {
      if (!minimumPollingTimeReachedRef.current) {
        console.log('[handleSuccessfulPlan] Setting saving to false but continuing to wait for minimum time');
        setIsSaving(true); // Keep loading state until minimum time is reached
      } else {
        setIsSaving(false);
      }
    }
  };
  
  // Polling implementation with progressive intervals
  const polling = usePolling(
    useCallback(async () => {
      // Get the most up-to-date conversation ID from the ref
      const currentConversationId = conversationIdRef.current;
      
      // Exit early if we don't have necessary data
      if (!currentConversationId) {
        console.warn('Cannot poll without conversation ID');
        return null;
      }
      
      // Log the current polling attempt with the active conversation ID
      console.log(`[Polling] Attempt #${pollCounter + 1} with conversation ID: ${currentConversationId}`);
      
      try {
        setPollCounter(prevCount => prevCount + 1);
        setLoadingMessage(`Checking for marketing plan data... (Poll #${pollCounter + 1})`);
        
        // Ensure sufficient delay between polling attempts
        const currentPollCount = pollCounter + 1;
        
        // Make the API call to get the current state
        const response = await getAnalysisAnswer(currentConversationId, currentPollCount);
        
        // Reset 404 counter on successful response
        consecutive404ErrorsRef.current = 0;
        
        // Store the raw response for debugging
        setRawApiData(response);
        setResponseStatus(response);
        
        // Log full API response for debugging
        console.log('Analysis API response:', response);
        
        // Check for error conditions
        if (response?.status === 'failed') {
          console.error('API reported failure:', response);
          throw new Error(response.response?.error || 'Polling failed');
        }
        
        // IMPROVED: Check if plan generation is complete using updated isAnalysisComplete function
        if (isAnalysisComplete(response)) {
          console.log('Plan generation succeeded! Parsing data...');
          
          // Parse the plan data
          const parsedData = parsePlanData(response.response.data);
          console.log('Parsed plan data:', parsedData);
          
          // Only proceed with database operations if we have valid data
          if (parsedData && !isEmptyObject(parsedData)) {
            await handleSuccessfulPlan(parsedData, response);
          } else {
            console.error('Generated plan data is empty or invalid');
            throw new Error('Generated plan data is empty or invalid');
          }
          
          if (minimumPollingTimeReachedRef.current && dataValidationPassedRef.current) {
            return response; // Stop polling when minimum time is reached and data is valid
          }
          return null; // Continue polling until minimum conditions met
        }
        
        // Plan not ready yet, continue polling
        setLoadingMessage(`Generating marketing plan... (Poll #${pollCounter + 1})`);
        return response;
      } catch (apiError: any) {
        console.error('Error during polling:', apiError);
        
        // Extract error message for easier checking
        const errorMessage = apiError.message || '';
        
        // Check if this is a 404 "No agent response found" error
        const isNotFoundError = 
          errorMessage.toLowerCase().includes('no agent response') || 
          errorMessage.includes('404');
        
        if (isNotFoundError) {
          consecutive404ErrorsRef.current += 1;
          
          // Log the consecutive 404 errors
          console.log(`Received 404 error ${consecutive404ErrorsRef.current} times in a row`);
          
          // CRITICAL: Stop polling immediately after multiple 404 errors
          if (consecutive404ErrorsRef.current >= notFoundErrorThreshold) {
            console.error(`Conversation ID ${currentConversationId} not found after ${consecutive404ErrorsRef.current} attempts, stopping polling`);
            
            addDbLog({
              type: 'check',
              operation: 'Invalid Conversation ID Confirmed',
              data: { 
                companyDomain: latestDomainRef.current,
                conversationId: currentConversationId,
                error: errorMessage,
                consecutive404Errors: consecutive404ErrorsRef.current,
                shouldStop: true
              },
              timestamp: new Date().toISOString(),
              status: 'error'
            });
            
            // Set clear error message showing the conversation ID is invalid
            const formattedErrorMsg = `We couldn't generate a marketing plan for "${latestDomainRef.current}". The conversation ID ${currentConversationId} appears to be invalid. Please try with a different domain.`;
            setError(formattedErrorMsg);
            setLoadingMessage('Error: Invalid conversation ID');
            
            // Stop polling after several 404s
            setContinuePolling(false);
            
            // Schedule auto-navigation back to input page after a short delay
            if (!autoNavigating) {
              setAutoNavigating(true);
              toast.error('Could not retrieve marketing plan. Returning to input page in 5 seconds...');
              
              // We'll use the navigate function from the parent component
              // This signals the parent to handle the navigation
              return {
                status: 'invalid_conversation',
                error: formattedErrorMsg,
                shouldNavigateToInput: true,
              };
            }
            
            return null;
          }
        } else {
          // Reset counter for other types of errors
          consecutive404ErrorsRef.current = 0;
        }
        
        addDbLog({
          type: 'check',
          operation: 'Polling Error',
          data: { 
            companyDomain: latestDomainRef.current,
            conversationId: currentConversationId,
            error: errorMessage,
            pollCount: pollCounter + 1
          },
          timestamp: new Date().toISOString(),
          status: 'error'
        });
        
        setError(errorMessage || 'Failed to retrieve marketing plan');
        return null;
      }
    }, [pollCounter, email, navigate]),
    {
      interval: getProgressivePollingInterval(pollCounter + 1), // Use progressive intervals
      maxAttempts: 30, // Increased to 30 attempts
      initialDelay: getInitialPollingDelay(companyDomain), // Use existing initial delay
      shouldContinuePolling: () => continuePolling && !!conversationIdRef.current,
      onMaxAttemptsReached: () => {
        console.log('Max polling attempts reached');
        
        const totalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        addDbLog({
          type: 'check',
          operation: 'Max Progressive Polling Attempts Reached',
          data: { 
            companyDomain: latestDomainRef.current,
            conversationId: conversationIdRef.current,
            pollCounter,
            totalTimeElapsed: `${totalTime}s`
          },
          timestamp: new Date().toISOString(),
          status: 'error'
        });
        
        // Show more informative error with retry option
        toast.error(
          `The analysis is taking longer than expected (${totalTime}s). The backend might still be processing. You can:
           1. Wait a few minutes and try again
           2. Try with a different domain
           3. Contact support if this persists`,
          {
            duration: 10000,
            action: {
              label: 'Retry Now',
              onClick: () => retryConnection()
            }
          }
        );
        
        setError(`Analysis timeout (${totalTime}s). The backend might still be processing - you can try again in a few minutes.`);
        setLoadingMessage('Operation timed out. Click Retry to check again.');
        setContinuePolling(false);
      },
      onError: (err) => {
        console.error('Polling error:', err);
        
        addDbLog({
          type: 'check',
          operation: 'Polling Error Handler',
          data: { 
            companyDomain: latestDomainRef.current,
            conversationId: conversationIdRef.current,
            error: err.message,
            pollCounter
          },
          timestamp: new Date().toISOString(),
          status: 'error'
        });
        
        setError(err.message || 'Failed to retrieve marketing plan');
        setLoadingMessage('Error occurred while generating plan.');
      },
      debugMode: true
    }
  );
  
  // Function to retry connection
  const retryConnection = useCallback(async () => {
    console.log('Retrying connection...');
    
    addDbLog({
      type: 'check',
      operation: 'Retrying Connection',
      data: { 
        companyDomain: latestDomainRef.current,
        conversationId: conversationIdRef.current
      },
      timestamp: new Date().toISOString()
    });
    
    // Reset state for a fresh start
    setError(null);
    setNoResultsFound(false);
    setHasValidPlan(false);
    setPollCounter(0);
    setResponseStatus(null);
    setRawApiData(null);
    setLoadingMessage('Retrying connection...');
    setContinuePolling(true);
    consecutive404ErrorsRef.current = 0;
    setAutoNavigating(false);
    
    if (navigateTimeoutRef.current) {
      clearTimeout(navigateTimeoutRef.current);
      navigateTimeoutRef.current = null;
    }
    
    // Restart polling
    polling.resetPolling(); // Reset completely
    await delay(1000); // Short delay before restarting
    polling.startPolling();
  }, [polling]);
  
  // Enhanced effect to handle loading state transitions
  useEffect(() => {
    if (hasValidPlan) {
      console.log('Valid plan detected, clearing loading state');
      setIsLoading(false);
      setContinuePolling(false);
      
      if (polling.isActive) {
        console.log('Stopping active polling');
        polling.stopPolling();
      }
    }
  }, [hasValidPlan, polling]);
  
  // Enhanced polling success handler
  useEffect(() => {
    if (responseStatus && isAnalysisComplete(responseStatus)) {
      console.log('Complete response detected, updating states');
      
      const parsedData = parsePlanData(responseStatus.response?.data);
      
      // MODIFIED: Added detailed validation results logging
      const validationResult = validatePlanData(responseStatus.response?.data);
      console.log('Plan validation result:', {
        isValid: validationResult.isValid,
        errorCount: validationResult.errors?.length || 0,
        data: validationResult.data ? 'present' : 'null',
        errors: validationResult.errors
      });
      
      const isValid = validationResult.isValid && validationResult.data !== null;
      
      if (isValid) {
        setPlanData(parsedData);
        setHasValidPlan(true);
        setIsLoading(false);
        setContinuePolling(false);
        setError(null);
        
        addDbLog({
          type: 'check',
          operation: 'Plan Generation Complete',
          data: { 
            companyDomain: latestDomainRef.current,
            conversationId: conversationIdRef.current,
            timestamp: new Date().toISOString(),
            hasValidData: true
          },
          timestamp: new Date().toISOString(),
          status: 'success'
        });
      } else {
        console.error('Received complete response but data is invalid:', responseStatus);
        setError('Generated plan data is invalid or incomplete');
        setHasValidPlan(false);
        setPlanData(null);
      }
    }
  }, [responseStatus]);
  
  // Effect to set initial conversation ID if provided
  useEffect(() => {
    // Only set conversation ID if it's provided and different from current
    if (initialConversationId && initialConversationId !== conversationId) {
      console.log(`Setting conversation ID from props: ${initialConversationId}`);
      setConversationId(initialConversationId);
      conversationIdRef.current = initialConversationId;
      
      // Validate domain while we're at it
      const domainValid = isDomainLikelyValid(initialDomain);
      
      addDbLog({
        type: 'check',
        operation: 'Setting Initial ConversationId',
        data: { 
          initialConversationId,
          companyDomain: initialDomain,
          isDomainValid: domainValid
        },
        timestamp: new Date().toISOString()
      });
      
      // If we have an invalid domain but a conversationID, that's suspicious
      // This might cause issues, so log it
      if (!domainValid && initialConversationId) {
        console.warn('Warning: Have conversation ID but invalid domain format:', { 
          initialDomain, initialConversationId
        });
      }
    }
  }, [initialConversationId, conversationId, initialDomain]);
  
  // Handle initial setup and database check
  useEffect(() => {
    // Skip if we've already done this, or if we don't have a domain
    if (initialSetupCompleteRef.current || !initialDomain) {
      return;
    }
    
    // Mark as complete to avoid duplications
    initialSetupCompleteRef.current = true;
    
    // Show loading state
    setIsLoading(true);
    setCompanyDomain(initialDomain);
    setOriginalDomain(initialDomain);
    setLoadingMessage('Checking for existing plan...');
    
    console.log('Starting initial setup for domain:', initialDomain);
    
    // First check if we already have a plan in the database
    const checkExistingPlan = async () => {
      try {
        console.log(`Checking database for existing plan for domain: ${initialDomain}`);
        const existingPlan = await getMarketingPlanByDomain(initialDomain);
        setDomainChecked(true);
        setDatabaseCheckComplete(true);
        
        if (existingPlan.success && existingPlan.plan) {
          console.log('Found existing complete plan in database:', existingPlan);
          
          // Parse and set the plan data
          const parsedData = parsePlanData(existingPlan.plan);
          setPlanData(parsedData);
          setHasValidPlan(true);
          setLoadingMessage('Existing plan loaded successfully!');
          setIsLoading(false);
          
          // No need to start polling
          return;
        }
        
        // No complete plan in database, set conversation ID for polling
        console.log(`No complete plan found. Using provided conversation ID: ${initialConversationId}`);
        setLoadingMessage('Generating new marketing plan...');
        
        if (initialConversationId) {
          // Set conversation ID for polling
          setConversationId(initialConversationId);
          conversationIdRef.current = initialConversationId;
          
          // Start polling if we have a conversation ID
          if (!hasStartedPollingRef.current) {
            console.log('Starting polling with conversationId:', initialConversationId);
            setContinuePolling(true);
            hasStartedPollingRef.current = true;
            
            // Small delay to ensure state is updated before first poll
            setTimeout(() => {
              polling.startPolling();
            }, getInitialPollingDelay(initialDomain));
          }
        } else {
          // No conversation ID and no plan - this is an error state
          console.error('No conversation ID provided and no existing plan found');
          setNoResultsFound(true);
          setError('No marketing plan found and no conversation ID provided');
        }
      } catch (error) {
        console.error('Error checking for existing plan:', error);
        setError('Error checking for existing plan. Please try again.');
        setIsLoading(false);
      }
    };
    
    checkExistingPlan();
    
    // Cleanup function
    return () => {
      console.log('Component unmounted. Stopping all polling operations.');
      setContinuePolling(false);
      polling.stopPolling();
      
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
    };
  }, [initialDomain, initialConversationId, polling]);
  
  const handleTimeout = useCallback(() => {
    if (hasValidPlan || !isLoading) return;

    console.log('6-minute timeout reached for plan generation');
    
    addDbLog({
      type: 'check',
      operation: 'Operation Timeout',
      data: { 
        companyDomain: latestDomainRef.current,
        conversationId: conversationIdRef.current,
        pollCount: pollCounter,
        elapsedTime: '360s',
        hasValidPlan,
        rawApiData
      },
      timestamp: new Date().toISOString(),
      status: 'error'
    });

    setError(`The plan generation for "${latestDomainRef.current}" has timed out after 6 minutes. This might indicate:
      1. Server processing issues
      2. Complex domain analysis
      3. Network connectivity problems
      
      You can try:
      1. Retrying the operation
      2. Using a different domain
      3. Checking back in a few minutes`);
    
    setLoadingMessage('Operation timed out after 6 minutes');
    setContinuePolling(false);
    polling.stopPolling();
  }, [hasValidPlan, isLoading, polling, pollCounter, rawApiData]);

  // Initialize the timeout hook
  useTimeout({
    onTimeout: handleTimeout,
    timeoutDuration: 360000, // 6 minutes
    enabled: isLoading && !hasValidPlan
  });

  // Return the hook data
  return {
    planData,
    isLoading,
    error,
    companyDomain,
    originalDomain,
    loadingMessage,
    responseStatus,
    rawApiData,
    hasValidPlan,
    pollCounter,
    retryConnection,
    noResultsFound,
    domainChecked,
    databaseCheckComplete,
    conversationId,
    autoNavigating,
    isSaving,
    stopPolling: useCallback(() => {
      console.log('Explicitly stopping all polling operations');
      setContinuePolling(false);
      polling.stopPolling();
      
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
    }, [polling])
  };
};
