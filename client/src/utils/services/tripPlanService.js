import { CustomTripPlanModel } from "@/lib/gemini";

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
};

export default tripPlanService;
