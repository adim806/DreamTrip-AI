// src/contexts/TripContext.js
import React, { createContext, useState, useCallback, useEffect } from "react";

// Define conversation states
export const CONVERSATION_STATES = {
  IDLE: "idle",
  ANALYZING_INPUT: "analyzing_input",
  FETCHING_EXTERNAL_DATA: "fetching_external_data",
  AWAITING_USER_TRIP_CONFIRMATION: "awaiting_user_trip_confirmation",
  GENERATING_ITINERARY: "generating_itinerary",
  DISPLAYING_ITINERARY: "displaying_itinerary",
  EDITING_ITINERARY: "editing_itinerary",
  ADVISORY_MODE: "advisory_mode",
  TRIP_BUILDING_MODE: "trip_building_mode",
  AWAITING_MISSING_INFO: "awaiting_missing_info",
  ITINERARY_ADVICE_MODE: "itinerary_advice_mode",
};

// Define service categories for UserProfile
export const SERVICE_CATEGORIES = {
  WEATHER: "weather",
  HOTELS: "hotels",
  ATTRACTIONS: "attractions",
  FLIGHTS: "flights",
  LOCAL_EVENTS: "localEvents",
  TRAVEL_RESTRICTIONS: "travelRestrictions",
  CURRENCY: "currency",
  GENERAL: "general",
};

// Map intents to service categories
export const INTENT_TO_CATEGORY = {
  "Weather-Request": SERVICE_CATEGORIES.WEATHER,
  "Find-Hotel": SERVICE_CATEGORIES.HOTELS,
  "Find-Attractions": SERVICE_CATEGORIES.ATTRACTIONS,
  "Flight-Information": SERVICE_CATEGORIES.FLIGHTS,
  "Local-Events": SERVICE_CATEGORIES.LOCAL_EVENTS,
  "Travel-Restrictions": SERVICE_CATEGORIES.TRAVEL_RESTRICTIONS,
  "Currency-Conversion": SERVICE_CATEGORIES.CURRENCY,
};

export const TripContext = createContext();

