/**
 * AdviceHandler.js
 *
 * Enhanced service for managing advice flows based on intent.
 * Coordinates field validation, data fetching, and response formatting.
 */

import {
  fetchExternalData,
  fetchWeatherData,
  fetchHotelRecommendations,
  fetchAttractions,
  fetchRestaurants,
} from "../externalDataService";
import { validateFields } from "../core/FieldValidator";
import { formatAdviceResponse } from "./AdviceFormatter";
import {
  resolveLocation,
  parseLocationString,
  formatLocation,
} from "../core/LocationResolver";
import {
  isAdviceIntent,
  requiresExternalData,
  requiresLocationResolution,
  ADVICE_INTENTS,
  EXTERNAL_DATA_INTENTS,
} from "./AdviceFieldSchemas";
import { buildPromptWithExternalData } from "../externalDataService";
import { extractStructuredDataFromResponse } from "../aiPromptUtils";
import ragProcessor from "../GeminiRAGProcessor";
import { processExternalData } from "./ExternalDataService";

// ייבוא מפתח ה-API מתוך הגדרות הסביבה
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_PUBLIC_KEY;

/**
 * Follow-up question templates for collecting missing information
 * These are only used as fallbacks if the model doesn't provide its own question
 */
const FOLLOW_UP_QUESTIONS = {
  location: "Which location would you like to know about?",
  country: "Which country are you referring to?",
  date: "For which date do you need this information?",
  origin: "What is your departure location?",
  destination: "What is your destination?",
  from: "Which currency do you want to convert from?",
  to: "Which currency do you want to convert to?",
  amount: "What amount do you want to convert?",
  location_confirmation:
    "I noticed a potential location conflict. {conflictMessage} Is that correct?",
  citizenship:
    "What is your citizenship? This helps provide more accurate entry requirements.",
  budget:
    "Do you have a specific budget level in mind (budget, moderate, luxury)?",
  category: "Which category are you specifically interested in?",
  budget_level:
    "What budget level are you looking for (cheap, moderate, luxury)?",
  city: "Which city are you interested in?",
};

/**
 * Intent-specific follow-up questions that override the general questions
 */
const INTENT_SPECIFIC_QUESTIONS = {
  "Weather-Request": {
    location: "Which location would you like to know the weather for?",
    date: "For which date would you like the weather forecast?",
    country:
      "Could you specify which country this location is in? This ensures accurate weather data.",
  },
  "Travel-Restrictions": {
    country: "Which country's travel restrictions are you interested in?",
  },
  "Find-Hotel": {
    location:
      "In which city or area are you looking for hotel recommendations?",
    budget_level:
      "What's your budget preference for hotels? (cheap, moderate, or luxury)",
  },
  "Find-Attractions": {
    location: "Which destination's attractions are you interested in?",
  },
};

/**
 * Main handler for processing advice intents
 *
 * @param {Object} params - Processing parameters
 * @param {string} params.userMessage - Original user message
 * @param {string} params.intent - Detected intent
 * @param {Object} params.data - Structured data from AI
 * @param {Object} params.tripContext - Current trip details if available
 * @param {Object} params.userProfile - User profile data if available
 * @param {boolean} params.enableRAG - Whether to use RAG (Retrieval Augmented Generation)
 * @param {function} params.modelFn - Optional function to call AI model (for RAG)
 * @param {Object} params.conversationState - Current conversation state
 * @param {Object} params.daySpecificInfo - Information about a specific day mentioned in the query
 * @returns {Promise<Object>} - Processing result
 */
