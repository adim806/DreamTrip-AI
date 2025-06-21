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
import ItineraryEditor from "@/components/ui/TripDetailsEditor";
import { resetMap } from "@/utils/map/MapEventService";
import { MAP_EVENTS } from "@/utils/map/MapEventService";

const ViewTripData = () => {
  const { tripDetails, setTripDetails, setallTripData, allTripData } =
    useContext(TripContext);
  const [activeTab, setActiveTab] = useState(0);
  const [editItineraryData, setEditItineraryData] = useState(null);
  const [previousTab, setPreviousTab] = useState(0);

  const tabs = [
    { id: 0, name: "Chat", icon: ChatBubbleLeftIcon, url: "#chat" },
    { id: 1, name: "Search", icon: MagnifyingGlassIcon, url: "#search" },
    { id: 2, name: "Trip Details", icon: MapIcon, url: "#trip-details" },
  ];

  // Load itinerary data from localStorage when tab changes to Trip Details
  useEffect(() => {
    // שמירת הטאב הקודם
    if (activeTab !== previousTab) {
      setPreviousTab(activeTab);
    }

    if (activeTab === 2) {
      try {
        // בדיקה אם חזרנו מטאב אחר לטאב העריכה
        const isReturningToEditTab = previousTab !== 2 && activeTab === 2;
        console.log(
          `Tab change detected: ${previousTab} -> ${activeTab}, isReturningToEditTab: ${isReturningToEditTab}`
        );

        // בדיקה אם יש עדכונים חדשים בזיכרון המקומי
        const checkForUpdatedData = () => {
          // בדיקה אם יש עדכון בגלובל
          if (
            window.__editItineraryData &&
            window.__editItineraryData.timestamp
          ) {
            // בדיקה אם הנתונים הגלובליים עדכניים יותר מהנתונים המקומיים
            const isNewer =
              !editItineraryData ||
              !editItineraryData.timestamp ||
              window.__editItineraryData.timestamp >
                editItineraryData.timestamp;

            if (isNewer) {
              console.log("Found newer edit data in global memory, updating");
              setEditItineraryData(window.__editItineraryData);
              return true;
            }
          }

          // בדיקה אם יש עדכון ב-localStorage
          const storedData = localStorage.getItem("editItineraryData");
          if (storedData) {
            try {
              const parsedData = JSON.parse(storedData);

              // בדיקה אם הנתונים ב-localStorage עדכניים יותר מהנתונים המקומיים
              const isNewer =
                !editItineraryData ||
                !editItineraryData.timestamp ||
                parsedData.timestamp > editItineraryData.timestamp;

              if (isNewer) {
                // המרת tripDetails מחזרה למבנה אובייקט
                if (parsedData.tripDetails) {
                  try {
                    parsedData.tripDetails = JSON.parse(parsedData.tripDetails);
                  } catch (e) {
                    console.error("Failed to parse trip details:", e);
                  }
                }

                console.log("Found newer edit data in localStorage, updating");
                setEditItineraryData(parsedData);
                return true;
              }
            } catch (e) {
              console.error("Error parsing stored edit data:", e);
            }
          }

          return false;
        };

        // אם חזרנו לטאב העריכה, בדוק אם יש עדכונים
        if (isReturningToEditTab) {
          const foundUpdates = checkForUpdatedData();
          if (foundUpdates) {
            console.log("Updated edit data after returning to edit tab");
            return;
          }
        }

        // אם יש נתוני יומן מעודכנים ב-allTripData, השתמש בהם
        if (allTripData && allTripData.itinerary) {
          // בדיקה אם כבר יש נתוני עריכה
          if (editItineraryData) {
            // בדיקה אם התוכן השתנה
            const contentChanged =
              editItineraryData.content !== allTripData.itinerary;

            if (contentChanged || isReturningToEditTab) {
              // עדכון נתוני העריכה הקיימים עם התוכן המעודכן
              setEditItineraryData((prev) => ({
                ...prev,
                content: allTripData.itinerary,
                // עדכון גם מטא-דאטה אם קיים
                ...(allTripData.metadata && {
                  destination:
                    allTripData.metadata.destination || prev.destination,
                  duration: allTripData.metadata.duration || prev.duration,
                  startDate: allTripData.metadata.dates?.from || prev.startDate,
                  endDate: allTripData.metadata.dates?.to || prev.endDate,
                }),
                timestamp: Date.now(), // עדכון חותמת הזמן
              }));
              console.log(
                "Updated edit itinerary data from allTripData - content changed or returning to tab"
              );
              return;
            }

            console.log(
              "Edit itinerary data already up to date with allTripData"
            );
            return;
          }

          // אם אין נתוני עריכה קיימים, יצירת אובייקט חדש
          const newEditData = {
            content: allTripData.itinerary,
            messageId: window.__editItineraryData?.messageId,
            destination:
              allTripData.metadata?.destination ||
              tripDetails?.vacation_location ||
              "",
            duration:
              allTripData.metadata?.duration || tripDetails?.duration || "",
            startDate:
              allTripData.metadata?.dates?.from ||
              tripDetails?.dates?.from ||
              "",
            endDate:
              allTripData.metadata?.dates?.to || tripDetails?.dates?.to || "",
            timestamp: Date.now(), // הוספת חותמת זמן
          };

          setEditItineraryData(newEditData);
          console.log("Created new edit itinerary data from allTripData");
          return;
        }

        // Try to get data from window global first (for direct navigation)
        if (window.__editItineraryData) {
          setEditItineraryData(window.__editItineraryData);
          console.log(
            "Loaded edit itinerary data from window.__editItineraryData"
          );
          return;
        }

        // Otherwise try to get from localStorage
        const storedData = localStorage.getItem("editItineraryData");
        if (storedData) {
          const parsedData = JSON.parse(storedData);

          // Check if data is fresh (less than 30 minutes old)
          const isDataFresh =
            parsedData.timestamp &&
            Date.now() - parsedData.timestamp < 30 * 60 * 1000;

          if (isDataFresh) {
            // Convert back the tripDetails from string to object
            if (parsedData.tripDetails) {
              try {
                parsedData.tripDetails = JSON.parse(parsedData.tripDetails);
              } catch (e) {
                console.error("Failed to parse trip details:", e);
              }
            }

            setEditItineraryData(parsedData);
            console.log("Loaded edit itinerary data from localStorage");
          }
        }
      } catch (error) {
        console.error("Error loading itinerary data for editing:", error);
      }
    }
  }, [activeTab, allTripData, tripDetails, editItineraryData, previousTab]);

  // האזנה לאירועי עדכון יומן מסע מ-TripDetailsEditor
  useEffect(() => {
    // טיפול באירוע עדכון יומן
    const handleItineraryUpdated = (event) => {
      console.log(
        "ViewTripData: Received itineraryUpdated event:",
        event.detail
      );
      const { content, messageId, metadata } = event.detail;

      // עדכון נתוני העריכה המקומיים
      if (content && editItineraryData) {
        setEditItineraryData((prev) => ({
          ...prev,
          content: content,
          // עדכון גם מטא-דאטה אם קיים
          ...(metadata && {
            destination: metadata.destination || prev.destination,
            duration: metadata.duration || prev.duration,
            startDate: metadata.dates?.from || prev.startDate,
            endDate: metadata.dates?.to || prev.endDate,
          }),
        }));
      }

      // עדכון נתוני הטיול בקונטקסט אם יש מטא-דאטה
      if (metadata && tripDetails) {
        setTripDetails((prev) => ({
          ...prev,
          vacation_location: metadata.destination || prev.vacation_location,
          duration: metadata.duration || prev.duration,
          dates: metadata.dates || prev.dates,
        }));

        // עדכון גם את נתוני היומן המלא
        if (allTripData) {
          setallTripData((prev) => ({
            ...prev,
            itinerary: content,
            metadata: {
              ...prev?.metadata,
              ...metadata,
            },
          }));
        }
      }
    };

    // הוספת האזנה לאירוע
    document.addEventListener("itineraryUpdated", handleItineraryUpdated);

    // ניקוי האזנה בעת פירוק הקומפוננטה
    return () => {
      document.removeEventListener("itineraryUpdated", handleItineraryUpdated);
    };
  }, [
    editItineraryData,
    tripDetails,
    allTripData,
    setTripDetails,
    setallTripData,
  ]);

  useEffect(() => {
    console.log("Trip details updated:", tripDetails);
  }, [tripDetails]);

  const handleTabChange = (item) => {
    // שמירת הטאב הקודם לפני המעבר לטאב החדש
    setPreviousTab(activeTab);
    setActiveTab(item.id);
    
    // Always reset the map when switching tabs to clear all markers and routes
    resetMap();
    console.log(`Map reset triggered when switching to ${tabs[item.id].name} tab`);
    
    // If switching to Trip Details tab, perform more thorough cleanup
    if (item.id === 2) {
      console.log("Switching to Trip Details tab - performing thorough map cleanup");
      
      // First reset using the imported function
      resetMap();
      
      // Then dispatch direct events for the ViewMap component to handle
      window.dispatchEvent(new CustomEvent(MAP_EVENTS.RESET_MAP));
      window.dispatchEvent(new CustomEvent(MAP_EVENTS.CLEAR_MAP));
      window.dispatchEvent(new CustomEvent(MAP_EVENTS.CLEAR_ROUTES));
      
      // For extra certainty, add a delayed second reset after a short delay
      setTimeout(() => {
        console.log("Performing secondary map reset for Trip Details tab");
        resetMap();
        window.dispatchEvent(new CustomEvent(MAP_EVENTS.RESET_MAP));
        window.dispatchEvent(new CustomEvent(MAP_EVENTS.CLEAR_MAP));
        window.dispatchEvent(new CustomEvent(MAP_EVENTS.CLEAR_ROUTES));
        
        // Force removal of any remaining map elements via the tabChange event
        window.dispatchEvent(new CustomEvent('tabChange', {
          detail: {
            tab: 'tripDetails-forced-cleanup'
          }
        }));
      }, 200);
    }
  };

  const renderLeftContent = () => {
    switch (activeTab) {
      case 0:
        return <ChatPage />;
      case 1:
        return <SearchData trip={tripDetails} />;
      case 2:
        return editItineraryData ? (
          <ItineraryEditor itineraryData={editItineraryData} />
        ) : (
          <Box p={4} className="text-center">
            <h2 className="text-xl font-medium text-blue-300 mb-4">
              עריכת פרטי יומן מסע
            </h2>
            <div className="bg-blue-900/20 rounded-xl border border-blue-500/20 p-6 max-w-xl mx-auto">
              <p className="text-gray-300 mb-4">לא נבחר יומן מסע לעריכה.</p>
              <p className="text-gray-400 text-sm">
                כדי לערוך יומן מסע, לחץ על כפתור "Edit Itinerary" בתצוגת היומן
                בצ'אט.
              </p>
            </div>
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
          overflow="auto"
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
            maxHeight: "calc(100vh - 32px)",
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
