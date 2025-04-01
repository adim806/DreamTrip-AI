import React, { useContext, useEffect, useRef } from "react";
import NewPromt from "../../components/newPromt/NewPromt";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import Markdown from "react-markdown";
import { IKImage } from "imagekitio-react";
import { TripContext } from "@/components/tripcontext/TripProvider";
import { FcAssistant } from "react-icons/fc";

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

  return (
    <div className="flex flex-col h-full w-full rounded-xl shadow-lg bg-[rgba(30,30,46,0.95)] overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center p-4 bg-gradient-to-r from-[#4d5ee2] to-[#30304b] text-white font-bold text-lg border-b border-[#444]">
        <FcAssistant className="mr-2 text-xl" />
        <h3>AI-Assistant</h3>
      </div>

      {/* Chat Content with History and Input */}
      <div className="flex-1 flex flex-col bg-[#292945] overflow-hidden">
        {/* Message History */}
        <div 
          ref={chatContainerRef}
          id="chat-messages-container"
          className="flex-1 overflow-y-auto p-4 pb-2"
        >
          <div className="flex flex-col gap-4">
            {isPending ? (
              <div className="text-center p-4">Loading...</div>
            ) : error ? (
              <div className="text-center p-4 text-red-500">Error loading chat</div>
            ) : (
              data?.history?.map((message, i) => (
                <React.Fragment key={i}>
                  {message.img && (
                    <IKImage
                      urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
                      path={message.img}
                      height="300"
                      width="400"
                      transformation={[{ height: 300, width: 400 }]}
                      loading="lazy"
                      lqip={{ active: true, quality: 20 }}
                    />
                  )}
                  <div
                    className={`px-4 py-3 bg-[#2b3c5a] rounded-xl text-white text-base max-w-[75%] shadow-md leading-relaxed ${
                      message.role === "user"
                        ? "bg-[#5561c0] text-[#f9f9f9] self-end"
                        : ""
                    }`}
                  >
                    <Markdown>{message.parts[0].text}</Markdown>
                  </div>
                </React.Fragment>
              ))
            )}
          </div>
        </div>
        
        {/* Input Component */}
        {data && (
          <div className="flex-shrink-0">
            <NewPromt data={data} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
