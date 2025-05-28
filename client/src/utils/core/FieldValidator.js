/**
 * FieldValidator.js
 *
 * Centralized validator for required fields in various intents.
 * Used by both AdviceHandler (for external queries) and TripBuilder (for trip planning).
 */

import {
  AdviceFieldSchemas,
  requiresLocationResolution,
} from "../advice/AdviceFieldSchemas";
import {
  resolveLocation,
  parseLocationString,
  getLocationConfidence,
} from "./LocationResolver";
import { enhanceDataWithTimeReferences } from "./TimeReferenceResolver";

// Required fields for trip planning
export const TripRequiredFields = {
  BASIC: ["vacation_location", "duration", "dates"],
  FULL: ["vacation_location", "duration", "dates", "budget"],
};

/**
 * Simple helper to check if a string is likely a country name or code
 * @param {string} str - The string to check
 * @returns {boolean} - Whether the string is likely a country
 */
function isCountry(str) {
  if (!str) return false;

  // List of common countries that might appear in queries
  const commonCountries = [
    "usa",
    "us",
    "united states",
    "america",
    "uk",
    "united kingdom",
    "england",
    "britain",
    "canada",
    "mexico",
    "brazil",
    "france",
    "germany",
    "italy",
    "spain",
    "portugal",
    "israel",
    "japan",
    "china",
    "india",
    "australia",
    "russia",
    "ukraine",
    "egypt",
    "south africa",
  ];

  const normalizedStr = str.trim().toLowerCase();

  // Check if it's in our list of common countries
  if (commonCountries.includes(normalizedStr)) {
    return true;
  }

  // Check if it's a 2-letter country code (simple check)
  if (normalizedStr.length === 2 && /^[a-z]{2}$/i.test(normalizedStr)) {
    return true;
  }

  // We don't have access to dynamic imports, so we'll use a simple heuristic
  // For common countries in the context of our application
  if (normalizedStr === "israel" || normalizedStr === "il") {
    return true;
  }

  return false;
}

/**
 * Validates if all required fields for a given intent are present
 *
 * @param {string} intent - The intent to validate fields for
 * @param {Object} data - The data object to check for required fields
 * @param {Object} [tripDetails=null] - Optional trip details to fill in missing fields
 * @param {Object} [options={}] - Additional options for validation
 * @returns {Object} - Validation result with isComplete flag and missing fields
 */
