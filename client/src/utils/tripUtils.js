/**
 * Utility functions for managing trip details and its state
 */

/**
 * Deep merges a new trip data object with the existing trip details
 * @param {Object} existingTripDetails - The current trip details object
 * @param {Object} newTripData - New trip data to merge
 * @returns {Object} - The merged trip details object
 */
export const updateTripDraft = (existingTripDetails, newTripData) => {
  if (!newTripData) return existingTripDetails;

  // Start with existing trip details or empty object
  const baseTripDetails = existingTripDetails || {};

  // Create a deep copy to avoid mutating the original
  const updatedTrip = JSON.parse(JSON.stringify(baseTripDetails));

  // Deep merge the objects
  const deepMerge = (target, source) => {
    for (const key in source) {
      // Handle arrays specifically - replace arrays entirely rather than merging them
      if (Array.isArray(source[key])) {
        target[key] = [...source[key]];
      }
      // If it's an object and not null, recursively merge
      else if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        if (!target[key] || typeof target[key] !== "object") {
          target[key] = {};
        }
        deepMerge(target[key], source[key]);
      }
      // Otherwise just assign the value (primitives)
      else if (source[key] !== undefined) {
        target[key] = source[key];
      }
    }
  };

  deepMerge(updatedTrip, newTripData);
  return updatedTrip;
};

/**
 * מיזוג מרכזי של לוגיקת בדיקת שלמות הטיול
 * פונקציה זו משמשת כמנוע מרכזי לכל בדיקות השלמות במערכת
 * @param {Object} tripDetails - פרטי הטיול לבדיקה
 * @param {Object} options - אפשרויות התאמה אישית לבדיקה
 * @returns {Object} - תוצאת הבדיקה עם כל המידע הרלוונטי
 */
export const validateTripCompletion = (tripDetails, options = {}) => {
  if (!tripDetails) {
    return {
      success: false,
      status: "Incomplete",
      isComplete: false,
      missingFields: ["vacation_location", "duration", "dates", "budget"],
      recommendedFields: ["travelers", "preferences", "constraints"],
      validatedFields: {},
      allRequiredFields: ["vacation_location", "duration", "dates", "budget"],
    };
  }

  // הגדרת השדות הנדרשים ומומלצים
  const requiredFields = ["vacation_location", "duration", "dates", "budget"];
  const recommendedFields = ["travelers", "preferences", "constraints"];

  // איתור שדות חסרים
  const missingFields = [];
  const validatedFields = {};

  // בדיקת יעד החופשה
  if (!tripDetails.vacation_location) {
    missingFields.push("vacation_location");
    validatedFields.vacation_location = false;
  } else {
    validatedFields.vacation_location = true;
  }

  // בדיקת משך זמן החופשה
  if (tripDetails.duration === undefined || tripDetails.duration === null) {
    missingFields.push("duration");
    validatedFields.duration = false;
  } else {
    validatedFields.duration = true;
  }

  // בדיקת תאריכי החופשה - הבדיקה המורכבת ביותר
  let datesValid = false;

  // Check if dates is a string with 'to' format
  if (
    typeof tripDetails.dates === "string" &&
    tripDetails.dates.includes(" to ")
  ) {
    datesValid = true;
    console.log("[Validation] Found valid date string:", tripDetails.dates);
  }
  // Check if dates is an object with from/to properties
  else if (tripDetails.dates && typeof tripDetails.dates === "object") {
    datesValid =
      (tripDetails.dates.from && tripDetails.dates.to) ||
      (tripDetails.dates.from && tripDetails.isTomorrow) ||
      (tripDetails.dates.from && tripDetails.duration);
    console.log("[Validation] Checking dates object validity:", datesValid);
  }
  // Special case when dates came from a form or message
  else if (
    tripDetails.dates === "from form" ||
    (typeof tripDetails.dates === "string" &&
      tripDetails.dates.match(/\d{4}-\d{2}-\d{2}/))
  ) {
    datesValid = true;
    console.log("[Validation] Found valid date marker:", tripDetails.dates);
  }

  if (!datesValid) {
    missingFields.push("dates");
    validatedFields.dates = false;
    console.log("[Validation] Dates not valid:", tripDetails.dates);
  } else {
    validatedFields.dates = true;
  }

  // בדיקת תקציב - יכול להיות במספר מקומות במבנה הנתונים
  const hasBudget =
    (tripDetails.constraints && tripDetails.constraints.budget) ||
    tripDetails.budget ||
    tripDetails.budget_level;

  if (!hasBudget) {
    missingFields.push("budget");
    validatedFields.budget = false;
  } else {
    validatedFields.budget = true;
  }

  // בדיקת שדות מומלצים אבל לא חובה
  const missingRecommendedFields = recommendedFields.filter((field) => {
    if (field === "constraints") {
      // שדה מיוחד שיכול להיות בכמה מבנים שונים
      const hasConstraints =
        tripDetails.constraints &&
        Object.keys(tripDetails.constraints).length > 0 &&
        (Object.keys(tripDetails.constraints).some((key) => key !== "budget") ||
          !hasBudget);
      validatedFields.constraints = hasConstraints;
      return !hasConstraints;
    }

    const fieldExists =
      tripDetails[field] !== undefined && tripDetails[field] !== null;
    validatedFields[field] = fieldExists;
    return !fieldExists;
  });

  // יצירת תוצאת הבדיקה המקיפה
  const isComplete = missingFields.length === 0;
  const result = {
    success: isComplete,
    status: isComplete ? "Complete" : "Incomplete",
    isComplete: isComplete,
    missingFields: missingFields,
    recommendedFields: missingRecommendedFields,
    validatedFields: validatedFields,
    allRequiredFields: requiredFields,
    shouldDelayFetch: !isComplete,
  };

  return result;
};

