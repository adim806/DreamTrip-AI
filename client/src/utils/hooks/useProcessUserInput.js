import { useState, useContext, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  updateTripDraft,
  checkTripDraftCompleteness,
  formatTripSummary,
  generateFollowUpQuestion,
} from "../tripUtils";
import {
  fetchExternalData,
  buildPromptWithExternalData,
} from "../externalDataService";
import {
  extractStructuredDataFromResponse,
  intentRequiresExternalData,
  getSystemInstruction,
  getGenerationConfig,
} from "../aiPromptUtils";
import { generateItinerary, saveItinerary } from "../itineraryGenerator";
import {
  TripContext,
  CONVERSATION_STATES,
} from "../../components/tripcontext/TripProvider";
import { useAuth } from "@clerk/clerk-react";

/**
 * Utility function for early intent detection based on simple pattern matching
 * @param {string} userMessage - The user's message
 * @returns {Object|null} - Detected intent and details or null if no intent detected
 */
const detectEarlyIntent = (userMessage) => {
  if (!userMessage) return null;

  const text = userMessage.toLowerCase().trim();

  // Add intent detection for new trip request
  const newTripRegex =
    /(?:new|another|second|different|more)\s+(?:trip|plan|itinerary|vacation)/i;

  if (newTripRegex.test(text)) {
    // Match patterns like "plan a trip to Spain" or "make me an itinerary for Italy"
    const destinationMatch = text.match(/(?:to|for|in)\s+([a-z\s,]+)/i);
    return {
      intent: "New-Trip-Request",
      data: {
        destination: destinationMatch ? destinationMatch[1].trim() : null,
      },
    };
  }

  // Weather intent detection - include common misspellings
  const weatherRegex =
    /weather|wheather|forecast|temperature|rain|sunny|cloudy|climate|hot|cold|humid/i;

  // Complex location regex to match:
  // - Places with spaces: "new york", "tel aviv"
  // - Places with country: "paris, france", "tel aviv, israel"
  // - Places with prepositions: "in tel aviv", "at new york"
  const locationRegex =
    /(?:in|at|for|from|to)\s+([a-z\s,]+)|\b([a-z]+(?:\s+[a-z]+){1,3}(?:\s*,\s*[a-z]+)?)\b/gi;

  // Current time indicators
  const currentTimeRegex =
    /now|current|right now|currently|at the moment|today|tonight|this morning|this afternoon|this evening/i;

  if (weatherRegex.test(text)) {
    // Try to extract all possible location matches
    const locationMatches = Array.from(text.matchAll(locationRegex));
    let bestLocation = null;

    // Process all matches to find the best location
    if (locationMatches && locationMatches.length > 0) {
      // Look through all matches
      for (const match of locationMatches) {
        const potentialLocation = (match[1] || match[2] || "").trim();

        // Skip very short words or words that are part of weather phrases
        if (
          potentialLocation.length < 3 ||
          /weather|rain|cloud|sun|hot|cold|forecast|temperature/i.test(
            potentialLocation
          )
        ) {
          continue;
        }

        // If we found a location with a comma (city, country) - that's likely the best match
        if (potentialLocation.includes(",")) {
          bestLocation = potentialLocation;
          break;
        }

        // Otherwise store the first valid location
        if (!bestLocation) {
          bestLocation = potentialLocation;
        }
      }
    }

    // Determine if asking about current weather
    const isCurrentWeather = currentTimeRegex.test(text);

    // Get current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split("T")[0];

    if (bestLocation) {
      console.log(`Detected weather request for location: "${bestLocation}"`);
      return {
        intent: "Weather-Request",
        data: {
          location: bestLocation,
          date: isCurrentWeather ? currentDate : "today", // Use actual date for current weather
        },
      };
    }

    return {
      intent: "Weather-Request",
      data: {
        location: null,
        date: isCurrentWeather ? currentDate : "today",
      },
    };
  }

  // Hotel recommendations intent detection
  const hotelRegex =
    /hotel|stay|accommodation|place to sleep|lodging|inn|resort/i;

  if (hotelRegex.test(text)) {
    // Try to extract location
    const locationMatch = text.match(locationRegex);
    const location = locationMatch
      ? (
          locationMatch[1] ||
          locationMatch[2] ||
          locationMatch[3] ||
          locationMatch[4] ||
          ""
        ).trim()
      : null;

    return {
      intent: "Find-Hotel",
      data: {
        location: location,
      },
    };
  }

  // Attractions intent detection
  const attractionsRegex =
    /attraction|visit|see|tour|sight|landmark|museum|park|explore/i;

  if (attractionsRegex.test(text)) {
    // Try to extract location
    const locationMatch = text.match(locationRegex);
    const location = locationMatch
      ? (
          locationMatch[1] ||
          locationMatch[2] ||
          locationMatch[3] ||
          locationMatch[4] ||
          ""
        ).trim()
      : null;

    return {
      intent: "Find-Attractions",
      data: {
        location: location,
      },
    };
  }

  // Itinerary edit detection
  const editItineraryRegex =
    /change|adjust|modify|edit|update|add|remove|replace|extend/i;
  const daySpecificRegex = /day\s+(\d+)|(\d+)(st|nd|rd|th)\s+day/i;

  if (editItineraryRegex.test(text)) {
    const dayMatch = text.match(daySpecificRegex);
    const dayNumber = dayMatch
      ? parseInt(dayMatch[1] || dayMatch[2], 10)
      : null;

    return {
      intent: "Edit-Itinerary",
      data: {
        day: dayNumber,
        isMinorEdit:
          !text.includes("completely") &&
          !text.includes("entire") &&
          dayNumber !== null,
      },
    };
  }

  return null;
};

