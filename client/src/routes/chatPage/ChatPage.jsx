import './chatPage.css';
import NewPromt from "../../components/newPromt/NewPromt";
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import Markdown from 'react-markdown';
import { IKImage } from 'imagekitio-react';
import React, { useContext, useEffect, useState } from 'react';
import InfoSection from '../view-trip/compo/infoSection';
import { TripContext } from '@/components/tripcontext/TripProvider';
import { FcAssistant } from "react-icons/fc";
import { FaMinus } from "react-icons/fa";
import { FaPlus } from "react-icons/fa";

const ChatPage = () => {
  const path = useLocation().pathname;
  const chatId = path.split("/").pop();
  const { tripDetails, allTripData } = useContext(TripContext);

  const { isPending, error, data } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/api/chats/${chatId}`, {
        credentials: "include",
      }).then((res) => res.json()),
  });

  // State for controlling chat visibility
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    console.log(data);
  }, [data, chatId]);

  return (
    <div className={`chat-container ${isChatOpen ? "open" : "closed"}`}>
      {/* Chat Header */}
      <div className="chat-header">
        <h3><FcAssistant />AI-Assistant</h3>
        <button
          className="toggle-button"
          onClick={() => setIsChatOpen((prev) => !prev)}
        >
          {isChatOpen ? <FaMinus /> : <FaPlus />
          }
        </button>
        
      </div>

      {/* Chat Content */}
      {isChatOpen && (
        <div className="chatPage">
          <div className="wrapper">
            <div className="chat">
              {isPending
                ? "Loading..."
                : error
                ? "Error"
                : data?.history?.map((message, i) => (
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
                        className={
                          message.role === "user"
                            ? "message user"
                            : "message"
                        }
                        key={i}
                      >
                        <Markdown>{message.parts[0].text}</Markdown>
                      </div>
                    </React.Fragment>
                  ))}
              {data && <NewPromt data={data} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
