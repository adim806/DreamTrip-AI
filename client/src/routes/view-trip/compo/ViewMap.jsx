import React, { useContext, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import axios from "axios";
import "mapbox-gl/dist/mapbox-gl.css";
import { TripContext } from "@/components/tripcontext/TripProvider";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const ViewMap = ({ trip }) => {
  const {
    hotelsData,
    restaurantsData,
    attractionsData,
    setHotelsData,
    activeLayer,
    selectedHotel,
    selectedRestaurant,
    selectedAttraction,
    setSelectedHotel,
    setSelectedRestaurant,
    setSelectedAttraction,
  } = useContext(TripContext);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // פונקציה לקבלת קואורדינטות לפי שם מקום
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

  // פונקציה להצגת סימונים עבור מלונות
  const displayHotelsOnMap = (hotels) => {
    if (!mapRef.current || !hotels || hotels.length === 0) return;
    clearMarkers();
    hotels.forEach((hotel) => {
      if (!hotel.lat || !hotel.lng) return;
      const markerEl = document.createElement("div");
      markerEl.className = "w-7 h-8 flex items-center justify-center";
      const markerInner = document.createElement("div");
      markerInner.className =
        "w-full h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full shadow-xl animate-drop transition-transform duration-300 ease-in-out flex items-center justify-center";
      markerInner.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-white">
          <path d="M4 3h16v18H4V3zm2 2v14h12V5H6zm3 2h2v2H9V7zm0 4h2v4H9v-4zm4-4h2v2h-2V7zm0 4h2v4h-2v-4z"/>
        </svg>
      `;
      markerEl.appendChild(markerInner);
      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([hotel.lng, hotel.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="text-center">
              <h3 class="text-lg font-semibold text-gray-800">${hotel.name}</h3>
              <p class="text-sm text-gray-600">${hotel.address || "לא ידוע"}</p>
              <img src="https://placehold.co/300x200" alt="hotel image" class="w-full rounded-md mt-2" />
              <a href="${
                hotel.link
              }" target="_blank" class="text-blue-500 underline mt-2 block">🔗 לפרטים נוספים</a>
            </div>
          `)
        )
        .addTo(mapRef.current);
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

  // פונקציה להצגת סימונים עבור מסעדות
  const displayRestaurantsOnMap = (restaurants) => {
    if (!mapRef.current || !restaurants || restaurants.length === 0) return;
    clearMarkers();
    restaurants.forEach((restaurant) => {
      if (!restaurant.lat || !restaurant.lng) return;
      const markerEl = document.createElement("div");
      markerEl.className = "w-10 h-10 flex items-center justify-center";
      const markerInner = document.createElement("div");
      markerInner.className =
        "w-full h-full bg-gradient-to-r from-green-400 to-teal-500 rounded-full shadow-xl animate-drop transition-transform duration-300 ease-in-out flex items-center justify-center";
      markerInner.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-white">
          <path d="M17 2a1 1 0 00-1 1v12a1 1 0 102 0V3a1 1 0 00-1-1z"/>
          <path d="M7 2a1 1 0 00-1 1v12a1 1 0 102 0V3a1 1 0 00-1-1z"/>
          <path d="M7 15a1 1 0 011 1v5h2v-5a1 1 0 112 0v5h2v-5a1 1 0 011-1h2v-2H5v2h2z"/>
        </svg>
      `;
      markerEl.appendChild(markerInner);
      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([restaurant.lng, restaurant.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="text-center">
              <h3 class="text-lg font-semibold text-gray-800">${
                restaurant.name
              }</h3>
              <p class="text-sm text-gray-600">${
                restaurant.address || "לא ידוע"
              }</p>
              <img src="https://placehold.co/300x200" alt="restaurant image" class="w-full rounded-md mt-2" />
              <a href="${
                restaurant.link
              }" target="_blank" class="text-blue-500 underline mt-2 block">🔗 לפרטים נוספים</a>
            </div>
          `)
        )
        .addTo(mapRef.current);
      marker.restaurantId = restaurant.id;
      markersRef.current.push(marker);
      marker.getElement().addEventListener("click", () => {
        mapRef.current.flyTo({
          center: [restaurant.lng, restaurant.lat],
          zoom: 15,
          pitch: 60,
          bearing: 30,
          speed: 1.5,
          duration: 1500,
        });
      });
    });
    console.log("✅ Displayed restaurants on map");
  };

  // פונקציה להצגת סימונים עבור אטרקציות
  const displayAttractionsOnMap = (attractions) => {
    if (!mapRef.current || !attractions || attractions.length === 0) return;
    clearMarkers();
    attractions.forEach((attraction) => {
      if (!attraction.lat || !attraction.lng) return;
      const markerEl = document.createElement("div");
      markerEl.className = "w-10 h-10 flex items-center justify-center";
      const markerInner = document.createElement("div");
      markerInner.className =
        "w-full h-full bg-gradient-to-r from-pink-400 to-red-500 rounded-full shadow-xl animate-drop transition-transform duration-300 ease-in-out flex items-center justify-center";
      markerInner.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="currentColor" class="w-6 h-6 text-white">
          <path d="M316.7 17.8c-2.8-8.6-11-14.4-20-14.4s-17.2 5.8-20 14.4L226.4 150.2 89.6 171c-9 1.3-16.5 7.4-19.3 16.1s-.4 18.1 6.2 24.4l105.7 94.3-27.6 147.9c-1.6 9 2.1 18.1 9.3 23.5s16.3 6.3 24.2 2.5L288 403.8l128.9 71.9c7.9 4.4 17.5 3.8 24.2-2.5s10.9-14.5 9.3-23.5l-27.6-147.9 105.7-94.3c6.6-5.9 9.5-15 6.2-24.4s-10.3-14.8-19.3-16.1L349.6 150.2 316.7 17.8z"/>
        </svg>
      `;
      markerEl.appendChild(markerInner);
      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([attraction.lng, attraction.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="text-center">
              <h3 class="text-lg font-semibold text-gray-800">${
                attraction.name
              }</h3>
              <p class="text-sm text-gray-600">${
                attraction.address || "לא ידוע"
              }</p>
              <img src="https://placehold.co/300x200" alt="attraction image" class="w-full rounded-md mt-2" />
              <a href="${
                attraction.link
              }" target="_blank" class="text-blue-500 underline mt-2 block">🔗 לפרטים נוספים</a>
            </div>
          `)
        )
        .addTo(mapRef.current);
      marker.attractionId = attraction.id;
      markersRef.current.push(marker);
      marker.getElement().addEventListener("click", () => {
        mapRef.current.flyTo({
          center: [attraction.lng, attraction.lat],
          zoom: 15,
          pitch: 60,
          bearing: 30,
          speed: 1.5,
          duration: 1500,
        });
      });
    });
    console.log("✅ Displayed attractions on map");
  };

  // אתחול המפה – מתבצע פעם אחת
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

  // כאשר activeLayer משתנה – מציגים סימונים בהתאם
  useEffect(() => {
    if (activeLayer && activeLayer.startsWith("hotels")) {
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
    } else if (activeLayer && activeLayer.startsWith("restaurants")) {
      if (!restaurantsData || restaurantsData.length === 0) {
        console.warn("⚠️ אין נתוני מסעדות להצגה");
        return;
      }
      displayRestaurantsOnMap(restaurantsData);
    } else if (activeLayer && activeLayer.startsWith("attractions")) {
      if (!attractionsData || attractionsData.length === 0) {
        console.warn("⚠️ אין נתוני אטרקציות להצגה");
        return;
      }
      displayAttractionsOnMap(attractionsData);
    }
  }, [
    activeLayer,
    hotelsData,
    restaurantsData,
    attractionsData,
    setHotelsData,
  ]);

  // איפוס הבחירה כאשר activeLayer משתנה
  useEffect(() => {
    if (activeLayer?.startsWith("hotels")) {
      setSelectedRestaurant(null);
      setSelectedAttraction(null);
    } else if (activeLayer?.startsWith("restaurants")) {
      setSelectedHotel(null);
      setSelectedAttraction(null);
    } else if (activeLayer?.startsWith("attractions")) {
      setSelectedHotel(null);
      setSelectedRestaurant(null);
    }
  }, [
    activeLayer,
    setSelectedHotel,
    setSelectedRestaurant,
    setSelectedAttraction,
  ]);

  // עדכון סימונים בעת בחירת מלון
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
      const innerEl = marker.getElement().firstChild;
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

  // עדכון סימונים בעת בחירת מסעדה
  useEffect(() => {
    if (!selectedRestaurant || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [selectedRestaurant.lng, selectedRestaurant.lat],
      zoom: 17,
      pitch: 60,
      bearing: 30,
      speed: 1.5,
      duration: 2000,
    });
    markersRef.current.forEach((marker) => {
      if (
        marker.restaurantId &&
        marker.restaurantId === selectedRestaurant.id
      ) {
        marker
          .getElement()
          .firstChild.classList.add(
            "scale-150",
            "border-2",
            "border-red-500",
            "animate-pulse"
          );
      } else if (marker.restaurantId) {
        marker
          .getElement()
          .firstChild.classList.remove(
            "scale-150",
            "border-2",
            "border-red-500",
            "animate-pulse"
          );
      }
    });
  }, [selectedRestaurant, activeLayer]);

  // עדכון סימונים בעת בחירת אטרקציה
  useEffect(() => {
    if (!selectedAttraction || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [selectedAttraction.lng, selectedAttraction.lat],
      zoom: 17,
      pitch: 60,
      bearing: 30,
      speed: 1.5,
      duration: 2000,
    });
    markersRef.current.forEach((marker) => {
      if (
        marker.attractionId &&
        marker.attractionId === selectedAttraction.id
      ) {
        marker
          .getElement()
          .firstChild.classList.add(
            "scale-150",
            "border-2",
            "border-red-500",
            "animate-pulse"
          );
      } else if (marker.attractionId) {
        marker
          .getElement()
          .firstChild.classList.remove(
            "scale-150",
            "border-2",
            "border-red-500",
            "animate-pulse"
          );
      }
    });
  }, [selectedAttraction]);

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
