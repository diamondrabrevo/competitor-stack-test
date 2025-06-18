/**
 * Email gate configuration with pattern-based detection
 * Note: "sss" is a special value that bypasses all validation - it will be accepted exactly as "sss" without requiring an @ symbol
 */

// Pattern-based free email provider detection
export const FREE_EMAIL_PATTERNS = [
  // Gmail variations
  /^gmail\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  /^googlemail\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  
  // Yahoo variations
  /^yahoo\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  /^ymail\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  /^rocketmail\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  
  // Microsoft/Outlook variations
  /^hotmail\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  /^outlook\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  /^live\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  /^msn\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  
  // AOL variations
  /^aol\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  
  // Apple variations
  /^icloud\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  /^me\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  /^mac\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  
  // Other common free providers
  /^mail\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  /^protonmail\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  /^proton\.(me|com|co\.[a-z]{2}|[a-z]{2})$/,
  /^zoho\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  /^yandex\.(com|ru|co\.[a-z]{2}|[a-z]{2})$/,
  /^gmx\.(com|net|de|co\.[a-z]{2}|[a-z]{2})$/,
  /^inbox\.(com|co\.[a-z]{2}|[a-z]{2})$/,
  /^fastmail\.(com|fm|co\.[a-z]{2}|[a-z]{2})$/,
  /^tutanota\.(com|de|co\.[a-z]{2}|[a-z]{2})$/,
  /^temp-mail\.(org|io|com)$/,
  /^10minutemail\.(com|net|org)$/,
  /^guerrillamail\.(com|net|org)$/,
];

/**
 * Check if a domain matches any free email provider pattern
 */
export const isFreeEmailDomain = (domain: string): boolean => {
  const normalizedDomain = domain.toLowerCase().trim();
  return FREE_EMAIL_PATTERNS.some(pattern => pattern.test(normalizedDomain));
};

// Note: This regex is not used for the special case "sss"
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_GATE_MESSAGES = {
  TITLE: 'Unlock Your Marketing Plan',
  DESCRIPTION: 'Enter your business email to access your full marketing plan and receive tailored marketing insights.',
  PLACEHOLDER: 'you@yourcompany.com',
  BUTTON_TEXT: 'Access Your Plan',
  INVALID_EMAIL: 'Please enter a valid email address.',
  FREE_DOMAIN: 'Please use your company email address (not a free email provider).',
};