/**
 * בדיקת שלמות של טיוטת טיול - מסתמכת על הפונקציה המאוחדת
 * נשמרת לאחור לצורך תאימות עם הקוד הקיים
 * @param {Object} tripDetails - פרטי הטיול לבדיקה
 * @returns {Object} - תוצאת הבדיקה במבנה התואם לפונקציה המקורית
 */
export const checkTripDraftCompleteness = (tripDetails) => {
  const validationResult = validateTripCompletion(tripDetails);

  // החזרת התוצאה במבנה התואם לפונקציה המקורית
  return {
    isComplete: validationResult.isComplete,
    missingFields: validationResult.missingFields,
    recommendedFields: validationResult.recommendedFields,
  };
};

/**
 * בדיקת שדות נדרשים בטיול - מסתמכת על הפונקציה המאוחדת
 * נשמרת לאחור לצורך תאימות עם הקוד הקיים
 * @param {Object} tripDetails - פרטי הטיול לבדיקה
 * @returns {Object} - תוצאת הבדיקה במבנה התואם לפונקציה המקורית
 */
export const validateRequiredTripFields = (tripDetails) => {
  const validationResult = validateTripCompletion(tripDetails);

  // החזרת התוצאה במבנה התואם לפונקציה המקורית
  return {
    success: validationResult.success,
    missingFields: validationResult.missingFields,
  };
};

/**
 * Generates targeted follow-up questions based on missing fields
 * @param {Array} missingFields - List of missing fields
 * @returns {String} - A follow-up question to ask the user
 */
export const generateFollowUpQuestion = (missingFields) => {
  if (!missingFields || missingFields.length === 0) {
    return null;
  }

  // Return empty string instead of static question to avoid duplicates
  // The AI response already contains appropriate follow-up questions
  return "";
};

/**
 * Create a compact, formatted summary of trip details for display
 * @param {Object} tripDetails - The trip details object
 * @returns {string} - A formatted string representation of the trip summary
 */
