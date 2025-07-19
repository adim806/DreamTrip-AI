import { CustomTripPlanModel } from "@/lib/gemini";
import axios from "axios";

// Backend API URL
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Service for generating personalized trip plans based on user-selected activities
 */
const tripPlanService = {
  /**
   * Generate a personalized trip plan based on user's dragged activities
   *
   * @param {Object} itineraryData - The user's dragged activities, organized by day and time slot
   * @param {Object} tripDetails - Details about the trip (destination, duration, etc.)
   * @returns {Promise<Object>} - The generated trip plan
   */
  generateCustomPlan: async (itineraryData, tripDetails) => {
    try {
      console.log("TripPlanService: Starting custom trip plan generation");
      console.log(
        `TripPlanService: Destination: ${tripDetails.destination || "Unknown"}`
      );
      console.log(
        `TripPlanService: Duration: ${tripDetails.duration || "Unknown"}`
      );
      console.log(
        `TripPlanService: Chat ID: ${tripDetails.chatId || "Unknown"}`
      );
      console.log(
        `TripPlanService: Days in itinerary: ${
          Object.keys(itineraryData).length
        }`
      );

      // Count total activities
      let totalActivities = 0;
      let activitiesByType = { morning: 0, afternoon: 0, evening: 0 };

      Object.values(itineraryData).forEach((day) => {
        Object.entries(day).forEach(([timeSlot, activities]) => {
          if (Array.isArray(activities)) {
            totalActivities += activities.length;
            activitiesByType[timeSlot] =
              (activitiesByType[timeSlot] || 0) + activities.length;
          }
        });
      });

      console.log(`TripPlanService: Total activities: ${totalActivities}`);
      console.log(
        `TripPlanService: Activities by time slot:`,
        activitiesByType
      );

      if (!itineraryData || Object.keys(itineraryData).length === 0) {
        console.error(
          "TripPlanService: Error - No activities provided for trip plan generation"
        );
        throw new Error("No activities provided for trip plan generation");
      }

      if (!tripDetails.destination) {
        console.warn(
          "TripPlanService: Warning - No destination specified for trip plan"
        );
        tripDetails.destination = "Unknown destination";
      }

      console.log("TripPlanService: Calling Gemini API model...");
      console.time("TripPlanService:ModelGenerationTime");
      const result = await CustomTripPlanModel.generatePersonalizedPlan(
        itineraryData,
        tripDetails
      );
      console.timeEnd("TripPlanService:ModelGenerationTime");

      if (result.success) {
        console.log("TripPlanService: Successfully generated trip plan");
        console.log(
          `TripPlanService: Response length: ${result.data.length} characters`
        );

        // Log a preview of the generated content (first 100 chars)
        const preview = result.data.substring(0, 100).replace(/\n/g, " ");
        console.log(`TripPlanService: Content preview: "${preview}..."`);

        // Store the generated plan in local storage for persistence
        const storageKey = `tripPlanner_generatedPlan_${
          tripDetails.chatId || "unknown"
        }`;
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            timestamp: Date.now(),
            plan: result.data,
            tripDetails,
          })
        );

        console.log(
          `TripPlanService: Plan saved to localStorage with key: ${storageKey}`
        );
      } else {
        console.error(
          "TripPlanService: Failed to generate plan:",
          result.error
        );
      }

      return result;
    } catch (error) {
      console.error("TripPlanService: Error in generateCustomPlan:", error);
      return {
        success: false,
        error: error.message || "Failed to generate trip plan",
      };
    }
  },

  /**
   * Get a previously generated trip plan from local storage
   *
   * @param {string} chatId - The chat ID associated with the trip
   * @returns {Object|null} - The stored trip plan or null if not found
   */
  getStoredPlan: (chatId) => {
    try {
      if (!chatId) {
        console.log("TripPlanService: No chatId provided to getStoredPlan");
        return null;
      }

      const storageKey = `tripPlanner_generatedPlan_${chatId}`;
      const storedData = localStorage.getItem(storageKey);

      if (!storedData) {
        console.log(`TripPlanService: No stored plan found for chat ${chatId}`);
        return null;
      }

      const parsedData = JSON.parse(storedData);
      console.log(
        `TripPlanService: Found stored plan for chat ${chatId} from ${new Date(
          parsedData.timestamp
        ).toLocaleString()}`
      );
      return parsedData;
    } catch (error) {
      console.error(
        "TripPlanService: Error retrieving stored trip plan:",
        error
      );
      return null;
    }
  },

  /**
   * Delete a stored trip plan from local storage
   *
   * @param {string} chatId - The chat ID associated with the trip
   */
  deleteStoredPlan: (chatId) => {
    try {
      if (!chatId) {
        console.log("TripPlanService: No chatId provided to deleteStoredPlan");
        return;
      }

      const storageKey = `tripPlanner_generatedPlan_${chatId}`;
      localStorage.removeItem(storageKey);
      console.log(
        `TripPlanService: Deleted stored trip plan for chat ${chatId}`
      );
    } catch (error) {
      console.error("TripPlanService: Error deleting stored trip plan:", error);
    }
  },

  /**
   * Save the trip plan to MY TRIPS section for future reference
   * This saves to both localStorage and the backend database
   *
   * @param {Object} tripData - The trip data to save
   * @param {string} tripData.plan - The generated trip plan content
   * @param {Object} tripData.tripDetails - Trip details like destination, duration, etc.
   * @param {string} tripData.chatId - The chat ID associated with the trip
   * @returns {Promise<boolean>} - Whether the operation succeeded
   */
  saveToMyTrips: async (tripData) => {
    try {
      if (!tripData || !tripData.plan || !tripData.chatId) {
        console.error(
          "TripPlanService: Invalid trip data provided to saveToMyTrips"
        );
        return false;
      }

      // First save to localStorage as a backup
      const saveData = {
        id: tripData.chatId,
        plan: tripData.plan,
        destination: tripData.tripDetails?.destination || "Unknown destination",
        duration: tripData.tripDetails?.duration || "Unknown duration",
        created: Date.now(),
        lastViewed: Date.now(),
      };

      // Get existing saved trips from localStorage
      const existingSavedTrips = localStorage.getItem("myTrips") || "[]";
      const myTrips = JSON.parse(existingSavedTrips);

      // Check if this trip already exists in MY TRIPS
      const existingIndex = myTrips.findIndex(
        (trip) => trip.id === tripData.chatId
      );

      if (existingIndex !== -1) {
        // Update existing entry
        myTrips[existingIndex] = {
          ...myTrips[existingIndex],
          ...saveData,
          lastViewed: Date.now(),
        };
        console.log(
          `TripPlanService: Updated existing trip in localStorage for ${tripData.tripDetails?.destination}`
        );
      } else {
        // Add as new entry
        myTrips.push(saveData);
        console.log(
          `TripPlanService: Added new trip to localStorage for ${tripData.tripDetails?.destination}`
        );
      }

      // Save back to localStorage
      localStorage.setItem("myTrips", JSON.stringify(myTrips));

      // Also add to 'savedTripIds' for quick checking
      const savedIds = localStorage.getItem("savedTripIds") || "[]";
      const idsArray = JSON.parse(savedIds);

      if (!idsArray.includes(tripData.chatId)) {
        idsArray.push(tripData.chatId);
        localStorage.setItem("savedTripIds", JSON.stringify(idsArray));
      }

      // Now save to backend
      console.log("TripPlanService: Saving trip to backend database");

      // Get the user ID from localStorage or sessionStorage
      const userId =
        localStorage.getItem("userId") || sessionStorage.getItem("userId");

      // Prepare the data for the API
      const apiData = {
        plan: tripData.plan,
        tripDetails: {
          ...tripData.tripDetails,
          destination: tripData.destination || tripData.tripDetails?.destination || "Unknown destination",
          duration: tripData.duration || tripData.tripDetails?.duration || "Unknown duration"
        },
        chatId: tripData.chatId,
        itineraryData: tripData.itineraryData || {},
        userId: userId, // Include userId for authentication fallback
        destination: tripData.destination || tripData.tripDetails?.destination || "Unknown destination",
        duration: tripData.duration || tripData.tripDetails?.duration || "Unknown duration",
        metadata: tripData.metadata || {},
        structuredPlan: tripData.structuredPlan || {}
      };

      console.log("TripPlanService: API Data for saving trip:", {
        destination: apiData.destination,
        duration: apiData.duration,
        chatId: apiData.chatId
      });

      // Make the API call
      const response = await axios.post(`${API_URL}/api/trips/save`, apiData, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true, // Important for authentication cookies
      });

      console.log("TripPlanService: Backend save response", response.data);

      return response.data.success;
    } catch (error) {
      console.error("TripPlanService: Error saving trip to MY TRIPS:", error);

      // If the backend save fails but localStorage succeeded, return true
      // This allows offline functionality
      return true;
    }
  },

  /**
   * Check if a trip plan is already saved in MY TRIPS
   * Checks both localStorage and backend
   *
   * @param {string} chatId - The chat ID to check
   * @returns {Promise<boolean>} - Whether the trip is saved
   */
  isPlanned: async (chatId) => {
    try {
      if (!chatId) return false;

      // First check localStorage for offline functionality
      const savedIds = localStorage.getItem("savedTripIds") || "[]";
      const idsArray = JSON.parse(savedIds);

      if (idsArray.includes(chatId)) {
        return true;
      }

      const existingSavedTrips = localStorage.getItem("myTrips") || "[]";
      const myTrips = JSON.parse(existingSavedTrips);

      if (myTrips.some((trip) => trip.id === chatId)) {
        return true;
      }

      // Then check backend
      try {
        const response = await axios.get(
          `${API_URL}/api/trips/check/${chatId}`,
          {
            withCredentials: true,
          }
        );

        return response.data.isSaved;
      } catch (apiError) {
        console.error(
          "TripPlanService: Error checking trip status with backend:",
          apiError
        );
        // Fall back to localStorage result if API fails
        return false;
      }
    } catch (error) {
      console.error("TripPlanService: Error checking if trip is saved:", error);
      return false;
    }
  },

  /**
   * Get all saved trips from MY TRIPS
   * Fetches from backend with localStorage fallback
   *
   * @returns {Promise<Array>} - Array of saved trip plans
   */
  getMyTrips: async () => {
    try {
      // Try to get from backend first
      try {
        // Use the new combined endpoint to get both saved trips and itineraries
        const response = await axios.get(`${API_URL}/api/user/all-trips`, {
          withCredentials: true,
        });

        console.log("TripPlanService: Successfully fetched trips from backend");
        
        // Combine savedTrips and itineraries into one array
        const allTrips = [
          ...response.data.savedTrips,
          ...response.data.itineraries.map(itinerary => ({
            ...itinerary,
            plan: itinerary.content,
            structuredPlan: itinerary.structuredItinerary,
            // Add additional fields needed for display
            preview: {
              description: extractPreviewFromContent(itinerary.content),
              image: getDestinationImageForTrip(itinerary.destination)
            },
            activityCounts: estimateActivityCounts(itinerary)
          }))
        ];
        
        return allTrips;
      } catch (apiError) {
        console.error(
          "TripPlanService: Error fetching trips from backend:",
          apiError
        );

        // Fall back to localStorage
        console.log("TripPlanService: Falling back to localStorage for trips");
        const savedTrips = localStorage.getItem("myTrips") || "[]";
        return JSON.parse(savedTrips);
      }
    } catch (error) {
      console.error("TripPlanService: Error getting saved trips:", error);
      return [];
    }
  },

  /**
   * Delete a trip from MY TRIPS
   * Deletes from both backend and localStorage
   *
   * @param {string} tripId - ID of the trip to delete
   * @returns {Promise<boolean>} - Whether the operation succeeded
   */
  deleteFromMyTrips: async (tripId) => {
    try {
      if (!tripId) return false;

      // First delete from localStorage
      const existingSavedTrips = localStorage.getItem("myTrips") || "[]";
      let myTrips = JSON.parse(existingSavedTrips);

      // Filter out the trip to delete
      const originalLength = myTrips.length;
      myTrips = myTrips.filter((trip) => trip.id !== tripId);

      // Save back to localStorage
      localStorage.setItem("myTrips", JSON.stringify(myTrips));

      // Also update the savedTripIds array
      const savedIds = localStorage.getItem("savedTripIds") || "[]";
      const idsArray = JSON.parse(savedIds).filter((id) => id !== tripId);
      localStorage.setItem("savedTripIds", JSON.stringify(idsArray));

      // Then delete from backend
      try {
        await axios.delete(`${API_URL}/api/trips/saved/${tripId}`, {
          withCredentials: true,
        });

        console.log("TripPlanService: Successfully deleted trip from backend");
        return true;
      } catch (apiError) {
        console.error(
          "TripPlanService: Error deleting trip from backend:",
          apiError
        );

        // Return true if we at least deleted from localStorage
        return myTrips.length < originalLength;
      }
    } catch (error) {
      console.error(
        "TripPlanService: Error deleting trip from MY TRIPS:",
        error
      );
      return false;
    }
  },

  /**
   * Get a specific saved trip by ID
   * Fetches from backend with localStorage fallback
   *
   * @param {string} tripId - ID of the trip to fetch
   * @returns {Promise<Object|null>} - The trip data or null if not found
   */
  getTripById: async (tripId) => {
    try {
      // Try to get from backend first
      try {
        const response = await axios.get(
          `${API_URL}/api/trips/saved/${tripId}`,
          {
            withCredentials: true,
          }
        );

        console.log("TripPlanService: Successfully fetched trip from backend");
        return response.data;
      } catch (apiError) {
        console.error(
          "TripPlanService: Error fetching trip from backend:",
          apiError
        );

        // Fall back to localStorage
        console.log("TripPlanService: Falling back to localStorage for trip");
        const savedTrips = localStorage.getItem("myTrips") || "[]";
        const trips = JSON.parse(savedTrips);
        return trips.find((trip) => trip.id === tripId) || null;
      }
    } catch (error) {
      console.error("TripPlanService: Error getting saved trip:", error);
      return null;
    }
  },
};

