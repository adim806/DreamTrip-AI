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

const ViewTripData = () => {
  const { tripDetails } = useContext(TripContext);
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { id: 0, label: "צ'אט", icon: ChatBubbleLeftIcon },
    { id: 1, label: "חיפוש", icon: MagnifyingGlassIcon },
    { id: 2, label: "פרטי טיול", icon: MapIcon },
  ];

  useEffect(() => {
    console.log("Trip details updated:", tripDetails);
  }, [tripDetails]);

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
      height="90vh"
      display="flex"
      flexDirection="column"
      sx={{
        background: "linear-gradient(135deg, #0a192f 0%, #112240 100%)",
        borderRadius: "1rem",
        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Navbar חדש */}
      <nav className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 p-4 rounded-t-xl">
        <div className="absolute inset-0 bg-black opacity-20 rounded-t-xl"></div>
        <div className="relative max-w-7xl mx-auto">
          <div className="flex justify-center space-x-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 relative overflow-hidden group ${
                    activeTab === tab.id
                      ? "bg-blue-500 text-white shadow-lg"
                      : "text-blue-200 hover:bg-blue-900/50"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/20 to-blue-400/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                  <Icon
                    className={`w-5 h-5 ml-2 transition-transform duration-300 ${
                      activeTab === tab.id ? "transform rotate-12" : ""
                    }`}
                  />
                  {tab.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* אזור התוכן הראשי */}
      <Box
        flex={1}
        display="flex"
        borderTop="1px solid rgba(59, 130, 246, 0.1)"
        overflow="hidden"
        sx={{
          background:
            "linear-gradient(135deg, rgba(10, 25, 47, 0.95) 0%, rgba(17, 34, 64, 0.95) 100%)",
        }}
      >
        {/* צד שמאל: תוכן עם גלילה */}
        <Box
          flex={1}
          overflow="hidden"
          borderRight="1px solid rgba(59, 130, 246, 0.1)"
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

        {/* צד ימין: מפה */}
        <Box
          flex={1}
          overflow="hidden"
          sx={{
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "linear-gradient(135deg, rgba(10, 25, 47, 0.3) 0%, rgba(17, 34, 64, 0.3) 100%)",
              zIndex: 1,
              pointerEvents: "none",
            },
          }}
        >
          <ViewMap trip={tripDetails} />
        </Box>
      </Box>
    </Box>
  );
};

export default ViewTripData;
