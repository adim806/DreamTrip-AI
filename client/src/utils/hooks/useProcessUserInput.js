import { useState, useContext, useRef, useEffect, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  updateTripDraft,
  checkTripDraftCompleteness,
  formatTripSummary,
  validateRequiredTripFields,
  validateTripCompletion,
} from "../tripUtils";
import {
  extractStructuredDataFromResponse,
  intentRequiresExternalData,
  getGenerationConfig,
  createContextDiff,
  getInitialSystemInstruction,
  createContextUpdateMessage,
} from "../aiPromptUtils";
import { generateItinerary, saveItinerary } from "../itineraryGenerator";
import { processAdviceIntent } from "../advice/AdviceHandler";
import {
  TripContext,
  CONVERSATION_STATES,
} from "../../components/tripcontext/TripProvider";
import { useAuth } from "@clerk/clerk-react";
import {
  isAdviceIntent,
  processTimeIndicators,
  AdviceFieldSchemas,
  detectBudgetLevel,
  requiresExternalData,
} from "../advice";

// NEW: Import modular utilities from the core modules
import { useMessageHandling, useConversationMemory } from "./core";
import {
  processRelativeDates,
  convertRelativeDate,
  processTimeReferences,
  normalizeTimeContext,
  isToday,
  isTomorrow,
  isWeekend,
} from "./core/dateTimeProcessing";
import {
  normalizeDataStructure,
  mergeWithExistingTripData,
  splitLocationField,
  standardizeBudgetLevel,
  enhanceExtractedData,
  validateAndCleanData,
  deepMerge,
  processDateFormats,
} from "./core/dataTransformation";
import {
  sanitizeIntent,
  isExternalDataIntent,
  getRequiredFieldsForIntent,
  detectUserConfirmation,
  analyzeMessageContext,
  validateIntentDataConsistency,
} from "./core/intentProcessing";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Delay constants for external data fetching (in milliseconds)
const SUCCESSFUL_FETCH_DELAY = 3000; // Delay after successful data fetch
const ERROR_FETCH_DELAY = 2000; // Delay for error cases
const FOLLOW_UP_DELAY = 2000; // Delay for follow-up questions

/**
 * Check if an intent is a weather-related intent
 * @param {string} intent - The intent to check
 * @returns {boolean} - True if this is a weather intent
 */
const isWeatherIntent = (intent) => {
  return (
    intent === "Weather-Request" ||
    intent === "Weather-Forecast" ||
    intent?.toLowerCase().includes("weather")
  );
};

/**
 * Get specific loading message for external data intents
 * @param {string} intent - The intent requiring external data
 * @returns {string} - Specific loading message
 */
const getExternalDataLoadingMessage = (intent) => {
  const loadingMessages = {
    "Weather-Request": "🌤️ Fetching current weather information...",
    "Find-Hotel": "🏨 Searching for hotel recommendations...",
    "Find-Attractions": "🎯 Finding popular attractions...",
    "Find-Restaurants": "🍽️ Looking for restaurant recommendations...",
    "Currency-Conversion": "💱 Getting current exchange rates...",
    "Travel-Restrictions": "🛂 Checking travel restrictions...",
    "Local-Events": "🎉 Finding local events...",
    "Flight-Information": "✈️ Searching for flight information...",
    "Safety-Information": "🛡️ Gathering safety information...",
    "Public-Transport-Info": "🚌 Getting public transport information...",
  };

  return (
    loadingMessages[intent] ||
    `🔍 Fetching ${intent.replace("-", " ").toLowerCase()} information...`
  );
};

/**
 * Detects if a message is a trip confirmation or cancellation command
 * Used for both text commands and messages triggered by buttons
 */
const detectTripConfirmationAction = (message, state) => {
  if (!message || typeof message !== "string") return null;

  const lowerMsg = message.toLowerCase().trim();

  // Check if the system is in awaiting confirmation state
  if (state === "AWAITING_USER_TRIP_CONFIRMATION") {
    console.log(
      "[TripConfirmation] Checking if message is a confirmation action:",
      lowerMsg
    );

    // Check for confirmation keywords - expanded to catch more variations
    if (
      lowerMsg === "confirm" ||
      lowerMsg === "yes" ||
      lowerMsg === "approve" ||
      lowerMsg === "ok" ||
      lowerMsg === "looks good" ||
      lowerMsg === "good" ||
      lowerMsg === "correct" ||
      lowerMsg === "proceed" ||
      lowerMsg === "go ahead" ||
      lowerMsg === "generate itinerary" ||
      lowerMsg === "create itinerary" ||
      lowerMsg === "sounds good" ||
      lowerMsg === "let's go" ||
      lowerMsg === "do it" ||
      lowerMsg === "that's correct" ||
      lowerMsg === "that sounds good" ||
      lowerMsg === "generate" ||
      lowerMsg.includes("confirm") ||
      lowerMsg.includes("looks good") ||
      lowerMsg.includes("sounds good") ||
      lowerMsg.includes("proceed with") ||
      lowerMsg.includes("go ahead") ||
      lowerMsg.includes("that's right") ||
      lowerMsg.includes("generate the itinerary") ||
      lowerMsg.includes("create the itinerary") ||
      lowerMsg === "yes, please" ||
      lowerMsg.includes("all good") ||
      lowerMsg === "כן" || // Hebrew support
      lowerMsg === "אישור" ||
      lowerMsg === "מאשר" ||
      lowerMsg.includes("נראה טוב")
    ) {
      console.log("[TripConfirmation] Detected CONFIRM action");
      return "confirm";
    }

    // Check for edit keywords - expanded to catch more variations
    if (
      lowerMsg === "edit" ||
      lowerMsg === "change" ||
      lowerMsg === "modify" ||
      lowerMsg === "update" ||
      lowerMsg === "adjust" ||
      lowerMsg === "fix" ||
      lowerMsg === "not quite right" ||
      lowerMsg.includes("change") ||
      lowerMsg.includes("edit") ||
      lowerMsg.includes("modify") ||
      lowerMsg.includes("adjust") ||
      lowerMsg.includes("fix") ||
      lowerMsg.includes("not right") ||
      lowerMsg.includes("not correct") ||
      lowerMsg.includes("need to change") ||
      lowerMsg.includes("want to update") ||
      lowerMsg.includes("isn't right") ||
      lowerMsg === "לערוך" || // Hebrew support
      lowerMsg === "שינוי" ||
      lowerMsg.includes("לא נכון")
    ) {
      console.log("[TripConfirmation] Detected EDIT action");
      return "edit";
    }

    // Check for cancel keywords - expanded to catch more variations
    if (
      lowerMsg === "cancel" ||
      lowerMsg === "no" ||
      lowerMsg === "start over" ||
      lowerMsg === "restart" ||
      lowerMsg === "delete" ||
      lowerMsg === "abort" ||
      lowerMsg === "stop" ||
      lowerMsg === "don't create" ||
      lowerMsg.includes("cancel") ||
      lowerMsg.includes("start over") ||
      lowerMsg.includes("don't proceed") ||
      lowerMsg.includes("don't want") ||
      lowerMsg.includes("start again") ||
      lowerMsg.includes("not interested") ||
      lowerMsg.includes("nevermind") ||
      lowerMsg === "לא" || // Hebrew support
      lowerMsg === "ביטול" ||
      lowerMsg === "בטל"
    ) {
      console.log("[TripConfirmation] Detected CANCEL action");
      return "cancel";
    }
  }

  return null;
};

/**
 * Debug function to log detailed information about trip data
 * @param {Object} tripDetails - The trip details to debug
 */
const debugTripData = (tripDetails) => {
  if (!tripDetails) {
    console.log("DEBUG: tripDetails is null or undefined");
    return;
  }

  console.log("DEBUG: Full trip details:", tripDetails);

  // Check main fields
  console.log("DEBUG: Main fields check:");
  console.log(
    "- vacation_location:",
    tripDetails.vacation_location || "MISSING"
  );
  console.log("- duration:", tripDetails.duration || "MISSING");
  console.log("- dates object:", tripDetails.dates ? "Present" : "MISSING");
  if (tripDetails.dates) {
    console.log("  - dates.from:", tripDetails.dates.from || "MISSING");
    console.log("  - dates.to:", tripDetails.dates.to || "MISSING");
  }
  console.log("- budget direct:", tripDetails.budget || "MISSING");
  console.log(
    "- constraints object:",
    tripDetails.constraints ? "Present" : "MISSING"
  );
  if (tripDetails.constraints) {
    console.log(
      "  - constraints.budget:",
      tripDetails.constraints.budget || "MISSING"
    );
  }

  // Special flags
  console.log("- isTomorrow flag:", tripDetails.isTomorrow ? "YES" : "No");
};

/**
 * Directly extracts trip data from user messages using pattern matching
 * This complements the AI-based extraction for more reliable data capture
 * @param {string} userMessage - The user's message
 * @returns {Object} - Extracted trip data
 */
