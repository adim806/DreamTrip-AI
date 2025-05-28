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
  TRIP_BUILDING_MODE: "trip_building_mode"
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
  GENERAL: "general"
};

// Map intents to service categories
export const INTENT_TO_CATEGORY = {
  "Weather-Request": SERVICE_CATEGORIES.WEATHER,
  "Find-Hotel": SERVICE_CATEGORIES.HOTELS,
  "Find-Attractions": SERVICE_CATEGORIES.ATTRACTIONS,
  "Flight-Information": SERVICE_CATEGORIES.FLIGHTS,
  "Local-Events": SERVICE_CATEGORIES.LOCAL_EVENTS,
  "Travel-Restrictions": SERVICE_CATEGORIES.TRAVEL_RESTRICTIONS,
  "Currency-Conversion": SERVICE_CATEGORIES.CURRENCY
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
      lastUpdated: null
    },
    // Hotel search related data
    hotels: {
      city: null,
      country: null,
      checkIn: null,
      checkOut: null,
      guests: null,
      preferences: {},
      lastUpdated: null
    },
    // Attraction search related data
    attractions: {
      city: null,
      country: null,
      category: null,
      lastUpdated: null
    },
    // Flight information related data
    flights: {
      origin: null,
      destination: null,
      departDate: null,
      returnDate: null,
      travelers: null,
      lastUpdated: null
    },
    // Local events related data
    localEvents: {
      city: null,
      country: null,
      date: null,
      category: null,
      lastUpdated: null
    },
    // Travel restrictions related data
    travelRestrictions: {
      country: null,
      citizenship: null,
      lastUpdated: null
    },
    // Currency conversion related data
    currency: {
      from: null,
      to: null,
      amount: null,
      lastUpdated: null
    },
    // General user preferences
    general: {
      language: "en",
      units: "metric",
      lastUpdated: null
    },
    // Meta information
    meta: {
      lastIntent: null,
      lastUpdated: null
    }
  });
  
  // State machine management
  const [conversationState, setConversationState] = useState(CONVERSATION_STATES.IDLE);
  const [activeItineraryIndex, setActiveItineraryIndex] = useState(0);
  
  // Track which chat ID is associated with the active trip
  const [activeTripChatId, setActiveTripChatId] = useState(null);
  
  // Multi-trip support
  const [tripDrafts, setTripDrafts] = useState([]);
  const [completedTrips, setCompletedTrips] = useState([]);
  
  // Track trip cancellation for cleanup
  const [wasTripCancelled, setWasTripCancelled] = useState(false);
  
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

  /**
   * Updates the UserProfile with new data based on intent type
   * @param {string} intent - The detected intent
   * @param {Object} data - The new data to merge with existing profile
   * @param {boolean} hasNewData - Whether this contains new advice data
   * @returns {Object} - The updated profile section
   */
  const updateUserProfile = useCallback((intent, data, hasNewData = false) => {
    if (!intent || !data) return null;
    
    // Map the intent to the appropriate category
    const category = INTENT_TO_CATEGORY[intent] || SERVICE_CATEGORIES.GENERAL;
    
    console.log(`[UserProfile] Updating ${category} with new data:`, data);
    
    setUserProfile(prevProfile => {
      // Create a deep copy of the current profile
      const updatedProfile = JSON.parse(JSON.stringify(prevProfile));
      
      // Get the relevant section for this intent
      const profileSection = updatedProfile[category] || {};
      
      // Create a timestamp
      const timestamp = new Date().toISOString();
      
      // Merge the new data with the existing data
      const mergedSection = {
        ...profileSection,
        ...data,
        lastUpdated: timestamp
      };
      
      // Update the specific category
      updatedProfile[category] = mergedSection;
      
      // Update meta information
      updatedProfile.meta = {
        ...updatedProfile.meta,
        lastIntent: intent,
        lastUpdated: timestamp
      };
      
      console.log(`[UserProfile] Updated ${category} section:`, mergedSection);
      return updatedProfile;
    });
    
    // Return the specific category section for convenience
    return userProfile[category];
  }, [userProfile]);
  
  /**
   * Retrieves user data for a specific intent
   * @param {string} intent - The intent to get data for
   * @returns {Object} - The relevant section of the user profile
   */
  const getUserProfileData = useCallback((intent) => {
    if (!intent) return null;
    
    // Map the intent to the appropriate category
    const category = INTENT_TO_CATEGORY[intent] || SERVICE_CATEGORIES.GENERAL;
    
    // Return the data for this category
    return userProfile[category] || null;
  }, [userProfile]);
  
  /**
   * Clears specific categories or the entire user profile
   * @param {string} category - Optional category to clear (clears all if not specified)
   */
  const clearUserProfile = useCallback((category = null) => {
    if (category && userProfile[category]) {
      // Clear just one category
      setUserProfile(prev => {
        const updated = { ...prev };
        
        // Reset this category to default empty values
        updated[category] = {
          lastUpdated: new Date().toISOString()
        };
        
        return updated;
      });
      
      console.log(`[UserProfile] Cleared category: ${category}`);
    } else if (!category) {
      // Reset the entire profile
      setUserProfile({
        weather: { lastUpdated: null },
        hotels: { lastUpdated: null },
        attractions: { lastUpdated: null },
        flights: { lastUpdated: null },
        localEvents: { lastUpdated: null },
        travelRestrictions: { lastUpdated: null },
        currency: { lastUpdated: null },
        general: {
          language: userProfile.general?.language || "en",
          units: userProfile.general?.units || "metric",
          lastUpdated: new Date().toISOString()
        },
        meta: {
          lastIntent: null,
          lastUpdated: new Date().toISOString()
        }
      });
      
      console.log(`[UserProfile] Reset entire profile`);
    }
  }, [userProfile]);

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
    // Only save non-cancelled trips
    if (tripDetails && !wasTripCancelled && !tripDrafts.some(draft => draft.id === tripDetails.id)) {
      setTripDrafts(prev => [...prev, { ...tripDetails, id: Date.now() }]);
    }
    
    // Reset to a new trip
    setTripDetails(null);
    setallTripData(null);
    setConversationState(CONVERSATION_STATES.IDLE);
    
    // Reset cancellation flag
    setWasTripCancelled(false);
    
    // Also reset active trip chat ID
    setActiveTripChatId(null);
    
    console.log("Started new trip, cleared previous trip details");
  }, [tripDetails, tripDrafts, wasTripCancelled]);

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
    
    // Reset cancellation flag when switching trips
    setWasTripCancelled(false);
  }, [tripDrafts, completedTrips]);

  const completeTrip = useCallback((tripData) => {
    // Only add to completed trips if not cancelled
    if (!wasTripCancelled && tripData) {
      // Add to completed trips
      setCompletedTrips(prev => [...prev, tripData]);
      
      // Remove from drafts if it's there
      if (tripData.tripDetails && tripData.tripDetails.id) {
        setTripDrafts(prev => prev.filter(draft => draft.id !== tripData.tripDetails.id));
      }
      
      console.log("Trip completed and added to completed trips");
      setConversationState(CONVERSATION_STATES.DISPLAYING_ITINERARY);
    } else {
      console.log("Trip was cancelled, not adding to completed trips");
    }
    
    // Reset cancellation flag
    setWasTripCancelled(false);
  }, [wasTripCancelled]);

  // Fully clear a trip - use for cancellations
  const cancelTrip = useCallback(() => {
    console.log("Cancelling trip");
    
    // Mark the trip as cancelled so it won't be saved to drafts
    setWasTripCancelled(true);
    
    // Reset all trip data
    setTripDetails(null);
    setallTripData(null);
    
    // Return to idle state
    setConversationState(CONVERSATION_STATES.IDLE);
    
    // Clear the active trip chat ID
    setActiveTripChatId(null);
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
          // Mark the trip as cancelled
          setWasTripCancelled(true);
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
        // Reset cancellation flag when starting to generate itinerary
        setWasTripCancelled(false);
        break;
        
      case CONVERSATION_STATES.DISPLAYING_ITINERARY:
        // When displaying itinerary, if we have complete data, save as completed trip
        if (contextData && !wasTripCancelled) {
          completeTrip(contextData);
          
          // After transitioning to displaying itinerary, inform the main model
          // This will notify the main model that the itinerary is ready
          if (window.__processingHookState && window.__processingHookState.addSystemMessage) {
            setTimeout(() => {
              window.__processingHookState.addSystemMessage(
                `Your itinerary for ${contextData.tripDetails.vacation_location} is now ready. Is there anything specific about the itinerary you'd like me to explain or modify?`
              );
            }, 1000);
          }
        }
        break;
        
      // Add other state transitions as needed
    }
    
    // Update the state
    setConversationState(newState);
  }, [conversationState, completeTrip, wasTripCancelled]);

  // Listen to state changes to detect when a trip is cancelled
  useEffect(() => {
    if (conversationState === CONVERSATION_STATES.IDLE && tripDetails) {
      // If we're returning to IDLE state but still have trip details,
      // check if this was due to cancellation
      if (wasTripCancelled) {
        console.log("Completing cleanup for cancelled trip");
        // Clear trip details since this was a cancellation
        setTripDetails(null);
        setallTripData(null);
        setActiveTripChatId(null);
      }
    }
  }, [conversationState, tripDetails, wasTripCancelled]);

  // This effect monitors trip details changes and forces display of trip summary when appropriate
  useEffect(() => {
    // Add debouncing to prevent infinite loop
    let debounceTimer = null;
    
    if (tripDetails) {
      // Clear any existing timer
      if (debounceTimer) clearTimeout(debounceTimer);
      
      // Set a new timer to delay validation by 500ms
      debounceTimer = setTimeout(() => {
        // Import validateRequiredTripFields function to check if trip is complete
        import('../../utils/tripUtils').then(({ validateRequiredTripFields }) => {
          // Check if trip has all required fields
          const validationResult = validateRequiredTripFields(tripDetails);
          
          console.log("TripProvider checking if trip should trigger summary:", {
            validationResult,
            currentState: conversationState,
            tripDetails: {
              hasLocation: !!tripDetails.vacation_location,
              hasDuration: !!tripDetails.duration,
              hasDates: tripDetails.dates && tripDetails.dates.from && tripDetails.dates.to,
              hasBudget: tripDetails.budget || (tripDetails.constraints && tripDetails.constraints.budget)
            }
          });
          
          // If trip is valid but we're not in awaiting confirmation state,
          // force transition to that state
          if (validationResult.success && 
              conversationState !== CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION &&
              conversationState !== CONVERSATION_STATES.GENERATING_ITINERARY &&
              conversationState !== CONVERSATION_STATES.DISPLAYING_ITINERARY) {
            console.log("🔄 Force transitioning to AWAITING_USER_TRIP_CONFIRMATION because trip data is complete");
            transitionState(CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION);
          }
        });
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