/**
 * Custom hook for handling AI processing of user input
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
  } = useContext(TripContext);

  const queryClient = useQueryClient();
  const [pendingMessages, setPendingMessages] = useState([]);

  // Replace explicit state flags with state machine references
  const [isTyping, setIsTyping] = useState(false);
  const [parallelDataFetch, setParallelDataFetch] = useState({
    inProgress: false,
    intent: null,
    data: null,
    result: null,
  });

  // Create refs to keep track of state between renders
  const chatRef = useRef(null);
  const processedMsgCountRef = useRef(0);
  const previousHistoryLengthRef = useRef(0);
  const pendingClearRef = useRef(false);

  // Track history changes to know when to clear pending messages
  useEffect(() => {
    // Only run if chatData and its history are available
    if (chatData?.history) {
      const currentHistoryLength = chatData.history.length;

      // If history length increased and we have a pending clear operation
      if (
        currentHistoryLength > previousHistoryLengthRef.current &&
        pendingClearRef.current
      ) {
        console.log("History updated, clearing pending messages");
        setPendingMessages([]);
        pendingClearRef.current = false;
      }

      // Update the reference
      previousHistoryLengthRef.current = currentHistoryLength;
    }
  }, [chatData?.history?.length, chatData]);

  // Initialize Gemini AI model
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY);

  // Initialize or update chat with history when chatData changes
  if (
    chatData &&
    (!chatRef.current ||
      processedMsgCountRef.current !== chatData.history?.length)
  ) {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: getSystemInstruction(),
    });

    chatRef.current = model.startChat({
      generationConfig: getGenerationConfig(),
      history: [
        ...(chatData?.history?.map(({ role, parts }) => ({
          role,
          parts: [{ text: parts[0].text }],
        })) || []),
      ],
    });

    processedMsgCountRef.current = chatData?.history?.length || 0;
  }

  // Mutation for saving chat data
  const mutation = useMutation({
    mutationFn: async ({ userMessage, aiResponse, image }) => {
      const headers = await getAuthHeaders();

      if (!chatData?._id) {
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
          if (!res.ok) {
            throw new Error(`Failed to create chat: ${res.status}`);
          }
          return res.json();
        });
      }

      // Update existing chat
      return fetch(
        `${import.meta.env.VITE_API_URL}/api/chats/${
          chatData._id
        }?userId=${userId}`,
        {
          method: "PUT",
          credentials: "include",
          headers,
          body: JSON.stringify({
            question: userMessage,
            answer: aiResponse,
            img: image || undefined,
          }),
        }
      ).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to update chat: ${res.status}`);
        }
        return res.json();
      });
    },
    onSuccess: (data) => {
      console.log("Message saved successfully:", data);

      // Instead of clearing immediately, mark for clearing when history updates
      pendingClearRef.current = true;

      // Update queries depending on whether we created a new chat or updated existing
      if (chatData?._id) {
        queryClient.invalidateQueries({ queryKey: ["chat", chatData._id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["userchats"] });
        queryClient.invalidateQueries({ queryKey: ["chat", data] });
      }
    },
    onError: (err) => {
      console.error("Failed to save message:", err);
    },
  });

  const { userId, isSignedIn, getToken } = useAuth();

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

  /**
   * Handle generating the itinerary after user confirmation
   */
  const handleGenerateItinerary = async () => {
    if (
      !tripDetails ||
      conversationState === CONVERSATION_STATES.GENERATING_ITINERARY
    )
      return;

    // Update state to generating itinerary
    transitionState(CONVERSATION_STATES.GENERATING_ITINERARY);

    try {
      // Display a message that we're generating an itinerary
      setPendingMessages((prev) => [
        ...prev,
        {
          role: "model",
          message:
            "Generating your personalized travel itinerary. This may take a moment...",
        },
      ]);

      // Generate the itinerary
      const itineraryResult = await generateItinerary(tripDetails);

      if (itineraryResult.success) {
        console.log("Itinerary generated successfully");

        // Create the complete trip data
        const tripData = {
          tripDetails,
          itinerary: itineraryResult.itinerary,
          metadata: itineraryResult.metadata,
        };

        // Store the itinerary in the trip context and update state
        setallTripData(tripData);

        // Transition state to displaying itinerary, which will also handle completing the trip
        transitionState(CONVERSATION_STATES.DISPLAYING_ITINERARY, tripData);

        // Save the itinerary to the server
        try {
          const saveResult = await saveItinerary(
            chatData?._id,
            itineraryResult
          );
          console.log("Itinerary saved to server:", saveResult);
        } catch (saveError) {
          console.error("Error saving itinerary to server:", saveError);
          // Continue even if saving fails - we still have the data in the context
        }

        // Show the generated itinerary in the chat
        setPendingMessages((prev) => {
          // Find and remove the "Generating..." message
          const updatedMessages = prev.filter(
            (msg) =>
              msg.role !== "model" ||
              msg.message !==
                "Generating your personalized travel itinerary. This may take a moment..."
          );

          // Add the complete itinerary message
          updatedMessages.push({
            role: "model",
            message: `
## Your Travel Itinerary for ${tripDetails.vacation_location}

${itineraryResult.itinerary}

Would you like to make any adjustments to this itinerary?
            `,
          });

          return updatedMessages;
        });

        // Save the itinerary message to the chat history
        mutation.mutate({
          userMessage: null, // No user message to save
          aiResponse: `
## Your Travel Itinerary for ${tripDetails.vacation_location}

${itineraryResult.itinerary}

Would you like to make any adjustments to this itinerary?
          `,
          image: null,
        });
      } else {
        // Handle error in itinerary generation
        console.error("Failed to generate itinerary:", itineraryResult.error);

        // Transition back to trip building mode
        transitionState(CONVERSATION_STATES.TRIP_BUILDING_MODE);

        setPendingMessages((prev) => {
          // Find and remove the "Generating..." message
          const updatedMessages = prev.filter(
            (msg) =>
              msg.role !== "model" ||
              msg.message !==
                "Generating your personalized travel itinerary. This may take a moment..."
          );

          // Add the error message
          updatedMessages.push({
            role: "model",
            message:
              "I'm sorry, I encountered a problem while generating your itinerary. Would you like to try again?",
          });

          return updatedMessages;
        });
      }
    } catch (error) {
      console.error("Error in itinerary generation process:", error);

      // Transition back to trip building mode
      transitionState(CONVERSATION_STATES.TRIP_BUILDING_MODE);

      setPendingMessages((prev) => {
        // Find and remove the "Generating..." message
        const updatedMessages = prev.filter(
          (msg) =>
            msg.role !== "model" ||
            msg.message !==
              "Generating your personalized travel itinerary. This may take a moment..."
        );

        // Add the error message
        updatedMessages.push({
          role: "model",
          message:
            "I apologize, but there was an unexpected error generating your itinerary. Please try again later.",
        });

        return updatedMessages;
      });
    }
  };

  /**
   * Utility function to add system messages to the chat
   * Used for automated responses to user actions (like button clicks)
   */
  const addSystemMessage = (message) => {
    if (!message) return;

    // Add the message to the pending messages
    setPendingMessages((prev) => [
      ...prev,
      {
        role: "model",
        message,
        isSystemMessage: true, // Flag to identify automated system messages
      },
    ]);

    // Save to history
    mutation.mutate({
      userMessage: null, // No user message for system messages
      aiResponse: message,
      image: null,
    });
  };

  // Register the itinerary generator function with the context
  // This allows other components to trigger generation via buttons or text commands
  useEffect(() => {
    if (registerItineraryGenerator) {
      registerItineraryGenerator(handleGenerateItinerary);
    }

    // Also expose the addSystemMessage function to the window for component use
    window.__processingHookState = {
      ...(window.__processingHookState || {}),
      addSystemMessage,
    };

    return () => {
      // Clean up the reference when component unmounts
      if (window.__processingHookState) {
        delete window.__processingHookState.addSystemMessage;
      }
    };
  }, [registerItineraryGenerator]);

  /**
   * Process user input with RAG and structured response handling
   */
  const processUserInput = async (userMessage, imageData = null) => {
    if (!chatRef.current) {
      console.error("Chat not initialized!");
      return { success: false, error: "Chat not initialized" };
    }

    setIsTyping(true);

    // Set state to analyzing input
    transitionState(CONVERSATION_STATES.ANALYZING_INPUT);

    // Add the user message to pending messages first
    setPendingMessages((prev) => [
      ...prev,
      {
        role: "user",
        message: userMessage,
        img: imageData?.dbData?.filePath || null,
      },
    ]);

    try {
      console.log("Processing user input:", userMessage);

      // Handle text-based commands that mirror button actions in the TripSummary component
      // These commands apply when in AWAITING_USER_TRIP_CONFIRMATION state
      if (
        conversationState ===
        CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION
      ) {
        const lowerCaseMsg = userMessage.toLowerCase().trim();

        // Handle cancel command (matching "cancel" or similar phrases)
        if (
          lowerCaseMsg === "cancel" ||
          lowerCaseMsg === "cancel trip" ||
          lowerCaseMsg.includes("cancel the trip") ||
          lowerCaseMsg.includes("start over")
        ) {
          // Transition back to idle state
          transitionState(CONVERSATION_STATES.IDLE);

          // Add response message
          setPendingMessages((prev) => [
            ...prev,
            {
              role: "model",
              message:
                "I've cancelled the trip planning. How else can I assist you today?",
              isSystemMessage: true,
            },
          ]);

          // Save to history
          mutation.mutate({
            userMessage,
            aiResponse:
              "I've cancelled the trip planning. How else can I assist you today?",
            image: imageData?.dbData?.filePath,
          });

          setIsTyping(false);
          return { success: true };
        }

        // Handle edit command (matching "edit" or similar phrases)
        if (
          lowerCaseMsg === "edit" ||
          lowerCaseMsg === "edit details" ||
          lowerCaseMsg.includes("change the details") ||
          lowerCaseMsg.includes("edit the trip") ||
          lowerCaseMsg.includes("modify the trip")
        ) {
          // Transition back to trip building mode
          transitionState(CONVERSATION_STATES.TRIP_BUILDING_MODE);

          // Add response message
          setPendingMessages((prev) => [
            ...prev,
            {
              role: "model",
              message:
                "Let's continue editing your trip details. What would you like to change?",
              isSystemMessage: true,
            },
          ]);

          // Save to history
          mutation.mutate({
            userMessage,
            aiResponse:
              "Let's continue editing your trip details. What would you like to change?",
            image: imageData?.dbData?.filePath,
          });

          setIsTyping(false);
          return { success: true };
        }

        // Handle confirm/generate command (matching "yes", "confirm", "generate itinerary", etc.)
        if (
          lowerCaseMsg === "yes" ||
          lowerCaseMsg === "confirm" ||
          lowerCaseMsg === "ok" ||
          lowerCaseMsg === "looks good" ||
          lowerCaseMsg.includes("generate") ||
          lowerCaseMsg.includes("create itinerary") ||
          lowerCaseMsg.includes("looks right") ||
          lowerCaseMsg.includes("that's correct")
        ) {
          // Save the confirmation message
          mutation.mutate({
            userMessage,
            aiResponse:
              "Great! I'll generate your personalized travel itinerary now. This might take a moment...",
            image: imageData?.dbData?.filePath,
          });

          // Add a system message for itinerary generation
          setPendingMessages((prev) => [
            ...prev,
            {
              role: "model",
              message:
                "Great! I'll generate your personalized travel itinerary now. This might take a moment...",
              isSystemMessage: true,
            },
          ]);

          setIsTyping(false);
          // Trigger itinerary generation
          handleGenerateItinerary();
          return { success: true };
        }
      }

      // Check if user wants to start a new trip
      const earlyIntent = detectEarlyIntent(userMessage);

      // Handle request for a new trip
      if (earlyIntent && earlyIntent.intent === "New-Trip-Request") {
        console.log("New trip request detected:", earlyIntent);

        // Start a new trip
        startNewTrip();

        // Add a response immediately
        const initialDestination = earlyIntent.data.destination;
        const response = initialDestination
          ? `I'll help you plan a new trip to ${initialDestination}. What dates are you thinking of traveling?`
          : "I'll help you plan a new trip. Where would you like to travel to?";

        setPendingMessages((prev) => [
          ...prev,
          {
            role: "model",
            message: response,
          },
        ]);

        // Save message to history
        mutation.mutate({
          userMessage,
          aiResponse: response,
          image: imageData?.dbData?.filePath,
        });

        // If we have a destination, start building trip with it
        if (initialDestination) {
          setTripDetails({
            vacation_location: initialDestination,
            id: Date.now(),
          });
          transitionState(CONVERSATION_STATES.TRIP_BUILDING_MODE);
        } else {
          transitionState(CONVERSATION_STATES.IDLE);
        }

        setIsTyping(false);
        return { success: true };
      }

      // Handle itinerary editing intent
      if (earlyIntent && earlyIntent.intent === "Edit-Itinerary") {
        // If we're in display itinerary mode and have a completed trip
        if (
          conversationState === CONVERSATION_STATES.DISPLAYING_ITINERARY &&
          allTripData
        ) {
          transitionState(CONVERSATION_STATES.EDITING_ITINERARY);

          if (earlyIntent.data.isMinorEdit) {
            // For minor edits, just send to AI and stay in editing mode
            setPendingMessages((prev) => [
              ...prev,
              {
                role: "model",
                message: `I'll help you make those changes to ${
                  earlyIntent.data.day
                    ? `day ${earlyIntent.data.day}`
                    : "your itinerary"
                }. Let me adjust that for you.`,
              },
            ]);

            // We would process the edit here
            // For now, just acknowledge

            setIsTyping(false);
            return { success: true };
          } else {
            // For major changes, consider regenerating
            setPendingMessages((prev) => [
              ...prev,
              {
                role: "model",
                message:
                  "It sounds like you want to make significant changes to your itinerary. Would you like me to regenerate it completely?",
              },
            ]);

            setIsTyping(false);
            return { success: true };
          }
        }
      }

      // Check if this is a confirmation to generate an itinerary when in awaiting confirmation state
      if (
        conversationState ===
          CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION &&
        (userMessage.toLowerCase() === "yes" ||
          (userMessage.toLowerCase().includes("generate") &&
            userMessage.toLowerCase().includes("itinerary")))
      ) {
        // Save the confirmation message
        mutation.mutate({
          userMessage,
          aiResponse: null, // Will be saved with the itinerary
          image: imageData?.dbData?.filePath,
        });

        setIsTyping(false);
        // Trigger itinerary generation
        handleGenerateItinerary();
        return { success: true };
      }

      // For itinerary adjustments when already in editing mode, need to implement later
      // if (conversationState === CONVERSATION_STATES.EDITING_ITINERARY) {
      //   // Process editing request
      // }

      // Try to detect other intents for external data using pattern matching
      let parallelFetchPromise = null;

      // If we detect an intent that requires external data, start fetching in parallel
      if (
        earlyIntent &&
        earlyIntent.intent &&
        earlyIntent.data &&
        earlyIntent.intent !== "New-Trip-Request" &&
        earlyIntent.intent !== "Edit-Itinerary"
      ) {
        console.log("Early intent detection:", earlyIntent);

        // Start data fetching in parallel
        setParallelDataFetch({
          inProgress: true,
          intent: earlyIntent.intent,
          data: earlyIntent.data,
          result: null,
        });

        // Add an interim message indicating we're fetching relevant data
        setPendingMessages((prev) => [
          ...prev,
          {
            role: "model",
            message: getDataFetchingMessage(
              earlyIntent.intent,
              earlyIntent.data
            ),
            id: `fetch-${Date.now()}`,
          },
        ]);

        // Set state to fetching external data
        transitionState(CONVERSATION_STATES.FETCHING_EXTERNAL_DATA);

        // Start fetching data in parallel with AI processing
        parallelFetchPromise = fetchExternalData(
          earlyIntent.intent,
          earlyIntent.data
        )
          .then((result) => {
            console.log("Parallel data fetch completed:", result);
            setParallelDataFetch((prev) => ({
              ...prev,
              inProgress: false,
              result,
            }));
            return result;
          })
          .catch((error) => {
            console.error("Error in parallel data fetch:", error);
            setParallelDataFetch((prev) => ({
              ...prev,
              inProgress: false,
              result: { success: false, error: error.message },
            }));
            return { success: false, error: error.message };
          });
      }

      // First send message to AI for initial analysis
      const result = await chatRef.current.sendMessageStream(
        Object.entries(imageData?.aiData || {}).length
          ? [imageData.aiData, userMessage]
          : [userMessage]
      );

      let aiResponse = "";
      for await (const chunk of result.stream) {
        aiResponse += chunk.text();
      }

      console.log("Initial AI response:", aiResponse);

      // Process the response with structured data extraction
      const {
        formattedResponse,
        data: structuredData,
        success,
      } = extractStructuredDataFromResponse(aiResponse);

      console.log("Extracted structured data:", structuredData);

      let finalResponse = formattedResponse;
      let finalStructuredData = structuredData;

      // Determine whether to use the parallel fetched data or do a sequential fetch
      const needsExternalData =
        success &&
        structuredData &&
        (structuredData.requires_external_data === true ||
          (structuredData.intent &&
            intentRequiresExternalData(structuredData.intent)));

      if (needsExternalData) {
        // Wait for parallel fetch to complete if it's in progress and intents match
        const useParallelData =
          parallelFetchPromise &&
          structuredData.intent === parallelDataFetch.intent;

        let externalData;

        if (useParallelData) {
          // Wait for the parallel fetch that we started earlier
          console.log("Using parallel fetched data for", structuredData.intent);
          externalData = await parallelFetchPromise;

          // Remove the interim "fetching data" message
          setPendingMessages((prev) =>
            prev.filter((msg) => !msg.id || !msg.id.startsWith("fetch-"))
          );
        } else {
          // If intents don't match or we didn't do parallel fetch, do a sequential fetch
          console.log(
            "Fetching external data sequentially for",
            structuredData.intent
          );

          // Add interim response indicating we're fetching data
          setPendingMessages((prev) => [
            ...prev,
            {
              role: "model",
              message:
                "I'm gathering some specific information to better answer your question...",
              id: `fetch-seq-${Date.now()}`,
            },
          ]);

          // Explicitly set state for sequential fetch
          transitionState(CONVERSATION_STATES.FETCHING_EXTERNAL_DATA);

          // Fetch external data based on intent
          externalData = await fetchExternalData(
            structuredData.intent,
            structuredData.data || {}
          );
        }

        console.log("External data:", externalData);

        if (externalData.success) {
          // Build an enriched prompt with the external data
          const enrichedPrompt = buildPromptWithExternalData(
            userMessage,
            externalData,
            structuredData.intent
          );

          console.log("Enriched prompt:", enrichedPrompt);

          // Send the enriched prompt back to the AI
          const enrichedResult = await chatRef.current.sendMessageStream([
            enrichedPrompt,
          ]);

          let enrichedResponse = "";
          for await (const chunk of enrichedResult.stream) {
            enrichedResponse += chunk.text();
          }

          console.log("Enriched AI response:", enrichedResponse);

          // Extract structured data from enriched response
          const enrichedExtracted =
            extractStructuredDataFromResponse(enrichedResponse);

          // Update final response and structured data
          finalResponse = enrichedExtracted.formattedResponse;
          finalStructuredData = enrichedExtracted.data;
        }
      }

      // Remove any interim messages
      const updatedPendingMessages = pendingMessages.filter(
        (msg) =>
          !msg.id ||
          (!msg.id.startsWith("fetch-") && !msg.id.includes("gathering"))
      );

      // Add the final response
      updatedPendingMessages.push({
        role: "model",
        message: finalResponse,
        id: Date.now().toString(), // Add unique ID to help track message
      });

      setPendingMessages(updatedPendingMessages);

      // If successful extraction and we're in Trip-Building mode, update trip details
      if (
        success &&
        finalStructuredData &&
        finalStructuredData.mode === "Trip-Building"
      ) {
        console.log("Updating trip details from structured data");

        // Ensure we're in trip building mode
        transitionState(CONVERSATION_STATES.TRIP_BUILDING_MODE);

        // Update the trip details in the context
        const newTripDetails = updateTripDraft(
          tripDetails,
          finalStructuredData.data
        );

        // Ensure the trip has an ID for tracking
        if (!newTripDetails.id) {
          newTripDetails.id = Date.now();
        }

        setTripDetails(newTripDetails);
        console.log("Updated trip details:", newTripDetails);

        // Check if the trip details are complete
        const completenessCheck = checkTripDraftCompleteness(newTripDetails);
        console.log("Trip completeness check:", completenessCheck);

        // If trip is complete and we're not already in confirmation state,
        // add a trip summary and ask for confirmation
        if (
          completenessCheck.isComplete &&
          conversationState !==
            CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION &&
          userMessage.toLowerCase() !== "yes" &&
          !userMessage.toLowerCase().includes("generate itinerary")
        ) {
          const tripSummary = formatTripSummary(newTripDetails);

          // Update state for awaiting confirmation
          transitionState(CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION);

          // Add trip summary to pending messages
          setPendingMessages((prev) => [
            ...prev,
            {
              role: "model",
              message: `${tripSummary}\n\nDoes this summary look correct? Should I generate a detailed itinerary based on this information?`,
              id: `summary-${Date.now()}`,
            },
          ]);
        }
        // If user confirms or asks to generate itinerary, and trip is complete
        else if (
          completenessCheck.isComplete &&
          (userMessage.toLowerCase() === "yes" ||
            userMessage.toLowerCase().includes("generate itinerary"))
        ) {
          // Trigger itinerary generation
          handleGenerateItinerary();
        }
        // If trip is not complete, generate a follow-up question
        else if (!completenessCheck.isComplete) {
          const followUpQuestion = generateFollowUpQuestion(
            completenessCheck.missingFields
          );

          // Add follow-up question to pendingMessages only if we haven't already
          const hasFollowUp = updatedPendingMessages.some(
            (msg) =>
              msg.role === "model" && msg.message.includes(followUpQuestion)
          );

          if (!hasFollowUp) {
            setPendingMessages((prev) => [
              ...prev,
              {
                role: "model",
                message: `To continue planning your trip, I need to know more: ${followUpQuestion}`,
                id: `followup-${Date.now()}`,
              },
            ]);
          }
        }
      } else if (
        success &&
        finalStructuredData &&
        finalStructuredData.mode === "Advice"
      ) {
        // Set to advisory mode for general travel advice
        transitionState(CONVERSATION_STATES.ADVISORY_MODE);
      }

      // Save to server
      mutation.mutate({
        userMessage,
        aiResponse: finalResponse,
        image: imageData?.dbData?.filePath,
      });

      return { success: true };
    } catch (error) {
      console.error("Error processing user input:", error);

      // Add error message to pending messages
      setPendingMessages((prev) => [
        ...prev,
        {
          role: "model",
          message:
            "Sorry, I encountered an error processing your request. Please try again.",
        },
      ]);

      // Return to idle state
      transitionState(CONVERSATION_STATES.IDLE);

      return { success: false, error };
    } finally {
      setIsTyping(false);

      // Reset parallel data fetch state
      setParallelDataFetch({
        inProgress: false,
        intent: null,
        data: null,
        result: null,
      });
    }
  };

  /**
   * Generate appropriate message for data fetching based on intent
   */
  const getDataFetchingMessage = (intent, data) => {
    switch (intent) {
      case "Weather-Request": {
        // Format location for display
        const location = data.location || "your destination";

        // Format date for display
        let dateDisplay = "currently";
        if (data.date) {
          if (
            data.date === "today" ||
            data.date === new Date().toISOString().split("T")[0]
          ) {
            dateDisplay = "today";
          } else {
            // Format date nicely if it's not today
            try {
              const dateObj = new Date(data.date);
              dateDisplay = dateObj.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              });
            } catch (e) {
              dateDisplay = data.date;
            }
          }
        }

        return `Fetching real-time weather information for ${location} ${dateDisplay}...`;
      }

      case "Find-Hotel": {
        const location = data.location || "your destination";
        let preferences = "";

        if (data.preferences) {
          const prefList = [];
          if (data.preferences.budget)
            prefList.push(`budget: ${data.preferences.budget}`);
          if (data.preferences.rating)
            prefList.push(`rating: ${data.preferences.rating}+`);
          if (prefList.length > 0) {
            preferences = ` (${prefList.join(", ")})`;
          }
        }

        return `Looking up top hotel recommendations in ${location}${preferences}...`;
      }

      case "Find-Attractions": {
        const location = data.location || "your destination";
        let categoryInfo = "";

        if (data.category) {
          categoryInfo = ` (focusing on ${data.category})`;
        }

        return `Finding popular attractions and things to do in ${location}${categoryInfo}...`;
      }

      default:
        return "Gathering specific information to better answer your question...";
    }
  };

  /**
   * Process initial message in new chat
   */
  const processInitialMessage = async (initialMessage) => {
    if (!chatRef.current || isTyping) return { success: false };

    setIsTyping(true);
    transitionState(CONVERSATION_STATES.ANALYZING_INPUT);

    try {
      // Send message to AI
      const result = await chatRef.current.sendMessageStream([initialMessage]);

      let aiResponse = "";
      for await (const chunk of result.stream) {
        aiResponse += chunk.text();
      }

      console.log("AI response for initial message:", aiResponse);

      // Process the response with structured data extraction
      const {
        formattedResponse,
        data: structuredData,
        success,
      } = extractStructuredDataFromResponse(aiResponse);

      console.log("Extracted structured data:", structuredData);

      // Add AI response to pending messages immediately
      setPendingMessages([
        {
          role: "model",
          message: formattedResponse,
        },
      ]);

      // If successful extraction and Trip-Building mode, update trip details
      if (
        success &&
        structuredData &&
        structuredData.mode === "Trip-Building"
      ) {
        // Update trip building state
        transitionState(CONVERSATION_STATES.TRIP_BUILDING_MODE);

        const newTripDetails = updateTripDraft(
          tripDetails,
          structuredData.data
        );

        // Ensure the trip has an ID
        if (!newTripDetails.id) {
          newTripDetails.id = Date.now();
        }

        setTripDetails(newTripDetails);
        console.log("Updated trip details:", newTripDetails);

        // Check if we need to show a trip summary for confirmation
        const completenessCheck = checkTripDraftCompleteness(newTripDetails);

        if (completenessCheck.isComplete) {
          const tripSummary = formatTripSummary(newTripDetails);

          // Update state for awaiting confirmation
          transitionState(CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION);

          // Add trip summary to pending messages
          setPendingMessages((prev) => [
            ...prev,
            {
              role: "model",
              message: `${tripSummary}\n\nDoes this summary look correct? Should I generate a detailed itinerary based on this information?`,
            },
          ]);
        } else if (!completenessCheck.isComplete) {
          // Generate follow-up question for missing fields
          const followUpQuestion = generateFollowUpQuestion(
            completenessCheck.missingFields
          );

          setPendingMessages((prev) => [
            ...prev,
            {
              role: "model",
              message: `To continue planning your trip, I need to know more: ${followUpQuestion}`,
            },
          ]);
        }
      } else if (
        success &&
        structuredData &&
        structuredData.mode === "Advice"
      ) {
        // Set to advisory mode
        transitionState(CONVERSATION_STATES.ADVISORY_MODE);
      } else {
        // Default to idle state
        transitionState(CONVERSATION_STATES.IDLE);
      }

      // Save to server immediately to update the chat history
      try {
        await mutation.mutateAsync({
          userMessage: null, // Don't add user message again
          aiResponse: formattedResponse,
          image: null,
        });

        console.log("Initial response saved to server successfully");
      } catch (savingError) {
        console.error("Error saving initial response:", savingError);
      }

      return { success: true };
    } catch (error) {
      console.error("Error processing initial message:", error);
      setPendingMessages([
        {
          role: "model",
          message:
            "Sorry, I encountered an error processing your request. Please try again.",
        },
      ]);

      // Return to idle state
      transitionState(CONVERSATION_STATES.IDLE);

      return { success: false, error };
    } finally {
      setIsTyping(false);
    }
  };

  return {
    processUserInput,
    processInitialMessage,
    pendingMessages,
    isTyping,
    handleGenerateItinerary,
  };
}
