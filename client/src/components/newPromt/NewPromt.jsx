import { useContext, useState } from "react";
import "./newPromt.css";
import { useRef, useEffect } from "react";
import Upload from "../upload/Upload";
import { IKImage } from "imagekitio-react";

import Markdown from "react-markdown";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { useNavigate } from "react-router-dom";
import { TripContext } from "../tripcontext/TripProvider";
import { motion } from "framer-motion";
import { RiUser3Fill, RiCompass3Fill } from "react-icons/ri";
import { IoSend, IoImageOutline } from "react-icons/io5";

// Import utility functions
import {
  updateTripDraft,
  checkTripDraftCompleteness,
  generateFollowUpQuestion,
  formatTripSummary,
} from "../../utils/tripUtils";
import {
  fetchExternalData,
  buildPromptWithExternalData,
} from "../../utils/externalDataService";
import {
  extractStructuredDataFromResponse,
  getSystemInstruction,
  getGenerationConfig,
  intentRequiresExternalData,
} from "../../utils/aiPromptUtils";
import {
  generateItinerary,
  saveItinerary,
} from "../../utils/itineraryGenerator";

/**
 * NewPromt Component
 *
 * This component handles the interactive chat interface with functionality for user input,
 * image upload, and dynamic conversation display. It manages user queries, processes responses
 * from the Gemini AI model, and updates the chat log based on user interactions.
 *
 * Key Functionalities:
 * - **User Input Handling**: Captures user text input and submits it to the chat model.
 * - **Image Uploading**: Integrates image uploads via the ImageKit API for adding visuals to conversations.
 * - **Gemini Model Interaction**: Uses Gemini API's `startChat` method to manage chat history
 *    and respond to user messages dynamically.
 * - **Real-Time Chat Display**: Displays each user query and Gemini's response in real-time,
 *    leveraging Markdown for text formatting and streaming for seamless conversation.
 * - **Auto Scroll**: Automatically scrolls the chat to the latest message.
 *
 * Props:
 * - `data` (Object): Contains chat history and metadata about previous interactions in the chat.
 *
 * State:
 * - `currentInput` (String): Stores the current user input being processed.
 * - `isTyping` (Boolean): Indicates whether the AI is currently typing a response.
 * - `pendingMessages` (Array): Manages pending messages before they are saved to the server.
 * - `img` (Object): Manages image data, including loading status, error states, and both database
 *    and AI-derived data for uploaded images.
 *
 * References:
 * - `endRef` (Ref): References the end of the chat container to enable auto-scrolling to the latest message.
 * - `formRef` (Ref): References the form input for resetting after successful submission.
 *
 * Important Methods:
 * - **processUserInput(userMessage)**: Sends a message to the Gemini model and processes the response.
 * - **handleSubmit(e)**: Event handler for submitting the form, initiates `processUserInput()` with the user query.
 *
 * API Integration:
 * - Uses react-query's `useMutation` to manage `PUT` requests to the server for saving chat data.
 * - `useMutation` triggers a re-fetch of chat data upon success, ensuring the latest chat state is displayed.
 *
 * Usage:
 * Place this component within a layout or chat page to create a responsive and interactive
 * chat interface with support for rich text, image upload, and real-time updates.
 *
 */

// האווטאר של סוכן הטיולים - נשתמש באותו קישור כמו ב-ChatPage
const TRAVEL_AGENT_AVATAR =
  "https://img.freepik.com/premium-vector/artificial-intelligence-character-avatar-futuristic-digital-ai-assistant-profile-picture_555042-38.jpg";

