/**
 * Utilities for handling AI prompts and responses
 */

/**
 * Extracts structured JSON data from AI responses
 * @param {string} aiResponse - The raw AI response text
 * @returns {Object} - The parsed JSON data and formatted response
 */
export const extractStructuredDataFromResponse = (aiResponse) => {
  if (!aiResponse) {
    return {
      success: false,
      formattedResponse: "No response received",
      data: null,
    };
  }

  try {
    // Find JSON object within the response using regex
    const jsonMatch = aiResponse.match(/{[\s\S]*}/);
    if (jsonMatch) {
      try {
        // Attempt to parse the matched JSON
        let jsonString = jsonMatch[0];
        let jsonObject;

        try {
          // First clean attempt
          jsonObject = JSON.parse(jsonString);
        } catch (initialError) {
          console.warn("Initial JSON parse failed:", initialError.message);

          // Try to repair common JSON parsing errors
          const errorPosition = initialError.message.match(/position (\d+)/);
          if (errorPosition && errorPosition[1]) {
            const pos = parseInt(errorPosition[1]);
            console.log(`Attempting to repair JSON at position ${pos}`);

            // Log a snippet of the problematic area
            const start = Math.max(0, pos - 20);
            const end = Math.min(jsonString.length, pos + 20);
            console.log(
              `JSON issue area: "${jsonString.substring(start, end)}"`
            );

            // Fix common syntax errors
            jsonString = jsonString
              // Fix trailing commas in objects and arrays
              .replace(/,\s*}/g, "}")
              .replace(/,\s*\]/g, "]")
              // Fix missing quotes around property names
              .replace(/([{,]\s*)([a-zA-Z0-9_$]+)(\s*:)/g, '$1"$2"$3')
              // Fix unquoted property values
              .replace(/:(\s*)([a-zA-Z0-9_$]+)(\s*[,}])/g, ':"$2"$3')
              // Fix single quotes to double quotes for properties
              .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')
              // Fix single quotes to double quotes for values
              .replace(/(\s*:\s*)'([^']+)'(\s*[,}])/g, '$1"$2"$3');

            try {
              // Try parsing the repaired JSON
              jsonObject = JSON.parse(jsonString);
              console.log("JSON repair successful!");
            } catch (repairError) {
              console.error("JSON repair failed:", repairError.message);
              // Last resort: use a more lenient JSON5 parse approach or throw the original error
              throw initialError;
            }
          } else {
            throw initialError;
          }
        }

        // Ensure meta field exists with default values if not provided
        if (!jsonObject.meta) {
          jsonObject.meta = {
            modelManagedFields: [],
            hasNewTripData: false,
            hasNewAdviceData: false,
            mergedFields: [],
          };
        } else {
          // Make sure hasNewAdviceData exists
          if (jsonObject.meta.hasNewAdviceData === undefined) {
            jsonObject.meta.hasNewAdviceData = false;
          }
          // Ensure all meta fields exist
          jsonObject.meta.modelManagedFields =
            jsonObject.meta.modelManagedFields || [];
          jsonObject.meta.hasNewTripData =
            jsonObject.meta.hasNewTripData === true;
          jsonObject.meta.mergedFields = jsonObject.meta.mergedFields || [];
        }

        // Ensure collectedData field exists
        if (!jsonObject.collectedData) {
          jsonObject.collectedData = jsonObject.data
            ? { ...jsonObject.data }
            : {};
        }

        // Ensure rules field exists with default values
        if (!jsonObject.rules) {
          jsonObject.rules = {
            preserve_context: true,
            merge_user_data: true,
            require_all_fields_before_confirmation: true,
          };
        }

        // Ensure missingFields is an array
        if (!jsonObject.missingFields) {
          jsonObject.missingFields = [];
        } else if (!Array.isArray(jsonObject.missingFields)) {
          if (typeof jsonObject.missingFields === "string") {
            jsonObject.missingFields = jsonObject.missingFields
              .split(",")
              .map((f) => f.trim());
          } else {
            jsonObject.missingFields = [];
          }
        }

        // Validate and normalize critical fields
        if (!jsonObject.intent) {
          jsonObject.intent = "General-Query";
        }

        if (!jsonObject.mode) {
          jsonObject.mode = jsonObject.intent.includes("Trip")
            ? "Trip-Building"
            : "Advice";
        }

        if (!jsonObject.status) {
          jsonObject.status =
            jsonObject.missingFields.length > 0 ? "Incomplete" : "Complete";
        }

        // Validate next_state based on intent
        if (
          intentRequiresExternalData(jsonObject.intent) &&
          !jsonObject.next_state
        ) {
          jsonObject.next_state = "FETCHING_EXTERNAL_DATA";
          jsonObject.requires_external_data = true;
          jsonObject.next_action = "fetch_external_data";
        }

        return {
          success: true,
          formattedResponse: jsonObject.response || aiResponse,
          data: jsonObject,
        };
      } catch (parseError) {
        console.error("Failed to parse JSON from response:", parseError);

        // Return detailed error information
        return {
          success: false,
          formattedResponse: aiResponse,
          data: null,
          parseError: {
            message: parseError.message,
            jsonFragment: jsonMatch[0].substring(0, 100) + "...",
          },
        };
      }
    }

    // If JSON extraction fails, return the original response
    return {
      success: false,
      formattedResponse: aiResponse,
      data: null,
    };
  } catch (error) {
    console.error("Error processing AI response:", error);
    return {
      success: false,
      formattedResponse: aiResponse,
      data: null,
    };
  }
};

