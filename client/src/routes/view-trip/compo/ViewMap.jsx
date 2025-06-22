import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import mapboxgl from "mapbox-gl";
import axios from "axios";
import "mapbox-gl/dist/mapbox-gl.css";
import { TripContext } from "@/components/tripcontext/TripProvider";
import { MAP_EVENTS } from "@/utils/map/MapEventService";
import { getCoordinates } from "@/utils/map/ExternalDataAdapter";
import * as turf from '@turf/turf';
import { MapboxGeocoder } from '@mapbox/mapbox-gl-geocoder';

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
    activeTripChatId,
  } = useContext(TripContext);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const lastChatIdRef = useRef(null);

  // Map configuration state
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState(
    "mapbox://styles/mapbox/streets-v11"
  );
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

  // Make the clearMarkers function use useCallback to avoid dependency issues
  const clearMarkers = useCallback(() => {
    console.log(`Clearing ${markersRef.current.length} markers from the map`);
    
    // Remove markers using the Mapbox API method
    markersRef.current.forEach((marker) => {
      if (marker && typeof marker.remove === 'function') {
        marker.remove();
      }
    });
    
    // Reset the markers array
    markersRef.current = [];
    
    // Extra cleanup: directly remove any markers that might have been missed
    const domMarkers = document.querySelectorAll('.mapboxgl-marker');
    if (domMarkers.length > 0) {
      console.log(`Found ${domMarkers.length} additional markers in the DOM, removing them directly`);
      domMarkers.forEach(marker => marker.remove());
    }
    
    // Also remove any popups that might be associated with markers
    const popups = document.querySelectorAll('.mapboxgl-popup');
    if (popups.length > 0) {
      console.log(`Removing ${popups.length} popups from the DOM`);
      popups.forEach(popup => popup.remove());
    }
  }, []);

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
        console.log(
          `🌍 Updating map destination to: ${trip.vacation_location}`
        );
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

          // עדכן את היעד הנוכחי
          setCurrentDestination(trip.vacation_location);

          console.log(
            `✅ Map updated to ${trip.vacation_location} at coordinates ${coords}`
          );
        }
      } catch (error) {
        console.error("❌ Error updating destination:", error);
      }
    }
  };

  // פונקציה להצגת סימונים עבור מלונות
  const displayHotelsOnMap = useCallback(
    (hotels) => {
      if (!mapRef.current || !hotels || hotels.length === 0) return;

      // Clear ALL existing markers first
      clearMarkers();

      // Import the createMarkerElement function
      import("../../../utils/map/ExternalDataAdapter")
        .then(({ createMarkerElement }) => {
          // Add new hotel markers
          hotels.forEach((hotel) => {
            if (!hotel.lat || !hotel.lng) return;

            // Create popup content
            const popupContent = `
          <div class="popup-content">
            <h3 class="font-bold text-lg">${hotel.name}</h3>
            ${
              hotel.description
                ? `<p class="text-sm mt-1">${hotel.description}</p>`
                : ""
            }
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
        })
        .catch((error) => {
          console.error("Error importing createMarkerElement:", error);
        });
    },
    [clearMarkers]
  );

  // פונקציה להצגת סימונים עבור מסעדות
  const displayRestaurantsOnMap = useCallback(
    (restaurants) => {
      if (!mapRef.current || !restaurants || restaurants.length === 0) return;

      // Clear ALL existing markers first
      clearMarkers();

      // Import the createMarkerElement function
      import("../../../utils/map/ExternalDataAdapter")
        .then(({ createMarkerElement }) => {
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
                ? `<p class="text-xs mt-1">Price: ${"$".repeat(
                    restaurant.price_level
                  )}</p>`
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
        })
        .catch((error) => {
          console.error("Error importing createMarkerElement:", error);
        });
    },
    [clearMarkers]
  );

  // פונקציה להצגת סימונים עבור אטרקציות
  const displayAttractionsOnMap = useCallback(
    (attractions) => {
      if (!mapRef.current || !attractions || attractions.length === 0) return;

      // Clear ALL existing markers first
      clearMarkers();

      // Import the createMarkerElement function
      import("../../../utils/map/ExternalDataAdapter")
        .then(({ createMarkerElement }) => {
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
        })
        .catch((error) => {
          console.error("Error importing createMarkerElement:", error);
        });
    },
    [clearMarkers]
  );

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
      ...options,
    };

    console.log(`🌍 Flying to location: [${location.lng}, ${location.lat}]`);
    mapRef.current.flyTo(flyOptions);

    // If notification of completion is requested, dispatch an event when the movement ends
    if (options.shouldNotifyOnComplete) {
      mapRef.current.once("moveend", () => {
        console.log("Map movement complete, notifying listeners");
        window.dispatchEvent(new CustomEvent("mapbox:movement-complete"));
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
      
      // Create a global function to forcibly clean the map that can be called from anywhere
      window.__cleanMapCompletely = () => {
        console.log("Global map cleanup called");
        clearMarkers();
        handleClearRoutes();
        handleResetMap();
        
        // Direct DOM manipulation as a last resort
        const elements = document.querySelectorAll('.mapboxgl-marker, .mapboxgl-popup, .map-overlay, .map-legend');
        elements.forEach(el => el.remove());
      };
    });
    
    // Initial cleanup to ensure we start with a clean map
    setTimeout(() => {
      clearMarkers();
      handleClearRoutes();
    }, 100);
    
    return () => {
      // Clean up on unmount
      if (window.__cleanMapCompletely) {
        delete window.__cleanMapCompletely;
      }
      map.remove();
      clearMarkers();
    };
  }, []);

  // Define event handler functions with useCallback to prevent unnecessary re-renders
  const handleDisplayRestaurants = useCallback(
    (event) => {
      const { data } = event.detail;
      console.log(
        "📍 Received restaurants data for map:",
        data.length,
        "items"
      );

      // Clear all markers first
      clearMarkers();

      displayRestaurantsOnMap(data);
      setRestaurantsData(data);
      setActiveLayer("restaurants");
    },
    [setRestaurantsData, setActiveLayer, clearMarkers]
  );

  const handleDisplayHotels = useCallback(
    (event) => {
      const { data } = event.detail;
      console.log("📍 Received hotels data for map:", data.length, "items");

      // Clear all markers first
      clearMarkers();

      displayHotelsOnMap(data);
      setHotelsData(data);
      setActiveLayer("hotels");
    },
    [setHotelsData, setActiveLayer, clearMarkers]
  );

  const handleDisplayAttractions = useCallback(
    (event) => {
      const { data } = event.detail;
      console.log(
        "📍 Received attractions data for map:",
        data.length,
        "items"
      );

      // Clear all markers first
      clearMarkers();

      displayAttractionsOnMap(data);
      setAttractionsData(data);
      setActiveLayer("attractions");
    },
    [setAttractionsData, setActiveLayer, clearMarkers]
  );

  const handleDisplayItineraryLocations = useCallback(
    (event) => {
      const { data, destination } = event.detail;
      console.log(
        "📍 Received itinerary locations for map:",
        Object.values(data).flat().length,
        "items"
      );

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
                mapRef.current.once("moveend", () => {
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
    },
    [
      clearMarkers,
      currentDestination,
      fetchCoordinates2,
      setCurrentDestination,
      setActiveLayer,
      setDisplayMode,
    ]
  );

  // Function to display markers sequentially with animation
  const displayMarkersSequentially = (data) => {
    // Store all locations to be displayed in order
    const allLocations = [];

    // First add hotels (usually where you start/end the day)
    if (data.hotels && data.hotels.length > 0) {
      data.hotels.forEach((hotel) => {
        if (hotel.lat && hotel.lng && !isNaN(hotel.lat) && !isNaN(hotel.lng)) {
          allLocations.push({ ...hotel, type: "hotel", order: 0 });
        }
      });
    }

    // Then add attractions (main activities)
    if (data.attractions && data.attractions.length > 0) {
      data.attractions.forEach((attraction, index) => {
        if (
          attraction.lat &&
          attraction.lng &&
          !isNaN(attraction.lat) &&
          !isNaN(attraction.lng)
        ) {
          allLocations.push({
            ...attraction,
            type: "attraction",
            order: index + 1,
          });
        }
      });
    }

    // Finally add restaurants (usually visited between attractions)
    if (data.restaurants && data.restaurants.length > 0) {
      data.restaurants.forEach((restaurant, index) => {
        if (
          restaurant.lat &&
          restaurant.lng &&
          !isNaN(restaurant.lat) &&
          !isNaN(restaurant.lng)
        ) {
          allLocations.push({
            ...restaurant,
            type: "restaurant",
            order: index + 1,
          });
        }
      });
    }

    // Sort all locations by order
    allLocations.sort((a, b) => a.order - b.order);

    // Display markers with a delay between each one for animation effect
    allLocations.forEach((location, index) => {
      setTimeout(() => {
        if (location.type === "hotel") {
          displayHotelMarker(location);
        } else if (location.type === "restaurant") {
          displayRestaurantMarker(location);
        } else if (location.type === "attraction") {
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

    import("../../../utils/map/ExternalDataAdapter")
      .then(({ createMarkerElement }) => {
        // Create popup content
        const popupContent = `
        <div class="popup-content">
          <h3 class="font-bold text-lg">${hotel.name}</h3>
          ${
            hotel.description
              ? `<p class="text-sm mt-1">${hotel.description}</p>`
              : ""
          }
          ${
            hotel.price_range
              ? `<p class="text-xs mt-1">Price: ${hotel.price_range}</p>`
              : ""
          }
          ${
            hotel.rating
              ? `<p class="text-xs mt-1">Rating: ${hotel.rating} ⭐</p>`
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
      })
      .catch((error) => {
        console.error("Error importing createMarkerElement:", error);
      });
  };

  const displayRestaurantMarker = (restaurant) => {
    if (!mapRef.current || !restaurant || !restaurant.lat || !restaurant.lng)
      return;

    import("../../../utils/map/ExternalDataAdapter")
      .then(({ createMarkerElement }) => {
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
            restaurant.price_range
              ? `<p class="text-xs mt-1">Price: ${restaurant.price_range}</p>`
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
      })
      .catch((error) => {
        console.error("Error importing createMarkerElement:", error);
      });
  };

  const displayAttractionMarker = (attraction) => {
    if (!mapRef.current || !attraction || !attraction.lat || !attraction.lng)
      return;

    import("../../../utils/map/ExternalDataAdapter")
      .then(({ createMarkerElement }) => {
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
      })
      .catch((error) => {
        console.error("Error importing createMarkerElement:", error);
      });
  };

  // Handle flying to location by name
  const handleFlyToLocationName = useCallback(
    async (event) => {
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
    },
    [fetchCoordinates2]
  );

  // Handle displaying a route between locations
  const handleDisplayRoute = useCallback((event) => {
    if (!mapRef.current) return;
    
    const { locations, options } = event.detail;
    
    if (!locations || locations.length < 2) {
      console.warn("Cannot display route: Need at least 2 locations");
      return;
    }
    
    console.log(`🧭 Displaying route between ${locations.length} locations with options:`, options);
    
    // Remove any existing route layers and sources
    if (mapRef.current.getLayer('route-layer')) {
      mapRef.current.removeLayer('route-layer');
    }
    
    if (mapRef.current.getLayer('route-arrows')) {
      mapRef.current.removeLayer('route-arrows');
    }
    
    if (mapRef.current.getLayer('route-waypoints')) {
      mapRef.current.removeLayer('route-waypoints');
    }
    
    if (mapRef.current.getSource('route')) {
      mapRef.current.removeSource('route');
    }
    
    if (mapRef.current.getSource('waypoints')) {
      mapRef.current.removeSource('waypoints');
    }
    
    // Extract coordinates from locations
    const coordinates = locations.map(loc => [loc.lng, loc.lat]);
    
    // Format coordinates for the Mapbox Directions API
    const coordinateString = coordinates.map(coord => coord.join(',')).join(';');
    
    // Determine the profile (walking, cycling, driving)
    const profile = options.routeType || 'walking';
    
    // Build the URL for the Mapbox Directions API
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinateString}?geometries=geojson&overview=full&steps=false&access_token=${mapboxgl.accessToken}`;
    
    console.log("🧭 Fetching route from Mapbox Directions API");
    
    axios.get(url)
      .then(response => {
        const data = response.data;
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const routeGeometry = route.geometry;

          // Add the route to the map
          mapRef.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: routeGeometry
            }
          });

          // Add the main route line
          mapRef.current.addLayer({
            id: 'route-layer',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': options.lineColor || '#4f46e5',
              'line-width': options.lineWidth || 4,
              'line-opacity': options.lineOpacity || 0.7
            }
          });
          
          // Add waypoints if enabled
          if (options.addWaypoints) {
            // Create a GeoJSON source for waypoints
            mapRef.current.addSource('waypoints', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: locations.map((loc, index) => ({
                  type: 'Feature',
                  properties: {
                    title: loc.name || `Location ${index + 1}`,
                    description: loc.address || '',
                    index: index,
                    type: loc.type || 'waypoint',
                    timeOfDay: loc.timeOfDay || ''
                  },
                  geometry: {
                    type: 'Point',
                    coordinates: [loc.lng, loc.lat]
                  }
                }))
              }
            });
            
            // Add waypoint circles
            mapRef.current.addLayer({
              id: 'route-waypoints',
              type: 'circle',
              source: 'waypoints',
              paint: {
                'circle-radius': options.waypointSize || 4,
                'circle-color': options.waypointColor || '#ffffff',
                'circle-stroke-color': options.waypointBorderColor || '#4f46e5',
                'circle-stroke-width': options.waypointBorderWidth || 2,
                'circle-stroke-opacity': 0.9
              }
            });
            
            // Add waypoint numbers
            mapRef.current.addLayer({
              id: 'route-waypoint-labels',
              type: 'symbol',
              source: 'waypoints',
              layout: {
                'text-field': ['number-format', ['get', 'index'], {'min-fraction-digits': 0, 'max-fraction-digits': 0}],
                'text-size': 12,
                'text-offset': [0, 0],
                'text-anchor': 'center',
                'text-allow-overlap': true
              },
              paint: {
                'text-color': '#000000',
                'text-halo-color': '#ffffff',
                'text-halo-width': 1
              }
            });
            
            // Add popups to waypoints
            locations.forEach((loc, index) => {
              // Create popup content
              const popupContent = `
                <div class="waypoint-popup">
                  <h3 class="font-bold text-sm">${loc.name || `Location ${index + 1}`}</h3>
                  ${loc.type ? `<p class="text-xs text-blue-600">${loc.type}</p>` : ''}
                  ${loc.timeOfDay ? `<p class="text-xs">${loc.timeOfDay}</p>` : ''}
                  ${loc.address ? `<p class="text-xs text-gray-600">${loc.address}</p>` : ''}
                </div>
              `;
              
              // Create popup
              const popup = new mapboxgl.Popup({
                offset: 15,
                closeButton: false,
                maxWidth: '200px',
                className: 'waypoint-popup'
              }).setHTML(popupContent);
              
              // Create marker
              const markerEl = document.createElement('div');
              markerEl.className = `waypoint-marker waypoint-${index} ${loc.type || 'default'}-waypoint`;
              markerEl.style.width = '20px';
              markerEl.style.height = '20px';
              markerEl.style.borderRadius = '50%';
              markerEl.style.display = 'flex';
              markerEl.style.justifyContent = 'center';
              markerEl.style.alignItems = 'center';
              markerEl.style.fontSize = '12px';
              markerEl.style.fontWeight = 'bold';
              markerEl.style.backgroundColor = loc.type === 'hotel' ? '#e11d48' : 
                                              loc.type === 'restaurant' ? '#f59e0b' : 
                                              '#3b82f6';
              markerEl.style.color = '#ffffff';
              markerEl.style.border = '2px solid #ffffff';
              markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
              markerEl.textContent = (index + 1).toString();
              
              // Add marker to map
              new mapboxgl.Marker(markerEl)
                .setLngLat([loc.lng, loc.lat])
                .setPopup(popup)
                .addTo(mapRef.current);
            });
          }
          
          // Add direction arrows if enabled
          if (options.showDirectionArrows && routeGeometry.coordinates.length > 1) {
            // Create arrow features along the route
            const arrowFeatures = [];
            const lineDistance = turf.length(routeGeometry);
            const arrowCount = Math.max(2, Math.floor(lineDistance * 3)); // 3 arrows per km
            
            // Place arrows at regular intervals
            for (let i = 1; i < arrowCount; i++) {
              const arrowPosition = i / arrowCount;
              const arrowPoint = turf.along(routeGeometry, lineDistance * arrowPosition);
              
              // Get the bearing (angle) for the arrow
              const pointAhead = turf.along(routeGeometry, lineDistance * (arrowPosition + 0.0001));
              const bearing = turf.bearing(arrowPoint, pointAhead);
              
              arrowFeatures.push({
                type: 'Feature',
                properties: {
                  bearing: bearing
                },
                geometry: {
                  type: 'Point',
                  coordinates: arrowPoint.geometry.coordinates
                }
              });
            }
            
            // Add arrows source
            mapRef.current.addSource('route-arrows-source', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: arrowFeatures
              }
            });
            
            // Add arrows layer
            mapRef.current.addLayer({
              id: 'route-arrows',
              type: 'symbol',
              source: 'route-arrows-source',
              layout: {
                'symbol-placement': 'point',
                'icon-image': 'triangle-11', // Built-in triangle icon
                'icon-size': options.arrowSize || 0.8,
                'icon-rotate': ['get', 'bearing'],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
              },
              paint: {
                'icon-color': options.arrowColor || '#ffffff',
                'icon-halo-color': options.arrowBorderColor || '#4f46e5',
                'icon-halo-width': 1
              }
            });
          }

          // If fitBounds is true, adjust the map view to show the entire route
          if (options.fitBounds) {
            // Create a bounds object that includes all points
            const bounds = new mapboxgl.LngLatBounds();
            coordinates.forEach(coord => bounds.extend(coord));

            // Fit the map to the bounds
            mapRef.current.fitBounds(bounds, {
              padding: 60, // Padding around the route
              duration: 1000, // Animation duration
              maxZoom: 15 // Prevent zooming in too much
            });
          }

          console.log("🧭 Route displayed successfully");
        } else {
          console.warn("No route found between the provided locations");
        }
      })
      .catch(error => {
        console.error("Error fetching route:", error);
      });
  }, []);

  // Handle clearing all routes from the map
  const handleClearRoutes = useCallback(() => {
    if (!mapRef.current) return;
    
    console.log("Clearing all routes from map");
    
    // Get all layers from the map
    const layers = mapRef.current.getStyle().layers;
    
    // Remove all route layers
    layers.forEach(layer => {
      // Check if this is a route layer (by naming convention)
      if (
        layer.id.includes('route-') || 
        layer.id.startsWith('route') ||
        layer.id.includes('-route') ||
        layer.id.includes('waypoint') ||
        layer.id.includes('direction-arrow')
      ) {
        if (mapRef.current.getLayer(layer.id)) {
          console.log(`Removing route layer: ${layer.id}`);
          mapRef.current.removeLayer(layer.id);
        }
      }
    });
    
    // Remove all route sources
    const sourceIds = Object.keys(mapRef.current.getStyle().sources);
    sourceIds.forEach(sourceId => {
      if (
        sourceId.includes('route') || 
        sourceId.includes('waypoint') ||
        sourceId.includes('direction')
      ) {
        if (mapRef.current.getSource(sourceId)) {
          console.log(`Removing route source: ${sourceId}`);
          mapRef.current.removeSource(sourceId);
        }
      }
    });
    
    // Remove any popups that might be associated with routes
    const popups = document.querySelectorAll('.mapboxgl-popup');
    popups.forEach(popup => {
      if (popup.innerHTML.includes('waypoint') || popup.innerHTML.includes('route')) {
        popup.remove();
      }
    });
    
  }, []);

  // Handle complete map reset (markers and routes)
  const handleResetMap = useCallback(() => {
    if (!mapRef.current) return;
    
    console.log("Resetting map completely - clearing all markers and routes");
    
    // Clear all markers
    clearMarkers();
    
    // Clear all routes
    handleClearRoutes();
    
    // Remove all popups
    const popups = document.querySelectorAll('.mapboxgl-popup');
    popups.forEach(popup => {
      popup.remove();
    });
    
    // Remove any custom markers that might have been added
    const customMarkers = document.querySelectorAll('.mapboxgl-marker');
    customMarkers.forEach(marker => {
      marker.remove();
    });
    
    // Clear all sources and layers that might contain routes or markers
    if (mapRef.current.getStyle() && mapRef.current.getStyle().sources) {
      const sources = mapRef.current.getStyle().sources;
      Object.keys(sources).forEach(sourceId => {
        // Be more thorough - check for any custom sources that aren't part of the base map
        if (
          sourceId !== 'composite' && 
          sourceId !== 'mapbox-terrain' && 
          sourceId !== 'mapbox-streets' &&
          !sourceId.startsWith('mapbox-')
        ) {
          try {
            // Remove any associated layers first
            const layers = mapRef.current.getStyle().layers;
            layers.forEach(layer => {
              if (layer.source === sourceId) {
                if (mapRef.current.getLayer(layer.id)) {
                  mapRef.current.removeLayer(layer.id);
                }
              }
            });
            
            // Then remove the source
            if (mapRef.current.getSource(sourceId)) {
              mapRef.current.removeSource(sourceId);
            }
          } catch (err) {
            // Ignore errors if source/layer doesn't exist or is already removed
            console.log(`Error removing source/layer ${sourceId}:`, err.message);
          }
        }
      });
    }
    
    // Clear any legends or overlays
    const legends = document.querySelectorAll('.map-legend, .map-overlay, .mapboxgl-ctrl-group');
    legends.forEach(legend => {
      legend.remove();
    });
    
    // Clear any additional map controls that might have been added
    const controls = document.querySelectorAll('.mapboxgl-ctrl:not(.mapboxgl-ctrl-attrib)');
    controls.forEach(control => {
      if (!control.classList.contains('mapboxgl-ctrl-bottom-right') && 
          !control.classList.contains('mapboxgl-ctrl-bottom-left') &&
          !control.classList.contains('mapboxgl-ctrl-top-right') &&
          !control.classList.contains('mapboxgl-ctrl-top-left')) {
        control.remove();
      }
    });
    
    // Reset any internal tracking variables
    markersRef.current = [];
    
    // EXTRA AGGRESSIVE CLEANUP: Schedule additional cleanup passes
    // This helps catch any markers that might be added asynchronously
    [50, 200, 500].forEach(delay => {
      setTimeout(() => {
        // Double-check for any remaining markers and remove them
        const remainingMarkers = document.querySelectorAll('.mapboxgl-marker');
        if (remainingMarkers.length > 0) {
          console.log(`Found ${remainingMarkers.length} markers in delayed cleanup, removing them`);
          remainingMarkers.forEach(marker => marker.remove());
        }
        
        // Double-check for any remaining popups
        const remainingPopups = document.querySelectorAll('.mapboxgl-popup');
        if (remainingPopups.length > 0) {
          console.log(`Found ${remainingPopups.length} popups in delayed cleanup, removing them`);
          remainingPopups.forEach(popup => popup.remove());
        }
      }, delay);
    });
    
    console.log("Map reset completed");
  }, [clearMarkers, handleClearRoutes]);
  
  // Handle fitting map bounds to show all features
  const handleFitBounds = useCallback((event) => {
    if (!mapRef.current) return;
    
    console.log("Fitting map bounds to show all features");
    
    const options = event.detail || {};
    const padding = options.padding || 50;
    const maxZoom = options.maxZoom || 15;
    
    // Collect all marker coordinates
    const markerCoordinates = [];
    
    // Add marker coordinates
    markersRef.current.forEach(marker => {
      if (marker && marker._lngLat) {
        markerCoordinates.push([marker._lngLat.lng, marker._lngLat.lat]);
      }
    });
    
    // Get all route source coordinates
    const sources = mapRef.current.getStyle().sources;
    Object.keys(sources).forEach(sourceId => {
      if (sourceId.includes('route') && sources[sourceId].type === 'geojson') {
        try {
          const source = mapRef.current.getSource(sourceId);
          if (source && source._data && source._data.geometry && source._data.geometry.coordinates) {
            // Add all coordinates from this route
            markerCoordinates.push(...source._data.geometry.coordinates);
          }
        } catch (err) {
          console.error(`Error accessing route source ${sourceId}:`, err);
        }
      }
    });
    
    // If we have coordinates, fit the map to them
    if (markerCoordinates.length > 0) {
      console.log(`Fitting map to ${markerCoordinates.length} coordinates`);
      
      try {
        // Create a bounds object
        const bounds = markerCoordinates.reduce((bounds, coord) => {
          return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(markerCoordinates[0], markerCoordinates[0]));
        
        // Add padding
        mapRef.current.fitBounds(bounds, {
          padding: {
            top: padding,
            bottom: padding,
            left: padding,
            right: padding
          },
          maxZoom: maxZoom
        });
      } catch (err) {
        console.error("Error fitting bounds:", err);
      }
    }
  }, []);

  // Handle highlighting a specific marker
  const handleHighlightMarker = useCallback(
    (event) => {
      const { name, type, coordinates, animation } = event.detail;

      if (!mapRef.current) return;

      console.log(`🔍 Highlighting marker: ${name} (${type})`);

      // Find the marker by name and type
      let foundMarker = null;

      // First try to find by exact coordinates if provided
      if (coordinates && coordinates.lat && coordinates.lng) {
        foundMarker = markersRef.current.find(
          (marker) =>
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
          (marker) =>
            marker.type === type &&
            marker.itemData &&
            marker.itemData.name &&
            marker.itemData.name.toLowerCase().trim().includes(normalizedName)
        );

        // If still not found, try a more flexible search
        if (!foundMarker) {
          // Try to find by partial name match
          foundMarker = markersRef.current.find(
            (marker) =>
              marker.type === type &&
              marker.itemData &&
              marker.itemData.name &&
              (marker.itemData.name.toLowerCase().includes(normalizedName) ||
                normalizedName.includes(marker.itemData.name.toLowerCase()))
          );

          // If still not found, try across all marker types as a last resort
          if (!foundMarker) {
            foundMarker = markersRef.current.find(
              (marker) =>
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
        markersRef.current.forEach((marker) => {
          if (marker.element) {
            marker.element.classList.remove("highlighted", "bounce");

            // Reset any custom styles
            marker.element.style.zIndex = "";
            marker.element.style.boxShadow = "";
            marker.element.style.transform = "";
            marker.element.style.border = "";
          }
        });

        // Highlight the found marker
        if (foundMarker.element) {
          // Add highlighted class
          foundMarker.element.classList.add("highlighted");

          // Apply animation if specified
          if (animation?.bounce) {
            foundMarker.element.classList.add("bounce");
          }

          // Make the marker stand out
          foundMarker.element.style.zIndex = 999;

          // Add a glowing effect based on marker type
          let glowColor = "rgba(59, 130, 246, 0.5)"; // Default blue for attractions

          if (foundMarker.type === "restaurants") {
            glowColor = "rgba(220, 38, 38, 0.5)"; // Red for restaurants
          } else if (foundMarker.type === "hotels") {
            glowColor = "rgba(168, 85, 247, 0.5)"; // Purple for hotels
          }

          foundMarker.element.style.boxShadow = `0 0 0 4px ${glowColor}, 0 0 10px rgba(0, 0, 0, 0.5)`;
          foundMarker.element.style.border = "2px solid white";

          // Fly to the marker with animation if requested
          if (
            animation?.panToMarker &&
            foundMarker.itemData.lat &&
            foundMarker.itemData.lng
          ) {
            mapRef.current.flyTo({
              center: [foundMarker.itemData.lng, foundMarker.itemData.lat],
              zoom: animation?.zoom
                ? animation.zoomLevel || 15
                : mapRef.current.getZoom(),
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
        console.warn(
          `❌ Could not find marker for ${name} in ${type} collection`
        );

        // If we have coordinates but no marker, we can still fly to the location
        if (coordinates && coordinates.lat && coordinates.lng) {
          console.log(
            `🌍 Flying to coordinates: [${coordinates.lng}, ${coordinates.lat}]`
          );
          mapRef.current.flyTo({
            center: [coordinates.lng, coordinates.lat],
            zoom: animation?.zoom
              ? animation.zoomLevel || 15
              : mapRef.current.getZoom(),
            essential: true,
            duration: animation?.duration || 1500,
          });
        } else {
          // If we have a name but no marker or coordinates, try to geocode the name
          console.log(`🔍 Trying to geocode location name: ${name}`);
          fetchCoordinates2(name)
            .then((coords) => {
              if (coords && coords.lat && coords.lng) {
                console.log(
                  `🌍 Found coordinates for ${name}: [${coords.lng}, ${coords.lat}]`
                );
                mapRef.current.flyTo({
                  center: [coords.lng, coords.lat],
                  zoom: animation?.zoom
                    ? animation.zoomLevel || 15
                    : mapRef.current.getZoom(),
                  essential: true,
                  duration: animation?.duration || 1500,
                });
              }
            })
            .catch((error) => {
              console.error(`Error geocoding ${name}:`, error);
            });
        }
      }
    },
    [mapRef, markersRef, fetchCoordinates2]
  );

  // Set up event listeners
  useEffect(() => {
    // Add event listeners
    window.addEventListener(MAP_EVENTS.DISPLAY_RESTAURANTS, handleDisplayRestaurants);
    window.addEventListener(MAP_EVENTS.DISPLAY_HOTELS, handleDisplayHotels);
    window.addEventListener(MAP_EVENTS.DISPLAY_ATTRACTIONS, handleDisplayAttractions);
    window.addEventListener(MAP_EVENTS.DISPLAY_ITINERARY_LOCATIONS, handleDisplayItineraryLocations);
    window.addEventListener(MAP_EVENTS.DISPLAY_ROUTE, handleDisplayRoute);
    window.addEventListener(MAP_EVENTS.CLEAR_MAP, clearMarkers);
    window.addEventListener(MAP_EVENTS.FLY_TO_LOCATION, handleFlyToLocation);
    window.addEventListener(MAP_EVENTS.HIGHLIGHT_MARKER, handleHighlightMarker);
    window.addEventListener(MAP_EVENTS.CLEAR_ROUTES, handleClearRoutes);
    window.addEventListener(MAP_EVENTS.RESET_MAP, handleResetMap);
    window.addEventListener(MAP_EVENTS.FIT_BOUNDS, handleFitBounds);
    
    // Add listener for tab changes
    const handleTabChange = (event) => {
      const { tab } = event.detail || {};
      
      console.log(`Tab changed to: ${tab}`);
      
      // Always reset the map completely when switching tabs
      handleResetMap();
      
      // Additional actions for specific tabs
      if (tab === 'tripDetails-forced-cleanup' || tab === 'generalInfo-forced-cleanup') {
        // Extra thorough cleanup for Trip Details and General Info tabs
        console.log(`Extra cleanup for ${tab}`);
        
        // Force clear all markers again after a short delay to ensure everything is removed
        setTimeout(() => {
          // Clear all markers again
          clearMarkers();
          
          // Clear all routes again
          handleClearRoutes();
          
          // Remove any remaining popups
          const popups = document.querySelectorAll('.mapboxgl-popup');
          popups.forEach(popup => {
            popup.remove();
          });
          
          // Remove any custom markers that might have been added
          const customMarkers = document.querySelectorAll('.mapboxgl-marker');
          customMarkers.forEach(marker => {
            marker.remove();
          });
          
          // Clear any map overlays or legends
          const overlays = document.querySelectorAll('.map-overlay, .map-legend');
          overlays.forEach(overlay => {
            overlay.remove();
          });
          
          // Reset any active layer indicators
          setActiveLayer('');
          
          console.log(`Forced additional cleanup completed for ${tab}`);
          
          // For generalInfo, reset the map view to the destination
          if (tab === 'generalInfo-forced-cleanup' && trip?.vacation_location) {
            setTimeout(() => {
              updateDestination();
            }, 300);
          }
        }, 100);
        
        // Add a second cleanup pass with a longer delay
        setTimeout(() => {
          console.log("Running second cleanup pass");
          clearMarkers();
          
          // Direct DOM manipulation as a last resort
          const remainingMarkers = document.querySelectorAll('.mapboxgl-marker');
          if (remainingMarkers.length > 0) {
            console.log(`Second cleanup pass: removing ${remainingMarkers.length} markers`);
            remainingMarkers.forEach(marker => marker.remove());
          }
        }, 800);
      } else if (tab === 'generalInfo') {
        // For regular generalInfo tab changes, ensure we reset the map view
        clearMarkers();
        handleClearRoutes();
        
        // Reset the map view to the destination
        if (trip?.vacation_location) {
          setTimeout(() => {
            updateDestination();
          }, 300);
        }
      } else if (tab === 'itinerary') {
        // When switching to the itinerary tab, wait a moment then fit the map to show all routes
        setTimeout(() => {
          handleFitBounds({ detail: { padding: 50 } });
        }, 500);
      } else if (tab === 'hotels' || tab === 'restaurants' || tab === 'attractions') {
        // For these tabs, ensure we start with a clean map
        setTimeout(() => {
          clearMarkers();
        }, 50);
      }
    };
    
    window.addEventListener('tabChange', handleTabChange);

    // Clean up on unmount
    return () => {
      window.removeEventListener(MAP_EVENTS.DISPLAY_RESTAURANTS, handleDisplayRestaurants);
      window.removeEventListener(MAP_EVENTS.DISPLAY_HOTELS, handleDisplayHotels);
      window.removeEventListener(MAP_EVENTS.DISPLAY_ATTRACTIONS, handleDisplayAttractions);
      window.removeEventListener(MAP_EVENTS.DISPLAY_ITINERARY_LOCATIONS, handleDisplayItineraryLocations);
      window.removeEventListener(MAP_EVENTS.DISPLAY_ROUTE, handleDisplayRoute);
      window.removeEventListener(MAP_EVENTS.CLEAR_MAP, clearMarkers);
      window.removeEventListener(MAP_EVENTS.FLY_TO_LOCATION, handleFlyToLocation);
      window.removeEventListener(MAP_EVENTS.HIGHLIGHT_MARKER, handleHighlightMarker);
      window.removeEventListener(MAP_EVENTS.CLEAR_ROUTES, handleClearRoutes);
      window.removeEventListener(MAP_EVENTS.RESET_MAP, handleResetMap);
      window.removeEventListener(MAP_EVENTS.FIT_BOUNDS, handleFitBounds);
      window.removeEventListener('tabChange', handleTabChange);
    };
  }, [
    handleDisplayRestaurants,
    handleDisplayHotels,
    handleDisplayAttractions,
    handleDisplayItineraryLocations,
    handleDisplayRoute,
    handleFlyToLocation,
    handleHighlightMarker,
    clearMarkers,
    handleClearRoutes,
    handleResetMap,
    handleFitBounds,
  ]);

  useEffect(() => {
    updateDestination();
  }, [trip]);

  // כאשר activeLayer משתנה – מציגים סימונים בהתאם
  useEffect(() => {
    // Clear all markers when switching tabs or layers
    console.log(`Active layer changed to: ${activeLayer}`);
    clearMarkers();

    // If activeLayer is empty or generalInfo, don't display any markers
    if (!activeLayer || activeLayer === 'generalInfo' || activeLayer === 'tripDetails') {
      console.log("No markers to display for this layer");
      
      // Extra cleanup for these specific tabs
      const cleanupForEmptyLayers = () => {
        // Remove any markers that might still be present
        const domMarkers = document.querySelectorAll('.mapboxgl-marker');
        if (domMarkers.length > 0) {
          console.log(`Found ${domMarkers.length} markers to remove for empty layer`);
          domMarkers.forEach(marker => marker.remove());
        }
        
        // Remove any popups
        const popups = document.querySelectorAll('.mapboxgl-popup');
        if (popups.length > 0) {
          console.log(`Found ${popups.length} popups to remove for empty layer`);
          popups.forEach(popup => popup.remove());
        }
      };
      
      // Run cleanup immediately and after a short delay
      cleanupForEmptyLayers();
      setTimeout(cleanupForEmptyLayers, 300);
      
      return;
    }

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
    clearMarkers,
    fetchCoordinates2,
    displayHotelsOnMap,
    displayRestaurantsOnMap,
    displayAttractionsOnMap,
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
    const styleEl = document.createElement("style");
    styleEl.id = "map-marker-styles";

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
      const existingStyle = document.getElementById("map-marker-styles");
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // הוספת useEffect שיקשיב לשינויים ב-activeTripChatId ובמיקום הטיול
  useEffect(() => {
    // בדוק אם זהו חדש chatId או שינוי ביעד
    const isChatIdChanged = activeTripChatId !== lastChatIdRef.current;
    const isDestinationChanged =
      trip?.vacation_location && trip.vacation_location !== currentDestination;

    // בדיקה אם צריך לעדכן את המפה
    if ((isChatIdChanged || isDestinationChanged) && trip?.vacation_location) {
      console.log(
        `Map update needed: New destination ${trip.vacation_location} for chat ${activeTripChatId}`
      );

      // שמור את ה-chatId החדש
      lastChatIdRef.current = activeTripChatId;

      // עדכן את היעד הנוכחי
      setCurrentDestination(trip.vacation_location);

      // נקה את כל הסימונים הקיימים
      clearMarkers();

      // חפש את הקואורדינטות של היעד החדש ועדכן את המפה
      updateDestination();
    }
  }, [
    activeTripChatId,
    trip,
    currentDestination,
    setCurrentDestination,
    clearMarkers,
  ]);

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