export const processAdviceIntent = async ({
  userMessage,
  intent,
  data,
  tripContext,
  userProfile,
  enableRAG = false,
  modelFn = null,
  conversationState = null,
  daySpecificInfo = null,
}) => {
  const result = {
    processed: false,
    response: null,
    nextAction: null,
    nextState: null,
    needsFollowUp: false,
    externalData: null,
  };

  try {
    console.log("Processing advice intent:", intent, data);
    console.log("Trip context:", tripContext);
    console.log(
      "User profile:",
      userProfile
        ? Object.keys(userProfile).reduce((acc, key) => {
            acc[key] = userProfile[key];
            return acc;
          }, {})
        : null
    );

    // Determine if this intent needs external data
    const needsExternalData = requiresIntentExternalData(intent);
    console.log(`Intent ${intent} needs external data:`, needsExternalData);

    // If the intent requires external data, set up the data fetch
    if (needsExternalData) {
      // Data extraction for external service queries
      const enhancedData = { ...data };

      // Extract filtering criteria from user message
      const filterCriteria = extractFilterCriteriaFromMessage(
        userMessage,
        intent
      );
      console.log("Extracted filter criteria from message:", filterCriteria);

      // Add extracted filter criteria to the enhanced data
      Object.assign(enhancedData, filterCriteria);

      // Original data is in a nested structure, extract it
      if (data.data) {
        Object.assign(enhancedData, data.data);
      }

      if (data.collectedData) {
        Object.assign(enhancedData, data.collectedData);
      }

      // If it's a hotel or restaurant search, ensure budget level is captured correctly
      if (intent === "Find-Hotel" || intent === "Find-Restaurants") {
        // Look for budget level in the data
        const budgetLevel =
          data.budget_level ||
          enhancedData.budget_level ||
          data.price_level ||
          enhancedData.price_level;

        if (budgetLevel) {
          enhancedData.budget_level = budgetLevel;
        }
      }

      // If we have trip context, use it to enhance the data
      if (tripContext) {
        // Add vacation location if we have it
        if (
          tripContext.vacation_location &&
          !enhancedData.location &&
          !enhancedData.city
        ) {
          enhancedData.vacation_location = tripContext.vacation_location;
        }

        // Add dates if available
        if (tripContext.dates && !enhancedData.dates) {
          // Structure could be either string or object
          enhancedData.dates = tripContext.dates;
        }
      }

      // If dates are in string format, parse them
      if (tripContext?.dates && typeof tripContext.dates === "string") {
        // Parse date range strings like "2025-06-15 to 2025-06-22"
        const dateRangeMatch = tripContext.dates.match(
          /(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/
        );

        if (dateRangeMatch) {
          console.log(`Found date range in trip context: ${tripContext.dates}`);
          enhancedData.dates = {
            from: dateRangeMatch[1],
            to: dateRangeMatch[2],
          };
          console.log(
            `Added date range to request: from=${enhancedData.dates.from}, to=${enhancedData.dates.to}`
          );

          // For weather requests without a specific date, use the first day by default
          if (intent === "Weather-Request" && !enhancedData.date) {
            console.log(
              `Weather request detected; using first day of trip: ${dateRangeMatch[1]}`
            );
            enhancedData.date = dateRangeMatch[1];
            enhancedData.time = dateRangeMatch[1]; // For weather API

            // Extract year for explicit use
            const yearMatch = dateRangeMatch[1].match(/^(\d{4})/);
            if (yearMatch) {
              enhancedData.year = parseInt(yearMatch[1], 10);
              console.log(
                `Extracted year from trip start date: ${enhancedData.year}`
              );
            }
          }
        }
      }
      // If dates are already in object format, use them directly
      else if (tripContext?.dates && typeof tripContext.dates === "object") {
        enhancedData.dates = tripContext.dates;
        console.log(
          `Using trip dates from context: from=${enhancedData.dates.from}, to=${enhancedData.dates.to}`
        );

        // For weather requests without a specific date, use the first day by default
        if (
          intent === "Weather-Request" &&
          !enhancedData.date &&
          enhancedData.dates.from
        ) {
          console.log(
            `Weather request detected; using first day of trip: ${enhancedData.dates.from}`
          );
          enhancedData.date = enhancedData.dates.from;
          enhancedData.time = enhancedData.dates.from; // For weather API

          // Extract year for explicit use
          const yearMatch = enhancedData.dates.from.match(/^(\d{4})/);
          if (yearMatch) {
            enhancedData.year = parseInt(yearMatch[1], 10);
            console.log(
              `Extracted year from trip start date: ${enhancedData.year}`
            );
          }
        }
      }

      // Add day-specific information to the data if available
      if (daySpecificInfo) {
        console.log("Enhancing request with day-specific information");
        enhancedData.daySpecificInfo = daySpecificInfo;

        // Copy key properties directly to top level for better compatibility
        if (daySpecificInfo.city && !enhancedData.city) {
          enhancedData.city = daySpecificInfo.city;
        }

        if (daySpecificInfo.country && !enhancedData.country) {
          enhancedData.country = daySpecificInfo.country;
        }

        // Add date information for time-sensitive requests
        if (daySpecificInfo.date) {
          if (intent === "Weather-Request") {
            enhancedData.date = daySpecificInfo.date;
            enhancedData.time = daySpecificInfo.date;
            console.log(
              `Using specific day date for weather: ${daySpecificInfo.date}`
            );
          }

          if (!enhancedData.date) {
            enhancedData.date = daySpecificInfo.date;
          }
        }

        // Add time context for better API responses
        if (daySpecificInfo.timeContext) {
          enhancedData.timeContext = daySpecificInfo.timeContext;
        }

        // Add the year explicitly if available
        if (daySpecificInfo.year) {
          enhancedData.year = daySpecificInfo.year;
          console.log(
            `Adding explicit year=${daySpecificInfo.year} from day info`
          );
        }

        console.log("Enhanced data with day-specific info:", enhancedData);
      }

      // Check if we have vacation_location in trip context but not in data
      if (
        tripContext?.vacation_location &&
        !enhancedData.city &&
        !enhancedData.location
      ) {
        console.log("Using vacation_location from trip context");

        // Add the full vacation location string for parsing
        enhancedData.vacation_location = tripContext.vacation_location;

        // Also attempt to parse it into city and country
        const locationParts = tripContext.vacation_location
          .split(",")
          .map((part) => part.trim());

        if (locationParts.length >= 2) {
          enhancedData.city = locationParts[0];
          enhancedData.country = locationParts[1];
          console.log(
            `Parsed vacation location: city=${enhancedData.city}, country=${enhancedData.country}`
          );
        } else {
          enhancedData.location = tripContext.vacation_location;
          console.log(
            `Using full string as location: ${enhancedData.location}`
          );
        }
      }

      // For weather requests, make sure we have all the necessary date information
      if (intent === "Weather-Request") {
        // If we have trip dates but no specific date requested, use the first day
        if (
          !enhancedData.date &&
          enhancedData.dates &&
          enhancedData.dates.from
        ) {
          enhancedData.date = enhancedData.dates.from;
          console.log(
            `Using first day of trip for weather request: ${enhancedData.date}`
          );
        }

        // Try to extract year from dates if available and not already specified
        if (enhancedData.date && !enhancedData.year) {
          try {
            const dateObj = new Date(enhancedData.date);
            if (!isNaN(dateObj.getTime())) {
              enhancedData.year = dateObj.getFullYear();
              console.log(`Extracted year from date: ${enhancedData.year}`);
            }
          } catch (e) {
            console.warn("Could not extract year from date:", e);
          }
        }

        console.log("Final weather request parameters:", {
          city: enhancedData.city || enhancedData.location || "Not specified",
          country: enhancedData.country || "Not specified",
          date: enhancedData.date || "Not specified",
          year: enhancedData.year || "Not specified",
        });
      }

      // Fetch external data based on intent and enhanced data
      let externalData = null;

      try {
        // Direct call to external data service
        externalData = await fetchExternalData(
          intent,
          enhancedData,
          userProfile,
          daySpecificInfo
        );

        console.log(`External data received for ${intent}:`, externalData);
        result.externalData = externalData;

        // If external data fetch was successful
        if (externalData && externalData.success !== false) {
          console.log("External data fetch successful");
          result.processed = true;
          result.status = "COMPLETE"; // Add explicit status
          result.nextState = "ITINERARY_ADVICE_MODE";
          result.nextAction = "DISPLAY_EXTERNAL_DATA_RESPONSE";

          // Format the response based on the intent and data
          const formattedResponse = formatAdviceResponse(intent, externalData);
          result.response = formattedResponse;

          // Process data for map visualization
          try {
            console.log(
              `Processing external data for map visualization: intent=${intent}`
            );
            await processExternalData(intent, externalData);
          } catch (error) {
            console.error("Error processing external data for map:", error);
          }

          // Store the formatted response in the global space for use by other components
          if (typeof window !== "undefined") {
            // For all external data responses, set global variables
            if (intent === "Weather-Request") {
              window.__weatherResponseData = formattedResponse;
              window.__forceWeatherResponse = true;
            } else if (intent === "Find-Restaurants") {
              window.__restaurantsResponseData = formattedResponse;
              window.__forceRestaurantsResponse = true;
            } else if (intent === "Find-Hotel") {
              window.__hotelsResponseData = formattedResponse;
              window.__forceHotelsResponse = true;
            } else if (intent === "Find-Attractions") {
              window.__attractionsResponseData = formattedResponse;
              window.__forceAttractionsResponse = true;
            } else {
              window.__externalDataResponse = formattedResponse;
              window.__forceExternalDataDisplay = true;
            }

            // For all intents with external data, ensure we have the complete flag set
            if (data) {
              data.status = "COMPLETE"; // Override any status from the AI
              data.externalData = externalData; // Store the actual data
              data.formattedResponse = formattedResponse; // Store the formatted response
              data.response = formattedResponse; // CRITICAL: Override the model's response

              // Clear any missing fields that might prevent response display
              if (data.missingFields) {
                console.log(`Clearing missing fields for ${intent}`);
                data.missingFields = [];
              }

              // Set intent-specific data
              if (intent === "Weather-Request") {
                data.weatherData = externalData;
                data.formattedWeatherResponse = formattedResponse;
              } else if (intent === "Find-Restaurants") {
                data.restaurantsData = externalData;
                data.formattedRestaurantsResponse = formattedResponse;
              } else if (intent === "Find-Hotel") {
                data.hotelsData = externalData;
                data.formattedHotelsResponse = formattedResponse;
              } else if (intent === "Find-Attractions") {
                data.attractionsData = externalData;
                data.formattedAttractionsResponse = formattedResponse;
              }

              // Direct integration with the hook state for immediate display
              if (
                window.__processingHookState &&
                window.__processingHookState.addSystemMessage
              ) {
                console.log(
                  `Direct injection of ${intent} data into chat from AdviceHandler`
                );
                window.__processingHookState.addSystemMessage(
                  formattedResponse
                );

                // Mark as already displayed to avoid duplicates
                if (intent === "Weather-Request") {
                  window.__weatherResponseDisplayed = true;
                } else if (intent === "Find-Restaurants") {
                  window.__restaurantsResponseDisplayed = true;
                } else if (intent === "Find-Hotel") {
                  window.__hotelsResponseDisplayed = true;
                } else if (intent === "Find-Attractions") {
                  window.__attractionsResponseDisplayed = true;
                } else {
                  window.__externalDataDisplayed = true;
                }
              }
            }
          }

          console.log("Formatted response:", formattedResponse);
        } else {
          // External data fetch failed
          console.warn(
            "External data fetch failed:",
            externalData?.error || "Unknown error"
          );

          result.processed = true;
          result.status = "FAILED"; // Add explicit failed status
          result.nextState = "ITINERARY_ADVICE_MODE";
          result.nextAction = "DISPLAY_ADVICE_RESPONSE";

          if (externalData && externalData.beyondForecastLimit) {
            // Handle the special case for dates beyond weather forecast limit
            result.response = `I can only provide accurate weather forecasts for up to 5 days in the future. The date you requested is ${
              externalData.daysInFuture || "more than 5"
            } days from now. For more distant forecasts, I recommend checking a weather service website closer to your travel date.`;
          } else {
            result.response = `לא הצלחתי למצוא את המידע המבוקש${
              daySpecificInfo ? ` עבור היום הספציפי` : ""
            }. ${
              externalData?.error ||
              "יתכן שהמידע אינו זמין או שנדרשים פרטים נוספים."
            }`;
          }
        }
      } catch (fetchError) {
        console.error("Error fetching external data:", fetchError);

        result.processed = true;
        result.nextState = "ITINERARY_ADVICE_MODE";
        result.response = `התרחשה שגיאה בעת הבאת המידע: ${
          fetchError.message || "שגיאה לא ידועה"
        }`;
      }
    } else {
      // For intents that don't require external data
      console.log(`Intent ${intent} does not require external data`);

      result.processed = true;
      result.nextState = "ITINERARY_ADVICE_MODE";

      // Use model function if provided for general advice
      if (modelFn && typeof modelFn === "function") {
        try {
          const modelResponse = await modelFn(userMessage, {
            intent,
            data,
            tripContext,
            daySpecificInfo,
          });

          result.response = modelResponse;
        } catch (modelError) {
          console.error("Error getting model response:", modelError);
          result.response =
            "אירעה שגיאה בעת עיבוד השאלה שלך. אנא נסה שוב מאוחר יותר.";
        }
      } else {
        result.response =
          "אני לא יכול לענות על שאלה זו כרגע. אנא שאל שאלה אחרת.";
      }
    }

    // Set appropriate next state and action based on processing results
    if (result.processed) {
      // Add explicit status if not already set
      if (!result.status) {
        if (result.externalData && result.externalData.success !== false) {
          result.status = "COMPLETE";
        } else {
          result.status = "FAILED";
        }
      }

      if (result.externalData && result.externalData.success !== false) {
        // If we successfully processed external data
        result.nextAction = "DISPLAY_EXTERNAL_DATA_RESPONSE";
      } else if (!result.nextAction) {
        // If we failed to get external data
        result.nextAction = "DISPLAY_ADVICE_RESPONSE";
      }

      // Always return to ITINERARY_ADVICE_MODE when dealing with itinerary questions
      if (
        daySpecificInfo ||
        conversationState === "ITINERARY_ADVICE_MODE" ||
        conversationState === "DISPLAYING_ITINERARY" ||
        (typeof window !== "undefined" && window.__weatherQueryComplete) // Check our global flag
      ) {
        result.nextState = "ITINERARY_ADVICE_MODE";
        // For complete weather queries, force the appropriate next action
        if (
          typeof window !== "undefined" &&
          window.__weatherQueryComplete &&
          intent === "Weather-Request"
        ) {
          result.nextAction = "DISPLAY_EXTERNAL_DATA_RESPONSE";
          result.status = "COMPLETE";
          result.bypassMissingFields = true;
        }
      }
    } else {
      // Fall back to advisory mode if we couldn't process the intent
      result.status = "INCOMPLETE";
      result.nextState = "ADVISORY_MODE";
      result.nextAction = "REQUEST_CLARIFICATION";
    }

    return result;
  } catch (error) {
    console.error("Error processing advice intent:", error);

    return {
      processed: false,
      response:
        "אירעה שגיאה בעת עיבוד השאלה שלך. אנא נסה שוב מאוחר יותר או נסח את השאלה בצורה אחרת.",
      externalData: null,
      nextAction: "REQUEST_CLARIFICATION",
      nextState: conversationState || "ADVISORY_MODE",
    };
  }
};

/**
 * חילוץ עיר ומדינה ממחרוזת מיקום
 * @param {string} locationString - מחרוזת מיקום (למשל "פריז, צרפת")
 * @returns {Object|null} - אובייקט עם city ו-country או null
 */
function extractLocationParts(locationString) {
  if (!locationString) return { city: null, country: null };

  const parts = locationString.split(",").map((part) => part.trim());

  if (parts.length >= 2) {
    return {
      city: parts[0],
      country: parts[1],
    };
  }

  return {
    location: locationString,
    city: null,
    country: null,
  };
}

/**
 * Gets all supported advice intents
 *
 * @returns {Array} - List of supported advice intents
 */
export const getSupportedAdviceIntents = () => {
  return [...ADVICE_INTENTS];
};

/**
 * Checks if this is an advice intent that needs processing
 *
 * @param {string} intent - The intent to check
 * @returns {boolean} - Whether this intent should be handled by the advice handler
 */
export const shouldHandleIntent = (intent) => {
  return ADVICE_INTENTS.includes(intent);
};

/**
 * Gets a list of intents that require external data
 *
 * @returns {Array} - List of intents requiring external data
 */
export const getExternalDataIntents = () => {
  return [...EXTERNAL_DATA_INTENTS];
};

/**
 * Validates if the data has all required fields for a given intent
 *
 * @param {string} intent - The intent to validate
 * @param {Object} data - The data extracted from the message
 * @param {Object} tripContext - Current trip context
 * @returns {Object} - Validation result
 */
export const validateIntentData = (intent, data, tripContext) => {
  // First do some preprocessing to ensure dates from trip context are recognized
  if (intent === "Weather-Request") {
    const enhancedData = { ...data };

    // Check for first day references or day numbers
    const isDaySpecificQuery =
      data.dayNumber ||
      (data.timeContext &&
        (data.timeContext.includes("first day") ||
          data.timeContext === "day 1" ||
          data.timeContext.toLowerCase().includes("first") ||
          data.timeContext.toLowerCase().includes("day one")));

    // If it's asking about a specific day and we have trip dates, use them
    if (isDaySpecificQuery && tripContext && tripContext.dates) {
      console.log(
        "Detected day-specific weather query with available trip dates"
      );

      // Get start date from trip context
      let startDate = null;
      if (typeof tripContext.dates === "string") {
        // Handle date range format
        const dateRangeMatch = tripContext.dates.match(
          /(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/
        );
        if (dateRangeMatch) {
          enhancedData.date = dateRangeMatch[1];
          console.log(`Using first day from trip dates: ${enhancedData.date}`);
        }
      } else if (
        typeof tripContext.dates === "object" &&
        tripContext.dates.from
      ) {
        enhancedData.date = tripContext.dates.from;
        console.log(
          `Using first day from trip dates object: ${enhancedData.date}`
        );
      }
    }

    // Return validation with enhanced data
    return validateFields(intent, enhancedData, tripContext);
  }

  // For other intents, just use standard validation
  return validateFields(intent, data, tripContext);
};

/**
 * Checks whether an intent requires external data
 *
 * @param {string} intent - The intent to check
 * @returns {boolean} - Whether external data is needed
 */
export const requiresIntentExternalData = (intent) => {
  return EXTERNAL_DATA_INTENTS.includes(intent);
};

/**
 * Checks if essential weather data is available in tripContext for a specific day
 *
 * @param {Object} data - The data object from AI response
 * @param {Object} tripContext - The trip context object
 * @returns {boolean} - True if we can infer all required data for weather
 */
export const canInferWeatherData = (data, tripContext) => {
  // No inference possible without trip context
  if (!tripContext) return false;

  console.log("Checking if weather data can be inferred from trip context");

  // Check if this appears to be a day-specific query
  const isDaySpecific = !!(
    data?.timeContext &&
    (data.timeContext.includes("day") ||
      data.timeContext.includes("first") ||
      data.timeContext.includes("second") ||
      data.timeContext.includes("last"))
  );

  // We need location information
  const hasLocation = !!(
    tripContext.vacation_location ||
    tripContext.city ||
    tripContext.location
  );

  // We need date information for the trip
  const hasDateInfo = !!(
    tripContext.dates &&
    (typeof tripContext.dates === "string" || tripContext.dates.from)
  );

  const canInfer = isDaySpecific && hasLocation && hasDateInfo;

  console.log(
    `Can infer weather data: ${canInfer} (isDaySpecific: ${isDaySpecific}, hasLocation: ${hasLocation}, hasDateInfo: ${hasDateInfo})`
  );

  return canInfer;
};

/**
 * Extracts filtering criteria from user message based on intent
 * @param {string} message - User message to analyze
 * @param {string} intent - The service intent
 * @returns {object} - Extracted filter criteria
 */
function extractFilterCriteriaFromMessage(message, intent) {
  if (!message) return {};

  const criteria = {};
  const lowerMessage = message.toLowerCase();

  // Common filter patterns across all services

  // Budget/Price level extraction
  const budgetPatterns = [
    {
      regex: /\b(cheap|budget|affordable|low[ -]cost|inexpensive)\b/i,
      value: "cheap",
    },
    {
      regex: /\b(moderate|mid[ -]range|reasonable|standard)\b/i,
      value: "moderate",
    },
    {
      regex: /\b(expensive|high[ -]end|luxury|premium|upscale)\b/i,
      value: "luxury",
    },
  ];

  for (const pattern of budgetPatterns) {
    if (pattern.regex.test(lowerMessage)) {
      criteria.budget_level = pattern.value;
      break;
    }
  }

  // Rating extraction
  const ratingMatch = lowerMessage.match(
    /\b(\d+)[ -]star\b|\brated (\d+)[ .]|\brating (\d+)[ .]/i
  );
  if (ratingMatch) {
    const rating = parseInt(ratingMatch[1] || ratingMatch[2] || ratingMatch[3]);
    if (rating >= 1 && rating <= 5) {
      criteria.rating = rating;
    }
  }

  // Intent specific patterns
  switch (intent) {
    case "Find-Hotel":
      // Extract amenities
      const hotelAmenities = [];
      const amenityPatterns = [
        /\bwith\s+(a\s+)?pool\b/i,
        /\bwi-?fi\b/i,
        /\bfree\s+breakfast\b/i,
        /\bparking\b/i,
        /\bgym\b/i,
        /\bspa\b/i,
        /\bair\s*conditioning\b/i,
        /\brestaurant\b/i,
      ];

      amenityPatterns.forEach((pattern, index) => {
        if (pattern.test(lowerMessage)) {
          const amenities = [
            "pool",
            "wifi",
            "breakfast",
            "parking",
            "gym",
            "spa",
            "air conditioning",
            "restaurant",
          ];
          hotelAmenities.push(amenities[index]);
        }
      });

      if (hotelAmenities.length > 0) {
        criteria.amenities = hotelAmenities;
      }

      // Extract hotel type
      if (/\boutique\b/i.test(lowerMessage)) {
        criteria.hotel_type = "boutique";
      } else if (/\bresort\b/i.test(lowerMessage)) {
        criteria.hotel_type = "resort";
      } else if (/\bhoste?l\b/i.test(lowerMessage)) {
        criteria.hotel_type = "hostel";
      } else if (/\bapartment\b/i.test(lowerMessage)) {
        criteria.hotel_type = "apartment";
      } else if (/\bbed\s*&*\s*breakfast\b/i.test(lowerMessage)) {
        criteria.hotel_type = "bed and breakfast";
      }
      break;

    case "Find-Attractions":
      // Extract attraction category
      if (/\bmuseum\b/i.test(lowerMessage)) {
        criteria.category = "museum";
      } else if (/\bhistoric\b|\bhistory\b|\bmonument\b/i.test(lowerMessage)) {
        criteria.category = "historic";
      } else if (/\bpark\b|\bnature\b|\boutdoor\b/i.test(lowerMessage)) {
        criteria.category = "outdoor";
      } else if (/\btheme\s*park\b/i.test(lowerMessage)) {
        criteria.category = "theme park";
      } else if (/\bbeach\b/i.test(lowerMessage)) {
        criteria.category = "beach";
      } else if (/\bshopping\b|\bmall\b|\bmarket\b/i.test(lowerMessage)) {
        criteria.category = "shopping";
      } else if (
        /\bentertainment\b|\btheater\b|\bcinema\b/i.test(lowerMessage)
      ) {
        criteria.category = "entertainment";
      } else if (/\bfamily\b|\bkids\b|\bchildren\b/i.test(lowerMessage)) {
        criteria.activity_type = "family";
      }

      // Extract duration
      const durationMatch = lowerMessage.match(/\b(\d+)[ -]hour\b/i);
      if (durationMatch) {
        criteria.duration = parseInt(durationMatch[1]);
      }
      break;

    case "Find-Restaurants":
      // Extract cuisine type
      const cuisineTypes = [
        { regex: /\bitalian\b/i, value: "italian" },
        { regex: /\bjapanese\b/i, value: "japanese" },
        { regex: /\bchinese\b/i, value: "chinese" },
        { regex: /\bthai\b/i, value: "thai" },
        { regex: /\bmexican\b/i, value: "mexican" },
        { regex: /\bindian\b/i, value: "indian" },
        { regex: /\bfrench\b/i, value: "french" },
        { regex: /\bgreek\b/i, value: "greek" },
        { regex: /\bspanish\b/i, value: "spanish" },
        { regex: /\bmediterranean\b/i, value: "mediterranean" },
        { regex: /\bsushi\b/i, value: "japanese" }, // Implying Japanese cuisine
        { regex: /\bpizza\b/i, value: "italian" }, // Implying Italian cuisine
        { regex: /\bseafood\b/i, value: "seafood" },
        { regex: /\bsteakhouse\b|\bsteak\b/i, value: "steakhouse" },
        { regex: /\bvegan\b/i, value: "vegan" },
        { regex: /\bvegetarian\b/i, value: "vegetarian" },
      ];

      for (const cuisine of cuisineTypes) {
        if (cuisine.regex.test(lowerMessage)) {
          criteria.cuisine = cuisine.value;
          break;
        }
      }

      // Extract dietary restrictions
      if (/\bvegan\b/i.test(lowerMessage)) {
        criteria.dietary_restrictions = "vegan";
      } else if (/\bvegetarian\b/i.test(lowerMessage)) {
        criteria.dietary_restrictions = "vegetarian";
      } else if (/\bgluten[ -]free\b/i.test(lowerMessage)) {
        criteria.dietary_restrictions = "gluten-free";
      } else if (/\bhalal\b/i.test(lowerMessage)) {
        criteria.dietary_restrictions = "halal";
      } else if (/\bkosher\b/i.test(lowerMessage)) {
        criteria.dietary_restrictions = "kosher";
      }

      // Extract meal type
      if (/\bbreakfast\b/i.test(lowerMessage)) {
        criteria.meal_type = "breakfast";
      } else if (/\blunch\b/i.test(lowerMessage)) {
        criteria.meal_type = "lunch";
      } else if (/\bdinner\b/i.test(lowerMessage)) {
        criteria.meal_type = "dinner";
      } else if (/\bbrunch\b/i.test(lowerMessage)) {
        criteria.meal_type = "brunch";
      }
      break;
  }

  return criteria;
}

/**
 * Provides a gradual animation of text content for displaying in the UI
 * This can be used to create a "typing" effect for itineraries or other long texts
 * @param {string} fullText - The complete text to be animated
 * @param {number} speed - Characters per frame (higher = faster)
 * @param {function} onUpdate - Callback function that receives the current text state
 * @param {function} onComplete - Callback function called when animation completes
 * @returns {Object} - Control object with start, pause, resume and stop methods
 */
export const createTextAnimator = (
  fullText,
  speed = 10,
  onUpdate = () => {},
  onComplete = () => {}
) => {
  let currentIndex = 0;
  let isRunning = false;
  let animationFrameId = null;

  // Function to process the next chunk of text
  const processNextChunk = () => {
    if (!isRunning) return;

    // If we haven't reached the end, continue animating
    if (currentIndex < fullText.length) {
      // Calculate how many characters to add in this frame
      const charsToAdd = Math.min(speed, fullText.length - currentIndex);
      currentIndex += charsToAdd;

      // Get the current portion of text
      const currentText = fullText.substring(0, currentIndex);

      // Call the update callback with the current text
      onUpdate(currentText, (currentIndex / fullText.length) * 100);

      // Schedule the next frame
      animationFrameId = requestAnimationFrame(processNextChunk);
    } else {
      // We've reached the end, call the complete callback
      isRunning = false;
      onComplete();
    }
  };

  // Control methods
  return {
    start() {
      if (!isRunning) {
        isRunning = true;
        currentIndex = 0;
        processNextChunk();
      }
      return this;
    },

    pause() {
      isRunning = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      return this;
    },

    resume() {
      if (!isRunning && currentIndex < fullText.length) {
        isRunning = true;
        processNextChunk();
      }
      return this;
    },

    stop() {
      isRunning = false;
      currentIndex = 0;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      return this;
    },

    // Set the current position (0-100%)
    setProgress(percent) {
      const newIndex = Math.floor((percent / 100) * fullText.length);
      currentIndex = Math.max(0, Math.min(newIndex, fullText.length));
      onUpdate(fullText.substring(0, currentIndex), percent);
      return this;
    },

    // Get the current progress percentage
    getProgress() {
      return (currentIndex / fullText.length) * 100;
    },

    // Jump to a specific section marker (like a day or heading)
    jumpToSection(sectionPattern) {
      const regex = new RegExp(sectionPattern, "g");
      const matches = [...fullText.matchAll(regex)];

      if (matches.length > 0) {
        // Find the next section after the current position
        const nextSection = matches.find((match) => match.index > currentIndex);

        if (nextSection) {
          // Jump to the beginning of this section
          currentIndex = nextSection.index;
          onUpdate(
            fullText.substring(0, currentIndex),
            (currentIndex / fullText.length) * 100
          );
        } else {
          // If no next section, jump to the end
          currentIndex = fullText.length;
          onUpdate(fullText, 100);
          onComplete();
        }
      }

      return this;
    },

    // Get the current state
    getState() {
      return {
        isRunning,
        progress: (currentIndex / fullText.length) * 100,
        currentText: fullText.substring(0, currentIndex),
        isComplete: currentIndex >= fullText.length,
      };
    },
  };
};

/**
 * Creates a segmented text animator that breaks text into logical segments (like days or sections)
 * and animates segment by segment with pauses between them
 * @param {string} fullText - The complete text to be animated
 * @param {Object} options - Configuration options
 * @returns {Object} - Control object with various methods
 */
export const createSegmentedTextAnimator = (fullText, options = {}) => {
  const {
    segmentPatterns = [/### Day \d+:/, /## /, /# /], // Default patterns to identify segments
    charSpeed = 10, // Characters per frame
    segmentDelay = 500, // Pause between segments (ms)
    onUpdate = () => {}, // Called on each update
    onSegmentComplete = () => {}, // Called when a segment completes
    onComplete = () => {}, // Called when all animation completes
  } = options;

  // Find all segment boundaries
  const findSegmentBoundaries = () => {
    const boundaries = [];

    segmentPatterns.forEach((pattern) => {
      const regex = new RegExp(pattern, "g");
      const matches = [...fullText.matchAll(regex)];

      matches.forEach((match) => {
        boundaries.push(match.index);
      });
    });

    // Sort boundaries by position
    boundaries.sort((a, b) => a - b);

    // Add start and end positions
    if (boundaries[0] !== 0) {
      boundaries.unshift(0);
    }
    boundaries.push(fullText.length);

    return boundaries;
  };

  const boundaries = findSegmentBoundaries();
  let currentSegment = 0;
  let currentIndex = 0;
  let isRunning = false;
  let animationFrameId = null;
  let segmentTimerId = null;

  // Animation step function
  const animate = () => {
    if (!isRunning) return;

    const segmentStart = boundaries[currentSegment];
    const segmentEnd = boundaries[currentSegment + 1];

    if (currentIndex < segmentEnd) {
      // Calculate how many characters to add in this frame
      const charsToAdd = Math.min(charSpeed, segmentEnd - currentIndex);
      currentIndex += charsToAdd;

      // Get the current portion of text
      const currentText = fullText.substring(0, currentIndex);

      // Call the update callback with the current text and progress
      onUpdate(currentText, (currentIndex / fullText.length) * 100);

      // Schedule the next frame
      animationFrameId = requestAnimationFrame(animate);
    } else {
      // This segment is complete
      const currentText = fullText.substring(0, currentIndex);
      onSegmentComplete(currentSegment, currentText);

      // Move to the next segment
      currentSegment++;

      if (currentSegment < boundaries.length - 1) {
        // Pause briefly before starting the next segment
        segmentTimerId = setTimeout(() => {
          animationFrameId = requestAnimationFrame(animate);
        }, segmentDelay);
      } else {
        // All segments complete
        isRunning = false;
        onComplete();
      }
    }
  };

  // Control methods
  return {
    start() {
      if (!isRunning) {
        isRunning = true;
        currentSegment = 0;
        currentIndex = 0;
        animate();
      }
      return this;
    },

    pause() {
      isRunning = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (segmentTimerId) {
        clearTimeout(segmentTimerId);
        segmentTimerId = null;
      }
      return this;
    },

    resume() {
      if (!isRunning && currentIndex < fullText.length) {
        isRunning = true;
        animate();
      }
      return this;
    },

    stop() {
      isRunning = false;
      currentSegment = 0;
      currentIndex = 0;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (segmentTimerId) {
        clearTimeout(segmentTimerId);
        segmentTimerId = null;
      }
      return this;
    },

    jumpToSegment(segmentIndex) {
      if (segmentIndex >= 0 && segmentIndex < boundaries.length - 1) {
        currentSegment = segmentIndex;
        currentIndex = boundaries[segmentIndex];
        onUpdate(
          fullText.substring(0, currentIndex),
          (currentIndex / fullText.length) * 100
        );
      }
      return this;
    },

    getState() {
      return {
        isRunning,
        currentSegment,
        totalSegments: boundaries.length - 1,
        progress: (currentIndex / fullText.length) * 100,
        currentText: fullText.substring(0, currentIndex),
        isComplete: currentIndex >= fullText.length,
      };
    },
  };
};
