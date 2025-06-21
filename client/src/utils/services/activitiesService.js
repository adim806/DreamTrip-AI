import axios from "axios";

/**
 * Service for managing saved activities (hotels, restaurants, attractions)
 */
const activitiesService = {
  /**
   * Save an activity (or remove if it already exists)
   * @param {string} userId - User ID
   * @param {string} chatId - Current chat ID
   * @param {string} type - Type of activity (hotel, restaurant, attraction)
   * @param {Object} activityData - The activity data to save
   * @returns {Promise<Object>} - Result of the operation
   */
  saveActivity: async (userId, chatId, type, activityData) => {
    try {
      // Validate inputs first
      if (!userId) throw new Error("Missing userId");
      if (!chatId) throw new Error("Missing chatId");
      if (!type || !["hotel", "restaurant", "attraction"].includes(type)) {
        throw new Error(`Invalid type: ${type}`);
      }
      if (!activityData || !activityData.id)
        throw new Error("Invalid activityData");

      // Pre-process the data to ensure correct format
      const processedData = {
        id: activityData.id,
        name: activityData.name || "",
        rating: String(activityData.rating || ""),
        address: activityData.address || "",
        price: activityData.price || "",
        thumbnail: activityData.thumbnail || "",
        link: activityData.link || "",
        lat: Number(activityData.lat || 0),
        lng: Number(activityData.lng || 0),
      };

      console.log(`Saving ${type} for chat ${chatId}:`, {
        userId,
        id: processedData.id,
      });

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/activities`,
        {
          userId,
          chatId,
          type,
          activityData: processedData,
        },
        { withCredentials: true }
      );

      // Clear the cache for this chatId to ensure fresh data
      activitiesService.clearCachedActivities(chatId);

      return response.data;
    } catch (error) {
      console.error("Error saving activity:", error);

      // Add specific error handling based on error type
      if (error.response) {
        // Server responded with an error status
        console.error("Server error details:", error.response.data);

        // Handle duplicate key errors specially
        if (
          error.response.data.details &&
          error.response.data.details.includes("duplicate key error")
        ) {
          throw new Error(
            `This ${type} is already saved. Please try a different one or refresh the page.`
          );
        } else {
          throw new Error(
            error.response.data.details ||
              error.response.data.error ||
              "Server error"
          );
        }
      } else if (error.request) {
        // Request was made but no response received
        throw new Error("No response received from server");
      } else {
        // Something else went wrong
        throw error;
      }
    }
  },

  /**
   * Get all saved activities for a specific chat
   * @param {string} chatId - Current chat ID
   * @returns {Promise<Array>} - List of saved activities
   */
  getActivities: async (chatId) => {
    try {
      if (!chatId) {
        console.warn("No chatId provided to getActivities");
        return [];
      }

      // Check if we have cached activities for this chatId and they're recent
      const cachedActivities = activitiesService.getCachedActivities(chatId);
      if (cachedActivities) {
        console.log(`Using cached activities for chat ${chatId}`);
        return cachedActivities;
      }

      console.log(`Fetching activities from API for chat ${chatId}`);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/activities/${chatId}`,
        { withCredentials: true }
      );

      // Cache the results for this session
      activitiesService.cacheActivities(chatId, response.data);

      return response.data;
    } catch (error) {
      console.error("Error fetching activities:", error);
      // More detailed error logging
      if (error.response) {
        console.error("Server error details:", error.response.data);
      }
      return []; // Return empty array instead of throwing to prevent UI errors
    }
  },

  /**
   * Check if an activity is already saved
   * @param {Array} savedActivities - List of saved activities
   * @param {string} itemId - ID of the item to check
   * @returns {boolean} - Whether the activity is saved
   */
  isActivitySaved: (savedActivities, itemId) => {
    if (!savedActivities || !Array.isArray(savedActivities) || !itemId) {
      return false;
    }
    return savedActivities.some(
      (activity) => activity.activityData && activity.activityData.id === itemId
    );
  },

  /**
   * Cache activities for a specific chat ID in memory
   * @param {string} chatId - The chat ID to cache for
   * @param {Array} activities - The activities to cache
   */
  cacheActivities: (chatId, activities) => {
    if (!chatId || !activities) return;

    // We'll use sessionStorage to persist the cache between page reloads
    // but still clear when the browser is closed
    try {
      const cacheKey = `activities_cache_${chatId}`;
      const cacheData = {
        timestamp: Date.now(),
        activities: activities,
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`Cached ${activities.length} activities for chat ${chatId}`);
    } catch (err) {
      console.error("Error caching activities:", err);
    }
  },

  /**
   * Get cached activities for a specific chat ID
   * @param {string} chatId - The chat ID to get cached activities for
   * @returns {Array|null} - The cached activities or null if not found/expired
   */
  getCachedActivities: (chatId) => {
    if (!chatId) return null;

    try {
      const cacheKey = `activities_cache_${chatId}`;
      const cachedData = sessionStorage.getItem(cacheKey);

      if (!cachedData) return null;

      const parsedCache = JSON.parse(cachedData);
      const cacheAge = Date.now() - parsedCache.timestamp;
      const cacheMaxAge = 5 * 60 * 1000; // 5 minutes

      // Check if cache is fresh enough
      if (cacheAge > cacheMaxAge) {
        console.log(`Cache expired for chat ${chatId} (${cacheAge}ms old)`);
        sessionStorage.removeItem(cacheKey);
        return null;
      }

      return parsedCache.activities;
    } catch (err) {
      console.error("Error getting cached activities:", err);
      return null;
    }
  },

  /**
   * Clear cached activities for a specific chat ID
   * @param {string} chatId - The chat ID to clear cache for
   */
  clearCachedActivities: (chatId) => {
    if (!chatId) return;

    try {
      const cacheKey = `activities_cache_${chatId}`;
      sessionStorage.removeItem(cacheKey);
      console.log(`Cleared activities cache for chat ${chatId}`);
    } catch (err) {
      console.error("Error clearing activities cache:", err);
    }
  },

  /**
   * Get all activities for all chats the user has interacted with
   * @returns {Object} - Map of chatId to activities
   */
  getAllActivitiesByChatId: () => {
    try {
      const result = {};
      // Find all activities_cache_* keys in sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key.startsWith("activities_cache_")) {
          const chatId = key.replace("activities_cache_", "");
          const cachedData = sessionStorage.getItem(key);
          if (cachedData) {
            const parsedCache = JSON.parse(cachedData);
            result[chatId] = parsedCache.activities;
          }
        }
      }
      return result;
    } catch (err) {
      console.error("Error getting all activities:", err);
      return {};
    }
  },
};

export default activitiesService;
