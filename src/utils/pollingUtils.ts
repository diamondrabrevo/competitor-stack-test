
/**
 * Utilities for handling polling and progress calculation
 */

/**
 * Calculate the waiting progress based on poll counter
 * @param pollCounter - Current poll attempt counter
 * @returns Progress percentage (0-100)
 */
export const getWaitingProgress = (pollCounter: number): number => {
  const baseProgress = 15;
  const maxProgress = 85;
  
  if (pollCounter <= 10) {
    return Math.min(maxProgress, baseProgress + (pollCounter * 2));
  } 
  else if (pollCounter <= 30) {
    return Math.min(maxProgress, baseProgress + 20 + (pollCounter - 10) * 1);
  }
  else if (pollCounter <= 60) {
    return Math.min(maxProgress, baseProgress + 40 + (pollCounter - 30) * 0.5);
  }
  else {
    return Math.min(maxProgress, baseProgress + 55 + (pollCounter - 60) * 0.2);
  }
};

/**
 * Get a dynamic loading message based on elapsed time or poll count
 * @param elapsedTime - Seconds elapsed since start
 * @param pollCount - Number of poll attempts
 * @param companyDomain - Domain being analyzed
 * @returns Appropriate loading message
 */
export const getLoadingMessage = (
  elapsedTime: number, 
  pollCount: number,
  companyDomain?: string
): string => {
  // Use poll count for more specific messages
  if (pollCount === 0) {
    return `Checking for existing plan for ${companyDomain || 'your company'}...`;
  } else if (pollCount === 1) {
    return `Initializing analysis for ${companyDomain || 'your company'}...`;
  } else if (pollCount < 5) {
    return "Gathering company information...";
  } else if (pollCount < 10) {
    return "Analyzing marketing strategies...";
  } else if (pollCount < 15) {
    return "Building your customized plan...";
  } else {
    return "This is taking longer than usual, but we're still working on it...";
  }
};

/**
 * Check if an API should be allowed to execute
 * Used to prevent unnecessary API calls during initial page load
 * @param isInitialLoad - Whether this is the initial page load
 * @param hasUserInitiated - Whether user has initiated the action
 * @returns Boolean indicating if the API call should be allowed
 */
export const shouldAllowApiCall = (
  isInitialLoad: boolean,
  hasUserInitiated: boolean
): boolean => {
  // Only allow API calls if:
  // 1. It's not the initial page load OR
  // 2. The user has explicitly initiated the action
  return !isInitialLoad || hasUserInitiated;
};

/**
 * Validate conversation ID format - IMPROVED with stricter validation
 * @param conversationId - The conversation ID to validate
 * @returns Boolean indicating if the conversation ID format is valid
 */
export const isValidConversationIdFormat = (conversationId?: string): boolean => {
  if (!conversationId) return false;
  
  // More specific validation - Dusty API seems to use 10-character alphanumeric IDs
  // Make this validation more specific based on observed valid conversation IDs
  return conversationId.length >= 8 && /^[a-zA-Z0-9_-]+$/.test(conversationId);
};

/**
 * Create error message for invalid conversation ID
 * @param conversationId - The conversation ID that is invalid
 * @returns Formatted error message
 */
export const getInvalidConversationIdMessage = (conversationId?: string): string => {
  return `We couldn't generate a marketing plan for this domain. The conversation ID ${conversationId || ''} appears to be invalid or the backend API couldn't locate it. Please try again with a new request.`;
};

/**
 * Determine if an error message indicates an invalid conversation ID - IMPROVED
 * @param errorMessage - The error message to check
 * @returns Boolean indicating if this is an invalid conversation ID error
 */
export const isInvalidConversationIdError = (errorMessage?: string): boolean => {
  if (!errorMessage) return false;
  
  // Add more specific error patterns we're seeing in the backend
  const errorPatterns = [
    'no agent response',
    'no agent response found',
    '404',
    'conversation id',
    'invalid',
    'expired',
    'not found',
    'conversation not found',
    'does not exist',
    'couldn\'t process'
  ];
  
  // Case-insensitive check for any of the error patterns
  return errorPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
};

/**
 * Get recommended polling interval based on attempt number
 * Used to implement exponential backoff for polling
 * @param attemptNumber - Current attempt number
 * @param baseInterval - Base interval in ms
 * @returns Recommended interval in ms
 */
export const getPollingInterval = (attemptNumber: number, baseInterval = 3000): number => {
  // For first few attempts, use the base interval
  if (attemptNumber <= 3) return baseInterval;
  
  // Then start increasing with a cap at 15 seconds
  return Math.min(baseInterval * Math.pow(1.2, attemptNumber - 3), 15000);
};

