import React, { useEffect, useState } from "react";
import axios from "axios";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const GeneralInfo = ({ trip }) => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  console.log("test", trip?.vacation_location);

  const fetchCoordinates = async (locationName) => {
    try {
      const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        locationName
      )}.json?access_token=${mapboxgl.accessToken}`;
      const response = await axios.get(geocodingUrl);
      const { features } = response.data;
      return features?.[0]?.center || null;
    } catch (error) {
      console.error("Error fetching coordinates:", error);
      return null;
    }
  };

  const fetchDestinationInfo = async (coordinates) => {
    try {
      const wikipediaUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${trip?.vacation_location}`;
      const response = await axios.get(wikipediaUrl);
      return response.data;
    } catch (error) {
      console.error("Error fetching destination information:", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        setLoading(true);
        const coordinates = await fetchCoordinates(trip?.vacation_location);
        if (!coordinates) {
          console.error("Coordinates not found");
          setLoading(false);
          return;
        }

        const destinationInfo = await fetchDestinationInfo(coordinates);
        setInfo(destinationInfo);
      } catch (error) {
        console.error("Error fetching general info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [trip?.vacation_location]);

  if (loading) {
    return <p className="text-center text-gray-500">טוען מידע...</p>;
  }

  if (!info) {
    return <p className="text-center text-red-500">לא נמצא מידע על היעד.</p>;
  }

  return (
    <div
      className="p-6 rounded-lg bg-white overflow-auto min-h-screen"
      style={{
        maxHeight: "100%", // מגביל את גובה הקונטיינר
        maxWidth: "100%", // מגביל את רוחב הקונטיינר
        boxSizing: "border-box", // מוודא שכל תוכן כולל Padding נלקח בחשבון
      }}
    >
      <h1
        className="text-2xl font-bold text-blue-600 mb-4 leading-tight"
        style={{
          wordBreak: "break-word", // מחלק מילים ארוכות לשורות
          overflow: "hidden", // מונע גלישה של הטקסט מחוץ לקונטיינר
          textOverflow: "ellipsis", // מוסיף שלוש נקודות בסוף במידת הצורך
          display: "-webkit-box", // מאפשר חיתוך שורות בטקסט
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 2, // מצמצם לכמות מקסימלית של שורות
        }}
      >
        {trip?.vacation_location}
      </h1>
      <p
        className="text-gray-700 mb-6 leading-relaxed"
        style={{
          wordBreak: "break-word", // מחלק טקסט ארוך לשורות
          overflow: "hidden", // מונע גלישה של הטקסט מחוץ לקונטיינר
          textOverflow: "ellipsis", // מוסיף שלוש נקודות בסוף במידת הצורך
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 4, // מגביל את כמות השורות לטקסט
        }}
      >
        {info?.extract}
      </p>
      <img
        src={
          info?.thumbnail?.source
            ? `${info.thumbnail.source.replace(/\/\d+px-/, "/600px-")}`
            : "/placeholder.jpg"
        }
        alt={trip?.vacation_location}
        className="w-full h-auto rounded-lg mb-4"
        style={{
          maxWidth: "100%", // מוודא שהתמונה לא תחרוג מגבולות הקונטיינר
          maxHeight: "300px", // מגביל את גובה התמונה
          objectFit: "cover", // מתאימה את התמונה למיכל
        }}
      />

      <a
        href={info.content_urls?.desktop?.page}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline hover:text-blue-700"
        style={{
          wordBreak: "break-word", // מונע גלישה של הטקסט בקישור
        }}
      >
        קרא עוד על {trip?.vacation_location} בוויקיפדיה
      </a>
    </div>
  );
};

export default GeneralInfo;
