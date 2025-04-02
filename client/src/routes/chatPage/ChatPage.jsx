import React, { useContext, useEffect, useRef } from "react";
import NewPromt from "../../components/newPromt/NewPromt";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import Markdown from "react-markdown";
import { IKImage } from "imagekitio-react";
import { TripContext } from "@/components/tripcontext/TripProvider";
import { FcAssistant } from "react-icons/fc";
import { FaUser, FaRobot } from "react-icons/fa";

const ChatPage = () => {
  const path = useLocation().pathname;
  const chatId = path.split("/").pop();
  const { tripDetails } = useContext(TripContext);
  const chatContainerRef = useRef(null);

  const { isPending, error, data } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/api/chats/${chatId}`, {
        credentials: "include",
      }).then((res) => res.json()),
  });

  useEffect(() => {
    console.log(data);
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
    <div className="flex flex-col h-full w-full rounded-xl shadow-lg bg-[rgba(30,30,46,0.95)] overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center p-4 bg-gradient-to-r from-[#4d5ee2] to-[#30304b] text-white font-bold text-lg border-b border-[#444]">
        <FcAssistant className="mr-2 text-xl" />
        <h3>DreamTrip-AI Assistant</h3>
      </div>

      {/* Chat Content with History and Input */}
      <div className="flex-1 flex flex-col bg-[#292945] overflow-hidden">
        {/* Message History */}
        <div 
          ref={chatContainerRef}
          id="chat-messages-container"
          className="flex-1 overflow-y-auto p-4 pb-2"
          style={{ maxHeight: "calc(100vh - 130px)" }}
        >
          <div className="flex flex-col gap-4">
            {isPending ? (
              <div className="text-center p-4">Loading...</div>
            ) : error ? (
              <div className="text-center p-4 text-red-500">Error loading chat</div>
            ) : (
              data?.history?.map((message, i) => (
                <React.Fragment key={i}>
                  <div
                    className={`px-4 py-3 bg-[#2b3c5a] rounded-xl text-white text-base max-w-[75%] shadow-md leading-relaxed flex gap-3 ${
                      message.role === "user"
                        ? "bg-[#5561c0] text-[#f9f9f9] self-end flex-row-reverse"
                        : "self-start"
                    }`}
                  >
                    {message.role === "user" ? (
                      <div className="message-header">
                        <FaUser className="text-white text-sm" />
                      </div>
                    ) : (
                      <div className="message-header">
                        <FaRobot className="text-[#8aa2d3] text-sm" />
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
          <div className="flex-shrink-0 border-t border-[#3c3c56]">
            <NewPromt data={data} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
