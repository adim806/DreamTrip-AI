import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import axios from "axios";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const ViewMap = ({ trip }) => {
  const mapContainerRef = useRef(null);
  const defaultCenter = [34.7818, 32.0853];

  const fetchPlaces = async (location, type) => {
    try {
      const corsProxy = "https://corsproxy.io/?";
      const googleApiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=5000&type=${type}&key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}`;
      const response = await axios.get(`${corsProxy}${encodeURIComponent(googleApiUrl)}`);
      return response.data.results;
    } catch (error) {
      console.error("Error fetching places:", error);
      return [];
    }
  };
   
  
  

  useEffect(() => {
    const { geo_coordinates, vacation_location } = trip || {};
    const center = geo_coordinates || defaultCenter;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: center,
      zoom: 12,
    });

    map.on("load", async () => {
      new mapboxgl.Marker()
        .setLngLat(center)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setText(
            `Main Destination: ${vacation_location}`
          )
        )
        .addTo(map);

      const location = { lat: center[1], lng: center[0] };
      const restaurants = await fetchPlaces(location, "restaurant");

      restaurants.forEach((place) => {
        const marker = new mapboxgl.Marker()
          .setLngLat([
            place.geometry.location.lng,
            place.geometry.location.lat,
          ])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<h3>${place.name}</h3><p>${place.vicinity}</p>`
            )
          )
          .addTo(map);
      });
    });

    return () => map.remove();
  }, [trip]);

  return <div style={{ width: "100%", height: "450px" }} ref={mapContainerRef}></div>;
};

export default ViewMap;