export const validateFields = (
  intent,
  data,
  tripDetails = null,
  options = {}
) => {
  // Get the required fields for this intent
  const requiredFields = AdviceFieldSchemas[intent] || [];

  if (requiredFields.length === 0) {
    return {
      isComplete: true,
      missingFields: [],
      enhancedData: data,
    };
  }

  // Create a copy of the data that we can enhance
  const enhancedData = { ...data };
  const missingFields = [];

  // Log the incoming data for debugging
  console.log(
    `[FieldValidator] Validating fields for ${intent} with data:`,
    enhancedData
  );
  console.log(
    `[FieldValidator] Required fields for ${intent}:`,
    requiredFields
  );
  console.log(`[FieldValidator] Original data object keys:`, Object.keys(data));
  console.log(
    `[FieldValidator] Enhanced data object keys:`,
    Object.keys(enhancedData)
  );

  // IMPORTANT FIX: If data contains nested structure (e.g., collectedData), extract the actual fields
  if (
    enhancedData.collectedData &&
    typeof enhancedData.collectedData === "object"
  ) {
    console.log(
      `[FieldValidator] Found collectedData structure, extracting fields:`,
      enhancedData.collectedData
    );
    // Copy fields from collectedData to the main level
    Object.assign(enhancedData, enhancedData.collectedData);
  }

  // Also check if data contains data property (nested structure)
  if (enhancedData.data && typeof enhancedData.data === "object") {
    console.log(
      `[FieldValidator] Found nested data structure, extracting fields:`,
      enhancedData.data
    );
    // Copy fields from nested data to the main level
    Object.assign(enhancedData, enhancedData.data);
  }

  // For hotel searches, map budget terms to budget_level
  if (intent === "Find-Hotel") {
    // Map common budget-related terms to standard budget levels
    if (enhancedData.budget && !enhancedData.budget_level) {
      enhancedData.budget_level = enhancedData.budget;
    }

    // Look for luxury, moderate, or budget in query and set budget_level
    if (options.userMessage) {
      const lowerCaseMsg = options.userMessage.toLowerCase();
      if (
        lowerCaseMsg.includes("luxury") ||
        lowerCaseMsg.includes("expensive") ||
        lowerCaseMsg.includes("high-end")
      ) {
        enhancedData.budget_level = "luxury";
        console.log("Detected luxury hotel request from message");
      } else if (
        lowerCaseMsg.includes("moderate") ||
        lowerCaseMsg.includes("mid-range") ||
        lowerCaseMsg.includes("average")
      ) {
        enhancedData.budget_level = "moderate";
        console.log("Detected moderate hotel request from message");
      } else if (
        lowerCaseMsg.includes("low cost") ||
        lowerCaseMsg.includes("cheap") ||
        lowerCaseMsg.includes("inexpensive")
      ) {
        enhancedData.budget_level = "cheap";
        console.log("Detected budget hotel request from message");
      }
    }

    // For Find-Hotel, ensure any destination/vacation_location is mapped to location
    if (!enhancedData.location) {
      if (enhancedData.destination) {
        enhancedData.location = enhancedData.destination;
        console.log("Mapped destination to location:", enhancedData.location);
      } else if (enhancedData.city) {
        enhancedData.location = enhancedData.city;
        console.log("Mapped city to location:", enhancedData.location);
      } else if (enhancedData.place) {
        enhancedData.location = enhancedData.place;
        console.log("Mapped place to location:", enhancedData.location);
      }
    }
  }

  // Try to fill in fields from trip details if available
  if (tripDetails) {
    if (!enhancedData.location && tripDetails.vacation_location) {
      enhancedData.location = tripDetails.vacation_location;
    }
    if (!enhancedData.country && tripDetails.country) {
      enhancedData.country = tripDetails.country;
    }
    if (!enhancedData.date && tripDetails.dates && tripDetails.dates.from) {
      enhancedData.date = tripDetails.dates.from;
    }
  }

  // Special handling for location-based intents
  if (requiresLocationResolution(intent) && enhancedData.location) {
    // Check for locations written as "City Country" without comma
    if (
      typeof enhancedData.location === "string" &&
      !enhancedData.location.includes(",") &&
      !enhancedData.country
    ) {
      // Check for common patterns like "Tel Aviv Israel" or "New York USA"
      const words = enhancedData.location.split(/\s+/);
      if (words.length > 1) {
        // Try to identify if the last word is a country
        const potentialCountry = words[words.length - 1];

        // Check if it's a known country code or full country name
        if (isCountry(potentialCountry)) {
          enhancedData.country = potentialCountry;
          enhancedData.location = words.slice(0, -1).join(" ");
          console.log(
            `Extracted country from location string: Location="${enhancedData.location}", Country="${enhancedData.country}"`
          );
        }

        // Special case for "Tel Aviv Israel"
        else if (
          enhancedData.location.toLowerCase().includes("tel aviv") &&
          enhancedData.location.toLowerCase().includes("israel")
        ) {
          enhancedData.country = "Israel";
          enhancedData.location = "Tel Aviv";
          console.log("Detected Tel Aviv, Israel pattern");
        }
      }
    }

    // First check if the location is actually a combined "city, country" string
    if (
      typeof enhancedData.location === "string" &&
      enhancedData.location.includes(",") &&
      !enhancedData.country
    ) {
      const parsedLocation = parseLocationString(enhancedData.location);
      enhancedData.location = parsedLocation.location;
      enhancedData.country = parsedLocation.country;
    }

    // Then apply our location resolver
    const resolvedLocation = resolveLocation(enhancedData);

    // Update with our enhanced location data
    Object.assign(enhancedData, resolvedLocation);

    // If we have a location conflict, report it as incomplete with a special message
    if (resolvedLocation.locationConflict) {
      return {
        isComplete: false,
        missingFields: ["location_confirmation"],
        enhancedData,
        conflictMessage: resolvedLocation.suggestedLocation.message,
      };
    }

    // If location confidence is low, we may want to request confirmation
    const confidence = getLocationConfidence(resolvedLocation);
    enhancedData.locationConfidence = confidence;
  }

  // If time reference is in options, add date automatically
  if (options.userMessage && intent === "Weather-Request") {
    const timeEnhancedData = enhanceDataWithTimeReferences(
      enhancedData,
      options.userMessage
    );
    Object.assign(enhancedData, timeEnhancedData);

    // Check if the message contains "right now", "currently", etc.
    const lowerCaseMsg = options.userMessage.toLowerCase();
    if (
      lowerCaseMsg.includes("right now") ||
      lowerCaseMsg.includes("currently") ||
      lowerCaseMsg.includes("at the moment") ||
      lowerCaseMsg.includes("current weather")
    ) {
      enhancedData.isCurrentTime = true;
      console.log("Detected current time reference in weather request");
    }
  }

  // Remove "country" from missingFields if we've resolved it through the LocationResolver
  const fieldsToCheck = enhancedData.country
    ? requiredFields.filter((field) => field !== "country")
    : requiredFields;

  // For Weather-Request with current time, remove date requirement
  let adjustedFields = fieldsToCheck;
  if (
    intent === "Weather-Request" &&
    (enhancedData.isCurrentTime ||
      enhancedData.isToday ||
      enhancedData.isTomorrow ||
      enhancedData.isWeekend)
  ) {
    adjustedFields = fieldsToCheck.filter((field) => field !== "date");

    // Set a default date if not already set
    if (!enhancedData.date) {
      // For most cases the date is already set by TimeReferenceResolver
      // This is just a fallback
      enhancedData.date = new Date().toISOString().split("T")[0];
    }
  }

  // Check each required field
  for (const field of adjustedFields) {
    let fieldValue = enhancedData[field];

    console.log(
      `[FieldValidator] Checking field "${field}": value = "${fieldValue}" (type: ${typeof fieldValue})`
    );

    // Exception for Find-Hotel intent: skip date/time validation requirements but NOT country
    if (
      intent === "Find-Hotel" &&
      (field === "time" ||
        field === "date" ||
        field === "dates" ||
        field === "checkIn") &&
      field !== "country" // Never skip country validation
    ) {
      console.log(`[Hotel] Skipping validation for optional field: ${field}`);
      continue;
    }

    // Special handling for mapped fields
    if (
      field === "location" &&
      !fieldValue &&
      (enhancedData.city || enhancedData.destination)
    ) {
      // Use city as location if available
      fieldValue = enhancedData.city || enhancedData.destination;
      enhancedData.location = fieldValue;
      console.log(
        `Using ${enhancedData.city ? "city" : "destination"} as location:`,
        fieldValue
      );
    }

    // Check for empty or missing values
    const isEmpty =
      fieldValue === undefined || fieldValue === null || fieldValue === "";
    console.log(`[FieldValidator] Field "${field}" isEmpty check: ${isEmpty}`);

    if (isEmpty) {
      console.log(`[FieldValidator] Adding "${field}" to missing fields`);
      missingFields.push(field);
    } else {
      console.log(`[FieldValidator] Field "${field}" is valid: ${fieldValue}`);
    }
  }

  console.log(`Validation result for ${intent}:`, {
    isComplete: missingFields.length === 0,
    missingFields,
    enhancedData,
  });

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    enhancedData,
  };
};

