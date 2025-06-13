/**
 * MapEventService.js
 * Provides an event-based system for map data updates across components
 */

// Custom event names
export const MAP_EVENTS = {
  DISPLAY_RESTAURANTS: "mapbox:display-restaurants",
  DISPLAY_HOTELS: "mapbox:display-hotels",
  DISPLAY_ATTRACTIONS: "mapbox:display-attractions",
  CLEAR_MAP: "mapbox:clear-map",
  FLY_TO_LOCATION: "mapbox:fly-to-location",
};

/**
 * Dispatch an event to display restaurants on the map
 * @param {Array} restaurants - Array of restaurant objects with coordinates
 */
export const displayRestaurantsOnMap = (restaurants) => {
  const event = new CustomEvent(MAP_EVENTS.DISPLAY_RESTAURANTS, {
    detail: { data: restaurants },
  });
  window.dispatchEvent(event);
};

/**
 * Dispatch an event to display hotels on the map
 * @param {Array} hotels - Array of hotel objects with coordinates
 */
export const displayHotelsOnMap = (hotels) => {
  const event = new CustomEvent(MAP_EVENTS.DISPLAY_HOTELS, {
    detail: { data: hotels },
  });
  window.dispatchEvent(event);
};

/**
 * Dispatch an event to display attractions on the map
 * @param {Array} attractions - Array of attraction objects with coordinates
 */
export const displayAttractionsOnMap = (attractions) => {
  const event = new CustomEvent(MAP_EVENTS.DISPLAY_ATTRACTIONS, {
    detail: { data: attractions },
  });
  window.dispatchEvent(event);
};

/**
 * Dispatch an event to clear all markers from the map
 */
export const clearMap = () => {
  const event = new CustomEvent(MAP_EVENTS.CLEAR_MAP);
  window.dispatchEvent(event);
};

/**
 * Dispatch an event to fly to a specific location
 * @param {Object} location - Location object with lng and lat properties
 * @param {Object} options - Optional parameters for the fly animation
 */
export const flyToLocation = (location, options = {}) => {
  const event = new CustomEvent(MAP_EVENTS.FLY_TO_LOCATION, {
    detail: { location, options },
  });
  window.dispatchEvent(event);
};
