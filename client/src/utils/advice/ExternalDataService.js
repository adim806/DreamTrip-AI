/**
 * ExternalDataService.js
 * Handles processing of external API data (restaurants, hotels, attractions)
 * and connects to the map visualization system
 */

import {
  displayRestaurantsOnMap,
  displayHotelsOnMap,
  displayAttractionsOnMap,
  flyToLocation,
} from "../map/MapEventService.js";

import {
  convertRestaurantsForMap,
  convertHotelsForMap,
  convertAttractionsForMap,
} from "../map/ExternalDataAdapter.js";

import { MAP_EVENTS } from "../map/MapEventService.js";

/**
 * Process restaurant data from external API and display on map
 * @param {Object} restaurantsData - Restaurant data from API response
 */
export const processRestaurantsData = async (restaurantsData) => {
  try {
    console.log("Processing restaurants data for map:", restaurantsData);

    if (!restaurantsData?.success || !restaurantsData.restaurants) {
      console.warn("Invalid restaurants data format");
      return;
    }

    // Make sure we have a location to fallback to
    const locationName = restaurantsData.location || "Tokyo, Japan";
    console.log(`Using location context: ${locationName}`);

    // Convert data to map format
    const mapData = await convertRestaurantsForMap(restaurantsData);
    console.log(`Converted ${mapData.length} restaurants to map format`);

    if (mapData.length > 0) {
      // CRITICAL: First fly to the location by name before displaying markers
      // This ensures the map is positioned correctly before markers are added
      console.log(`Flying to location: ${locationName}`);

      // Create a promise to track the map movement completion
      const mapMovementPromise = new Promise((resolve) => {
        // Listen for one-time event when map movement is complete
        const onMapMoved = () => {
          console.log("Map has finished moving to target location");
          window.removeEventListener("mapbox:movement-complete", onMapMoved);
          resolve();
        };

        window.addEventListener("mapbox:movement-complete", onMapMoved, {
          once: true,
        });

        // Dispatch event to fly to location
        window.dispatchEvent(
          new CustomEvent("mapbox:fly-to-location-name", {
            detail: {
              locationName,
              options: {
                zoom: 12,
                pitch: 45, // Add some pitch for better 3D view
                bearing: 15, // Slight angle for better perspective
              },
              // Set a callback flag to notify when movement is complete
              shouldNotifyOnComplete: true,
            },
          })
        );

        // Fallback timeout in case the event never fires
        setTimeout(resolve, 2000);
      });

      // Wait for the map to finish moving before adding markers
      await mapMovementPromise;

      // Wait an additional short delay to ensure map is stable
      await new Promise((resolve) => setTimeout(resolve, 500));

      // AFTER map is positioned, display the restaurants
      console.log(`Displaying ${mapData.length} restaurants on map`);

      // Use custom event to display restaurants
      window.dispatchEvent(
        new CustomEvent(MAP_EVENTS.DISPLAY_RESTAURANTS, {
          detail: { data: mapData },
        })
      );

      console.log(`Displayed ${mapData.length} restaurants on map`);
    } else {
      console.warn("No restaurant markers to display after processing");

      // Even if we have no restaurants with coordinates, try to at least show the city
      window.dispatchEvent(
        new CustomEvent("mapbox:fly-to-location-name", {
          detail: {
            locationName,
            options: {
              zoom: 12,
            },
          },
        })
      );
    }
  } catch (error) {
    console.error("Error processing restaurant data for map:", error);
  }
};

/**
 * Process hotel data from external API and display on map
 * @param {Object} hotelsData - Hotel data from API response
 */
