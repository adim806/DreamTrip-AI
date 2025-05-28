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
  const datesValid =
    tripDetails.dates &&
    ((tripDetails.dates.from && tripDetails.dates.to) ||
      (tripDetails.dates.from && tripDetails.isTomorrow) ||
      (tripDetails.dates.from && tripDetails.duration));

  if (!datesValid) {
    missingFields.push("dates");
    validatedFields.dates = false;
  } else {
    validatedFields.dates = true;
  }

  // בדיקת תקציב - יכול להיות במספר מקומות במבנה הנתונים
  const hasBudget =
    (tripDetails.constraints && tripDetails.constraints.budget) ||
    tripDetails.budget;

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

  // Prioritize the most important missing field for the follow-up
  const priorityField = missingFields[0];

  const questions = {
    vacation_location: "Where would you like to travel to?",
    duration: "How many days are you planning to travel?",
    dates: "When are you planning to travel? I need the start and end dates.",
    budget: "What's your budget for this trip?",
    travel_type:
      "What type of travel are you interested in? (Adventure, Relaxation, Cultural, etc.)",
    hotel_preferences: "Do you have any preferences for accommodation?",
    preferred_activity:
      "What kind of activities do you enjoy during your trips?",
    special_requirements:
      "Do you have any special requirements or preferences for your trip?",
  };

  return (
    questions[priorityField] ||
    "Could you provide more details about your trip?"
  );
};

/**
 * Formats a trip summary for display
 * Enhanced with icons and better visual formatting
 * @param {Object} tripDetails - The trip details to format
 * @returns {string} - Formatted trip summary
 */
export const formatTripSummary = (tripDetails) => {
  if (!tripDetails) {
    return "No trip details available.";
  }

  // Function to format date in a more readable format
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return dateString || "Not specified";
    }
  };

  // Get trip budget from either constraints or direct budget property
  const budget =
    tripDetails.constraints?.budget || tripDetails.budget || "Not specified";

  // Format budget to be more readable
  const formattedBudget =
    typeof budget === "number"
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: "USD",
        }).format(budget)
      : budget;

  // Get travelers information with default to 1
  const travelers = tripDetails.travelers || 1;

  // Create a more compact summary with just the essentials
  const location = tripDetails.vacation_location || "Destination not specified";
  const country = tripDetails.country ? `, ${tripDetails.country}` : "";
  const duration = tripDetails.duration
    ? `${tripDetails.duration} days`
    : "Duration not specified";

  // Format dates if available
  let dateInfo = "Dates not specified";
  if (tripDetails.dates) {
    if (tripDetails.dates.from && tripDetails.dates.to) {
      dateInfo = `${formatDate(tripDetails.dates.from)} to ${formatDate(
        tripDetails.dates.to
      )}`;
    } else if (tripDetails.dates.from) {
      dateInfo = `Starting on ${formatDate(tripDetails.dates.from)}`;
    }
  } else if (tripDetails.isTomorrow) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInfo = `Starting tomorrow (${formatDate(tomorrow)})`;
  }

  // Create a compact display of preferences if available
  let preferencesList = "";
  if (tripDetails.preferences) {
    const prefs = [];
    Object.entries(tripDetails.preferences).forEach(([key, value]) => {
      if (value && key !== "budget") {
        prefs.push(`${key}: ${value}`);
      }
    });

    if (prefs.length > 0) {
      preferencesList = "\n**Preferences:** " + prefs.join(", ");
    }
  }

  // Create compact version of constraints if available (excluding budget)
  let constraintsList = "";
  if (tripDetails.constraints) {
    const constraints = [];
    Object.entries(tripDetails.constraints).forEach(([key, value]) => {
      if (value && key !== "budget") {
        constraints.push(`${key}: ${value}`);
      }
    });

    if (constraints.length > 0) {
      constraintsList = "\n**Constraints:** " + constraints.join(", ");
    }
  }

  // Return a clean, compact trip summary
  return `### 🧳 Trip Summary
**Destination:** ${location}${country}
**Duration:** ${duration}
**Dates:** ${dateInfo}
**Budget:** ${formattedBudget}
**Travelers:** ${travelers}${preferencesList}${constraintsList}

Does this look correct? I'll create your travel itinerary based on these details.`;
};
