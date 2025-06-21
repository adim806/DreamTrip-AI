import React, { useState, useEffect } from "react";
import {
  DragDropContext,
  Draggable,
} from "@/components/ui/StrictModeDndWrapper";
import { motion } from "framer-motion";
import activitiesService from "@/utils/services/activitiesService";
import tripPlanService from "@/utils/services/tripPlanService";
import {
  RiRefreshLine,
  RiCalendarLine,
  RiInformationLine,
  RiDeleteBin6Line,
  RiMapPin2Line,
  RiFilterLine,
  RiHotelLine,
  RiRestaurantLine,
  RiTrophyLine,
  RiAddCircleLine,
  RiMagicLine,
  RiLoader4Line,
} from "react-icons/ri";
import { StrictModeDroppable as Droppable } from "@/components/ui/StrictModeDndWrapper";
import TripPlannerResult from "./TripPlannerResult";
import "./TripPlanner.css";
import { MAP_EVENTS } from "@/utils/map/MapEventService";

const TripPlanner = ({ trip }) => {
  const [activities, setActivities] = useState([]);
  const [itinerary, setItinerary] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numDays, setNumDays] = useState(5); // Default number of days
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeDraggedItem, setActiveDraggedItem] = useState(null);
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [selectedActivityForQuickAdd, setSelectedActivityForQuickAdd] =
    useState(null);

  // New state variables for generating trip plan
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [showPlanResult, setShowPlanResult] = useState(false);
  const [planError, setPlanError] = useState(null);

  // Get chatId and userId
  const [userId, setUserId] = useState(null);
  const [chatId, setChatId] = useState(null);

  // Set up days structure
  useEffect(() => {
    if (trip?.duration) {
      const days = parseInt(trip.duration, 10);
      if (!isNaN(days)) {
        setNumDays(days);
      }
    }
  }, [trip]);

  // Get userId and chatId from multiple sources
  useEffect(() => {
    // Try to get chatId from URL if available
    const pathParts = window.location.pathname.split("/");
    const possibleChatId = pathParts[pathParts.length - 1];
    const chatIdFromUrl = possibleChatId.length > 20 ? possibleChatId : null;

    // Get userId from localStorage or Clerk auth if available
    const userIdFromStorage =
      localStorage.getItem("userId") || sessionStorage.getItem("userId");

    // Set the values, prioritizing trip props if available
    const newUserId = trip?.userId || userIdFromStorage;
    const newChatId =
      trip?.chatId || chatIdFromUrl || localStorage.getItem("chatId");

    setUserId(newUserId);
    setChatId(newChatId);

    console.log(
      `Trip Planner: Using chatId: ${newChatId}, userId: ${newUserId}`
    );
  }, [trip]);

  // Initialize or update itinerary when numDays changes
  useEffect(() => {
    // Make sure we have a chatId before attempting to update itinerary
    if (!chatId) return;

    // Initialize or update itinerary preserving existing day contents
    setItinerary((prevItinerary) => {
      const newItinerary = { ...prevItinerary };

      // Make sure we have entries for all days
      for (let i = 1; i <= numDays; i++) {
        const dayKey = `day${i}`;
        // Keep existing day data if available, otherwise create empty
        if (!newItinerary[dayKey]) {
          newItinerary[dayKey] = {
            morning: [],
            afternoon: [],
            evening: [],
          };
        }
      }

      // Remove any days that exceed the new numDays
      Object.keys(newItinerary).forEach((dayKey) => {
        const dayNum = parseInt(dayKey.replace("day", ""), 10);
        if (dayNum > numDays) {
          delete newItinerary[dayKey];
        }
      });

      return newItinerary;
    });
  }, [numDays, chatId]);

  // Fetch saved activities
  const fetchActivities = async () => {
    if (!chatId) {
      setIsLoading(false);
      setError("No chat ID available. Please go back to the chat.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await activitiesService.getActivities(chatId);
      setActivities(data);
    } catch (err) {
      console.error("Error fetching saved activities:", err);
      setError("Failed to load saved activities");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load of activities when chatId changes
  useEffect(() => {
    if (chatId) {
      console.log("Fetching activities for chat:", chatId);
      fetchActivities();

      // Also load saved itinerary specific to this chat
      loadSavedItinerary();
      
      // Check if we have a stored plan for this chat
      const storedPlan = tripPlanService.getStoredPlan(chatId);
      if (storedPlan && storedPlan.plan) {
        setGeneratedPlan(storedPlan.plan);
      }
    }
  }, [chatId]);

  // Filter activities based on activeFilter
  const filteredActivities = activities.filter((activity) => {
    if (activeFilter === "all") return true;
    return activity.type === activeFilter;
  });

  // Handle drag start
  const onDragStart = (start) => {
    // Find the activity being dragged
    if (start.source.droppableId === "savedItems") {
      const draggedActivity = activities[start.source.index];
      setActiveDraggedItem(draggedActivity);
      
      // Add dragging class to the dragged item
      const draggedElement = document.querySelector(`[data-rbd-draggable-id="${start.draggableId}"]`);
      if (draggedElement) {
        draggedElement.classList.add('dragging');
      }
    } else {
      // If dragging from itinerary
      const [day, timeOfDay] = start.source.droppableId.split("-");
      if (itinerary[day] && itinerary[day][timeOfDay]) {
        const draggedItem = itinerary[day][timeOfDay][start.source.index];
        setActiveDraggedItem(draggedItem);
        
        // Add dragging class to the dragged item
        const draggedElement = document.querySelector(`[data-rbd-draggable-id="${start.draggableId}"]`);
        if (draggedElement) {
          draggedElement.classList.add('dragging');
        }
      }
    }
  };

  // Handle drag end
  const onDragEnd = (result) => {
    setActiveDraggedItem(null);
    const { source, destination } = result;
    
    // Remove dragging class from all draggable items
    const draggedElements = document.querySelectorAll('.dragging');
    draggedElements.forEach(element => {
      element.classList.remove('dragging');
    });

    // Dropped outside the list
    if (!destination) return;

    // Handle moving from saved items to itinerary
    if (source.droppableId === "savedItems") {
      const activity = activities[source.index];

      // Clone current itinerary
      const updatedItinerary = JSON.parse(JSON.stringify(itinerary));

      // Add to the destination
      const [day, timeOfDay] = destination.droppableId.split("-");
      if (!updatedItinerary[day][timeOfDay]) {
        updatedItinerary[day][timeOfDay] = [];
      }
      updatedItinerary[day][timeOfDay].push({
        ...activity.activityData,
        activityId: activity._id,
        type: activity.type, // Make sure we include the type
      });

      setItinerary(updatedItinerary);

      // Save to local storage to prevent data loss, with chat-specific key
      saveItineraryToStorage(updatedItinerary);
      return;
    }

    // Handle moving within itinerary
    if (source.droppableId !== destination.droppableId) {
      // Moving between different days or times
      const [sourceDay, sourceTimeOfDay] = source.droppableId.split("-");
      const [destDay, destTimeOfDay] = destination.droppableId.split("-");

      // Clone current itinerary
      const updatedItinerary = JSON.parse(JSON.stringify(itinerary));

      // Get the item being moved
      const [movedItem] = updatedItinerary[sourceDay][sourceTimeOfDay].splice(
        source.index,
        1
      );

      // Add to destination
      if (!updatedItinerary[destDay][destTimeOfDay]) {
        updatedItinerary[destDay][destTimeOfDay] = [];
      }
      updatedItinerary[destDay][destTimeOfDay].splice(
        destination.index,
        0,
        movedItem
      );

      setItinerary(updatedItinerary);
      saveItineraryToStorage(updatedItinerary);
    } else {
      // Moving within the same day and time
      const [day, timeOfDay] = source.droppableId.split("-");

      // Clone current itinerary
      const updatedItinerary = JSON.parse(JSON.stringify(itinerary));

      // Reorder the items
      const items = updatedItinerary[day][timeOfDay];
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);

      setItinerary(updatedItinerary);
      saveItineraryToStorage(updatedItinerary);
    }
  };

  // Quick add mode functions
  const startQuickAdd = (activity) => {
    setSelectedActivityForQuickAdd(activity);
    setQuickAddMode(true);
  };

  const endQuickAdd = () => {
    setSelectedActivityForQuickAdd(null);
    setQuickAddMode(false);
  };

  const quickAddToDay = (day, timeOfDay) => {
    if (!selectedActivityForQuickAdd) return;

    // Clone current itinerary
    const updatedItinerary = JSON.parse(JSON.stringify(itinerary));

    // Add to the destination
    if (!updatedItinerary[day][timeOfDay]) {
      updatedItinerary[day][timeOfDay] = [];
    }

    updatedItinerary[day][timeOfDay].push({
      ...selectedActivityForQuickAdd.activityData,
      activityId: selectedActivityForQuickAdd._id,
      type: selectedActivityForQuickAdd.type,
    });

    setItinerary(updatedItinerary);
    saveItineraryToStorage(updatedItinerary);

    // End quick add mode
    endQuickAdd();
  };

  // Helper for saving itinerary with chat-specific key
  const saveItineraryToStorage = (itineraryData) => {
    if (!chatId) return;

    const storageKey = `tripPlanner_itinerary_${chatId}`;
    localStorage.setItem(storageKey, JSON.stringify(itineraryData));
    console.log(`Saved itinerary to localStorage with key: ${storageKey}`);
  };

  // Helper for loading itinerary with chat-specific key
  const loadSavedItinerary = () => {
    if (!chatId) return;

    const storageKey = `tripPlanner_itinerary_${chatId}`;
    const savedItinerary = localStorage.getItem(storageKey);

    if (savedItinerary) {
      try {
        const parsedItinerary = JSON.parse(savedItinerary);
        // Only set if we have data and it's not empty
        if (parsedItinerary && Object.keys(parsedItinerary).length > 0) {
          console.log(
            `Loaded itinerary from localStorage with key: ${storageKey}`
          );
          setItinerary(parsedItinerary);
        }
      } catch (err) {
        console.error("Error loading saved itinerary", err);
      }
    } else {
      console.log(`No saved itinerary found for chat: ${chatId}`);
      // Initialize empty itinerary for this chat
      const emptyItinerary = {};
      for (let i = 1; i <= numDays; i++) {
        const dayKey = `day${i}`;
        emptyItinerary[dayKey] = {
          morning: [],
          afternoon: [],
          evening: [],
        };
      }
      setItinerary(emptyItinerary);
    }
  };

  // Remove item from itinerary
  const removeFromItinerary = (day, timeOfDay, index) => {
    const updatedItinerary = JSON.parse(JSON.stringify(itinerary));
    updatedItinerary[day][timeOfDay].splice(index, 1);
    setItinerary(updatedItinerary);
    saveItineraryToStorage(updatedItinerary);
  };

  // Handle refreshing the activities list
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchActivities();
  };

  // Show day activities on map
  const showDayOnMap = (day, dayNumber) => {
    if (!itinerary[day]) return;
    
    console.log(`Showing Day ${dayNumber} activities on map`);

    const dayActivities = {
      hotels: [],
      restaurants: [],
      attractions: [],
    };

    // Array to hold all activities in proper sequence for creating a route
    const routeLocations = [];

    // Collect all activities for this day in order of time slots
    const timeSlots = ["morning", "afternoon", "evening"];
    
    timeSlots.forEach((timeOfDay) => {
      const activitiesInTimeSlot = itinerary[day][timeOfDay] || [];

      activitiesInTimeSlot.forEach((activity) => {
        // Create a clean activity object with all necessary data
        const cleanActivity = {
          name: activity.name,
          address: activity.address,
          type: activity.type || "attraction",
          timeOfDay: timeOfDay,
          // Include any coordinates if already available
          ...(activity.lat && activity.lng ? { lat: activity.lat, lng: activity.lng } : {})
        };
        
        // Add to the appropriate category for markers
        if (activity.type === "hotel") {
          dayActivities.hotels.push(cleanActivity);
        } else if (activity.type === "restaurant") {
          dayActivities.restaurants.push(cleanActivity);
        } else {
          dayActivities.attractions.push(cleanActivity);
        }
        
        // Add to route locations array for creating the route path
        if (activity.address || activity.name) {
          routeLocations.push(cleanActivity);
        }
      });
    });

    // Dispatch event to show markers on map
    window.dispatchEvent(
      new CustomEvent(MAP_EVENTS.DISPLAY_ITINERARY_LOCATIONS, {
        detail: {
          data: dayActivities,
          destination: trip?.vacation_location || "",
          dayNumber: dayNumber,
        },
      })
    );
    
    // If we have locations for a route, get their coordinates and display the route
    if (routeLocations.length >= 2) {
      console.log(`Creating route for Day ${dayNumber} with ${routeLocations.length} locations`);
      
      // We need to get coordinates for each location before creating the route
      const getCoordinatesForRoute = async () => {
        try {
          // Import the getCoordinates function
          const { getCoordinates } = await import("@/utils/map/ExternalDataAdapter");
          
          // Show loading indicator
          const loadingToast = document.createElement('div');
          loadingToast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center';
          loadingToast.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Creating route for Day ${dayNumber}...</span>
          `;
          document.body.appendChild(loadingToast);
          
          // Get coordinates for each location with better error handling
          const locationsWithCoords = await Promise.all(
            routeLocations.map(async (location, index) => {
              try {
                // Skip geocoding if we already have coordinates
                if (typeof location.lat === 'number' && typeof location.lng === 'number') {
                  console.log(`Location ${index + 1} (${location.name}) already has coordinates: [${location.lng}, ${location.lat}]`);
                  return location;
                }
                
                // Try to get coordinates using address first, then fall back to name
                const searchTerm = location.address || location.name;
                if (!searchTerm) {
                  console.warn(`Location ${index + 1} has no address or name to geocode`);
                  return null;
                }
                
                // Add destination context to improve geocoding accuracy
                const searchWithContext = trip?.vacation_location 
                  ? `${searchTerm}, ${trip.vacation_location}` 
                  : searchTerm;
                
                console.log(`Geocoding location ${index + 1}: "${searchWithContext}"`);
                const coords = await getCoordinates(searchWithContext);
                
                if (coords) {
                  console.log(`✓ Found coordinates for "${location.name}": [${coords.lng}, ${coords.lat}]`);
                  return { ...location, ...coords };
                } else {
                  console.warn(`✗ Failed to get coordinates for "${location.name}"`);
                  return null;
                }
              } catch (error) {
                console.error(`Error geocoding location ${index + 1} (${location.name}):`, error);
                return null;
              }
            })
          );
          
          // Remove loading indicator
          document.body.removeChild(loadingToast);
          
          // Filter out locations without coordinates
          const validLocations = locationsWithCoords.filter(loc => loc !== null);
          
          if (validLocations.length >= 2) {
            // Import the route display function
            const { displayRouteOnMap } = await import("@/utils/map/MapEventService");
            
            // Display the route with enhanced options
            displayRouteOnMap(validLocations, {
              lineColor: "#4f46e5", // Indigo color for the route
              lineWidth: 4,
              lineOpacity: 0.7,
              fitBounds: true,
              routeType: "walking", // walking, driving, cycling
              addWaypoints: true,
              showDirectionArrows: true,
              pathStyle: "curved",
              animate: true
            });
            
            // Show success message
            const successToast = document.createElement('div');
            successToast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center';
            successToast.innerHTML = `
              <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Route created for Day ${dayNumber} with ${validLocations.length} locations</span>
            `;
            document.body.appendChild(successToast);
            
            // Remove success message after 3 seconds
            setTimeout(() => {
              document.body.removeChild(successToast);
            }, 3000);
            
            console.log(`Created route with ${validLocations.length} locations for Day ${dayNumber}`);
          } else {
            console.warn(`Not enough valid coordinates to create a route for Day ${dayNumber}. Found ${validLocations.length} valid locations out of ${routeLocations.length}`);
            
            // Show error message
            const errorToast = document.createElement('div');
            errorToast.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center';
            errorToast.innerHTML = `
              <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Could not create route: Not enough locations with valid addresses</span>
            `;
            document.body.appendChild(errorToast);
            
            // Remove error message after 3 seconds
            setTimeout(() => {
              document.body.removeChild(errorToast);
            }, 3000);
          }
        } catch (error) {
          console.error("Error creating route:", error);
          
          // Show error message
          const errorToast = document.createElement('div');
          errorToast.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center';
          errorToast.innerHTML = `
            <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Error creating route: ${error.message || 'Unknown error'}</span>
          `;
          document.body.appendChild(errorToast);
          
          // Remove error message after 3 seconds
          setTimeout(() => {
            document.body.removeChild(errorToast);
          }, 3000);
        }
      };
      
      // Execute the async function to get coordinates and create the route
      getCoordinatesForRoute();
    }
  };

  // Generate personalized trip plan
  const handleGeneratePlan = async () => {
    // Check if we have any activities in the itinerary
    const hasActivities = Object.values(itinerary).some(day => 
      day.morning?.length > 0 || day.afternoon?.length > 0 || day.evening?.length > 0
    );
    
    if (!hasActivities) {
      setPlanError("Please add activities to your itinerary before generating a plan.");
      return;
    }
    
    setIsGeneratingPlan(true);
    setPlanError(null);
    
    try {
      console.log("TripPlanner: Starting trip plan generation process...");
      const tripDetails = {
        destination: trip?.vacation_location || "Unknown destination",
        duration: `${numDays} days`,
        chatId: chatId
      };
      
      console.log("TripPlanner: Sending request to generate plan with details:", tripDetails);
      console.log(`TripPlanner: Itinerary contains data for ${Object.keys(itinerary).length} days`);
      
      const result = await tripPlanService.generateCustomPlan(itinerary, tripDetails);
      
      console.log("TripPlanner: Received result from plan generation:", result.success ? "SUCCESS" : "FAILED");
      
      if (result.success) {
        setGeneratedPlan(result.data);
        
        // Instead of showing the result in this component, dispatch an event
        // to notify parent components that a plan has been generated
        console.log("TripPlanner: Dispatching tripPlanGenerated event");
        const planGeneratedEvent = new CustomEvent('tripPlanGenerated', {
          detail: {
            plan: result.data,
            tripDetails: {
              destination: trip?.vacation_location || "Unknown destination",
              duration: `${numDays} days`,
              chatId: chatId
            },
            itineraryData: itinerary // Pass the itinerary data to be used for route creation
          }
        });
        
        document.dispatchEvent(planGeneratedEvent);
      } else {
        console.error("TripPlanner: Error generating plan:", result.error);
        setPlanError(result.error || "Failed to generate trip plan. Please try again.");
      }
    } catch (error) {
      console.error("TripPlanner: Exception during plan generation:", error);
      setPlanError("An unexpected error occurred while generating your trip plan.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };
  
  // Render saved activities list
  const renderSavedItems = () => {
    if (isLoading) {
      return <div className="text-center py-6">Loading saved items...</div>;
    }

    if (error) {
      return (
        <div className="text-center py-6">
          <p className="text-red-400 mb-3">{error}</p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md text-white text-sm flex items-center mx-auto"
          >
            <RiRefreshLine className="mr-2" />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      );
    }

    if (filteredActivities.length === 0) {
      return (
        <div className="text-center py-6 text-gray-400">
          <p className="mb-3">
            {activities.length === 0
              ? "No saved items yet. Add some by clicking the heart icon in the search results."
              : "No activities match the current filter."}
          </p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md text-white text-sm flex items-center mx-auto"
          >
            <RiRefreshLine className="mr-2" />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      );
    }

    return (
      <Droppable droppableId="savedItems">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`saved-items-grid p-2 ${
              snapshot.isDraggingOver
                ? "droppable-area is-dragging-over"
                : "droppable-area"
            }`}
          >
            {filteredActivities.map((activity, index) => (
              <Draggable
                key={activity._id}
                draggableId={activity._id}
                index={index}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`bg-white/10 rounded-lg overflow-hidden shadow-md activity-card ${
                      snapshot.isDragging ? "opacity-70" : "opacity-100"
                    } ${
                      quickAddMode &&
                      selectedActivityForQuickAdd?._id === activity._id
                        ? "selected-for-quick-add"
                        : ""
                    } transition-all duration-200`}
                  >
                    <div className="h-24 overflow-hidden relative">
                      <img
                        src={
                          activity.activityData.thumbnail ||
                          "https://via.placeholder.com/300"
                        }
                        alt={activity.activityData.name}
                        className="w-full h-full object-cover"
                      />
                      <div
                        className={`absolute top-0 right-0 p-1 rounded-bl-lg 
                        ${
                          activity.type === "hotel"
                            ? "activity-type-hotel"
                            : activity.type === "restaurant"
                            ? "activity-type-restaurant"
                            : "activity-type-attraction"
                        }`}
                      >
                        {activity.type === "hotel"
                          ? "🏨"
                          : activity.type === "restaurant"
                          ? "🍽️"
                          : "🎡"}
                      </div>

                      {/* Quick add button */}
                      <button
                        className="quick-add-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startQuickAdd(activity);
                        }}
                      >
                        <RiAddCircleLine size={18} />
                      </button>
                    </div>
                    <div className="p-2">
                      <h3 className="font-bold text-sm text-blue-100">
                        {activity.activityData.name}
                      </h3>
                      <p className="text-xs text-gray-300">
                        {activity.activityData.address}
                      </p>
                      {activity.activityData.rating && (
                        <span className="text-xs text-yellow-300 mt-1 block">
                          {activity.activityData.rating} ⭐
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  // Render a single day's itinerary
  const renderDayItinerary = (day, dayNumber) => (
    <div
      className={`day-container bg-gray-800/60 rounded-lg p-3 ${
        quickAddMode ? "quick-add-active" : ""
      }`}
      onClick={() => (quickAddMode ? null : null)} // Prevent closing when clicking the day container
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-blue-200 flex items-center day-header">
          <RiCalendarLine className="mr-2" />
          Day {dayNumber}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => showDayOnMap(day, dayNumber)}
            className="px-3 py-1.5 bg-blue-600/70 hover:bg-blue-600/90 text-white rounded-md text-xs flex items-center view-on-map-btn"
            title="View day activities on map"
          >
            <RiMapPin2Line className="mr-1" />
            View on Map
          </button>
        </div>
      </div>

      {/* Quick add overlay - appears when quick add mode is active */}
      {quickAddMode && (
        <div className="quick-add-overlay">
          <div className="quick-add-time-slots">
            <button
              className="quick-add-slot morning"
              onClick={() => quickAddToDay(day, "morning")}
            >
              Add to Morning
            </button>
            <button
              className="quick-add-slot afternoon"
              onClick={() => quickAddToDay(day, "afternoon")}
            >
              Add to Afternoon
            </button>
            <button
              className="quick-add-slot evening"
              onClick={() => quickAddToDay(day, "evening")}
            >
              Add to Evening
            </button>
          </div>
        </div>
      )}

      {/* Morning */}
      <div className="mb-4 time-section time-morning">
        <h4 className="text-sm font-medium text-yellow-200 mb-2 time-header">
          <span className="time-icon">☀️</span> Morning
        </h4>
        <Droppable droppableId={`${day}-morning`}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[100px] p-2 rounded-md ${
                snapshot.isDraggingOver
                  ? "droppable-area is-dragging-over"
                  : "droppable-area"
              } ${activeDraggedItem ? "active-drag-target" : ""}`}
            >
              {itinerary[day]?.morning?.map((item, index) => (
                <Draggable
                  key={`${item.id || item.name}-${index}`}
                  draggableId={`${day}-morning-${index}`}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`bg-white/10 rounded-lg p-2 mb-2 flex items-center justify-between activity-card ${
                        snapshot.isDragging ? "opacity-70" : "opacity-100"
                      }`}
                    >
                      <div className="flex items-center flex-1">
                        <div
                          className={`activity-type-indicator ${
                            item.type === "hotel"
                              ? "activity-type-hotel"
                              : item.type === "restaurant"
                              ? "activity-type-restaurant"
                              : "activity-type-attraction"
                          }`}
                        >
                          {item.type === "hotel"
                            ? "🏨"
                            : item.type === "restaurant"
                            ? "🍽️"
                            : "🎡"}
                        </div>
                        <div className="activity-details">
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-gray-300">
                            {item.address}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          removeFromItinerary(day, "morning", index)
                        }
                        className="text-red-400 hover:text-red-300 p-1 delete-button ml-2"
                      >
                        <RiDeleteBin6Line />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {(!itinerary[day]?.morning ||
                itinerary[day]?.morning.length === 0) && (
                <div className="text-center text-gray-400 text-sm py-3 empty-state">
                  <span className="drop-indicator">Drag activities here</span>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </div>

      {/* Afternoon */}
      <div className="mb-4 time-section time-afternoon">
        <h4 className="text-sm font-medium text-blue-200 mb-2 time-header">
          <span className="time-icon">🌞</span> Afternoon
        </h4>
        <Droppable droppableId={`${day}-afternoon`}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[100px] p-2 rounded-md ${
                snapshot.isDraggingOver
                  ? "droppable-area is-dragging-over"
                  : "droppable-area"
              } ${activeDraggedItem ? "active-drag-target" : ""}`}
            >
              {itinerary[day]?.afternoon?.map((item, index) => (
                <Draggable
                  key={`${item.id || item.name}-${index}`}
                  draggableId={`${day}-afternoon-${index}`}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`bg-white/10 rounded-lg p-2 mb-2 flex items-center justify-between activity-card ${
                        snapshot.isDragging ? "opacity-70" : "opacity-100"
                      }`}
                    >
                      <div className="flex items-center flex-1">
                        <div
                          className={`activity-type-indicator ${
                            item.type === "hotel"
                              ? "activity-type-hotel"
                              : item.type === "restaurant"
                              ? "activity-type-restaurant"
                              : "activity-type-attraction"
                          }`}
                        >
                          {item.type === "hotel"
                            ? "🏨"
                            : item.type === "restaurant"
                            ? "🍽️"
                            : "🎡"}
                        </div>
                        <div className="activity-details">
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-gray-300">
                            {item.address}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          removeFromItinerary(day, "afternoon", index)
                        }
                        className="text-red-400 hover:text-red-300 p-1 delete-button ml-2"
                      >
                        <RiDeleteBin6Line />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {(!itinerary[day]?.afternoon ||
                itinerary[day]?.afternoon.length === 0) && (
                <div className="text-center text-gray-400 text-sm py-3 empty-state">
                  <span className="drop-indicator">Drag activities here</span>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </div>

      {/* Evening */}
      <div className="time-section time-evening">
        <h4 className="text-sm font-medium text-purple-200 mb-2 time-header">
          <span className="time-icon">🌙</span> Evening
        </h4>
        <Droppable droppableId={`${day}-evening`}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[100px] p-2 rounded-md ${
                snapshot.isDraggingOver
                  ? "droppable-area is-dragging-over"
                  : "droppable-area"
              } ${activeDraggedItem ? "active-drag-target" : ""}`}
            >
              {itinerary[day]?.evening?.map((item, index) => (
                <Draggable
                  key={`${item.id || item.name}-${index}`}
                  draggableId={`${day}-evening-${index}`}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`bg-white/10 rounded-lg p-2 mb-2 flex items-center justify-between activity-card ${
                        snapshot.isDragging ? "opacity-70" : "opacity-100"
                      }`}
                    >
                      <div className="flex items-center flex-1">
                        <div
                          className={`activity-type-indicator ${
                            item.type === "hotel"
                              ? "activity-type-hotel"
                              : item.type === "restaurant"
                              ? "activity-type-restaurant"
                              : "activity-type-attraction"
                          }`}
                        >
                          {item.type === "hotel"
                            ? "🏨"
                            : item.type === "restaurant"
                            ? "🍽️"
                            : "🎡"}
                        </div>
                        <div className="activity-details">
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-gray-300">
                            {item.address}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          removeFromItinerary(day, "evening", index)
                        }
                        className="text-red-400 hover:text-red-300 p-1 delete-button ml-2"
                      >
                        <RiDeleteBin6Line />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {(!itinerary[day]?.evening ||
                itinerary[day]?.evening.length === 0) && (
                <div className="text-center text-gray-400 text-sm py-3 empty-state">
                  <span className="drop-indicator">Drag activities here</span>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div
        className={`trip-planner-container ${
          quickAddMode ? "quick-add-mode" : ""
        }`}
      >
        {/* Title and Instructions */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-center text-blue-200 mb-2">
            Trip Planner
          </h2>
          <div className="bg-blue-900/30 p-3 rounded-lg flex items-start">
            <RiInformationLine className="text-blue-300 text-lg mt-1 mr-2 flex-shrink-0" />
            <p className="text-sm text-blue-200">
              Drag items from your saved collection below and drop them into
              your daily itinerary to plan your perfect trip. You can rearrange
              activities within each day or move them between different days.
              Click the + icon on any activity for quick add options.
            </p>
          </div>
        </div>

        {/* Saved Items Section with Filter Tabs */}
        <div className="bg-gray-900/50 rounded-lg mb-6">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h3 className="text-lg font-bold text-blue-200">Saved Items</h3>

            <div className="flex items-center">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-1 bg-blue-600/50 hover:bg-blue-600/70 rounded-md text-white text-xs flex items-center ml-2"
              >
                <RiRefreshLine className="mr-1" />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="filter-tabs px-4 pt-2">
            <button
              className={`filter-tab ${activeFilter === "all" ? "active" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              <RiFilterLine className="mr-1" /> All
            </button>
            <button
              className={`filter-tab ${
                activeFilter === "hotel" ? "active" : ""
              }`}
              onClick={() => setActiveFilter("hotel")}
            >
              <RiHotelLine className="mr-1" /> Hotels
            </button>
            <button
              className={`filter-tab ${
                activeFilter === "restaurant" ? "active" : ""
              }`}
              onClick={() => setActiveFilter("restaurant")}
            >
              <RiRestaurantLine className="mr-1" /> Restaurants
            </button>
            <button
              className={`filter-tab ${
                activeFilter === "attraction" ? "active" : ""
              }`}
              onClick={() => setActiveFilter("attraction")}
            >
              <RiTrophyLine className="mr-1" /> Attractions
            </button>
          </div>

          <div className="p-4">{renderSavedItems()}</div>
        </div>

        {/* Itinerary Section */}
        <div className="trip-itinerary-section">
          <div className="trip-itinerary-title">
            <h3>Your Trip Itinerary</h3>
          </div>
          
          <div className="trip-itinerary-content">
            {/* Days as horizontal scrollable container */}
            <div className="days-container">
              {Object.keys(itinerary).map((day, index) => (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="day-wrapper"
                >
                  {renderDayItinerary(day, index + 1)}
                </motion.div>
              ))}
            </div>

            {/* Number of Days Control */}
            <div className="days-control">
              <label>Number of Days:</label>
              <div className="days-control-buttons">
                <button
                  onClick={() => setNumDays(Math.max(1, numDays - 1))}
                >
                  -
                </button>
                <span className="days-control-count">
                  {numDays}
                </span>
                <button
                  onClick={() => setNumDays(numDays + 1)}
                >
                  +
                </button>
              </div>
            </div>
            
            {/* Generate Trip Plan Button */}
            <button 
              className={`generate-plan-button ${isGeneratingPlan ? 'loading' : ''}`}
              onClick={handleGeneratePlan}
              disabled={isGeneratingPlan}
            >
              {isGeneratingPlan ? (
                <>
                  <RiLoader4Line className="icon loading-spinner" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <RiMagicLine className="icon" />
                  Generate Trip Plan
                </>
              )}
            </button>
            
            {planError && (
              <div className="text-red-400 text-center text-sm mt-2">
                {planError}
              </div>
            )}
          </div>
        </div>

        {/* Quick Add Cancel Button - appears when quick add mode is active */}
        {quickAddMode && (
          <div className="quick-add-cancel">
            <button className="cancel-button" onClick={endQuickAdd}>
              Cancel Quick Add
            </button>
          </div>
        )}
      </div>
    </DragDropContext>
  );
};

export default TripPlanner;
