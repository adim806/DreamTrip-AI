/**
 * TimeReferenceResolver.js
 *
 * Utility to detect and resolve time references in user queries.
 * Supports both English and Hebrew time expressions.
 * Converts natural language time expressions to standardized date/time formats.
 */

/**
 * Detects time references in a user message and converts to standardized format
 * @param {string} message - The user message to analyze
 * @returns {Object} - Extracted time data with standardized values
 */
export const extractTimeReferences = (message) => {
  if (!message) {
    return null;
  }

  const lowerMessage = message.toLowerCase();
  const result = {
    hasTimeReference: false,
    date: null,
    time: null,
    isCurrentTime: false,
    isToday: false,
    isTomorrow: false,
    isWeekend: false,
    originalReference: null,
    language: "en", // Default language
  };

  // English Time Patterns
  // Match for "right now", "now", "currently", "at the moment"
  const currentTimePatterns = [
    /\bright now\b/,
    /\bnow\b/,
    /\bcurrently\b/,
    /\bat the moment\b/,
    /\bat this moment\b/,
    /\bpresently\b/,
    /\bcurrent\b/,
    /\bcurrent weather\b/,
    /\bright this minute\b/,
  ];

  // Match for "today"
  const todayPatterns = [/\btoday\b/, /\bthis day\b/];

  // Match for "tomorrow"
  const tomorrowPatterns = [/\btomorrow\b/, /\bnext day\b/];

  // Match for "this weekend"
  const weekendPatterns = [
    /\bthis weekend\b/,
    /\bcoming weekend\b/,
    /\bupcoming weekend\b/,
  ];

  // Hebrew Time Patterns
  // Match for "עכשיו", "כרגע"
  const hebrewCurrentTimePatterns = [
    /\bעכשיו\b/,
    /\bכרגע\b/,
    /\bברגע זה\b/,
    /\bבזמן הנוכחי\b/,
    /\bבזמן הזה\b/,
  ];

  // Match for "היום"
  const hebrewTodayPatterns = [/\bהיום\b/, /\bביום הזה\b/];

  // Match for "מחר"
  const hebrewTomorrowPatterns = [/\bמחר\b/, /\bביום הבא\b/];

  // Match for "סוף השבוע"
  const hebrewWeekendPatterns = [
    /\bסוף השבוע\b/,
    /\bסוף השבוע הזה\b/,
    /\bבסוף השבוע\b/,
    /\bבסוף השבוע הקרוב\b/,
  ];

  // Check for Hebrew current time references
  for (const pattern of hebrewCurrentTimePatterns) {
    if (pattern.test(lowerMessage)) {
      result.hasTimeReference = true;
      result.isCurrentTime = true;
      result.date = new Date().toISOString().split("T")[0]; // Today's date in YYYY-MM-DD
      result.originalReference = lowerMessage.match(pattern)[0];
      result.language = "he";
      return result;
    }
  }

  // Check for Hebrew today references
  for (const pattern of hebrewTodayPatterns) {
    if (pattern.test(lowerMessage)) {
      result.hasTimeReference = true;
      result.isToday = true;
      result.date = new Date().toISOString().split("T")[0]; // Today's date in YYYY-MM-DD
      result.originalReference = lowerMessage.match(pattern)[0];
      result.language = "he";
      return result;
    }
  }

  // Check for Hebrew tomorrow references
  for (const pattern of hebrewTomorrowPatterns) {
    if (pattern.test(lowerMessage)) {
      result.hasTimeReference = true;
      result.isTomorrow = true;
      // Calculate tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      result.date = tomorrow.toISOString().split("T")[0]; // Tomorrow's date in YYYY-MM-DD
      result.originalReference = lowerMessage.match(pattern)[0];
      result.language = "he";
      return result;
    }
  }

  // Check for Hebrew weekend references
  for (const pattern of hebrewWeekendPatterns) {
    if (pattern.test(lowerMessage)) {
      result.hasTimeReference = true;
      result.isWeekend = true;
      // Calculate the upcoming weekend (Friday-Saturday in Israel)
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday
      // In Hebrew context, weekend is Friday-Saturday
      const daysUntilFriday = dayOfWeek === 5 ? 0 : (5 + 7 - dayOfWeek) % 7;
      const friday = new Date();
      friday.setDate(today.getDate() + daysUntilFriday);
      result.date = friday.toISOString().split("T")[0]; // Friday's date in YYYY-MM-DD
      result.originalReference = lowerMessage.match(pattern)[0];
      result.language = "he";
      return result;
    }
  }

  // Check for English current time references
  for (const pattern of currentTimePatterns) {
    if (pattern.test(lowerMessage)) {
      result.hasTimeReference = true;
      result.isCurrentTime = true;
      result.date = new Date().toISOString().split("T")[0]; // Today's date in YYYY-MM-DD
      result.originalReference = lowerMessage.match(pattern)[0];
      return result;
    }
  }

  // Check for English today references
  for (const pattern of todayPatterns) {
    if (pattern.test(lowerMessage)) {
      result.hasTimeReference = true;
      result.isToday = true;
      result.date = new Date().toISOString().split("T")[0]; // Today's date in YYYY-MM-DD
      result.originalReference = lowerMessage.match(pattern)[0];
      return result;
    }
  }

  // Check for English tomorrow references
  for (const pattern of tomorrowPatterns) {
    if (pattern.test(lowerMessage)) {
      result.hasTimeReference = true;
      result.isTomorrow = true;
      // Calculate tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      result.date = tomorrow.toISOString().split("T")[0]; // Tomorrow's date in YYYY-MM-DD
      result.originalReference = lowerMessage.match(pattern)[0];
      return result;
    }
  }

  // Check for English weekend references
  for (const pattern of weekendPatterns) {
    if (pattern.test(lowerMessage)) {
      result.hasTimeReference = true;
      result.isWeekend = true;
      // Calculate the upcoming weekend (Saturday-Sunday in most countries)
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
      const daysUntilSaturday = dayOfWeek === 6 ? 0 : 6 - dayOfWeek;
      const saturday = new Date();
      saturday.setDate(today.getDate() + daysUntilSaturday);
      result.date = saturday.toISOString().split("T")[0]; // Saturday's date in YYYY-MM-DD
      result.originalReference = lowerMessage.match(pattern)[0];
      return result;
    }
  }

  return result;
};

/**
 * Enhances data with time information extracted from a message
 * @param {Object} data - The data object to enhance
 * @param {string} message - The user message to extract time from
 * @returns {Object} - Enhanced data with time information
 */
export const enhanceDataWithTimeReferences = (data, message) => {
  if (!data || !message) {
    return data;
  }

  const timeReference = extractTimeReferences(message);
  if (!timeReference || !timeReference.hasTimeReference) {
    return data;
  }

  // Create a copy to avoid modifying the original
  const enhancedData = { ...data };

  // Add date if it was extracted and not already set
  if (timeReference.date && !enhancedData.date) {
    enhancedData.date = timeReference.date;
  }

  // Add time if it was extracted and not already set
  if (timeReference.time && !enhancedData.time) {
    enhancedData.time = timeReference.time;
  }

  // Add flags for different time references if detected
  if (timeReference.isCurrentTime) {
    enhancedData.isCurrentTime = true;
  }

  if (timeReference.isToday) {
    enhancedData.isToday = true;
  }

  if (timeReference.isTomorrow) {
    enhancedData.isTomorrow = true;
  }

  if (timeReference.isWeekend) {
    enhancedData.isWeekend = true;
  }

  // Add language information
  if (timeReference.language) {
    enhancedData.language = timeReference.language;
  }

  return enhancedData;
};
