import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import mapboxgl from "mapbox-gl";
import { useQuery, useQueryClient } from "@tanstack/react-query"; // ודא שאתה משתמש בגרסה העדכנית
import { TripContext } from "@/components/tripcontext/TripProvider";
import activitiesService from "@/utils/services/activitiesService";
import { HeartIcon } from "@/components/ui/heart-icon";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const fetchAttractionsData = async (vacation_location) => {
  if (!vacation_location) return [];
  // קבלת קואורדינטות מהיעד באמצעות Mapbox
  const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    vacation_location
  )}.json?access_token=${mapboxgl.accessToken}`;
  const geoResponse = await axios.get(geocodingUrl);
  const { features } = geoResponse.data;
  if (!features?.length) {
    throw new Error("לא נמצאו קואורדינטות ליעד.");
  }
  const [lng, lat] = features[0].center;

  // שימוש ב-CORS Proxy לעקיפת חסימות
  const corsProxy = "https://corsproxy.io/?";
  // חיפוש אטרקציות באמצעות Google Places API – type=tourist_attraction
  const googlePlacesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=tourist_attraction&key=${
    import.meta.env.VITE_GOOGLE_PLACE_API_KEY
  }`;
  const response = await axios.get(
    `${corsProxy}${encodeURIComponent(googlePlacesUrl)}`
  );

  if (!response.data.results.length) {
    throw new Error("לא נמצאו אטרקציות באזור זה.");
  }

  // עיבוד הנתונים להצגה – כולל id, שם, דירוג, כתובת, מחיר, תמונה, קואורדינטות
  const attractionsDataa = response.data.results.map((attraction) => ({
    id: attraction.place_id,
    name: attraction.name,
    rating: attraction.rating || "לא זמין",
    address: attraction.vicinity || "לא ידוע",
    price: attraction.price_level
      ? `רמת מחיר: ${attraction.price_level}`
      : "לא זמין",
    thumbnail: attraction.photos
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${
          attraction.photos[0].photo_reference
        }&key=${import.meta.env.VITE_GOOGLE_PLACE_API_KEY}`
      : "https://via.placeholder.com/300",
    link: `https://www.google.com/maps/search/?api=1&query=${attraction.geometry.location.lat},${attraction.geometry.location.lng}`,
    lat: attraction.geometry.location.lat,
    lng: attraction.geometry.location.lng,
  }));

  return attractionsDataa;
};