/**
 * Extract a preview description from itinerary content
 * @param {string} content - The itinerary content
 * @returns {string} - A preview description
 */
const extractPreviewFromContent = (content) => {
  if (!content) return "Travel itinerary";
  
  try {
    // Try to extract a summary if available
    const summaryMatch = content.match(/\*\*Summary:\*\*\s+([^\n]+)/);
    if (summaryMatch && summaryMatch[1]) {
      return summaryMatch[1].trim();
    }
    
    // Otherwise, get the first paragraph that's not a heading
    const paragraphs = content.split('\n\n');
    for (const paragraph of paragraphs) {
      if (!paragraph.startsWith('#') && paragraph.length > 30) {
        return paragraph.substring(0, 200) + (paragraph.length > 200 ? '...' : '');
      }
    }
    
    // If all else fails, return the first 200 characters
    return content.substring(0, 200) + (content.length > 200 ? '...' : '');
  } catch (error) {
    console.error("Error extracting preview description:", error);
    return "A personalized travel itinerary";
  }
};

/**
 * Get an image URL for a destination
 * @param {string} destination - The destination name
 * @returns {string} - An image URL
 */
const getDestinationImageForTrip = (destination) => {
  if (!destination) return "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=1200&auto=format&fit=crop";
  
  // Simple mapping of destinations to images
  const destinationImages = {
    "paris": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop",
    "rome": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop",
    "london": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop",
    "barcelona": "https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=1200&auto=format&fit=crop",
    "new york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1200&auto=format&fit=crop",
    "tokyo": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1200&auto=format&fit=crop",
    "bangkok": "https://images.unsplash.com/photo-1563492065599-3520f775eeed?q=80&w=1200&auto=format&fit=crop",
    "singapore": "https://images.unsplash.com/photo-1565967511849-76a60a516170?q=80&w=1200&auto=format&fit=crop",
    "dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop",
    "tel aviv": "https://images.unsplash.com/photo-1544971587-b842c27f8e14?q=80&w=1200&auto=format&fit=crop",
    "jerusalem": "https://images.unsplash.com/photo-1529106492281-b02200cec7ec?q=80&w=1200&auto=format&fit=crop"
  };
  
  // Try to find a match
  const lowerDest = destination.toLowerCase();
  for (const [key, url] of Object.entries(destinationImages)) {
    if (lowerDest.includes(key)) {
      return url;
    }
  }
  
  // Default image if no match
  return "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=1200&auto=format&fit=crop";
};