export const processHotelsData = async (hotelsData) => {
  try {
    console.log("Processing hotels data for map:", hotelsData);

    if (!hotelsData?.success || !hotelsData.hotels) {
      console.warn("Invalid hotels data format");
      return;
    }

    // Make sure we have a location to fallback to
    const locationName = hotelsData.location || "Tokyo, Japan";
    console.log(`Using location context: ${locationName}`);

    // Convert data to map format
    const mapData = await convertHotelsForMap(hotelsData);
    console.log(`Converted ${mapData.length} hotels to map format`);

    if (mapData.length > 0) {
      // CRITICAL: First fly to the location by name before displaying markers
      // This ensures the map is positioned correctly before markers are added
      console.log(`Flying to location: ${locationName}`);

      // Create a promise to track the map movement completion
      const mapMovementPromise = new Promise((resolve) => {
        // Listen for one-time event when map movement is complete
        const onMapMoved = () => {
          console.log("Map has finished moving to target location");
          window.removeEventListener("mapbox:movement-complete", onMapMoved);
          resolve();
        };

        window.addEventListener("mapbox:movement-complete", onMapMoved, {
          once: true,
        });

        // Dispatch event to fly to location
        window.dispatchEvent(
          new CustomEvent("mapbox:fly-to-location-name", {
            detail: {
              locationName,
              options: {
                zoom: 13,
                pitch: 40, // Add some pitch for better 3D view
                bearing: 10, // Slight angle for better perspective
              },
              // Set a callback flag to notify when movement is complete
              shouldNotifyOnComplete: true,
            },
          })
        );

        // Fallback timeout in case the event never fires
        setTimeout(resolve, 2000);
      });

      // Wait for the map to finish moving before adding markers
      await mapMovementPromise;

      // Wait an additional short delay to ensure map is stable
      await new Promise((resolve) => setTimeout(resolve, 500));

      // AFTER map is positioned, display the hotels
      console.log(`Displaying ${mapData.length} hotels on map`);

      // Use custom event to display hotels
      window.dispatchEvent(
        new CustomEvent(MAP_EVENTS.DISPLAY_HOTELS, {
          detail: { data: mapData },
        })
      );

      console.log(`Displayed ${mapData.length} hotels on map`);
    } else {
      console.warn("No hotel markers to display after processing");

      // Even if we have no hotels with coordinates, try to at least show the city
      window.dispatchEvent(
        new CustomEvent("mapbox:fly-to-location-name", {
          detail: {
            locationName,
            options: {
              zoom: 13,
            },
          },
        })
      );
    }
  } catch (error) {
    console.error("Error processing hotel data for map:", error);
  }
};

/**
 * Process attraction data from external API and display on map
 * @param {Object} attractionsData - Attraction data from API response
 */
export const processAttractionsData = async (attractionsData) => {
  try {
    console.log("Processing attractions data for map:", attractionsData);

    if (!attractionsData?.success || !attractionsData.attractions) {
      console.warn("Invalid attractions data format");
      return;
    }

    // Make sure we have a location to fallback to
    const locationName = attractionsData.location || "Tokyo, Japan";
    console.log(`Using location context: ${locationName}`);

    // Convert data to map format
    const mapData = await convertAttractionsForMap(attractionsData);
    console.log(`Converted ${mapData.length} attractions to map format`);

    if (mapData.length > 0) {
      // CRITICAL: First fly to the location by name before displaying markers
      // This ensures the map is positioned correctly before markers are added
      console.log(`Flying to location: ${locationName}`);

      // Create a promise to track the map movement completion
      const mapMovementPromise = new Promise((resolve) => {
        // Listen for one-time event when map movement is complete
        const onMapMoved = () => {
          console.log("Map has finished moving to target location");
          window.removeEventListener("mapbox:movement-complete", onMapMoved);
          resolve();
        };

        window.addEventListener("mapbox:movement-complete", onMapMoved, {
          once: true,
        });

        // Dispatch event to fly to location
        window.dispatchEvent(
          new CustomEvent("mapbox:fly-to-location-name", {
            detail: {
              locationName,
              options: {
                zoom: 12,
                pitch: 35, // Add some pitch for better 3D view
                bearing: 20, // Slight angle for better perspective
              },
              // Set a callback flag to notify when movement is complete
              shouldNotifyOnComplete: true,
            },
          })
        );

        // Fallback timeout in case the event never fires
        setTimeout(resolve, 2000);
      });

      // Wait for the map to finish moving before adding markers
      await mapMovementPromise;

      // Wait an additional short delay to ensure map is stable
      await new Promise((resolve) => setTimeout(resolve, 500));

      // AFTER map is positioned, display the attractions
      console.log(`Displaying ${mapData.length} attractions on map`);

      // Use custom event to display attractions
      window.dispatchEvent(
        new CustomEvent(MAP_EVENTS.DISPLAY_ATTRACTIONS, {
          detail: { data: mapData },
        })
      );

      console.log(`Displayed ${mapData.length} attractions on map`);
    } else {
      console.warn("No attraction markers to display after processing");

      // Even if we have no attractions with coordinates, try to at least show the city
      window.dispatchEvent(
        new CustomEvent("mapbox:fly-to-location-name", {
          detail: {
            locationName,
            options: {
              zoom: 12,
            },
          },
        })
      );
    }
  } catch (error) {
    console.error("Error processing attraction data for map:", error);
  }
};

/**
 * Process any type of external data based on intent type
 * @param {string} intent - Intent type (Find-Restaurants, Find-Hotel, Find-Attractions)
 * @param {Object} data - Data from API response
 */
export const processExternalData = async (intent, data) => {
  console.log(`Processing external data for intent: ${intent}`);
  try {
    switch (intent) {
      case "Find-Restaurants":
        await processRestaurantsData(data);
        break;
      case "Find-Hotel":
        await processHotelsData(data);
        break;
      case "Find-Attractions":
        await processAttractionsData(data);
        break;
      default:
        console.log(`No map visualization available for intent: ${intent}`);
        break;
    }
  } catch (error) {
    console.error(
      `Error processing external data for intent ${intent}:`,
      error
    );
  }
};
