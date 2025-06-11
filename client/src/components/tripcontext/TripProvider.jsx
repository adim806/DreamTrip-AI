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
  const updateUserProfile = useCallback(
    (intent, data, hasNewData = false) => {
      if (!intent || !data) return null;

      // Map the intent to the appropriate category
      const category = INTENT_TO_CATEGORY[intent] || SERVICE_CATEGORIES.GENERAL;

      console.log(`[UserProfile] Updating ${category} with new data:`, data);

      setUserProfile((prevProfile) => {
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
          lastUpdated: timestamp,
        };

        // Update the specific category
        updatedProfile[category] = mergedSection;

        // Update meta information
        updatedProfile.meta = {
          ...updatedProfile.meta,
          lastIntent: intent,
          lastUpdated: timestamp,
        };

        console.log(
          `[UserProfile] Updated ${category} section:`,
          mergedSection
        );
        return updatedProfile;
      });

      // Return the specific category section for convenience
      return userProfile[category];
    },
    [userProfile]
  );

  /**
   * Retrieves user data for a specific intent
   * @param {string} intent - The intent to get data for
   * @returns {Object} - The relevant section of the user profile
   */
  const getUserProfileData = useCallback(
    (intent) => {
      if (!intent) return null;

      // Map the intent to the appropriate category
      const category = INTENT_TO_CATEGORY[intent] || SERVICE_CATEGORIES.GENERAL;

      // Return the data for this category
      return userProfile[category] || null;
    },
    [userProfile]
  );

  /**
   * Clears specific categories or the entire user profile
   * @param {string} category - Optional category to clear (clears all if not specified)
   */
  const clearUserProfile = useCallback(
    (category = null) => {
      if (category && userProfile[category]) {
        // Clear just one category
        setUserProfile((prev) => {
          const updated = { ...prev };

          // Reset this category to default empty values
          updated[category] = {
            lastUpdated: new Date().toISOString(),
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
            lastUpdated: new Date().toISOString(),
          },
          meta: {
            lastIntent: null,
            lastUpdated: new Date().toISOString(),
          },
        });

        console.log(`[UserProfile] Reset entire profile`);
      }
    },
    [userProfile]
  );

  // Function to generate an itinerary - will be implemented by NewPromt/useProcessUserInput
  const [handleGenerateItinerary, setHandleGenerateItinerary] = useState(
    () => () => {
      console.log(
        "Default handleGenerateItinerary called - not yet initialized"
      );
      // Default implementation will just transition to the generating state
      // The actual implementation will be set by the useProcessUserInput hook
      transitionState(CONVERSATION_STATES.GENERATING_ITINERARY);
    }
  );

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

    // Also reset active trip chat ID
    setActiveTripChatId(null);

    console.log("Started new trip, cleared previous trip details");
  }, [tripDetails, tripDrafts, wasTripCancelled]);

  const switchToTrip = useCallback(
    (tripIndex) => {
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
    },
    [tripDrafts, completedTrips]
  );

  const completeTrip = useCallback(
    (tripData) => {
      // Only add to completed trips if not cancelled
      if (!wasTripCancelled && tripData) {
        // Add to completed trips
        setCompletedTrips((prev) => [...prev, tripData]);

        // Remove from drafts if it's there
        if (tripData.tripDetails && tripData.tripDetails.id) {
          setTripDrafts((prev) =>
            prev.filter((draft) => draft.id !== tripData.tripDetails.id)
          );
        }

        console.log("Trip completed and added to completed trips");
        setConversationState(CONVERSATION_STATES.DISPLAYING_ITINERARY);
      } else {
        console.log("Trip was cancelled, not adding to completed trips");
      }

      // Reset cancellation flag
      setWasTripCancelled(false);
    },
    [wasTripCancelled]
  );

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
  const transitionState = useCallback(
    (newState, contextData) => {
      console.log(`Transition state: ${conversationState} → ${newState}`);

      // Handle specific state transitions
      switch (newState) {
        case CONVERSATION_STATES.IDLE:
          // When transitioning to IDLE from AWAITING_USER_TRIP_CONFIRMATION,
          // it means the user cancelled the trip confirmation
          if (
            conversationState ===
            CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION
          ) {
            console.log(
              "User cancelled trip confirmation, returning to IDLE state"
            );
            // Mark the trip as cancelled
            setWasTripCancelled(true);
          }
          break;

        case CONVERSATION_STATES.TRIP_BUILDING_MODE:
          // בדיקה אם אנחנו כבר במצב של הצגת יומן ויש לנו יומן מלא
          // במקרה כזה אנחנו לא רוצים לחזור למצב בניית יומן
          if (
            (conversationState === CONVERSATION_STATES.DISPLAYING_ITINERARY ||
              conversationState ===
                CONVERSATION_STATES.ITINERARY_ADVICE_MODE) &&
            allTripData !== null
          ) {
            console.log(
              "Already have itinerary, staying in current state instead of TRIP_BUILDING_MODE"
            );
            return; // נשאר במצב הנוכחי ולא עוברים למצב בניית יומן
          }

          // When transitioning back to TRIP_BUILDING_MODE from AWAITING_USER_TRIP_CONFIRMATION,
          // it means the user wants to edit trip details
          if (
            conversationState ===
            CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION
          ) {
            console.log("User chose to edit trip details");
            // No need to clear trip details - we want to keep them for editing
          }

          // Handle map updates when location is detected
          if (contextData && contextData.updateMap && contextData.location) {
            console.log("Updating map with location:", contextData.location);

            // If we have a vacation_location but no explicit location in contextData,
            // use the vacation_location for the map
            const locationToShow =
              contextData.location || tripDetails?.vacation_location;

            if (locationToShow) {
              // Update the active layer to show the map
              setActiveLayer("location");

              // Force a re-render of the map by updating trip details
              if (!tripDetails) {
                setTripDetails({ vacation_location: locationToShow });
              } else if (tripDetails.vacation_location !== locationToShow) {
                setTripDetails({
                  ...tripDetails,
                  vacation_location: locationToShow,
                });
              }
            }
          }
          break;

        case CONVERSATION_STATES.ANALYZING_INPUT:
          // Check if we need to override state transition due to weather query
          if (contextData?.forceFetchExternal) {
            console.log(
              "Force fetching external data due to day-specific weather query bypass"
            );
            setConversationState(CONVERSATION_STATES.FETCHING_EXTERNAL_DATA);
            return; // Skip normal processing
          }

          // בדיקה אם אנחנו במצב הצגת יומן ויש לנו כבר יומן
          // במקרה כזה נעבור למצב הייעוץ המיוחד במקום ניתוח רגיל
          if (
            (conversationState === CONVERSATION_STATES.DISPLAYING_ITINERARY ||
              conversationState ===
                CONVERSATION_STATES.ITINERARY_ADVICE_MODE) &&
            allTripData !== null
          ) {
            console.log(
              "Have active itinerary, transitioning to ITINERARY_ADVICE_MODE instead"
            );

            // בדיקה אם השאלה היא שאלת מידע ספציפית לגבי יום ביומן הטיול
            if (contextData?.userMessage) {
              // וידוא שמשתנה החלון הגלובלי קיים לצורך העברת המידע
              if (!window.__processingState) {
                window.__processingState = {};
              }

              // ניקוי המידע הקודם על יום ספציפי
              if (window.__daySpecificInfo) {
                delete window.__daySpecificInfo;
              }

              import("../../utils/itineraryGenerator").then(
                async ({
                  analyzePostItineraryQuestion,
                  convertItineraryToJSON,
                }) => {
                  try {
                    // וידוא שיש מבנה נתונים מלא ליומן
                    let structuredItinerary = allTripData?.structuredItinerary;

                    // אם אין, ננסה לחלץ מטקסט היומן
                    if (
                      !structuredItinerary &&
                      allTripData?.itinerary &&
                      typeof allTripData.itinerary === "string"
                    ) {
                      try {
                        console.log(
                          "Converting itinerary text to structured data"
                        );
                        structuredItinerary = convertItineraryToJSON(
                          allTripData.itinerary
                        );
                      } catch (e) {
                        console.error(
                          "Failed to convert itinerary to structured data:",
                          e
                        );
                      }
                    }

                    // ניתוח השאלה לזיהוי בקשות מידע ואזכור של יום ספציפי ביומן
                    const questionAnalysis = analyzePostItineraryQuestion(
                      contextData.userMessage,
                      {
                        vacation_location: tripDetails?.vacation_location,
                        structuredItinerary: structuredItinerary,
                        itinerary: allTripData?.itinerary,
                        dates: tripDetails?.dates,
                      }
                    );

                    console.log("Question analysis result:", questionAnalysis);

                    // אם זוהתה שאלת מידע עם התייחסות ליום ספציפי
                    if (questionAnalysis.isAdviceQuestion) {
                      console.log(
                        `Detected advice question for ${questionAnalysis.adviceType}`
                      );

                      if (questionAnalysis.specificDay) {
                        console.log(
                          `Detected specific day query for ${questionAnalysis.adviceType}: ${questionAnalysis.specificDay}`
                        );
                      }

                      // שמירת המידע הרלוונטי למצב גלובלי לשימוש כל השירותים
                      window.__daySpecificInfo = questionAnalysis.locationInfo;
                      window.__processingState.adviceType =
                        questionAnalysis.adviceType;
                      window.__processingState.intent = questionAnalysis.intent;
                      window.__processingState.specificDay =
                        questionAnalysis.specificDay;

                      // העברת המידע לקונטקסט הקיים
                      if (contextData) {
                        contextData.adviceType = questionAnalysis.adviceType;
                        contextData.intent = questionAnalysis.intent;
                        contextData.specificDay = questionAnalysis.specificDay;
                        contextData.daySpecificInfo =
                          questionAnalysis.locationInfo;
                      } else {
                        contextData = {
                          adviceType: questionAnalysis.adviceType,
                          intent: questionAnalysis.intent,
                          specificDay: questionAnalysis.specificDay,
                          daySpecificInfo: questionAnalysis.locationInfo,
                        };
                      }

                      console.log(
                        "Updated context with day-specific info",
                        window.__daySpecificInfo
                      );
                    }
                  } catch (error) {
                    console.error(
                      "Error analyzing post-itinerary question:",
                      error
                    );
                  }
                }
              );
            }

            setConversationState(CONVERSATION_STATES.ITINERARY_ADVICE_MODE);
            return; // מונע את קוד ההמשך ומבצע מעבר מותאם
          }
          break;

        case CONVERSATION_STATES.ITINERARY_ADVICE_MODE:
          console.log(
            "Entering ITINERARY_ADVICE_MODE - handling post-itinerary questions"
          );

          // אם יש מידע על יום ספציפי מהניתוח המוקדם יותר, נעביר אותו בהקשר
          if (window.__daySpecificInfo) {
            console.log(
              "Found specific day info for advice:",
              window.__daySpecificInfo
            );

            // אם לא הועבר contextData, אתחל אותו
            if (!contextData) {
              contextData = {};
            }

            // שדה זה יועבר ל-AdviceHandler לעיבוד בקשות חיצוניות
            contextData.daySpecificInfo = window.__daySpecificInfo;
            contextData.adviceType = window.__processingState?.adviceType;
            contextData.intent = window.__processingState?.intent;
            contextData.specificDay = window.__processingState?.specificDay;
          }

          // מצב חדש שמטפל בשאלות אחרי שכבר יש יומן
          break;

        case CONVERSATION_STATES.FETCHING_EXTERNAL_DATA:
          // Set special flags to ensure we stay in this state for day-specific weather queries
          if (
            contextData?.bypassMissingFields ||
            (contextData?.intent === "Weather-Request" &&
              contextData?.daySpecificInfo)
          ) {
            console.log(
              "Prioritizing external data fetch for day-specific weather query"
            );
            // Force the state machine to fetch external data and ignore missing fields checks
            window.__forceExternalFetch = true;
            if (!contextData) {
              contextData = {};
            }
            contextData.forceFetchExternal = true;
          }

          // כאשר יש בקשת מידע בזמן הצגת יומן, נעבור למצב ייעוץ יומן במקום
          if (
            (conversationState === CONVERSATION_STATES.DISPLAYING_ITINERARY ||
              conversationState ===
                CONVERSATION_STATES.ITINERARY_ADVICE_MODE) &&
            allTripData !== null
          ) {
            console.log("Fetching external data in itinerary context");
            // לא תמיד צריך לשנות את המצב למצב ייעוץ ספציפי, לפעמים משאירים את FETCHING_EXTERNAL_DATA
          }

          // Special handling for external data that's already been fetched
          if (
            (window.__weatherResponseData &&
              (contextData?.intent === "Weather-Request" ||
                window.__forceWeatherResponse)) ||
            (window.__restaurantsResponseData &&
              (contextData?.intent === "Find-Restaurants" ||
                window.__forceRestaurantsResponse)) ||
            (window.__hotelsResponseData &&
              (contextData?.intent === "Find-Hotel" ||
                window.__forceHotelsResponse)) ||
            (window.__attractionsResponseData &&
              (contextData?.intent === "Find-Attractions" ||
                window.__forceAttractionsResponse)) ||
            (window.__externalDataResponse && window.__forceExternalDataDisplay)
          ) {
            console.log(
              "Weather data already fetched but not displayed - forcing display now"
            );
            // Add the weather data directly as a system message
            if (
              window.__processingHookState &&
              window.__processingHookState.addSystemMessage
            ) {
              // Set a flag to prevent missing fields form from showing
              // Initialize contextData if it doesn't exist
              if (!contextData) {
                contextData = {};
              }
              contextData.bypassMissingFields = true;
              contextData.forceFetchExternal = true;
              window.__forceWeatherResponse = true;

              // Determine which data to display
              let dataToDisplay;
              if (
                contextData?.intent === "Weather-Request" &&
                window.__weatherResponseData
              ) {
                dataToDisplay = window.__weatherResponseData;
                window.__weatherResponseDisplayed = true;
              } else if (
                contextData?.intent === "Find-Restaurants" &&
                window.__restaurantsResponseData
              ) {
                dataToDisplay = window.__restaurantsResponseData;
                window.__restaurantsResponseDisplayed = true;
              } else if (window.__externalDataResponse) {
                dataToDisplay = window.__externalDataResponse;
                window.__externalDataDisplayed = true;
              } else if (window.__weatherResponseData) {
                dataToDisplay = window.__weatherResponseData;
                window.__weatherResponseDisplayed = true;
              }

              // Only add to the chat if we actually have data to display
              if (dataToDisplay) {
                window.__processingHookState.addSystemMessage(dataToDisplay);
                console.log(
                  `Added ${
                    contextData?.intent || "external"
                  } data directly to chat`
                );

                // Mark as displayed
                window.__weatherResponseDisplayed = true;

                // Stay in itinerary advice mode
                setConversationState(CONVERSATION_STATES.ITINERARY_ADVICE_MODE);
                return; // Skip the missing fields form entirely
              } else {
                console.log("No data available to display in the chat");
              }
            }
          }

          // When transitioning from AWAITING_MISSING_INFO to FETCHING_EXTERNAL_DATA,
          // it means the user has submitted the missing fields form
          if (conversationState === CONVERSATION_STATES.AWAITING_MISSING_INFO) {
            console.log(
              "User submitted missing fields form, fetching external data"
            );
          }
          break;

        case CONVERSATION_STATES.ADVISORY_MODE:
          // אם היינו במצב הצגת יומן או ייעוץ יומן, נשאר שם
          if (
            (conversationState === CONVERSATION_STATES.DISPLAYING_ITINERARY ||
              conversationState ===
                CONVERSATION_STATES.ITINERARY_ADVICE_MODE) &&
            allTripData !== null
          ) {
            console.log(
              "Already have itinerary, staying in ITINERARY_ADVICE_MODE instead of ADVISORY_MODE"
            );
            setConversationState(CONVERSATION_STATES.ITINERARY_ADVICE_MODE);
            return;
          }
          break;

        case CONVERSATION_STATES.GENERATING_ITINERARY:
          // לא מאפשרים ליצור יומן חדש אם כבר יש יומן פעיל, אלא אם כן זו בקשה מפורשת
          if (
            (conversationState === CONVERSATION_STATES.DISPLAYING_ITINERARY ||
              conversationState ===
                CONVERSATION_STATES.ITINERARY_ADVICE_MODE) &&
            allTripData !== null &&
            (!contextData || !contextData.forceNewItinerary)
          ) {
            console.log(
              "Already have an active itinerary and no explicit request for a new one, staying in current state"
            );
            return; // נשאר במצב הנוכחי
          }

          // Store current chat ID as the active trip chat ID
          setActiveTripChatId(window.location.pathname.split("/").pop());
          // Reset cancellation flag when starting to generate itinerary
          setWasTripCancelled(false);

          // Inform the processing hook that we're generating an itinerary
          // This ensures that any UI components related to trip summary are hidden
          if (window.__processingHookState) {
            // If there's a stale trip summary still showing, force hide it
            if (window.__processingHookState.setShowTripSummary) {
              window.__processingHookState.setShowTripSummary(false);
            }

            // Ensure there's a loading indicator in the chat
            if (
              window.__processingHookState.addLoadingMessage &&
              !window.__itineraryGenerationStarted
            ) {
              window.__itineraryGenerationStarted = true;
              // Add a loading message and ALWAYS store its ID globally
              window.__itineraryLoadingId =
                window.__processingHookState.addLoadingMessage({
                  isGenerating: true,
                  isItineraryGeneration: true,
                  message:
                    "Generating your personalized travel itinerary... This might take a few moments.",
                });

              console.log(
                "Created itinerary loading message with ID:",
                window.__itineraryLoadingId
              );

              // Reset the flag when the generation completes
              setTimeout(() => {
                window.__itineraryGenerationStarted = false;
              }, 30000); // Reset after 30 seconds as a safeguard
            }
          }
          break;

        case CONVERSATION_STATES.DISPLAYING_ITINERARY:
          // When displaying itinerary, if we have complete data, save as completed trip
          if (contextData && !wasTripCancelled) {
            completeTrip(contextData);

            // Clear any loading indicators that might still be displayed
            if (window.__processingHookState) {
              // Reset the itinerary generation flag
              window.__itineraryGenerationStarted = false;

              // Display the itinerary in the chat directly as a model message
              console.log("Showing itinerary in chat");

              // DEBUG: הדפסת המידע המלא למסלול שהתקבל מהמודל
              console.log("========= ITINERARY RAW RESPONSE START =========");
              console.log(contextData.itinerary);
              console.log("========= ITINERARY RAW RESPONSE END =========");

              // Format the itinerary for chat display - הצגת המסלול המלא בשיחה
              // הסרנו את הפורמט המיוחד והכותרת כדי להציג את התשובה המלאה כפי שהתקבלה מהמודל
              const itineraryMessage = contextData.itinerary;

              // המרת מחרוזת היומן לפורמט JSON מובנה
              import("../../utils/itineraryGenerator").then(
                async ({ convertItineraryToJSON, saveItinerary }) => {
                  try {
                    // המרת היומן לפורמט JSON
                    const structuredItinerary = convertItineraryToJSON(
                      contextData.itinerary
                    );
                    console.log(
                      "Successfully converted itinerary to JSON structure:",
                      structuredItinerary
                    );

                    // שמירת היומן המומר במודל הנפרד
                    const chatId = window.location.pathname.split("/").pop();
                    if (chatId) {
                      const saveResult = await saveItinerary(chatId, {
                        itinerary: contextData.itinerary,
                        structuredItinerary,
                        metadata: contextData.metadata || {
                          destination: tripDetails?.vacation_location,
                          duration: tripDetails?.duration,
                          dates: tripDetails?.dates,
                        },
                      });
                      console.log(
                        "Saved itinerary in separate model:",
                        saveResult
                      );

                      // אם קיים מזהה של היומן החדש, שומרים אותו בפרטי הטיול
                      if (saveResult.itineraryId) {
                        setallTripData((prevData) => ({
                          ...prevData,
                          itineraryId: saveResult.itineraryId,
                        }));
                      }

                      // שמירת היומן גם בהיסטוריית השיחה
                      try {
                        const headers = {};
                        // השג טוקן אותנטיקציה אם זמין
                        if (window.Clerk?.session) {
                          const token = await window.Clerk.session.getToken();
                          headers["Authorization"] = `Bearer ${token}`;
                        }

                        // הוסף את היומן כהודעת מודל בהיסטוריית השיחה
                        const saveToHistoryResponse = await fetch(
                          `${import.meta.env.VITE_API_URL}/api/chats/${chatId}`,
                          {
                            method: "PUT",
                            credentials: "include",
                            headers: {
                              "Content-Type": "application/json",
                              ...headers,
                            },
                            body: JSON.stringify({
                              answer: contextData.itinerary,
                              // לא מוסיפים את הודעת המשתמש כי היא כבר קיימת
                            }),
                          }
                        );

                        if (saveToHistoryResponse.ok) {
                          console.log(
                            "Successfully added itinerary to chat history"
                          );
                        } else {
                          console.error(
                            "Failed to add itinerary to chat history:",
                            await saveToHistoryResponse.text()
                          );
                        }
                      } catch (historyError) {
                        console.error(
                          "Error saving itinerary to chat history:",
                          historyError
                        );
                      }
                    } else {
                      console.warn(
                        "Could not determine chat ID for saving structured itinerary"
                      );
                    }
                  } catch (error) {
                    console.error(
                      "Error processing itinerary to JSON format:",
                      error
                    );
                  }
                }
              );

              // IMPORTANT: Always display the itinerary message even if we don't have a loading ID
              // Try to replace the loading message first if we have an ID
              if (
                window.__processingHookState.replaceLoadingMessage &&
                window.__itineraryLoadingId
              ) {
                // Use the stored loading ID if available
                console.log(
                  "Replacing loading message with itinerary using ID:",
                  window.__itineraryLoadingId
                );
                window.__processingHookState.replaceLoadingMessage(
                  window.__itineraryLoadingId,
                  {
                    role: "model",
                    message: itineraryMessage,
                    id: `itinerary-${Date.now()}`,
                    isItinerary: true,
                  }
                );

                // Clear the loading ID
                window.__itineraryLoadingId = null;
              }
              // If no replaceLoadingMessage or no stored ID, try to find a loading message to replace
              else if (window.__processingHookState.replaceLoadingMessage) {
                // Get the pending messages from the hook state
                const pendingMessages =
                  window.__processingHookState.pendingMessages || [];

                // Look for any loading messages to replace
                const loadingMessages = pendingMessages.filter(
                  (msg) =>
                    msg.isLoadingMessage ||
                    msg.isGenerating ||
                    msg.isItineraryGeneration
                );

                if (loadingMessages.length > 0) {
                  const loadingId = loadingMessages[0].id;
                  console.log("Found loading message to replace:", loadingId);
                  window.__processingHookState.replaceLoadingMessage(
                    loadingId,
                    {
                      role: "model",
                      message: itineraryMessage,
                      id: `itinerary-${Date.now()}`,
                      isItinerary: true,
                    }
                  );
                } else {
                  // No loading message found, add a new message instead
                  console.log(
                    "No loading message found, adding new system message with itinerary"
                  );
                  if (window.__processingHookState.addSystemMessage) {
                    window.__processingHookState.addSystemMessage(
                      itineraryMessage
                    );
                  }
                }
              }
              // Last resort - add a new system message
              else if (window.__processingHookState.addSystemMessage) {
                console.log("Adding itinerary as new system message");
                window.__processingHookState.addSystemMessage(itineraryMessage);
              }

              // IMPORTANT - תמיד להוסיף את המסלול כהודעה חדשה בשיחה
              // אפילו אם כבר הוחלפה הודעת הטעינה, ככה נוודא שהמסלול תמיד מוצג
              setTimeout(() => {
                // בדיקה שעדיין יש לנו גישה למצב השיחה
                if (
                  window.__processingHookState &&
                  window.__processingHookState.addSystemMessage
                ) {
                  console.log(
                    "Adding itinerary as additional message for guaranteed visibility"
                  );
                  window.__processingHookState.addSystemMessage(
                    itineraryMessage
                  );
                }

                // IMPORTANT: Clear all loading messages after displaying the itinerary
                if (window.__processingHookState.clearLoadingMessages) {
                  console.log("Clearing any remaining loading messages");
                  window.__processingHookState.clearLoadingMessages();
                }
              }, 500);
            }
          }
          break;

        case CONVERSATION_STATES.AWAITING_MISSING_INFO:
          // For weather data, check if we already have the data and should show it
          if (
            window.__weatherResponseData &&
            (contextData?.intent === "Weather-Request" ||
              window.__captureExternalDataResponse ||
              window.__forceWeatherResponse)
          ) {
            console.log(
              "Found weather data that should be displayed instead of missing fields form"
            );
            // Add weather data directly as a system message
            if (
              window.__processingHookState &&
              window.__processingHookState.addSystemMessage
            ) {
              // Force the response to be used
              window.__forceWeatherResponse = true;

              // Add to chat - determine which data to display
              let dataToDisplay;
              if (
                contextData?.intent === "Weather-Request" &&
                window.__weatherResponseData
              ) {
                dataToDisplay = window.__weatherResponseData;
                window.__weatherResponseDisplayed = true;
              } else if (
                contextData?.intent === "Find-Restaurants" &&
                window.__restaurantsResponseData
              ) {
                dataToDisplay = window.__restaurantsResponseData;
                window.__restaurantsResponseDisplayed = true;
              } else if (window.__externalDataResponse) {
                dataToDisplay = window.__externalDataResponse;
                window.__externalDataDisplayed = true;
              } else if (window.__weatherResponseData) {
                dataToDisplay = window.__weatherResponseData;
                window.__weatherResponseDisplayed = true;
              }

              // Only add to the chat if we actually have data to display
              if (dataToDisplay) {
                window.__processingHookState.addSystemMessage(dataToDisplay);
                console.log(
                  `Added ${
                    contextData?.intent || "external"
                  } data directly to chat`
                );

                // Mark as displayed
                window.__weatherResponseDisplayed = true;

                // Stay in itinerary advice mode
                setConversationState(CONVERSATION_STATES.ITINERARY_ADVICE_MODE);
                return; // Skip the missing fields form entirely
              } else {
                console.log("No data available to display in the chat");
              }
            }
          }

          // Check for day-specific info for weather in an itinerary context
          if (
            contextData?.intent === "Weather-Request" &&
            contextData?.daySpecificInfo &&
            allTripData?.structuredItinerary
          ) {
            console.log(
              "Found day-specific weather request in itinerary context"
            );
            if (!contextData) {
              contextData = {};
            }
            contextData.bypassMissingFields = true;
            setConversationState(CONVERSATION_STATES.FETCHING_EXTERNAL_DATA);
            return; // Skip the missing fields form and directly fetch data
          }

          // Check for bypass flag from day-specific weather queries
          if (
            contextData?.bypassMissingFields ||
            contextData?.forceFetchExternal
          ) {
            console.log(
              "Bypassing missing fields state due to complete day-specific weather query"
            );
            setConversationState(CONVERSATION_STATES.FETCHING_EXTERNAL_DATA);
            return; // Skip transition to missing fields state
          }

          // When transitioning to AWAITING_MISSING_INFO, we're waiting for the user to fill in missing fields
          console.log(
            "Transitioning to AWAITING_MISSING_INFO state - waiting for user to provide missing information"
          );
          // No special handling needed here - the MissingFieldsForm component will handle the UI
          break;

        // Add other state transitions as needed
      }

      // Update the state
      setConversationState(newState);
    },
    [
      conversationState,
      completeTrip,
      wasTripCancelled,
      setActiveLayer,
      setTripDetails,
      tripDetails,
      allTripData,
    ]
  );

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

  // Monitor trip details changes and auto-transition to confirmation when complete
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
