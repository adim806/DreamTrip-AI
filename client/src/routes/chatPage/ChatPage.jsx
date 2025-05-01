import React, { useContext, useEffect, useRef } from "react";
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

  useEffect(() => {
    console.log("Chat data:", data);
  }, [data, chatId]);

  // Scroll to bottom whenever data changes
  useEffect(() => {
    if (data && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [data]);

  // Add this effect
  useEffect(() => {
    // Check if this is a new chat with only one message (the user message)
    if (data && data.history && data.history.length === 1 && 
        data.history[0].role === 'user') {
      // Find the NewPromt component instance and trigger processing
      const newPromtComponent = document.querySelector('.newPromt');
      if (newPromtComponent && typeof newPromtComponent.__reactFiber$ !== 'undefined') {
        // Alternative approach: Add a ref to NewPromt and call a method on it
        console.log("New chat detected, should auto-process first message");
        // This is a workaround - ideally you'd use a ref or context to communicate
      }
    }
  }, [data]);

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
              data?.history?.map((message, i) => (
                <React.Fragment key={i}>
                  <div
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
                  </div>
                </React.Fragment>
              ))
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
