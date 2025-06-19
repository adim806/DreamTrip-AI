import React, { useContext, useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import axios from "axios";
import "mapbox-gl/dist/mapbox-gl.css";
import { TripContext } from "@/components/tripcontext/TripProvider";
import { MAP_EVENTS } from "@/utils/map/MapEventService";
import { getCoordinates } from "@/utils/map/ExternalDataAdapter";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const ViewMap = ({ trip }) => {
  const {
    hotelsData,
    restaurantsData,
    attractionsData,
    setHotelsData,
    setRestaurantsData,
    setAttractionsData,
    activeLayer,
    selectedHotel,
    selectedRestaurant,
    selectedAttraction,
    setSelectedHotel,
    setSelectedRestaurant,
    setSelectedAttraction,
    setActiveLayer,
    currentDestination,
    setCurrentDestination,
    displayMode,
    setDisplayMode,
  } = useContext(TripContext);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  
  // Map configuration state
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/streets-v11");
  const [showBuildingExtrusions, setShowBuildingExtrusions] = useState(false);

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

    // Clear existing hotel markers
    markersRef.current = markersRef.current.filter((marker) => {
      if (marker.type === "hotel") {
        marker.remove();
        return false;
      }
      return true;
    });

    // Import the createMarkerElement function
    import("../../../utils/map/ExternalDataAdapter").then(({ createMarkerElement }) => {
      // Add new hotel markers
      hotels.forEach((hotel) => {
        if (!hotel.lat || !hotel.lng) return;

        // Create popup content
        const popupContent = `
          <div class="popup-content">
            <h3 class="font-bold text-lg">${hotel.name}</h3>
            ${hotel.description ? `<p class="text-sm mt-1">${hotel.description}</p>` : ""}
            ${
              hotel.amenities
                ? `<p class="text-xs mt-1 text-gray-600">${hotel.amenities}</p>`
                : ""
            }
          </div>
        `;

        // Create popup
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          maxWidth: "300px",
        }).setHTML(popupContent);

        // Create marker element using the utility function
        const el = createMarkerElement("hotel", hotel);

        // Create marker
        const marker = new mapboxgl.Marker(el)
        .setLngLat([hotel.lng, hotel.lat])
          .setPopup(popup)
        .addTo(mapRef.current);
        
        // Store hotel data with marker for later reference
        marker.type = "hotel";
        marker.itemData = hotel;

        // Add to markers array
        markersRef.current.push(marker);
      });
    }).catch(error => {
      console.error("Error importing createMarkerElement:", error);
    });
  };

  // פונקציה להצגת סימונים עבור מסעדות
  const displayRestaurantsOnMap = (restaurants) => {
    if (!mapRef.current || !restaurants || restaurants.length === 0) return;

    // Clear existing restaurant markers
    markersRef.current = markersRef.current.filter((marker) => {
      if (marker.type === "restaurant") {
        marker.remove();
        return false;
      }
      return true;
    });

    // Import the createMarkerElement function
    import("../../../utils/map/ExternalDataAdapter").then(({ createMarkerElement }) => {
      // Add new restaurant markers
      restaurants.forEach((restaurant) => {
        if (!restaurant.lat || !restaurant.lng) return;

        // Create popup content
        const popupContent = `
          <div class="popup-content">
            <h3 class="font-bold text-lg">${restaurant.name}</h3>
            ${
              restaurant.cuisine
                ? `<p class="text-sm font-medium text-orange-600">${restaurant.cuisine}</p>`
                : ""
            }
            ${
              restaurant.notes
                ? `<p class="text-sm mt-1">${restaurant.notes}</p>`
                : ""
            }
            ${
              restaurant.price_level
                ? `<p class="text-xs mt-1">Price: ${
                    "$".repeat(restaurant.price_level)
                  }</p>`
                : ""
            }
          </div>
        `;

        // Create popup
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          maxWidth: "300px",
        }).setHTML(popupContent);

        // Create marker element using the utility function
        const el = createMarkerElement("restaurant", restaurant);

        // Create marker
        const marker = new mapboxgl.Marker(el)
        .setLngLat([restaurant.lng, restaurant.lat])
          .setPopup(popup)
        .addTo(mapRef.current);
        
        // Store restaurant data with marker for later reference
        marker.type = "restaurant";
        marker.itemData = restaurant;

        // Add to markers array
        markersRef.current.push(marker);
      });
    }).catch(error => {
      console.error("Error importing createMarkerElement:", error);
    });
  };

  // פונקציה להצגת סימונים עבור אטרקציות
  const displayAttractionsOnMap = (attractions) => {
    if (!mapRef.current || !attractions || attractions.length === 0) return;

    // Clear existing attraction markers
    markersRef.current = markersRef.current.filter((marker) => {
      if (marker.type === "attraction") {
        marker.remove();
        return false;
      }
      return true;
    });

    // Import the createMarkerElement function
    import("../../../utils/map/ExternalDataAdapter").then(({ createMarkerElement }) => {
      // Add new attraction markers
      attractions.forEach((attraction) => {
        if (!attraction.lat || !attraction.lng) return;

        // Create popup content
        const popupContent = `
          <div class="popup-content">
            <h3 class="font-bold text-lg">${attraction.name}</h3>
            ${
              attraction.type
                ? `<p class="text-sm font-medium text-blue-600">${attraction.type}</p>`
                : ""
            }
            ${
              attraction.description
                ? `<p class="text-sm mt-1">${attraction.description}</p>`
                : ""
            }
            ${
              attraction.rating
                ? `<p class="text-xs mt-1">Rating: ${attraction.rating} ⭐</p>`
                : ""
            }
          </div>
        `;

        // Create popup
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          maxWidth: "300px",
        }).setHTML(popupContent);

        // Create marker element using the utility function
        const el = createMarkerElement("attraction", attraction);

        // Create marker
        const marker = new mapboxgl.Marker(el)
        .setLngLat([attraction.lng, attraction.lat])
          .setPopup(popup)
        .addTo(mapRef.current);
        
        // Store attraction data with marker for later reference
        marker.type = "attraction";
        marker.itemData = attraction;

        // Add to markers array
        markersRef.current.push(marker);
      });
    }).catch(error => {
      console.error("Error importing createMarkerElement:", error);
    });
  };

  // Handle flying to a specific location
  const handleFlyToLocation = useCallback((event) => {
    if (!mapRef.current) return;
    
    const { location, options = {} } = event.detail;
    if (!location) return;
    
      const flyOptions = {
        center: [location.lng, location.lat],
      zoom: options.zoom || 15,
        pitch: options.pitch || 0,
        bearing: options.bearing || 0,
      speed: options.speed || 1.2,
      duration: options.duration || 2000,
        ...options
      };
      
    console.log(`🌍 Flying to location: [${location.lng}, ${location.lat}]`);
      mapRef.current.flyTo(flyOptions);
      
      // If notification of completion is requested, dispatch an event when the movement ends
      if (options.shouldNotifyOnComplete) {
        mapRef.current.once('moveend', () => {
          console.log('Map movement complete, notifying listeners');
          window.dispatchEvent(new CustomEvent('mapbox:movement-complete'));
        });
      }
  }, []);

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

  // Define event handler functions with useCallback to prevent unnecessary re-renders
  const handleDisplayRestaurants = useCallback((event) => {
      const { data } = event.detail;
      console.log("📍 Received restaurants data for map:", data.length, "items");
      displayRestaurantsOnMap(data);
      setRestaurantsData(data);
      setActiveLayer("restaurants");
  }, [setRestaurantsData, setActiveLayer]);

  const handleDisplayHotels = useCallback((event) => {
      const { data } = event.detail;
      console.log("📍 Received hotels data for map:", data.length, "items");
      displayHotelsOnMap(data);
      setHotelsData(data);
      setActiveLayer("hotels");
  }, [setHotelsData, setActiveLayer]);

  const handleDisplayAttractions = useCallback((event) => {
      const { data } = event.detail;
      console.log("📍 Received attractions data for map:", data.length, "items");
      displayAttractionsOnMap(data);
      setAttractionsData(data);
      setActiveLayer("attractions");
  }, [setAttractionsData, setActiveLayer]);

  const handleDisplayItineraryLocations = useCallback((event) => {
    const { data, destination } = event.detail;
    console.log("📍 Received itinerary locations for map:", 
      Object.values(data).flat().length, "items");
    
    // Clear existing markers first
      clearMarkers();
    
    // Try to fly to the destination first
    if (destination && destination !== currentDestination) {
      setCurrentDestination(destination);
      
      // Try to fly to the destination
      if (mapRef.current) {
        fetchCoordinates2(destination)
          .then((coords) => {
            if (coords) {
              mapRef.current.flyTo({
                center: [coords.lng, coords.lat],
                zoom: 12,
                essential: true,
                duration: 2000,
              });
              
              // After flying to the destination, display markers sequentially with animation
              mapRef.current.once('moveend', () => {
                displayMarkersSequentially(data);
              });
            } else {
              // If we couldn't get coordinates, still display markers
              displayMarkersSequentially(data);
            }
          })
          .catch((error) => {
            console.error("Error flying to destination:", error);
            // If there was an error, still display markers
            displayMarkersSequentially(data);
          });
      } else {
        // If map isn't ready, display markers directly
        displayMarkersSequentially(data);
      }
    } else {
      // If no destination change, display markers directly
      displayMarkersSequentially(data);
    }
    
    // Show all layers
    setActiveLayer("all");
    
    // Update UI to show we're displaying an itinerary
    setDisplayMode("itinerary");
  }, [
    clearMarkers, 
    currentDestination, 
    fetchCoordinates2, 
    setCurrentDestination, 
    setActiveLayer, 
    setDisplayMode
  ]);

  // Function to display markers sequentially with animation
  const displayMarkersSequentially = (data) => {
    // Store all locations to be displayed in order
    const allLocations = [];
    
    // First add hotels (usually where you start/end the day)
    if (data.hotels && data.hotels.length > 0) {
      data.hotels.forEach(hotel => {
        if (hotel.lat && hotel.lng && !isNaN(hotel.lat) && !isNaN(hotel.lng)) {
          allLocations.push({ ...hotel, type: 'hotel', order: 0 });
        }
      });
    }
    
    // Then add attractions (main activities)
    if (data.attractions && data.attractions.length > 0) {
      data.attractions.forEach((attraction, index) => {
        if (attraction.lat && attraction.lng && !isNaN(attraction.lat) && !isNaN(attraction.lng)) {
          allLocations.push({ ...attraction, type: 'attraction', order: index + 1 });
        }
      });
    }
    
    // Finally add restaurants (usually visited between attractions)
    if (data.restaurants && data.restaurants.length > 0) {
      data.restaurants.forEach((restaurant, index) => {
        if (restaurant.lat && restaurant.lng && !isNaN(restaurant.lat) && !isNaN(restaurant.lng)) {
          allLocations.push({ ...restaurant, type: 'restaurant', order: index + 1 });
        }
      });
    }
    
    // Sort all locations by order
    allLocations.sort((a, b) => a.order - b.order);
    
    // Display markers with a delay between each one for animation effect
    allLocations.forEach((location, index) => {
      setTimeout(() => {
        if (location.type === 'hotel') {
          displayHotelMarker(location);
        } else if (location.type === 'restaurant') {
          displayRestaurantMarker(location);
        } else if (location.type === 'attraction') {
          displayAttractionMarker(location);
        }
      }, index * 100); // 100ms delay between each marker
    });
    
    // Store the data in state for later reference
    setHotelsData(data.hotels || []);
    setRestaurantsData(data.restaurants || []);
    setAttractionsData(data.attractions || []);
  };
  
  // Individual marker display functions for sequential animation
  const displayHotelMarker = (hotel) => {
    if (!mapRef.current || !hotel || !hotel.lat || !hotel.lng) return;
    
    import("../../../utils/map/ExternalDataAdapter").then(({ createMarkerElement }) => {
      // Create popup content
      const popupContent = `
        <div class="popup-content">
          <h3 class="font-bold text-lg">${hotel.name}</h3>
          ${hotel.description ? `<p class="text-sm mt-1">${hotel.description}</p>` : ""}
          ${hotel.price_range ? `<p class="text-xs mt-1">Price: ${hotel.price_range}</p>` : ""}
          ${hotel.rating ? `<p class="text-xs mt-1">Rating: ${hotel.rating} ⭐</p>` : ""}
        </div>
      `;
      
      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        maxWidth: "300px",
      }).setHTML(popupContent);
      
      // Create marker element with animation
      const el = createMarkerElement("hotel", hotel);
      el.className += " marker-animation";
      
      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([hotel.lng, hotel.lat])
        .setPopup(popup)
        .addTo(mapRef.current);
      
      // Store hotel data with marker for later reference
      marker.type = "hotel";
      marker.itemData = hotel;
      
      // Add to markers array
      markersRef.current.push(marker);
    }).catch(error => {
      console.error("Error importing createMarkerElement:", error);
    });
  };
  
  const displayRestaurantMarker = (restaurant) => {
    if (!mapRef.current || !restaurant || !restaurant.lat || !restaurant.lng) return;
    
    import("../../../utils/map/ExternalDataAdapter").then(({ createMarkerElement }) => {
      // Create popup content
      const popupContent = `
        <div class="popup-content">
          <h3 class="font-bold text-lg">${restaurant.name}</h3>
          ${restaurant.cuisine ? `<p class="text-sm font-medium text-orange-600">${restaurant.cuisine}</p>` : ""}
          ${restaurant.notes ? `<p class="text-sm mt-1">${restaurant.notes}</p>` : ""}
          ${restaurant.price_range ? `<p class="text-xs mt-1">Price: ${restaurant.price_range}</p>` : ""}
        </div>
      `;
      
      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        maxWidth: "300px",
      }).setHTML(popupContent);
      
      // Create marker element with animation
      const el = createMarkerElement("restaurant", restaurant);
      el.className += " marker-animation";
      
      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([restaurant.lng, restaurant.lat])
        .setPopup(popup)
        .addTo(mapRef.current);
      
      // Store restaurant data with marker for later reference
      marker.type = "restaurant";
      marker.itemData = restaurant;
      
      // Add to markers array
      markersRef.current.push(marker);
    }).catch(error => {
      console.error("Error importing createMarkerElement:", error);
    });
  };
  
  const displayAttractionMarker = (attraction) => {
    if (!mapRef.current || !attraction || !attraction.lat || !attraction.lng) return;
    
    import("../../../utils/map/ExternalDataAdapter").then(({ createMarkerElement }) => {
      // Create popup content
      const popupContent = `
        <div class="popup-content">
          <h3 class="font-bold text-lg">${attraction.name}</h3>
          ${attraction.type ? `<p class="text-sm font-medium text-blue-600">${attraction.type}</p>` : ""}
          ${attraction.description ? `<p class="text-sm mt-1">${attraction.description}</p>` : ""}
          ${attraction.rating ? `<p class="text-xs mt-1">Rating: ${attraction.rating} ⭐</p>` : ""}
        </div>
      `;
      
      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        maxWidth: "300px",
      }).setHTML(popupContent);
      
      // Create marker element with animation
      const el = createMarkerElement("attraction", attraction);
      el.className += " marker-animation";
      
      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([attraction.lng, attraction.lat])
        .setPopup(popup)
        .addTo(mapRef.current);
      
      // Store attraction data with marker for later reference
      marker.type = "attraction";
      marker.itemData = attraction;
      
      // Add to markers array
      markersRef.current.push(marker);
    }).catch(error => {
      console.error("Error importing createMarkerElement:", error);
    });
  };

  // Handle highlighting a specific marker
  const handleHighlightMarker = useCallback((event) => {
    const { name, type, coordinates, animation } = event.detail;
    
    if (!mapRef.current) return;
    
    console.log(`🔍 Highlighting marker: ${name} (${type})`);
    
    // Find the marker by name and type
    let foundMarker = null;
    
    // First try to find by exact coordinates if provided
    if (coordinates && coordinates.lat && coordinates.lng) {
      foundMarker = markersRef.current.find(
        marker => 
          marker.type === type && 
          marker.itemData && 
          Math.abs(marker.itemData.lat - coordinates.lat) < 0.0001 &&
          Math.abs(marker.itemData.lng - coordinates.lng) < 0.0001
      );
    }
    
    // If not found by coordinates, try by name
    if (!foundMarker) {
      // Case insensitive name search
      const normalizedName = name.toLowerCase().trim();
      foundMarker = markersRef.current.find(
        marker => 
          marker.type === type && 
          marker.itemData && 
          marker.itemData.name && 
          marker.itemData.name.toLowerCase().trim().includes(normalizedName)
      );
      
      // If still not found, try a more flexible search
      if (!foundMarker) {
        // Try to find by partial name match
        foundMarker = markersRef.current.find(
          marker => 
            marker.type === type && 
            marker.itemData && 
            marker.itemData.name && 
            (marker.itemData.name.toLowerCase().includes(normalizedName) || 
             normalizedName.includes(marker.itemData.name.toLowerCase()))
        );
        
        // If still not found, try across all marker types as a last resort
        if (!foundMarker) {
          foundMarker = markersRef.current.find(
            marker => 
              marker.itemData && 
              marker.itemData.name && 
              (marker.itemData.name.toLowerCase().includes(normalizedName) || 
               normalizedName.includes(marker.itemData.name.toLowerCase()))
          );
        }
      }
    }
    
    if (foundMarker) {
      console.log(`✅ Found marker for ${name} in ${type} collection`);
      
      // Reset any previously highlighted markers
      markersRef.current.forEach(marker => {
        if (marker.element) {
          marker.element.classList.remove('highlighted', 'bounce');
          
          // Reset any custom styles
          marker.element.style.zIndex = '';
          marker.element.style.boxShadow = '';
          marker.element.style.transform = '';
          marker.element.style.border = '';
        }
      });
      
      // Highlight the found marker
      if (foundMarker.element) {
        // Add highlighted class
        foundMarker.element.classList.add('highlighted');
        
        // Apply animation if specified
        if (animation?.bounce) {
          foundMarker.element.classList.add('bounce');
        }
        
        // Make the marker stand out
        foundMarker.element.style.zIndex = 999;
        
        // Add a glowing effect based on marker type
        let glowColor = 'rgba(59, 130, 246, 0.5)'; // Default blue for attractions
        
        if (foundMarker.type === 'restaurants') {
          glowColor = 'rgba(220, 38, 38, 0.5)'; // Red for restaurants
        } else if (foundMarker.type === 'hotels') {
          glowColor = 'rgba(168, 85, 247, 0.5)'; // Purple for hotels
        }
        
        foundMarker.element.style.boxShadow = `0 0 0 4px ${glowColor}, 0 0 10px rgba(0, 0, 0, 0.5)`;
        foundMarker.element.style.border = '2px solid white';
        
        // Fly to the marker with animation if requested
        if (animation?.panToMarker && foundMarker.itemData.lat && foundMarker.itemData.lng) {
          mapRef.current.flyTo({
            center: [foundMarker.itemData.lng, foundMarker.itemData.lat],
            zoom: animation?.zoom ? (animation.zoomLevel || 15) : mapRef.current.getZoom(),
            essential: true,
            duration: animation?.duration || 1500,
          });
        }
        
        // Open a popup with information about the location
        if (foundMarker.popup) {
          foundMarker.popup.addTo(mapRef.current);
        }
      }
    } else {
      console.warn(`❌ Could not find marker for ${name} in ${type} collection`);
      
      // If we have coordinates but no marker, we can still fly to the location
      if (coordinates && coordinates.lat && coordinates.lng) {
        console.log(`🌍 Flying to coordinates: [${coordinates.lng}, ${coordinates.lat}]`);
        mapRef.current.flyTo({
          center: [coordinates.lng, coordinates.lat],
          zoom: animation?.zoom ? (animation.zoomLevel || 15) : mapRef.current.getZoom(),
          essential: true,
          duration: animation?.duration || 1500,
        });
      } else {
        // If we have a name but no marker or coordinates, try to geocode the name
        console.log(`🔍 Trying to geocode location name: ${name}`);
        fetchCoordinates2(name)
          .then(coords => {
            if (coords && coords.lat && coords.lng) {
              console.log(`🌍 Found coordinates for ${name}: [${coords.lng}, ${coords.lat}]`);
              mapRef.current.flyTo({
                center: [coords.lng, coords.lat],
                zoom: animation?.zoom ? (animation.zoomLevel || 15) : mapRef.current.getZoom(),
                essential: true,
                duration: animation?.duration || 1500,
              });
            }
          })
          .catch(error => {
            console.error(`Error geocoding ${name}:`, error);
          });
      }
    }
  }, [mapRef, markersRef, fetchCoordinates2]);

  const handleClearMap = useCallback(() => {
    clearMarkers();
  }, [clearMarkers]);
  
  // Handle flying to location by name
  const handleFlyToLocationName = useCallback(async (event) => {
    const { locationName } = event.detail;
    if (!locationName || !mapRef.current) return;
    
    console.log(`🔍 Flying to location by name: ${locationName}`);
    
    try {
      const coords = await fetchCoordinates2(locationName);
      if (coords) {
        mapRef.current.flyTo({
          center: [coords.lng, coords.lat],
          zoom: 15,
          essential: true,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error(`Error flying to location ${locationName}:`, error);
    }
  }, [fetchCoordinates2]);

    // Register event listeners
  useEffect(() => {
    // Register event listeners for map data updates
    window.addEventListener(MAP_EVENTS.DISPLAY_RESTAURANTS, handleDisplayRestaurants);
    window.addEventListener(MAP_EVENTS.DISPLAY_HOTELS, handleDisplayHotels);
    window.addEventListener(MAP_EVENTS.DISPLAY_ATTRACTIONS, handleDisplayAttractions);
    window.addEventListener(MAP_EVENTS.DISPLAY_ITINERARY_LOCATIONS, handleDisplayItineraryLocations);
    window.addEventListener(MAP_EVENTS.CLEAR_MAP, handleClearMap);
    window.addEventListener(MAP_EVENTS.FLY_TO_LOCATION, handleFlyToLocation);
    window.addEventListener(MAP_EVENTS.HIGHLIGHT_MARKER, handleHighlightMarker);
    
    // Add new event listener for location names
    window.addEventListener('mapbox:fly-to-location-name', handleFlyToLocationName);

    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener(MAP_EVENTS.DISPLAY_RESTAURANTS, handleDisplayRestaurants);
      window.removeEventListener(MAP_EVENTS.DISPLAY_HOTELS, handleDisplayHotels);
      window.removeEventListener(MAP_EVENTS.DISPLAY_ATTRACTIONS, handleDisplayAttractions);
      window.removeEventListener(MAP_EVENTS.DISPLAY_ITINERARY_LOCATIONS, handleDisplayItineraryLocations);
      window.removeEventListener(MAP_EVENTS.CLEAR_MAP, handleClearMap);
      window.removeEventListener(MAP_EVENTS.FLY_TO_LOCATION, handleFlyToLocation);
      window.removeEventListener(MAP_EVENTS.HIGHLIGHT_MARKER, handleHighlightMarker);
      
      // Remove new event listener for location names
      window.removeEventListener('mapbox:fly-to-location-name', handleFlyToLocationName);
    };
  }, [
    handleDisplayRestaurants, 
    handleDisplayHotels, 
    handleDisplayAttractions, 
    handleDisplayItineraryLocations, 
    handleClearMap, 
    handleFlyToLocation,
    handleHighlightMarker,
    handleFlyToLocationName
  ]);

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

  // Add CSS styles for marker highlight animation and interactive markers
  useEffect(() => {
    // Create a style element
    const styleEl = document.createElement('style');
    styleEl.id = 'map-marker-styles';
    
    // Add CSS for marker animations
    styleEl.textContent = `
      .custom-marker {
        cursor: pointer;
      }
      
      .marker-container {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 0 4px white, 0 0 0 6px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
        transform-origin: bottom center;
      }
      
      .marker-icon {
        font-size: 18px;
        line-height: 1;
      }
      
      .marker-hover {
        z-index: 10;
      }
      
      .marker-hover .marker-container {
        transform: scale(1.2);
      }
      
      .marker-animation {
        animation: dropIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      
      .marker-highlight {
        animation: bounce 0.8s ease infinite alternate;
      }
      
      @keyframes dropIn {
        0% {
          opacity: 0;
          transform: translateY(-50px) scale(0.5);
        }
        60% {
          opacity: 1;
          transform: translateY(10px) scale(1.1);
        }
        100% {
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes bounce {
        0% {
          transform: translateY(0);
        }
        100% {
          transform: translateY(-10px);
        }
      }
      
      /* Popup styling */
      .mapboxgl-popup-content {
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        border: 1px solid rgba(0,0,0,0.05);
      }
      
      .popup-content h3 {
        margin-top: 0;
        margin-bottom: 5px;
      }
      
      .popup-content p {
        margin: 5px 0;
      }
    `;
    
    // Add the style element to the document head
    document.head.appendChild(styleEl);
    
    // Clean up on unmount
    return () => {
      const existingStyle = document.getElementById('map-marker-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

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