export const formatTripSummary = (tripDetails = {}) => {
  if (!tripDetails) return "Trip details not available.";

  // Helper function to format dates in a nice way
  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Get the budget from constraints or directly from tripDetails
  let formattedBudget = "Not specified";
  if (tripDetails.constraints && tripDetails.constraints.budget) {
    formattedBudget = tripDetails.constraints.budget;
  } else if (tripDetails.budget) {
    formattedBudget = tripDetails.budget;
  } else if (tripDetails.budget_level) {
    formattedBudget = tripDetails.budget_level;
  }

  // Format travelers info
  const travelers = tripDetails.travelers
    ? `${tripDetails.travelers}`
    : `1 person`;

  // Format the destination without duplicate country references
  let destination =
    tripDetails.vacation_location || "Destination not specified";

  // If vacation_location already has country information, don't add it again
  const hasCountryInDestination = destination
    .toLowerCase()
    .includes((tripDetails.country || "").toLowerCase());

  // Only add country if it exists and isn't already part of the destination
  const country =
    tripDetails.country && !hasCountryInDestination
      ? `, ${tripDetails.country}`
      : "";

  const location = `${destination}${country}`;

  // Format duration
  const duration = tripDetails.duration
    ? `${tripDetails.duration} ${parseInt(tripDetails.duration, 10) === 1 ? 'day' : 'days'}`
    : "Duration not specified";

  // Format dates if available
  let dateInfo = "Dates not specified";
  if (tripDetails.dates) {
    // Handle string format with "to" separator
    if (typeof tripDetails.dates === 'string') {
      if (tripDetails.dates.includes(" to ")) {
        // Standard date range format
        const [startDate, endDate] = tripDetails.dates.split(" to ");
        dateInfo = `${formatDate(startDate)} to ${formatDate(endDate)}`;
      } else {
        // Single date format (for 1-day trips)
        dateInfo = formatDate(tripDetails.dates);
        
        // If we have a duration greater than 1, calculate and show the end date
        if (tripDetails.duration && parseInt(tripDetails.duration, 10) > 1) {
          const startDate = new Date(tripDetails.dates);
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + parseInt(tripDetails.duration, 10) - 1);
          dateInfo = `${formatDate(tripDetails.dates)} to ${formatDate(endDate)}`;
        }
      }
    } 
    // Handle object format with from/to properties
    else if (typeof tripDetails.dates === 'object') {
      if (tripDetails.dates.from && tripDetails.dates.to) {
        dateInfo = `${formatDate(tripDetails.dates.from)} to ${formatDate(tripDetails.dates.to)}`;
      } else if (tripDetails.dates.from) {
        // For single-day trips or when only start date is known
        if (tripDetails.duration === 1) {
          dateInfo = formatDate(tripDetails.dates.from);
        } else {
          // For multi-day trips with only start date, calculate end date
          const startDate = new Date(tripDetails.dates.from);
          if (tripDetails.duration && parseInt(tripDetails.duration, 10) > 1) {
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + parseInt(tripDetails.duration, 10) - 1);
            dateInfo = `${formatDate(startDate)} to ${formatDate(endDate)}`;
          } else {
            dateInfo = `Starting on ${formatDate(tripDetails.dates.from)}`;
          }
        }
      }
    }
  } else if (tripDetails.isTomorrow) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInfo = `Starting tomorrow (${formatDate(tomorrow)})`;
  }

  // Create a compact version of preferences if important
  let preferencesList = "";
  if (tripDetails.preferences) {
    const importantPrefs = [];
    // Only include the most relevant preferences
    if (tripDetails.preferences.accommodation_type) {
      importantPrefs.push(
        `Stay: ${tripDetails.preferences.accommodation_type}`
      );
    }
    if (tripDetails.preferences.transportation_mode) {
      importantPrefs.push(
        `Transport: ${tripDetails.preferences.transportation_mode}`
      );
    }

    if (importantPrefs.length > 0) {
      preferencesList = `\n${importantPrefs.join(" | ")}`;
    }
  }

  // Return a clean, compact trip summary without the large heading
  return `🧳 Trip to ${location}\n• ${duration}, ${dateInfo}\n• Budget: ${formattedBudget}\n• Travelers: ${travelers}${preferencesList}`;
};
