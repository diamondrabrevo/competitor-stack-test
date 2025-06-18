/**
 * API service for interacting with the backend
 */

// Global array to store API request logs
export let apiLogs: ApiLogEntry[] = [];

// Interface for API log entries
export interface ApiLogEntry {
  timestamp: string;
  type: 'request' | 'response';
  endpoint: string;
  data: any;
}

// Function to add an API log entry
export const addLog = (log: ApiLogEntry) => {
  apiLogs = [log, ...apiLogs].slice(0, 100); // Limit to 100 entries
};

// Function to reset API logs
export const resetApiLogs = () => {
  apiLogs = [];
};

/**
 * Utility function to create a delay
 * @param ms - Milliseconds to delay
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Interface for API response
 */
interface AnalysisResponse {
  conversationSId?: string;  // API returns conversationSId
  error?: string;
}

/**
 * Starts a marketing plan analysis for a given company domain
 * 
 * @param domain - The company domain to analyze
 * @returns Promise with the conversation ID and success status
 */
export const startAnalysis = async (
  domain: string
): Promise<{ success: boolean; conversationId?: string; error?: string }> => {
  try {
    const requestPayload = {
      prompt: `Analyze company ${domain}`,
      inputs: { company: domain },
      agentConfigId: "RODve63vcy"
    };

    // Log the API request
    addLog({
      timestamp: new Date().toISOString(),
      type: 'request',
      endpoint: 'start-analysis',
      data: requestPayload
    });

    const response = await fetch(
      "https://dusty-backend.netlify.app/.netlify/functions/start-analysis",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      }
    );

    // Get the raw response text first for logging
    const responseText = await response.text();
    let responseData: AnalysisResponse;

    try {
      responseData = JSON.parse(responseText);
      
      // Log parsed response for debugging
      console.log('API Response Data:', {
        status: response.status,
        responseData,
        hasConversationSId: !!responseData.conversationSId
      });
    } catch (parseError) {
      console.error("Failed to parse API response:", responseText);
      addLog({
        timestamp: new Date().toISOString(),
        type: 'response',
        endpoint: 'start-analysis',
        data: { 
          status: response.status, 
          error: 'Invalid JSON response',
          rawResponse: responseText
        }
      });
      
      return {
        success: false,
        error: `Invalid response format: ${responseText.slice(0, 100)}...`
      };
    }

    // Log the complete API response
    addLog({
      timestamp: new Date().toISOString(),
      type: 'response',
      endpoint: 'start-analysis',
      data: {
        status: response.status,
        body: responseData
      }
    });

    if (!response.ok) {
      console.error("API Error:", responseText);
      return {
        success: false,
        error: `Server error: ${response.status} - ${responseText}`
      };
    }

    // Validate response structure and map conversationSId to conversationId
    if (!responseData || typeof responseData.conversationSId !== 'string') {
      console.error("Invalid response structure:", responseData);
      return {
        success: false,
        error: "Invalid response: missing conversationSId"
      };
    }

    return {
      success: true,
      conversationId: responseData.conversationSId
    };
  } catch (error) {
    console.error("Error starting analysis:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
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
 * Enhanced check for complete analysis
 */
export const isAnalysisComplete = (response: any): boolean => {
  if (!response) {
    console.log('Analysis status check: No response object');
    return false;
  }
  
  // IMPROVED: More detailed logging of the response structure
  console.log('Analysis status check:', {
    status: response.status,
    hasData: !!response.response?.data,
    hasContent: !!response.response?.data?.content,
    dataSize: response.response?.data ? Object.keys(response.response.data).length : 0,
    contentType: response.response?.data?.content ? typeof response.response.data.content : 'none',
    contentKeys: response.response?.data?.content ? Object.keys(response.response.data.content) : []
  });
  
  // First check if response contains error messages
  if (containsErrorMessage(response)) {
    console.log('Analysis contains error message in content');
    return false;
  }
  
  // SIMPLIFIED: Focus on status as primary indicator
  const hasValidStatus = response.status === 'succeeded' || response.status === 'completed';
  if (!hasValidStatus) {
    console.log('Analysis not complete: Invalid status', response.status);
    return false;
  }
  
  // IMPROVED: More detailed content validation
  // Check for content in different possible locations
  const content = response.response?.data?.content;
  if (!content) {
    console.log('Analysis not complete: Missing content');
    return false;
  }
  
  // Ensure we have an object with some data
  if (typeof content !== 'object' || Object.keys(content).length === 0) {
    console.log('Analysis not complete: Content is empty or not an object');
    return false;
  }
  
  // IMPROVED: Check for minimum required content structure
  const hasCompanySummary = !!content.company_summary && 
                          typeof content.company_summary === 'object' &&
                          Object.keys(content.company_summary).length > 0;
                          
  const hasProgramsList = !!content.programs_list;
  
  // Validate programs list content if it exists
  let programsListValid = false;
  if (hasProgramsList) {
    if (Array.isArray(content.programs_list)) {
      programsListValid = content.programs_list.length > 0;
    } else if (typeof content.programs_list === 'object') {
      programsListValid = Object.keys(content.programs_list).length > 0;
    }
  }
  
  // Check for program details as an alternative to programs_list
  const hasProgramDetails = Object.keys(content).some(key => key.match(/^program_\d+_details$/));
  
  console.log('Content validation:', {
    hasCompanySummary,
    hasProgramsList,
    programsListValid,
    hasProgramDetails
  });
  
  // Consider complete if we have company summary AND either valid programs list OR program details
  if (hasCompanySummary && (programsListValid || hasProgramDetails)) {
    console.log('Analysis complete: Status succeeded and required content present');
    return true;
  }
  
  console.log('Analysis not complete: Missing required content structure');
  return false;
};

/**
 * Gets the analysis answer for a given conversation ID
 * 
 * @param conversationId - The conversation ID to check
 * @param attemptCount - The current attempt number (for logging)
 * @returns Promise with the analysis result
 */
export const getAnalysisAnswer = async (conversationId: string, attemptCount?: number): Promise<any> => {
  try {
    // Log the API request
    addLog({
      timestamp: new Date().toISOString(),
      type: 'request',
      endpoint: 'analysis-answer',
      data: { conversationId, attemptCount }
    });

    const response = await fetch(
      `https://dusty-backend.netlify.app/.netlify/functions/analysis-answer?id=${conversationId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Analysis answer error (attempt ${attemptCount}):`, errorText);
      
      // Log the API error response
      addLog({
        timestamp: new Date().toISOString(),
        type: 'response',
        endpoint: 'analysis-answer',
        data: { status: response.status, error: errorText, attemptCount }
      });
      
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Check for error messages in the response content before returning it as successful
    if (containsErrorMessage(data)) {
      console.warn('API returned success status but contains error message in content:', data);
      // Extract the error message for better user feedback
      const content = data.response?.data?.content || data.content;
      const errorMessage = typeof content === 'string' ? content : 'Unknown error in response content';
      
      // Log this special case
      addLog({
        timestamp: new Date().toISOString(),
        type: 'response',
        endpoint: 'analysis-answer',
        data: { 
          status: 'content-error', 
          error: errorMessage,
          originalData: data,
          attemptCount 
        }
      });
      
      // Make this response show like an error
      data.contentError = true;
      data.contentErrorMessage = errorMessage;
    }
    
    // Log the API response
    addLog({
      timestamp: new Date().toISOString(),
      type: 'response',
      endpoint: 'analysis-answer',
      data
    });
    
    return data;
  } catch (error) {
    // Log the API error
    addLog({
      timestamp: new Date().toISOString(),
      type: 'response',
      endpoint: 'analysis-answer',
      data: { error: error instanceof Error ? error.message : "Unknown error", attemptCount }
    });
    
    throw error;
  }
};
