// src/contexts/TripContext.js
import React, { createContext, useState, useCallback } from "react";

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
  TRIP_BUILDING_MODE: "trip_building_mode"
};

export const TripContext = createContext();

export function TripProvider({ children }) {
  // State for trips management
  const [tripDetails, setTripDetails] = useState(null);
  const [allTripData, setallTripData] = useState(null);
  
  // State machine management
  const [conversationState, setConversationState] = useState(CONVERSATION_STATES.IDLE);
  const [activeItineraryIndex, setActiveItineraryIndex] = useState(0);
  
  // Track which chat ID is associated with the active trip
  const [activeTripChatId, setActiveTripChatId] = useState(null);
  
  // Multi-trip support
  const [tripDrafts, setTripDrafts] = useState([]);
  const [completedTrips, setCompletedTrips] = useState([]);
  
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

  // Function to generate an itinerary - will be implemented by NewPromt/useProcessUserInput
  const [handleGenerateItinerary, setHandleGenerateItinerary] = useState(() => () => {
    console.log("handleGenerateItinerary not yet initialized");
    // Default implementation will just transition to the generating state
    // The actual implementation will be set by the useProcessUserInput hook
    transitionState(CONVERSATION_STATES.GENERATING_ITINERARY);
  });
  
  // Allow components to provide the implementation for generating itineraries
  const registerItineraryGenerator = useCallback((generatorFn) => {
    if (typeof generatorFn === 'function') {
      setHandleGenerateItinerary(() => generatorFn);
    }
  }, []);

  // Functions for state management
  const startNewTrip = useCallback(() => {
    // Store current trip in drafts if it exists and isn't already stored
    if (tripDetails && !tripDrafts.some(draft => draft.id === tripDetails.id)) {
      setTripDrafts(prev => [...prev, { ...tripDetails, id: Date.now() }]);
    }
    
    // Reset to a new trip
    setTripDetails(null);
    setallTripData(null);
    setConversationState(CONVERSATION_STATES.IDLE);
  }, [tripDetails, tripDrafts]);

  const switchToTrip = useCallback((tripIndex) => {
    // If index is for a draft trip
    if (tripIndex < tripDrafts.length) {
      setTripDetails(tripDrafts[tripIndex]);
      setallTripData(null); // Clear current itinerary data
      setConversationState(CONVERSATION_STATES.TRIP_BUILDING_MODE);
      setActiveItineraryIndex(tripIndex);
    } 
    // If index is for a completed trip
    else if (tripIndex - tripDrafts.length < completedTrips.length) {
      const completedIndex = tripIndex - tripDrafts.length;
      setTripDetails(completedTrips[completedIndex].tripDetails);
      setallTripData(completedTrips[completedIndex]);
      setConversationState(CONVERSATION_STATES.DISPLAYING_ITINERARY);
      setActiveItineraryIndex(tripIndex);
    }
  }, [tripDrafts, completedTrips]);

  const completeTrip = useCallback((tripData) => {
    // Add to completed trips
    setCompletedTrips(prev => [...prev, tripData]);
    
    // Remove from drafts if it's there
    if (tripData.tripDetails && tripData.tripDetails.id) {
      setTripDrafts(prev => prev.filter(draft => draft.id !== tripData.tripDetails.id));
    }
    
    setConversationState(CONVERSATION_STATES.DISPLAYING_ITINERARY);
  }, []);

  // All state transitions are managed here for consistency
  const transitionState = useCallback((newState, contextData) => {
    console.log(`Transition state: ${conversationState} → ${newState}`);
    
    // Handle specific state transitions
    switch (newState) {
      case CONVERSATION_STATES.IDLE:
        // When transitioning to IDLE from AWAITING_USER_TRIP_CONFIRMATION, 
        // it means the user cancelled the trip confirmation
        if (conversationState === CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION) {
          console.log("User cancelled trip confirmation, returning to IDLE state");
          // Could potentially save the cancelled trip details to history here
        }
        break;
        
      case CONVERSATION_STATES.TRIP_BUILDING_MODE:
        // When transitioning back to TRIP_BUILDING_MODE from AWAITING_USER_TRIP_CONFIRMATION,
        // it means the user wants to edit trip details
        if (conversationState === CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION) {
          console.log("User chose to edit trip details");
          // No need to clear trip details - we want to keep them for editing
        }
        break;
        
      case CONVERSATION_STATES.GENERATING_ITINERARY:
        // Store current chat ID as the active trip chat ID
        setActiveTripChatId(window.location.pathname.split('/').pop());
        break;
        
      case CONVERSATION_STATES.DISPLAYING_ITINERARY:
        // When displaying itinerary, if we have complete data, save as completed trip
        if (contextData) {
          completeTrip(contextData);
        }
        break;
        
      // Add other state transitions as needed
    }
    
    // Update the state
    setConversationState(newState);
  }, [conversationState, completeTrip]);

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
        
        // Itinerary generation
        handleGenerateItinerary,
        registerItineraryGenerator,
        
        // Multi-trip support
        tripDrafts,
        completedTrips,
        startNewTrip,
        switchToTrip,
        activeItineraryIndex,
        
        // Chat-trip association
        activeTripChatId,
        
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
      }}
    >
      {children}
    </TripContext.Provider>
  );
}
