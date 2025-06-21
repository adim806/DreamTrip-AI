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

  // Itinerary specific questions - new intent
  "Itinerary-Question": ["day_number", "question_type"],

  // Day-specific advice for an itinerary - new intent
  "Day-Specific-Advice": ["day_number", "advice_type"],
};

/**
 * Maps advice intents to their optional fields
 * These fields enhance the quality of the response but aren't required
 */
export const OptionalFieldSchemas = {
  "Weather-Request": [
    "isCurrentTime",
    "isTomorrow",
    "isToday",
    "isWeekend",
    "timeContext",
  ],
  "Travel-Restrictions": ["citizenship"],
  "Safety-Information": ["activity_type"],
  "Find-Hotel": ["price_range", "rating", "amenities", "budget"],
  "Find-Attractions": ["category", "radius"],
  "Find-Restaurants": ["cuisine", "price", "rating"],
  "Flight-Information": ["return_time", "passengers", "class"],
  "Local-Events": ["category", "start_time", "end_time"],
  "Currency-Conversion": ["time", "amount"],
  "Cost-Estimate": ["category", "currency"],
  "Itinerary-Question": ["itinerary_id", "activity_type"],
  "Day-Specific-Advice": ["itinerary_id", "activity_type", "timeContext"],
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

  // Hebrew equivalents
  כרגע: { isCurrentTime: true },
  עכשיו: { isCurrentTime: true },
  היום: { isToday: true },
  מחר: { isTomorrow: true },
  "סוף שבוע": { isWeekend: true },
  שבת: { isWeekend: true },
  בוקר: { time: "morning" },
  צהריים: { time: "afternoon" },
  ערב: { time: "evening" },
  לילה: { time: "night" },
  "כל היום": { time: "all day" },
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
    return {
      isTomorrow: true,
      timeIndicator: "tomorrow",
      isFollowUp: true,
      timeContext: "tomorrow",
    };
  }

  const followUpTodayMatch = lowerInput.match(
    /\b(and|what about|how about|what if|for|about|but)\s+(today|this day)\b/i
  );
  if (followUpTodayMatch) {
    console.log(
      `[TimeIndicator] Detected follow-up reference to today: "${lowerInput}"`
    );
    return {
      isToday: true,
      timeIndicator: "today",
      isFollowUp: true,
      timeContext: "today",
    };
  }

  // Check for standalone relative time references in very short queries
  if (lowerInput.length < 30) {
    if (/\btomorrow\b/i.test(lowerInput)) {
      console.log(
        `[TimeIndicator] Detected standalone tomorrow in short query: "${lowerInput}"`
      );
      return {
        isTomorrow: true,
        timeIndicator: "tomorrow",
        isFollowUp: true,
        timeContext: "tomorrow",
      };
    }
    if (/\btoday\b/i.test(lowerInput)) {
      console.log(
        `[TimeIndicator] Detected standalone today in short query: "${lowerInput}"`
      );
      return {
        isToday: true,
        timeIndicator: "today",
        isFollowUp: true,
        timeContext: "today",
      };
    }
  }

  // First check for exact matches (for short responses like "morning" or "all day")
  if (TIME_INDICATORS[lowerInput]) {
    console.log(`[TimeIndicator] Exact match found for "${lowerInput}"`);
    const timeInfo = {
      ...TIME_INDICATORS[lowerInput],
      timeIndicator: lowerInput,
    };

    // Add timeContext for consistency with new API
    if (timeInfo.isCurrentTime) timeInfo.timeContext = "now";
    else if (timeInfo.isToday) timeInfo.timeContext = "today";
    else if (timeInfo.isTomorrow) timeInfo.timeContext = "tomorrow";
    else if (timeInfo.isWeekend) timeInfo.timeContext = "weekend";

    return timeInfo;
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
      const timeInfo = { ...TIME_INDICATORS[term], timeIndicator: term };

      // Add timeContext for consistency with new API
      if (timeInfo.isCurrentTime) timeInfo.timeContext = "now";
      else if (timeInfo.isToday) timeInfo.timeContext = "today";
      else if (timeInfo.isTomorrow) timeInfo.timeContext = "tomorrow";
      else if (timeInfo.isWeekend) timeInfo.timeContext = "weekend";

      return timeInfo;
    }
  }

  // Special case handling for "all day" variations
  if (
    lowerInput.includes("all day") ||
    lowerInput.includes("whole day") ||
    lowerInput.includes("full day") ||
    lowerInput.includes("entire day") ||
    lowerInput.includes("כל היום")
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
  "Itinerary-Question",
  "Day-Specific-Advice",
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
    lowerInput.includes("economical") ||
    lowerInput.includes("זול") ||
    lowerInput.includes("חסכוני") ||
    lowerInput.includes("עממי")
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
    lowerInput.includes("top of the line") ||
    lowerInput.includes("יוקרתי") ||
    lowerInput.includes("מפואר") ||
    lowerInput.includes("5 כוכבים")
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
    lowerInput.includes("reasonable") ||
    lowerInput.includes("בינוני") ||
    lowerInput.includes("סטנדרטי")
  ) {
    console.log(
      `[BudgetLevel] Detected moderate/mid-range in: "${lowerInput}"`
    );
    return { budget_level: "moderate" };
  }

  return null;
};