/**
 * Calculate the progressive polling interval based on attempt number
 * Spreads 30 attempts over ~10 minutes with adaptive intervals
 * @param attemptNumber - Current polling attempt (1-based)
 * @returns Polling interval in milliseconds
 */
export const getProgressivePollingInterval = (attemptNumber: number): number => {
  // First 10 attempts: 10 second intervals (total: 100s)
  if (attemptNumber <= 10) {
    return 10000;
  }
  
  // Next 10 attempts: 20 second intervals (total: 200s)
  if (attemptNumber <= 20) {
    return 20000;
  }
  
  // Final 10 attempts: 30 second intervals (total: 300s)
  return 30000;
};

/**
 * Determine if we should stop polling based on error patterns - IMPROVED
 * @param errorMessage - Current error message
 * @param consecutiveErrors - Count of consecutive errors of the same type
 * @returns Boolean indicating if polling should stop
 */
export const shouldStopPolling = (errorMessage: string, consecutiveErrors: number): boolean => {
  // CRITICAL FIX: Stop polling immediately for "No agent response found" errors
  if (errorMessage.toLowerCase().includes('no agent response found')) {
    return consecutiveErrors >= 1; // Stop after first occurrence
  }
  
  // Stop polling if we get any invalid conversation ID errors
  if (isInvalidConversationIdError(errorMessage)) {
    return true;
  }
  
  // Add other conditions here as needed
  return false;
};

/**
 * Calculate the initial delay before starting polling based on domain characteristics
 * @param domain - The domain being analyzed
 * @returns Recommended delay in ms
 */
export const getInitialPollingDelay = (domain?: string): number => {
  if (!domain) return 3000;
  
  // Longer delay for more complex or large domains
  if (domain.includes('com') || domain.length > 10) {
    return 5000;  // 5 seconds for typical domains
  }
  
  return 3000; // 3 seconds for simpler domains
};

/**
 * Determine if a domain appears to be valid enough to analyze
 * @param domain - The domain to validate
 * @returns Boolean indicating if the domain appears valid
 */
export const isDomainLikelyValid = (domain?: string): boolean => {
  if (!domain) return false;
  
  // Very basic check - could be expanded
  return domain.length > 4 && domain.includes('.');
};

/**
 * Check if a response contains an error message in its content
 */
const containsErrorMessage = (response: any): boolean => {
  if (!response) return false;

  const content = response.response?.data?.content || response.content;
  const errorPhrases = [
    'encountered an issue',
    'i\'m sorry',
    'couldn\'t analyze',
    'failed to analyze',
    'unable to',
    'error occurred',
    'invalid domain'
  ];

  // Check if content is a string (direct error message)
  if (typeof content === 'string') {
    return errorPhrases.some(phrase => 
      content.toLowerCase().includes(phrase.toLowerCase())
    );
  }

  // Check if content is an object
  if (typeof content === 'object' && content !== null) {
    const stringContent = JSON.stringify(content).toLowerCase();
    return errorPhrases.some(phrase => 
      stringContent.includes(phrase.toLowerCase())
    );
  }

  return false;
};

/**
 * Check if an API response has the minimum required content structure
 * @param response - The API response to check
 * @returns Boolean indicating if the response has minimum content
 */
export const hasMinimumContent = (response: any): boolean => {
  if (!response || !response.response?.data?.content) return false;
  
  // IMPROVED: Check API status first - if it succeeded, trust that judgment
  if (response.status === "succeeded") {
    console.log('[hasMinimumContent] API reports success, accepting as having minimum content');
    return true;
  }
  
  const content = response.response.data.content;
  
  // Check for company summary OR programs list OR program details
  const hasCompanySummary = content.company_summary && 
                           typeof content.company_summary === 'object';
                           
  const hasProgramsList = content.programs_list && 
                        (Array.isArray(content.programs_list) || 
                         typeof content.programs_list === 'object');
                         
  const hasProgramDetails = Object.keys(content).some(key => key.match(/^program_\d+_details$/));
  
  // IMPROVED: Less restrictive - only need one of these components
  return hasCompanySummary || hasProgramsList || hasProgramDetails;
};

/**
 * Checks if the backend returns actual data
 * This is a more lenient check than trying to validate all required data
 * @param response - The API response to check
 * @returns Boolean indicating if the API returned any meaningful data
 */
export const hasAnyUsableData = (response: any): boolean => {
  // Accept if API explicitly says success
  if (response && response.status === "succeeded") {
    return true;
  }
  
  if (!response || !response.response || !response.response.data || !response.response.data.content) {
    return false;
  }
  
  const content = response.response.data.content;
  
  // Check if we have any actual content keys that matter
  return !!(
    content.company_summary || 
    content.programs_list ||
    Object.keys(content).some(key => key.match(/^program_\d+_details$/))
  );
};
