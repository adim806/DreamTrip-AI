import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import NewPromt from "../../components/newPromt/NewPromt";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router-dom";
import Markdown from "react-markdown";
import { IKImage } from "imagekitio-react";
import {
  TripContext,
  CONVERSATION_STATES,
} from "../../components/tripcontext/TripProvider";
import {
  RiUser3Fill,
  RiCompassDiscoverLine,
  RiPlaneLine,
  RiMapPinLine,
  RiSendPlaneFill,
} from "react-icons/ri";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/clerk-react";
import { fieldComponentMap } from "../../components/FieldCompletion/FieldComponents";
import MissingFieldsForm from "../../components/FieldCompletion/MissingFieldsForm";
import "./chatPage.css";

// Add imports for the new text animator
import { createSegmentedTextAnimator } from "../../utils/advice/AdviceHandler";

// Import for markdown parsing
import { marked } from "marked";

// Configure marked with safe options
marked.setOptions({
  breaks: true,
  gfm: true,
  silent: true,
});

// הוצאת הפונקציה החוצה מהקומפוננטה הראשית והפיכתה לקומפוננטה נפרדת
const ItineraryActions = React.memo(({ message }) => {
  const { tripDetails } = useContext(TripContext);

  // State for save button
  const [savedStatus, setSavedStatus] = useState({
    isSaved: false,
    isSaving: false,
    error: null,
  });

  // State to track if we've navigated to edit
  const [navigatedToEdit, setNavigatedToEdit] = useState(false);

  // Check if this message is an itinerary with more flexible detection
  const isItinerary =
    message.isItinerary ||
    (message.message &&
      (message.message.includes("Day 1:") ||
        message.message.includes("Day 1 ") ||
        message.message.includes("## Day 1") ||
        message.message.includes("# Travel Itinerary") ||
        message.message.includes("# Luxury") || // Common for luxury itinerary titles
        (message.message.includes("**Destination:**") && message.message.includes("Day")) ||
        (message.message.includes("📍[") && message.message.includes("🍽️[")) ||
        (message.message.includes("📍 [") && message.message.includes("🍽️ ["))));

  // Automatically display itinerary locations on the map when detected
  useEffect(() => {
    // Only proceed if this is an itinerary
    if (!isItinerary) return;

    const displayLocationsOnMap = async () => {
      try {
        // Get the itinerary content
        const itineraryContent = message.message || message.displayMessage;

        // Extract destination from the itinerary text
        let destination = "";
        const destinationMatch = itineraryContent.match(
          /\*\*Destination:\*\*\s+([^\n]+)/
        );
        if (destinationMatch && destinationMatch[1]) {
          destination = destinationMatch[1].trim();
          console.log(`Extracted destination from itinerary: ${destination}`);
        } else if (tripDetails?.vacation_location) {
          destination = tripDetails.vacation_location;
          console.log(`Using trip details destination: ${destination}`);
        }

        // Import the function to display itinerary locations on the map
        const { displayItineraryLocations } = await import(
          "../../utils/map/MapEventService"
        );

        // Extract and display locations on the map
        const locations = await displayItineraryLocations(
          itineraryContent,
          destination
        );
        console.log(
          `Automatically displayed ${
            Object.values(locations).flat().length
          } itinerary locations on the map`
        );

        // After locations are displayed, add click handlers to location markers in the chat
        setTimeout(() => {
          if (message.id) {
            const addClickHandlersToLocationMarkers =
              window.__addClickHandlersToLocationMarkers;
            if (typeof addClickHandlersToLocationMarkers === "function") {
              addClickHandlersToLocationMarkers(message.id);
            }
          }
        }, 500);
      } catch (error) {
        console.error("Error displaying itinerary locations on map:", error);
      }
    };

    // Display locations with a slight delay to ensure the map component is ready
    const timer = setTimeout(() => {
      displayLocationsOnMap();
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    message.id,
    message.message,
    message.displayMessage,
    tripDetails,
    isItinerary,
  ]);

  // Function to add click handlers to location markers in the chat
  const addClickHandlersToLocationMarkers = (messageId) => {
    try {
      // Find the message container for the specified message ID
      if (!messageId) return;

      const messageContainer = document.getElementById(messageId);
      if (!messageContainer) {
        console.warn("Could not find message container for ID:", messageId);
        return;
      }

      // Store the function globally so we can use it from other places
      window.__addClickHandlersToLocationMarkers =
        addClickHandlersToLocationMarkers;

      // Find all location markers in the message using separate regexes for each icon type
      // This avoids issues with surrogate pairs in character classes
      // Updated to support spacing between icon and bracket
      const attractionRegex =
        /📍\s*\[(.*?)\](?:\((-?\d+\.?\d*),(-?\d+\.?\d*)\))?/g;
      const restaurantRegex =
        /🍽️\s*\[(.*?)\](?:\((-?\d+\.?\d*),(-?\d+\.?\d*)\))?/g;
      const hotelRegex = /🏨\s*\[(.*?)\](?:\((-?\d+\.?\d*),(-?\d+\.?\d*)\))?/g;
      const eveningRegex =
        /🌆\s*\[(.*?)\](?:\((-?\d+\.?\d*),(-?\d+\.?\d*)\))?/g;

      // Get the current visible message content
      const messageContent = messageContainer.textContent || "";

      // Find all matches using separate regexes
      const locationMatches = [];

      // Process attractions
      let match;
      while ((match = attractionRegex.exec(messageContent)) !== null) {
        locationMatches.push({
          fullMatch: match[0],
          icon: "📍",
          name: match[1],
          lat: match[2] ? parseFloat(match[2]) : null,
          lng: match[3] ? parseFloat(match[3]) : null,
          type: "attractions",
        });
      }

      // Process restaurants
      while ((match = restaurantRegex.exec(messageContent)) !== null) {
        locationMatches.push({
          fullMatch: match[0],
          icon: "🍽️",
          name: match[1],
          lat: match[2] ? parseFloat(match[2]) : null,
          lng: match[3] ? parseFloat(match[3]) : null,
          type: "restaurants",
        });
      }

      // Process hotels
      while ((match = hotelRegex.exec(messageContent)) !== null) {
        locationMatches.push({
          fullMatch: match[0],
          icon: "🏨",
          name: match[1],
          lat: match[2] ? parseFloat(match[2]) : null,
          lng: match[3] ? parseFloat(match[3]) : null,
          type: "hotels",
        });
      }

      // Process evening venues
      while ((match = eveningRegex.exec(messageContent)) !== null) {
        locationMatches.push({
          fullMatch: match[0],
          icon: "🌆",
          name: match[1],
          lat: match[2] ? parseFloat(match[2]) : null,
          lng: match[3] ? parseFloat(match[3]) : null,
          type: "attractions", // Evening venues are treated as attractions
        });
      }

      // Log the found locations for debugging
      console.log(
        `Found ${locationMatches.length} locations in the chat message:`,
        locationMatches.map((loc) => `${loc.icon} ${loc.name} (${loc.type})`)
      );

      if (locationMatches.length === 0) {
        console.warn("No location markers found in the message");
        return;
      }

      // Get all text nodes in the message container
      const textNodes = [];
      const walkNodes = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          textNodes.push(node);
        } else {
          for (let i = 0; i < node.childNodes.length; i++) {
            walkNodes(node.childNodes[i]);
          }
        }
      };
      walkNodes(messageContainer);

      // Import MAP_EVENTS and utility functions
      import("../../utils/map/MapEventService")
        .then(({ MAP_EVENTS, flyToLocation, highlightMarkerOnMap }) => {
          // For each location match, find it in the DOM and add a click handler
          locationMatches.forEach((location) => {
            // Find the text node containing this location
            for (const textNode of textNodes) {
              if (textNode.textContent.includes(location.fullMatch)) {
                // Create a span element to replace the text
                const span = document.createElement("span");
                span.className =
                  "location-marker cursor-pointer hover:bg-blue-100 px-1 rounded";
                span.dataset.locationType = location.type;
                span.dataset.locationName = location.name;

                // Add visual styling based on location type
                if (location.icon === "🍽️") {
                  span.classList.add("restaurant-marker");
                } else if (location.icon === "🏨") {
                  span.classList.add("hotel-marker");
                } else if (location.icon === "🌆") {
                  span.classList.add("evening-marker");
                } else {
                  span.classList.add("attraction-marker");
                }

                span.textContent = location.fullMatch;
                span.title = `Click to highlight ${location.name} on the map`;

                // Add click handler
                span.addEventListener("click", (event) => {
                  // Visual feedback in the chat
                  document
                    .querySelectorAll(".location-marker.active")
                    .forEach((el) => {
                      el.classList.remove("active");
                    });
                  span.classList.add("active");

                  // Prevent default behavior to avoid navigation issues
                  event.preventDefault();
                  event.stopPropagation();

                  if (location.lat && location.lng) {
                    // If we have coordinates, fly directly to them
                    console.log(
                      `Flying to coordinates for ${location.name}: [${location.lat}, ${location.lng}]`
                    );
                    flyToLocation(
                      { lat: location.lat, lng: location.lng },
                      { zoom: 16 }
                    );
                  } else {
                    // Otherwise, search for the location by name
                    console.log(
                      `Searching for location by name: ${location.name}`
                    );
                    const event = new CustomEvent(
                      "mapbox:fly-to-location-name",
                      {
                        detail: { locationName: location.name },
                      }
                    );
                    window.dispatchEvent(event);
                  }

                  // Highlight the marker based on its type
                  let markerType = location.type;

                  // Use the highlightMarkerOnMap function
                  highlightMarkerOnMap({
                    name: location.name,
                    type: markerType,
                    coordinates:
                      location.lat && location.lng
                        ? { lat: location.lat, lng: location.lng }
                        : null,
                  });
                });

                // Replace the text node with our interactive span
                const text = textNode.textContent;
                const index = text.indexOf(location.fullMatch);
                if (index >= 0) {
                  const beforeText = document.createTextNode(
                    text.substring(0, index)
                  );
                  const afterText = document.createTextNode(
                    text.substring(index + location.fullMatch.length)
                  );

                  const parent = textNode.parentNode;
                  parent.insertBefore(beforeText, textNode);
                  parent.insertBefore(span, textNode);
                  parent.insertBefore(afterText, textNode);
                  parent.removeChild(textNode);

                  // Exit the loop since we found and processed this location
                  break;
                }
              }
            }
          });
        })
        .catch((error) => {
          console.error("Error setting up location click handlers:", error);
        });
    } catch (error) {
      console.error("Error adding click handlers to location markers:", error);
    }
  };

  // If this is not an itinerary, don't render anything
  if (!isItinerary) {
    return null;
  }

  // Save itinerary function
  const handleSaveItinerary = async () => {
    if (savedStatus.isSaved || savedStatus.isSaving) return;

    setSavedStatus((prev) => ({ ...prev, isSaving: true }));
    try {
      // Get the chat ID from the URL
      const chatId = window.location.pathname.split("/").pop();

      // Import the required functions
      const {
        saveItinerary,
        convertItineraryToJSON,
        formatItineraryForDisplay,
      } = await import("../../utils/itineraryGenerator");

      // Get the itinerary content
      const itineraryContent = message.message || message.displayMessage;

      // Clean up any markdown code block indicators
      const cleanContent = itineraryContent.replace(/```json|```/g, "").trim();

      // Try to parse as JSON first if it looks like JSON
      let structuredItinerary = null;
      let rawItinerary = null;
      let formattedItinerary = itineraryContent;

      if (cleanContent.trim().startsWith("{")) {
        try {
          // Parse the JSON and ensure it's properly structured
          structuredItinerary = JSON.parse(cleanContent);
          rawItinerary = cleanContent; // Store the raw JSON string
          console.log("Successfully parsed itinerary as JSON");

          // Validate the structure has the expected fields
          if (
            !structuredItinerary.days ||
            !Array.isArray(structuredItinerary.days)
          ) {
            console.warn(
              "JSON structure missing 'days' array, may not be a valid itinerary"
            );
          }

          // Generate a formatted text version for better display
          formattedItinerary = formatItineraryForDisplay(structuredItinerary);
        } catch (jsonError) {
          console.warn(
            "Failed to parse as JSON, falling back to converter:",
            jsonError
          );
          try {
            structuredItinerary = convertItineraryToJSON(cleanContent);
            console.log("Successfully converted itinerary to JSON structure");

            // Generate a formatted text version for better display
            formattedItinerary = formatItineraryForDisplay(structuredItinerary);
          } catch (conversionError) {
            console.error(
              "Error converting itinerary to JSON:",
              conversionError
            );
            // Continue with null structuredItinerary - the saveItinerary function will handle this
            structuredItinerary = null;
          }
        }
      } else {
        // If not JSON, try the converter
        try {
          structuredItinerary = convertItineraryToJSON(cleanContent);
          console.log("Successfully converted itinerary to JSON structure");

          // Generate a formatted text version for better display
          formattedItinerary = formatItineraryForDisplay(structuredItinerary);
        } catch (conversionError) {
          console.error("Error converting itinerary to JSON:", conversionError);
          // Continue with null structuredItinerary - the saveItinerary function will handle this
          structuredItinerary = null;
        }
      }

      // Ensure we have a valid structuredItinerary object
      if (!structuredItinerary) {
        structuredItinerary = {
          title: "Travel Itinerary",
          destination: tripDetails?.vacation_location || "Unknown Destination",
          dates: tripDetails?.dates || { from: "", to: "" },
          days: [],
        };
        console.log(
          "Created minimal structuredItinerary due to parsing failures"
        );
      }

      // Fix destination if it's incorrect (like "advance" instead of actual destination)
      if (
        structuredItinerary.destination === "advance" &&
        tripDetails?.vacation_location
      ) {
        structuredItinerary.destination = tripDetails.vacation_location;
        console.log(
          `Fixed incorrect destination from "advance" to "${structuredItinerary.destination}"`
        );
      }

      // Extract destination from text if not set or incorrect
      if (
        (!structuredItinerary.destination ||
          structuredItinerary.destination === "advance") &&
        formattedItinerary
      ) {
        const destinationMatch = formattedItinerary.match(
          /\*\*Destination:\*\*\s+([^\n]+)/
        );
        if (destinationMatch && destinationMatch[1]) {
          structuredItinerary.destination = destinationMatch[1].trim();
          console.log(
            `Extracted destination from formatted text: "${structuredItinerary.destination}"`
          );
        }
      }

      // Make sure days have the correct structure for the new format
      if (structuredItinerary.days && Array.isArray(structuredItinerary.days)) {
        // Check if this is the new format with sections
        const hasNewFormat = structuredItinerary.days.some(
          (day) => day.sections
        );

        if (hasNewFormat) {
          // Ensure all days have sections property
          structuredItinerary.days.forEach((day) => {
            if (!day.sections) {
              day.sections = [];
              console.log(
                `Added missing sections array to day ${day.dayNumber}`
              );
            }
          });
        }
      }

      // Determine the format based on the structure
      const format =
        structuredItinerary &&
        structuredItinerary.days &&
        structuredItinerary.days[0] &&
        structuredItinerary.days[0].sections
          ? "structured-json-v2"
          : "legacy";

      // Ensure the structuredItinerary is serializable
      let safeStructuredItinerary;
      try {
        // Convert to string and back to remove any circular references or non-serializable data
        safeStructuredItinerary = JSON.parse(
          JSON.stringify(structuredItinerary)
        );
        console.log("Successfully sanitized structuredItinerary for saving");
      } catch (error) {
        console.error("Error sanitizing structuredItinerary:", error);
        // Create a minimal version as fallback
        safeStructuredItinerary = {
          title: structuredItinerary.title || "Travel Itinerary",
          destination:
            structuredItinerary.destination ||
            tripDetails?.vacation_location ||
            "Unknown Destination",
          dates: structuredItinerary.dates ||
            tripDetails?.dates || { from: "", to: "" },
          days: [],
        };
        console.log(
          "Created simplified structuredItinerary due to serialization error"
        );
      }

      // Save the itinerary with the message content and structured format
      const result = await saveItinerary(chatId, {
        itinerary: formattedItinerary, // Use formatted text for display
        rawItinerary: rawItinerary || cleanContent, // Use raw JSON if available, otherwise cleaned content
        structuredItinerary: safeStructuredItinerary,
        metadata: {
          destination:
            safeStructuredItinerary.destination ||
            tripDetails?.vacation_location,
          duration: safeStructuredItinerary.duration || tripDetails?.duration,
          dates: safeStructuredItinerary.dates || tripDetails?.dates,
          format,
          savedManually: true,
          savedAt: new Date().toISOString(),
        },
      });

      if (result.success) {
        setSavedStatus({
          isSaved: true,
          isSaving: false,
          error: null,
        });
        console.log(
          "Itinerary saved successfully with ID:",
          result.itineraryId
        );
      } else {
        throw new Error(result.error || "Failed to save itinerary");
      }
    } catch (error) {
      console.error("Error saving itinerary:", error);
      setSavedStatus({
        isSaved: false,
        isSaving: false,
        error: error.message,
      });
    }
  };

  // Navigate to edit itinerary
  const handleEditItinerary = () => {
    if (navigatedToEdit) return;

    // Store the itinerary data in window/localStorage for access in the edit tab
    const itineraryData = {
      content: message.message || message.displayMessage,
      tripDetails,
      messageId: message.id,
    };

    window.__editItineraryData = itineraryData;
    localStorage.setItem(
      "editItineraryData",
      JSON.stringify({
        content: message.message || message.displayMessage,
        tripDetails: tripDetails ? JSON.stringify(tripDetails) : null,
        messageId: message.id,
        timestamp: Date.now(),
      })
    );

    // Find the tabs controller and switch to trip details tab
    const tabsController = document.querySelector(".tubelight-navbar");
    if (tabsController) {
      // Find the trip details tab button (usually the third one)
      const tripDetailsTab = tabsController.querySelectorAll("button")[2];
      if (tripDetailsTab) {
        tripDetailsTab.click();
        setNavigatedToEdit(true);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.3 }}
      className="itinerary-actions flex flex-wrap gap-2 mt-3 mb-2 justify-end"
    >
      <button
        onClick={handleSaveItinerary}
        disabled={savedStatus.isSaved || savedStatus.isSaving}
        className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-all ${
          savedStatus.isSaved
            ? "bg-green-500/20 text-green-300 border border-green-500/30"
            : savedStatus.isSaving
            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {savedStatus.isSaved ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Saved
          </>
        ) : savedStatus.isSaving ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-blue-300"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Saving...
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h1a2 2 0 012 2v7a2 2 0 01-2 2H8a2 2 0 01-2-2v-7a2 2 0 012-2h1v5.586l-1.293-1.293zM13 6h-2v5a1 1 0 01-.293.707l-2 2a1 1 0 01-1.414 0l-2-2A1 1 0 015 11V6H3a3 3 0 00-3 3v8a3 3 0 003 3h10a3 3 0 003-3V9a3 3 0 00-3-3z" />
            </svg>
            Save Itinerary
          </>
        )}
      </button>

      <button
        onClick={handleEditItinerary}
        disabled={navigatedToEdit}
        className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-all ${
          navigatedToEdit
            ? "bg-gray-500/20 text-gray-400 border border-gray-500/20"
            : "bg-purple-600 hover:bg-purple-700 text-white"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
        Edit Itinerary
      </button>

      {savedStatus.error && (
        <div className="bg-red-500/10 text-red-300 text-xs p-2 rounded-md border border-red-500/20 w-full mt-1">
          Error saving: {savedStatus.error}
        </div>
      )}
    </motion.div>
  );
});

