import React, { useContext, useEffect } from "react";
import axios from "axios";
import mapboxgl from "mapbox-gl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TripContext } from "@/components/tripcontext/TripProvider";

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

  // טיפול בדפי תוצאות נוספים (עד 60 מלונות)
  while (response.data.next_page_token && allHotels.length < 60) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    response = await axios.get(
      `${corsProxy}${encodeURIComponent(googlePlacesUrl)}&pagetoken=${
        response.data.next_page_token
      }`
    );
    allHotels = allHotels.concat(response.data.results);
  }

  const hotelsDataa = allHotels.slice(0, 60).map((hotel) => ({
    id: hotel.place_id,
    name: hotel.name,
    rating: hotel.rating || "לא זמין",
    address: hotel.vicinity || "לא ידוע",
    price: hotel.price_level ? `רמת מחיר: ${hotel.price_level}` : "לא זמין",
    thumbnail: hotel.photos
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${
          hotel.photos[0].photo_reference
        }&key=${import.meta.env.VITE_GOOGLE_PLACE_API_KEY}`
      : "https://via.placeholder.com/300",
    link: `https://www.google.com/maps/search/?api=1&query=${hotel.geometry.location.lat},${hotel.geometry.location.lng}`,
    lat: hotel.geometry.location.lat,
    lng: hotel.geometry.location.lng,
  }));

  return hotelsDataa;
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

  const queryClient = useQueryClient();

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
      }, 10000 ); // 5 דקות
    }
    return () => clearTimeout(timeoutId);
  }, [activeLayer, queryClient, trip?.vacation_location]);

  if (!trip?.vacation_location) {
    return (
      <p className="text-center text-gray-600">
        בחר יעד כדי להציג מלונות.
      </p>
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

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-semibold text-center mb-6">
        Recomended Hotels in: {trip.vacation_location}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {hotelsList.map((hotel) => (
          <div
            key={hotel.id}
            onClick={() => setSelectedHotel(hotel)}
            className={`bg-white rounded-lg shadow-lg overflow-hidden transform transition duration-300 hover:scale-105 cursor-pointer ${
              selectedHotel?.id === hotel.id ? "border-4 border-blue-500" : ""
            }`}
          >
            <img
              src={hotel.thumbnail}
              alt={hotel.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-xl font-bold mb-2">{hotel.name}</h3>
              <p className="text-gray-700">
                <strong>דירוג:</strong> {hotel.rating} ⭐
              </p>
              <p className="text-gray-700">
                <strong>מחיר:</strong> {hotel.price}
              </p>
              <p className="text-gray-600">
                <strong>כתובת:</strong> {hotel.address}
              </p>
              <a
                href={hotel.link}
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

export default Hotels;
