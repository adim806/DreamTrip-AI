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
 * Checks if the trip details are complete or if any required fields are missing
 * @param {Object} tripDetails - The current trip details
 * @returns {Object} - Status object containing completeness and missing fields
 */
export const checkTripDraftCompleteness = (tripDetails) => {
  if (!tripDetails) {
    return {
      isComplete: false,
      missingFields: ["vacation_location", "duration", "dates"],
      status: "No trip details provided",
    };
  }

  const missingFields = [];

  // Check for required fields
  if (!tripDetails.vacation_location) {
    missingFields.push("vacation_location");
  }

  if (!tripDetails.duration) {
    missingFields.push("duration");
  }

  if (!tripDetails.dates || !tripDetails.dates.from || !tripDetails.dates.to) {
    missingFields.push("dates");
  }

  if (!tripDetails.constraints || !tripDetails.constraints.budget) {
    missingFields.push("budget");
  }

  // Optional but recommended fields
  const recommendedFields = [];
  if (!tripDetails.constraints || !tripDetails.constraints.travel_type) {
    recommendedFields.push("travel_type");
  }

  if (!tripDetails.preferences || !tripDetails.preferences.hotel_preferences) {
    recommendedFields.push("hotel_preferences");
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    recommendedFields,
    status: missingFields.length === 0 ? "Complete" : "Incomplete",
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
 * Formats trip details into a readable summary for the user
 * @param {Object} tripDetails - The complete trip details
 * @returns {String} - Formatted summary string
 */
export const formatTripSummary = (tripDetails) => {
  if (!tripDetails) return "No trip details available.";

  let summary = `**Trip Summary**\n\n`;

  if (tripDetails.vacation_location) {
    summary += `🌍 **Destination**: ${tripDetails.vacation_location}\n`;
  }

  if (tripDetails.duration) {
    summary += `⏱️ **Duration**: ${tripDetails.duration} days\n`;
  }

  if (tripDetails.dates && tripDetails.dates.from && tripDetails.dates.to) {
    summary += `🗓️ **Dates**: ${tripDetails.dates.from} to ${tripDetails.dates.to}\n`;
  }

  if (tripDetails.constraints) {
    if (tripDetails.constraints.budget) {
      summary += `💰 **Budget**: ${tripDetails.constraints.budget}\n`;
    }

    if (tripDetails.constraints.travel_type) {
      summary += `🧳 **Travel Type**: ${tripDetails.constraints.travel_type}\n`;
    }

    if (tripDetails.constraints.preferred_activity) {
      summary += `🏄 **Preferred Activities**: ${tripDetails.constraints.preferred_activity}\n`;
    }

    if (
      tripDetails.constraints.special_requirements &&
      tripDetails.constraints.special_requirements.length > 0
    ) {
      summary += `✅ **Special Requirements**: ${tripDetails.constraints.special_requirements.join(
        ", "
      )}\n`;
    }
  }

  if (tripDetails.preferences) {
    if (tripDetails.preferences.hotel_preferences) {
      summary += `🏨 **Hotel Preferences**: ${tripDetails.preferences.hotel_preferences}\n`;
    }

    if (tripDetails.preferences.dining_preferences) {
      summary += `🍽️ **Dining Preferences**: ${tripDetails.preferences.dining_preferences}\n`;
    }

    if (tripDetails.preferences.transportation_mode) {
      summary += `🚗 **Transportation**: ${tripDetails.preferences.transportation_mode}\n`;
    }
  }

  if (tripDetails.notes) {
    summary += `📝 **Additional Notes**: ${tripDetails.notes}\n`;
  }

  return summary;
};
