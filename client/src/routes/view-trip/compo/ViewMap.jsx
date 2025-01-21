import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import axios from "axios";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const ViewMap = ({ trip }) => {
  const mapContainerRef = useRef(null);
  const [currentLayer, setCurrentLayer] = useState(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

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

  const fetchGooglePlaces = async (location, type) => {
    try {
      const corsProxy = "https://corsproxy.io/?";
      const googleApiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${
        location.lat
      },${location.lng}&radius=10000&type=${type}&key=${
        import.meta.env.VITE_GOOGLE_PLACE_API_KEY
      }`;
      const response = await axios.get(
        `${corsProxy}${encodeURIComponent(googleApiUrl)}`
      );
      return response.data.results || [];
    } catch (error) {
      console.error("Error fetching Google Places:", error);
      return [];
    }
  };

  const fetchWeather = async (coordinates) => {
    try {
      const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${
        coordinates.lat
      }&lon=${coordinates.lng}&appid=${
        import.meta.env.VITE_OPENWEATHER_API_KEY
      }&units=metric`;
      const response = await axios.get(weatherApiUrl);
      return response.data;
    } catch (error) {
      console.error("Error fetching weather data:", error);
      return null;
    }
  };

  const clearMarkers = () => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  };

  const add3DLayers = () => {
    if (!mapRef.current) return;

    if (mapRef.current.getLayer("3d-buildings")) return;

    mapRef.current.addLayer({
      id: "3d-buildings",
      source: "composite",
      "source-layer": "building",
      type: "fill-extrusion",
      paint: {
        "fill-extrusion-color": "#aaa",
        "fill-extrusion-height": [
          "interpolate",
          ["linear"],
          ["zoom"],
          15,
          0,
          15.05,
          ["coalesce", ["get", "height"], 0], // שימוש ב-coalesce לטיפול בערכים null
        ],
        "fill-extrusion-base": [
          "interpolate",
          ["linear"],
          ["zoom"],
          15,
          0,
          15.05,
          ["coalesce", ["get", "min_height"], 0],
        ],
        "fill-extrusion-opacity": 0.6,
      },
    });
  };

  const toggleLayer = async (layerType) => {
    if (!mapRef.current || !trip || !trip.vacation_location) {
      alert("No trip data available or map not initialized.");
      return;
    }

    const coordinates = await fetchCoordinates(trip.vacation_location);
    if (!coordinates) {
      alert("Failed to fetch location coordinates.");
      return;
    }

    const location = { lat: coordinates[1], lng: coordinates[0] };

    clearMarkers();

    if (layerType === "restaurants" || layerType === "attractions") {
      const type =
        layerType === "restaurants" ? "restaurant" : "tourist_attraction";
      const places = await fetchGooglePlaces(location, type);
      if (places.length === 0) {
        alert(`No ${layerType} found in this area.`);
        return;
      }
      places.forEach((place) => {
        const photoUrl =
          place.photos?.[0]?.photo_reference &&
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${
            place.photos[0].photo_reference
          }&key=${import.meta.env.VITE_GOOGLE_PLACE_API_KEY}`;
        const marker = new mapboxgl.Marker({
          color: layerType === "restaurants" ? "blue" : "green",
        })
          .setLngLat([place.geometry.location.lng, place.geometry.location.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div style="text-align:center;">
                <h3 style="font-size:1.2em; color:gray;">${place.name}</h3>
                <p style="color:gray;">${
                  place.vicinity || "No address available"
                }</p>
                ${
                  photoUrl
                    ? `<img src="${photoUrl}" alt="${place.name}" style="width:100%; height:auto; margin-top:10px; border-radius:8px;" />`
                    : ""
                }
              </div>`
            )
          )
          .addTo(mapRef.current);

        // Add click animation and zoom for 3D
        marker.getElement().addEventListener("click", () => {
          mapRef.current.flyTo({
            center: [place.geometry.location.lng, place.geometry.location.lat],
            zoom: 16,
            pitch: 60,
            bearing: 30,
            speed: 1.5,
            duration: 2000,
            curve: 1,
          });
        });

        markersRef.current.push(marker);
      });
    } else if (layerType === "weather") {
      const weatherData = await fetchWeather(location);
      if (!weatherData || !weatherData.weather || !weatherData.main) {
        alert("Failed to fetch weather data.");
        return;
      }

      const marker = new mapboxgl.Marker({ color: "yellow" })
        .setLngLat([location.lng, location.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<h3>Weather</h3>
             <p>${weatherData.weather[0].description}, ${weatherData.main.temp}°C</p>`
          )
        )
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    }

    setCurrentLayer(layerType);
  };

  const updateDestination = async () => {
    if (trip && trip?.vacation_location) {
      const coordinates = await fetchCoordinates(trip?.vacation_location);
      if (coordinates) {
        mapRef.current.flyTo({
          center: coordinates,
          zoom: 12,
          speed: 1.8,
          curve: 1.5,
        });
        // בדוק אם יש שכבה תלת מימדית. אם לא, הוסף אותה
        if (!mapRef.current.getLayer("3d-buildings")) {
          add3DLayers();
        }
        //mapRef.current.setStyle("mapbox://styles/mapbox/streets-v11");
        //mapRef.current.once("style.load", add3DLayers);
      }
    }
  };

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [0, 0],
      zoom: 1.5,
      projection: "globe",
    });

    mapRef.current = map;

    map.on("load", () => {
      map.addControl(new mapboxgl.NavigationControl());
    });

    return () => {
      map.remove();
      clearMarkers();
    };
  }, []);

  useEffect(() => {
    updateDestination();
  }, [trip]);

  return (
    <div
      style={{
        flex: 1, // Take up half the width
        height: "100%", // Full height of parent
        boxSizing: "border-box", // Ensure borders are included in dimensions
        background: "black",
      }}
    >
      {/* Buttons Section */}
      <div className="top-4 w-full flex flex-col items-center gap-4 z-10 bg-opacity-90 rounded-lg shadow-md">
        <button
          className={`px-6 py-2 rounded-lg shadow-lg font-bold text-white transition-transform duration-300 transform ${
            currentLayer === "restaurants"
              ? "bg-gradient-to-r from-blue-500 to-blue-700 scale-105"
              : "bg-gradient-to-r from-blue-300 to-blue-500"
          } hover:scale-110`}
          onClick={() => toggleLayer("restaurants")}
        >
          🍽 Restaurants
        </button>
        <button
          className={`px-6 py-2 rounded-lg shadow-lg font-bold text-white transition-transform duration-300 transform ${
            currentLayer === "attractions"
              ? "bg-gradient-to-r from-green-500 to-green-700 scale-105"
              : "bg-gradient-to-r from-green-300 to-green-500"
          } hover:scale-110`}
          onClick={() => toggleLayer("attractions")}
        >
          🎡 Attractions
        </button>
        <button
          className={`px-6 py-2 rounded-lg shadow-lg font-bold text-white transition-transform duration-300 transform ${
            currentLayer === "weather"
              ? "bg-gradient-to-r from-yellow-500 to-yellow-700 scale-105"
              : "bg-gradient-to-r from-yellow-300 to-yellow-500"
          } hover:scale-110`}
          onClick={() => toggleLayer("weather")}
        >
          🌦 Weather
        </button>
      </div>

      {/* Map Section */}
      <div
        ref={mapContainerRef}
        className="absolute bottom-0"
        style={{
          width: "100%",
          height: "100%",
        }}
      ></div>
    </div>
  );
};

export default ViewMap;
