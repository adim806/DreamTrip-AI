/**
 * Intent processing utilities
 * Handles user intent detection, validation, and processing
 */

/**
 * Sanitizes and validates intent values
 * @param {string} intent - The intent to sanitize
 * @returns {string} - Sanitized intent or "General-Query" if invalid
 */
export const sanitizeIntent = (intent) => {
  if (!intent || typeof intent !== "string") {
    console.warn(
      "[IntentProcessing] Invalid intent provided, defaulting to General-Query"
    );
    return "General-Query";
  }

  const trimmedIntent = intent.trim();

  // List of valid intents
  const validIntents = [
    // Trip building intents
    "Trip-Planning",
    "Trip-Building",
    "Trip-Confirmation",
    "Trip-Modification",

    // Advice intents
    "Weather-Request",
    "Find-Hotel",
    "Find-Attractions",
    "Find-Restaurants",
    "Travel-Restrictions",
    "Safety-Information",
    "Budget-Advice",
    "Travel-Tips",
    "Culture-Tips",
    "Packing-List",
    "Flight-Information",
    "Local-Events",
    "Currency-Conversion",
    "Cost-Estimate",
    "Public-Transport-Info",

    // General intents
    "General-Query",
    "Help-Request",
    "Small-Talk",
    "Acknowledgment",
  ];

  // Check if the intent is in our valid list
  if (validIntents.includes(trimmedIntent)) {
    return trimmedIntent;
  }

  // Try to find a close match for common variations
  const intentMappings = {
    weather: "Weather-Request",
    hotel: "Find-Hotel",
    hotels: "Find-Hotel",
    attraction: "Find-Attractions",
    attractions: "Find-Attractions",
    restaurant: "Find-Restaurants",
    restaurants: "Find-Restaurants",
    dining: "Find-Restaurants",
    travel: "Travel-Tips",
    trip: "Trip-Planning",
    planning: "Trip-Planning",
    budget: "Budget-Advice",
    money: "Budget-Advice",
    cost: "Cost-Estimate",
    currency: "Currency-Conversion",
    flight: "Flight-Information",
    flights: "Flight-Information",
    events: "Local-Events",
    safety: "Safety-Information",
    restrictions: "Travel-Restrictions",
    help: "Help-Request",
    general: "General-Query",
  };

  const lowerIntent = trimmedIntent.toLowerCase();

  // Check for partial matches
  for (const [key, value] of Object.entries(intentMappings)) {
    if (lowerIntent.includes(key)) {
      console.log(`[IntentProcessing] Mapped "${trimmedIntent}" to "${value}"`);
      return value;
    }
  }

  // If no match found, default to General-Query
  console.warn(
    `[IntentProcessing] Unknown intent "${trimmedIntent}", defaulting to General-Query`
  );
  return "General-Query";
};

/**
 * Checks if an intent requires external data
 * @param {string} intent - The intent to check
 * @param {Array} externalDataIntents - List of intents that require external data
 * @returns {boolean} - True if external data is required
 */
export const isExternalDataIntent = (intent, externalDataIntents) => {
  if (!intent || !Array.isArray(externalDataIntents)) {
    return false;
  }

  return externalDataIntents.includes(intent);
};

/**
 * Gets required fields for a specific intent
 * @param {string} intent - The intent to get fields for
 * @param {Object} rules - Optional rules object with field requirements
 * @returns {Array} - Array of required field names
 */
export const getRequiredFieldsForIntent = (intent, rules = null) => {
  if (!intent) return [];

  // Default field requirements by intent
  const defaultRequirements = {
    "Weather-Request": ["city", "country"],
    "Find-Hotel": ["city", "country", "budget_level"],
    "Find-Attractions": ["city"],
    "Find-Restaurants": ["city"],
    "Travel-Restrictions": ["country"],
    "Flight-Information": ["origin", "destination", "date"],
    "Local-Events": ["city"],
    "Currency-Conversion": ["from", "to"],
    "Cost-Estimate": ["city"],
    "Trip-Planning": ["vacation_location", "duration"],
    "Trip-Building": ["vacation_location"],
  };

  // Use rules if provided, otherwise use defaults
  if (rules && rules.intent_requirements && rules.intent_requirements[intent]) {
    return rules.intent_requirements[intent];
  }

  return defaultRequirements[intent] || [];
};

/**
 * Detects user confirmation or approval in messages
 * @param {string} userMessage - The user's message
 * @param {Object} structuredData - Structured data from AI
 * @param {string} currentState - Current conversation state
 * @returns {boolean} - True if user is confirming/approving
 */
export const detectUserConfirmation = (
  userMessage,
  structuredData,
  currentState
) => {
  if (!userMessage || typeof userMessage !== "string") {
    return false;
  }

  const lowerMsg = userMessage.toLowerCase().trim();

  // Explicit confirmation words
  const confirmationWords = [
    "yes",
    "yeah",
    "yep",
    "confirm",
    "confirmed",
    "correct",
    "right",
    "ok",
    "okay",
    "good",
    "great",
    "perfect",
    "excellent",
    "sounds good",
    "looks good",
    "proceed",
    "go ahead",
    "continue",
    "approve",
    "approved",
  ];

  // Check for direct confirmation words
  for (const word of confirmationWords) {
    if (lowerMsg === word || lowerMsg.includes(word)) {
      console.log(
        `[IntentProcessing] Detected confirmation: "${word}" in "${userMessage}"`
      );
      return true;
    }
  }

  // Check for positive sentiment indicators
  if (lowerMsg.length < 20) {
    // Short responses are often confirmations
    const positiveIndicators = [
      "👍",
      "✓",
      "✅",
      "sure",
      "definitely",
      "absolutely",
    ];
    for (const indicator of positiveIndicators) {
      if (lowerMsg.includes(indicator)) {
        console.log(
          `[IntentProcessing] Detected positive indicator: "${indicator}"`
        );
        return true;
      }
    }
  }

  // Context-specific confirmations
  if (currentState === "AWAITING_USER_TRIP_CONFIRMATION") {
    const tripConfirmations = [
      "generate itinerary",
      "create itinerary",
      "build itinerary",
      "make the trip",
      "plan the trip",
      "book it",
      "do it",
    ];

    for (const confirmation of tripConfirmations) {
      if (lowerMsg.includes(confirmation)) {
        console.log(
          `[IntentProcessing] Detected trip confirmation: "${confirmation}"`
        );
        return true;
      }
    }
  }

  return false;
};

