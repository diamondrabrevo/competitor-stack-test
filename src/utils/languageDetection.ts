
/**
 * Language detection utilities for automatic language detection and storage
 */

// Standard language codes mapping (ISO 639-1)
const SUPPORTED_LANGUAGES = {
  'en': 'en',
  'fr': 'fr', 
  'es': 'es',
  'de': 'de',
  'it': 'it',
  'pt': 'pt',
  'nl': 'nl',
  'ru': 'ru',
  'zh': 'zh',
  'ja': 'ja',
  'ko': 'ko',
  'ar': 'ar'
} as const;

type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Detects the user's preferred language from browser settings
 * @returns ISO 639-1 language code (e.g., 'en', 'fr')
 */
export const detectUserLanguage = (): string => {
  try {
    // Get browser language preferences
    const browserLanguages = [
      navigator.language,
      ...(navigator.languages || [])
    ];

    console.log('Browser languages detected:', browserLanguages);

    // Find the first supported language
    for (const lang of browserLanguages) {
      // Extract language code (e.g., 'en-US' -> 'en')
      const langCode = lang.split('-')[0].toLowerCase() as SupportedLanguage;
      
      if (SUPPORTED_LANGUAGES[langCode]) {
        console.log('Language detected and supported:', langCode);
        return langCode;
      }
    }

    // Default to English if no supported language found
    console.log('No supported language found, defaulting to English');
    return 'en';
  } catch (error) {
    console.error('Error detecting language:', error);
    return 'en';
  }
};

/**
 * Stores language preference in localStorage for persistence
 * @param language - ISO 639-1 language code
 */
export const storeLanguagePreference = (language: string): void => {
  try {
    localStorage.setItem('user_language_preference', language);
    console.log('Language preference stored:', language);
  } catch (error) {
    console.error('Error storing language preference:', error);
  }
};

/**
 * Retrieves stored language preference from localStorage
 * @returns stored language code or null if not found
 */
export const getStoredLanguagePreference = (): string | null => {
  try {
    const stored = localStorage.getItem('user_language_preference');
    if (stored) {
      console.log('Stored language preference retrieved:', stored);
    }
    return stored;
  } catch (error) {
    console.error('Error retrieving stored language preference:', error);
    return null;
  }
};

/**
 * Gets the user's language with preference order:
 * 1. Stored preference (localStorage)
 * 2. Browser detected language
 * 3. Default to English
 */
export const getUserLanguage = (): string => {
  const storedPreference = getStoredLanguagePreference();
  if (storedPreference) {
    return storedPreference;
  }
  
  const detected = detectUserLanguage();
  storeLanguagePreference(detected);
  return detected;
};

/**
 * Validates if a language code is supported
 * @param language - language code to validate
 */
export const isLanguageSupported = (language: string): boolean => {
  return language in SUPPORTED_LANGUAGES;
};

