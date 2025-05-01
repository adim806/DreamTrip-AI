import { useState, useContext, useRef } from "react";
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

  // Create refs to keep track of state between renders
  const chatRef = useRef(null);
  const processedMsgCountRef = useRef(0);

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
      // Update queries depending on whether we created a new chat or updated existing
      if (chatData?._id) {
        queryClient.invalidateQueries({ queryKey: ["chat", chatData._id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["userchats"] });
        queryClient.invalidateQueries({ queryKey: ["chat", data] });
      }

      // Clear pending messages as they're now in the main chat
      setPendingMessages([]);
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

      // Check if external data is required for Retrieval-Augmented Generation
      if (
        success &&
        structuredData &&
        (structuredData.requires_external_data === true ||
          (structuredData.intent &&
            intentRequiresExternalData(structuredData.intent)))
      ) {
        // Add interim response indicating we're fetching data
        setPendingMessages((prev) => [
          ...prev,
          {
            role: "model",
            message:
              "I'm gathering some specific information to better answer your question...",
          },
        ]);

        // Fetch external data based on intent
        const externalData = await fetchExternalData(
          structuredData.intent,
          structuredData.data || {}
        );

        console.log("Fetched external data:", externalData);

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

      // Replace the interim message with the final AI response
      const updatedPendingMessages = [...pendingMessages];
      // Remove the interim "gathering information" message if it exists
      const interimMessageIndex = updatedPendingMessages.findIndex(
        (msg) =>
          msg.role === "model" &&
          msg.message ===
            "I'm gathering some specific information to better answer your question..."
      );
      if (interimMessageIndex !== -1) {
        updatedPendingMessages.splice(interimMessageIndex, 1);
      }

      // Add the final response
      updatedPendingMessages.push({
        role: "model",
        message: finalResponse,
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

      // Only add AI response to pending messages
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

      // Save to server (but don't duplicate the user message)
      mutation.mutate({
        userMessage: null, // Don't add user message again
        aiResponse: formattedResponse,
        image: null,
      });

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
