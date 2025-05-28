/**
 * AdviceFieldSchemas.js
 *
 * Defines the required fields for each advice intent.
 * Used by the field validator to determine which fields need validation.
 */

/**
 * Maps advice intents to their required fields
 */
export const AdviceFieldSchemas = {
  // Weather queries require city, country for accuracy, and date
  "Weather-Request": ["city", "country", "date"],

  // Travel restrictions require country and optionally citizenship
  "Travel-Restrictions": ["country"],

  // Safety information needs a city
  "Safety-Information": ["city"],

  // Budget advice requires city at minimum
  "Budget-Advice": ["city"],

  // General travel tips require city
  "Travel-Tips": ["city"],

  // Cultural tips require city
  "Culture-Tips": ["city"],

  // Packing list needs city and optionally season
  "Packing-List": ["city"],

  // Accommodation queries need city, country, and budget level
  "Find-Hotel": ["city", "country", "budget_level"],

  // Attractions need city
  "Find-Attractions": ["city"],

  // Restaurants need city
  "Find-Restaurants": ["city"],

  // Flight information needs origin, destination and date
  "Flight-Information": ["origin", "destination", "date"],

  // Events need city and optionally dates/category
  "Local-Events": ["city"],

  // Currency conversion needs from, to, and optionally amount
  "Currency-Conversion": ["from", "to", "amount"],

  // Cost estimates require city and optionally category/budget level
  "Cost-Estimate": ["city"],

  // Public transport information needs city
  "Public-Transport-Info": ["city"],
};

/**
 * Maps advice intents to their optional fields
 * These fields enhance the quality of the response but aren't required
 */
export const OptionalFieldSchemas = {
  "Weather-Request": ["isCurrentTime", "isTomorrow", "isToday", "isWeekend"],
  "Travel-Restrictions": ["citizenship"],
  "Safety-Information": ["activity_type"],
  "Find-Hotel": ["price_range", "rating", "amenities", "budget"],
  "Find-Attractions": ["category", "radius"],
  "Find-Restaurants": ["cuisine", "price", "rating"],
  "Flight-Information": ["return_time", "passengers", "class"],
  "Local-Events": ["category", "start_time", "end_time"],
  "Currency-Conversion": ["time", "amount"],
  "Cost-Estimate": ["category", "currency"],
};

/**
 * List of all time indicator words that should be recognized
 * when processing time-related intents
 */
export const TIME_INDICATORS = {
  now: { isCurrentTime: true },
  current: { isCurrentTime: true },
  currently: { isCurrentTime: true },
  "right now": { isCurrentTime: true },
  "at the moment": { isCurrentTime: true },
  today: { isToday: true },
  tomorrow: { isTomorrow: true },
  "next day": { isTomorrow: true },
  weekend: { isWeekend: true },
  "this weekend": { isWeekend: true },
  "upcoming weekend": { isWeekend: true },

  // Time of day indicators
  morning: { time: "morning" },
  afternoon: { time: "afternoon" },
  evening: { time: "evening" },
  night: { time: "night" },

  // Special time responses
  "all day": { time: "all day" },
  "all day long": { time: "all day" },
  "whole day": { time: "all day" },
  "entire day": { time: "all day" },
  "full day": { time: "all day" },
};

/**
 * List of all intents that require external data fetching
 */
export const EXTERNAL_DATA_INTENTS = [
  "Weather-Request",
  "Travel-Restrictions",
  "Find-Hotel",
  "Find-Attractions",
  "Find-Restaurants",
  "Flight-Information",
  "Local-Events",
  "Currency-Conversion",
  "Cost-Estimate",
  "Safety-Information",
  "Public-Transport-Info",
];

/**
 * Indicates whether a city-based intent requires country-level city validation
 */
export const INTENTS_REQUIRING_LOCATION_RESOLUTION = [
  "Weather-Request",
  "Travel-Restrictions",
  "Safety-Information",
  "Find-Hotel",
];

/**
 * Determines if an intent requires city resolution
 * @param {string} intent - The intent to check
 * @returns {boolean} - Whether the intent needs enhanced city processing
 */
export const requiresLocationResolution = (intent) => {
  return INTENTS_REQUIRING_LOCATION_RESOLUTION.includes(intent);
};

/**
 * Checks if an intent is related to advice (not trip building)
 * @param {string} intent - The intent to check
 * @returns {boolean} - True if this is an advice intent
 */
export const isAdviceIntent = (intent) => {
  return !!AdviceFieldSchemas[intent];
};

/**
 * Checks if an intent requires external data
 * @param {string} intent - The intent to check
 * @returns {boolean} - True if this intent needs external data
 */
export const requiresExternalData = (intent) => {
  return EXTERNAL_DATA_INTENTS.includes(intent);
};

/**
 * Determines if the advice handler should process this intent
 * @param {string} intent - The intent to check
 * @returns {boolean} - True if advice handler should process this intent
 */
export const shouldHandleIntent = (intent) => {
  if (!intent) return false;
  return isAdviceIntent(intent);
};

/**
 * Process a user input for time-related keywords
 * @param {string} input - The user input text
 * @returns {Object} - Time indicators found in the text
 */
