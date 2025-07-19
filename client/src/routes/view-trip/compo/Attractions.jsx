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
    user_ratings_total: attraction.user_ratings_total || 0,
    types: attraction.types || [],
    opening_hours: attraction.opening_hours || null,
  }));

  return attractionsDataa;
};

// Function to fetch attraction details including reviews
const fetchAttractionDetails = async (placeId) => {
  if (!placeId) return null;
  
  try {
    // Use CORS proxy to avoid CORS issues
    const corsProxy = "https://corsproxy.io/?";
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,opening_hours,website,formatted_phone_number&key=${
      import.meta.env.VITE_GOOGLE_PLACE_API_KEY
    }`;
    
    const response = await axios.get(
      `${corsProxy}${encodeURIComponent(detailsUrl)}`
    );
    
    if (!response.data.result) {
      throw new Error("לא נמצאו פרטים לאטרקציה זו.");
    }
    
    return response.data.result;
  } catch (error) {
    console.error("Error fetching attraction details:", error);
    throw error;
  }
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
  const [showReviews, setShowReviews] = useState(null);
  const [attractionDetails, setAttractionDetails] = useState({});
  const [loadingReviews, setLoadingReviews] = useState({});
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

  // Function to handle showing reviews
  const handleShowReviews = async (e, attractionId) => {
    e.stopPropagation(); // Prevent attraction selection when clicking the button
    
    // Toggle reviews visibility
    if (showReviews === attractionId) {
      setShowReviews(null);
      return;
    }
    
    setShowReviews(attractionId);
    
    // Check if we already have the details for this attraction
    if (!attractionDetails[attractionId]) {
      try {
        setLoadingReviews({...loadingReviews, [attractionId]: true});
        
        // Fetch attraction details including reviews
        const details = await fetchAttractionDetails(attractionId);
        
        // Store the details
        setAttractionDetails(prev => ({
          ...prev,
          [attractionId]: details
        }));
      } catch (error) {
        console.error(`Error fetching reviews for attraction ${attractionId}:`, error);
      } finally {
        setLoadingReviews({...loadingReviews, [attractionId]: false});
      }
    }
  };

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
      <h2 className="text-2xl font-semibold text-center mb-6 text-blue-100" dir="rtl">
        אטרקציות מומלצות ב{trip.vacation_location}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {attractionsList.map((attraction) => (
          <div
            key={attraction.id}
            onClick={() => setSelectedAttraction(attraction)}
            className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-102 hover:shadow-xl cursor-pointer flex flex-col ${
              selectedAttraction?.id === attraction.id
                ? "ring-2 ring-blue-400 shadow-blue-400/30 shadow-lg"
                : "shadow-md shadow-black/20"
            }`}
          >
            {/* Top image with overlay gradient and floating elements */}
            <div className="relative">
              <img
                src={attraction.thumbnail}
                alt={attraction.name}
                className="w-full h-48 object-cover object-center"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              
              {/* Rating pill - top left */}
              <div className="absolute top-3 left-3 bg-blue-600/90 text-white text-sm font-medium px-2 py-0.5 rounded-full flex items-center">
                <span className="mr-1">{attraction.rating}</span>
                <span className="text-yellow-300">⭐</span>
              </div>
              
              {/* Save button - top right */}
              <button
                className="absolute top-3 right-3 z-10 p-1.5 bg-black/30 backdrop-blur-sm rounded-full transition-transform hover:scale-110"
                onClick={(e) => handleSaveActivity(e, attraction)}
                disabled={savingInProgress[attraction.id]}
              >
                <HeartIcon
                  filled={isAttractionSaved(attraction.id)}
                  className={`w-6 h-6 ${
                    isAttractionSaved(attraction.id) ? "text-red-500" : "text-white"
                  }`}
                />
              </button>
            </div>
            
            {/* Attraction details section */}
            <div className="p-4 flex-1 flex flex-col">
              {/* Fixed-height name container with absolute positioning for divider */}
              <div className="h-[60px] relative mb-5">
                {/* Name with overflow handling */}
                <div className="h-full overflow-hidden">
                  <h3 className="text-base font-medium text-white text-left leading-relaxed line-clamp-2" dir="rtl">{attraction.name}</h3>
                </div>
                {/* Absolutely positioned divider */}
                <div className="absolute bottom-0 left-0 right-0 border-b border-blue-800/50"></div>
              </div>
              
              {/* Attraction details content - with flex-1 to push button to bottom */}
              <div className="flex flex-col space-y-2.5 flex-1">
                {/* Address with icon */}
                <div className="flex items-start justify-end">
                  <span className="text-gray-300 text-sm text-left leading-relaxed" dir="rtl">{attraction.address}</span>
                  <span className="ml-2 mt-1 text-blue-400">📍</span>
                </div>
                
                {/* Number of ratings */}
                <div className="flex items-center justify-end">
                  <span className="text-gray-400 text-sm">
                    {attraction.user_ratings_total || "לא ידוע"} דירוגים
                  </span>
                  <span className="ml-2 text-yellow-400">⭐</span>
                </div>
                
                {/* Open now status if available */}
                {attraction.opening_hours && (
                  <div className="flex items-center justify-end">
                    <span className={`text-sm ${attraction.opening_hours.open_now ? 'text-green-400' : 'text-red-400'}`}>
                      {attraction.opening_hours.open_now ? 'פתוח עכשיו' : 'סגור עכשיו'}
                    </span>
                    <span className="ml-2 text-blue-400">🕒</span>
                  </div>
                )}
                
                {/* Attraction type if available */}
                {attraction.types && attraction.types.length > 0 && (
                  <div className="flex items-center justify-end">
                    <span className="text-green-400 text-sm text-right" dir="rtl">
                      {attraction.types[0].replace(/_/g, ' ')}
                    </span>
                    <span className="ml-2 text-green-500 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                      </svg>
                    </span>
                  </div>
                )}
              </div>
              
              {/* Action buttons - always at bottom */}
              <div className="mt-auto">
                <div className="flex gap-2 mb-2">
                  {/* Reviews button */}
                  <button 
                    onClick={(e) => handleShowReviews(e, attraction.id)}
                    className={`flex-1 text-center text-white text-sm py-2 px-3 rounded-md transition-colors ${
                      showReviews === attraction.id ? 'bg-purple-700 hover:bg-purple-800' : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    <span className="flex items-center justify-center">
                      <span className="mr-1">⭐</span>
                      <span>ביקורות</span>
                    </span>
                  </button>
                  
                  {/* Details button */}
              <a
                href={attraction.link}
                target="_blank"
                rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-md transition-colors"
                    dir="rtl"
              >
                לפרטים נוספים
              </a>
                </div>
                
                {/* Reviews section */}
                {showReviews === attraction.id && (
                  <div className="mt-2 bg-slate-700/50 rounded-md p-2 max-h-40 overflow-y-auto text-right" dir="rtl">
                    <h4 className="text-sm font-medium text-blue-200 mb-2">ביקורות אחרונות</h4>
                    
                    {loadingReviews[attraction.id] ? (
                      <div className="flex justify-center items-center py-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-400"></div>
                        <span className="ml-2 text-sm text-blue-300">טוען ביקורות...</span>
                      </div>
                    ) : attractionDetails[attraction.id]?.reviews?.length > 0 ? (
                      attractionDetails[attraction.id].reviews.map((review, index) => (
                        <div key={index} className="mb-2 pb-2 border-b border-slate-600/50 last:border-0 last:mb-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-yellow-300">{review.rating} ⭐</span>
                            <span className="text-xs text-blue-300">{review.author_name}</span>
                          </div>
                          <p className="text-xs text-gray-300 mt-1 line-clamp-2">{review.text}</p>
                          <p className="text-xs text-gray-400 mt-1">{review.relative_time_description}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-2">לא נמצאו ביקורות לאטרקציה זו.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Attractions;