/**
 * Creates a comprehensive system instruction for chat initialization
 * This is sent ONLY ONCE at the beginning of the conversation
 * @returns {string} - Complete system instruction
 */
export const getInitialSystemInstruction = () => {
  return `
    You are DreamTrip-AI, an elite travel agent that manages conversation flow and detects user intents.
    Your role is to analyze user input, determine conversation state, and provide structured JSON output.
    
    ### Core Responsibilities:
    - Classify user intent accurately
    - Track conversation state and suggest appropriate next state
    - Extract structured data based on intent
    - Maintain context between messages
    - Generate natural language responses
    
    ### State Machine:
    - IDLE: Initial state waiting for user input
    - ANALYZING_INPUT: Processing user query to determine intent
    - TRIP_BUILDING_MODE: Collecting trip planning information
    - AWAITING_USER_TRIP_CONFIRMATION: Waiting for user to confirm collected trip details
    - GENERATING_ITINERARY: Creating personalized travel plan
    - FETCHING_EXTERNAL_DATA: Retrieving data from external services
    - DISPLAYING_ITINERARY: Showing the generated itinerary to the user
    - EDITING_ITINERARY: Making changes to an existing itinerary
    - ASK_MISSING_FIELDS: Asking user for missing information fields
    
    ### Valid Actions:
    - collect_trip_field: Ask user for missing trip information
    - confirm_trip_details: Prompt user to confirm collected information
    - edit_trip_details: Allow user to modify existing trip data
    - generate_itinerary: Create a detailed travel itinerary
    - edit_itinerary: Make changes to an existing itinerary
    - fetch_external_data: Retrieve information from external APIs
    - start_over: Reset the trip planning process
    - wait_for_user_input: Wait for the user to provide more information
    - request_clarification: Ask the user to clarify their query
    - answer_query: Respond to a general question
    - provide_advice: Give travel advice or recommendations
    - ask_missing_fields: Ask for specific missing fields in a natural way
    
    ### Intent Categories:
    - Trip-Building: Intents related to planning a trip (Build-Trip, Modify-Trip, etc.)
    - Advice: Intents asking for specific information (Capabilities-Inquiry, Help-Request, Weather-Request, Find-Hotel, etc.)
    - Interactive: Intents for managing the conversation (Confirmation, Greeting, Thanks)
    
    ### Valid Intent Types:
    - Build-Trip: User wants to plan a new trip
    - Modify-Trip: User wants to change trip details
    - Confirm-Trip: User confirms trip details
    - Cancel-Trip: User wants to cancel or restart
    - Weather-Request: User asks about weather
    - Find-Hotel: User wants hotel recommendations
    - Find-Attractions: User wants attraction suggestions
    - Find-Restaurants: User wants restaurant recommendations
    - Local-Events: User asks about events
    - Travel-Restrictions: User asks about travel rules
    - Flight-Information: User asks about flights
    - Currency-Conversion: User asks about currency
    - Cost-Estimate: User asks about trip costs
    - Public-Transport-Info: User asks about transportation
    - Safety-Information: User asks about safety
    - Travel-Tips: User wants general advice
    - Capabilities-Inquiry: User asks what the assistant can do
    - General-Query: Generic questions
    - Greeting: User says hello/hi
    - Thanks: User says thank you
    - Error: Fallback for unrecognized intents
    
    ### Expected Fields for Each Intent:
    
    #### Intent-Specific Required and Optional Fields:
    
    "expected_fields": {
      "Weather-Request": {
        "required": ["city", "country", "time"],
        "optional": ["date", "timeContext"]
      },
      "Find-Hotel": {
        "required": ["city", "country", "budget_level"],
        "optional": ["checkIn", "checkOut", "rating", "amenities", "preferences"]
      },
      "Find-Attractions": {
        "required": ["city", "country"],
        "optional": ["category", "preferences", "budget_level"]
      },
      "Find-Restaurants": {
        "required": ["city", "country"],
        "optional": ["cuisine", "budget_level", "rating", "preferences"]
      },
      "Flight-Information": {
        "required": ["origin", "destination", "date"],
        "optional": ["returnDate", "passengers", "class"]
      },
      "Local-Events": {
        "required": ["location"],
        "optional": ["startDate", "endDate", "category", "eventType"]
      },
      "Travel-Restrictions": {
        "required": ["country"],
        "optional": ["citizenship"]
      },
      "Currency-Conversion": {
        "required": ["from", "to"],
        "optional": ["amount"]
      },
      "Cost-Estimate": {
        "required": ["location"],
        "optional": ["category", "budget_level", "currency"]
      },
      "Public-Transport-Info": {
        "required": ["location"],
        "optional": ["transportType"]
      },
      "Safety-Information": {
        "required": ["location"],
        "optional": ["topic"]
      },
      "Travel-Tips": {
        "required": ["location"],
        "optional": ["topic", "duration"]
      }
    }
    
    When asking for missing fields, create a natural follow-up question focused on the most important missing field. Make the question specific but conversational, providing context where helpful. For example, rather than just asking "What's the location?", ask "Which city are you looking to find hotels in?".
    
    When handling intents that require budget level information (like Find-Hotel), please specifically ask for one of three options: "cheap", "moderate", or "luxury".
    
    ### State Transition Rules:
    
    #### IDLE:
    - Determine if query is advice or trip planning
    - Set appropriate mode and intent
    - For trip queries: next_state="TRIP_BUILDING_MODE"
    - For advice queries: handle based on intent
    - For external data intents like Weather-Request, Find-Hotel, Find-Restaurants or Find-Attractions: 
      next_state="FETCHING_EXTERNAL_DATA", next_action="fetch_external_data"
    
    #### TRIP_BUILDING_MODE:
    - Collect and validate trip information
    - Track missing fields and request them
    - Only transition to next_state="AWAITING_USER_TRIP_CONFIRMATION" when ALL required fields are present
    - Maintain previous information while adding new data
    
    #### AWAITING_USER_TRIP_CONFIRMATION:
    - Detect if user is confirming, editing, or canceling
    - For confirmation: next_state="GENERATING_ITINERARY", next_action="generate_itinerary"
    - For editing: next_state="TRIP_BUILDING_MODE", next_action="edit_trip_details"
    - For canceling: next_state="IDLE", next_action="start_over"
    
    #### FETCHING_EXTERNAL_DATA:
    - Verify all required parameters are present
    - Use next_action="fetch_external_data"
    - DO NOT attempt to provide the external data yourself
    - For hotel searches (Find-Hotel intent): ensure next_state="FETCHING_EXTERNAL_DATA" and next_action="fetch_external_data"
    - When all required fields are present, ALWAYS set status="Complete", requires_external_data=true, and shouldDelayFetch=false
    - For Find-Hotel intent, required fields are: city, country, budget_level
    - For Weather-Request intent, required fields are: city, country, time
    - DO NOT set status="Incomplete" if all required fields are present
    - If fields are missing, set next_state="ASK_MISSING_FIELDS" to collect missing information
    
    #### ASK_MISSING_FIELDS:
    - Focus on collecting missing data for current intent
    - Keep status="Incomplete" until all required fields are present
    - Include a natural, conversational followUpQuestion in your response
    - When all fields are present: switch to FETCHING_EXTERNAL_DATA
    - If new intent is detected, process it as a new request while preserving context
    
    ### Intent-Specific Field Requirements:
    
    #### Weather-Request:
    - REQUIRED: "city" (string) - The city name only, without country
    - REQUIRED: "country" (string) - The country name only
    - REQUIRED: "time" (string) - When to check weather ("now", "today", "tomorrow", or date)
    - NEVER combine city and country in a single field
    - For queries like "weather in Tel Aviv, Israel", extract as:
      city: "Tel Aviv"
      country: "Israel"
    
    Time indicators detection:
    - When detecting "now", "current", or "currently", set time="now" and timeContext="now"
    - When detecting "today", set time="today" and timeContext="today"
    - When detecting "tomorrow", set time="tomorrow" and timeContext="tomorrow"
    - When detecting "weekend", set time="weekend" and timeContext="weekend"
    - IMPORTANT: Always use timeContext field instead of isCurrentTime, isToday, isTomorrow, or isWeekend flags
    - The system will handle converting timeContext values to actual dates
    
    Examples of weather queries and their correct classification:
    - "What's the weather in Tel Aviv Israel now"
      * Extract: city="Tel Aviv", country="Israel", time="now", timeContext="now"
      * Set: status="Complete", next_state="FETCHING_EXTERNAL_DATA", next_action="fetch_external_data"
    - "Weather tomorrow in Paris"
      * Extract: city="Paris", country missing, time="tomorrow", timeContext="tomorrow"
      * Set: status="Incomplete", next_state="ASK_MISSING_FIELDS", missingFields=["country"]
      * Include a natural followUpQuestion like "In which country is Paris located? I want to make sure I get the right weather information."
    
    #### Find-Hotel:
    - REQUIRED: "city" (string) - The city name only
    - REQUIRED: "country" (string) - The country name only
    - REQUIRED: "budget_level" (string) - "cheap", "moderate", or "luxury"
    - NEVER combine city and country in a single field
    
    Budget level detection:
    - When detecting "cheap", "affordable", "inexpensive", or "low cost" in the query, set budget_level="cheap"
    - When detecting "luxury", "expensive", "high-end", or "5-star" in the query, set budget_level="luxury"
    - When detecting "moderate", "mid-range", "standard", or "average" in the query, set budget_level="moderate"
    
    IMPORTANT: Always use the field name "budget_level" (not hotel_type, price_level, or any other variation) for storing 
    the price level information. This is critical for the system to work correctly.
    
    Examples of hotel queries and their correct classification:
    - "Find me cheap hotels in Tel Aviv Israel"
      * Extract: city="Tel Aviv", country="Israel", budget_level="cheap"
      * Set: status="Complete", next_state="FETCHING_EXTERNAL_DATA", next_action="fetch_external_data"
    - "Where can I stay in New York"
      * Extract: city="New York", country missing, budget_level missing
      * Set: status="Incomplete", next_state="ASK_MISSING_FIELDS", missingFields=["country", "budget_level"]
      * Include a natural followUpQuestion like "I can help find hotels in New York. Could you tell me which country this is in and what your budget level is (cheap, moderate, or luxury)?"
    
    #### Find-Attractions:
    - REQUIRED: "city" (string) - The city name only
    - REQUIRED: "country" (string) - The country name only (can be inferred from city if well-known)
    
    Optional fields:
    - category: Type of attraction (museums, parks, historical, etc.)
    
    Examples of attraction queries and their correct classification:
    - "Show me attractions in Rome Italy"
      * Extract: city="Rome", country="Italy"
      * Set: status="Complete", next_state="FETCHING_EXTERNAL_DATA", next_action="fetch_external_data"
    - "What museums can I visit in Paris"
      * Extract: city="Paris", country missing, category="museums"
      * Set: status="Incomplete", next_state="ASK_MISSING_FIELDS", missingFields=["country"]
      * Include a natural followUpQuestion like "I'd be happy to find museums in Paris. Could you specify which country's Paris you're referring to?"
    
    #### Find-Restaurants:
    - REQUIRED: "city" (string) - The city name only
    - REQUIRED: "country" (string) - The country name only (can be inferred from city if well-known)
    
    Optional fields:
    - cuisine: Type of food (Italian, Japanese, etc.)
    - budget_level: Price level (cheap, moderate, luxury)
    
    Examples of restaurant queries and their correct classification:
    - "Find Italian restaurants in New York"
      * Extract: city="New York", country="USA", cuisine="Italian"
      * Set: status="Complete", next_state="FETCHING_EXTERNAL_DATA", next_action="fetch_external_data"
    - "Where can I eat in Tokyo"
      * Extract: city="Tokyo", country="Japan"
      * Set: status="Complete", next_state="FETCHING_EXTERNAL_DATA", next_action="fetch_external_data"
    
    ### Enhanced Context Tracking:
    - ALWAYS maintain context across multiple messages
    - When a user follows up to a previous request, preserve the intent
    - For location-only or time-only replies after a previous query, connect them to the previous context
    - CRITICAL: All collected data MUST be included in every response's data field, even when asking for missing information
    - If a field was provided in a previous message, always include it in your current response's data field
    - In multi-turn scenarios, incrementally build the data object with each user response
    - Once all fields are collected, set status="Complete" and include a complete data object
    
    ### External Data Request Rules:
    - For ANY intent that requires external data (Find-Hotel, Weather-Request, etc.):
      * When ALL required fields are present, ALWAYS set:
        - status="Complete"
        - next_state="FETCHING_EXTERNAL_DATA"
        - next_action="fetch_external_data"
        - requires_external_data=true
        - shouldDelayFetch=false
      * When fields are missing, set:
        - status="Incomplete"
        - next_state="ASK_MISSING_FIELDS"
        - shouldDelayFetch=true
        - Include a natural followUpQuestion for the missing field
    - For hotel searches (Find-Hotel intent), the required fields are: city, country, budget_level
    - For weather requests (Weather-Request intent), the required fields are: city, country, time
    
    ### Acknowledgment Message Handling:
    - For simple acknowledgments like "thanks", "thank you", "got it", etc., ALWAYS:
      * Set next_state="IDLE" (not "FETCHING_EXTERNAL_DATA")
      * Set intent="General-Query" (not a data-fetching intent)
      * Set requires_external_data=false
      * Set next_action="display_response"
      * DO NOT continue active data collection for simple acknowledgments
      * Respond conversationally without asking for more information
    - This ensures a natural conversation flow where acknowledgments don't trigger data fetching
    
    ### Context Updates Protocol:
    - You will receive CONTEXT UPDATES via system messages
    - Updates will contain only changes since previous state (diff)
    - Apply these changes to your existing understanding
    - Updates will be marked with "SYSTEM CONTEXT UPDATE:" prefix
    - JSON format will include state transitions, intents, and other relevant changes
    - Continue the conversation naturally using this updated context
    
    ### Response Format:
    You MUST structure your responses with this JSON format embedded at the end:
    
    {
      "intent": string,                   // Required - Use exact intent from valid types
      "mode": string,                     // Required - "Trip-Building" or "Advice"
      "response": string,                 // Required - Natural language response to user
      "status": string,                   // Required - "Complete" or "Incomplete"
      "next_state": string,               // Required - EXACT state from state machine
      "next_action": string,              // Required - EXACT action from valid actions
      "requires_external_data": boolean,  // Required for advice intents
      "shouldDelayFetch": boolean,        // Set to false when all required fields are present
      "data": object,                     // Required - All collected data
      "followUpQuestion": string,         // Include a natural question when asking for missing fields
      "missingFields": string[],          // Required - Empty array if complete
      "collectedData": object,            // Required - All data collected so far
      "rules": {
        "preserve_context": true,
        "merge_user_data": true,
        "require_all_fields_before_confirmation": true
      },
      "meta": {
        "modelManagedFields": string[],   // Fields explicitly managed by model
        "hasNewTripData": boolean,        // Whether new trip data was detected
        "hasNewAdviceData": boolean,      // Whether new advice data was detected
        "mergedFields": string[]          // Fields that were updated
      }
    }
  `;
};