/**
 * זיהוי שאלות הקשורות ליום מסוים ביומן המסע
 * @param {string} input - טקסט הקלט מהמשתמש
 * @returns {Object|null} - אובייקט עם פרטי היום המבוקש או null אם לא זוהה
 */
export const detectDaySpecificQuery = (input) => {
  if (!input || typeof input !== "string") return null;

  const lowerInput = input.toLowerCase().trim();

  // תבניות חיפוש ליום ספציפי - עברית ואנגלית
  const dayPatterns = [
    // English patterns
    { pattern: /\b(first|1st)\s+day\b/i, day: 1 },
    { pattern: /\bday\s+(one|1)\b/i, day: 1 },
    { pattern: /\b(second|2nd)\s+day\b/i, day: 2 },
    { pattern: /\bday\s+(two|2)\b/i, day: 2 },
    { pattern: /\b(third|3rd)\s+day\b/i, day: 3 },
    { pattern: /\bday\s+(three|3)\b/i, day: 3 },
    { pattern: /\b(fourth|4th)\s+day\b/i, day: 4 },
    { pattern: /\bday\s+(four|4)\b/i, day: 4 },
    { pattern: /\b(fifth|5th)\s+day\b/i, day: 5 },
    { pattern: /\bday\s+(five|5)\b/i, day: 5 },
    { pattern: /\blast\s+day\b/i, day: "last" },
    { pattern: /\bfinal\s+day\b/i, day: "last" },

    // Hebrew patterns
    { pattern: /\bהיום\s+הראשון\b/i, day: 1 },
    { pattern: /\bיום\s+ראשון\b/i, day: 1 },
    { pattern: /\bיום\s+1\b/i, day: 1 },
    { pattern: /\bהיום\s+השני\b/i, day: 2 },
    { pattern: /\bיום\s+שני\b/i, day: 2 },
    { pattern: /\bיום\s+2\b/i, day: 2 },
    { pattern: /\bהיום\s+השלישי\b/i, day: 3 },
    { pattern: /\bיום\s+שלישי\b/i, day: 3 },
    { pattern: /\bיום\s+3\b/i, day: 3 },
    { pattern: /\bהיום\s+הרביעי\b/i, day: 4 },
    { pattern: /\bיום\s+רביעי\b/i, day: 4 },
    { pattern: /\bיום\s+4\b/i, day: 4 },
    { pattern: /\bהיום\s+החמישי\b/i, day: 5 },
    { pattern: /\bיום\s+חמישי\b/i, day: 5 },
    { pattern: /\bיום\s+5\b/i, day: 5 },
    { pattern: /\bהיום\s+האחרון\b/i, day: "last" },
    { pattern: /\bיום\s+אחרון\b/i, day: "last" },
  ];

  // חיפוש תבניות בטקסט הקלט
  for (const { pattern, day } of dayPatterns) {
    if (pattern.test(lowerInput)) {
      const match = lowerInput.match(pattern);
      console.log(
        `[DayDetection] Found day reference: ${match[0]} -> day ${day}`
      );

      return {
        isDaySpecific: true,
        dayNumber: day,
        dayType: typeof day === "number" ? "numbered" : day,
        matchedText: match[0],
        matchedPattern: pattern.toString(),
      };
    }
  }

  // חיפוש כללי יותר למספר יום
  const genericDayMatch =
    lowerInput.match(/\bday\s+(\d+)\b/i) ||
    lowerInput.match(/\bיום\s+(\d+)\b/i);
  if (genericDayMatch) {
    const dayNum = parseInt(genericDayMatch[1], 10);
    console.log(`[DayDetection] Found generic day number: ${dayNum}`);

    if (!isNaN(dayNum) && dayNum > 0 && dayNum <= 30) {
      // סביר להניח שאין מסלול של יותר מ-30 יום
      return {
        isDaySpecific: true,
        dayNumber: dayNum,
        dayType: "numbered",
        matchedText: genericDayMatch[0],
        matchedPattern: "generic_day_number",
      };
    }
  }

  // חיפוש לתיאורי יום מיוחדים
  const specialDayMarkers = [
    // אנגלית
    { pattern: /\bstart\s+of\s+the\s+trip\b/i, day: 1 },
    { pattern: /\bbeginning\s+of\s+the\s+trip\b/i, day: 1 },
    { pattern: /\bend\s+of\s+the\s+trip\b/i, day: "last" },
    { pattern: /\bfinal\s+day\s+of\s+the\s+trip\b/i, day: "last" },

    // עברית
    { pattern: /\bתחילת\s+הטיול\b/i, day: 1 },
    { pattern: /\bראשית\s+הטיול\b/i, day: 1 },
    { pattern: /\bסוף\s+הטיול\b/i, day: "last" },
    { pattern: /\bסיום\s+הטיול\b/i, day: "last" },
  ];

  for (const { pattern, day } of specialDayMarkers) {
    if (pattern.test(lowerInput)) {
      const match = lowerInput.match(pattern);
      console.log(
        `[DayDetection] Found special day marker: ${match[0]} -> day ${day}`
      );

      return {
        isDaySpecific: true,
        dayNumber: day,
        dayType: typeof day === "number" ? "special_start" : "special_end",
        matchedText: match[0],
        matchedPattern: pattern.toString(),
      };
    }
  }

  return null;
};