export const processTimeIndicators = (input) => {
  if (!input || typeof input !== "string") return null;

  const lowerInput = input.toLowerCase().trim();

  // Enhanced detection for follow-up queries with relative time references
  // First check for relative references with context words like "and", "what about", etc.
  const followUpTomorrowMatch = lowerInput.match(
    /\b(and|what about|how about|what if|for|about|but)\s+(tomorrow|next day)\b/i
  );
  if (followUpTomorrowMatch) {
    console.log(
      `[TimeIndicator] Detected follow-up reference to tomorrow: "${lowerInput}"`
    );
    return { isTomorrow: true, timeIndicator: "tomorrow", isFollowUp: true };
  }

  const followUpTodayMatch = lowerInput.match(
    /\b(and|what about|how about|what if|for|about|but)\s+(today|this day)\b/i
  );
  if (followUpTodayMatch) {
    console.log(
      `[TimeIndicator] Detected follow-up reference to today: "${lowerInput}"`
    );
    return { isToday: true, timeIndicator: "today", isFollowUp: true };
  }

  // Check for standalone relative time references in very short queries
  if (lowerInput.length < 30) {
    if (/\btomorrow\b/i.test(lowerInput)) {
      console.log(
        `[TimeIndicator] Detected standalone tomorrow in short query: "${lowerInput}"`
      );
      return { isTomorrow: true, timeIndicator: "tomorrow", isFollowUp: true };
    }
    if (/\btoday\b/i.test(lowerInput)) {
      console.log(
        `[TimeIndicator] Detected standalone today in short query: "${lowerInput}"`
      );
      return { isToday: true, timeIndicator: "today", isFollowUp: true };
    }
  }

  // First check for exact matches (for short responses like "morning" or "all day")
  if (TIME_INDICATORS[lowerInput]) {
    console.log(`[TimeIndicator] Exact match found for "${lowerInput}"`);
    return { ...TIME_INDICATORS[lowerInput], timeIndicator: lowerInput };
  }

  // If no exact match, check for time phrases contained in the input
  // Sort terms by length (descending) to match longer phrases first
  const sortedTerms = Object.keys(TIME_INDICATORS).sort(
    (a, b) => b.length - a.length
  );

  for (const term of sortedTerms) {
    if (lowerInput.includes(term)) {
      console.log(
        `[TimeIndicator] Phrase match found: "${term}" in "${lowerInput}"`
      );
      return { ...TIME_INDICATORS[term], timeIndicator: term };
    }
  }

  // Special case handling for "all day" variations
  if (
    lowerInput.includes("all day") ||
    lowerInput.includes("whole day") ||
    lowerInput.includes("full day") ||
    lowerInput.includes("entire day")
  ) {
    console.log(
      `[TimeIndicator] Special case match for "all day" in "${lowerInput}"`
    );
    return { time: "all day", timeIndicator: "all day" };
  }

  return null;
};

/**
 * Complete list of all supported advice intents
 */
export const ADVICE_INTENTS = [
  ...EXTERNAL_DATA_INTENTS,
  "Budget-Advice",
  "Travel-Tips",
  "Culture-Tips",
  "Packing-List",
  "Eco-Friendly",
  "Public-Transport-Info",
  "General-Query",
  "Help-Request",
  "Small-Talk",
];

/**
 * Detect budget level from user input for hotel searches
 * @param {string} input - The user message to analyze
 * @returns {object|null} - Budget level information if detected, or null
 */
export const detectBudgetLevel = (input) => {
  if (!input || typeof input !== "string") return null;

  const lowerInput = input.toLowerCase().trim();

  // Check for budget keywords
  if (
    lowerInput.includes("cheap") ||
    lowerInput.includes("budget") ||
    lowerInput.includes("inexpensive") ||
    lowerInput.includes("affordable") ||
    lowerInput.includes("low cost") ||
    lowerInput.includes("cheapest") ||
    lowerInput.includes("economical")
  ) {
    console.log(`[BudgetLevel] Detected cheap/budget in: "${lowerInput}"`);
    return { budget_level: "cheap" };
  }

  if (
    lowerInput.includes("luxury") ||
    lowerInput.includes("expensive") ||
    lowerInput.includes("high-end") ||
    lowerInput.includes("fancy") ||
    lowerInput.includes("5-star") ||
    lowerInput.includes("premium") ||
    lowerInput.includes("high class") ||
    lowerInput.includes("top of the line")
  ) {
    console.log(`[BudgetLevel] Detected luxury/expensive in: "${lowerInput}"`);
    return { budget_level: "luxury" };
  }

  if (
    lowerInput.includes("moderate") ||
    lowerInput.includes("mid-range") ||
    lowerInput.includes("average") ||
    lowerInput.includes("standard") ||
    lowerInput.includes("not too expensive") ||
    lowerInput.includes("middle") ||
    lowerInput.includes("reasonable")
  ) {
    console.log(
      `[BudgetLevel] Detected moderate/mid-range in: "${lowerInput}"`
    );
    return { budget_level: "moderate" };
  }

  return null;
};
