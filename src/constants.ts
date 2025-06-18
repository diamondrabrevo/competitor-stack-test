
// CRITICAL: Using moderate polling interval to balance responsiveness and server load
export const POLL_INTERVAL = 10000; // 10 seconds - reduced frequency to prevent excessive polling
export const INITIAL_POLL_DELAY = 0; // No delay - start polling immediately
export const MAX_POLL_ATTEMPTS = 40; // Maximum poll attempts before timing out

// Application name
export const APP_NAME = 'Marketing Relationship Plan Generator';

export const ERROR_MESSAGES = {
  UNEXPECTED: "An unexpected error occurred. Please try again.",
  FAILED_GENERATION: "Failed to generate the marketing plan. Please try again.",
  INVALID_DOMAIN: "Please enter a valid company domain.",
  NETWORK_ERROR: "Network connection lost. Please check your internet connection and try again.",
  PROCESSING_TIMEOUT: "Our AI is taking longer than expected to generate your plan. Please try again.",
  STILL_PROCESSING: "Your plan is still being generated. This may take a few minutes.",
  INVALID_EMAIL: "Please enter a valid business email address.",
  EMPTY_DOMAIN: "Please enter a company domain.",
  UNSUPPORTED_DOMAIN: "This domain is not supported at this time.",
  SERVER: "Server error. Please try again later.",
  SAVE_ERROR: "Failed to save your request. Please try again.",
  GENERIC_ERROR: "Something went wrong. Please try again.",
  EMPTY_RESPONSE: "No data received from the server. Please try again.",
  INCOMPLETE_PLAN: "The generated marketing plan is missing required sections. Please try again.",
  EMPTY_DATA: "Found plan for the domain, but the data appears to be empty. Please try a different company domain.",
  PARSE_ERROR: "Could not process the data we received. This might be due to an unexpected format.",
  EMPTY_PLAN: "No marketing data available for this domain. This typically happens when there isn't enough public information available for the company. Please try a different company domain.",
  EXISTING_EMPTY_PLAN: "We found an existing plan for this domain but it contains no marketing data. This typically happens when there isn't enough public information available. Please try a different company domain."
};