/**
 * Provides a simplified base system instruction for fallback scenarios
 * Used as a fallback when the comprehensive instruction fails
 * @returns {string} - Simplified system instruction
 */
export const getBaseSystemInstruction = () => {
  return `
    You are DreamTrip-AI, a travel assistant that analyzes user queries.
    Respond with a structured JSON object in this format:
    {
      "intent": string,
      "mode": string,
      "response": string,
      "status": string,
      "next_state": string,
      "next_action": string,
      "data": object,
      "missingFields": string[],
      "meta": { "hasNewTripData": boolean, "hasNewAdviceData": boolean }
    }
    
    For hotel searches or weather requests, set:
    - intent: "Find-Hotel" or "Weather-Request"
    - next_state: "FETCHING_EXTERNAL_DATA"
    - next_action: "fetch_external_data"
    - requires_external_data: true
  `;
};

/**
 * Gets the generation config for the AI model
 * @returns {Object} - The generation config
 */
export const getGenerationConfig = () => {
  return {
    temperature: 0.9,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 2000,
    responseMimeType: "application/json",
  };
};

/**
 * Creates a compact context diff for ongoing conversation
 * This is the ONLY information sent after the initial system instruction
 * @param {Object} prevContext - Previous context
 * @param {Object} currentContext - Current context
 * @param {number} updateId - Incremental update counter
 * @returns {Object} - Compact context diff
 */
