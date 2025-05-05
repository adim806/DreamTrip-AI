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
import { TripContext } from "../../components/tripcontext/TripProvider";
import { useAuth } from "@clerk/clerk-react";

/**
 * Utility function for early intent detection based on simple pattern matching
 * @param {string} userMessage - The user's message
 * @returns {Object|null} - Detected intent and details or null if no intent detected
 */
const detectEarlyIntent = (userMessage) => {
  if (!userMessage) return null;

  const text = userMessage.toLowerCase().trim();

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
  const { tripDetails, setTripDetails, setallTripData } =
    useContext(TripContext);
  const queryClient = useQueryClient();
  const [pendingMessages, setPendingMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
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
    if (!tripDetails || isGeneratingItinerary) return;

    setIsGeneratingItinerary(true);

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

        // Store the itinerary in the trip context
        setallTripData({
          tripDetails,
          itinerary: itineraryResult.itinerary,
          metadata: itineraryResult.metadata,
        });

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
    } finally {
      setIsGeneratingItinerary(false);
      setIsAwaitingConfirmation(false);
    }
  };

  /**
   * Process user input with RAG and structured response handling
   */
  const processUserInput = async (userMessage, imageData = null) => {
    if (!chatRef.current) {
      console.error("Chat not initialized!");
      return { success: false, error: "Chat not initialized" };
    }

    setIsTyping(true);

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

      // Check if this is a confirmation to generate an itinerary
      if (
        isAwaitingConfirmation &&
        (userMessage.toLowerCase() === "yes" ||
          (userMessage.toLowerCase().includes("generate") &&
            userMessage.includes("itinerary")))
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

      // Try to detect intent early using pattern matching
      const earlyIntent = detectEarlyIntent(userMessage);
      let parallelFetchPromise = null;

      // If we detect an intent that requires external data, start fetching in parallel
      if (earlyIntent && earlyIntent.intent && earlyIntent.data) {
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

        // Update the trip details in the context
        const newTripDetails = updateTripDraft(
          tripDetails,
          finalStructuredData.data
        );
        setTripDetails(newTripDetails);
        console.log("Updated trip details:", newTripDetails);

        // Check if the trip details are complete
        const completenessCheck = checkTripDraftCompleteness(newTripDetails);
        console.log("Trip completeness check:", completenessCheck);

        // If trip is complete and we're not already awaiting confirmation,
        // add a trip summary and ask for confirmation
        if (
          completenessCheck.isComplete &&
          !isAwaitingConfirmation &&
          userMessage.toLowerCase() !== "yes" &&
          !userMessage.toLowerCase().includes("generate itinerary")
        ) {
          const tripSummary = formatTripSummary(newTripDetails);

          // Add trip summary to pending messages
          setPendingMessages((prev) => [
            ...prev,
            {
              role: "model",
              message: `${tripSummary}\n\nDoes this summary look correct? Should I generate a detailed itinerary based on this information?`,
              id: `summary-${Date.now()}`,
            },
          ]);

          setIsAwaitingConfirmation(true);
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
        const newTripDetails = updateTripDraft(
          tripDetails,
          structuredData.data
        );
        setTripDetails(newTripDetails);
        console.log("Updated trip details:", newTripDetails);

        // Check if we need to show a trip summary for confirmation
        const completenessCheck = checkTripDraftCompleteness(newTripDetails);

        if (completenessCheck.isComplete && !isAwaitingConfirmation) {
          const tripSummary = formatTripSummary(newTripDetails);

          // Add trip summary to pending messages
          setPendingMessages((prev) => [
            ...prev,
            {
              role: "model",
              message: `${tripSummary}\n\nDoes this summary look correct? Should I generate a detailed itinerary based on this information?`,
            },
          ]);

          setIsAwaitingConfirmation(true);
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
    isGeneratingItinerary,
    isAwaitingConfirmation,
    handleGenerateItinerary,
  };
}
