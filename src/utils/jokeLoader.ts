
/**
 * Utility to load and process marketing jokes for the loading screen
 */
import { marketingJokesData } from '@/data/marketing_jokes';

// Simple function to load jokes from the marketingJokesData object
export const loadMarketingJokes = () => {
  try {
    // Debug logs to help track joke loading
    console.log("Loading jokes from marketing_jokes.ts");
    
    if (!marketingJokesData || !marketingJokesData.jokes) {
      console.warn("Marketing jokes data is missing or malformed");
      return getFallbackJokes();
    }
    
    console.log(`Successfully loaded ${marketingJokesData.jokes.length} jokes`);
    return marketingJokesData.jokes;
  } catch (error) {
    console.error("Error loading marketing jokes:", error);
    return getFallbackJokes();
  }
};

// Fallback jokes in case the data file fails to load
const getFallbackJokes = () => [
  "I told my boss I was good with marketing numbers and figures. She gave me a calculator.",
  "What did the marketer say to the developer? I like your style!",
  "Why don't scientists trust marketing data? Because it's all relative.",
  "How many marketers does it take to change a lightbulb? Just one, but they'll A/B test 20 different bulbs first.",
  "What do you call a marketer who becomes a detective? An investi-gator."
];

// Export the jokes array for direct usage
export const marketingJokes = loadMarketingJokes();

// Function to get a random joke
export const getRandomJoke = () => {
  const jokes = marketingJokes;
  if (!jokes || jokes.length === 0) {
    return "We couldn't find any jokes. Maybe they're still generating the perfect punchline!";
  }
  
  const randomIndex = Math.floor(Math.random() * jokes.length);
  return jokes[randomIndex];
};

// Debug confirmation
console.log(`Loaded ${marketingJokes.length} marketing jokes successfully`);