/**
 * Estimate activity counts from itinerary content
 * @param {Object} itinerary - The itinerary object
 * @returns {Object} - Activity counts
 */
const estimateActivityCounts = (itinerary) => {
  const counts = {
    total: 0,
    attractions: 0,
    restaurants: 0,
    hotels: 0
  };
  
  try {
    // Try to use structured itinerary if available
    if (itinerary.structuredItinerary?.days && Array.isArray(itinerary.structuredItinerary.days)) {
      itinerary.structuredItinerary.days.forEach(day => {
        // Count activities in sections
        if (day.sections && Array.isArray(day.sections)) {
          day.sections.forEach(section => {
            if (section.activities && Array.isArray(section.activities)) {
              counts.total += section.activities.length;
              counts.attractions += section.activities.length;
            }
            
            if (section.restaurant) {
              counts.total += 1;
              counts.restaurants += 1;
            }
            
            if (section.options && Array.isArray(section.options)) {
              counts.total += section.options.length;
              counts.attractions += section.options.length;
            }
          });
        }
        
        // Count activities in legacy format
        if (day.activities) {
          Object.entries(day.activities).forEach(([timeSlot, activities]) => {
            if (Array.isArray(activities) && activities.length > 0) {
              counts.total += activities.length;
              
              if (timeSlot === 'lunch' || timeSlot === 'dinner') {
                counts.restaurants += activities.length;
              } else {
                counts.attractions += activities.length;
              }
            }
          });
        }
      });
      
      return counts;
    }
    
    // If no structured data, estimate from content
    const content = itinerary.content || "";
    
    // Count days
    const dayMatches = content.match(/### Day \d+:|## Day \d+:|# Day \d+:/g);
    const dayCount = dayMatches ? dayMatches.length : 0;
    
    // Count attractions, restaurants and hotels
    const attractionMatches = content.match(/attraction|museum|park|visit|tour|explore/gi);
    const restaurantMatches = content.match(/restaurant|dining|lunch|dinner|breakfast|café|cafe|eat/gi);
    const hotelMatches = content.match(/hotel|accommodation|stay|lodge|resort/gi);
    
    counts.attractions = attractionMatches ? attractionMatches.length : dayCount * 2;
    counts.restaurants = restaurantMatches ? restaurantMatches.length : dayCount;
    counts.hotels = hotelMatches ? hotelMatches.length : Math.max(1, dayCount - 1);
    counts.total = counts.attractions + counts.restaurants + counts.hotels;
    
    return counts;
  } catch (error) {
    console.error("Error estimating activity counts:", error);
    return { total: 5, attractions: 3, restaurants: 1, hotels: 1 };
  }
};

export default tripPlanService;