const Attractions = ({ trip }) => {
  const {
    attractionsData,
    setAttractionsData,
    setActiveLayer,
    selectedAttraction,
    setSelectedAttraction,
  } = useContext(TripContext);

  const [savedActivities, setSavedActivities] = useState([]);
  const [savingInProgress, setSavingInProgress] = useState({});
  const queryClient = useQueryClient();

  // Get current userId and chatId
  const [userId, setUserId] = useState(null);
  const [chatId, setChatId] = useState(null);

  // Get userId and chatId from URL or localStorage
  useEffect(() => {
    // Try to get chatId from URL if available
    const pathParts = window.location.pathname.split("/");
    const possibleChatId = pathParts[pathParts.length - 1];
    const chatIdFromUrl = possibleChatId.length > 20 ? possibleChatId : null;

    // Get userId from localStorage or Clerk auth if available
    const userIdFromStorage =
      localStorage.getItem("userId") || sessionStorage.getItem("userId");

    // Set the values, prioritizing trip props if available
    setUserId(trip?.userId || userIdFromStorage);
    setChatId(trip?.chatId || chatIdFromUrl || localStorage.getItem("chatId"));
  }, [trip]);

  // שימוש ב-React Query
  const { data, error, isLoading } = useQuery({
    queryKey: ["attractions", trip?.vacation_location],
    queryFn: () => fetchAttractionsData(trip?.vacation_location),
    enabled: !!trip?.vacation_location,
    staleTime: 1000 * 10,
    //cacheTime: 10000, // 10 שניות
  });

  // עדכון Context כאשר מתקבלים הנתונים
  useEffect(() => {
    if (data) {
      setAttractionsData(data);
      setActiveLayer("attractions_" + Date.now());
    }
  }, [data, setAttractionsData, setActiveLayer]);

  // Fetch saved activities when component mounts or chatId changes
  useEffect(() => {
    const fetchSavedActivities = async () => {
      if (chatId) {
        try {
          const activities = await activitiesService.getActivities(chatId);
          setSavedActivities(activities);
        } catch (error) {
          console.error("Error fetching saved activities:", error);
        }
      }
    };

    fetchSavedActivities();
  }, [chatId]);

  // Function to toggle saving an activity
  const handleSaveActivity = async (e, attraction) => {
    e.stopPropagation(); // Prevent attraction selection when clicking the heart

    if (!userId || !chatId) {
      console.error("Missing userId or chatId", {
        userId: userId || trip?.userId,
        chatId: chatId || trip?.chatId,
      });

      // Try to get them one more time if missing
      const pathParts = window.location.pathname.split("/");
      const urlChatId = pathParts[pathParts.length - 1];
      const fallbackChatId =
        urlChatId.length > 20 ? urlChatId : localStorage.getItem("chatId");
      const fallbackUserId =
        localStorage.getItem("userId") || sessionStorage.getItem("userId");

      if (!fallbackUserId || !fallbackChatId) {
        alert(
          "Unable to save attraction. Please try refreshing the page or navigate back to the chat."
        );
        return;
      }

      setUserId(fallbackUserId);
      setChatId(fallbackChatId);
      return;
    }

    setSavingInProgress((prev) => ({ ...prev, [attraction.id]: true }));

    try {
      // Ensure all data is properly formatted before saving
      const processedAttraction = {
        ...attraction,
        rating: String(attraction.rating || ""),
        lat: Number(attraction.lat || 0),
        lng: Number(attraction.lng || 0),
      };

      await activitiesService.saveActivity(
        userId,
        chatId,
        "attraction",
        processedAttraction
      );

      // Refetch saved activities
      const activities = await activitiesService.getActivities(chatId);
      setSavedActivities(activities);
    } catch (error) {
      console.error("Error saving attraction:", error);
      alert(`Failed to save attraction: ${error.message}`);
    } finally {
      setSavingInProgress((prev) => ({ ...prev, [attraction.id]: false }));
    }
  };

  // Check if an attraction is saved
  const isAttractionSaved = (attractionId) => {
    return activitiesService.isActivitySaved(savedActivities, attractionId);
  };

  if (!trip?.vacation_location) {
    return (
      <p className="text-center text-gray-600">בחר יעד כדי להציג אטרקציות.</p>
    );
  }

  if (isLoading) {
    return <p className="text-center text-blue-600">טוען אטרקציות...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">שגיאה בטעינת האטרקציות.</p>;
  }

  const attractionsList = attractionsData || data || [];

  if (attractionsList.length === 0) {
    return (
      <p className="text-center text-gray-600">
        לא נמצאו אטרקציות עבור {trip.vacation_location}.
      </p>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-semibold text-center mb-6">
        Recommended Attractions in: {trip.vacation_location}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {attractionsList.map((attraction) => (
          <div
            key={attraction.id}
            onClick={() => setSelectedAttraction(attraction)}
            className={`bg-white rounded-lg shadow-lg overflow-hidden transform transition duration-300 hover:scale-105 cursor-pointer ${
              selectedAttraction?.id === attraction.id
                ? "border-4 border-blue-500"
                : ""
            }`}
          >
            <div className="relative">
              <img
                src={attraction.thumbnail}
                alt={attraction.name}
                className="w-full h-48 object-cover"
              />
              <button
                className="absolute top-3 right-3 z-10"
                onClick={(e) => handleSaveActivity(e, attraction)}
                disabled={savingInProgress[attraction.id]}
              >
                <HeartIcon
                  filled={isAttractionSaved(attraction.id)}
                  className={`w-7 h-7 ${
                    isAttractionSaved(attraction.id)
                      ? "text-red-500"
                      : "text-white"
                  }`}
                />
              </button>
            </div>
            <div className="p-4">
              <h3 className="text-xl font-bold mb-2">{attraction.name}</h3>
              <p className="text-gray-700">
                <strong>דירוג:</strong> {attraction.rating} ⭐
              </p>
              <p className="text-gray-700">
                <strong>מחיר:</strong> {attraction.price}
              </p>
              <p className="text-gray-600">
                <strong>כתובת:</strong> {attraction.address}
              </p>
              <a
                href={attraction.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-blue-500 text-white font-semibold py-2 mt-4 rounded-lg hover:bg-blue-700 transition"
              >
                לפרטים נוספים
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Attractions;
