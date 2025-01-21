import React, { useEffect, useState } from "react";
import axios from "axios";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const GeneralInfo = ({ trip }) => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

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
        className="p-6 shadow-md rounded-lg ">
      <h2 className="text-2xl font-bold text-blue-600 mb-4">
        {trip?.vacation_location}
      </h2>
      <h4 className="text-gray-700 mb-6 ">{info?.extract}</h4>
      <img
        src={info?.thumbnail?.source || "/placeholder.jpg"}
        alt={trip?.vacation_location}
        className="w-full h-auto rounded-lg mb-4"
      />
      <a
        href={info.content_urls?.desktop?.page}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline hover:text-blue-700"
      >
        קרא עוד על {trip?.vacation_location} בוויקיפדיה
      </a>
    </div>
  );
};

export default GeneralInfo;
