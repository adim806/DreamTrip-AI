import React, { useContext, useEffect, useRef, useState, useMemo } from "react";
import NewPromt from "../../components/newPromt/NewPromt";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import Markdown from "react-markdown";
import { IKImage } from "imagekitio-react";
import { TripContext } from "@/components/tripcontext/TripProvider";
import { RiUser3Fill, RiRobot2Fill, RiCompass3Fill } from "react-icons/ri";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/clerk-react";

const ChatPage = () => {
  const path = useLocation().pathname;
  const chatId = path.split("/").pop();
  const { tripDetails } = useContext(TripContext);
  const chatContainerRef = useRef(null);
  const { userId, isLoaded, isSignedIn, getToken } = useAuth();

  const { isPending, error, data } = useQuery({
    queryKey: ["chat", chatId, userId],
    queryFn: async () => {
      try {
        // Get authentication headers or use query params in development
        const headers = isSignedIn 
          ? { 'Authorization': `Bearer ${await getToken()}` }
          : {};
          
        // Make API request with auth
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/chats/${chatId}?userId=${userId}`, 
          {
            credentials: "include",
            headers
          }
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch chat: ${response.status}`);
        }
        
        return response.json();
      } catch (error) {
        console.error("Error fetching chat:", error);
        throw error;
      }
    },
    enabled: isLoaded && (isSignedIn || import.meta.env.DEV) && !!userId && !!chatId,
    retry: 1,
    retryDelay: 1000,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Get pending messages and typing status from the hook
  const [hookState, setHookState] = useState({
    pendingMessages: [],
    isTyping: false,
    isGeneratingItinerary: false,
    processInitialMessage: () => {}
  });
  
  // Check for updates to the hook state
  useEffect(() => {
    const checkHookState = () => {
      if (window.__processingHookState) {
        setHookState({
          pendingMessages: window.__processingHookState.pendingMessages || [],
          isTyping: window.__processingHookState.isTyping || false,
          isGeneratingItinerary: window.__processingHookState.isGeneratingItinerary || false,
          processInitialMessage: window.__processingHookState.processInitialMessage || (() => {})
        });
      }
    };
    
    // Initial check
    checkHookState();
    
    // Set up interval to check regularly
    const interval = setInterval(checkHookState, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  const { pendingMessages, isTyping, isGeneratingItinerary, processInitialMessage } = hookState;

  useEffect(() => {
    console.log("Chat data:", data);
  }, [data, chatId]);

  // Scroll to bottom whenever data or pending messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [data, pendingMessages, isTyping]);

  // Process initial message in a new chat (with better timing)
  useEffect(() => {
    // Check if this is a new chat with only one message (the user message)
    if (data && data.history && data.history.length === 1 && 
        data.history[0].role === 'user' && !isTyping) {
      
      // Only process if there are no model responses yet
      const hasModelResponse = data.history.some(msg => msg.role === 'model');
      
      if (!hasModelResponse) {
        // Wait for NewPromt component to be ready
        const checkAndProcess = () => {
          if (window.__newPromtReady && window.__processingHookState) {
            const initialMessage = data.history[0].parts[0].text;
            console.log("New chat detected, processing first message:", initialMessage);
            
            // Make sure we're not already processing
            if (!window.__processingHookState.isTyping) {
              window.__processingHookState.processInitialMessage(initialMessage);
            }
          } else {
            // Try again in a short moment
            setTimeout(checkAndProcess, 100);
          }
        };
        
        checkAndProcess();
      }
    }
  }, [data]);

  // Filter out duplicate pending messages that are already in history
  const filteredPendingMessages = useMemo(() => {
    if (!data?.history || !pendingMessages?.length) return pendingMessages;

    // Special case for initial message in new chat - don't filter
    if (data.history.length === 1 && data.history[0].role === 'user') {
      return pendingMessages;
    }

    // Create a more robust filtering system that prevents message flickering
    return pendingMessages.filter(pendingMsg => {
      // Keep all user messages that aren't already in history
      if (pendingMsg.role === 'user') {
        return !data.history.some(historyMsg => 
          historyMsg.role === 'user' && 
          historyMsg.parts[0].text === pendingMsg.message
        );
      }
      
      // For model messages, use more sophisticated matching to prevent flickering
      // and handle content that might have been partially stored
      for (const historyMsg of data.history) {
        if (historyMsg.role !== 'model') continue;
        
        const pendingText = pendingMsg.message?.trim() || '';
        const historyText = historyMsg.parts[0].text?.trim() || '';
        
        // If the exact content is already in history, filter it out
        if (pendingText === historyText) return false;
        
        // If history contains the entire pending message, filter it out
        if (historyText.includes(pendingText) && pendingText.length > 10) return false;
        
        // If pending contains the entire history message, filter it out
        if (pendingText.includes(historyText) && historyText.length > 10) return false;
      }
      
      return true;
    });
  }, [pendingMessages, data?.history]);

  // Ref to keep track of which messages are being displayed
  const displayedMessagesRef = useRef(new Set());
  
  // Handle smooth transitions for pending messages
  useEffect(() => {
    if (!data?.history || !filteredPendingMessages.length) return;
    
    // Keep track of which messages are currently displayed
    const currentDisplayed = new Set();
    
    // Mark all history messages as displayed
    data.history.forEach((msg, index) => {
      const key = `history-${msg.role}-${index}`;
      currentDisplayed.add(key);
    });
    
    // Mark all pending messages as displayed
    filteredPendingMessages.forEach((msg, index) => {
      const key = `pending-${msg.role}-${msg.id || index}`;
      currentDisplayed.add(key);
    });
    
    // Update our ref
    displayedMessagesRef.current = currentDisplayed;
    
  }, [data?.history, filteredPendingMessages]);

  // Typing indicator component
  const TypingIndicator = () => {
    return (
      <div className="typing-indicator px-4 py-3 rounded-xl text-white text-base max-w-[75%] shadow-md bg-[#2a2d3c] self-start border-t border-l border-gray-700/30 flex gap-3">
        <div className="message-header">
          <div className="ai-avatar-container">
            <RiCompass3Fill className="text-blue-400 text-sm" />
          </div>
        </div>
        <div className="typing-indicator-content flex items-center">
          <span className="typing-text mr-2">typing</span>
          <div className="typing-dots flex">
            {[0, 1, 2].map((dot) => (
              <motion.div
                key={dot}
                className="w-1.5 h-1.5 bg-blue-400 rounded-full mx-0.5"
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

  return (
    <div className="flex flex-col h-full w-full rounded-xl shadow-lg bg-[rgba(25,28,40,0.97)] overflow-hidden">
      {/* Chat Header - עיצוב משופר */}
      <div className="flex items-center justify-between py-2 px-4 bg-gradient-to-r from-[#1E293B] to-[#1E1F2A] border-b border-gray-800/60">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600/20 p-1.5 rounded-full flex items-center justify-center">
            <RiCompass3Fill className="text-blue-400 text-lg" />
          </div>
          <div>
            <h3 className="text-white font-medium text-base tracking-wide">DreamTrip AI</h3>
            <div className="flex items-center">
              <motion.div
                className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-xs text-gray-400">Active</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="text-xs py-1 px-2 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800/30">
            Travel Assistant
          </div>
        </div>
      </div>

      {/* Chat Content with History and Input */}
      <div className="flex-1 flex flex-col bg-[#171923] overflow-hidden">
        {/* Message History */}
        <div 
          ref={chatContainerRef}
          id="chat-messages-container"
          className="flex-1 overflow-y-auto p-4 pb-2"
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          <div className="flex flex-col gap-4">
            {isPending ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-pulse flex space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-2 h-2 bg-blue-400 rounded-full" 
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="text-center p-4 text-red-400 bg-red-900/20 rounded-lg border border-red-800/30">
                Error loading chat
              </div>
            ) : (
              <>
                {/* Server-loaded chat history */}
                {data?.history?.map((message, i) => (
                  <React.Fragment key={`history-${i}`}>
                    <motion.div
                      initial={{ opacity: 0.9 }}
                      animate={{ opacity: 1 }}
                      className={`px-4 py-3 rounded-xl text-white text-base max-w-[75%] shadow-md leading-relaxed flex gap-3 ${
                        message.role === "user"
                          ? "bg-blue-600/20 text-[#f9f9f9] self-end flex-row-reverse border-t border-r border-blue-500/20"
                          : "bg-[#2a2d3c] self-start border-t border-l border-gray-700/30"
                      }`}
                    >
                      {message.role === "user" ? (
                        <div className="message-header">
                          <div className="bg-blue-500/30 p-1 rounded-full">
                            <RiUser3Fill className="text-white text-xs" />
                          </div>
                        </div>
                      ) : (
                        <div className="message-header">
                          <div className="ai-avatar-container">
                            <RiCompass3Fill className="text-blue-400 text-sm" />
                          </div>
                        </div>
                      )}
                      
                      <div className="message-content overflow-wrap-break-word" style={{ maxWidth: "calc(100% - 30px)" }}>
                        {message.img && (
                          <div className="image-container mb-2">
                            <IKImage
                              urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
                              path={message.img}
                              width="100%"
                              height="auto"
                              transformation={[{ width: 300 }]}
                              loading="lazy"
                              lqip={{ active: true, quality: 20 }}
                              className="message-image rounded-lg"
                            />
                          </div>
                        )}
                        <Markdown>{message.parts[0].text}</Markdown>
                      </div>
                    </motion.div>
                  </React.Fragment>
                ))}
                
                {/* Pending messages not yet saved to server */}
                {filteredPendingMessages.map((message, i) => (
                  <React.Fragment key={`pending-${message.id || i}`}>
                    <motion.div
                      initial={{ opacity: 0.5, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`px-4 py-3 rounded-xl text-white text-base max-w-[75%] shadow-md leading-relaxed flex gap-3 ${
                        message.role === "user"
                          ? "bg-blue-600/20 text-[#f9f9f9] self-end flex-row-reverse border-t border-r border-blue-500/20"
                          : "bg-[#2a2d3c] self-start border-t border-l border-gray-700/30"
                      }`}
                    >
                      {message.role === "user" ? (
                        <div className="message-header">
                          <div className="bg-blue-500/30 p-1 rounded-full">
                            <RiUser3Fill className="text-white text-xs" />
                          </div>
                        </div>
                      ) : (
                        <div className="message-header">
                          <div className="ai-avatar-container">
                            <RiCompass3Fill className="text-blue-400 text-sm" />
                          </div>
                        </div>
                      )}
                      
                      <div className="message-content overflow-wrap-break-word" style={{ maxWidth: "calc(100% - 30px)" }}>
                        {message.img && (
                          <div className="image-container mb-2">
                            <IKImage
                              urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
                              path={message.img}
                              width="100%"
                              height="auto"
                              transformation={[{ width: 300 }]}
                              loading="lazy"
                              lqip={{ active: true, quality: 20 }}
                              className="message-image rounded-lg"
                            />
                          </div>
                        )}
                        <Markdown>{message.message}</Markdown>
                      </div>
                    </motion.div>
                  </React.Fragment>
                ))}
                
                {/* Typing indicator */}
                {isTyping && <TypingIndicator />}
                
                {/* Itinerary generation indicator */}
                {isGeneratingItinerary && (
                  <div className="px-4 py-3 rounded-xl text-white text-base max-w-[75%] shadow-md bg-[#2a2d3c] self-start border-t border-l border-gray-700/30 flex gap-3">
                    <div className="message-header">
                      <div className="ai-avatar-container">
                        <RiCompass3Fill className="text-blue-400 text-sm" />
                      </div>
                    </div>
                    <div className="typing-indicator-content flex items-center">
                      <span className="typing-text mr-2">Generating your itinerary</span>
                      <div className="typing-dots flex">
                        {[0, 1, 2].map((dot) => (
                          <motion.div
                            key={dot}
                            className="w-1.5 h-1.5 bg-blue-400 rounded-full mx-0.5"
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
              </>
            )}
          </div>
        </div>
        
        {/* Input Component */}
        {data && (
          <div className="flex-shrink-0 border-t border-[#2a2d3c]">
            <NewPromt data={data} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
