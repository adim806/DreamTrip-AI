import { useContext, useState } from "react";
import "./newPromt.css";
import { useRef, useEffect } from "react";
import Upload from "../upload/Upload";
import { IKImage } from "imagekitio-react";

import Markdown from "react-markdown";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { useNavigate } from "react-router-dom";
import { TripContext, CONVERSATION_STATES } from "../tripcontext/TripProvider";
import { motion } from "framer-motion";
import { RiUser3Fill, RiCompass3Fill } from "react-icons/ri";
import { IoSend, IoImageOutline } from "react-icons/io5";

// Import UI components
import TripSummary from "../ui/TripSummary";
import ItineraryDisplay from "../ui/ItineraryDisplay";
import TripSelector from "../ui/TripSelector";
import ItineraryEditor from "../ui/ItineraryEditor";

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
  getInitialSystemInstruction,
  getBaseSystemInstruction,
  getGenerationConfig,
  intentRequiresExternalData,
} from "../../utils/aiPromptUtils";
import {
  generateItinerary,
  saveItinerary,
} from "../../utils/itineraryGenerator";

// Import custom hooks
import { useProcessUserInput } from "../../utils/hooks/useProcessUserInput";

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
  // Get the trip context
  const { 
    conversationState, 
    CONVERSATION_STATES, 
    transitionState,
    startNewTrip,
    tripDetails
  } = useContext(TripContext);
  
  // Image handling state
  const [img, setImg] = useState({
    isLoading: false,
    error: "",
    dbData: {},
    aiData: {},
  });

  // References for DOM elements
  const endRef = useRef(null);
  const formRef = useRef(null);
  const inputRef = useRef(null);
  
  // Use our custom hook for AI processing
  const processingHook = useProcessUserInput(data);
  const {
    processUserInput,
    pendingMessages,
    isTyping,
    handleGenerateItinerary
  } = processingHook;
  
  // Share the hook with the parent component by exposing it on window (temporary solution)
  useEffect(() => {
    // This is a workaround to share the hook state with ChatPage
    // A better solution would be to lift this state up or use Context API
    const updateHookState = () => {
      window.__processingHookState = {
        ...processingHook,
        // Always provide most current reference to functions
        processInitialMessage: processingHook.processInitialMessage,
        processUserInput: processingHook.processUserInput
      };
    };
    
    // Update immediately
    updateHookState();
    
    // Set a flag in the window object to indicate NewPromt is mounted and ready
    window.__newPromtReady = true;
    
    // Clear any ongoing typing indicator when component unmounts
    return () => {
      window.__newPromtReady = false;
      // Explicitly set isTyping to false to ensure indicator is removed
      if (processingHook && processingHook.setIsTyping) {
        processingHook.setIsTyping(false);
      }
      if (window.__processingHookState) {
        window.__processingHookState.isTyping = false;
      }
    };
  }, [processingHook]);
  
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

  // Monitor conversation state changes to debug TripSummary rendering
  useEffect(() => {
    // Debounce to prevent excessive monitoring and logging
    const debounceTimeout = setTimeout(() => {
      // Use a counter to only log periodically, not on every render
      const now = Date.now();
      const lastLogTime = window.__lastPromtMonitorLog || 0;
      
      // Only log if it's been more than 2 seconds since the last log
      if (now - lastLogTime > 2000) {
        window.__lastPromtMonitorLog = now;
        
        console.log("NewPromt monitoring state:", {
          conversationState,
          hasTripDetails: !!tripDetails,
          tripDetailsKeys: tripDetails ? Object.keys(tripDetails) : [],
          shouldDisplaySummary: conversationState === CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION && !!tripDetails
        });
        
        // Check if all the required trip data is present
        if (tripDetails) {
          const hasRequiredFields = 
            tripDetails.vacation_location && 
            tripDetails.duration &&
            ((tripDetails.dates && tripDetails.dates.from && tripDetails.dates.to) || tripDetails.isTomorrow) &&
            (tripDetails.budget || (tripDetails.constraints && tripDetails.constraints.budget));
            
          console.log("Trip completeness check in NewPromt:", { 
            hasRequiredFields,
            vacation_location: !!tripDetails.vacation_location,
            duration: !!tripDetails.duration,
            dates: !!(tripDetails.dates && tripDetails.dates.from && tripDetails.dates.to),
            isTomorrow: !!tripDetails.isTomorrow,
            budget: !!(tripDetails.budget || (tripDetails.constraints && tripDetails.constraints.budget))
          });
          
          // Force state transition if data is complete but we're not in the right state
          if (hasRequiredFields && conversationState !== CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION) {
            console.log("🔶 Trip data is complete but not in AWAITING_USER_TRIP_CONFIRMATION state");
          }
        }
      }
    }, 300); // 300ms debounce

    // Cleanup timeout on unmount or when dependencies change
    return () => clearTimeout(debounceTimeout);
  }, [conversationState, tripDetails]);

  // Trip summary action handlers
  const handleConfirmTrip = () => {
    // Display a system message before generating itinerary
    if (window.__processingHookState && window.__processingHookState.addSystemMessage) {
      window.__processingHookState.addSystemMessage(
        "Great! I'll generate your personalized travel itinerary now. This might take a moment..."
      );
    }
    
    // Generate the itinerary
    handleGenerateItinerary();
  };
  
  const handleEditTrip = () => {
    // Transition back to trip building mode to edit details
    transitionState(CONVERSATION_STATES.TRIP_BUILDING_MODE);
    
    // Display a system message for editing
    if (window.__processingHookState && window.__processingHookState.addSystemMessage) {
      window.__processingHookState.addSystemMessage(
        "Let's continue editing your trip details. What would you like to change?"
      );
    }
  };
  
  const handleCancelTrip = () => {
    // Reset and transition back to idle
    startNewTrip();
    transitionState(CONVERSATION_STATES.IDLE);
    
    // Display a system message for cancellation
    if (window.__processingHookState && window.__processingHookState.addSystemMessage) {
      window.__processingHookState.addSystemMessage(
        "I've cancelled the trip planning. How else can I assist you today?"
      );
    }
  };

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = e.target.text.value.trim();

    if (!text) return;

    // Clear input field immediately
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    // REMOVED: Don't add user message here - let processUserInput handle it
    // This prevents duplicate user messages
    console.log("NewPromt: Submitting user input:", text);

    // Process the input with our custom hook
    await processUserInput(text, img);
    
    // Reset image state after processing
    setImg({
      isLoading: false,
      error: "",
      dbData: {},
      aiData: {},
    });
  };

  // Determine if we should disable input based on state
  const isInputDisabled = conversationState === CONVERSATION_STATES.GENERATING_ITINERARY;

  return (
    <>
      <div className="w-full flex flex-col relative box-border bg-[#171923] max-h-full">
        {/* Trip selector component */}
        <TripSelector />
        
        {/* Trip summary with confirm/edit/cancel buttons */}
        <TripSummary 
          onConfirm={handleConfirmTrip}
          onEdit={handleEditTrip}
          onCancel={handleCancelTrip}
        />
        
        {/* Itinerary display component */}
        <ItineraryDisplay />
        
        {/* Itinerary editor component */}
        <ItineraryEditor />
        
        {/* Input form only - messages are displayed in the parent component */}
        <form 
          className="w-full relative bg-[#1a1e2d] flex items-center gap-4 mb-3 px-5 py-4 z-20 shadow-[0_-4px_15px_rgba(0,0,0,0.35)] border-t-2 border-blue-500/20 min-h-[70px] rounded-t-lg" 
          onSubmit={handleSubmit} 
          ref={formRef}
        >
          <Upload setImg={setImg} />
          {img.isLoading && (
            <div className="flex items-center justify-center bg-blue-500/15 rounded-lg px-2 h-6 ml-1">
              <LoadingDots />
            </div>
          )}
          {img.dbData?.filePath && (
            <div className="flex items-center justify-center bg-blue-500/20 rounded-lg px-2 h-6 ml-1" title="Image attached">
              <div className="text-sm text-gray-300">📎</div>
            </div>
          )}
          <input id="file" type="file" multiple={false} hidden />
          <input
            type="text"
            name="text"
            ref={inputRef}
            placeholder="Ask DreamTrip-AI about your next vacation..."
            disabled={isInputDisabled}
            className="flex-1 px-4 py-3 border-none outline-none bg-[#2a2d3c] text-gray-100 text-base rounded-xl h-[45px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)] focus:ring-2 focus:ring-blue-500/40"
          />
          <button 
            type="submit" 
            disabled={isInputDisabled}
            className="rounded-full bg-blue-500 border-none p-2.5 w-[45px] h-[45px] flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0 shadow-[0_3px_8px_rgba(59,130,246,0.4)] hover:bg-blue-600 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(59,130,246,0.5)] active:translate-y-[1px] active:shadow-[0_1px_3px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IoSend className="text-white text-xl" />
          </button>
        </form>
      </div>
    </>
  );
};

export default NewPromt;
