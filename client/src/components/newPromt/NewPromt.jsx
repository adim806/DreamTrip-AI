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
const TRAVEL_AGENT_AVATAR = "https://img.freepik.com/premium-vector/artificial-intelligence-character-avatar-futuristic-digital-ai-assistant-profile-picture_555042-38.jpg";

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
  const { setTripDetails } = useContext(TripContext);
  
  // References
  const endRef = useRef(null);
  const formRef = useRef(null);
  const inputRef = useRef(null);
  
  // AI model setup
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `
      You are a highly intelligent travel agent called 'DreamTrip-AI'. Your primary goal is to analyze user input, classify it into a structured format, and respond accordingly as a knowledgeable travel assistant.

      ### Tasks:
      1. **Input Analysis**:
        - Classify the user's input into one of two modes:
          - "Advice": For general travel-related queries or advice.
          - "Trip-Building": For requests requiring a detailed travel plan.
        - Determine if the input provides complete information or if additional details are required.
        - Return a structured JSON object with the analyzed input details.

      2. **Responding to User**:
        - If the mode is "Advice":
          - Provide detailed and relevant travel advice.
          - Ask clarifying questions if the input is incomplete.
        - If the mode is "Trip-Building":
          - Use the structured data to create or continue a personalized travel plan.
          - If data is incomplete, ask targeted questions to fill in missing information.

      ### Response Format:
      Return a JSON object structured as follows:
      \`\`\`json
      {
        "mode": "Advice" or "Trip-Building",
        "status": "Complete" or "Incomplete",
        "response": "Your detailed response here if clarification is needed",
        "data": {
          "vacation_location": "string",
          "duration": "integer",
          "constraints": {
            "travel_type": "string",
            "preferred_activity": "string",
            "budget": "string",
            "special_requirements": [
              "Eco-Friendly",
              "Accessible for Disabilities",
              "Kid-Friendly",
              "Pet-Friendly",
              "Avoid long walks",
              "Close to transportation",
              "Vegetarian/Vegan dining"
            ]
          },
          "preferences": {
            "hotel_preferences": "string",
            "dining_preferences": "string",
            "transportation_mode": "string"
          },
          "notes": "string"
        }
      }
      \`\`\`

      ### Guidelines:
      - Always maintain context based on the conversation history.
      - Respond in a professional, concise, and friendly manner.
      - Use user-provided constraints and preferences to enhance responses.
    `,
  });

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 1200,
    responseMimeType: "application/json",
  };

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
      const chatContainer = document.getElementById('chat-messages-container');
      if (chatContainer) {
        setTimeout(() => {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 200);
      }
    };
    
    scrollToBottom();
    
    const chatContainer = document.getElementById('chat-messages-container');
    if (chatContainer) {
      const observer = new MutationObserver(scrollToBottom);
      observer.observe(chatContainer, { 
        childList: true, 
        subtree: true,
        characterData: true 
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
      queryClient.invalidateQueries({ queryKey: ["chat", data._id] })
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

  // Function to generate a prompt from trip details
  const generatePromptFromObject = (tripDetails) => {
    if (!tripDetails || typeof tripDetails !== "object") {
      return "No valid trip details provided.";
    }

    const {
      vacation_location,
      duration,
      constraints = {},
      preferences = {},
      notes,
    } = tripDetails;

    const {
      travel_type = "Not specified",
      preferred_activity = "Not specified",
      budget = "Not specified",
      special_requirements = [],
    } = constraints;

    const {
      hotel_preferences = "Not specified",
      dining_preferences = "Not specified",
      transportation_mode = "Not specified",
    } = preferences;

    const specialRequirementsText =
      special_requirements.length > 0
        ? special_requirements.join(", ")
        : "No specific requirements provided.";

    let result = `Generate a detailed travel plan for the following trip:\n`;

    if (vacation_location) {
      result += `- **Location**: ${vacation_location}\n`;
    }

    if (duration) {
      result += `- **Duration**: ${duration} days\n`;
    }

    if (travel_type !== "Not specified") {
      result += `- **Travel Type**: ${travel_type}\n`;
    }

    if (preferred_activity !== "Not specified") {
      result += `- **Preferred Activity**: ${preferred_activity}\n`;
    }

    if (budget !== "Not specified") {
      result += `- **Budget**: ${budget}\n`;
    }

    if (hotel_preferences !== "Not specified") {
      result += `- **Hotel Preferences**: ${hotel_preferences}\n`;
    }

    if (dining_preferences !== "Not specified") {
      result += `- **Dining Preferences**: ${dining_preferences}\n`;
    }

    if (transportation_mode !== "Not specified") {
      result += `- **Transportation Mode**: ${transportation_mode}\n`;
    }

    if (specialRequirementsText !== "No specific requirements provided.") {
      result += `- **Special Requirements**: ${specialRequirementsText}\n`;
    }

    if (notes) {
      result += `- **Additional Notes**: ${notes}\n`;
    }

    return result.trim();
  };

  // Add this function to check if a chat has already been processed
  const markChatAsProcessed = (chatId) => {
    // Get the query data from the cache
    const chatData = queryClient.getQueryData(["chat", chatId]);
    
    // If the chat already has model responses, consider it processed
    if (chatData?.history?.length > 1) {
      console.log(`Chat ${chatId} already has responses, skipping auto-processing`);
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
    if (data.history?.length === 1 && 
        data.history[0].role === 'user' && 
        !isTyping) {
      
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
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Recheck to make sure another instance didn't process it
          if (queryClient.getQueryData(["chat", data._id])?.history?.length > 1) {
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

          // Process the response
          let formattedResponse = aiResponse;
          let tripData = null;

          // Try to extract JSON from response
          const jsonMatch = aiResponse.match(/{[\s\S]*}/);
          if (jsonMatch) {
            try {
              const jsonObject = JSON.parse(jsonMatch[0]);
              formattedResponse = jsonObject.response || aiResponse;
              
              if (jsonObject.mode === "Trip-Building") {
                tripData = jsonObject.data;
                if (tripData) {
                  setTripDetails(tripData);
                }
              }
            } catch (error) {
              console.error("Failed to parse JSON:", error);
            }
          }
          
          // Only add AI response to pending messages
          setPendingMessages([{
            role: 'model',
            message: formattedResponse
          }]);
          
          // Save to server (but don't duplicate the user message)
          mutation.mutate({ 
            userMessage: null, // Don't add user message again
            aiResponse: formattedResponse,
            image: null
          });
          
        } catch (error) {
          console.error("Error auto-processing initial message:", error);
          setPendingMessages([{
            role: 'model',
            message: "Sorry, I encountered an error processing your request. Please try again."
          }]);
        } finally {
          setIsTyping(false);
        }
      })();
    }
  }, [data?._id, data?.history?.length]);

  // Process user input
  const processUserInput = async (userMessage) => {
    setIsTyping(true);
    
    // Add the user message to pending messages first
    setPendingMessages(prev => [...prev, {
      role: 'user',
      message: userMessage,
      img: img.dbData?.filePath || null
    }]);

    try {
      console.log("Processing user input:", userMessage);
      
      // Send message to AI
      const result = await chat.sendMessageStream(
        Object.entries(img.aiData).length ? [img.aiData, userMessage] : [userMessage]
      );
      
      let aiResponse = "";
      for await (const chunk of result.stream) {
        aiResponse += chunk.text();
      }
      
      console.log("AI response:", aiResponse);

      // Process the response
      let formattedResponse = aiResponse;
      let tripData = null;

      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/{[\s\S]*}/);
      if (jsonMatch) {
        try {
          const jsonObject = JSON.parse(jsonMatch[0]);
          console.log("Parsed JSON:", jsonObject);
          
          // Get formatted response from JSON
          formattedResponse = jsonObject.response || aiResponse;
          
          // Handle Trip-Building mode
          if (jsonObject.mode === "Trip-Building") {
            console.log("Trip-Building mode detected");
            tripData = jsonObject.data;
            if (tripData) {
              setTripDetails(tripData);
              console.log("Trip data saved to context");
              
              // Generate trip prompt
              const tripPrompt = generatePromptFromObject(tripData);
              console.log("Generated trip prompt:", tripPrompt);
            }
          }
        } catch (error) {
          console.error("Failed to parse JSON:", error);
        }
      }
      
      // Add AI response to pending messages
      setPendingMessages(prev => [...prev, {
        role: 'model',
        message: formattedResponse
      }]);
      
      // Save to server
      mutation.mutate({ 
        userMessage, 
        aiResponse: formattedResponse,
        image: img.dbData?.filePath
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
      setPendingMessages(prev => [...prev, {
        role: 'model',
        message: "Sorry, I encountered an error processing your request. Please try again."
      }]);
      
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
            <div key={`pending-${index}`} className={`message ${msg.role === 'user' ? 'user' : ''}`}>
              {msg.role === 'user' ? (
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
          />
          <button type="submit">
            <IoSend className="send-icon" />
          </button>
        </form>
      </div>
    </>
  );
};

export default NewPromt;
