import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import mapboxgl from "mapbox-gl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TripContext } from "@/components/tripcontext/TripProvider";
import activitiesService from "@/utils/services/activitiesService";
import { HeartIcon } from "@/components/ui/heart-icon";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const fetchHotelsData = async (vacation_location) => {
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
  const googlePlacesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=lodging&key=${
    import.meta.env.VITE_GOOGLE_PLACE_API_KEY
  }`;

  let allHotels = [];
  let response = await axios.get(
    `${corsProxy}${encodeURIComponent(googlePlacesUrl)}`
  );
  allHotels = allHotels.concat(response.data.results);

  // טיפול בדפי תוצאות נוספים (עד 20 מלונות)
  while (response.data.next_page_token && allHotels.length < 20) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    response = await axios.get(
      `${corsProxy}${encodeURIComponent(googlePlacesUrl)}&pagetoken=${
        response.data.next_page_token
      }`
    );
    allHotels = allHotels.concat(response.data.results);
  }

  // Get additional details for each hotel, including price when available
  const hotelsWithDetails = await Promise.all(
    allHotels.slice(0, 20).map(async (hotel) => {
      // Basic hotel info
      const hotelData = {
    id: hotel.place_id,
    name: hotel.name,
    rating: hotel.rating || "לא זמין",
    address: hotel.vicinity || "לא ידוע",
    thumbnail: hotel.photos
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${
          hotel.photos[0].photo_reference
        }&key=${import.meta.env.VITE_GOOGLE_PLACE_API_KEY}`
      : "https://via.placeholder.com/300",
    link: `https://www.google.com/maps/search/?api=1&query=${hotel.geometry.location.lat},${hotel.geometry.location.lng}`,
    lat: hotel.geometry.location.lat,
    lng: hotel.geometry.location.lng,
      };

      // Try to get more detailed price information
      try {
        // Get place details to get website URL and other useful information
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${hotel.place_id}&fields=website,rating,user_ratings_total,opening_hours,reviews&key=${
          import.meta.env.VITE_GOOGLE_PLACE_API_KEY
        }`;
        
        const detailsResponse = await axios.get(
          `${corsProxy}${encodeURIComponent(detailsUrl)}`
        );
        
        const details = detailsResponse.data.result;
        
        // Add total number of ratings if available
        if (details?.user_ratings_total) {
          hotelData.totalRatings = details.user_ratings_total;
        }
        
        // Add opening hours status if available
        if (details?.opening_hours?.open_now !== undefined) {
          hotelData.isOpenNow = details.opening_hours.open_now;
        }
        
        // Add reviews if available
        if (details?.reviews && details.reviews.length > 0) {
          hotelData.reviews = details.reviews.map(review => ({
            author: review.author_name,
            rating: review.rating,
            text: review.text,
            time: review.relative_time_description || new Date(review.time * 1000).toLocaleDateString()
          }));
        }
        
        // Add website link if available
        if (details?.website) {
          hotelData.website = details.website;
          hotelData.link = details.website; // Use actual website instead of maps link
        }
      } catch (error) {
        console.error(`Error fetching details for ${hotel.name}:`, error);
      }

      return hotelData;
    })
  );

  return hotelsWithDetails;
};

const Hotels = ({ trip }) => {
  const {
    hotelsData,
    setHotelsData,
    setActiveLayer,
    selectedHotel,
    setSelectedHotel,
    activeLayer,
  } = useContext(TripContext);

  const [savedActivities, setSavedActivities] = useState([]);
  const [savingInProgress, setSavingInProgress] = useState({});
  const [showReviews, setShowReviews] = useState(null);
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

  // שימוש ב-React Query:
  // - staleTime: 0 => הנתונים נחשבים מיד ל-stale
  // - cacheTime: 300000 => הנתונים יישמרו במטמון למשך 5 דקות כאשר אין observers
  const { data, error, isLoading } = useQuery({
    queryKey: ["hotels", trip?.vacation_location],
    queryFn: () => fetchHotelsData(trip?.vacation_location),
    enabled: !!trip?.vacation_location,
    staleTime: 20000,
    //cacheTime: 21000 ,
  });

  // עדכון Context כאשר מתקבלים הנתונים מה-query
  useEffect(() => {
    if (data) {
      setHotelsData(data);
      setActiveLayer("hotels");
    }
  }, [data, setHotelsData, setActiveLayer]);

  // useEffect לניקוי השאילתה מהמטמון כאשר activeLayer אינו "hotels"
  useEffect(() => {
    let timeoutId;
    if (!activeLayer?.startsWith("hotels")) {
      timeoutId = setTimeout(() => {
        queryClient.removeQueries({
          queryKey: ["hotels", trip?.vacation_location],
          exact: true,
        });
      }, 10000); // 5 דקות
    }
    return () => clearTimeout(timeoutId);
  }, [activeLayer, queryClient, trip?.vacation_location]);

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
  const handleSaveActivity = async (e, hotel) => {
    e.stopPropagation(); // Prevent hotel selection when clicking the heart

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
          "Unable to save hotel. Please try refreshing the page or navigate back to the chat."
        );
        return;
      }

      setUserId(fallbackUserId);
      setChatId(fallbackChatId);
      return;
    }

    setSavingInProgress((prev) => ({ ...prev, [hotel.id]: true }));

    try {
      await activitiesService.saveActivity(userId, chatId, "hotel", hotel);

      // Refetch saved activities
      const activities = await activitiesService.getActivities(chatId);
      setSavedActivities(activities);
    } catch (error) {
      console.error("Error saving hotel:", error);
    } finally {
      setSavingInProgress((prev) => ({ ...prev, [hotel.id]: false }));
    }
  };

  // Check if a hotel is saved
  const isHotelSaved = (hotelId) => {
    return activitiesService.isActivitySaved(savedActivities, hotelId);
  };

  // Function to handle showing reviews
  const handleShowReviews = (e, hotelId) => {
    e.stopPropagation(); // Prevent hotel selection when clicking the button
    setShowReviews(showReviews === hotelId ? null : hotelId);
  };

  if (!trip?.vacation_location) {
    return (
      <p className="text-center text-gray-600">בחר יעד כדי להציג מלונות.</p>
    );
  }

  if (isLoading) {
    return <p className="text-center text-blue-600">טוען מלונות...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">שגיאה בטעינת המלונות.</p>;
  }

  const hotelsList = hotelsData || data || [];

  if (hotelsList.length === 0) {
    return (
      <p className="text-center text-gray-600">
        לא נמצאו מלונות עבור {trip.vacation_location}.
      </p>
    );
  }

  // Sort hotels by rating from highest to lowest
  const sortedHotels = [...hotelsList].sort((a, b) => {
    const ratingA = parseFloat(a.rating) || 0;
    const ratingB = parseFloat(b.rating) || 0;
    return ratingB - ratingA;
  });

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-semibold text-center mb-6 text-blue-100">
        Recomended Hotels in: {trip.vacation_location}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {sortedHotels.map((hotel) => (
          <div
            key={hotel.id}
            onClick={() => setSelectedHotel(hotel)}
            className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-102 hover:shadow-xl cursor-pointer flex flex-col ${
              selectedHotel?.id === hotel.id ? "ring-2 ring-blue-400 shadow-blue-400/30 shadow-lg" : "shadow-md shadow-black/20"
            }`}
          >
            {/* Top section with image */}
            <div className="relative">
              <img
                src={hotel.thumbnail}
                alt={hotel.name}
                className="w-full h-48 object-cover object-center"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              
              {/* Save button */}
              <button
                className="absolute top-3 right-3 z-10 p-1.5 bg-black/30 backdrop-blur-sm rounded-full transition-transform hover:scale-110"
                onClick={(e) => handleSaveActivity(e, hotel)}
                disabled={savingInProgress[hotel.id]}
              >
                <HeartIcon
                  filled={isHotelSaved(hotel.id)}
                  className={`w-6 h-6 ${
                    isHotelSaved(hotel.id) ? "text-red-500" : "text-white"
                  }`}
                />
              </button>
              
              {/* Rating badge */}
              <div className="absolute top-3 left-3 bg-blue-600/90 text-white text-sm font-medium px-2 py-0.5 rounded-full flex items-center">
                <span className="mr-1">{hotel.rating}</span>
                <span className="text-yellow-300">⭐</span>
              </div>
            </div>
            
            {/* Hotel info section */}
            <div className="p-4 flex-1 flex flex-col">
              {/* Fixed-height name container with absolute positioning for divider */}
              <div className="h-[60px] relative mb-5">
                {/* Name with overflow handling */}
                <div className="h-full overflow-hidden">
                  <h3 className="text-base font-medium text-white text-left leading-relaxed line-clamp-2" dir="rtl">{hotel.name}</h3>
                </div>
                {/* Absolutely positioned divider */}
                <div className="absolute bottom-0 left-0 right-0 border-b border-blue-800/50"></div>
              </div>
              
              {/* Hotel details - with flex-1 to push button to bottom */}
              <div className="flex flex-col space-y-2.5 flex-1">
                <div className="flex items-start justify-end">
                  <span className="text-gray-300 text-sm text-left leading-relaxed" dir="rtl">{hotel.address}</span>
                  <span className="ml-2 mt-1 text-blue-400">📍</span>
                </div>
                
                {/* Total ratings count */}
                {hotel.totalRatings && (
                  <div className="flex items-center justify-end">
                    <span className="text-gray-400 text-sm">
                      {hotel.totalRatings} דירוגים
                    </span>
                    <span className="ml-2 text-yellow-400">⭐</span>
                  </div>
                )}
                
                {/* Open now status if available */}
                {hotel.isOpenNow !== undefined && (
                  <div className="flex items-center justify-end">
                    <span className={`text-sm ${hotel.isOpenNow ? 'text-green-400' : 'text-red-400'}`}>
                      {hotel.isOpenNow ? 'פתוח עכשיו' : 'סגור עכשיו'}
                    </span>
                    <span className="ml-2 text-blue-400">🕒</span>
                  </div>
                )}
              </div>
              
              {/* Action button - always at bottom */}
              <div className="mt-auto">
                <div className="flex gap-2 mb-2">
              <a
                    href={hotel.website || hotel.link}
                target="_blank"
                rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="block text-center bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-md transition-colors flex-1"
                    dir="rtl"
                  >
                    {hotel.website ? 'לאתר המלון' : 'לפרטים נוספים'}
                  </a>
                  
                  {hotel.reviews && hotel.reviews.length > 0 && (
                    <button
                      onClick={(e) => handleShowReviews(e, hotel.id)}
                      className={`text-center text-white text-sm py-2 px-3 rounded-md transition-colors ${
                        showReviews === hotel.id ? 'bg-purple-700 hover:bg-purple-800' : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                    >
                      <span className="flex items-center justify-center">
                        <span className="mr-1">⭐</span>
                        <span>ביקורות</span>
                      </span>
                    </button>
                  )}
                </div>
                
                {/* Reviews section */}
                {showReviews === hotel.id && hotel.reviews && (
                  <div className="mt-2 bg-slate-700/50 rounded-md p-2 max-h-40 overflow-y-auto text-right" dir="rtl">
                    <h4 className="text-sm font-medium text-blue-200 mb-2">ביקורות אחרונות</h4>
                    {hotel.reviews.map((review, index) => (
                      <div key={index} className="mb-2 pb-2 border-b border-slate-600/50 last:border-0 last:mb-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-yellow-300">{review.rating} ⭐</span>
                          <span className="text-xs text-blue-300">{review.author}</span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1 line-clamp-2">{review.text}</p>
                        <p className="text-xs text-gray-400 mt-1">{review.time}</p>
                      </div>
                    ))}
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

export default Hotels;

