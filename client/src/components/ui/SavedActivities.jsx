import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import activitiesService from "@/utils/services/activitiesService";
import { motion } from "framer-motion";

const SavedActivities = ({ chatId: propsChatId, userId: propsUserId }) => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get current userId and chatId
  const [userId, setUserId] = useState(propsUserId);
  const [chatId, setChatId] = useState(propsChatId);

  // Ensure we have userId and chatId from multiple sources
  useEffect(() => {
    // Try to get chatId from URL if available
    const pathParts = window.location.pathname.split("/");
    const possibleChatId = pathParts[pathParts.length - 1];
    const chatIdFromUrl = possibleChatId.length > 20 ? possibleChatId : null;

    // Get userId from localStorage or Clerk auth if available
    const userIdFromStorage =
      localStorage.getItem("userId") || sessionStorage.getItem("userId");

    // Set the values, prioritizing props if available
    const newUserId = propsUserId || userIdFromStorage;
    const newChatId =
      propsChatId || chatIdFromUrl || localStorage.getItem("chatId");

    setUserId(newUserId);
    setChatId(newChatId);

    console.log(
      `SavedActivities: Using chatId: ${newChatId}, userId: ${newUserId}`
    );
  }, [propsUserId, propsChatId]);

  // Function to fetch activities with error handling
  const fetchActivitiesData = useCallback(async () => {
    if (!chatId) {
      setIsLoading(false);
      setError("No chat ID available. Please go back to the chat.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`Fetching saved activities for chat: ${chatId}`);
      // Clear the cache when refreshing explicitly
      if (isRefreshing) {
        activitiesService.clearCachedActivities(chatId);
      }

      const data = await activitiesService.getActivities(chatId);
      console.log(`Received ${data.length} activities for chat ${chatId}`);
      setActivities(data);
    } catch (err) {
      console.error(`Error fetching saved activities for chat ${chatId}:`, err);
      setError("Failed to load saved activities");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [chatId, isRefreshing]);

  // Initial load of activities when chatId changes
  useEffect(() => {
    if (chatId) {
      fetchActivitiesData();
    }
  }, [chatId, fetchActivitiesData]);

  // Handle refreshing the activities list
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchActivitiesData();
  };

  // Filter activities by type
  const hotels = activities.filter((item) => item.type === "hotel");
  const restaurants = activities.filter((item) => item.type === "restaurant");
  const attractions = activities.filter((item) => item.type === "attraction");

  // Handle removing an activity
  const handleRemoveActivity = async (activity) => {
    if (!userId || !chatId) {
      setError("User ID or Chat ID missing. Cannot remove activity.");
      return;
    }

    try {
      console.log(`Removing activity ${activity._id} from chat ${chatId}`);
      await activitiesService.saveActivity(
        userId,
        chatId,
        activity.type,
        activity.activityData
      );

      // Refetch the list after removal
      console.log("Activity removed, refreshing activities list");
      const updatedActivities = await activitiesService.getActivities(chatId);
      setActivities(updatedActivities);
    } catch (err) {
      console.error("Error removing activity:", err);
      setError("Failed to remove activity. Please try again.");
    }
  };

  // Helper function to check if an activity has a valid location
  const hasLocation = (activity) => {
    return (
      activity.activityData?.lat &&
      activity.activityData?.lng &&
      activity.activityData.lat !== 0 &&
      activity.activityData.lng !== 0
    );
  };

  // Render each activity card
  const renderActivityCard = (activity) => (
    <motion.div
      key={activity._id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/10 rounded-lg overflow-hidden shadow-md flex flex-col relative"
    >
      <div className="h-32 overflow-hidden">
        <img
          src={
            activity.activityData.thumbnail || "https://via.placeholder.com/300"
          }
          alt={activity.activityData.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://via.placeholder.com/300";
          }}
        />
        {/* Activity type badge */}
        <div
          className={`absolute top-0 right-0 p-1 rounded-bl-lg 
          ${
            activity.type === "hotel"
              ? "bg-blue-600/80"
              : activity.type === "restaurant"
              ? "bg-orange-600/80"
              : "bg-green-600/80"
          }`}
        >
          {activity.type === "hotel"
            ? "🏨"
            : activity.type === "restaurant"
            ? "🍽️"
            : "🎡"}
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-bold text-sm mb-1 text-blue-100">
          {activity.activityData.name}
        </h3>
        <p className="text-xs text-gray-300 mb-1 line-clamp-2">
          {activity.activityData.address}
        </p>
        <div className="flex justify-between items-center mt-auto">
          <span className="text-xs text-yellow-300">
            {activity.activityData.rating
              ? `${activity.activityData.rating} ⭐`
              : ""}
          </span>
          <button
            onClick={() => handleRemoveActivity(activity)}
            className="text-xs text-red-400 hover:text-red-300 transition"
          >
            Remove
          </button>
        </div>
      </div>
    </motion.div>
  );

  // Specific error state for no chatId
  if (!chatId) {
    return (
      <div className="p-4 text-center">
        <p className="text-yellow-400 mb-3">
          No chat selected. Please return to a chat to view saved activities.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        Loading saved activities for this chat...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-400 mb-3">{error}</p>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md text-white text-sm"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        <p className="mb-3">
          No saved activities for this chat yet. Add some by clicking the heart
          icon in the search results.
        </p>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md text-white text-sm"
        >
          {isRefreshing ? "Refreshing..." : "Refresh List"}
        </button>
      </div>
    );
  }

  return (
    <div className="saved-activities-container p-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-center text-blue-200">
          Saved Items for This Chat
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3 py-1 bg-blue-600/50 hover:bg-blue-600/70 rounded-md text-white text-xs"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="all">All ({activities.length})</TabsTrigger>
          <TabsTrigger value="hotels">Hotels ({hotels.length})</TabsTrigger>
          <TabsTrigger value="restaurants">
            Restaurants ({restaurants.length})
          </TabsTrigger>
          <TabsTrigger value="attractions">
            Attractions ({attractions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activities.map(renderActivityCard)}
          </div>
        </TabsContent>

        <TabsContent value="hotels" className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {hotels.length > 0 ? (
              hotels.map(renderActivityCard)
            ) : (
              <p className="col-span-2 text-center text-gray-400 py-4">
                No hotels saved for this chat yet.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="restaurants" className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {restaurants.length > 0 ? (
              restaurants.map(renderActivityCard)
            ) : (
              <p className="col-span-2 text-center text-gray-400 py-4">
                No restaurants saved for this chat yet.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="attractions" className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attractions.length > 0 ? (
              attractions.map(renderActivityCard)
            ) : (
              <p className="col-span-2 text-center text-gray-400 py-4">
                No attractions saved for this chat yet.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SavedActivities;
