import React, { useState, useContext, useEffect } from "react";
import { Box } from "@mui/material";
import ViewMap from "../view-trip/compo/ViewMap";
import SearchData from "../view-trip/compo/SearchData";
import ChatPage from "../chatPage/ChatPage";
import { TripContext } from "@/components/tripcontext/TripProvider";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon,
  MapIcon,
} from "@heroicons/react/24/outline";
import { NavBar } from "@/components/ui/tubelight-navbar";

const ViewTripData = () => {
  const { tripDetails } = useContext(TripContext);
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { id: 0, name: "Chat", icon: ChatBubbleLeftIcon, url: "#chat" },
    { id: 1, name: "Search", icon: MagnifyingGlassIcon, url: "#search" },
    { id: 2, name: "Trip Details", icon: MapIcon, url: "#trip-details" },
  ];

  useEffect(() => {
    console.log("Trip details updated:", tripDetails);
  }, [tripDetails]);

  const handleTabChange = (item) => {
    setActiveTab(item.id);
  };

  const renderLeftContent = () => {
    switch (activeTab) {
      case 0:
        return <ChatPage />;
      case 1:
        return <SearchData trip={tripDetails} />;
      case 2:
        return (
          <Box p={2}>
            <h2>פרטי טיול</h2>
            <p>כאן יוצגו פרטי הטיול</p>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      height="95vh"
      display="flex"
      flexDirection="column"
      sx={{
        background: "linear-gradient(135deg, #0a192f 0%, #112240 100%)",
        borderRadius: "1.2rem",
        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.5)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Navbar positioning */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-50 w-auto filter drop-shadow-lg">
        <NavBar 
          items={tabs} 
          className="mx-auto"
          onTabChange={handleTabChange}
        />
      </div>

      {/* Main Content Area */}
      <Box
        flex={1}
        display="flex"
        overflow="hidden"
        sx={{
          background:
            "linear-gradient(135deg, rgba(10, 25, 47, 0.95) 0%, rgba(17, 34, 64, 0.95) 100%)",
          pt: "32px", // Reduced space for the navbar
        }}
      >
        {/* Left Side: Scrollable Content */}
        <Box
          flex={1}
          overflow="hidden"
          sx={{
            "&::-webkit-scrollbar": {
              width: "8px",
            },
            "&::-webkit-scrollbar-track": {
              background: "rgba(59, 130, 246, 0.1)",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "rgba(59, 130, 246, 0.2)",
              borderRadius: "4px",
              "&:hover": {
                background: "rgba(59, 130, 246, 0.3)",
              },
            },
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className="h-full"
            >
              {renderLeftContent()}
            </motion.div>
          </AnimatePresence>
        </Box>

        {/* Right Side: Map */}
        <Box
          flex={1}
          overflow="hidden"
          sx={{
            position: "relative",
          }}
        >
          <ViewMap trip={tripDetails} />
        </Box>
      </Box>
    </Box>
  );
};

export default ViewTripData;