// הוספת שם תצוגה לקומפוננטה
ItineraryActions.displayName = "ItineraryActions";

// הוספת קומפוננטת UpdatedBadge שתוצג כאשר יומן עודכן
const UpdatedBadge = React.memo(({ wasUpdated }) => {
  if (!wasUpdated) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, type: "spring" }}
      className="updated-badge bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-md flex items-center gap-1 absolute top-2 right-2 border border-blue-500/30"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3 w-3"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
      <span>Updated</span>
    </motion.div>
  );
});

// הוספת שם תצוגה לקומפוננטה
UpdatedBadge.displayName = "UpdatedBadge";

const ChatPage = () => {
  const path = useLocation().pathname;
  const { id: chatId } = useParams();
  const { tripDetails, conversationState } = useContext(TripContext);
  const chatContainerRef = useRef(null);
  const displayedMessagesRef = useRef(new Set());
  const { userId, isLoaded, isSignedIn, getToken, user } = useAuth();

  // Add new state for tracking animated messages
  const [animatingMessageId, setAnimatingMessageId] = useState(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [currentAnimatingDay, setCurrentAnimatingDay] = useState(0);
  const animatorRef = useRef(null);

  // Check if map is being displayed (based on trip details or URL params)
  const isMapVisible = useMemo(() => {
    // This is a placeholder - implement your actual logic to determine if map is visible
    return tripDetails?.showMap || path.includes("map");
  }, [tripDetails, path]);

  const { isPending, error, data } = useQuery({
    queryKey: ["chat", chatId, userId],
    queryFn: async () => {
      try {
        // Get authentication headers or use query params in development
        const headers = isSignedIn
          ? { Authorization: `Bearer ${await getToken()}` }
          : {};

        // Make API request with auth
        const response = await fetch(
          `${
            import.meta.env.VITE_API_URL
          }/api/chats/${chatId}?userId=${userId}`,
          {
            credentials: "include",
            headers,
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
    enabled:
      isLoaded && (isSignedIn || import.meta.env.DEV) && !!userId && !!chatId,
    retry: 1,
    retryDelay: 1000,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Hook state
  const [hookState, setHookState] = useState({
    pendingMessages: [],
    isTyping: false,
    isGeneratingItinerary: false,
    parallelDataFetch: {
      inProgress: false,
      intent: null,
      data: null,
      result: null,
    },
    processInitialMessage: () => {},
  });

  // Check if this is a new chat with only an initial message
  // Define this BEFORE using it in any useEffect hooks
  const isNewChatWithInitialMessage = useMemo(() => {
    if (!data?.history) return false;
    return data.history.length === 1 && data.history[0].role === "user";
  }, [data?.history]);

  // Function to check the hook state periodically
  const checkHookState = () => {
    if (window.__processingHookState) {
      const hookPendingMessages =
        window.__processingHookState.pendingMessages || [];
      const currentIsTyping = window.__processingHookState.isTyping || false;
      const currentIsGeneratingItinerary =
        window.__processingHookState.isGeneratingItinerary || false;
      const currentParallelDataFetch = window.__processingHookState
        .parallelDataFetch || {
        inProgress: false,
        intent: null,
        data: null,
        result: null,
      };

      // Only update state if something has actually changed
      const hasChanges =
        hookPendingMessages.length !== pendingMessages.length ||
        currentIsTyping !== isTyping ||
        currentIsGeneratingItinerary !== isGeneratingItinerary ||
        currentParallelDataFetch.inProgress !== parallelDataFetch.inProgress;

      if (hasChanges) {
        setHookState({
          pendingMessages: hookPendingMessages,
          isTyping: currentIsTyping,
          isGeneratingItinerary: currentIsGeneratingItinerary,
          parallelDataFetch: currentParallelDataFetch,
          processInitialMessage:
            window.__processingHookState.processInitialMessage || (() => {}),
        });
      }
    }
  };

  // Set up hook state checking with debounce to prevent excessive updates
  useEffect(() => {
    // Initial check
    checkHookState();

    // Set up interval to check regularly with debounce
    let debounceTimeout;
    const interval = setInterval(() => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(checkHookState, 50);
    }, 500); // Check less frequently (every 500ms)

    return () => {
      clearInterval(interval);
      clearTimeout(debounceTimeout);
    };
  }, []);

  const {
    pendingMessages,
    isTyping,
    isGeneratingItinerary,
    parallelDataFetch,
    processInitialMessage,
  } = hookState;

  useEffect(() => {
    console.log("Chat data:", data);
  }, [data, chatId]);

  // Scroll to bottom whenever data or pending messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [data, pendingMessages, isTyping]);

  // Process initial message in a new chat (with better timing and duplicate prevention)
  useEffect(() => {
    // Check if this is a new chat with only one message (the user message)
    if (isNewChatWithInitialMessage) {
      // Only process if there are no model responses yet in history
      const hasModelResponseInHistory = data.history.some(
        (msg) => msg.role === "model"
      );

      // Also check if there's already a model response in pendingMessages
      const hasModelResponseInPending = pendingMessages?.some(
        (msg) => msg.role === "model" && !msg.isLoadingMessage
      );

      // Check if there's a loading indicator, meaning we're already processing
      const hasLoadingIndicator = pendingMessages?.some(
        (msg) => msg.isLoadingMessage && msg.isGenericTyping
      );

      // Only proceed if there's no model response anywhere and we're not already processing
      if (
        !hasModelResponseInHistory &&
        !hasModelResponseInPending &&
        !hasLoadingIndicator &&
        !isTyping
      ) {
        console.log("Checking if initial message needs processing...");

        // Wait for NewPromt component to be ready
        const checkAndProcess = () => {
          if (window.__newPromtReady && window.__processingHookState) {
            const initialMessage = data.history[0].parts[0].text;

            // Get a unique ID for this chat + message combination to prevent duplicate processing
            const chatMessageId = `${chatId}-${initialMessage}`;

            // Check if we've already processed this specific message in this chat
            if (!window.__processedInitialMessages) {
              window.__processedInitialMessages = new Set();
            }

            if (!window.__processedInitialMessages.has(chatMessageId)) {
              console.log(
                "New chat detected, processing first message:",
                initialMessage
              );

              // Special new chat processing flag - signals to the hook NOT to add a user message
              window.__isProcessingNewChatMessage = true;

              // Mark this message as processed
              window.__processedInitialMessages.add(chatMessageId);

              // Make sure we're not already processing
              if (!window.__processingHookState.isTyping) {
                console.log("Starting initial message processing");
                window.__processingHookState.processInitialMessage(
                  initialMessage
                );
              }

              // Remove the flag after a delay
              setTimeout(() => {
                window.__isProcessingNewChatMessage = false;
              }, 500);
            } else {
              console.log("This initial message has already been processed");
            }
          } else {
            // Try again in a short moment
            console.log("NewPromt component not ready yet, retrying soon...");
            setTimeout(checkAndProcess, 100);
          }
        };

        checkAndProcess();
      } else if (hasModelResponseInPending || hasLoadingIndicator) {
        console.log(
          "Initial message already has a response or is being processed, skipping"
        );
      }
    }
  }, [data, pendingMessages, isTyping, chatId, isNewChatWithInitialMessage]);

  // Simple approach - show all messages without complex filtering
  const filteredPendingMessages = useMemo(() => {
    if (!pendingMessages?.length) return [];

    // Don't filter anything - show all pending messages
    // This ensures user messages are always visible
    return pendingMessages;
  }, [pendingMessages]);

  // SIMPLE APPROACH - Just combine history and all pending messages
  const messagesToDisplay = useMemo(() => {
    const allMessages = [];
    const seenMessageContents = new Set(); // Track message contents to prevent duplicates
    const seenLoadingIndicators = new Set(); // Track loading indicators by type

    // Add all history messages first (if any)
    if (data?.history?.length) {
      data.history.forEach((message, i) => {
        const displayMessage =
          message.parts?.[0]?.text || message.message || "";

        // Skip duplicate messages based on content
        if (displayMessage && seenMessageContents.has(displayMessage)) {
          return;
        }

        // Add to tracking set
        if (displayMessage) {
          seenMessageContents.add(displayMessage);
        }

        allMessages.push({
          ...message,
          source: "history",
          index: i,
          id: `history-${i}`,
          displayMessage,
          role: message.role,
        });
      });
    }

    // Add ALL pending messages (with deduplication)
    if (filteredPendingMessages?.length) {
      filteredPendingMessages.forEach((message, i) => {
        const displayMessage = message.message || "";
        const isLoadingIndicator =
          message.isLoadingMessage || message.isExternalDataFetch;
        const loadingType = message.isExternalDataFetch
          ? "external"
          : message.isGenericTyping
          ? "typing"
          : null;

        // Skip duplicate regular messages based on content
        if (
          !isLoadingIndicator &&
          displayMessage &&
          seenMessageContents.has(displayMessage)
        ) {
          return;
        }

        // Skip duplicate loading indicators of the same type
        if (
          isLoadingIndicator &&
          loadingType &&
          seenLoadingIndicators.has(loadingType)
        ) {
          return;
        }

        // Add to tracking sets
        if (!isLoadingIndicator && displayMessage) {
          seenMessageContents.add(displayMessage);
        }

        if (isLoadingIndicator && loadingType) {
          seenLoadingIndicators.add(loadingType);
        }

        allMessages.push({
          ...message,
          source: "pending",
          index: i,
          id: message.id || `pending-${i}`,
          displayMessage,
          role: message.role,
        });
      });
    }

    // Only log in development environment and not on every render
    if (import.meta.env.DEV && allMessages.length % 5 === 0) {
      console.log("SIMPLE: All messages to display:", allMessages.length);
    }

    return allMessages;
  }, [data?.history, filteredPendingMessages]);

  // Handle smooth transitions for pending messages
  useEffect(() => {
    if (!data?.history || !messagesToDisplay.length) return;

    // Keep track of which messages are currently displayed
    const currentDisplayed = new Set();

    // Mark all history messages as displayed
    data.history.forEach((msg, index) => {
      const key = `history-${index}`;
      currentDisplayed.add(key);
    });

    // Mark all pending messages as displayed
    messagesToDisplay.forEach((msg, index) => {
      const key = `pending-${msg.id || index}`;
      currentDisplayed.add(key);
    });

    // Update our ref
    displayedMessagesRef.current = currentDisplayed;

    // Smooth scroll to the bottom when new messages appear
    const chatContainer = document.getElementById("chat-messages-container");
    if (chatContainer) {
      // Check if we're already at the bottom
      const isAtBottom =
        chatContainer.scrollHeight - chatContainer.clientHeight <=
        chatContainer.scrollTop + 100;

      // If we're already at/near the bottom or it's a user message, scroll down
      if (isAtBottom || messagesToDisplay.some((msg) => msg.role === "user")) {
        // Use smooth scrolling for better UX
        chatContainer.scrollTo({
          top: chatContainer.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [data?.history, messagesToDisplay]);

  // Add a new useEffect to show processing indicators after user messages
  useEffect(() => {
    const chatContainer = document.getElementById("chat-messages-container");
    if (!chatContainer) return;

    // Find the last user message in pending messages
    const lastUserMessage = [...messagesToDisplay]
      .reverse()
      .find((msg) => msg.role === "user");

    // If we found a user message and system is processing (typing or in specific states)
    if (
      lastUserMessage &&
      (isTyping ||
        conversationState === CONVERSATION_STATES.ANALYZING_INPUT ||
        conversationState === CONVERSATION_STATES.FETCHING_EXTERNAL_DATA)
    ) {
      // Scroll down immediately to show processing indicators
      setTimeout(() => {
        chatContainer.scrollTo({
          top: chatContainer.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [messagesToDisplay, isTyping, conversationState]);

  // Typing indicator component
  const TypingIndicator = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
        className="typing-indicator px-4 py-3 rounded-xl text-white text-sm max-w-[75%] shadow-md bg-gradient-to-r from-[#293348] to-[#2d3346] self-start border-t border-l border-gray-700/40 flex gap-3 ml-8 mt-1"
      >
        <div className="message-header">
          <motion.div
            className="ai-avatar-container"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 2, 0, -2, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <RiCompassDiscoverLine className="text-blue-400 text-sm" />
          </motion.div>
        </div>
        <div className="typing-indicator-content flex items-center">
          <motion.span
            className="typing-text text-blue-100/80"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            typing
          </motion.span>
          <div className="typing-dots flex ml-2">
            {[0, 1, 2].map((dot) => (
              <motion.div
                key={dot}
                className="w-1.5 h-1.5 bg-blue-400/80 rounded-full mx-0.5"
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
      </motion.div>
    );
  };

  // Function to render appropriate state indicators
  const renderStateIndicator = () => {
    // Don't show indicators if no pending messages
    if (!messagesToDisplay?.length) return null;

    // Don't show state indicators if there's already a typing indicator visible
    const hasVisibleTypingIndicator = messagesToDisplay.some(
      (msg) =>
        msg.isLoadingMessage || msg.isExternalDataFetch || msg.isGenericTyping
    );

    if (hasVisibleTypingIndicator) {
      return null; // Skip showing state indicators when typing indicators are visible
    }

    // Find the last user message to know where to place the indicators
    const lastUserMessage = [...messagesToDisplay]
      .reverse()
      .find((msg) => msg.role === "user");

    // Only show indicators if there's a user message to respond to
    if (!lastUserMessage) return null;

    // Find if there's already a model response after the last user message
    const hasModelResponse = messagesToDisplay.some((msg, index) => {
      // Find the index of the last user message
      const lastUserIndex = messagesToDisplay.findIndex(
        (m) => m.id === lastUserMessage.id
      );
      // Check if this is a model message and comes after the last user message
      return (
        msg.role === "model" && !msg.isLoadingMessage && index > lastUserIndex
      );
    });

    // Don't show the indicators if there's already a model response
    if (hasModelResponse) return null;

    // Always show indicator when system is typing, even if we haven't entered a specific state yet
    if (isTyping) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="state-indicator flex items-center text-sm text-blue-300 mt-2 mb-2 bg-blue-500/10 px-4 py-2 rounded-lg ml-8 border-t border-l border-blue-500/20 shadow-md"
          key="typing-indicator"
        >
          <motion.div
            className="mr-2 text-blue-300 text-base"
            animate={{
              rotate: [0, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 3, repeat: Infinity, ease: "linear" },
              scale: { duration: 1.5, repeat: Infinity },
            }}
          >
            <RiCompassDiscoverLine />
          </motion.div>
          <span className="font-medium">Preparing response</span>
          <div className="flex space-x-1 ml-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 bg-blue-400/80 rounded-full"
                animate={{
                  y: ["0%", "-50%", "0%"],
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      );
    }

    switch (conversationState) {
      case CONVERSATION_STATES.ANALYZING_INPUT:
        return (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="state-indicator flex items-center text-sm text-blue-300 mb-2 mt-2 bg-blue-500/10 px-4 py-2 rounded-lg ml-8 border-t border-l border-blue-500/20 shadow-md"
          >
            <motion.div
              className="mr-2 text-blue-300 text-base"
              animate={{
                rotate: [0, 10, 0, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <RiCompassDiscoverLine />
            </motion.div>
            <span className="font-medium">Analyzing your request</span>
            <div className="flex space-x-1 ml-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-blue-400/80 rounded-full"
                  animate={{
                    y: ["0%", "-50%", "0%"],
                    opacity: [0.5, 1, 0.5],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        );
      case CONVERSATION_STATES.FETCHING_EXTERNAL_DATA:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="state-indicator flex items-center text-sm text-purple-300 mt-2 mb-2 bg-purple-500/10 px-4 py-2 rounded-lg ml-8 border-t border-l border-purple-500/20 shadow-md"
          >
            <motion.div
              className="mr-2 text-purple-300 text-base"
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1.2, repeat: Infinity },
              }}
            >
              <RiCompassDiscoverLine />
            </motion.div>
            <span className="font-medium">Fetching external data</span>
            <div className="flex space-x-1 ml-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-purple-400/80 rounded-full"
                  animate={{
                    y: ["0%", "-50%", "0%"],
                    opacity: [0.5, 1, 0.5],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        );
      case CONVERSATION_STATES.GENERATING_ITINERARY:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="state-indicator flex items-center text-sm text-green-300 mt-2 mb-2 bg-green-500/10 px-4 py-2 rounded-lg ml-8 border-t border-l border-green-500/20 shadow-md"
          >
            <motion.div
              className="mr-2 text-green-300 text-base"
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{
                rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                scale: { duration: 1.5, repeat: Infinity },
              }}
            >
              <RiCompassDiscoverLine />
            </motion.div>
            <span className="font-medium">
              Generating your personalized itinerary
            </span>
            <div className="flex space-x-1 ml-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-green-400/80 rounded-full"
                  animate={{
                    y: ["0%", "-50%", "0%"],
                    opacity: [0.5, 1, 0.5],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        );
      case CONVERSATION_STATES.EDITING_ITINERARY:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="state-indicator flex items-center text-sm text-orange-300 mt-2 mb-2 bg-orange-500/10 px-4 py-2 rounded-lg ml-8 border-t border-l border-orange-500/20 shadow-md"
          >
            <motion.div
              className="mr-2 text-orange-300 text-base"
              animate={{
                rotate: [-10, 10, -10],
                y: [0, -2, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <RiCompassDiscoverLine />
            </motion.div>
            <span className="font-medium">Editing your itinerary</span>
            <div className="flex space-x-1 ml-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-orange-400/80 rounded-full"
                  animate={{
                    y: ["0%", "-50%", "0%"],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  // Log our message state for troubleshooting
  useEffect(() => {
    // Only log in development and limit frequency
    if (
      import.meta.env.DEV &&
      ((data?.history?.length || 0) + (pendingMessages?.length || 0)) % 5 === 0
    ) {
      console.log("Current message state:");
      console.log("- History messages:", data?.history?.length || 0);
      console.log("- Pending messages:", pendingMessages?.length || 0);
      console.log("- Filtered messages:", messagesToDisplay?.length || 0);
      console.log("- IsNewChat:", isNewChatWithInitialMessage);
    }
  }, [
    data?.history,
    pendingMessages,
    messagesToDisplay,
    isNewChatWithInitialMessage,
  ]);

  // Handler for missing field completion
  const [missingFieldsState, setMissingFieldsState] = useState({
    fields: [],
    values: {},
    messageId: null,
  });
  const [localValues, setLocalValues] = useState({});

  // Initialize local values from missing fields state when it changes
  // Use a ref to track the previous message ID to prevent unnecessary re-renders
  const prevMessageIdRef = useRef(null);

  useEffect(() => {
    // Only update local values when the message ID changes
    if (missingFieldsState.messageId !== prevMessageIdRef.current) {
      prevMessageIdRef.current = missingFieldsState.messageId;
      setLocalValues(missingFieldsState.values || {});
    }
  }, [missingFieldsState.messageId]);

  // Handle form submission from MissingFieldsForm - MOVED UP before renderMissingFieldsForm
  const handleMissingFieldsSubmit = React.useCallback(
    (formValues) => {
      // Prevent duplicate submissions
      if (missingFieldsState.submitted === true) {
        return;
      }

      // First, update the local state to reflect the new values and mark as submitted
      setMissingFieldsState((prev) => ({
        ...prev,
        values: formValues,
        submitted: true,
      }));

      // Generate a unique ID for this submission to prevent duplicates
      const submissionId = `form-submission-${Date.now()}`;

      // Use the centralized processing function if available
      if (window.__processingHookState?.processMissingFieldsSubmission) {
        const result =
          window.__processingHookState.processMissingFieldsSubmission(
            formValues
          );

        if (result) {
          // Successfully processed, no need for further action
          return;
        }
      }

      // Fallback processing if the centralized function is not available or fails
      console.log("Using fallback missing fields processing");

      // Create a structured message with the collected field values
      // Format field values properly to avoid [object Object] in the message
      const userMessage = missingFieldsState.fields
        .map((f) => {
          // Get the value for this field
          const value = formValues[f];

          // Format the value based on its type
          let formattedValue = value;

          // Handle date objects (from/to format)
          if (value && typeof value === "object" && value.from) {
            formattedValue = value.from;

            // If it's a date range with both from and to, use a nice format
            if (value.to) {
              formattedValue = `${value.from} to ${value.to}`;
            }
          }

          return `${f}: ${formattedValue}`;
        })
        .join(", ");

      // Check if this message already exists to prevent duplicates
      const messageExists = pendingMessages.some(
        (msg) => msg.role === "user" && msg.message === userMessage
      );

      if (messageExists) {
        console.log("Message already exists, not adding duplicate");
        return;
      }

      // Add the submitted values as a user message to the chat FIRST
      if (window.__processingHookState?.setPendingMessages) {
        window.__processingHookState.setPendingMessages((prev) => {
          // First filter out any existing missing fields forms to prevent duplicates
          const filteredMessages = prev.filter((msg) => !msg.isMissingFields);

          // Then add the user message with the unique submission ID
          return [
            ...filteredMessages,
            {
              role: "user",
              message: userMessage,
              id: submissionId,
              timestamp: new Date().toISOString(),
              isFormSubmission: true, // Mark as form submission to identify it later
              formValues: formValues, // Store original form values for processing
            },
          ];
        });
      }

      // IMPORTANT: Add a small delay before transitioning state and processing input
      // This ensures the UI updates with the user message before showing loading indicators
      setTimeout(() => {
        // Transition to FETCHING_EXTERNAL_DATA state - prefer safeTransitionState if available
        if (window.__processingHookState?.safeTransitionState) {
          window.__processingHookState.safeTransitionState(
            "fetching_external_data"
          );
        } else if (window.__processingHookState?.transitionState) {
          window.__processingHookState.transitionState(
            "fetching_external_data"
          );
        }

        // Process the user input to trigger external data fetch
        if (window.__processingHookState?.processUserInput) {
          window.__processingHookState.processUserInput(userMessage);
        }

        // Reset local values but keep submitted=true to prevent re-rendering
        setLocalValues({});
      }, 100);
    },
    [
      missingFieldsState.fields,
      missingFieldsState.submitted,
      setMissingFieldsState,
      setLocalValues,
      pendingMessages,
    ]
  );

  // Function to render the missing fields form when needed - wrapped in memo to prevent re-renders
  const renderMissingFieldsForm = React.useCallback(
    (message) => {
      // Skip if no missing fields or form already submitted
      if (
        !message.isMissingFields ||
        !Array.isArray(message.missingFields) ||
        message.missingFields.length === 0 ||
        missingFieldsState.submitted === true
      ) {
        return null;
      }

      // Check if we already have a form with the same message ID to prevent duplicates
      if (missingFieldsState.messageId === message.id) {
        // Get the trip duration from tripDetails if available
        const tripDuration = tripDetails?.duration;

        // Form is already being rendered with this message ID, just return it
        return (
          <div
            key={message.id}
            className="ml-4 mt-3 mb-2 max-w-lg compact-form-container"
            style={{ minWidth: 280, maxWidth: "90%" }}
          >
            <MissingFieldsForm
              fields={message.missingFields}
              initialValues={{
                ...missingFieldsState.values,
                submitted: missingFieldsState.submitted,
              }}
              onSubmit={handleMissingFieldsSubmit}
              submitLabel="שלח"
              intent={message.intent || missingFieldsState.intent}
              duration={tripDuration}
            />
          </div>
        );
      }

      // If this is a new form (different message ID), update state but don't render yet
      // This prevents rendering during state updates which can cause loops
      if (missingFieldsState.messageId !== message.id) {
        // Use setTimeout to break the render cycle
        setTimeout(() => {
          setMissingFieldsState({
            fields: message.missingFields,
            values: {},
            messageId: message.id,
            intent: message.intent,
            submitted: false,
          });
        }, 0);

        // Return placeholder to show something is happening
        return (
          <div
            key={`placeholder-${message.id}`}
            className="ml-4 mt-3 mb-2 max-w-lg bg-blue-500/10 p-2 rounded-lg border border-blue-500/20"
            style={{ minWidth: 280, maxWidth: "90%" }}
          >
            <div className="text-blue-300 text-xs">Loading form...</div>
          </div>
        );
      }

      return (
        <div
          key={message.id}
          className="ml-4 mt-3 mb-2 max-w-lg compact-form-container"
          style={{ minWidth: 280, maxWidth: "90%" }}
        >
          <MissingFieldsForm
            fields={message.missingFields}
            initialValues={{
              ...missingFieldsState.values,
              submitted: missingFieldsState.submitted,
            }}
            onSubmit={handleMissingFieldsSubmit}
            submitLabel="שלח"
            intent={message.intent || missingFieldsState.intent}
            duration={tripDetails?.duration}
          />
        </div>
      );
    },
    [
      missingFieldsState,
      setMissingFieldsState,
      handleMissingFieldsSubmit,
      tripDetails,
    ]
  );

  // Optimize the effect that initializes missingFieldsState to prevent infinite loops
  useEffect(() => {
    // Only run this effect if pendingMessages changes and we don't already have fields
    if (!pendingMessages?.length || missingFieldsState.fields.length > 0) {
      return;
    }

    // Check if there's a message with missing fields in pendingMessages
    const missingFieldsMessage = pendingMessages.find(
      (msg) =>
        msg.isMissingFields &&
        Array.isArray(msg.missingFields) &&
        msg.missingFields.length > 0
    );

    if (
      missingFieldsMessage &&
      missingFieldsState.messageId !== missingFieldsMessage.id
    ) {
      // Initialize missingFieldsState with the data from the message
      setMissingFieldsState({
        fields: missingFieldsMessage.missingFields,
        values: {},
        messageId: missingFieldsMessage.id,
        intent: missingFieldsMessage.intent,
        submitted: false,
      });
    }
  }, [
    pendingMessages,
    missingFieldsState.fields.length,
    missingFieldsState.messageId,
  ]);

  // TripSummaryView component - improves display of trip summaries
  const TripSummaryView = ({ message }) => {
    // If the message starts with an emoji and contains bullets
    if (message.includes("🧳") && message.includes("•")) {
      // Split into lines
      const lines = message.split("\n");

      // Extract title and details
      const title = lines[0];
      const details = lines.slice(1);

      return (
        <div className="trip-summary">
          <div className="text-lg font-medium text-blue-200 mb-1">{title}</div>
          <ul className="pl-1 space-y-1">
            {details.map(
              (line, i) =>
                line.trim() && (
                  <li key={i} className="trip-bullet flex items-start">
                    <span className="trip-emoji">{line.substring(0, 2)}</span>
                    <span>{line.substring(2)}</span>
                  </li>
                )
            )}
          </ul>
          <p className="mt-2 text-sm text-blue-200">
            Would you like to generate this itinerary?
          </p>
        </div>
      );
    }

    // For all other messages, let Markdown handle it
    return <Markdown>{message}</Markdown>;
  };

  // עדכון פונקציית renderItineraryActions להשתמש בקומפוננטה החדשה
  const renderItineraryActions = (message) => {
    return <ItineraryActions message={message} />;
  };

  // הוספת useEffect לבדיקת עדכוני יומן כשחוזרים לדף הצ'אט
  useEffect(() => {
    // בדיקה אם יש יומן מעודכן בזיכרון המקומי
    const checkForUpdatedItinerary = () => {
      try {
        // בדיקה אם יש עדכון יומן בזיכרון הגלובלי
        if (window.__updatedItinerary) {
          const { content, messageId, timestamp } = window.__updatedItinerary;

          // וידוא שהעדכון הוא מהדקות האחרונות (למניעת עדכונים ישנים)
          const isRecent = Date.now() - timestamp < 5 * 60 * 1000; // 5 דקות

          if (content && messageId && isRecent) {
            console.log(
              "Found updated itinerary in global memory, updating chat message"
            );
            updateItineraryInChat(messageId, content);

            // ניקוי העדכון מהזיכרון אחרי שימוש
            delete window.__updatedItinerary;
            return true;
          }
        }

        // בדיקה אם יש עדכון יומן ב-localStorage
        const storedUpdate = localStorage.getItem("updatedItinerary");
        if (storedUpdate) {
          const { content, messageId, timestamp } = JSON.parse(storedUpdate);

          // וידוא שהעדכון הוא מהדקות האחרונות
          const isRecent = Date.now() - timestamp < 5 * 60 * 1000; // 5 דקות

          if (content && messageId && isRecent) {
            console.log(
              "Found updated itinerary in localStorage, updating chat message"
            );
            updateItineraryInChat(messageId, content);

            // ניקוי העדכון מה-localStorage אחרי שימוש
            localStorage.removeItem("updatedItinerary");
            return true;
          } else {
            // ניקוי עדכון ישן
            localStorage.removeItem("updatedItinerary");
          }
        }

        return false;
      } catch (error) {
        console.error("Error checking for updated itinerary:", error);
        return false;
      }
    };

    // פונקציה לעדכון היומן בצ'אט
    const updateItineraryInChat = (messageId, newContent) => {
      if (
        !window.__processingHookState ||
        !window.__processingHookState.setPendingMessages
      ) {
        return false;
      }

      // עדכון ההודעה בצ'אט
      window.__processingHookState.setPendingMessages((prevMessages) => {
        // חיפוש ההודעה לפי מזהה
        const updatedMessages = prevMessages.map((msg) => {
          // אם זו ההודעה שצריך לעדכן
          if (
            msg.id === messageId ||
            msg.isItinerary ||
            (msg.message &&
              (msg.message.includes("Day 1:") ||
                msg.message.includes("## Day 1") ||
                msg.message.includes("# Travel Itinerary") ||
                msg.message.includes("**Destination:**") ||
                (msg.message.includes("📍[") && msg.message.includes("🍽️["))))
          ) {
            return {
              ...msg,
              message: newContent,
              displayMessage: newContent,
              wasUpdated: true,
              updatedAt: new Date().toISOString(),
              // הוספת מאפיינים לאנימציה
              highlight: true,
              animation: {
                pulse: true,
                fadeIn: true,
              },
            };
          }
          return msg;
        });

        return updatedMessages;
      });

      // עדכון גם בהיסטוריית השיחה אם קיימת
      if (data?.history) {
        const updatedHistory = data.history.map((msg) => {
          if (
            (msg.role === "model" || msg.role === "assistant") &&
            msg.parts?.[0]?.text &&
            msg.parts[0].text.includes("Day 1:")
          ) {
            return {
              ...msg,
              parts: [{ ...msg.parts[0], text: newContent }],
              wasUpdated: true,
            };
          }
          return msg;
        });

        // עדכון המידע המקומי
        data.history = updatedHistory;
      }

      return true;
    };

    // בדיקת עדכונים כשהקומפוננטה נטענת
    checkForUpdatedItinerary();

    // בדיקת עדכונים כשהטאב מקבל פוקוס (חזרה מטאב אחר)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdatedItinerary();
      }
    };

    // האזנה לאירוע עדכון יומן מותאם מ-TripDetailsEditor
    const handleItineraryUpdated = (event) => {
      console.log("Received itineraryUpdated event:", event.detail);
      const { content, messageId } = event.detail;
      if (content && messageId) {
        updateItineraryInChat(messageId, content);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("itineraryUpdated", handleItineraryUpdated);

    // ניקוי האזנה בעת פירוק הקומפוננטה
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("itineraryUpdated", handleItineraryUpdated);
    };
  }, [data]);

  // Prepare messages to display by combining data history and pending messages
  const messagesForDisplay = useMemo(() => {
    const history = data?.history || [];
    return [...history, ...pendingMessages];
  }, [data, pendingMessages]);

  // Function to extract day information from itinerary text
  const extractDaysFromItinerary = (text) => {
    // Match day headers (### Day X:)
    const dayPattern = /### Day \d+:/g;
    const dayMatches = [...text.matchAll(dayPattern)];

    if (dayMatches.length > 0) {
      // Extract each day's content
      const days = [];
      const dayIndices = dayMatches.map((match) => match.index);
      dayIndices.push(text.length); // Add the end of string

      for (let i = 0; i < dayMatches.length; i++) {
        days.push({
          title: dayMatches[i][0].trim(),
          content: text.substring(dayIndices[i], dayIndices[i + 1]),
          startIndex: dayIndices[i],
          endIndex: dayIndices[i + 1],
        });
      }

      return { days, hasDayMarkers: true };
    } else {
      // Try to split by section markers or paragraphs if no day markers
      const sectionPattern = /####|###|##/g;
      const sectionMatches = [...text.matchAll(sectionPattern)];

      if (sectionMatches.length > 0) {
        // Extract each section as a "day"
        const sections = [];
        const sectionIndices = sectionMatches.map((match) => match.index);
        sectionIndices.push(text.length);

        for (let i = 0; i < sectionMatches.length; i++) {
          sections.push({
            title: text.substring(
              sectionIndices[i],
              sectionIndices[i] +
                text.substring(sectionIndices[i]).indexOf("\n")
            ),
            content: text.substring(sectionIndices[i], sectionIndices[i + 1]),
            startIndex: sectionIndices[i],
            endIndex: sectionIndices[i + 1],
          });
        }

        return { days: sections, hasDayMarkers: false };
      } else {
        // Split by paragraphs as a last resort
        const paragraphs = text
          .split("\n\n")
          .filter((p) => p.trim().length > 0);

        if (paragraphs.length > 1) {
          // Group paragraphs into logical sections
          const sections = [];
          let currentIndex = 0;

          paragraphs.forEach((paragraph) => {
            const paragraphStart = text.indexOf(paragraph, currentIndex);
            const paragraphEnd = paragraphStart + paragraph.length;

            sections.push({
              title:
                paragraph.substring(0, Math.min(30, paragraph.length)) + "...",
              content: paragraph,
              startIndex: paragraphStart,
              endIndex: paragraphEnd,
            });

            currentIndex = paragraphEnd;
          });

          return { days: sections, hasDayMarkers: false };
        } else {
          // Just return the whole text as one "day"
          return {
            days: [
              {
                title: "Itinerary",
                content: text,
                startIndex: 0,
                endIndex: text.length,
              },
            ],
            hasDayMarkers: false,
          };
        }
      }
    }
  };

  // This function displays locations on the map for a specific day
  const displayDayLocationsOnMap = async (
    dayContent,
    destination,
    messageId,
    keepExisting = true, // Default to true to keep locations on the map
    dayNumber = null // Track which day these locations belong to
  ) => {
    // Track displayed locations by day for better organization
    if (!window.__displayedLocationsByDay) {
      window.__displayedLocationsByDay = {};
    }
    
    // Also maintain a flat list of all locations for deduplication
    if (!window.__allDisplayedLocations) {
      window.__allDisplayedLocations = {
        hotels: [],
        restaurants: [],
        attractions: []
      };
    }
    
    try {
      // Import needed functions
      const { displayItineraryLocations } = await import(
        "../../utils/map/MapEventService"
      );

      // Display only the locations mentioned in this day's content
      // Always pass true to ensure we don't clear previous markers
      const locations = await displayItineraryLocations(
        dayContent,
        destination,
        true, // Force keepExisting to true
        dayNumber // Pass the day number to help with marker organization
      );
      
      // Add to tracking by day
      if (locations && dayNumber !== null) {
        window.__displayedLocationsByDay[dayNumber] = {
          hotels: locations.hotels,
          restaurants: locations.restaurants,
          attractions: locations.attractions,
          addedToMap: true
        };
      }
      
      // Add to global tracking for deduplication
      if (locations) {
        // Update our tracking of all displayed locations
        window.__allDisplayedLocations.hotels = [
          ...window.__allDisplayedLocations.hotels,
          ...locations.hotels.filter(h => !window.__allDisplayedLocations.hotels.some(existing => existing.name === h.name))
        ];
        window.__allDisplayedLocations.restaurants = [
          ...window.__allDisplayedLocations.restaurants,
          ...locations.restaurants.filter(r => !window.__allDisplayedLocations.restaurants.some(existing => existing.name === r.name))
        ];
        window.__allDisplayedLocations.attractions = [
          ...window.__allDisplayedLocations.attractions,
          ...locations.attractions.filter(a => !window.__allDisplayedLocations.attractions.some(existing => existing.name === a.name))
        ];
      }

      // Only log in development to reduce console noise
      if (import.meta.env.DEV) {
        console.debug(
          `Displayed ${
            Object.values(locations).flat().length
          } locations for day ${dayNumber || 'unknown'}`
        );
      }

      // After locations are displayed, add click handlers
      setTimeout(() => {
        if (messageId) {
          addClickHandlersToLocationMarkers(messageId);
        }
      }, 300);

      return locations;
    } catch (error) {
      console.error("Error displaying day locations on map:", error);
      return null;
    }
  };

  // Function to properly format days with wrapper divs for animation
  const formatDayContent = (text) => {
    // Check if the text contains day headers
    const dayHeaderPattern = /### Day \d+:/g;
    if (!dayHeaderPattern.test(text)) {
      return text; // Return unchanged if no day headers
    }

    // Split text by day headers
    const parts = text.split(/(### Day \d+:)/);

    if (parts.length <= 1) {
      return text; // Return unchanged if splitting didn't work
    }

    let result = "";
    let currentDay = 0;

    for (let i = 0; i < parts.length; i++) {
      if (i === 0 && !parts[i].match(dayHeaderPattern)) {
        // This is intro content before the first day
        result += parts[i];
      } else if (parts[i].match(dayHeaderPattern)) {
        // This is a day header
        currentDay++;

        // Start a new day section
        if (i + 1 < parts.length) {
          result += `<div class="day-content" data-day="${currentDay}">`;
          result += parts[i]; // Add the header
          result += parts[i + 1]; // Add the content
          result += "</div>";
          i++; // Skip the next part as we've already added it
        } else {
          // Header with no content
          result += `<div class="day-content" data-day="${currentDay}">`;
          result += parts[i];
          result += "</div>";
        }
      }
    }

    return result;
  };

  // Add this at the appropriate spot when starting the segmented animation
  const animateDaysWithSegments = (introText, dayText) => {
    // Start the day-by-day animation with segmented animator
    animatorRef.current = createSegmentedTextAnimator(dayText, {
      segmentPatterns: [/### Day \d+:/], // Day headers as segment boundaries
      charSpeed: 15, // Characters per animation frame
      segmentDelay: 1000, // Pause between days
      onUpdate: (text, dayProgress) => {
        // Format the day content with wrapper divs
        const formattedDayText = formatDayContent(text);

        // Combine intro with current day text
        const combinedText = introText + formattedDayText;

        // Update with combined text (intro is 20%, days are 80% of total)
        const totalProgress = 20 + dayProgress * 0.8;
        onUpdate(combinedText, totalProgress);
      },
      onSegmentComplete: async (segmentIndex, currentText) => {
        // A day has been fully revealed
        setCurrentAnimatingDay(segmentIndex + 1);

        // Display this day's locations on the map
        if (segmentIndex < days.length) {
          const dayContent = days[segmentIndex].content;
          await displayDayLocationsOnMap(
            dayContent,
            destination,
            message.id,
            true
          ); // true = keep previous markers

          // Highlight the current day section
          setTimeout(() => {
            const currentDayElement = document.querySelector(
              `.day-content[data-day="${segmentIndex + 1}"]`
            );
            if (currentDayElement) {
              currentDayElement.classList.add("current-day");
            }
          }, 100);

          // Add a pause between days to make the transition more noticeable
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      },
      onComplete: () => {
        // Animation complete, show full text
        const formattedFullText = formatDayContent(message.message);
        onUpdate(formattedFullText, 100);
        setAnimationProgress(100);
        if (import.meta.env.DEV) {
          console.debug("Itinerary animation complete");
        }

        // Add click handlers to all location markers
        setTimeout(() => {
          if (typeof addClickHandlersToLocationMarkers === "function") {
            addClickHandlersToLocationMarkers(message.id);
          }
        }, 500);
      },
    });

    return animatorRef.current;
  };

  // Enhanced function to start animating an itinerary message
  const startItineraryAnimation = (message) => {
    if (!message || !message.message) {
      console.error("[startItineraryAnimation] Called with invalid message:", message);
      return;
    }

    // Only log in development mode
    if (import.meta.env.DEV) {
      console.debug("[startItineraryAnimation] Starting animation for message:", message.id);
    }
    
    // Set the current message as animating - these are state variables in the ChatPage component
    setAnimatingMessageId(message.id);
    setAnimationProgress(0);
    setCurrentAnimatingDay(-1); // Start at -1 to indicate we're in the "intro" phase

    // Extract the destination for map display
    let destination = "";
    const destinationMatch = message.message.match(
      /\*\*Destination:\*\*\s+([^\n]+)/
    );
    if (destinationMatch && destinationMatch[1]) {
      destination = destinationMatch[1].trim();
    } else if (tripDetails?.vacation_location) {
      destination = tripDetails.vacation_location;
    }

    // Import map functions but don't clear map, as we want to keep markers during animations
    // We'll only reset the tracking of displayed locations
    window.__displayedLocationsByDay = {}; // Reset day tracking
    window.__allDisplayedLocations = {
      hotels: [],
      restaurants: [],
      attractions: []
    };

    // Parse the itinerary into days/sections
    const { days, hasDayMarkers } = extractDaysFromItinerary(message.message);

    if (days.length === 0) {
      // Nothing to animate, show the full message
      setAnimationProgress(100);
      return;
    }
    
    // Get the actual number of days from trip details
    const actualNumDays = tripDetails?.duration ? parseInt(tripDetails.duration) : days.length;
    
    // Log for debugging only in development mode
    if (import.meta.env.DEV) {
      console.debug(`[startItineraryAnimation] Trip duration from details: ${actualNumDays} days, Found days in itinerary: ${days.length}`);
    }
    
    // If the number of days in the itinerary doesn't match the actual trip duration,
    // limit the days we'll animate to the actual number to avoid showing nonexistent days
    const daysToAnimate = Math.min(days.length, actualNumDays);

    // For proper itineraries, we want to extract the intro part before the first day
    let introText = "";
    if (hasDayMarkers && days.length > 0 && days[0].startIndex > 0) {
      introText = message.message.substring(0, days[0].startIndex);
    } else {
      // For itineraries without clear day markers, use the first paragraph as intro
      const firstNewlineIndex = message.message.indexOf("\n\n");
      if (firstNewlineIndex > 0) {
        introText = message.message.substring(0, firstNewlineIndex + 2);
      } else {
        // If no clear paragraphs, use the first 150 characters as intro
        introText = message.message.substring(
          0,
          Math.min(150, message.message.length)
        );
      }
    }

    // Create the text animator
    if (animatorRef.current) {
      animatorRef.current.stop();
    }

    // Animation phases:
    // 1. Start with empty message
    // 2. Fade in the title and intro text
    // 3. Proceed with day-by-day animation

    // Initialize with empty text
    const messageElement = document.getElementById(message.id);
    if (messageElement) {
      const messageContentElement =
        messageElement.querySelector(".message-content");
      if (messageContentElement) {
        // Start with an empty message
        onUpdate("", 0);
      }
    }

    // Function to update the displayed text
    const onUpdate = (text, progress) => {
      // Update the React state for tracking progress
      setAnimationProgress(progress);

      // Also directly update the DOM for smoother updates
      const messageElement = document.getElementById(message.id);
      if (messageElement) {
        const messageContentElement =
          messageElement.querySelector(".message-content");
        if (messageContentElement) {
          const markdownElement = messageContentElement.querySelector("div");
          if (markdownElement) {
            // Create temporary element to render Markdown
            try {
              // First create a new temporary div for the new content
              const tempDiv = document.createElement("div");

              // Use a safe approach with error handling
              let parsedContent = "";
              try {
                parsedContent = marked.parse(text);
              } catch (error) {
                console.warn("Error parsing markdown:", error);
                // Fallback to displaying raw text if parsing fails
                parsedContent = text
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/\n/g, "<br>");
              }

              tempDiv.innerHTML = `<div>${parsedContent}</div>`;

              // Replace the content with proper DOM diffing to avoid flickering
              if (tempDiv.firstChild) {
                // Use a requestAnimationFrame for smoother updates
                requestAnimationFrame(() => {
                  // Process day headers to add special styling
                  const dayHeaders = tempDiv.querySelectorAll("h3");
                  dayHeaders.forEach((header) => {
                    if (header.textContent.includes("Day")) {
                      header.classList.add("day-header");
                    }
                  });

                  // Update the DOM
                  markdownElement.innerHTML = tempDiv.firstChild.innerHTML;

                  // Add smooth appearance animation to day headers
                  const newDayHeaders =
                    markdownElement.querySelectorAll("h3.day-header");
                  newDayHeaders.forEach((header) => {
                    if (!header.classList.contains("animated")) {
                      header.classList.add("animated");
                      header.style.opacity = "0";
                      setTimeout(() => {
                        header.style.opacity = "1";
                        header.style.transition = "opacity 0.5s ease-in-out";
                      }, 10);
                    }
                  });

                  // Add click handlers to location markers after a brief delay
                  setTimeout(() => {
                    if (
                      typeof addClickHandlersToLocationMarkers === "function"
                    ) {
                      addClickHandlersToLocationMarkers(message.id);
                    }
                  }, 100);
                });
              }
            } catch (error) {
              console.error("Error updating markdown content:", error);
              // Last resort fallback
              markdownElement.textContent = text;
            }
          }
        }
      }
    };

    // Start the animation process
    try {
      // Start with intro animation
      const animateIntro = async () => {
        console.log("Starting intro animation");

        // Animate the intro text
        let currentText = "";
        const charInterval = 20; // ms between characters

        for (let i = 0; i <= introText.length; i++) {
          currentText = introText.substring(0, i);
          onUpdate(currentText, (i / introText.length) * 20); // Intro is 20% of total progress
          await new Promise((resolve) => setTimeout(resolve, charInterval));
        }

        if (import.meta.env.DEV) {
          console.debug("Intro animation complete, starting days");
        }

        // After intro is complete, start animating days one by one
        await animateDaysSequentially(introText, days, destination, message.id, daysToAnimate);
      };

      // Function to animate days one by one, ensuring synchronization with map
      const animateDaysSequentially = async (
        introSoFar,
        days,
        destination,
        messageId,
        numDaysToAnimate = days.length
      ) => {
        let fullText = introSoFar;

        // For each day - only iterate through the actual days in the trip (limited to daysToAnimate)
        for (let dayIndex = 0; dayIndex < daysToAnimate; dayIndex++) {
          // Update current animating day
          setCurrentAnimatingDay(dayIndex);

          const day = days[dayIndex];
          const dayContent = day.content;

          // Extract just this day's content for the map
          if (import.meta.env.DEV) {
            console.debug(`Animating Day ${dayIndex + 1} of ${daysToAnimate}`);
          }

          // First, show the day header instantly
          const dayHeaderMatch = dayContent.match(/### Day \d+:/);
          if (dayHeaderMatch) {
            const headerText = dayHeaderMatch[0];
            fullText += `<div class="day-content" data-day="${
              dayIndex + 1
            }">${headerText}`;
            onUpdate(fullText, 20 + (dayIndex / days.length) * 80);

            // Short pause after showing the header
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          // Create a promise for map markers to track when they're displayed
          // Always set keepExisting to true to ensure markers stay on the map throughout the animation
          // Pass the day index+1 as the day number to track which day these markers belong to
          const markersPromise = displayDayLocationsOnMap(
            dayContent,
            destination,
            messageId,
            true, // Always keep previous markers
            dayIndex + 1 // Pass the day number (1-based) for organization
          );

          // Now animate the day content character by character
          let dayTextWithoutHeader = dayContent.replace(/### Day \d+:/, "");
          let currentDayText = "";
          const charInterval = 15; // ms between characters

          for (let i = 0; i <= dayTextWithoutHeader.length; i += 3) {
            // Increment by 3 for faster animation
            currentDayText = dayTextWithoutHeader.substring(0, i);

            // Calculate progress: intro (20%) + (current day / total days) * 80%
            const dayProgress = dayIndex / days.length;
            const charProgress = i / dayTextWithoutHeader.length;
            const overallProgress =
              20 + dayProgress * 80 + charProgress * (80 / days.length);

            const updatedText = fullText + currentDayText;
            onUpdate(updatedText, Math.min(overallProgress, 99)); // Cap at 99% until complete

            await new Promise((resolve) => setTimeout(resolve, charInterval));
          }

          // Complete this day
          fullText += dayTextWithoutHeader + "</div>";

          // Ensure map markers are fully displayed before proceeding
          await markersPromise;

          // Highlight the completed day
          setTimeout(() => {
            const currentDayElement = document.querySelector(
              `.day-content[data-day="${dayIndex + 1}"]`
            );
            if (currentDayElement) {
              currentDayElement.classList.add("current-day");
              
              // Also scroll this day into view to ensure user can see it
              currentDayElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
          }, 100);

                      // Add a pause between days - shorter pause for a smoother experience
            await new Promise((resolve) => setTimeout(resolve, 800));
        }

              // Animation complete - need to ensure we only show the actual days from trip duration
         const { days: allDays } = extractDaysFromItinerary(message.message);
         const tripDuration = tripDetails?.duration ? parseInt(tripDetails.duration) : allDays.length;
         
         // If we need to limit the displayed days
         if (tripDuration < allDays.length) {
           // Build limited content with only the actual days
           let limitedContent = introSoFar;
           for (let i = 0; i < tripDuration && i < allDays.length; i++) {
             limitedContent += `<div class="day-content" data-day="${i + 1}">${allDays[i].content}</div>`;
           }
           onUpdate(limitedContent, 100);
         } else {
           // Show the full formatted content
           onUpdate(formatDayContent(message.message), 100);
         }
         
         setAnimationProgress(100);
         if (import.meta.env.DEV) {
           console.debug("Itinerary animation complete");
         }
      };

      // Start the animation process
      animateIntro();
    } catch (error) {
      console.error("Error in itinerary animation:", error);
      // Fallback to showing the full message
      onUpdate(message.message, 100);
      setAnimationProgress(100);
    }
  };

  // Cleanup animation on unmount or when changing messages
  useEffect(() => {
    return () => {
      if (animatorRef.current) {
        animatorRef.current.stop();
      }
    };
  }, []);

  // Add this effect to detect and start animation for new itinerary messages
  useEffect(() => {
    if (!messagesForDisplay.length) return;

    // Check if there's a new itinerary message with expanded detection patterns
    const latestMessage = messagesForDisplay[messagesForDisplay.length - 1];
    if (
      latestMessage &&
      !animatingMessageId &&
      (latestMessage.isItinerary ||
        (latestMessage.message &&
          (latestMessage.message.includes("Day 1:") ||
            latestMessage.message.includes("Day 1 ") ||
            latestMessage.message.includes("## Day 1") ||
            latestMessage.message.includes("# Luxury") ||
            latestMessage.message.includes("# Travel Itinerary") ||
            (latestMessage.message.includes("**Destination:**") && latestMessage.message.includes("Day")) ||
            (latestMessage.message.includes("📍[") && latestMessage.message.includes("🍽️[")) ||
            (latestMessage.message.includes("📍 [") && latestMessage.message.includes("🍽️ [")))))
    ) {
      // Start animating this message
      if (import.meta.env.DEV) {
        console.debug("[ChatPage] Detected itinerary message, starting animation:", latestMessage.id);
      }
      startItineraryAnimation(latestMessage);
    }
  }, [messagesForDisplay, animatingMessageId]);

  // Improved renderMessage function that handles the animated itinerary display
  const renderMessage = (message) => {
    // Check if this is an itinerary message that should be animated
    const isItinerary =
      message.isItinerary ||
      (message.message &&
        (message.message.includes("Day 1:") ||
          message.message.includes("Day 1 ") ||
          message.message.includes("## Day 1") ||
          message.message.includes("# Luxury") ||
          message.message.includes("# Travel Itinerary") ||
          (message.message.includes("**Destination:**") && message.message.includes("Day")) ||
          (message.message.includes("📍[") && message.message.includes("🍽️[")) ||
          (message.message.includes("📍 [") && message.message.includes("🍽️ ["))));
    
         // Only log once during development, not in production
     if (import.meta.env.DEV && 
         message.message && 
         !window.__loggedItineraryMessages?.has(message.id) &&
         (message.message.includes("Day 1") || message.message.includes("**Destination:**"))) {
       // Track logged messages to prevent duplicates
       if (!window.__loggedItineraryMessages) window.__loggedItineraryMessages = new Set();
       window.__loggedItineraryMessages.add(message.id);
       
       // Log only in development
       console.debug("[renderMessage] Found itinerary:", 
                  {id: message.id, isItinerary: true});
     }

      // If this is an itinerary and it's currently being animated
    if (isItinerary && animatingMessageId === message.id && message.message) {
      // Parse the itinerary structure
      const { days, hasDayMarkers } = extractDaysFromItinerary(message.message);

      // Extract intro part
      let introText = "";
      if (hasDayMarkers && days.length > 0 && days[0].startIndex > 0) {
        introText = message.message.substring(0, days[0].startIndex);
      } else {
        // For itineraries without clear day markers, use the first paragraph as intro
        const firstNewlineIndex = message.message.indexOf("\n\n");
        if (firstNewlineIndex > 0) {
          introText = message.message.substring(0, firstNewlineIndex + 2);
        } else {
          // If no clear paragraphs, use the first 150 characters as intro
          introText = message.message.substring(
            0,
            Math.min(150, message.message.length)
          );
        }
      }

      if (days.length > 0 || introText) {
        // Calculate how much of the message to show based on animation progress
        let visibleText = "";

        if (animationProgress < 20) {
          // During intro phase (0-20%), show partial intro
          const introProgress = animationProgress / 20; // Convert to 0-100% for intro
          const charsToShow = Math.floor(introProgress * introText.length);
          visibleText = introText.substring(0, charsToShow);
        } else if (animationProgress < 100) {
          // During days phase (20-100%), show full intro + partial days
          visibleText = introText; // Always show full intro

          // Add days content based on current day
          if (currentAnimatingDay >= 0 && days.length > 0) {
            // Add all complete days, but only up to the actual trip duration
            const daysToShow = Math.min(days.length, tripDetails?.duration ? parseInt(tripDetails.duration) : days.length);
            
            // Add all complete days
            for (let i = 0; i < currentAnimatingDay && i < daysToShow; i++) {
              visibleText += days[i].content;
            }

            // Add partial current day if we're in the middle of one
            if (currentAnimatingDay < daysToShow) {
              const currentDay = days[currentAnimatingDay];
              // Calculate day progress based on overall animation progress
              const overallDayProgress = (animationProgress - 20) / 80; // Convert to 0-1 for days portion
              const daysPassed = overallDayProgress * days.length;
              const currentDayProgress = daysPassed - Math.floor(daysPassed);

              // Calculate how much of the current day to show
              const dayLength = currentDay.endIndex - currentDay.startIndex;
              const charsToShow = Math.floor(currentDayProgress * dayLength);

              visibleText += message.message.substring(
                currentDay.startIndex,
                currentDay.startIndex + charsToShow
              );
            }
          }
        } else {
          // Animation complete, show the full message
          visibleText = message.message;
        }

        return (
          <div
            className={`message-content markdown-content itinerary-animation-active ${
              animationProgress < 100 ? "animating" : "complete"
            }`}
          >
            <Markdown>{visibleText}</Markdown>
            {animationProgress < 100 && (
              <div className="itinerary-loading flex items-center text-blue-400 text-sm">
                <div className="loading-spinner mr-2 h-4 w-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
                {animationProgress < 20
                  ? "Loading your itinerary..."
                  : `Building ${
                      currentAnimatingDay >= 0
                        ? `Day ${currentAnimatingDay + 1}`
                        : "your itinerary"
                    }...`}
              </div>
            )}
          </div>
        );
      }
    }

    // For non-itinerary messages or fully displayed itineraries, render normally
    return (
      <div className="message-content markdown-content">
        <Markdown>{message.message || message.displayMessage}</Markdown>
      </div>
    );
  };

  // Store chat ID and user ID in localStorage for access across components
  useEffect(() => {
    if (chatId) {
      localStorage.setItem("chatId", chatId);
    }

    // Store userId from auth in localStorage if available
    if (isSignedIn && user?.id) {
      localStorage.setItem("userId", user.id);
    }
  }, [chatId, isSignedIn, user]);

  return (
    <div className={`chat-with-map ${isMapVisible ? "with-map" : ""}`}>
      <div className="flex flex-col h-full w-full rounded-xl shadow-lg bg-[rgba(25,28,40,0.97)] overflow-hidden compact-chat-container">
        {/* Chat Header - עיצוב משופר */}
        <div className="flex items-center justify-between py-2 px-4 bg-gradient-to-r from-[#1E293B] to-[#1E1F2A] border-b border-gray-800/60">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600/20 p-1.5 rounded-full flex items-center justify-center">
              <RiCompassDiscoverLine className="text-blue-400 text-lg" />
            </div>
            <div>
              <h3 className="text-white font-medium text-base tracking-wide">
                DreamTrip AI
              </h3>
              <div className="flex items-center">
                <motion.div
                  className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-xs text-gray-400">Travel Assistant</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-xs py-1 px-2 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800/30 flex items-center">
              <RiPlaneLine className="mr-1 text-xs" />
              <span>AI Travel Guide</span>
            </div>
          </div>
        </div>

        {/* Chat Content with History and Input */}
        <div className="flex-1 flex flex-col bg-[#171923] overflow-hidden relative">
          {/* Message History */}
          <div
            ref={chatContainerRef}
            id="chat-messages-container"
            className="flex-1 overflow-y-auto p-4 pb-28"
          >
            <div className="flex flex-col gap-6">
              {isPending ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-pulse flex space-x-2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-blue-400 rounded-full"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              ) : error ? (
                <div className="text-center p-4 text-red-400 bg-red-900/20 rounded-lg border border-red-800/30">
                  Error loading chat
                </div>
              ) : (
                <>
                  {/* Use our filtered combined history and pending messages */}
                  {messagesToDisplay.map((message, i) => {
                    // Determine which key to use based on message source
                    const messageKey =
                      message.source === "history"
                        ? `history-${message.index}`
                        : `pending-${message.id || message.index}`;

                    // Render missing field UI if needed
                    if (
                      message.isMissingFields &&
                      Array.isArray(message.missingFields)
                    ) {
                      return renderMissingFieldsForm(message);
                    }

                    // Special rendering for external data loading indicators
                    if (
                      message.isExternalDataFetch &&
                      message.isLoadingMessage
                    ) {
                      return (
                        <motion.div
                          key={messageKey}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="external-data-loading-wrapper ml-5 mt-3"
                        >
                          <div className="external-data-loading px-4 py-3 rounded-lg text-white text-sm shadow-md bg-gradient-to-r from-[#2a3856] to-[#2c3e69] self-start border-t border-l border-purple-500/30 inline-flex gap-3 items-center">
                            <RiMapPinLine className="text-purple-400 text-base" />
                            <div className="flex items-center">
                              <span className="mr-3">{message.message}</span>
                              <div className="typing-dots flex">
                                {[0, 1, 2].map((dot) => (
                                  <motion.div
                                    key={dot}
                                    className="w-1.5 h-1.5 bg-purple-400/80 rounded-full mx-0.5"
                                    animate={{
                                      y: ["0%", "-50%", "0%"],
                                      opacity: [0.6, 1, 0.6],
                                      scale: [1, 1.2, 1],
                                    }}
                                    transition={{
                                      duration: 0.8,
                                      repeat: Infinity,
                                      delay: dot * 0.2,
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    }

                    // Special rendering for generic typing indicators
                    if (message.isGenericTyping) {
                      return (
                        <motion.div
                          key={messageKey}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="typing-indicator-wrapper ml-5 mt-3"
                        >
                          <div className="typing-indicator px-3 py-2 rounded-lg text-white text-sm shadow-md bg-gradient-to-r from-[#293348] to-[#2d3346] self-start border-t border-l border-blue-500/20 inline-flex gap-2 items-center">
                            <RiCompassDiscoverLine className="text-blue-400 text-sm" />
                            <div className="typing-dots flex">
                              {[0, 1, 2].map((dot) => (
                                <motion.div
                                  key={dot}
                                  className="w-1.5 h-1.5 bg-blue-400/80 rounded-full mx-0.5"
                                  animate={{
                                    y: ["0%", "-40%", "0%"],
                                    opacity: [0.6, 1, 0.6],
                                  }}
                                  transition={{
                                    duration: 0.6,
                                    repeat: Infinity,
                                    delay: dot * 0.2,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      );
                    }

                    // Regular message rendering
                    return (
                      <React.Fragment key={messageKey}>
                        <motion.div
                          initial={{
                            opacity:
                              message.source === "pending" &&
                              !message.isDisplayStable
                                ? 0
                                : 0.8,
                            y:
                              message.source === "pending" &&
                              !message.isDisplayStable
                                ? 15
                                : 0,
                            scale:
                              message.source === "pending" &&
                              !message.isDisplayStable
                                ? 0.98
                                : 1,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            ...(message.isTransitioning
                              ? { opacity: [1, 0.7] }
                              : {}),
                            ...(message.highlight
                              ? {
                                  boxShadow: [
                                    "0 0 0px rgba(59, 130, 246, 0)",
                                    "0 0 15px rgba(59, 130, 246, 0.5)",
                                    "0 0 0px rgba(59, 130, 246, 0)",
                                  ],
                                  borderColor: [
                                    "rgba(59, 130, 246, 0.2)",
                                    "rgba(59, 130, 246, 0.6)",
                                    "rgba(59, 130, 246, 0.2)",
                                  ],
                                }
                              : {}),
                          }}
                          transition={{
                            duration:
                              message.source === "pending" &&
                              !message.isDisplayStable
                                ? 0.4
                                : 0.3,
                            ease: "easeOut",
                            opacity: { duration: 0.4 },
                            y: { type: "spring", stiffness: 120, damping: 14 },
                            boxShadow: { duration: 2, repeat: 0 },
                            borderColor: { duration: 2, repeat: 0 },
                          }}
                          className={`px-4 py-3 rounded-xl text-white text-base max-w-[75%] shadow-md leading-relaxed flex gap-3 mb-2 relative ${
                            message.role === "user"
                              ? "bg-gradient-to-r from-blue-600/30 to-blue-500/20 text-[#f9f9f9] self-end flex-row-reverse border-t border-r border-blue-500/20 mt-3"
                              : message.isSystemMessage
                              ? "bg-gradient-to-r from-[#2a3856] to-[#2c3e69] self-start border-t border-l border-blue-400/30 mt-3"
                              : message.isLoadingMessage
                              ? "bg-gradient-to-r from-[#2a2d3c] to-[#2a3856] self-start border-t border-l border-blue-400/20 mt-2"
                              : message.isTransitioning
                              ? "bg-gradient-to-r from-[#2a2d3c] to-[#2a3046] self-start border-t border-l border-gray-700/30 mt-2"
                              : message.wasUpdated
                              ? "bg-gradient-to-r from-[#2a2d3c] to-[#30324a] self-start border-t border-l border-blue-500/30 hover:shadow-lg hover:border-blue-500/50 transition-all duration-200 mt-3"
                              : "bg-gradient-to-r from-[#2a2d3c] to-[#30324a] self-start border-t border-l border-gray-700/30 hover:shadow-lg hover:border-gray-700/50 transition-all duration-200 mt-3"
                          }`}
                        >
                          <UpdatedBadge wasUpdated={message.wasUpdated} />

                          {message.role === "user" ? (
                            <div className="message-header">
                              <motion.div
                                className="bg-blue-500/30 p-1 rounded-full"
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                              >
                                <RiUser3Fill className="text-white text-xs" />
                              </motion.div>
                            </div>
                          ) : (
                            <div className="message-header">
                              <motion.div
                                className="ai-avatar-container"
                                initial={{ scale: 0.9, rotate: -10 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ duration: 0.3, type: "spring" }}
                              >
                                {message.isSystemMessage ? (
                                  <RiPlaneLine className="text-blue-300 text-sm" />
                                ) : message.isLoadingMessage ? (
                                  <RiMapPinLine className="text-blue-400 animate-pulse text-sm" />
                                ) : message.isTransitioning ? (
                                  <RiCompassDiscoverLine className="text-blue-400 text-sm" />
                                ) : (
                                  <RiCompassDiscoverLine className="text-blue-400 text-sm" />
                                )}
                              </motion.div>
                            </div>
                          )}

                          <div
                            className="message-content overflow-wrap-break-word"
                            style={{ maxWidth: "calc(100% - 30px)" }}
                          >
                            {message.img && (
                              <motion.div
                                className="image-container mb-2"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                              >
                                <IKImage
                                  urlEndpoint={
                                    import.meta.env.VITE_IMAGE_KIT_ENDPOINT
                                  }
                                  path={message.img}
                                  width="100%"
                                  height="auto"
                                  transformation={[{ width: 300 }]}
                                  loading="lazy"
                                  lqip={{ active: true, quality: 20 }}
                                  className="message-image rounded-lg shadow hover:shadow-md transition-all duration-200"
                                />
                              </motion.div>
                            )}
                            {message.isTripSummary ? (
                              <TripSummaryView
                                message={
                                  message.displayMessage ||
                                  message.message ||
                                  (message.parts && message.parts[0]?.text) ||
                                  ""
                                }
                              />
                            ) : (
                              // Replace direct Markdown with the renderMessage function
                              renderMessage(message)
                            )}

                            {/* Add itinerary action buttons */}
                            {renderItineraryActions(message)}
                          </div>
                        </motion.div>

                        {/* Show state indicator right after user message */}
                        {message.role === "user" &&
                          i ===
                            messagesToDisplay.findIndex(
                              (m) => m.role === "user" && m.id === message.id
                            ) &&
                          (isTyping ||
                            conversationState ===
                              CONVERSATION_STATES.ANALYZING_INPUT ||
                            conversationState ===
                              CONVERSATION_STATES.FETCHING_EXTERNAL_DATA ||
                            parallelDataFetch?.inProgress) &&
                          renderStateIndicator()}
                      </React.Fragment>
                    );
                  })}

                  {/* Show itinerary generation indicator */}
                  {isGeneratingItinerary && (
                    <div className="px-4 py-3 rounded-xl text-white text-base max-w-[75%] shadow-md bg-gradient-to-r from-[#2a2d3c] to-[#30324a] self-start border-t border-l border-gray-700/30 flex gap-3">
                      <div className="message-header">
                        <div className="ai-avatar-container">
                          <RiCompassDiscoverLine className="text-blue-400 text-sm" />
                        </div>
                      </div>
                      <div className="typing-indicator-content flex items-center">
                        <span className="typing-text mr-2">
                          Generating your itinerary
                        </span>
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
            <div className="sticky bottom-0 z-20 flex-shrink-0 mt-auto w-full chat-input-container">
              <NewPromt data={data} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