const extractDirectTripData = (userMessage) => {
  if (!userMessage || typeof userMessage !== "string") return {};

  const extractedData = {};
  const lowerMessage = userMessage.toLowerCase();

  // Extract duration - look for "X days" pattern
  const durationRegex = /(\d+)\s*(day|days)/i;
  const durationMatch = userMessage.match(durationRegex);
  if (durationMatch && durationMatch[1]) {
    const durationValue = parseInt(durationMatch[1], 10);
    if (!isNaN(durationValue)) {
      extractedData.duration = durationValue;
      console.log("[DirectExtraction] Found duration:", durationValue);
    }
  }

  // Extract location - look for "to [location]" pattern
  const locationRegex =
    /(?:travel|trip|go)\s+to\s+([a-z\s]+)(?:\s+for|\s+in|\s+on|\s*$)/i;
  const locationMatch = userMessage.match(locationRegex);
  if (locationMatch && locationMatch[1]) {
    const location = locationMatch[1].trim();

    // Check if location contains both city and country (e.g., "Berlin Germany")
    const locationParts = location.split(/\s+/);
    if (locationParts.length > 1) {
      // Try to identify if we have city and country
      const lastWord = locationParts[locationParts.length - 1];
      const commonCountries = [
        "Germany",
        "France",
        "USA",
        "UK",
        "Italy",
        "Spain",
        "Israel",
        "Japan",
        "China",
      ];

      // Check if the last word is a country
      if (
        commonCountries.some(
          (country) => country.toLowerCase() === lastWord.toLowerCase()
        )
      ) {
        // We have a country, so everything before it is the city
        const country = lastWord;
        const city = locationParts.slice(0, -1).join(" ");

        extractedData.city = city;
        extractedData.country = country;
        extractedData.vacation_location = `${city}, ${country}`;
        console.log(
          "[DirectExtraction] Found city and country:",
          city,
          country
        );
      } else {
        // Treat the whole thing as a location
        extractedData.vacation_location = location;
        console.log("[DirectExtraction] Found location:", location);
      }
    } else {
      extractedData.vacation_location = location;
      console.log("[DirectExtraction] Found location:", location);
    }
  }

  // Extract travelers - look for "X people" or "just me" patterns
  if (
    lowerMessage.includes("just me") ||
    lowerMessage.includes("only me") ||
    lowerMessage.includes("by myself") ||
    lowerMessage.includes("alone")
  ) {
    extractedData.travelers = 1;
    console.log("[DirectExtraction] Found solo traveler");
  } else {
    const travelersRegex =
      /(\d+)\s*(people|persons|travelers|travellers|adults|guests)/i;
    const travelersMatch = userMessage.match(travelersRegex);
    if (travelersMatch && travelersMatch[1]) {
      const travelersValue = parseInt(travelersMatch[1], 10);
      if (!isNaN(travelersValue)) {
        extractedData.travelers = travelersValue;
        console.log("[DirectExtraction] Found travelers:", travelersValue);
      }
    }
  }

  // Extract budget level - look for budget keywords
  if (
    lowerMessage.includes("budget: luxury") ||
    lowerMessage.includes("budget:luxury")
  ) {
    extractedData.budget_level = "luxury";
    console.log("[DirectExtraction] Found explicit budget level: luxury");
  } else if (
    lowerMessage.includes("budget: moderate") ||
    lowerMessage.includes("budget:moderate")
  ) {
    extractedData.budget_level = "moderate";
    console.log("[DirectExtraction] Found explicit budget level: moderate");
  } else if (
    lowerMessage.includes("budget: cheap") ||
    lowerMessage.includes("budget:cheap")
  ) {
    extractedData.budget_level = "cheap";
    console.log("[DirectExtraction] Found explicit budget level: cheap");
  } else if (
    lowerMessage.includes("cheap") ||
    lowerMessage.includes("budget") ||
    lowerMessage.includes("inexpensive") ||
    lowerMessage.includes("affordable")
  ) {
    extractedData.budget_level = "cheap";
    console.log("[DirectExtraction] Found budget level: cheap");
  } else if (
    lowerMessage.includes("luxury") ||
    lowerMessage.includes("high-end") ||
    lowerMessage.includes("expensive") ||
    lowerMessage.includes("premium")
  ) {
    extractedData.budget_level = "luxury";
    console.log("[DirectExtraction] Found budget level: luxury");
  } else if (
    lowerMessage.includes("moderate") ||
    lowerMessage.includes("mid-range") ||
    lowerMessage.includes("standard")
  ) {
    extractedData.budget_level = "moderate";
    console.log("[DirectExtraction] Found budget level: moderate");
  }

  // Also try to extract budget using regex pattern for form submissions
  const budgetPattern = /budget:\s*(\w+)/i;
  const budgetMatch = userMessage.match(budgetPattern);
  if (budgetMatch && budgetMatch[1]) {
    const budgetValue = budgetMatch[1].trim().toLowerCase();
    extractedData.budget_level = budgetValue;
    extractedData.budget = budgetValue;
    console.log("[DirectExtraction] Extracted budget from form:", budgetValue);
  }

  // Extract dates - look for date patterns
  const dateRangePattern = /(?:from|dates:)\s*([\d-]+)\s*to\s*([\d-]+)/i;
  const dateMatch = userMessage.match(dateRangePattern);

  if (dateMatch && dateMatch[1] && dateMatch[2]) {
    const from = dateMatch[1].trim();
    const to = dateMatch[2].trim();
    extractedData.dates = { from, to };
    console.log("[DirectExtraction] Found date range:", from, "to", to);
  }

  return extractedData;
};

/**
 * Enhanced processing of potential date strings in user messages
 * Used to extract date ranges from messages or form submissions
 */
const extractDatesFromMessage = (message) => {
  if (!message || typeof message !== "string") return null;

  // Check for explicit date patterns like "dates: 2025-05-31 to 2025-06-07"
  const dateRangePattern = /dates:\s*([\d-]+)\s*to\s*([\d-]+)/i;
  const dateMatch = message.match(dateRangePattern);

  if (dateMatch && dateMatch[1] && dateMatch[2]) {
    const from = dateMatch[1].trim();
    const to = dateMatch[2].trim();
    console.log(
      "[DateExtraction] Found date range in message:",
      from,
      "to",
      to
    );
    return { from, to };
  }

  // Check for another common pattern "from 2025-05-31 to 2025-06-07"
  const altDateRangePattern = /from\s*([\d-]+)\s*to\s*([\d-]+)/i;
  const altDateMatch = message.match(altDateRangePattern);

  if (altDateMatch && altDateMatch[1] && altDateMatch[2]) {
    const from = altDateMatch[1].trim();
    const to = altDateMatch[2].trim();
    console.log(
      "[DateExtraction] Found alternative date range in message:",
      from,
      "to",
      to
    );
    return { from, to };
  }

  return null;
};

/**
 * UPDATED: Custom hook for handling AI processing of user input
 * Now uses the new modular system while maintaining full backward compatibility
 * - Processes user messages through Gemini AI
 * - Extracts structured data from responses
 * - Updates trip context with new information
 * - Handles RAG (Retrieval Augmented Generation) with external data
 * - Manages conversation state with pending messages
 */
