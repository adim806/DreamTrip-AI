import React, { useContext, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import axios from "axios";
import "mapbox-gl/dist/mapbox-gl.css";
import { TripContext } from "@/components/tripcontext/TripProvider";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const ViewMap = ({ trip }) => {
  const { hotelsData, setHotelsData, activeLayer, selectedHotel } = useContext(TripContext);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // פונקציה שמביאה קואורדינטות (lat, lng) לפי שם המקום
  const fetchCoordinates2 = async (locationName) => {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        locationName
      )}.json?access_token=${mapboxgl.accessToken}`;
      const res = await axios.get(url);
      const features = res.data.features;
      if (features && features.length > 0) {
        return { lng: features[0].center[0], lat: features[0].center[1] };
      }
    } catch (error) {
      console.error("❌ Error fetching coordinates:", error);
    }
    return null;
  };

  const clearMarkers = () => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  };

  const add3DLayers = () => {
    if (!mapRef.current || mapRef.current.getLayer("3d-buildings")) return;
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
          ["coalesce", ["get", "height"], 0],
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

  const updateDestination = async () => {
    if (trip?.vacation_location) {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          trip.vacation_location
        )}.json?access_token=${mapboxgl.accessToken}`;
        const res = await axios.get(url);
        const features = res.data.features;
        if (features && features.length > 0) {
          const coords = features[0].center;
          mapRef.current.flyTo({
            center: coords,
            zoom: 12,
            speed: 1.8,
            curve: 1.5,
          });
          if (!mapRef.current.getLayer("3d-buildings")) {
            add3DLayers();
          }
          clearMarkers();
        }
      } catch (error) {
        console.error("❌ Error updating destination:", error);
      }
    }
  };

  // יצירת סימונים מותאמים אישית עם אפקט כניסה (drop) ואייקון מותאם
  const displayHotelsOnMap = (hotels) => {
    if (!mapRef.current || !hotels || hotels.length === 0) return;
    clearMarkers();

    hotels.forEach((hotel) => {
      if (!hotel.lat || !hotel.lng) return;

      // יצירת אלמנט "outer" – המשמש למיקום על ידי Mapbox
      const markerEl = document.createElement("div");
      markerEl.className = "w-7 h-8 flex items-center justify-center";

      // יצירת אלמנט "inner" – מקבל את העיצוב והאנימציה
      const markerInner = document.createElement("div");
      markerInner.className =
        "w-full h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full shadow-xl animate-drop transition-transform duration-300 ease-in-out flex items-center justify-center";
      
      // אייקון מותאם אישית – כאן השתמשתי באייקון בניין (ניתן להחליף ב-SVG אחר)
      markerInner.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-white">
          <path d="M4 3h16v18H4V3zm2 2v14h12V5H6zm3 2h2v2H9V7zm0 4h2v4H9v-4zm4-4h2v2h-2V7zm0 4h2v4h-2v-4z"/>
        </svg>
      `;
      
      // הוספת האלמנט הפנימי ל-"outer"
      markerEl.appendChild(markerInner);

      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([hotel.lng, hotel.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="text-center">
              <h3 class="text-lg font-semibold text-gray-800">${hotel.name}</h3>
              <p class="text-sm text-gray-600">${hotel.address || "לא ידוע"}</p>
              <img src="https://placehold.co/300x200" alt="hotel image" class="w-full rounded-md mt-2" />
              <a href="${hotel.link}" target="_blank" class="text-blue-500 underline mt-2 block">
                🔗 לפרטים נוספים
              </a>
            </div>
          `)
        )
        .addTo(mapRef.current);

      // שמירת מזהה המלון לסנכרון בין הרשימה למפה
      marker.hotelId = hotel.id;
      markersRef.current.push(marker);

      marker.getElement().addEventListener("click", () => {
        mapRef.current.flyTo({
          center: [hotel.lng, hotel.lat],
          zoom: 15,
          pitch: 60,
          bearing: 30,
          speed: 1.5,
          duration: 1500,
        });
      });
    });
    console.log("✅ Displayed hotels on map");
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

  useEffect(() => {
    if (activeLayer !== "hotels") return;

    const updateAndDisplayHotels = async () => {
      if (!hotelsData || hotelsData.length === 0) {
        console.warn("⚠️ אין נתוני מלונות להצגה");
        return;
      }
      let needUpdate = false;
      const updatedHotels = await Promise.all(
        hotelsData.map(async (hotel) => {
          if (!hotel.lat || !hotel.lng) {
            needUpdate = true;
            const coords = await fetchCoordinates2(hotel.address);
            return coords ? { ...hotel, ...coords } : hotel;
          }
          return hotel;
        })
      );
      if (needUpdate) {
        setHotelsData(updatedHotels);
        displayHotelsOnMap(updatedHotels);
      } else {
        displayHotelsOnMap(hotelsData);
      }
    };
    updateAndDisplayHotels();
  }, [activeLayer, hotelsData, setHotelsData]);

  // כאשר selectedHotel משתנה, מעבירים את המפה למיקומו ומעדכנים את הסימון (האלמנט הפנימי בלבד)
  useEffect(() => {
    if (!selectedHotel || !mapRef.current) return;

    mapRef.current.flyTo({
      center: [selectedHotel.lng, selectedHotel.lat],
      zoom: 17,
      pitch: 60,
      bearing: 30,
      speed: 1.5,
      duration: 2000,
    });

    markersRef.current.forEach((marker) => {
      const innerEl = marker.getElement().firstChild; // האלמנט הפנימי
      if (marker.hotelId === selectedHotel.id) {
        innerEl.classList.add(
          "scale-150",
          "border-2",
          "border-red-500",
          "animate-pulse"
        );
      } else {
        innerEl.classList.remove(
          "scale-150",
          "border-2",
          "border-red-500",
          "animate-pulse"
        );
      }
    });
  }, [selectedHotel]);

  return (
    <div className="flex flex-col h-full w-full box-border bg-black">
      <div
        ref={mapContainerRef}
        className="map-container relative flex-1 w-full h-full"
      ></div>
    </div>
  );
};

export default ViewMap;
