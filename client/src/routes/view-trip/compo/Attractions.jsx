import React, { useContext, useEffect } from "react";
import axios from "axios";
import mapboxgl from "mapbox-gl";
import { useQuery, useQueryClient } from "@tanstack/react-query"; // ודא שאתה משתמש בגרסה העדכנית
import { TripContext } from "@/components/tripcontext/TripProvider";

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

  // שימוש ב-React Query
  const { data, error, isLoading } = useQuery({
    queryKey: ["attractions", trip?.vacation_location],
    queryFn: () => fetchAttractionsData(trip?.vacation_location),
    enabled: !!trip?.vacation_location,
    staleTime: 1000 * 10,
  });

  // עדכון Context כאשר מתקבלים הנתונים
  useEffect(() => {
    if (data) {
      setAttractionsData(data);
      setActiveLayer("attractions_" + Date.now());
    }
  }, [data, setAttractionsData, setActiveLayer]);

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
            <img
              src={attraction.thumbnail}
              alt={attraction.name}
              className="w-full h-48 object-cover"
            />
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
