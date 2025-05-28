/**
 * AdviceHandler.js
 *
 * Enhanced service for managing advice flows based on intent.
 * Coordinates field validation, data fetching, and response formatting.
 */

import { fetchExternalData } from "../externalDataService";
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
} from "./AdviceFieldSchemas";
import { buildPromptWithExternalData } from "../externalDataService";
import { extractStructuredDataFromResponse } from "../aiPromptUtils";
import ragProcessor from "../GeminiRAGProcessor";

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
}) => {
  console.log(`Processing advice intent: ${intent}`, { data, userProfile });

  // Check if this is a valid advice intent
  if (!isAdviceIntent(intent)) {
    console.log(`Unknown advice intent: ${intent}`);
    return {
      success: false,
      error: "Unknown advice intent",
    };
  }

  // Check if we need external data for this intent
  const needsExternalData = requiresExternalData(intent);

  if (!needsExternalData) {
    console.log(
      `Intent ${intent} does not require external data, using direct AI response`
    );
    return {
      success: true,
      needsExternalData: false,
    };
  }

  // If the model already told us what fields are missing, trust that
  let missingFieldsFromModel = data.missingFields || [];
  let followUpQuestion = data.followUpQuestion;

  // Special handling for Find-Hotel: don't require dates but DO require country
  if (intent === "Find-Hotel") {
    // Remove date-related fields from missing fields
    if (missingFieldsFromModel.length > 0) {
      missingFieldsFromModel = missingFieldsFromModel.filter(
        (field) =>
          !["date", "dates", "time", "checkIn", "checkout"].includes(field)
      );
      console.log(`[Hotel] Filtered date-related fields from missing fields`);
    }

    // Note: We don't force-add country here anymore because the FieldValidator
    // already handles location parsing and country extraction properly
    console.log(
      `[Hotel] After filtering, missingFieldsFromModel: ${missingFieldsFromModel}`
    );
  }

  // Enhance data with user profile if available
  if (userProfile && Object.keys(userProfile).length > 0) {
    console.log(`Enhancing data with user profile for ${intent}:`, userProfile);

    // Add fields from user profile that aren't already in data
    Object.entries(userProfile).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        key !== "lastUpdated" &&
        (!data[key] ||
          data[key] === undefined ||
          data[key] === null ||
          data[key] === "")
      ) {
        data[key] = value;
        console.log(`Added ${key} from user profile:`, value);
      }
    });
  }

  // Validate that we have all required data for this intent
  console.log(`[AdviceHandler] About to validate fields for ${intent}`);
  console.log(
    `[AdviceHandler] Data object being passed to validateFields:`,
    data
  );
  console.log(`[AdviceHandler] Data object keys:`, Object.keys(data));
  console.log(
    `[AdviceHandler] Data object structure:`,
    JSON.stringify(data, null, 2)
  );

  const validation = validateFields(intent, data, tripContext, {
    userMessage,
    userProfile,
  });
  console.log(`Validation result for ${intent}:`, validation);

  // For hotel searches, ensure we don't stop for missing dates but we DO require country
  let effectiveMissingFields = [];
  if (intent === "Find-Hotel") {
    // Filter validation.missingFields to exclude date-related fields
    effectiveMissingFields = (validation.missingFields || []).filter(
      (field) =>
        !["date", "dates", "time", "checkIn", "checkout"].includes(field)
    );

    // Don't force-add country anymore - trust the FieldValidator's decision
    console.log(
      `[Hotel] FieldValidator missing fields after date filtering: ${effectiveMissingFields}`
    );
    console.log(
      `[Hotel] Enhanced data from validation:`,
      validation.enhancedData
    );

    // Make sure budget_level is required for hotel searches
    // בדיקה שיש לנו budget_level באחד מהפורמטים האפשריים
    const hasBudgetLevel =
      validation.enhancedData?.budget_level ||
      validation.enhancedData?.preferences?.budget_level ||
      validation.enhancedData?.preferences?.budget ||
      validation.enhancedData?.budget;

    if (!hasBudgetLevel && !effectiveMissingFields.includes("budget_level")) {
      effectiveMissingFields.push("budget_level");
      console.log(
        `[Hotel] Adding budget_level as a required field for hotel search`
      );
    }

    // Only consider data complete if we have all required non-date fields
    if (effectiveMissingFields.length === 0 && !validation.isComplete) {
      validation.isComplete = true;
      console.log(
        `[Hotel] Proceeding with hotel search without date filtering`
      );
    } else if (effectiveMissingFields.length > 0) {
      validation.isComplete = false;
      console.log(
        `[Hotel] Cannot proceed with hotel search, missing required fields: ${effectiveMissingFields.join(
          ", "
        )}`
      );
    }
  } else {
    effectiveMissingFields = validation.missingFields || [];
  }

  // If data is incomplete after our special processing, return a follow-up question
  if (
    !validation.isComplete ||
    effectiveMissingFields.length > 0 ||
    (missingFieldsFromModel.length > 0 && intent !== "Find-Hotel")
  ) {
    // Prioritize missing fields from the model if available
    if (intent === "Find-Hotel") {
      // For hotels, use our filtered fields
      effectiveMissingFields = effectiveMissingFields.filter(
        (field) =>
          !["date", "dates", "time", "checkIn", "checkout"].includes(field)
      );
    } else {
      effectiveMissingFields =
        missingFieldsFromModel.length > 0
          ? missingFieldsFromModel
          : validation.missingFields;
    }

    // Check if we actually have missing fields after filtering
    if (effectiveMissingFields.length === 0) {
      console.log(
        `All required fields present after filtering, proceeding with data fetch`
      );
    } else {
      // Use model's follow-up question if provided, otherwise generate our own
      if (!followUpQuestion) {
        // Try to get a more specific intent-based question if available
        const fieldToAsk = effectiveMissingFields[0];

        // Check for intent-specific questions first
        if (
          INTENT_SPECIFIC_QUESTIONS[intent] &&
          INTENT_SPECIFIC_QUESTIONS[intent][fieldToAsk]
        ) {
          followUpQuestion = INTENT_SPECIFIC_QUESTIONS[intent][fieldToAsk];
        }
        // Fall back to general questions
        else if (FOLLOW_UP_QUESTIONS[fieldToAsk]) {
          followUpQuestion = FOLLOW_UP_QUESTIONS[fieldToAsk];
        }
        // If still no question, create a generic one
        else {
          followUpQuestion = `Could you provide the ${fieldToAsk.replace(
            /_/g,
            " "
          )}?`;
        }

        console.log(
          `Generated fallback follow-up question: "${followUpQuestion}"`
        );
      } else {
        console.log(
          `Using model-provided follow-up question: "${followUpQuestion}"`
        );
      }

      console.log(
        `[AdviceHandler] Missing fields detected, requesting transition to AWAITING_MISSING_INFO state`
      );

      // Generate a unique message ID to help prevent duplicate forms
      const messageId = `missing-fields-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      console.log(`[AdviceHandler] Generated unique messageId: ${messageId}`);

      return {
        success: false,
        needsFollowUp: true,
        followUpQuestion,
        data: validation.enhancedData,
        missingFields: effectiveMissingFields,
        // Add state transition information
        stateTransition: {
          nextState: "AWAITING_MISSING_INFO",
          nextAction: "collect_missing_fields",
          intent: intent,
          requiredFields: effectiveMissingFields,
          messageId: messageId, // Add unique message ID to help prevent duplicates
        },
      };
    }
  }

  // Fetch external data based on the intent and the enhanced data
  try {
    console.log(
      `Fetching external data for ${intent} with:`,
      validation.enhancedData
    );

    // Pass the user profile to the external data service
    const externalData = await fetchExternalData(
      intent,
      validation.enhancedData,
      userProfile
    );

    console.log(`External data fetched for ${intent}:`, externalData);

    // If fetch was successful, process the response
    if (externalData.success) {
      // Add the resolved location data to ensure proper formatting
      externalData.requestData = validation.enhancedData;

      let formattedResponse;

      // שימוש במודל RAG הממוקד שיצרנו במקום הקוד המקורי
      if (enableRAG) {
        console.log(`Using specialized RAG processor for ${intent}`);

        try {
          // וידוא שהמעבד מאותחל
          if (!ragProcessor.initialized) {
            if (!GEMINI_API_KEY) {
              console.warn(
                "Gemini API key not found, using standard formatter instead"
              );
              formattedResponse = formatAdviceResponse(intent, externalData);
            } else {
              // אתחול המעבד עם מפתח ה-API
              await ragProcessor.initialize(GEMINI_API_KEY);
            }
          }

          // אם המעבד אותחל בהצלחה, משתמשים בו לעיבוד התשובה
          if (ragProcessor.initialized) {
            // עיבוד הנתונים עם המודל הייעודי
            formattedResponse = await ragProcessor.processExternalData(
              intent,
              externalData,
              userMessage
            );

            console.log("Using specialized RAG processor response");
          } else {
            // אם האתחול נכשל, משתמשים בפורמטר הרגיל
            formattedResponse = formatAdviceResponse(intent, externalData);
            console.log(
              "RAG processor not initialized, falling back to standard formatter"
            );
          }
        } catch (ragError) {
          console.error("Error in specialized RAG processing:", ragError);
          // במקרה של שגיאה, משתמשים בפורמטר הרגיל
          formattedResponse = formatAdviceResponse(intent, externalData);
        }
      } else {
        // אם ה-RAG לא מופעל, משתמשים בפורמטר הרגיל
        formattedResponse = formatAdviceResponse(intent, externalData);
        console.log("RAG disabled, using standard formatter");
      }

      return {
        success: true,
        needsExternalData: true,
        message: formattedResponse,
        rawData: externalData,
        // Add state transition information for successful fetch
        stateTransition: {
          nextState: "ADVISORY_MODE",
          nextAction: "display_external_data",
          intent: intent,
        },
      };
    } else {
      // Handle failed data fetch
      externalData.requestData = validation.enhancedData;
      return {
        success: false,
        needsExternalData: true,
        error: externalData.error || "Failed to fetch external data",
        data: validation.enhancedData,
        message: formatAdviceResponse(intent, externalData),
        // Add state transition information for error case
        stateTransition: {
          nextState: "ADVISORY_MODE",
          nextAction: "display_error",
          intent: intent,
        },
      };
    }
  } catch (error) {
    console.error(`Error fetching external data for ${intent}:`, error);

    return {
      success: false,
      needsExternalData: true,
      error: error.message || "Error processing advice intent",
      data: validation.enhancedData,
      message: `Sorry, I encountered an error while getting ${intent
        .replace("-", " ")
        .toLowerCase()} information: ${error.message}`,
      // Add state transition information for error case
      stateTransition: {
        nextState: "ADVISORY_MODE",
        nextAction: "display_error",
        intent: intent,
      },
    };
  }
};

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
  return isAdviceIntent(intent);
};

/**
 * Gets a list of intents that require external data
 *
 * @returns {Array} - List of intents requiring external data
 */
export const getExternalDataIntents = () => {
  return requiresExternalData;
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
  return validateFields(intent, data, tripContext);
};

/**
 * Checks whether an intent requires external data
 *
 * @param {string} intent - The intent to check
 * @returns {boolean} - Whether external data is needed
 */
export const requiresIntentExternalData = (intent) => {
  return requiresExternalData(intent);
};
