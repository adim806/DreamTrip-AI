/**
 * Date and time processing utilities
 * Extracted from useProcessUserInput.js for better modularity
 */

/**
 * Processes relative dates based on trip duration data
 * @param {Object} dates - Dates object with from/to properties
 * @param {Object} tripDurationData - Trip duration information
 * @returns {Object} - Processed dates object
 */
export const processRelativeDates = (dates, tripDurationData) => {
  if (!dates || (!dates.from && !dates.to)) {
    return dates;
  }

  const processedDates = { ...dates };

  // Convert relative date strings to actual dates
  if (dates.from) {
    processedDates.from = convertRelativeDate(dates.from);
  }

  if (dates.to) {
    processedDates.to = convertRelativeDate(dates.to);
  }

  // If we only have 'from' date and have duration data, calculate 'to' date
  if (processedDates.from && !processedDates.to && tripDurationData?.duration) {
    const fromDate = new Date(processedDates.from);
    const toDate = new Date(fromDate);
    toDate.setDate(
      fromDate.getDate() + parseInt(tripDurationData.duration) - 1
    );
    processedDates.to = toDate.toISOString().split("T")[0];

    console.log(
      `[DateProcessing] Calculated end date from duration: ${processedDates.to}`
    );
  }

  return processedDates;
};

/**
 * Converts relative date strings to actual ISO date strings
 * @param {string} dateStr - Date string (could be relative like "tomorrow" or absolute)
 * @returns {string} - ISO date string (YYYY-MM-DD)
 */
export const convertRelativeDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") {
    return dateStr;
  }

  const today = new Date();
  const lowerDateStr = dateStr.toLowerCase().trim();

  switch (lowerDateStr) {
    case "today":
      return today.toISOString().split("T")[0];

    case "tomorrow":
    case "next day": {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split("T")[0];
    }

    case "day after tomorrow": {
      const dayAfter = new Date(today);
      dayAfter.setDate(today.getDate() + 2);
      return dayAfter.toISOString().split("T")[0];
    }

    case "next week": {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return nextWeek.toISOString().split("T")[0];
    }

    case "next month": {
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);
      return nextMonth.toISOString().split("T")[0];
    }

    case "weekend":
    case "this weekend": {
      const weekend = new Date(today);
      const dayOfWeek = weekend.getDay();
      const daysUntilWeekend =
        dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
      weekend.setDate(weekend.getDate() + daysUntilWeekend);
      return weekend.toISOString().split("T")[0];
    }

    case "next weekend": {
      const nextWeekend = new Date(today);
      const daysUntilNextWeekend = 7 + (5 - nextWeekend.getDay());
      nextWeekend.setDate(nextWeekend.getDate() + daysUntilNextWeekend);
      return nextWeekend.toISOString().split("T")[0];
    }

    default: {
      // If it's already in ISO format or unrecognized, return as is
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }

      // Try to parse as a regular date
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split("T")[0];
      }

      // If all else fails, return original string
      console.warn(
        `[DateProcessing] Could not convert relative date: ${dateStr}`
      );
      return dateStr;
    }
  }
};

/**
 * Processes time references in data objects
 * @param {Object} dataObj - Data object that may contain time references
 * @returns {Object} - Processed data object with normalized time references
 */
export const processTimeReferences = (dataObj) => {
  if (!dataObj || typeof dataObj !== "object") {
    return dataObj;
  }

  const processedData = { ...dataObj };

  // Check for "tomorrow" reference in the text
  const checkForTomorrowReference = (text) => {
    if (!text || typeof text !== "string") return false;

    const lowerText = text.toLowerCase();
    const tomorrowIndicators = [
      "tomorrow",
      "next day",
      "the following day",
      "מחר", // Hebrew for tomorrow
    ];

    return tomorrowIndicators.some((indicator) =>
      lowerText.includes(indicator)
    );
  };

  // Process various time-related fields
  if (
    processedData.userMessage &&
    checkForTomorrowReference(processedData.userMessage)
  ) {
    processedData.isTomorrow = true;
    console.log("[DateProcessing] Detected tomorrow reference in user message");
  }

  // Process date fields
  if (processedData.dates) {
    processedData.dates = processRelativeDates(
      processedData.dates,
      processedData
    );
  }

  if (processedData.date && typeof processedData.date === "string") {
    processedData.date = convertRelativeDate(processedData.date);
  }

  // Process time context fields
  if (processedData.time) {
    processedData.normalizedTime = normalizeTimeContext(processedData.time);
  }

  return processedData;
};

