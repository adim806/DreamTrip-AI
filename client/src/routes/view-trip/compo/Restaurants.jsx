import React, { useContext, useEffect } from "react";
import axios from "axios";
import mapboxgl from "mapbox-gl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TripContext } from "@/components/tripcontext/TripProvider";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const fetchRestaurantsData = async (vacation_location) => {
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
  // חיפוש מסעדות – type=restaurant
  const googlePlacesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=restaurant&key=${
    import.meta.env.VITE_GOOGLE_PLACE_API_KEY
  }`;
  const response = await axios.get(
    `${corsProxy}${encodeURIComponent(googlePlacesUrl)}`
  );

  if (!response.data.results.length) {
    throw new Error("לא נמצאו מסעדות באזור זה.");
  }

  // עיבוד הנתונים להצגה
  const restaurantsData = response.data.results.map((restaurant) => ({
    id: restaurant.place_id,
    name: restaurant.name,
    rating: restaurant.rating || "לא זמין",
    address: restaurant.vicinity || "לא ידוע",
    price: restaurant.price_level
      ? `רמת מחיר: ${restaurant.price_level}`
      : "לא זמין",
    thumbnail: restaurant.photos
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${
          restaurant.photos[0].photo_reference
        }&key=${import.meta.env.VITE_GOOGLE_PLACE_API_KEY}`
      : "https://via.placeholder.com/300",
    link: `https://www.google.com/maps/search/?api=1&query=${restaurant.geometry.location.lat},${restaurant.geometry.location.lng}`,
    lat: restaurant.geometry.location.lat,
    lng: restaurant.geometry.location.lng,
  }));

  return restaurantsData;
};

const Restaurants = ({ trip }) => {
  const {
    restaurantsData,
    setRestaurantsData,
    setActiveLayer,
    selectedRestaurant,
    setSelectedRestaurant,
    activeLayer,
  } = useContext(TripContext);

  const queryClient = useQueryClient();

  // שימוש ב-React Query עם הגדרות:
  // - staleTime: 0 (מיד stale)
  // - cacheTime: 300000 (5 דקות במטמון ללא observers)
  const { data, error, isLoading } = useQuery({
    queryKey: ["restaurants", trip?.vacation_location],
    queryFn: () => fetchRestaurantsData(trip?.vacation_location),
    enabled: !!trip?.vacation_location,
    staleTime: 0,
    cacheTime: 1000 * 60 * 5,
  });

  // עדכון Context כאשר מתקבלים הנתונים מה-query
  useEffect(() => {
    if (data) {
      setRestaurantsData(data);
      // עדכון activeLayer – במקרה זה, אנחנו משתמשים במחרוזת פשוטה (למשל "restaurants")
      setActiveLayer("restaurants");
    }
  }, [data, setRestaurantsData, setActiveLayer]);

  // useEffect לניקוי השאילתה מהמטמון כאשר activeLayer אינו "restaurants"
  useEffect(() => {
    let timeoutId;
    // אם activeLayer לא מתחיל ב-"restaurants", קובע טיימאאוט להסרת ה-query מהמטמון
    if (!activeLayer?.startsWith("restaurants")) {
      timeoutId = setTimeout(() => {
        queryClient.removeQueries({
          queryKey: ["restaurants", trip?.vacation_location],
          exact: true,
        });
      }, 1000 * 60 * 5); // 5 דקות
    }
    return () => clearTimeout(timeoutId);
  }, [activeLayer, queryClient, trip?.vacation_location]);

  if (!trip?.vacation_location) {
    return (
      <p className="text-center text-gray-600">בחר יעד כדי להציג מסעדות.</p>
    );
  }

  if (isLoading) {
    return <p className="text-center text-blue-600">טוען מסעדות...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">שגיאה בטעינת המסעדות.</p>;
  }

  const restaurantsList = restaurantsData || data || [];

  if (restaurantsList.length === 0) {
    return (
      <p className="text-center text-gray-600">
        לא נמצאו מסעדות עבור {trip.vacation_location}.
      </p>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-semibold text-center mb-6">
        Recommended Restaurants in: {trip.vacation_location}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurantsList.map((restaurant) => (
          <div
            key={restaurant.id}
            onClick={() => setSelectedRestaurant(restaurant)}
            className={`bg-white rounded-lg shadow-lg overflow-hidden transform transition duration-300 hover:scale-105 cursor-pointer ${
              selectedRestaurant?.id === restaurant.id
                ? "border-4 border-blue-500"
                : ""
            }`}
          >
            <img
              src={restaurant.thumbnail}
              alt={restaurant.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-xl font-bold mb-2">{restaurant.name}</h3>
              <p className="text-gray-700">
                <strong>דירוג:</strong> {restaurant.rating} ⭐
              </p>
              <p className="text-gray-700">
                <strong>מחיר:</strong> {restaurant.price}
              </p>
              <p className="text-gray-600">
                <strong>כתובת:</strong> {restaurant.address}
              </p>
              <a
                href={restaurant.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-blue-500 text-white font-semibold py-2 mt-4 rounded-lg hover:bg-blue-700 transition"
              >
                🔗 לפרטים נוספים
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Restaurants;