/**
 * Analyzes message context to understand user intent
 * @param {string} userMessage - The user's message
 * @param {string} previousIntent - Previous detected intent
 * @param {Object} conversationHistory - Recent conversation context
 * @returns {Object} - Analysis results with intent suggestions
 */
export const analyzeMessageContext = (
  userMessage,
  previousIntent,
  conversationHistory
) => {
  if (!userMessage) {
    return { suggestedIntent: "General-Query", confidence: 0 };
  }

  const lowerMsg = userMessage.toLowerCase().trim();

  // Check for follow-up patterns
  if (
    lowerMsg.startsWith("what about") ||
    lowerMsg.startsWith("how about") ||
    lowerMsg.startsWith("and") ||
    lowerMsg.startsWith("also")
  ) {
    if (previousIntent && previousIntent !== "General-Query") {
      return {
        suggestedIntent: previousIntent,
        confidence: 0.8,
        isFollowUp: true,
        reason: "Follow-up question detected",
      };
    }
  }

  // Check for question words that indicate information seeking
  const questionWords = ["what", "where", "when", "how", "why", "which", "who"];
  const hasQuestionWord = questionWords.some((word) => lowerMsg.includes(word));

  if (hasQuestionWord) {
    // Weather-related questions
    if (
      lowerMsg.includes("weather") ||
      lowerMsg.includes("temperature") ||
      lowerMsg.includes("rain") ||
      lowerMsg.includes("sunny")
    ) {
      return {
        suggestedIntent: "Weather-Request",
        confidence: 0.9,
        reason: "Weather-related question detected",
      };
    }

    // Hotel-related questions
    if (
      lowerMsg.includes("hotel") ||
      lowerMsg.includes("accommodation") ||
      lowerMsg.includes("stay") ||
      lowerMsg.includes("room")
    ) {
      return {
        suggestedIntent: "Find-Hotel",
        confidence: 0.9,
        reason: "Hotel-related question detected",
      };
    }

    // Restaurant-related questions
    if (
      lowerMsg.includes("restaurant") ||
      lowerMsg.includes("food") ||
      lowerMsg.includes("eat") ||
      lowerMsg.includes("dining")
    ) {
      return {
        suggestedIntent: "Find-Restaurants",
        confidence: 0.9,
        reason: "Restaurant-related question detected",
      };
    }

    // Attraction-related questions
    if (
      lowerMsg.includes("attraction") ||
      lowerMsg.includes("visit") ||
      lowerMsg.includes("see") ||
      lowerMsg.includes("tour")
    ) {
      return {
        suggestedIntent: "Find-Attractions",
        confidence: 0.9,
        reason: "Attraction-related question detected",
      };
    }
  }

  // Check for trip planning indicators
  const tripPlanningWords = ["trip", "vacation", "travel", "plan", "visit"];
  const hasTripWord = tripPlanningWords.some((word) => lowerMsg.includes(word));

  if (hasTripWord && lowerMsg.length > 10) {
    return {
      suggestedIntent: "Trip-Planning",
      confidence: 0.7,
      reason: "Trip planning context detected",
    };
  }

  // Default to general query
  return {
    suggestedIntent: "General-Query",
    confidence: 0.5,
    reason: "No specific intent patterns detected",
  };
};

/**
 * Validates that extracted data matches the detected intent
 * @param {string} intent - The detected intent
 * @param {Object} extractedData - Data extracted from user message
 * @returns {Object} - Validation results
 */
export const validateIntentDataConsistency = (intent, extractedData) => {
  if (!intent || !extractedData) {
    return { isValid: false, issues: ["Missing intent or data"] };
  }

  const issues = [];

  // Intent-specific validation
  switch (intent) {
    case "Weather-Request":
      if (!extractedData.city && !extractedData.location) {
        issues.push("Weather request missing location information");
      }
      break;

    case "Find-Hotel":
      if (!extractedData.city && !extractedData.location) {
        issues.push("Hotel search missing location information");
      }
      break;

    case "Trip-Planning":
      if (!extractedData.vacation_location && !extractedData.location) {
        issues.push("Trip planning missing destination");
      }
      break;

    case "Currency-Conversion":
      if (!extractedData.from || !extractedData.to) {
        issues.push("Currency conversion missing from/to currencies");
      }
      break;
  }

  return {
    isValid: issues.length === 0,
    issues: issues,
  };
};

export default {
  sanitizeIntent,
  isExternalDataIntent,
  getRequiredFieldsForIntent,
  detectUserConfirmation,
  analyzeMessageContext,
  validateIntentDataConsistency,
};