const TypingIndicator = () => {
  return (
    <div className="typing-indicator">
      <div className="typing-indicator-content">
        <div className="ai-avatar-container mr-1">
          <RiCompass3Fill className="text-blue-400 text-sm" />
        </div>
        <span className="typing-text">מקליד</span>
        <div className="typing-dots">
          {[0, 1, 2].map((dot) => (
            <motion.div
              key={dot}
              className="dot"
              animate={{
                y: ["0%", "-40%", "0%"],
                opacity: [0.6, 1, 0.6],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: dot * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const LoadingDots = () => {
  return (
    <div className="flex items-center justify-center space-x-1">
      {[0, 1, 2].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-blue-400 rounded-full"
          animate={{
            y: ["0%", "-50%", "0%"],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: dot * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

const NewPromt = ({ data }) => {
  // Current user input and temporary display states
  const [currentInput, setCurrentInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);

  // Remove the local processedChatIds state
  // Instead we'll use a ref that persists between renders
  const processedChatIdsRef = useRef(new Set());

  // Image handling states
  const [img, setImg] = useState({
    isLoading: false,
    error: "",
    dbData: {},
    aiData: {},
  });

  // Navigation and context
  const navigate = useNavigate();
  const { tripDetails, setTripDetails, setallTripData } =
    useContext(TripContext);

  // References
  const endRef = useRef(null);
  const formRef = useRef(null);
  const inputRef = useRef(null);

  // AI model setup
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: getSystemInstruction(),
  });

  const generationConfig = getGenerationConfig();

  // Initialize chat with history
  const chat = model.startChat({
    generationConfig,
    history: [
      ...(data?.history?.map(({ role, parts }) => ({
        role,
        parts: [{ text: parts[0].text }],
      })) || []),
    ],
  });

  // Auto-scroll handling
  useEffect(() => {
    const scrollToBottom = () => {
      const chatContainer = document.getElementById("chat-messages-container");
      if (chatContainer) {
        setTimeout(() => {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 200);
      }
    };

    scrollToBottom();

    const chatContainer = document.getElementById("chat-messages-container");
    if (chatContainer) {
      const observer = new MutationObserver(scrollToBottom);
      observer.observe(chatContainer, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      return () => observer.disconnect();
    }
  }, [data, pendingMessages]);

  // Query client for mutations
  const queryClient = useQueryClient();

  // Mutation for saving chat data
  const mutation = useMutation({
    mutationFn: async ({ userMessage, aiResponse, image }) => {
      console.log("Saving to server:", { userMessage, aiResponse, image });

      return fetch(`${import.meta.env.VITE_API_URL}/api/chats/${data._id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userMessage,
          answer: aiResponse,
          img: image || undefined,
        }),
      }).then((res) => res.json());
    },
    onSuccess: () => {
      console.log("Message saved successfully");
      queryClient
        .invalidateQueries({ queryKey: ["chat", data._id] })
        .then(() => {
          // Clear pending messages as they're now in the main chat
          setPendingMessages([]);

          // Reset image state
          setImg({
            isLoading: false,
            error: "",
            dbData: {},
            aiData: {},
          });
        });
    },
    onError: (err) => {
      console.error("Failed to save message:", err);
    },
  });

  // Handle itinerary generation
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

        // Store the itinerary in the trip context for use elsewhere in the app
        setallTripData({
          tripDetails,
          itinerary: itineraryResult.itinerary,
          metadata: itineraryResult.metadata,
        });

        // Save the itinerary to the server (if you have a backend API for this)
        try {
          // This is optional - implemented if you have a backend endpoint for itineraries
          const saveResult = await saveItinerary(data._id, itineraryResult);
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

  // Add this function to check if a chat has already been processed
  const markChatAsProcessed = (chatId) => {
    // Get the query data from the cache
    const chatData = queryClient.getQueryData(["chat", chatId]);

    // If the chat already has model responses, consider it processed
    if (chatData?.history?.length > 1) {
      console.log(
        `Chat ${chatId} already has responses, skipping auto-processing`
      );
      return true;
    }

    // Check our local ref
    if (processedChatIdsRef.current.has(chatId)) {
      console.log(`Chat ${chatId} was already processed in this session`);
      return true;
    }

    // Mark as processed in our local ref
    processedChatIdsRef.current.add(chatId);
    console.log(`Marking chat ${chatId} as processed for the first time`);
    return false;
  };

  // Fix the auto-processing effect to use both cache and ref check
  useEffect(() => {
    if (!data?._id) return;

    // Only process if the chat has exactly one message and hasn't been processed
    if (
      data.history?.length === 1 &&
      data.history[0].role === "user" &&
      !isTyping
    ) {
      // Check if this chat has already been processed
      if (markChatAsProcessed(data._id)) {
        return; // Skip if already processed
      }

      const initialMessage = data.history[0].parts[0].text;
      console.log("Auto-processing initial message:", initialMessage);

      setIsTyping(true);

      (async () => {
        try {
          // Add a small delay to avoid race conditions
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Recheck to make sure another instance didn't process it
          if (
            queryClient.getQueryData(["chat", data._id])?.history?.length > 1
          ) {
            console.log("Another process already handled this chat, aborting");
            setIsTyping(false);
            return;
          }

          // Send message to AI
          const result = await chat.sendMessageStream([initialMessage]);

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
            const completenessCheck =
              checkTripDraftCompleteness(newTripDetails);
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
            }
          }

          // Save to server (but don't duplicate the user message)
          mutation.mutate({
            userMessage: null, // Don't add user message again
            aiResponse: formattedResponse,
            image: null,
          });
        } catch (error) {
          console.error("Error auto-processing initial message:", error);
          setPendingMessages([
            {
              role: "model",
              message:
                "Sorry, I encountered an error processing your request. Please try again.",
            },
          ]);
        } finally {
          setIsTyping(false);
        }
      })();
    }
  }, [data?._id, data?.history?.length]);

  // Process user input with RAG and structured response handling
  const processUserInput = async (userMessage) => {
    setIsTyping(true);

    // Add the user message to pending messages first
    setPendingMessages((prev) => [
      ...prev,
      {
        role: "user",
        message: userMessage,
        img: img.dbData?.filePath || null,
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
          image: img.dbData?.filePath,
        });

        setIsTyping(false);
        // Trigger itinerary generation
        handleGenerateItinerary();
        return { success: true };
      }

      // First send message to AI for initial analysis
      const result = await chat.sendMessageStream(
        Object.entries(img.aiData).length
          ? [img.aiData, userMessage]
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
          const enrichedResult = await chat.sendMessageStream([enrichedPrompt]);

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
      }

      // Save to server
      mutation.mutate({
        userMessage,
        aiResponse: finalResponse,
        image: img.dbData?.filePath,
      });

      // Reset image state after sending
      setImg({
        isLoading: false,
        error: "",
        dbData: {},
        aiData: {},
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

      // Reset image state on error too
      setImg({
        isLoading: false,
        error: "",
        dbData: {},
        aiData: {},
      });

      return { success: false, error };
    } finally {
      setIsTyping(false);
    }
  };

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = e.target.text.value.trim();

    if (!text) return;

    // Clear input field
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    // Process the input
    await processUserInput(text);
  };

  return (
    <>
      <div className="newpPromt">
        <div className="chat-container">
          {/* Pending messages (not yet saved to server) */}
          {pendingMessages.map((msg, index) => (
            <div
              key={`pending-${index}`}
              className={`message ${msg.role === "user" ? "user" : ""}`}
            >
              {msg.role === "user" ? (
                <div className="message-header">
                  <RiUser3Fill className="user-icon text-sm" />
                </div>
              ) : (
                <div className="message-header">
                  <div className="ai-avatar-container">
                    <RiCompass3Fill className="text-blue-400 text-sm" />
                  </div>
                </div>
              )}
              <div className="message-content">
                {msg.img && (
                  <div className="image-container">
                    <IKImage
                      urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
                      path={msg.img}
                      width="100%"
                      height="auto"
                      transformation={[{ width: 300 }]}
                      className="message-image rounded-lg"
                      loading="lazy"
                      lqip={{ active: true, quality: 20 }}
                    />
                  </div>
                )}
                <Markdown>{msg.message}</Markdown>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && <TypingIndicator />}

          {/* Itinerary generation indicator */}
          {isGeneratingItinerary && (
            <div className="typing-indicator">
              <div className="typing-indicator-content">
                <div className="ai-avatar-container mr-1">
                  <RiCompass3Fill className="text-blue-400 text-sm" />
                </div>
                <span className="typing-text">Generating your itinerary</span>
                <div className="typing-dots">
                  {[0, 1, 2].map((dot) => (
                    <motion.div
                      key={dot}
                      className="dot"
                      animate={{
                        y: ["0%", "-40%", "0%"],
                        opacity: [0.6, 1, 0.6],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: dot * 0.2,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="endChat" ref={endRef}></div>
        </div>

        <form className="newform" onSubmit={handleSubmit} ref={formRef}>
          <Upload setImg={setImg} />
          {img.isLoading && (
            <div className="image-loading-indicator">
              <LoadingDots />
            </div>
          )}
          {img.dbData?.filePath && (
            <div className="image-preview-badge" title="Image attached">
              <div className="image-status">📎</div>
            </div>
          )}
          <input id="file" type="file" multiple={false} hidden />
          <input
            type="text"
            name="text"
            ref={inputRef}
            placeholder="Ask DreamTrip-AI about your next vacation..."
            onChange={(e) => setCurrentInput(e.target.value)}
            disabled={isGeneratingItinerary}
          />
          <button type="submit" disabled={isGeneratingItinerary}>
            <IoSend className="send-icon" />
          </button>
        </form>
      </div>
    </>
  );
};

export default NewPromt;