export function useProcessUserInput(chatData) {
  const {
    tripDetails,
    setTripDetails,
    setallTripData,
    allTripData,
    conversationState,
    transitionState,
    CONVERSATION_STATES,
    startNewTrip,
    registerItineraryGenerator,
    cancelTrip,
    setWasTripCancelled,
    // Add the new UserProfile context
    userProfile,
    updateUserProfile,
    getUserProfileData,
    SERVICE_CATEGORIES,
    INTENT_TO_CATEGORY,
  } = useContext(TripContext);

  // NEW: Use the modular message handling system
  const {
    pendingMessages,
    setPendingMessages,
    updateWithDelay,
    replaceLoadingMessage,
    addSystemMessage,
    isAcknowledgmentMessage,
    clearLoadingMessages,
    addLoadingMessage,
  } = useMessageHandling();

  // NEW: Use the modular conversation memory system
  const {
    conversationMemory,
    updateConversationMemory,
    getRelevantContext,
    clearConversationMemory,
  } = useConversationMemory();

  // Remaining state (specific to this hook)
  const [isTyping, setIsTyping] = useState(false);
  const [parallelDataFetch, setParallelDataFetch] = useState({
    inProgress: false,
    intent: null,
    data: null,
    result: null,
  });

  // Declare missingFieldsState here, before it's used in any functions
  const [missingFieldsState, setMissingFieldsState] = useState({
    fields: [],
    values: {},
    messageId: null,
    submitted: false,
  });

  // Refs for tracking state
  const chatRef = useRef(null);
  const chatSessionIdRef = useRef(null);

  // Initialize Gemini AI model
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY);

  // Authentication hook and React Query
  const { userId, isSignedIn, getToken } = useAuth();
  const queryClient = useQueryClient();

  // Function to prepare authentication headers
  const getAuthHeaders = async () => {
    if (isSignedIn) {
      try {
        const token = await getToken();
        return {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };
      } catch (error) {
        console.error("Failed to get auth token:", error);
        return { "Content-Type": "application/json" };
      }
    } else {
      return { "Content-Type": "application/json" };
    }
  };

  // RESTORED: Original useMutation for saving chat data
  const mutation = useMutation({
    mutationFn: async ({ userMessage, aiResponse, image }) => {
      const headers = await getAuthHeaders();

      console.log("=== MUTATION DEBUG START ===");
      console.log("chatData:", chatData);
      console.log("chatData._id:", chatData?._id);
      console.log("userId:", userId);
      console.log("userMessage:", userMessage);
      console.log("aiResponse:", aiResponse);
      console.log("image:", image);
      console.log("headers:", headers);

      if (!chatData?._id) {
        console.log("Creating new chat...");
        // Create new chat if no chat ID exists
        return fetch(
          `${import.meta.env.VITE_API_URL}/api/chats?userId=${userId}`,
          {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify({
              text: userMessage,
            }),
          }
        ).then((res) => {
          console.log("New chat response status:", res.status);
          if (!res.ok) {
            throw new Error(`Failed to create chat: ${res.status}`);
          }
          return res.json();
        });
      }

      console.log("Updating existing chat...");
      const requestBody = {
        question: userMessage, // Server expects 'question' not 'userMessage'
        answer: aiResponse, // Server expects 'answer' not 'aiResponse'
        img: image?.dbData?.filePath || undefined, // Server expects 'img' not 'image', and extract the file path
      };

      console.log(
        "Request body being sent:",
        JSON.stringify(requestBody, null, 2)
      );

      const url = `${import.meta.env.VITE_API_URL}/api/chats/${
        chatData._id
      }?userId=${userId}`;
      console.log("Request URL:", url);

      // Update existing chat - FIXED: Use correct field names for server
      return fetch(url, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify(requestBody),
      }).then((res) => {
        console.log("Update chat response status:", res.status);
        console.log("=== MUTATION DEBUG END ===");
        if (!res.ok) {
          throw new Error(`Failed to update chat: ${res.status}`);
        }
        return res.json();
      });
    },
    onSuccess: (data) => {
      console.log("[Database] Message saved successfully:", data);

      // Update queries depending on whether we created a new chat or updated existing
      if (chatData?._id) {
        queryClient.invalidateQueries({ queryKey: ["chat", chatData._id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["userchats"] });
        queryClient.invalidateQueries({ queryKey: ["chat", data] });
      }
    },
    onError: (err) => {
      console.error("[Database] Failed to save message:", err);
    },
  });

  /**
   * UPDATED: Enhanced chat initialization using conversation memory
   */
  const initializeChat = useCallback(
    (useHistoryData = true) => {
      console.log("Initializing chat with modular memory system");

      try {
        chatSessionIdRef.current = chatData?._id;

        const baseModel = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          systemInstruction: getInitialSystemInstruction(),
        });

        let initialHistory = [];

        if (
          useHistoryData &&
          chatData?.history &&
          Array.isArray(chatData.history)
        ) {
          const recentMessages = chatData.history.slice(-10);
          initialHistory = recentMessages.map(({ role, parts }) => ({
            role,
            parts: Array.isArray(parts)
              ? [{ text: parts[0]?.text || "" }]
              : [{ text: "" }],
          }));
        }

        chatRef.current = baseModel.startChat({
          generationConfig: getGenerationConfig(),
          history: initialHistory.length > 0 ? initialHistory : undefined,
        });

        return true;
      } catch (error) {
        console.error("Error initializing chat:", error);
        return false;
      }
    },
    [chatData, genAI]
  );

  /**
   * UPDATED: Enhanced trip building with modular data processing
   */
  const handleTripBuildingIntent = useCallback(
    async (data, responseText, loadingId) => {
      console.log("[ModularProcessing] Processing trip building data");
      console.log("[ModularProcessing] Original data:", data);

      try {
        // Use modular data transformation
        let processedData = splitLocationField(data);
        processedData = standardizeBudgetLevel(processedData);

        // Process dates with modular utilities
        if (processedData.dates) {
          processedData.dates = processRelativeDates(
            processedData.dates,
            processedData
          );
        }

        // Process duration - ensure it's a number
        if (processedData.duration !== undefined) {
          const durationValue = parseInt(processedData.duration, 10);
          if (!isNaN(durationValue)) {
            processedData.duration = durationValue;
            console.log(
              "[ModularProcessing] Parsed duration to number:",
              durationValue
            );
          }
        }

        // Ensure proper mapping of location fields to vacation_location
        if (!processedData.vacation_location) {
          // If we have location field but no vacation_location, use that
          if (processedData.location) {
            processedData.vacation_location = processedData.location;
            console.log(
              "[ModularProcessing] Mapped location to vacation_location:",
              processedData.location
            );
          }
          // If we have city and country but no vacation_location, combine them
          else if (processedData.city) {
            if (processedData.country) {
              processedData.vacation_location = `${processedData.city}, ${processedData.country}`;
              console.log(
                "[ModularProcessing] Created vacation_location from city and country:",
                processedData.vacation_location
              );
            } else {
              processedData.vacation_location = processedData.city;
              console.log(
                "[ModularProcessing] Mapped city to vacation_location:",
                processedData.city
              );
            }
          }
          // If we have destination but no vacation_location, use that
          else if (processedData.destination) {
            processedData.vacation_location = processedData.destination;
            console.log(
              "[ModularProcessing] Mapped destination to vacation_location:",
              processedData.destination
            );
          }
        }

        // Handle budget field mapping
        if (!processedData.budget && processedData.budget_level) {
          // Map budget_level to budget field for compatibility
          processedData.budget = processedData.budget_level;
          console.log(
            "[ModularProcessing] Mapped budget_level to budget:",
            processedData.budget_level
          );
        }

        // Merge with existing trip data
        const mergedData = mergeWithExistingTripData(
          processedData,
          ["vacation_location", "duration", "dates", "budget", "budget_level"],
          { preserve_context: true, merge_user_data: true }
        );

        console.log("[ModularProcessing] Final merged trip data:", mergedData);

        // Update trip details
        const updatedTripDetails = updateTripDraft(tripDetails, mergedData);
        console.log(
          "[ModularProcessing] Updated trip details:",
          updatedTripDetails
        );
        setTripDetails(updatedTripDetails);

        // Check if trip is complete
        const validationResult = validateRequiredTripFields(updatedTripDetails);
        console.log("[ModularProcessing] Validation result:", validationResult);

        // Log the missing fields for debugging
        if (
          validationResult.missingFields &&
          validationResult.missingFields.length > 0
        ) {
          console.log(
            "[ModularProcessing] Missing fields:",
            validationResult.missingFields
          );

          // Check if date is present but budget is missing
          const hasDate = !validationResult.missingFields.includes("dates");
          const budgetMissing =
            validationResult.missingFields.includes("budget");

          if (hasDate && budgetMissing) {
            console.log(
              "[ModularProcessing] Date is present but budget is missing, will ask for budget"
            );
          }
        }

        if (validationResult.success) {
          console.log(
            "[ModularProcessing] Trip is complete, transitioning to confirmation"
          );

          // Use the model's response message if available, otherwise create a compact summary
          let confirmationMessage = responseText;

          // If the response is a JSON object, extract the response field
          if (
            typeof responseText === "string" &&
            responseText.includes('"response"')
          ) {
            try {
              const jsonResponse = JSON.parse(responseText);
              if (jsonResponse.response) {
                confirmationMessage = jsonResponse.response;
              }
            } catch (e) {
              // If parsing fails, use the original response
            }
          }

          // Transition to confirmation state
          transitionState(CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION);

          // Replace loading message with the confirmation message
          replaceLoadingMessage(loadingId, {
            role: "model",
            message: confirmationMessage,
            id: `trip-summary-${Date.now()}`,
            isTripSummary: true,
          });
        } else {
          // Just show the AI response without appending a follow-up question
          // The AI response already contains appropriate follow-up questions
          console.log(
            "[ModularProcessing] Trip is incomplete, missing fields:",
            validationResult.missingFields
          );
          replaceLoadingMessage(loadingId, {
            role: "model",
            message: responseText,
            id: `follow-up-${Date.now()}`,
          });
        }
      } catch (error) {
        console.error(
          "[ModularProcessing] Error handling trip building intent:",
          error
        );
        replaceLoadingMessage(loadingId, {
          role: "model",
          message: responseText,
          id: `error-fallback-${Date.now()}`,
        });
      }
    },
    [
      tripDetails,
      setTripDetails,
      transitionState,
      replaceLoadingMessage,
      CONVERSATION_STATES,
      splitLocationField,
      standardizeBudgetLevel,
      processRelativeDates,
      mergeWithExistingTripData,
    ]
  );

  /**
   * UPDATED: Enhanced user confirmation handling
   */
  const handleUserConfirmation = useCallback(
    async (data, responseText, loadingId, extractedData) => {
      console.log("[ModularProcessing] Processing user confirmation");

      if (
        conversationState ===
        CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION
      ) {
        console.log(
          "[ModularProcessing] User confirmed trip, starting itinerary generation"
        );

        try {
          // First, explicitly add a confirmation message to the chat
          const generationMessage =
            extractedData?.data?.confirmation_message ||
            "Perfect! I'm now generating your personalized itinerary. This will take a moment...";

          // Replace the loading message with a generation message
          replaceLoadingMessage(loadingId, {
            role: "model",
            message: generationMessage,
            id: `generating-${Date.now()}`,
            isGenerating: true,
          });

          // Then transition to the generating state
          transitionState(CONVERSATION_STATES.GENERATING_ITINERARY);

          // Create a dedicated loading message for the itinerary and store its ID
          // This ensures we have a loading message we can replace later
          if (!window.__itineraryLoadingId) {
            const itineraryLoadingId = addLoadingMessage({
              isGenerating: true,
              isItineraryGeneration: true,
              message: "Creating your personalized travel itinerary...",
            });
            console.log(
              "[handleUserConfirmation] Created itinerary loading ID:",
              itineraryLoadingId
            );
            window.__itineraryLoadingId = itineraryLoadingId;
          }

          // Generate itinerary
          const itineraryResult = await generateItinerary(tripDetails);

          if (itineraryResult && itineraryResult.success) {
            console.log(
              "[ModularProcessing] Itinerary generated successfully:",
              itineraryResult
            );

            // הדפסת תוצאת המסלול המלאה לבדיקה
            console.log("[ModularProcessing] Full itinerary content:");
            console.log(itineraryResult.itinerary);

            setallTripData(itineraryResult);

            // Add a small delay to ensure UI updates before transitioning
            setTimeout(() => {
              transitionState(
                CONVERSATION_STATES.DISPLAYING_ITINERARY,
                itineraryResult
              );
            }, 500);
          } else {
            // Handle error in itinerary generation
            console.error(
              "[ModularProcessing] Error in itinerary result:",
              itineraryResult
            );

            addSystemMessage(
              "I apologize, but there was an error generating your itinerary. Please try again."
            );

            transitionState(CONVERSATION_STATES.TRIP_BUILDING_MODE);
          }
        } catch (error) {
          console.error(
            "[ModularProcessing] Error generating itinerary:",
            error
          );
          addSystemMessage(
            "I apologize, but there was an error generating your itinerary. Please try again."
          );
          transitionState(CONVERSATION_STATES.TRIP_BUILDING_MODE);
        }
      } else {
        // Handle other types of confirmations
        const messageToShow =
          extractedData?.data?.response ||
          extractedData?.formattedResponse ||
          responseText;
        replaceLoadingMessage(loadingId, {
          role: "model",
          message: messageToShow,
          id: `confirmation-${Date.now()}`,
        });
      }
    },
    [
      conversationState,
      CONVERSATION_STATES,
      transitionState,
      replaceLoadingMessage,
      addSystemMessage,
      tripDetails,
      setallTripData,
      generateItinerary,
      addLoadingMessage,
    ]
  );

  /**
   * UPDATED: Enhanced intent handling with modular utilities
   */
  const handleProcessedIntent = useCallback(
    async (
      intent,
      data,
      responseText,
      loadingId,
      userMessage,
      extractedData
    ) => {
      console.log(`[ModularProcessing] Handling intent: ${intent}`);

      // Get relevant context for this intent
      const relevantContext = getRelevantContext(intent);
      console.log("[ModularProcessing] Relevant context:", relevantContext);

      // Update conversation memory
      updateConversationMemory(intent, data);

      // Check if any location data is present and update trip details
      if (data) {
        const locationUpdates = {};
        const tripUpdates = {};
        let hasUpdates = false;

        // Check for various location fields
        if (data.location || data.city || data.destination) {
          // Determine the vacation_location
          if (data.city && data.country) {
            locationUpdates.vacation_location = `${data.city}, ${data.country}`;
            hasUpdates = true;
          } else if (data.location) {
            locationUpdates.vacation_location = data.location;
            hasUpdates = true;
          } else if (data.city) {
            locationUpdates.vacation_location = data.city;
            hasUpdates = true;
          } else if (data.destination) {
            locationUpdates.vacation_location = data.destination;
            hasUpdates = true;
          }

          // Store country separately if available
          if (data.country) {
            locationUpdates.country = data.country;
          }
        }

        // Extract duration information
        if (data.duration !== undefined) {
          // Handle duration as a number or string
          const durationValue = parseInt(data.duration, 10);
          if (!isNaN(durationValue)) {
            tripUpdates.duration = durationValue;
            hasUpdates = true;
            console.log(
              "[ModularProcessing] Extracted duration:",
              durationValue
            );
          }
        } else if (userMessage) {
          // Try to extract duration from the user message if not in data object
          const durationRegex = /(\d+)\s*(day|days)/i;
          const durationMatch = userMessage.match(durationRegex);
          if (durationMatch && durationMatch[1]) {
            const durationValue = parseInt(durationMatch[1], 10);
            if (!isNaN(durationValue)) {
              tripUpdates.duration = durationValue;
              hasUpdates = true;
              console.log(
                "[ModularProcessing] Extracted duration from message:",
                durationValue
              );
            }
          }
        }

        // Extract date information - handle both 'date' and 'dates' fields
        if (data.date) {
          // If we have a single date field, convert it to a dates object
          const dateStr = data.date;
          if (dateStr && typeof dateStr === "string") {
            try {
              // Create a dates object with from and to (to = from + duration days)
              const fromDate = new Date(dateStr);
              const toDate = new Date(fromDate);

              // Use duration from tripDetails or data, with a fallback to 3 days instead of 7
              // This is a more reasonable default for most trips
              const duration = tripDetails.duration || data.duration || 3;
              console.log(
                "[ModularProcessing] Using duration for date calculation:",
                duration
              );

              // Subtract 1 from duration to include the start day in the count
              toDate.setDate(fromDate.getDate() + parseInt(duration, 10) - 1);

              tripUpdates.dates = {
                from: dateStr,
                to: toDate.toISOString().split("T")[0],
              };

              hasUpdates = true;
              console.log(
                "[ModularProcessing] Converted date to dates object:",
                tripUpdates.dates
              );
            } catch (err) {
              console.error("[ModularProcessing] Error converting date:", err);
            }
          }
        } else if (data.dates) {
          // If we already have a dates object, use it directly
          if (typeof data.dates === "object") {
            tripUpdates.dates = data.dates;
            hasUpdates = true;
            console.log("[ModularProcessing] Using dates object:", data.dates);
          }
        }

        // Extract budget information
        if (data.budget_level) {
          // Don't standardize the budget_level, use it exactly as provided
          tripUpdates.budget = data.budget_level;
          // Also update constraints.budget to ensure it's used by the itinerary generator
          if (!tripUpdates.constraints) tripUpdates.constraints = {};
          tripUpdates.constraints.budget = data.budget_level;
          hasUpdates = true;
          console.log(
            "[ModularProcessing] Using budget_level:",
            data.budget_level,
            "and updating constraints.budget"
          );
        } else if (data.budget) {
          // Don't standardize the budget, use it exactly as provided
          tripUpdates.budget = data.budget;
          // Also update constraints.budget to ensure it's used by the itinerary generator
          if (!tripUpdates.constraints) tripUpdates.constraints = {};
          tripUpdates.constraints.budget = data.budget;
          hasUpdates = true;
          console.log(
            "[ModularProcessing] Using budget:",
            data.budget,
            "and updating constraints.budget"
          );
        }

        // Update trip details if we found any updates
        if (hasUpdates) {
          console.log("[ModularProcessing] Updating trip details with data:", {
            ...locationUpdates,
            ...tripUpdates,
          });
          const updatedTripDetails = updateTripDraft(tripDetails, {
            ...locationUpdates,
            ...tripUpdates,
          });
          setTripDetails(updatedTripDetails);

          // Trigger map update by transitioning to a state that will update the map
          // This ensures the map shows the newly set location
          if (locationUpdates.vacation_location) {
            console.log(
              "[ModularProcessing] Location detected, updating map view"
            );
            // If we're already in trip building mode, just update the state data
            if (conversationState === CONVERSATION_STATES.TRIP_BUILDING_MODE) {
              transitionState(CONVERSATION_STATES.TRIP_BUILDING_MODE, {
                updateMap: true,
                location: locationUpdates.vacation_location,
              });
            }
          }
        }
      }

      // NEW: Check if the model explicitly specified a next state to transition to
      if (extractedData?.data?.next_state) {
        const nextState = extractedData.data.next_state;
        const nextAction = extractedData?.data?.next_action;
        console.log(
          `[ModularProcessing] Model requested state transition to: ${nextState} with action: ${nextAction}`
        );

        // If model explicitly asks for AWAITING_USER_TRIP_CONFIRMATION state
        if (nextState === "AWAITING_USER_TRIP_CONFIRMATION") {
          console.log(
            "[ModularProcessing] Transitioning to AWAITING_USER_TRIP_CONFIRMATION as requested by model"
          );

          // Use the model's original response instead of the static template
          const responseMessage =
            extractedData?.data?.response ||
            "Does this trip information look correct? I'll create your travel itinerary based on these details.";

          // Replace loading message with the model's response for confirmation
          replaceLoadingMessage(loadingId, {
            role: "model",
            message: responseMessage,
            id: `trip-summary-${Date.now()}`,
            isTripSummary: true,
          });

          // Transition to confirmation state
          transitionState(CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION);
          return responseMessage;
        }

        // Handle other special states and actions
        if (
          nextState === "GENERATING_ITINERARY" &&
          nextAction === "generate_itinerary"
        ) {
          // Direct generation without confirmation (e.g., if user has already confirmed verbally)
          console.log(
            "[ModularProcessing] Directly generating itinerary as requested by model"
          );

          // Update UI first
          replaceLoadingMessage(loadingId, {
            role: "model",
            message:
              "I'll generate your personalized itinerary right away. This will take a moment...",
            id: `direct-generating-${Date.now()}`,
            isGenerating: true,
          });

          // Start generation process
          transitionState(CONVERSATION_STATES.GENERATING_ITINERARY);

          // Use setTimeout to allow the UI to update before the potentially heavy operation
          setTimeout(async () => {
            try {
              const itineraryResult = await generateItinerary(tripDetails);

              if (itineraryResult && itineraryResult.success) {
                setallTripData(itineraryResult);
                transitionState(
                  CONVERSATION_STATES.DISPLAYING_ITINERARY,
                  itineraryResult
                );
              } else {
                addSystemMessage(
                  "I apologize, but there was an error generating your itinerary. Please try again."
                );
                transitionState(CONVERSATION_STATES.TRIP_BUILDING_MODE);
              }
            } catch (error) {
              console.error(
                "[ModularProcessing] Error in direct itinerary generation:",
                error
              );
              addSystemMessage(
                "I apologize, but there was an error generating your itinerary. Please try again."
              );
              transitionState(CONVERSATION_STATES.TRIP_BUILDING_MODE);
            }
          }, 100);

          return "Generating your personalized itinerary...";
        }
      }

      // Check if this is an advice intent
      if (isAdviceIntent(intent)) {
        console.log("[ModularProcessing] Processing as advice intent");

        try {
          // Transition to FETCHING_EXTERNAL_DATA state to show loading indicator
          if (requiresExternalData(intent)) {
            console.log(
              `[ModularProcessing] ${intent} requires external data, transitioning to FETCHING_EXTERNAL_DATA`
            );
            transitionState(CONVERSATION_STATES.FETCHING_EXTERNAL_DATA);

            // Update parallel data fetch state for loading UI
            setParallelDataFetch({
              inProgress: true,
              intent: intent,
              data: data,
              result: null,
            });

            // Replace loading message with external data fetching indicator
            replaceLoadingMessage(loadingId, {
              role: "model",
              message: getExternalDataLoadingMessage(intent),
              id: loadingId,
              isLoadingMessage: true,
              isExternalDataFetch: true,
            });
          }

          const adviceResult = await processAdviceIntent({
            userMessage: userMessage || "",
            intent,
            data,
            tripContext: tripDetails,
            userProfile: getUserProfileData(intent),
            enableRAG: true,
          });

          console.log(
            `[ModularProcessing] Advice result for ${intent}:`,
            adviceResult
          );
          console.log(
            `[ModularProcessing] Advice result success:`,
            adviceResult?.success
          );
          console.log(
            `[ModularProcessing] Advice result needsFollowUp:`,
            adviceResult?.needsFollowUp
          );
          console.log(
            `[ModularProcessing] Advice result response:`,
            adviceResult?.response?.substring(0, 100) + "..."
          );
          console.log(
            `[ModularProcessing] Advice result message:`,
            adviceResult?.message?.substring(0, 100) + "..."
          );

          // ALWAYS clear external data fetch state regardless of result
          setParallelDataFetch({
            inProgress: false,
            intent: null,
            data: null,
            result: null,
          });

          // NEW: Check for state transition information from the advice handler
          if (adviceResult?.stateTransition) {
            console.log(
              `[ModularProcessing] State transition requested:`,
              adviceResult.stateTransition
            );

            // Get the requested state transition
            const {
              nextState,
              nextAction,
              intent: transitionIntent,
              requiredFields,
            } = adviceResult.stateTransition;

            // Map the nextState to a valid CONVERSATION_STATES value
            let targetState;
            switch (nextState) {
              case "AWAITING_MISSING_INFO":
                targetState = CONVERSATION_STATES.AWAITING_MISSING_INFO;
                break;
              case "ADVISORY_MODE":
                targetState = CONVERSATION_STATES.ADVISORY_MODE;
                break;
              case "FETCHING_EXTERNAL_DATA":
                targetState = CONVERSATION_STATES.FETCHING_EXTERNAL_DATA;
                break;
              default:
                // If unknown state requested, default to ADVISORY_MODE
                targetState = CONVERSATION_STATES.ADVISORY_MODE;
            }

            // If we have missing fields to collect, update the missingFieldsState
            if (
              nextAction === "collect_missing_fields" &&
              requiredFields?.length > 0
            ) {
              console.log(
                `[ModularProcessing] Setting missing fields state with fields:`,
                requiredFields
              );

              // Check if we already have a form with the same fields to prevent duplicates
              const hasDuplicateForm = pendingMessages.some(
                (msg) =>
                  msg.isMissingFields &&
                  msg.missingFields?.length === requiredFields.length &&
                  msg.missingFields.every((field) =>
                    requiredFields.includes(field)
                  )
              );

              if (hasDuplicateForm) {
                console.log(
                  `[ModularProcessing] Duplicate form detected, not creating another one`
                );
              } else {
                // Use the messageId from adviceHandler if available, or generate a new one
                const messageId =
                  adviceResult.stateTransition.messageId ||
                  `missing-fields-${Date.now()}`;
                console.log(
                  `[ModularProcessing] Using messageId: ${messageId}`
                );

                setMissingFieldsState({
                  fields: requiredFields,
                  values: {},
                  messageId: messageId,
                  intent: transitionIntent,
                  submitted: false,
                });
              }
            }

            // Transition to the requested state
            console.log(`[ModularProcessing] Transitioning to ${targetState}`);
            transitionState(targetState);
          }
          // ALWAYS transition back from FETCHING_EXTERNAL_DATA if we were in that state
          // and no specific state transition was requested
          else if (
            conversationState === CONVERSATION_STATES.FETCHING_EXTERNAL_DATA
          ) {
            transitionState(CONVERSATION_STATES.ADVISORY_MODE);
          }

          // Handle advice results - both successful and failed ones with messages
          let finalAdviceResponse = responseText; // Default to original response

          // תיקון: בדיקה אם יש תשובה ישירות בנתונים המקוריים כשהכוונה לא דורשת נתונים חיצוניים
          // Check if we have external data to display for any intent
          if (
            (window.__weatherResponseData &&
              window.__forceWeatherResponse &&
              isWeatherIntent(intent)) ||
            (window.__restaurantsResponseData &&
              window.__forceRestaurantsResponse &&
              intent === "Find-Restaurants") ||
            (window.__externalDataResponse && window.__forceExternalDataDisplay)
          ) {
            // Determine which data to use
            let responseData;
            let responseType;

            if (isWeatherIntent(intent) && window.__weatherResponseData) {
              responseData = window.__weatherResponseData;
              responseType = "weather";
              console.log(
                `[ModularProcessing] Using cached weather data response`
              );
              window.__forceWeatherResponse = false;
              window.__weatherResponseDisplayed = true;
            } else if (
              intent === "Find-Restaurants" &&
              window.__restaurantsResponseData
            ) {
              responseData = window.__restaurantsResponseData;
              responseType = "restaurants";
              console.log(
                `[ModularProcessing] Using cached restaurants data response`
              );
              window.__forceRestaurantsResponse = false;
              window.__restaurantsResponseDisplayed = true;
            } else if (intent === "Find-Hotel" && window.__hotelsResponseData) {
              responseData = window.__hotelsResponseData;
              responseType = "hotels";
              console.log(
                `[ModularProcessing] Using cached hotels data response`
              );
              window.__forceHotelsResponse = false;
              window.__hotelsResponseDisplayed = true;
            } else if (
              intent === "Find-Attractions" &&
              window.__attractionsResponseData
            ) {
              responseData = window.__attractionsResponseData;
              responseType = "attractions";
              console.log(
                `[ModularProcessing] Using cached attractions data response`
              );
              window.__forceAttractionsResponse = false;
              window.__attractionsResponseDisplayed = true;
            } else {
              responseData = window.__externalDataResponse;
              responseType = "external";
              console.log(
                `[ModularProcessing] Using cached external data response`
              );
              window.__forceExternalDataDisplay = false;
              window.__externalDataDisplayed = true;
            }

            // Replace loading message with actual response
            replaceLoadingMessage(loadingId, {
              role: "model",
              message: responseData,
              id: loadingId,
              isAdviceResponse: true,
              isExternalDataResponse: true,
              responseType: responseType,
            });

            finalAdviceResponse = responseData;

            // Clear the cache after using it
            setTimeout(() => {
              if (responseType === "weather")
                window.__weatherResponseData = null;
              else if (responseType === "restaurants")
                window.__restaurantsResponseData = null;
              else if (responseType === "hotels")
                window.__hotelsResponseData = null;
              else if (responseType === "attractions")
                window.__attractionsResponseData = null;
              else window.__externalDataResponse = null;
            }, 500);
          } else if (
            extractedData?.data?.response &&
            (!intentRequiresExternalData(intent) ||
              extractedData?.data?.requires_external_data === false)
          ) {
            // במקרה של כוונות שאינן דורשות נתונים חיצוניים, השתמש ישירות בתשובה מהמודל
            console.log(
              `[ModularProcessing] Using direct response from model for ${intent}`
            );

            replaceLoadingMessage(loadingId, {
              role: "model",
              message: extractedData.data.response,
              id: loadingId,
              isAdviceResponse: true,
            });

            finalAdviceResponse = extractedData.data.response;
          } else if (adviceResult?.needsFollowUp) {
            // This is a follow-up question, not an error
            console.log(
              `[ModularProcessing] Showing follow-up question, replacing loadingId: ${loadingId}`
            );
            replaceLoadingMessage(loadingId, {
              role: "model",
              message: adviceResult.followUpQuestion,
              id: loadingId, // Keep the same ID!
              isFollowUpQuestion: true,
            });

            finalAdviceResponse = adviceResult.followUpQuestion;
          } else if (adviceResult?.response) {
            // Successful response
            console.log(
              `[ModularProcessing] Showing successful response, replacing loadingId: ${loadingId}`
            );
            replaceLoadingMessage(loadingId, {
              role: "model",
              message: adviceResult.response,
              id: loadingId, // Keep the same ID!
              isAdviceResponse: true,
            });

            finalAdviceResponse = adviceResult.response;

            // Update user profile if we have new data
            if (adviceResult.extractedData) {
              updateUserProfile(intent, adviceResult.extractedData);
            }
          } else if (adviceResult?.message) {
            // Response with message (could be success or failure)
            console.log(
              `[ModularProcessing] Showing message response, replacing loadingId: ${loadingId}`
            );
            replaceLoadingMessage(loadingId, {
              role: "model",
              message: adviceResult.message,
              id: loadingId, // Keep the same ID!
              isAdviceResponse: true,
            });

            finalAdviceResponse = adviceResult.message;
          } else {
            // שיפור הודעת השגיאה כך שתשתמש בתוכן המקורי אם קיים
            const fallbackMessage =
              extractedData?.data?.response ||
              extractedData?.formattedResponse ||
              responseText ||
              "I received the information but had trouble formatting it. Please try asking again.";

            console.warn(
              "[ModularProcessing] Unexpected advice result format:",
              adviceResult
            );
            console.log(
              `[ModularProcessing] Showing fallback message, replacing loadingId: ${loadingId}`
            );

            replaceLoadingMessage(loadingId, {
              role: "model",
              message: fallbackMessage,
              id: loadingId, // Keep the same ID!
            });

            finalAdviceResponse = fallbackMessage;
          }

          // Return the final response for database saving
          return finalAdviceResponse;
        } catch (error) {
          console.error(
            "[ModularProcessing] Error processing advice intent:",
            error
          );

          // ALWAYS clear external data fetch state on error
          setParallelDataFetch({
            inProgress: false,
            intent: null,
            data: null,
            result: null,
          });

          // ALWAYS transition back from fetching state on error
          if (
            conversationState === CONVERSATION_STATES.FETCHING_EXTERNAL_DATA
          ) {
            transitionState(CONVERSATION_STATES.IDLE);
          }

          const errorMessage = `Sorry, I encountered an error while fetching ${intent
            .replace("-", " ")
            .toLowerCase()} information. Please try again.`;

          replaceLoadingMessage(loadingId, {
            role: "model",
            message: errorMessage,
            id: loadingId, // Keep the same ID!
          });

          // Return the error message for database saving
          return errorMessage;
        }
      }

      // Handle trip building intents
      if (
        intent === "Trip-Planning" ||
        intent === "Trip-Building" ||
        intent === "Build-Trip"
      ) {
        console.log("[ModularProcessing] Processing trip building intent");
        await handleTripBuildingIntent(data, responseText, loadingId);
        return responseText; // Return original response for trip building
      }

      // Handle confirmation intents
      if (detectUserConfirmation(userMessage || "", data, conversationState)) {
        console.log("[ModularProcessing] User confirmation detected");
        await handleUserConfirmation(
          data,
          responseText,
          loadingId,
          extractedData
        );
        return responseText; // Return original response for confirmations
      }

      // Default handling
      // Ensure we're only showing the response field, not the entire JSON structure
      const messageToShow =
        extractedData?.data?.response ||
        extractedData?.formattedResponse ||
        (typeof responseText === "string"
          ? responseText
          : JSON.stringify(responseText));

      console.log(
        `[ModularProcessing] Default handling, replacing loadingId: ${loadingId}`
      );
      replaceLoadingMessage(loadingId, {
        role: "model",
        message: messageToShow,
        id: loadingId, // Keep the same ID!
      });

      return messageToShow; // Return the message that was shown
    },
    [
      getRelevantContext,
      isAdviceIntent,
      requiresExternalData,
      transitionState,
      CONVERSATION_STATES,
      setParallelDataFetch,
      replaceLoadingMessage,
      processAdviceIntent,
      tripDetails,
      getUserProfileData,
      updateUserProfile,
      conversationState,
      detectUserConfirmation,
      handleTripBuildingIntent,
      handleUserConfirmation,
      updateConversationMemory,
      setTripDetails,
      formatTripSummary,
      pendingMessages,
      setMissingFieldsState,
      intentRequiresExternalData,
    ]
  );

  /**
   * Error handling with modular logging
   */
  const handleProcessingError = useCallback(
    (error) => {
      console.error("[ModularProcessing] Processing error:", error);

      addSystemMessage(
        "I apologize, but I encountered an issue processing your request. Please try rephrasing your message or contact support if the problem persists."
      );

      clearLoadingMessages();
    },
    [addSystemMessage, clearLoadingMessages]
  );

  /**
   * Get conversation statistics using modular memory
   */
  const getConversationStats = useCallback(() => {
    return {
      totalMessages: pendingMessages.length,
      conversationMemory: conversationMemory,
      lastIntent: conversationMemory.intents[0] || null,
      memorySize: Object.keys(conversationMemory.entities).length,
    };
  }, [pendingMessages, conversationMemory]);

  /**
   * UPDATED: Enhanced user input processing with modular utilities
   */
  const processUserInput = useCallback(
    async (userMessage, imageData = null) => {
      if (!userMessage?.trim()) {
        console.log("Empty message, skipping processing");
        return;
      }

      console.log(
        `[ModularProcessing] Processing user input: "${userMessage}"`
      );

      try {
        // Check if this message is a response to missing fields request
        const isMissingFieldsResponse =
          missingFieldsState.fields.length > 0 &&
          missingFieldsState.fields.some((field) =>
            userMessage.includes(`${field}:`)
          );

        // Special handling for form data or date strings
        let directFormData = {};

        // Check for date patterns in the message for direct processing
        const extractedDates = extractDatesFromMessage(userMessage);
        if (extractedDates) {
          directFormData.dates = extractedDates;
          console.log(
            "[ModularProcessing] Extracted dates from message:",
            directFormData.dates
          );
        }

        // Use modular acknowledgment detection
        if (!isMissingFieldsResponse && isAcknowledgmentMessage(userMessage)) {
          console.log(
            "[ModularProcessing] Detected acknowledgment message, adding simple response"
          );
          addSystemMessage(
            "You're welcome! Is there anything else I can help you with?"
          );
          return;
        }

        // Pre-process user message for direct pattern matching
        const directTripData = extractDirectTripData(userMessage);
        if (directTripData && Object.keys(directTripData).length > 0) {
          console.log(
            "[ModularProcessing] Directly extracted trip data:",
            directTripData
          );

          // Merge with any dates we found
          const combinedDirectData = {
            ...directTripData,
            ...directFormData,
          };

          // Update trip details with directly extracted data
          const updatedTripDetails = updateTripDraft(
            tripDetails,
            combinedDirectData
          );
          setTripDetails(updatedTripDetails);
        } else if (directFormData && Object.keys(directFormData).length > 0) {
          // If we have form data but no other direct data, update with just the form data
          const updatedTripDetails = updateTripDraft(
            tripDetails,
            directFormData
          );
          setTripDetails(updatedTripDetails);
        }

        // RESTORED: Add the user message to pending messages first (like original code)
        setPendingMessages((prev) => [
          ...prev,
          {
            role: "user",
            message: userMessage,
            id: `user-${Date.now()}`,
            img: imageData?.dbData?.filePath || null,
            timestamp: new Date().toISOString(),
          },
        ]);

        console.log(
          "[ModularProcessing] Added user message to display, now processing..."
        );

        setIsTyping(true);
        const loadingId = addLoadingMessage();

        // Initialize chat if needed
        if (!chatRef.current) {
          const initSuccess = initializeChat();
          if (!initSuccess) {
            throw new Error("Failed to initialize chat");
          }
        }

        // If this is a missing fields response, process it differently
        if (isMissingFieldsResponse && missingFieldsState.fields.length > 0) {
          console.log("[ModularProcessing] Processing missing fields response");

          // Extract field values from the message
          const fieldValues = {};
          missingFieldsState.fields.forEach((field) => {
            const regex = new RegExp(`${field}:\\s*([^,]+)`, "i");
            const match = userMessage.match(regex);
            if (match && match[1]) {
              // Special handling for dates to create proper object
              if (field === "dates" && match[1].includes(" to ")) {
                const [from, to] = match[1]
                  .trim()
                  .split(" to ")
                  .map((d) => d.trim());
                fieldValues[field] = { from, to };
                console.log(
                  "[ModularProcessing] Extracted date range:",
                  fieldValues[field]
                );
              } else {
                fieldValues[field] = match[1].trim();
              }
            }
          });

          console.log(
            "[ModularProcessing] Extracted field values:",
            fieldValues
          );

          // Update trip details directly with the extracted field values
          if (Object.keys(fieldValues).length > 0) {
            const updatedTripDetails = updateTripDraft(
              tripDetails,
              fieldValues
            );
            setTripDetails(updatedTripDetails);
            console.log(
              "[ModularProcessing] Updated trip details from form:",
              updatedTripDetails
            );
          }

          // Update missing fields state with the extracted values
          setMissingFieldsState((prev) => ({
            ...prev,
            values: { ...prev.values, ...fieldValues },
          }));
        }

        // Send message to AI
        const result = await chatRef.current.sendMessage(userMessage);
        const response = result.response;
        const responseText = response.text();

        console.log("[ModularProcessing] Raw AI response:", responseText);

        // Extract structured data using existing utility
        const extractedData = extractStructuredDataFromResponse(responseText);
        console.log("[ModularProcessing] Extracted data:", extractedData);

        // NEW: Save messages to database (preserving original functionality)
        let finalResponseText = responseText;

        // Check if we successfully extracted structured data with valid intent and data
        if (
          extractedData?.success &&
          extractedData?.data?.intent &&
          extractedData?.data
        ) {
          // NEW: Use modular intent processing
          const intent = sanitizeIntent(extractedData.data.intent);
          const contextAnalysis = analyzeMessageContext(
            userMessage,
            conversationMemory.intents[0],
            conversationMemory
          );

          console.log("[ModularProcessing] Clean intent:", intent);
          console.log("[ModularProcessing] Context analysis:", contextAnalysis);

          // NEW: Use modular data transformation
          console.log(
            "[ModularProcessing] Original extractedData.data:",
            extractedData.data
          );

          const data = normalizeDataStructure(extractedData.data, tripDetails);
          console.log(
            "[ModularProcessing] After normalizeDataStructure:",
            data
          );

          const processedData = processTimeReferences(data);
          console.log(
            "[ModularProcessing] After processTimeReferences:",
            processedData
          );

          // Enhance data with direct extracted values
          if (directTripData && Object.keys(directTripData).length > 0) {
            console.log(
              "[ModularProcessing] Enhancing AI data with direct extractions"
            );
            Object.keys(directTripData).forEach((key) => {
              if (!processedData[key] && directTripData[key] !== undefined) {
                processedData[key] = directTripData[key];
              }
            });
          }

          const cleanedData = validateAndCleanData(processedData);
          console.log(
            "[ModularProcessing] Final cleanedData being passed to handleProcessedIntent:",
            cleanedData
          );

          // Update conversation memory
          updateConversationMemory(intent, data);

          // Handle the processed intent and data
          finalResponseText = await handleProcessedIntent(
            intent,
            cleanedData,
            extractedData?.data?.response || responseText, // Use the response field if available
            loadingId,
            userMessage,
            extractedData
          );
        } else {
          // Handle as general response - no structured data found or extraction failed
          console.log(
            "[ModularProcessing] No structured data found, displaying raw response"
          );

          // Ensure we're only showing the response field, not the entire JSON structure
          let messageToShow = responseText;

          try {
            // Check if responseText is a JSON string
            const parsedResponse = JSON.parse(responseText);
            if (parsedResponse && typeof parsedResponse === "object") {
              // If it's a JSON object, try to extract the response field
              messageToShow =
                parsedResponse.response ||
                parsedResponse.message ||
                parsedResponse.text ||
                responseText;
            }
          } catch (e) {
            // Not a JSON string, use as is
            messageToShow = responseText;
          }

          replaceLoadingMessage(loadingId, {
            role: "model",
            message: messageToShow,
            id: `response-${Date.now()}`,
          });

          finalResponseText = messageToShow;
        }

        // NEW: Save both user message and AI response to database
        try {
          // Only save if we have a meaningful response
          if (finalResponseText && finalResponseText.trim()) {
            console.log("[Database] Saving conversation to database...");

            // Ensure we're not saving a JSON object as the response
            let cleanResponseText = finalResponseText;
            if (typeof cleanResponseText !== "string") {
              cleanResponseText = JSON.stringify(cleanResponseText);
            }

            // Check if cleanResponseText is a stringified JSON object
            try {
              const parsedResponse = JSON.parse(cleanResponseText);
              if (parsedResponse && typeof parsedResponse === "object") {
                // If it's a JSON object, extract the response field
                cleanResponseText =
                  parsedResponse.response ||
                  parsedResponse.message ||
                  parsedResponse.text ||
                  cleanResponseText;
              }
            } catch (e) {
              // Not a JSON string, use as is
            }

            const saveResult = await mutation.mutateAsync({
              userMessage,
              aiResponse: cleanResponseText,
              image: imageData?.dbData?.filePath || null, // Extract just the file path
            });

            if (saveResult) {
              console.log("[Database] Messages saved successfully");
            } else {
              console.warn("[Database] Failed to save messages:");
            }
          } else {
            console.log(
              "[Database] Skipping save - no meaningful response to save"
            );
          }
        } catch (saveError) {
          console.error("[Database] Error during message save:", saveError);
          // Don't throw - the conversation should continue even if save fails
        }

        if (
          extractedData?.success &&
          extractedData?.data?.missingFields &&
          extractedData.data.missingFields.length > 0
        ) {
          console.log(
            "[ModularProcessing] Found missing fields in extracted data:",
            extractedData.data.missingFields
          );

          // Get the detected intent or use a default
          const detectedIntent =
            extractedData.data.intent ||
            sanitizeIntent(extractedData.data.intent || "General-Query");

          // Make sure we have a valid AWAITING_MISSING_INFO state to transition to
          const targetState =
            CONVERSATION_STATES.AWAITING_MISSING_INFO ||
            CONVERSATION_STATES.COLLECT_MISSING_FIELD ||
            "awaiting_missing_info";

          console.log(
            `[ModularProcessing] Transitioning to missing fields state: ${targetState}`
          );

          // Switch to missing fields state
          transitionState(targetState);

          // Enhance missing fields - if we're asking for date, also ask for budget if not already present
          let enhancedMissingFields = [...extractedData.data.missingFields];

          // Check if we're asking for date and budget is missing
          const askingForDate = enhancedMissingFields.some(
            (field) => field === "date" || field === "dates"
          );

          // Check if budget fields are already included
          const budgetFieldIncluded = enhancedMissingFields.some(
            (field) => field === "budget" || field === "budget_level"
          );

          // Safe check for tripDetails being null or undefined
          const budgetMissing =
            !tripDetails ||
            (!tripDetails.budget &&
              !tripDetails.budget_level &&
              !(tripDetails.constraints && tripDetails.constraints.budget));

          // If asking for date and budget is not already included in the fields, add it
          // We always ask for budget when date is requested for a better user experience
          if (askingForDate && !budgetFieldIncluded) {
            console.log(
              "[ModularProcessing] Adding budget to missing fields since we're asking for date"
            );
            enhancedMissingFields.push("budget");
          }

          // Update missing fields state
          const newMissingFieldsState = {
            fields: enhancedMissingFields,
            values: {},
            messageId: `missing-fields-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 9)}`,
            intent: detectedIntent, // Include the intent
            submitted: false, // Add submitted field to prevent infinite loops
          };

          console.log(
            "[ModularProcessing] Setting missing fields state:",
            newMissingFieldsState
          );

          // Check if we already have a form with the same fields to prevent duplicates
          const hasDuplicateFields = pendingMessages.some(
            (msg) =>
              msg.isMissingFields &&
              msg.missingFields?.length === enhancedMissingFields.length &&
              msg.missingFields.every((field) =>
                enhancedMissingFields.includes(field)
              )
          );

          if (hasDuplicateFields) {
            console.log(
              "[ModularProcessing] Duplicate missing fields form detected, not updating state"
            );
          } else {
            setMissingFieldsState(newMissingFieldsState);
          }

          // Check if we already have a missing fields form in the pending messages
          // to prevent duplicates
          const hasMissingFieldsForm = pendingMessages.some(
            (msg) => msg.isMissingFields
          );

          if (!hasMissingFieldsForm) {
            // Add the missing fields form to pending messages
            const missingFieldsMessage = {
              role: "model",
              isMissingFields: true,
              missingFields: enhancedMissingFields,
              intent: detectedIntent, // Include the intent
              id: `missing-fields-${Date.now()}`,
            };

            console.log(
              "[ModularProcessing] Adding missing fields form to pending messages:",
              missingFieldsMessage
            );

            // IMPORTANT: Add the form in a way that doesn't trigger re-renders
            // that could cause infinite loops
            setTimeout(() => {
              setPendingMessages((prev) => {
                // Check one more time for duplicates before adding
                if (prev.some((msg) => msg.isMissingFields)) {
                  console.log(
                    "[ModularProcessing] Found existing form in pending messages, not adding a duplicate"
                  );
                  return prev;
                }

                console.log(
                  "[ModularProcessing] Actually adding missing fields form to pendingMessages"
                );
                return [...prev, missingFieldsMessage];
              });
            }, 0);
          } else {
            console.log(
              "[ModularProcessing] Missing fields form already exists, not adding a duplicate"
            );
          }

          // Make sure we're not showing typing indicator
          setIsTyping(false);
          return;
        }
      } catch (error) {
        console.error(
          "[ModularProcessing] Error processing user input:",
          error
        );
        handleProcessingError(error);
      } finally {
        setIsTyping(false);
      }
    },
    [
      chatRef,
      tripDetails,
      isAcknowledgmentMessage,
      addSystemMessage,
      setPendingMessages,
      addLoadingMessage,
      replaceLoadingMessage,
      updateConversationMemory,
      conversationMemory,
      sanitizeIntent,
      analyzeMessageContext,
      normalizeDataStructure,
      processTimeReferences,
      validateAndCleanData,
      handleProcessedIntent,
      handleProcessingError,
      setIsTyping,
      mutation,
      transitionState,
      missingFieldsState,
      setMissingFieldsState,
    ]
  );

  /**
   * Process initial message for new chats (specifically for ChatPage.jsx)
   * This function processes the first message in a new chat without adding a duplicate user message
   */
  const processInitialMessage = useCallback(
    async (initialMessage) => {
      console.log(
        "[ModularProcessing] Processing initial message:",
        initialMessage
      );

      if (!initialMessage?.trim()) {
        console.log("Empty initial message, skipping processing");
        return;
      }

      if (!chatRef.current || isTyping) {
        console.log("Chat not ready or already typing");
        return { success: false };
      }

      try {
        setIsTyping(true);

        // Initialize chat if needed
        if (!chatRef.current) {
          const initSuccess = initializeChat();
          if (!initSuccess) {
            throw new Error("Failed to initialize chat");
          }
        }

        // Send message to AI (this processes the message without adding it as a user message since it already exists in history)
        const result = await chatRef.current.sendMessage(initialMessage);
        const response = result.response;
        const responseText = response.text();

        console.log(
          "[ModularProcessing] Initial message AI response:",
          responseText
        );

        // Extract structured data using existing utility
        const extractedData = extractStructuredDataFromResponse(responseText);
        console.log(
          "[ModularProcessing] Initial message extracted data:",
          extractedData
        );

        let finalResponseText = responseText;

        // Check if we successfully extracted structured data with valid intent and data
        if (
          extractedData?.success &&
          extractedData?.data?.intent &&
          extractedData?.data
        ) {
          // NEW: Use modular intent processing
          const intent = sanitizeIntent(extractedData.data.intent);
          const contextAnalysis = analyzeMessageContext(
            initialMessage,
            conversationMemory.intents[0],
            conversationMemory
          );

          console.log(
            "[ModularProcessing] Initial message clean intent:",
            intent
          );
          console.log(
            "[ModularProcessing] Initial message context analysis:",
            contextAnalysis
          );

          // NEW: Use modular data transformation
          const data = normalizeDataStructure(extractedData.data, tripDetails);
          const processedData = processTimeReferences(data);
          const cleanedData = validateAndCleanData(processedData);

          // Update conversation memory
          updateConversationMemory(intent, data);

          // Check if this is an advice intent that needs special handling
          if (isAdviceIntent(intent)) {
            console.log(
              "[ModularProcessing] Initial message is advice intent, using handleProcessedIntent"
            );

            // Use handleProcessedIntent for advice intents to get proper external data handling
            try {
              finalResponseText = await handleProcessedIntent(
                intent,
                cleanedData,
                responseText,
                `initial-${Date.now()}`, // Create a temporary loading ID
                initialMessage,
                extractedData
              );

              // For advice intents, handleProcessedIntent already added the message to pendingMessages
              // so we don't need to add it again
              console.log(
                "[ModularProcessing] Advice intent handled, message already added to UI"
              );
            } catch (error) {
              console.error(
                "[ModularProcessing] Error handling initial advice intent:",
                error
              );
              finalResponseText = responseText; // Fallback to original response

              // In case of error, we still need to add a fallback message
              setPendingMessages([
                {
                  role: "model",
                  message: responseText,
                  id: `initial-fallback-${Date.now()}`,
                },
              ]);
            }
          } else {
            // For non-advice intents, use the existing logic
            if (extractedData?.data?.response) {
              finalResponseText = extractedData.data.response;
            } else if (extractedData?.formattedResponse) {
              finalResponseText = extractedData.formattedResponse;
            }

            // Add the message to pendingMessages for non-advice intents
            const messageToShow = finalResponseText || responseText;

            // Ensure we're not showing a JSON object
            let cleanMessageToShow = messageToShow;
            if (typeof cleanMessageToShow !== "string") {
              cleanMessageToShow = JSON.stringify(cleanMessageToShow);
            }

            // Check if cleanMessageToShow is a stringified JSON object
            try {
              const parsedResponse = JSON.parse(cleanMessageToShow);
              if (parsedResponse && typeof parsedResponse === "object") {
                // If it's a JSON object, extract the response field
                cleanMessageToShow =
                  parsedResponse.response ||
                  parsedResponse.message ||
                  parsedResponse.text ||
                  cleanMessageToShow;
              }
            } catch (e) {
              // Not a JSON string, use as is
            }

            setPendingMessages([
              {
                role: "model",
                message: cleanMessageToShow,
                id: `initial-response-${Date.now()}`,
              },
            ]);
          }
        } else {
          // No structured data found, add the raw response
          finalResponseText = responseText;

          // Ensure we're not showing a JSON object
          let cleanResponseText = responseText;
          if (typeof cleanResponseText !== "string") {
            cleanResponseText = JSON.stringify(cleanResponseText);
          }

          // Check if cleanResponseText is a stringified JSON object
          try {
            const parsedResponse = JSON.parse(cleanResponseText);
            if (parsedResponse && typeof parsedResponse === "object") {
              // If it's a JSON object, extract the response field
              cleanResponseText =
                parsedResponse.response ||
                parsedResponse.message ||
                parsedResponse.text ||
                cleanResponseText;
            }
          } catch (e) {
            // Not a JSON string, use as is
          }

          setPendingMessages([
            {
              role: "model",
              message: cleanResponseText,
              id: `initial-response-${Date.now()}`,
            },
          ]);
        }

        // Save AI response to database (initial message already exists in history)
        try {
          if (finalResponseText && finalResponseText.trim()) {
            console.log(
              "[Database] Saving initial message response to database..."
            );

            // Ensure we're not saving a JSON object
            let cleanFinalResponseText = finalResponseText;
            if (typeof cleanFinalResponseText !== "string") {
              cleanFinalResponseText = JSON.stringify(cleanFinalResponseText);
            }

            // Check if cleanFinalResponseText is a stringified JSON object
            try {
              const parsedResponse = JSON.parse(cleanFinalResponseText);
              if (parsedResponse && typeof parsedResponse === "object") {
                // If it's a JSON object, extract the response field
                cleanFinalResponseText =
                  parsedResponse.response ||
                  parsedResponse.message ||
                  parsedResponse.text ||
                  cleanFinalResponseText;
              }
            } catch (e) {
              // Not a JSON string, use as is
            }

            // FIXED: Don't send null userMessage - this causes server errors
            // For initial messages, we only save the AI response since the user message is already in history
            await mutation.mutateAsync({
              userMessage: "", // Send empty string instead of null
              aiResponse: cleanFinalResponseText,
              image: null, // No image data for initial messages
            });

            console.log(
              "[Database] Initial message response saved successfully"
            );
          } else {
            console.log(
              "[Database] Skipping initial message save - no meaningful response to save"
            );
          }
        } catch (saveError) {
          console.error(
            "[Database] Error during initial message save:",
            saveError
          );
          // Don't throw - the conversation should continue even if save fails
        }

        return { success: true };
      } catch (error) {
        console.error(
          "[ModularProcessing] Error processing initial message:",
          error
        );

        // Add error message to pending messages
        setPendingMessages([
          {
            role: "model",
            message:
              "Sorry, I encountered an error processing your request. Please try again.",
            id: `error-initial-${Date.now()}`,
          },
        ]);

        return { success: false, error };
      } finally {
        setIsTyping(false);
      }
    },
    [
      isTyping,
      setIsTyping,
      initializeChat,
      chatRef,
      extractStructuredDataFromResponse,
      sanitizeIntent,
      analyzeMessageContext,
      conversationMemory,
      normalizeDataStructure,
      tripDetails,
      processTimeReferences,
      validateAndCleanData,
      updateConversationMemory,
      setPendingMessages,
      mutation,
      isAdviceIntent,
      handleProcessedIntent,
    ]
  );

  // Initialize chat when component mounts or chatData changes
  useEffect(() => {
    if (
      chatData &&
      (!chatRef.current || chatSessionIdRef.current !== chatData._id)
    ) {
      console.log("[ModularProcessing] Initializing chat for new session");
      initializeChat();
    }
  }, [chatData, initializeChat]);

  // Register itinerary generator
  useEffect(() => {
    registerItineraryGenerator(async () => {
      console.log("[ModularProcessing] Registered itinerary generator called");
      if (tripDetails) {
        try {
          const result = await generateItinerary(tripDetails);
          if (result) {
            setallTripData(result);
            transitionState(CONVERSATION_STATES.DISPLAYING_ITINERARY, result);
          }
        } catch (error) {
          console.error(
            "[ModularProcessing] Error in registered generator:",
            error
          );
        }
      }
    });
  }, [
    registerItineraryGenerator,
    tripDetails,
    generateItinerary,
    setallTripData,
    transitionState,
    CONVERSATION_STATES,
  ]);

  /**
   * Process form values and convert to proper trip data format
   * @param {Object} formValues - Values from the missing fields form
   * @returns {Object} - Formatted data suitable for trip object
   */
  const processFormValues = (formValues) => {
    let processedData = { ...formValues };

    // First use the generic date processing from the core module
    processedData = processDateFormats(processedData);

    // Additional processing specific to form inputs
    // Process date string if it's in "YYYY-MM-DD to YYYY-MM-DD" format
    if (
      formValues.dates &&
      typeof formValues.dates === "string" &&
      formValues.dates.includes(" to ") &&
      !processedData.dates.from
    ) {
      const [from, to] = formValues.dates.split(" to ").map((d) => d.trim());
      processedData.dates = { from, to };
      console.log(
        "[FormProcessing] Converted date string to object:",
        processedData.dates
      );
    }

    console.log("[FormProcessing] Final processed form data:", processedData);
    return processedData;
  };

  // Modify the function that handles missing fields submissions
  // Register hook state globally for ChatPage access
  useEffect(() => {
    window.__processingHookState = {
      pendingMessages,
      setPendingMessages,
      isTyping,
      parallelDataFetch,
      addSystemMessage,
      clearLoadingMessages,
      addLoadingMessage,
      processInitialMessage,
      // Add setters for state management
      setIsTyping,
      setParallelDataFetch,
      conversationState,
      transitionState,
      // Add missing fields state and setter
      missingFieldsState,
      setMissingFieldsState,
      // Add CONVERSATION_STATES for transitions
      CONVERSATION_STATES,
      // Add a function to process missing fields submission
      processMissingFieldsSubmission: (formValues) => {
        console.log(
          "[MissingFields] Processing missing fields submission:",
          formValues
        );

        // Check if we have missing fields to process
        if (missingFieldsState.fields.length === 0) {
          console.log("[MissingFields] No missing fields to process");
          return false;
        }

        // Process form values to ensure correct data format
        const processedFormValues = processFormValues(formValues);
        console.log(
          "[MissingFields] Processed form values:",
          processedFormValues
        );

        // Update missing fields state with submitted values
        setMissingFieldsState((prev) => ({
          ...prev,
          values: {
            ...prev.values,
            ...processedFormValues,
          },
          submitted: true, // Mark as submitted to prevent re-rendering
        }));

        // Transition to fetching external data state
        console.log(
          "[MissingFields] Transitioning to FETCHING_EXTERNAL_DATA state"
        );
        transitionState(CONVERSATION_STATES.FETCHING_EXTERNAL_DATA);

        // Format field values properly to avoid [object Object] in the message
        const userMessage = missingFieldsState.fields
          .map((field) => {
            // Get the value for this field
            const value = processedFormValues[field];

            // Format the value based on its type
            let formattedValue = value;

            // Handle date objects (from/to format)
            if (value && typeof value === "object" && value.from) {
              // If it's a date range with both from and to, use a nice format
              if (value.to) {
                formattedValue = `${value.from} to ${value.to}`;
              } else {
                formattedValue = value.from;
              }
            }

            return `${field}: ${formattedValue}`;
          })
          .join(", ");

        // Check if this message already exists in pendingMessages to prevent duplicates
        const messageExists = pendingMessages.some(
          (msg) => msg.role === "user" && msg.message === userMessage
        );

        if (!messageExists) {
          // Add the message to the chat
          setPendingMessages((prev) => {
            // First remove any missing fields forms to prevent duplicates
            const filteredMessages = prev.filter((msg) => !msg.isMissingFields);

            // Then add the user message
            return [
              ...filteredMessages,
              {
                role: "user",
                message: userMessage,
                id: `user-${Date.now()}`,
                timestamp: new Date().toISOString(),
                isFormSubmission: true, // Mark as form submission
                formValues: processedFormValues, // Store processed values for processing
              },
            ];
          });
        } else {
          console.log(
            "[MissingFields] Message already exists, not adding duplicate"
          );
        }

        // Add a loading message to indicate processing
        const loadingId = addLoadingMessage();

        // Replace loading message with external data fetching indicator
        setTimeout(() => {
          // Get the intent from the missing fields state
          const intent = missingFieldsState.intent || "Find-Hotel"; // Default to Find-Hotel if no intent

          replaceLoadingMessage(loadingId, {
            role: "model",
            message: getExternalDataLoadingMessage(intent),
            id: loadingId,
            isLoadingMessage: true,
            isExternalDataFetch: true,
          });

          // Add processed values to trip details directly to ensure validation works correctly
          if (processedFormValues.dates || processedFormValues.budget) {
            console.log(
              "[MissingFields] Updating trip details with form data:",
              processedFormValues
            );

            // Make sure we preserve the budget value exactly as submitted
            if (processedFormValues.budget) {
              // Ensure we have constraints object
              if (!tripDetails.constraints) {
                tripDetails.constraints = {};
              }
              // Set both budget and constraints.budget to preserve the value
              tripDetails.constraints.budget = processedFormValues.budget;
            }

            const updatedTripDetails = updateTripDraft(
              tripDetails,
              processedFormValues
            );
            setTripDetails(updatedTripDetails);
          }

          // Process the message to fetch external data
          processUserInput(userMessage);

          // Ensure the budget value is preserved exactly as submitted
          if (processedFormValues.budget) {
            console.log(
              "[MissingFields] Preserving exact budget value:",
              processedFormValues.budget
            );

            // Update trip details directly to ensure the budget value is preserved
            setTimeout(() => {
              setTripDetails((currentDetails) => {
                // Ensure we have the constraints object
                const updatedDetails = { ...currentDetails };
                if (!updatedDetails.constraints) {
                  updatedDetails.constraints = {};
                }

                // Set both budget and constraints.budget to the exact value
                updatedDetails.budget = processedFormValues.budget;
                updatedDetails.constraints.budget = processedFormValues.budget;

                console.log(
                  "[MissingFields] Updated trip details with preserved budget:",
                  updatedDetails.budget
                );

                return updatedDetails;
              });
            }, 300);
          }

          // IMPORTANT: Reset missing fields state AFTER processing starts
          // This prevents infinite loops by ensuring the form isn't shown again
          setTimeout(() => {
            setMissingFieldsState({
              fields: [],
              values: {},
              messageId: null,
              submitted: true,
            });
          }, 500);
        }, 100);

        return true;
      },
    };
  }, [
    pendingMessages,
    setPendingMessages,
    isTyping,
    parallelDataFetch,
    addSystemMessage,
    clearLoadingMessages,
    addLoadingMessage,
    processInitialMessage,
    setIsTyping,
    setParallelDataFetch,
    conversationState,
    transitionState,
    // Add missing fields state and setter to dependencies
    missingFieldsState,
    setMissingFieldsState,
    CONVERSATION_STATES,
    // Add processUserInput to dependencies
    processUserInput,
    // Add replaceLoadingMessage to dependencies
    replaceLoadingMessage,
    getExternalDataLoadingMessage,
  ]);

  // Create a wrapper for transitionState that can handle string values
  const safeTransitionState = useCallback(
    (newState, contextData) => {
      // If newState is a string, try to map it to a CONVERSATION_STATES value
      if (typeof newState === "string" && CONVERSATION_STATES) {
        console.log(`[ModularProcessing] Handling string state: "${newState}"`);

        // Try to find a direct match first
        if (Object.values(CONVERSATION_STATES).includes(newState)) {
          console.log(
            `[ModularProcessing] Found direct match for "${newState}"`
          );
          transitionState(newState, contextData);
          return;
        }

        // Convert to lowercase for case-insensitive comparison with enum values
        const lowerState = newState.toLowerCase();

        // Find the matching state in CONVERSATION_STATES
        for (const [key, value] of Object.entries(CONVERSATION_STATES)) {
          if (value === lowerState) {
            console.log(
              `[ModularProcessing] Mapped string state "${newState}" to enum value ${key}`
            );
            transitionState(value, contextData);
            return;
          }
        }

        // If no match found but we have a state called AWAITING_MISSING_INFO, use that for "awaiting_missing_info"
        if (
          lowerState === "awaiting_missing_info" &&
          CONVERSATION_STATES.AWAITING_MISSING_INFO
        ) {
          console.log(
            `[ModularProcessing] Using AWAITING_MISSING_INFO state for "${newState}"`
          );
          transitionState(
            CONVERSATION_STATES.AWAITING_MISSING_INFO,
            contextData
          );
          return;
        }

        // If no match found but we have a state called FETCHING_EXTERNAL_DATA, use that for "fetching_external_data"
        if (
          lowerState === "fetching_external_data" &&
          CONVERSATION_STATES.FETCHING_EXTERNAL_DATA
        ) {
          console.log(
            `[ModularProcessing] Using FETCHING_EXTERNAL_DATA state for "${newState}"`
          );
          transitionState(
            CONVERSATION_STATES.FETCHING_EXTERNAL_DATA,
            contextData
          );
          return;
        }

        // If still no match, use ADVISORY_MODE as fallback
        console.log(
          `[ModularProcessing] No match found for "${newState}", using ADVISORY_MODE as fallback`
        );
        transitionState(CONVERSATION_STATES.ADVISORY_MODE, contextData);
      } else {
        // Otherwise, use the original function
        transitionState(newState, contextData);
      }
    },
    [transitionState, CONVERSATION_STATES]
  );

  // Register the safeTransitionState function in the global hook state
  useEffect(() => {
    if (window.__processingHookState) {
      window.__processingHookState.safeTransitionState = safeTransitionState;
    }
  }, [safeTransitionState]);

  // Return the complete hook interface (maintaining backward compatibility)
  return {
    // Message handling (from modular system)
    pendingMessages,
    setPendingMessages,
    updateWithDelay,
    replaceLoadingMessage,
    addSystemMessage,
    clearLoadingMessages,
    addLoadingMessage,

    // Main processing function
    processUserInput,

    // State and refs
    isTyping,
    setIsTyping,
    parallelDataFetch,
    setParallelDataFetch,
    chatRef,

    // Memory and context (from modular system)
    conversationMemory,
    updateConversationMemory,
    getRelevantContext,
    clearConversationMemory,

    // Statistics and debugging
    getConversationStats,

    // Utility functions (exposed for backward compatibility)
    sanitizeIntent,
    processTimeReferences,
    normalizeDataStructure,
    mergeWithExistingTripData,
    isAcknowledgmentMessage,
    detectUserConfirmation,

    // Initialize function
    initializeChat,

    // Additional utilities for backward compatibility
    detectTripConfirmationAction,
    debugTripData,

    // New function
    processInitialMessage,

    missingFieldsState,
    setMissingFieldsState,
  };
}
