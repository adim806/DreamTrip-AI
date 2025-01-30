import React, { useEffect, useState } from "react";
import axios from "axios";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const Hotels = ({ trip }) => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!trip?.vacation_location) return;

    const fetchHotels = async () => {
      setLoading(true);
      setError("");

      try {
        // 🔹 שליפת קואורדינטות מהיעד באמצעות Mapbox
        const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          trip.vacation_location
        )}.json?access_token=${mapboxgl.accessToken}`;

        const geoResponse = await axios.get(geocodingUrl);
        const { features } = geoResponse.data;

        if (!features?.length) {
          setError("לא נמצאו קואורדינטות ליעד.");
          setLoading(false);
          return;
        }

        const [lng, lat] = features[0].center;

        // 🔹 שימוש ב-CORS Proxy לעקיפת החסימה
        const corsProxy = "https://corsproxy.io/?";

        // 🔹 חיפוש מלונות באמצעות Google Places API עם Proxy
        const googlePlacesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=lodging&key=${import.meta.env.VITE_GOOGLE_PLACE_API_KEY}`;
        
        const response = await axios.get(`${corsProxy}${encodeURIComponent(googlePlacesUrl)}`);

        if (!response.data.results.length) {
          setError("לא נמצאו מלונות באזור זה.");
          setLoading(false);
          return;
        }

        // 🔹 עיבוד הנתונים להצגה ברשימה
        const hotelsData = response.data.results.map((hotel) => ({
          name: hotel.name,
          rating: hotel.rating || "לא זמין",
          address: hotel.vicinity || "לא ידוע",
          price: hotel.price_level ? `רמת מחיר: ${hotel.price_level}` : "לא זמין",
          thumbnail: hotel.photos
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${hotel.photos[0].photo_reference}&key=${import.meta.env.VITE_GOOGLE_PLACE_API_KEY}`
            : "https://via.placeholder.com/300",
          link: `https://www.google.com/maps/search/?api=1&query=${hotel.geometry.location.lat},${hotel.geometry.location.lng}`,
        }));

        setHotels(hotelsData);
      } catch (err) {
        setError("שגיאה בטעינת המלונות. נסה שוב מאוחר יותר.");
      }

      setLoading(false);
    };

    fetchHotels();
  }, [trip?.vacation_location]);

  if (!trip?.vacation_location) {
    return <p className="text-center text-gray-600">בחר יעד כדי להציג מלונות.</p>;
  }

  if (loading) {
    return <p className="text-center text-blue-600">טוען מלונות...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  if (hotels.length === 0) {
    return <p className="text-center text-gray-600">לא נמצאו מלונות עבור {trip.vacation_location}.</p>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-semibold text-center mb-6">מלונות מומלצים ב{trip.vacation_location}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {hotels.map((hotel, index) => (
          <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden transform transition duration-300 hover:scale-105">
            <img
              src={hotel.thumbnail}
              alt={hotel.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-xl font-bold mb-2">{hotel.name}</h3>
              <p className="text-gray-700"><strong>דירוג:</strong> {hotel.rating} ⭐</p>
              <p className="text-gray-700"><strong>מחיר:</strong> {hotel.price}</p>
              <p className="text-gray-600"><strong>כתובת:</strong> {hotel.address}</p>
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