/**
 * Validates trip data against the required fields for trip planning
 *
 * @param {Object} tripData - The trip data to validate
 * @param {string} [level='BASIC'] - The validation level (BASIC or FULL)
 * @returns {Object} - Validation result
 */
export const validateTripFields = (tripData, level = "BASIC") => {
  const requiredFields = TripRequiredFields[level] || TripRequiredFields.BASIC;
  const missingFields = [];

  for (const field of requiredFields) {
    if (!tripData[field]) {
      missingFields.push(field);
    }
  }

  // If location is provided, enhance it with our resolver
  if (tripData.vacation_location) {
    const locationData = {
      location: tripData.vacation_location,
      country: tripData.country,
    };

    const resolvedLocation = resolveLocation(locationData);

    // If we resolved a country and the trip data doesn't have one, add it
    if (resolvedLocation.country && !tripData.country) {
      tripData.country = resolvedLocation.country;
    }

    // If we detected a conflict, add it to the results
    if (resolvedLocation.locationConflict) {
      return {
        isComplete: false,
        missingFields: [
          "location_confirmation",
          ...missingFields.filter((f) => f !== "vacation_location"),
        ],
        enhancedData: tripData,
        conflictMessage: resolvedLocation.suggestedLocation.message,
      };
    }
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    enhancedData: tripData,
  };
};