export function TripProvider({ children }) {
  // State for trips management
  const [tripDetails, setTripDetails] = useState(null);
  const [allTripData, setallTripData] = useState(null);

  // New UserProfile state for managing user context across intents
  const [userProfile, setUserProfile] = useState({
    // Weather related data
    weather: {
      city: null,
      country: null,
      time: null,
      isCurrentTime: false,
      isToday: false,
      isTomorrow: false,
      isWeekend: false,
      lastUpdated: null,
    },
    // Hotel search related data
    hotels: {
      city: null,
      country: null,
      checkIn: null,
      checkOut: null,
      guests: null,
      preferences: {},
      lastUpdated: null,
    },
    // Attraction search related data
    attractions: {
      city: null,
      country: null,
      category: null,
      lastUpdated: null,
    },
    // Flight information related data
    flights: {
      origin: null,
      destination: null,
      departDate: null,
      returnDate: null,
      travelers: null,
      lastUpdated: null,
    },
    // Local events related data
    localEvents: {
      city: null,
      country: null,
      date: null,
      category: null,
      lastUpdated: null,
    },
    // Travel restrictions related data
    travelRestrictions: {
      country: null,
      citizenship: null,
      lastUpdated: null,
    },
    // Currency conversion related data
    currency: {
      from: null,
      to: null,
      amount: null,
      lastUpdated: null,
    },
    // General user preferences
    general: {
      language: "en",
      units: "metric",
      lastUpdated: null,
    },
    // Meta information
    meta: {
      lastIntent: null,
      lastUpdated: null,
    },
  });

  // State machine management
  const [conversationState, setConversationState] = useState(
    CONVERSATION_STATES.IDLE
  );
  const [activeItineraryIndex, setActiveItineraryIndex] = useState(0);

  // Track which chat ID is associated with the active trip
  const [activeTripChatId, setActiveTripChatId] = useState(null);

  // Chat-specific activities cache
  const [chatActivities, setChatActivities] = useState({});

  // Multi-trip support
  const [tripDrafts, setTripDrafts] = useState([]);
  const [completedTrips, setCompletedTrips] = useState([]);

  // Track trip cancellation for cleanup
  const [wasTripCancelled, setWasTripCancelled] = useState(false);

  // Map display state
  const [currentDestination, setCurrentDestination] = useState("");
  const [displayMode, setDisplayMode] = useState("default");

  // נתונים לכל קטגוריה
  const [hotelsData, setHotelsData] = useState(null);
  const [restaurantsData, setRestaurantsData] = useState(null);
  const [attractionsData, setAttractionsData] = useState(null);
  const [customRouteData, setCustomRouteData] = useState(null);

  // ניהול השכבה הפעילה במפה ותפריט ברירת מחדל
  const [activeLayer, setActiveLayer] = useState(null);
  const [defaultTab, setDefaultTab] = useState("generalInfo"); // ברירת מחדל ל"תיאור כללי"

  // משתנה לניהול המלון הנבחר
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedAttraction, setSelectedAttraction] = useState(null);

  // Check and update active chat ID from URL
  useEffect(() => {
    // Try to get chatId from URL if available
    const pathParts = window.location.pathname.split("/");
    const possibleChatId = pathParts[pathParts.length - 1];
    const chatIdFromUrl = possibleChatId.length > 20 ? possibleChatId : null;

    if (chatIdFromUrl && chatIdFromUrl !== activeTripChatId) {
      console.log(
        `TripProvider: Updating active chat ID from URL: ${chatIdFromUrl}`
      );
      setActiveTripChatId(chatIdFromUrl);

      // Store in localStorage for persistence
      localStorage.setItem("chatId", chatIdFromUrl);

      // Clear category data when changing chats to ensure fresh data
      setHotelsData(null);
      setRestaurantsData(null);
      setAttractionsData(null);
    }
  }, [activeTripChatId]);

  // Set state machine
  const [handleGenerateItinerary, setHandleGenerateItinerary] = useState(
    () => () => console.warn("Itinerary generator not registered yet")
  );

  // State machine transition function
  const transitionState = useCallback(
    (newState) => {
      console.log(`State transition: ${conversationState} -> ${newState}`);
      setConversationState(newState);
    },
    [conversationState]
  );

  /**
   * Updates the UserProfile with new data based on intent type
   * @param {string} intent - The detected intent
   * @param {Object} data - The new data to merge with existing profile
   * @param {boolean} hasNewData - Whether this contains new advice data
   * @returns {Object} - The updated profile section
   */
  const updateUserProfile = useCallback(
    (intent, data, hasNewData = true) => {
      if (!intent || !INTENT_TO_CATEGORY[intent]) {
        console.warn(
          `Invalid or unsupported intent for profile update: ${intent}`
        );
        return null;
      }

      const category = INTENT_TO_CATEGORY[intent];
      console.log(
        `Updating user profile for intent: ${intent}, category: ${category}`
      );

      setUserProfile((prevProfile) => {
        // Only update if we have new data
        if (!hasNewData) return prevProfile;

        // Create deep copy to avoid direct state mutation
        const updatedProfile = JSON.parse(JSON.stringify(prevProfile));

        // Update the specific category with new data
        if (updatedProfile[category]) {
          // Merge new data with existing category data
          updatedProfile[category] = {
            ...updatedProfile[category],
            ...data,
            lastUpdated: new Date().toISOString(),
          };
        }

        // Update meta information
        updatedProfile.meta = {
          ...updatedProfile.meta,
          lastIntent: intent,
          lastUpdated: new Date().toISOString(),
        };

        return updatedProfile;
      });

      // Return the current category data for convenience
      return userProfile[category];
    },
    [userProfile]
  );

  /**
   * Gets the relevant profile data for a given category
   * Useful for retrieving context for follow-up questions
   * @param {string} category - The category to retrieve
   * @returns {Object} - The profile data for that category
   */
  const getUserProfileData = useCallback(
    (category) => {
      if (!category || !SERVICE_CATEGORIES[category.toUpperCase()]) {
        console.warn(`Invalid category for profile data: ${category}`);
        return null;
      }

      const categoryKey = SERVICE_CATEGORIES[category.toUpperCase()];
      return userProfile[categoryKey];
    },
    [userProfile]
  );

  /**
   * Clears some or all of the user profile
   * @param {string} [category] - Optional specific category to clear
   */
  const clearUserProfile = useCallback((category = null) => {
    if (category) {
      const categoryKey = SERVICE_CATEGORIES[category.toUpperCase()];
      if (categoryKey) {
        console.log(`Clearing user profile for category: ${category}`);
        setUserProfile((prevProfile) => {
          const updatedProfile = { ...prevProfile };
          // Reset this specific category to default
          updatedProfile[categoryKey] = {
            ...updatedProfile[categoryKey],
            city: null,
            country: null,
            lastUpdated: new Date().toISOString(),
          };
          return updatedProfile;
        });
      } else {
        console.warn(`Invalid category for profile clearing: ${category}`);
      }
    } else {
      // Clear all categories except general preferences
      console.log("Clearing all user profile categories");
      setUserProfile((prevProfile) => {
        const generalPreferences = { ...prevProfile.general };
        const defaultProfile = {
          weather: {
            city: null,
            country: null,
            time: null,
            isCurrentTime: false,
            isToday: false,
            isTomorrow: false,
            isWeekend: false,
            lastUpdated: new Date().toISOString(),
          },
          hotels: {
            city: null,
            country: null,
            checkIn: null,
            checkOut: null,
            guests: null,
            preferences: {},
            lastUpdated: new Date().toISOString(),
          },
          attractions: {
            city: null,
            country: null,
            category: null,
            lastUpdated: new Date().toISOString(),
          },
          flights: {
            origin: null,
            destination: null,
            departDate: null,
            returnDate: null,
            travelers: null,
            lastUpdated: new Date().toISOString(),
          },
          localEvents: {
            city: null,
            country: null,
            date: null,
            category: null,
            lastUpdated: new Date().toISOString(),
          },
          travelRestrictions: {
            country: null,
            citizenship: null,
            lastUpdated: new Date().toISOString(),
          },
          currency: {
            from: null,
            to: null,
            amount: null,
            lastUpdated: new Date().toISOString(),
          },
          general: generalPreferences, // Keep user preferences
          meta: {
            lastIntent: null,
            lastUpdated: new Date().toISOString(),
          },
        };
        return defaultProfile;
      });
    }
  }, []);

  // Allow components to provide the implementation for generating itineraries
  const registerItineraryGenerator = useCallback((generatorFn) => {
    if (typeof generatorFn === "function") {
      console.log("Registering itinerary generator function");
      // Wrap the function to add proper logging
      setHandleGenerateItinerary(() => (...args) => {
        console.log("Calling registered itinerary generator");
        return generatorFn(...args);
      });
    } else {
      console.warn(
        "Attempted to register invalid itinerary generator:",
        generatorFn
      );
    }
  }, []);

  // Functions for state management
  const startNewTrip = useCallback(() => {
    // Store current trip in drafts if it exists and isn't already stored
    // Only save non-cancelled trips
    if (
      tripDetails &&
      !wasTripCancelled &&
      !tripDrafts.some((draft) => draft.id === tripDetails.id)
    ) {
      setTripDrafts((prev) => [...prev, { ...tripDetails, id: Date.now() }]);
    }

    // Reset to a new trip
    setTripDetails(null);
    setallTripData(null);
    setConversationState(CONVERSATION_STATES.IDLE);

    // Reset cancellation flag
    setWasTripCancelled(false);

    // Reset active trip chat ID but keep track of current chat
    const currentChatId = activeTripChatId;
    console.log(`Starting new trip in chat: ${currentChatId}`);

    return currentChatId; // Return the current chat ID for convenience
  }, [tripDetails, tripDrafts, wasTripCancelled, activeTripChatId]);

  const switchToTrip = useCallback(
    (tripIndex) => {
      // If index is for a draft trip
      if (tripIndex < tripDrafts.length) {
        const selectedDraft = tripDrafts[tripIndex];
        setTripDetails(selectedDraft);
        setallTripData(null); // Clear current itinerary data
        setConversationState(CONVERSATION_STATES.TRIP_BUILDING_MODE);
        setActiveItineraryIndex(tripIndex);

        // Set the chat ID if available in the draft
        if (selectedDraft.chatId) {
          console.log(
            `Switching to draft trip with chatId: ${selectedDraft.chatId}`
          );
          setActiveTripChatId(selectedDraft.chatId);
        }
      }
      // If index is for a completed trip
      else if (tripIndex - tripDrafts.length < completedTrips.length) {
        const completedIndex = tripIndex - tripDrafts.length;
        const selectedTrip = completedTrips[completedIndex];
        setTripDetails(selectedTrip.tripDetails);
        setallTripData(selectedTrip);
        setConversationState(CONVERSATION_STATES.DISPLAYING_ITINERARY);
        setActiveItineraryIndex(tripIndex);

        // Set the chat ID if available in the completed trip
        if (selectedTrip.tripDetails?.chatId) {
          console.log(
            `Switching to completed trip with chatId: ${selectedTrip.tripDetails.chatId}`
          );
          setActiveTripChatId(selectedTrip.tripDetails.chatId);
        }
      }

      // Reset cancellation flag when switching trips
      setWasTripCancelled(false);
    },
    [tripDrafts, completedTrips]
  );

  const completeTrip = useCallback(
    (tripData) => {
      // Only add to completed trips if not cancelled
      if (!wasTripCancelled && tripData) {
        // Make sure the trip data includes the current chat ID
        const enhancedTripData = {
          ...tripData,
          tripDetails: {
            ...tripData.tripDetails,
            chatId: activeTripChatId,
          },
        };

        // Add to completed trips
        setCompletedTrips((prev) => [...prev, enhancedTripData]);

        // Remove from drafts if it's there
        if (tripData.tripDetails && tripData.tripDetails.id) {
          setTripDrafts((prev) =>
            prev.filter((draft) => draft.id !== tripData.tripDetails.id)
          );
        }

        console.log(
          `Trip completed in chat ${activeTripChatId} and added to completed trips`
        );
        setConversationState(CONVERSATION_STATES.DISPLAYING_ITINERARY);
      } else {
        console.log("Trip was cancelled, not adding to completed trips");
      }

      // Reset cancellation flag
      setWasTripCancelled(false);
    },
    [wasTripCancelled, activeTripChatId]
  );

  // Fully clear a trip - use for cancellations
  const cancelTrip = useCallback(() => {
    // Store current trip details for debugging
    const currentTripLocation = tripDetails?.vacation_location;

    // Set cancelled flag to prevent saving in drafts
    setWasTripCancelled(true);

    setTripDetails(null);
    setallTripData(null);
    setConversationState(CONVERSATION_STATES.IDLE);

    console.log(
      `Trip to ${
        currentTripLocation || "unknown location"
      } has been cancelled by user`
    );

    // Return to advisory mode
    return CONVERSATION_STATES.ADVISORY_MODE;
  }, [tripDetails]);

  // Helper to update activities for a specific chat
  const updateChatActivities = useCallback((chatId, activities) => {
    if (!chatId) return;

    setChatActivities((prev) => ({
      ...prev,
      [chatId]: activities,
    }));

    console.log(
      `Updated activities for chat ${chatId}: ${activities.length} items`
    );
  }, []);

  // Helper to get activities for a specific chat
  const getChatActivities = useCallback(
    (chatId) => {
      if (!chatId) return [];
      return chatActivities[chatId] || [];
    },
    [chatActivities]
  );

  // Monitor URL changes to detect chat ID changes
  useEffect(() => {
    const handleUrlChange = () => {
      // Try to get chatId from URL
      const pathParts = window.location.pathname.split("/");
      const possibleChatId = pathParts[pathParts.length - 1];
      const chatIdFromUrl = possibleChatId.length > 20 ? possibleChatId : null;

      if (chatIdFromUrl && chatIdFromUrl !== activeTripChatId) {
        console.log(`URL changed, new chatId detected: ${chatIdFromUrl}`);
        setActiveTripChatId(chatIdFromUrl);
        localStorage.setItem("chatId", chatIdFromUrl);
      }
    };

    // Add event listeners to detect URL changes
    window.addEventListener("popstate", handleUrlChange);

    // Clean up
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, [activeTripChatId]);

  // Sync tripDetails with activeTripChatId when changing/updating trip
  useEffect(() => {
    if (tripDetails && activeTripChatId && !tripDetails.chatId) {
      // Add chatId to tripDetails if not already present
      console.log(`Adding chatId ${activeTripChatId} to trip details`);
      setTripDetails((prev) => ({
        ...prev,
        chatId: activeTripChatId,
      }));
    }
  }, [tripDetails, activeTripChatId]);

  // Monitor trip validation state
  useEffect(() => {
    let debounceTimer;

    // Only run this effect if we have trip details and we're in a relevant state
    if (
      tripDetails &&
      (conversationState === CONVERSATION_STATES.TRIP_BUILDING_MODE ||
        conversationState === CONVERSATION_STATES.AWAITING_MISSING_INFO)
    ) {
      // Debounce the check to avoid excessive validation
      debounceTimer = setTimeout(() => {
        // Import validateRequiredTripFields function to check if trip is complete
        import("../../utils/tripUtils").then(
          ({ validateRequiredTripFields, validateTripCompletion }) => {
            // Check if trip has all required fields
            const validationResult = validateRequiredTripFields(tripDetails);

            // Enhanced logging with more details
            console.log(
              "TripProvider checking if trip should trigger summary:",
              {
                validationResult,
                currentState: conversationState,
                tripDetails: {
                  vacation_location: tripDetails.vacation_location || "missing",
                  duration: tripDetails.duration || "missing",
                  dates: tripDetails.dates
                    ? `from: ${tripDetails.dates.from || "missing"}, to: ${
                        tripDetails.dates.to || "missing"
                      }`
                    : "missing",
                  budget:
                    tripDetails.budget ||
                    tripDetails.constraints?.budget ||
                    "missing",
                  travelers: tripDetails.travelers || "missing",
                  hasLocation: !!tripDetails.vacation_location,
                  hasDuration: !!tripDetails.duration,
                  hasDates: !!(
                    tripDetails.dates &&
                    ((tripDetails.dates.from && tripDetails.dates.to) ||
                      (tripDetails.dates.from && tripDetails.isTomorrow) ||
                      (tripDetails.dates.from && tripDetails.duration))
                  ),
                  hasBudget: !!(
                    tripDetails.budget ||
                    (tripDetails.constraints && tripDetails.constraints.budget)
                  ),
                },
              }
            );

            // Get a more detailed validation if needed
            const detailedValidation = validateTripCompletion(tripDetails);
            console.log("Detailed validation result:", detailedValidation);

            // If trip is valid but we're not in awaiting confirmation state,
            // force transition to that state
            if (
              validationResult.success &&
              conversationState !==
                CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION &&
              conversationState !== CONVERSATION_STATES.GENERATING_ITINERARY &&
              conversationState !== CONVERSATION_STATES.DISPLAYING_ITINERARY
            ) {
              console.log(
                "🔄 Force transitioning to AWAITING_USER_TRIP_CONFIRMATION because trip data is complete"
              );
              transitionState(
                CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION
              );
            }
          }
        );
      }, 500); // 500ms debounce
    }

    // Cleanup the timer when the component unmounts or dependencies change
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [tripDetails, conversationState, transitionState]);

  return (
    <TripContext.Provider
      value={{
        // Original trip state
        tripDetails,
        setTripDetails,
        allTripData,
        setallTripData,

        // State machine
        conversationState,
        transitionState,
        CONVERSATION_STATES,

        // New UserProfile management
        userProfile,
        updateUserProfile,
        getUserProfileData,
        clearUserProfile,
        SERVICE_CATEGORIES,
        INTENT_TO_CATEGORY,

        // Itinerary generation
        handleGenerateItinerary,
        registerItineraryGenerator,

        // Multi-trip support
        tripDrafts,
        completedTrips,
        startNewTrip,
        switchToTrip,
        activeItineraryIndex,

        // Trip cancellation
        cancelTrip,
        wasTripCancelled,
        setWasTripCancelled,

        // Chat-trip association
        activeTripChatId,
        setActiveTripChatId,

        // Chat-specific activities
        chatActivities,
        updateChatActivities,
        getChatActivities,

        // Original category data
        hotelsData,
        setHotelsData,
        restaurantsData,
        setRestaurantsData,
        attractionsData,
        setAttractionsData,
        customRouteData,
        setCustomRouteData,

        // Map and UI controls
        activeLayer,
        setActiveLayer,
        defaultTab,
        setDefaultTab,
        selectedHotel,
        setSelectedHotel,
        selectedRestaurant,
        setSelectedRestaurant,
        selectedAttraction,
        setSelectedAttraction,

        // Map display state
        currentDestination,
        setCurrentDestination,
        displayMode,
        setDisplayMode,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}