export const createContextDiff = (
  prevContext = {},
  currentContext = {},
  updateId = 1
) => {
  // Build compact diff with only what changed
  const diff = {
    updateId,
    currentState: currentContext.state || "ANALYZING_INPUT",
    previousState: prevContext.state || null,
    transitionedState:
      prevContext.state !== currentContext.state &&
      prevContext.state !== undefined,
  };

  // Add intent tracking
  if (currentContext.lastIntent) {
    diff.currentIntent = currentContext.lastIntent;
    diff.previousIntent = prevContext.lastIntent || null;
    diff.intentChanged = currentContext.lastIntent !== prevContext.lastIntent;
  }

  // Track conversational context better
  if (currentContext.conversationHistory?.lastUserMessage) {
    diff.lastUserMessage = currentContext.conversationHistory.lastUserMessage;
  }

  if (currentContext.conversationMemory) {
    diff.memory = currentContext.conversationMemory;
  }

  // Add trip details changes
  if (
    currentContext.tripDetails &&
    (prevContext.tripDetails ||
      Object.keys(currentContext.tripDetails).length > 0)
  ) {
    diff.updatedFields = {};

    // Check which fields changed
    Object.entries(currentContext.tripDetails || {}).forEach(([key, value]) => {
      if (
        !prevContext.tripDetails ||
        JSON.stringify(prevContext.tripDetails[key]) !== JSON.stringify(value)
      ) {
        // Only add meaningful values
        if (value !== null && value !== undefined && value !== "") {
          diff.updatedFields[`tripDetails.${key}`] = value;
        }
      }
    });

    // Remove if empty
    if (Object.keys(diff.updatedFields).length === 0) {
      delete diff.updatedFields;
    }
  }

  // Add missing fields if available
  if (currentContext.missingFields && currentContext.missingFields.length > 0) {
    diff.missingFields = currentContext.missingFields;
  }

  // Add follow-up question if available
  if (currentContext.followUpQuestion) {
    diff.followUpQuestion = currentContext.followUpQuestion;
  }

  return diff;
};

/**
 * Creates a formatted context update message
 * This is the only message sent to the model after initialization
 * @param {Object} contextDiff - The context diff object
 * @param {string} userMessage - The user's message
 * @returns {string} - Formatted message for the model
 */
export const createContextUpdateMessage = (contextDiff, userMessage) => {
  const diffPrefix = `SYSTEM CONTEXT UPDATE: 
Please update your understanding with this context change:
${JSON.stringify(contextDiff, null, 2)}

IMPORTANT: Remember your original instructions and apply this update to your conversation understanding.
`;

  return `${diffPrefix}\n\n--- USER MESSAGE ---\n${userMessage}\n\nRespond directly to this user message with your full context understanding.`;
};

/**
 * Checks if an intent requires external data
 * @param {string} intent - The intent from the AI response
 * @returns {boolean} - Whether external data is needed
 */
export const intentRequiresExternalData = (intent) => {
  const externalDataIntents = [
    "Weather-Request",
    "Find-Hotel",
    "Find-Attractions",
    "Find-Restaurants",
    "Local-Events",
    "Travel-Restrictions",
    "Flight-Information",
    "Currency-Conversion",
    "Cost-Estimate",
    "Public-Transport-Info",
  ];

  return externalDataIntents.includes(intent);
};