/**
 * Normalizes various time context expressions to standard values
 * @param {string} timeContext - Time context string
 * @returns {string} - Normalized time context
 */
export const normalizeTimeContext = (timeContext) => {
  if (!timeContext || typeof timeContext !== "string") {
    return timeContext;
  }

  const lowerContext = timeContext.toLowerCase().trim();

  // Map various expressions to standard values
  const timeMap = {
    now: "current",
    "right now": "current",
    currently: "current",
    "at the moment": "current",
    "this moment": "current",

    today: "today",
    "this day": "today",

    tomorrow: "tomorrow",
    "next day": "tomorrow",
    "the following day": "tomorrow",

    weekend: "weekend",
    "this weekend": "weekend",
    "upcoming weekend": "weekend",

    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night",

    "all day": "all_day",
    "whole day": "all_day",
    "entire day": "all_day",
    "full day": "all_day",
  };

  return timeMap[lowerContext] || timeContext;
};

/**
 * Checks if a date is today
 * @param {string|Date} date - Date to check
 * @returns {boolean} - True if date is today
 */
export const isToday = (date) => {
  const today = new Date();
  const checkDate = typeof date === "string" ? new Date(date) : date;

  return (
    checkDate.getFullYear() === today.getFullYear() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getDate() === today.getDate()
  );
};

/**
 * Checks if a date is tomorrow
 * @param {string|Date} date - Date to check
 * @returns {boolean} - True if date is tomorrow
 */
export const isTomorrow = (date) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const checkDate = typeof date === "string" ? new Date(date) : date;

  return (
    checkDate.getFullYear() === tomorrow.getFullYear() &&
    checkDate.getMonth() === tomorrow.getMonth() &&
    checkDate.getDate() === tomorrow.getDate()
  );
};

/**
 * Checks if a date falls on a weekend
 * @param {string|Date} date - Date to check
 * @returns {boolean} - True if date is on weekend
 */
export const isWeekend = (date) => {
  const checkDate = typeof date === "string" ? new Date(date) : date;
  const dayOfWeek = checkDate.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
};

/**
 * Gets the next occurrence of a specific day of the week
 * @param {number} dayOfWeek - Day of week (0 = Sunday, 1 = Monday, etc.)
 * @param {Date} fromDate - Starting date (default: today)
 * @returns {Date} - Next occurrence of the specified day
 */
export const getNextDayOfWeek = (dayOfWeek, fromDate = new Date()) => {
  const resultDate = new Date(fromDate);
  const currentDay = resultDate.getDay();
  const daysUntilTarget = (dayOfWeek + 7 - currentDay) % 7;

  // If target day is today, get next week's occurrence
  if (daysUntilTarget === 0) {
    resultDate.setDate(resultDate.getDate() + 7);
  } else {
    resultDate.setDate(resultDate.getDate() + daysUntilTarget);
  }

  return resultDate;
};

/**
 * Formats a date for display
 * @param {string|Date} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'relative')
 * @returns {string} - Formatted date string
 */
export const formatDateForDisplay = (date, format = "short") => {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "Invalid date";
  }

  switch (format) {
    case "relative":
      if (isToday(dateObj)) return "Today";
      if (isTomorrow(dateObj)) return "Tomorrow";
    // Fall through to short format for other dates

    case "short":
      return dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    case "long":
      return dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    default:
      return dateObj.toISOString().split("T")[0];
  }
};

/**
 * Calculates the number of days between two dates
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {number} - Number of days between dates
 */
export const daysBetween = (startDate, endDate) => {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

export default {
  processRelativeDates,
  convertRelativeDate,
  processTimeReferences,
  normalizeTimeContext,
  isToday,
  isTomorrow,
  isWeekend,
  getNextDayOfWeek,
  formatDateForDisplay,
  daysBetween,
};