/**
 * זיהוי סוג השאלה הקשורה ליומן המסע
 * @param {string} input - טקסט הקלט מהמשתמש
 * @returns {string|null} - סוג השאלה או null אם לא זוהתה
 */
export const detectItineraryQuestionType = (input) => {
  if (!input || typeof input !== "string") return null;

  const lowerInput = input.toLowerCase().trim();

  // מילות מפתח לסוגי שאלות שונים
  const weatherKeywords = [
    "weather",
    "temperature",
    "rain",
    "sunny",
    "forecast",
    "מזג אוויר",
    "טמפרטורה",
    "גשם",
    "שמש",
    "תחזית",
  ];

  const hotelKeywords = [
    "hotel",
    "accommodation",
    "stay",
    "place to sleep",
    "lodging",
    "מלון",
    "לינה",
    "אכסניה",
    "מקום לישון",
  ];

  const attractionKeywords = [
    "attraction",
    "sight",
    "museum",
    "landmark",
    "visit",
    "see",
    "אטרקציה",
    "מוזיאון",
    "אתר",
    "לבקר",
    "לראות",
  ];

  const restaurantKeywords = [
    "restaurant",
    "eat",
    "food",
    "dining",
    "cuisine",
    "מסעדה",
    "אוכל",
    "ארוחה",
    "מטבח",
  ];

  const transportKeywords = [
    "transport",
    "bus",
    "train",
    "taxi",
    "subway",
    "metro",
    "תחבורה",
    "אוטובוס",
    "רכבת",
    "מונית",
    "מטרו",
  ];

  // בדיקת קטגוריה לפי מילות מפתח
  if (weatherKeywords.some((keyword) => lowerInput.includes(keyword))) {
    return "Weather-Request";
  }

  if (hotelKeywords.some((keyword) => lowerInput.includes(keyword))) {
    return "Find-Hotel";
  }

  if (attractionKeywords.some((keyword) => lowerInput.includes(keyword))) {
    return "Find-Attractions";
  }

  if (restaurantKeywords.some((keyword) => lowerInput.includes(keyword))) {
    return "Find-Restaurants";
  }

  if (transportKeywords.some((keyword) => lowerInput.includes(keyword))) {
    return "Public-Transport-Info";
  }

  // אם לא זוהתה קטגוריה ספציפית, מחזירים שאלה כללית על היומן
  return "Itinerary-Question";
};
