/**
 * MapEventService.js
 * Provides an event-based system for map data updates across components
 */

// Custom event names
export const MAP_EVENTS = {
  DISPLAY_RESTAURANTS: "mapbox:display-restaurants",
  DISPLAY_HOTELS: "mapbox:display-hotels",
  DISPLAY_ATTRACTIONS: "mapbox:display-attractions",
  DISPLAY_ITINERARY_LOCATIONS: "mapbox:display-itinerary-locations",
  DISPLAY_ROUTE: "mapbox:display-route",
  CLEAR_MAP: "mapbox:clear-map",
  FLY_TO_LOCATION: "mapbox:fly-to-location",
  HIGHLIGHT_MARKER: "mapbox:highlight-marker",
  CLEAR_ROUTES: "map:clear-routes",
  RESET_MAP: "map:reset-all",
  FIT_BOUNDS: "map:fit-bounds",
  CHANGE_STYLE: "map:change-style",
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
 * Dispatch an event to display a route on the map connecting multiple locations
 * @param {Array} locations - Array of locations to connect with a route
 * @param {Object} options - Additional options for route display (color, width, etc.)
 */
export const displayRouteOnMap = (locations, options = {}) => {
  if (!locations || locations.length < 2) {
    console.warn("Need at least 2 locations to create a route");
    return;
  }

  // Sort locations by timeOfDay if available to ensure correct route order
  const sortedLocations = [...locations];

  // Define time slot order for sorting
  const timeSlotOrder = {
    morning: 0,
    afternoon: 1,
    evening: 2,
  };

  // Sort by timeOfDay if available
  if (sortedLocations.some((loc) => loc.timeOfDay)) {
    sortedLocations.sort((a, b) => {
      const aOrder = timeSlotOrder[a.timeOfDay] ?? 999;
      const bOrder = timeSlotOrder[b.timeOfDay] ?? 999;
      return aOrder - bOrder;
    });

    console.log(
      "Route locations sorted by time of day:",
      sortedLocations
        .map((loc) => `${loc.name} (${loc.timeOfDay || "unknown"})`)
        .join(" → ")
    );
  }

  // Validate all locations have coordinates
  const validLocations = sortedLocations.filter(
    (loc) => loc && typeof loc.lng === "number" && typeof loc.lat === "number"
  );

  if (validLocations.length < 2) {
    console.warn(
      `Not enough valid coordinates for route. Found ${validLocations.length} valid locations out of ${locations.length}`
    );
    return;
  }

  // Default options for route appearance
  const routeOptions = {
    lineColor: options.lineColor || "#4f46e5", // Default: indigo
    lineWidth: options.lineWidth || 4,
    lineOpacity: options.lineOpacity || 0.7,
    fitBounds: options.fitBounds !== undefined ? options.fitBounds : true,
    animate: options.animate !== undefined ? options.animate : true,
    routeType: options.routeType || "walking", // walking, driving, cycling
    addWaypoints:
      options.addWaypoints !== undefined ? options.addWaypoints : true,
    waypointSize: options.waypointSize || 4,
    waypointColor: options.waypointColor || "#ffffff",
    waypointBorderColor: options.waypointBorderColor || "#4f46e5",
    waypointBorderWidth: options.waypointBorderWidth || 2,
    showDirectionArrows:
      options.showDirectionArrows !== undefined
        ? options.showDirectionArrows
        : true,
    arrowSpacing: options.arrowSpacing || 100, // pixels between direction arrows
    arrowSize: options.arrowSize || 0.8, // relative size multiplier
    arrowColor: options.arrowColor || "#ffffff", // arrow color
    arrowBorderColor: options.arrowBorderColor || "#4f46e5", // arrow border color
    pathStyle: options.pathStyle || "curved", // 'curved' or 'straight'
  };

  // Log the route creation details
  console.log(
    `Creating ${routeOptions.routeType} route between ${validLocations.length} locations:`,
    validLocations
      .map(
        (loc) => loc.name || `[${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}]`
      )
      .join(" → ")
  );

  // Dispatch the enhanced event with all options
  const event = new CustomEvent(MAP_EVENTS.DISPLAY_ROUTE, {
    detail: {
      locations: validLocations,
      options: routeOptions,
    },
  });

  window.dispatchEvent(event);
};

/**
 * Helper function to clean location names by removing HTML tags and emojis
 * @param {string} name - The location name to clean
 * @returns {string} - Cleaned location name
 */
export const cleanName = (name) => {
  if (!name) return "";

  // Remove HTML tags (including markdown bold **)
  let cleaned = name.replace(/(<([^>]+)>|\*\*)/gi, "");

  // Remove emojis (using a simpler approach that doesn't require surrogate pairs)
  cleaned = cleaned.replace(/[\u0080-\uFFFF]/g, "");

  // Remove any remaining square brackets
  cleaned = cleaned.replace(/\[|\]/g, "");

  // Trim whitespace
  return cleaned.trim();
};

/**
 * Extracts and formats location information from itinerary text
 * @param {string} text - Text containing location information
 * @returns {Array} - Array of discovered locations
 */
export const discoverLocations = (text) => {
  if (!text) return [];

  const discoveredLocations = [];
  const processedNames = new Set(); // To avoid duplicates

  // Regex to match emoji + name in square brackets pattern (both HTML span and Markdown formats)
  // Format 1: <span...>📍 [Location Name]</span>
  // Format 2: **📍 [Location Name]**
  // Format 3: 📍 [Location Name]
  const regexPatterns = [
    /<span[^>]*>([^<]*\[[^\]]+\])<\/span>/g, // HTML span format
    /\*\*([^*]*\[[^\]]+\])\*\*/g, // Markdown bold format
    /([^\s]+\s*\[[^\]]+\])/g, // Plain emoji + bracket format (any non-space character)
  ];

  // Process each regex pattern
  for (const regex of regexPatterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const fullMatch = match[1];

      // Extract emoji/marker and location name using a simpler approach
      // Look for the pattern: any character followed by a space and then [text]
      const simpleMatch = fullMatch.match(/([^\s]+)\s*\[([^\]]+)\]/);
      if (simpleMatch) {
        const marker = simpleMatch[1];
        const locationName = simpleMatch[2];
        const cleanedName = cleanName(locationName);

        // Skip if empty or already processed
        if (!cleanedName || processedNames.has(cleanedName)) continue;

        // Determine location type from marker character or pattern
        let locationType = "attraction";

        // Check for known marker patterns without using surrogate pairs
        if (marker.includes("🍽") || marker.includes("restaurant"))
          locationType = "restaurant";
        else if (marker.includes("🏨") || marker.includes("hotel"))
          locationType = "hotel";
        else if (marker.includes("🌆") || marker.includes("evening"))
          locationType = "evening_venue";

        // Add to discovered locations
        discoveredLocations.push({
          name: cleanedName,
          type: locationType,
          marker: marker,
        });

        // Mark as processed
        processedNames.add(cleanedName);
      }
    }
  }

  // Also look for standard links format with coordinates: [Name](lat,lng)
  const coordsRegex = /\[([^\]]+)\]\((-?\d+\.?\d*),(-?\d+\.?\d*)\)/g;
  let coordsMatch;
  while ((coordsMatch = coordsRegex.exec(text)) !== null) {
    const locationName = coordsMatch[1];
    const lat = parseFloat(coordsMatch[2]);
    const lng = parseFloat(coordsMatch[3]);

    const cleanedName = cleanName(locationName);

    // Skip if empty or already processed
    if (!cleanedName || processedNames.has(cleanedName)) continue;

    // Add to discovered locations with coordinates
    discoveredLocations.push({
      name: cleanedName,
      coordinates: { lat, lng },
      type: "attraction", // Default type since we can't tell from coords format
    });

    // Mark as processed
    processedNames.add(cleanedName);
  }

  // Look for formatting without a clear emoji as well
  // Format: **[Location Name]**
  const simpleLocationRegex = /\*\*\s*\[([^\]]+)\]\s*\*\*/g;
  let simpleMatch;
  while ((simpleMatch = simpleLocationRegex.exec(text)) !== null) {
    const locationName = simpleMatch[1];
    const cleanedName = cleanName(locationName);

    // Skip if empty or already processed
    if (!cleanedName || processedNames.has(cleanedName)) continue;

    // Add to discovered locations
    discoveredLocations.push({
      name: cleanedName,
      type: "attraction", // Default type
    });

    // Mark as processed
    processedNames.add(cleanedName);
  }

  return discoveredLocations;
};

/**
 * Extract locations from itinerary text
 * @param {string} itineraryText - The formatted itinerary text
 * @returns {Object} - Object containing arrays of extracted locations
 */
export const extractLocationsFromItinerary = (itineraryText) => {
  if (!itineraryText) return { hotels: [], restaurants: [], attractions: [] };

  // Create regex patterns for different types of locations
  // Updated to support spacing between icon and bracket
  const attractionRegex = /📍\s*\[(.*?)\](?:\((-?\d+\.?\d*),(-?\d+\.?\d*)\))?/g;
  const restaurantRegex = /🍽️\s*\[(.*?)\](?:\((-?\d+\.?\d*),(-?\d+\.?\d*)\))?/g;
  const hotelRegex = /🏨\s*\[(.*?)\](?:\((-?\d+\.?\d*),(-?\d+\.?\d*)\))?/g;
  const eveningRegex = /🌆\s*\[(.*?)\](?:\((-?\d+\.?\d*),(-?\d+\.?\d*)\))?/g;

  // Extract locations using the regex patterns
  const hotels = extractMatchesFromText(itineraryText, hotelRegex, "hotel");
  const restaurants = extractMatchesFromText(
    itineraryText,
    restaurantRegex,
    "restaurant"
  );
  const attractions = extractMatchesFromText(
    itineraryText,
    attractionRegex,
    "attraction"
  );
  const eveningVenues = extractMatchesFromText(
    itineraryText,
    eveningRegex,
    "evening"
  );

  // Merge evening venues with attractions since they're both points of interest
  attractions.push(...eveningVenues);

  // Process the extracted locations to remove duplicates and normalize names
  return {
    hotels: deduplicateLocations(hotels),
    restaurants: deduplicateLocations(restaurants),
    attractions: deduplicateLocations(attractions),
  };
};

/**
 * Extract matches from text using a regex pattern
 * @param {string} text - The text to extract matches from
 * @param {RegExp} pattern - The regex pattern to use
 * @param {string} type - The type of location (hotel, restaurant, attraction)
 * @returns {Array} - Array of extracted locations
 */
function extractMatchesFromText(text, pattern, type) {
  const matches = [];
  let match;

  // Reset the regex pattern to start from the beginning
  pattern.lastIndex = 0;

  // Extract all matches
  while ((match = pattern.exec(text)) !== null) {
    const name = match[1];
    const lat = match[2] ? parseFloat(match[2]) : null;
    const lng = match[3] ? parseFloat(match[3]) : null;

    matches.push({
      name: name,
      originalName: name, // Keep the original name for reference
      lat: lat,
      lng: lng,
      type: type,
    });
  }

  return matches;
}

/**
 * Deduplicate locations by name with smart matching
 * @param {Array} locations - Array of location objects
 * @returns {Array} - Deduplicated array of locations
 */
function deduplicateLocations(locations) {
  if (!locations || locations.length === 0) return [];

  // Special keywords that help identify location types
  const hotelKeywords = [
    "hotel",
    "resort",
    "inn",
    "suites",
    "lodge",
    "hostel",
    "motel",
    "palace",
    "plaza",
    "residence",
    "marriott",
    "hilton",
    "hyatt",
  ];

  // Keywords that indicate check-in/check-out references
  const checkInOutKeywords = [
    "check-in",
    "check in",
    "check-out",
    "check out",
    "arrival",
    "departure",
    "checking in",
    "checking out",
  ];

  // Step 1: Identify check-in/check-out locations and regular locations
  const checkInOutLocations = [];
  const regularLocations = [];

  for (const location of locations) {
    const isCheckInOut = checkInOutKeywords.some((keyword) =>
      location.name.toLowerCase().includes(keyword)
    );

    if (isCheckInOut) {
      // Extract the actual hotel name from check-in/out text
      const hotelName = extractHotelNameFromCheckInOut(location.name);

      // Create a modified version with the extracted name
      checkInOutLocations.push({
        ...location,
        originalName: location.name, // Keep original for reference
        extractedName: hotelName, // Store the extracted name
        normalizedName: normalizeLocationName(hotelName), // Normalize for comparison
      });
    } else {
      // Regular location
      regularLocations.push({
        ...location,
        normalizedName: normalizeLocationName(location.name),
      });
    }
  }

  // Step 2: First process regular locations to establish baseline locations
  const uniqueLocations = [];
  const processedNames = new Set();

  // Add regular locations, deduplicating by normalized name
  for (const location of regularLocations) {
    if (!processedNames.has(location.normalizedName)) {
      processedNames.add(location.normalizedName);
      uniqueLocations.push(location);
    } else {
      // If duplicate found, update coordinates on existing entry if this one has coordinates
      if (location.lat && location.lng) {
        const existingLocation = uniqueLocations.find(
          (l) => l.normalizedName === location.normalizedName
        );
        if (
          existingLocation &&
          (!existingLocation.lat || !existingLocation.lng)
        ) {
          existingLocation.lat = location.lat;
          existingLocation.lng = location.lng;
        }
      }
    }
  }

  // Step 3: Process check-in/out locations with smarter matching
  for (const checkLocation of checkInOutLocations) {
    let matchFound = false;

    // First try exact match with normalized names
    const exactMatch = uniqueLocations.find(
      (loc) => loc.normalizedName === checkLocation.normalizedName
    );

    if (exactMatch) {
      matchFound = true;
      // Update coordinates if needed
      if (
        checkLocation.lat &&
        checkLocation.lng &&
        (!exactMatch.lat || !exactMatch.lng)
      ) {
        exactMatch.lat = checkLocation.lat;
        exactMatch.lng = checkLocation.lng;
      }
    }

    // If no exact match, try partial word matching
    if (!matchFound) {
      // Split names into words for comparison
      const checkWords = checkLocation.normalizedName.split(" ");

      // Try to find a match among existing locations
      for (const existingLocation of uniqueLocations) {
        const existingWords = existingLocation.normalizedName.split(" ");

        // Find matching words (minimum 2 characters to avoid matching on common short words)
        const matchingWords = checkWords.filter(
          (word) => word.length > 2 && existingWords.includes(word)
        );

        // Consider it a match if:
        // 1. At least 2 meaningful words match, or
        // 2. One significant word (>5 chars) matches, or
        // 3. >70% of the words match for location names with multiple words
        const significantWordMatch = matchingWords.some(
          (word) => word.length > 5
        );
        const multipleWordsMatch = matchingWords.length >= 2;
        const highPercentageMatch =
          checkWords.length > 1 &&
          existingWords.length > 1 &&
          matchingWords.length /
            Math.min(checkWords.length, existingWords.length) >
            0.7;

        if (multipleWordsMatch || significantWordMatch || highPercentageMatch) {
          matchFound = true;

          // Update coordinates if needed
          if (
            checkLocation.lat &&
            checkLocation.lng &&
            (!existingLocation.lat || !existingLocation.lng)
          ) {
            existingLocation.lat = checkLocation.lat;
            existingLocation.lng = checkLocation.lng;
          }

          break;
        }
      }
    }

    // If still no match found, try matching based on hotel keywords
    if (!matchFound) {
      // Check if the extracted name contains hotel keywords
      const hasHotelKeyword = hotelKeywords.some((keyword) =>
        checkLocation.extractedName.toLowerCase().includes(keyword)
      );

      if (hasHotelKeyword) {
        // Find hotels in unique locations
        const hotelLocations = uniqueLocations.filter((loc) =>
          hotelKeywords.some((keyword) =>
            loc.name.toLowerCase().includes(keyword)
          )
        );

        // Try basic substring matching
        for (const hotelLocation of hotelLocations) {
          const checkLower = checkLocation.extractedName.toLowerCase();
          const hotelLower = hotelLocation.name.toLowerCase();

          // Check if one name contains the other
          if (
            checkLower.includes(hotelLower) ||
            hotelLower.includes(checkLower)
          ) {
            matchFound = true;

            // Update coordinates if needed
            if (
              checkLocation.lat &&
              checkLocation.lng &&
              (!hotelLocation.lat || !hotelLocation.lng)
            ) {
              hotelLocation.lat = checkLocation.lat;
              hotelLocation.lng = checkLocation.lng;
            }

            break;
          }
        }
      }
    }

    // If no match was found, add as a new location
    if (!matchFound && !processedNames.has(checkLocation.normalizedName)) {
      processedNames.add(checkLocation.normalizedName);

      // Use the extracted name instead of the original check-in/out text
      uniqueLocations.push({
        ...checkLocation,
        name: checkLocation.extractedName || checkLocation.name,
      });
    }
  }

  return uniqueLocations;
}

/**
 * Extract hotel name from check-in/out text
 * @param {string} text - The check-in/out text
 * @returns {string} - The extracted hotel name
 */
function extractHotelNameFromCheckInOut(text) {
  if (!text) return "";

  // Convert text to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();

  // Handle different patterns of check-in/out text with more comprehensive patterns
  const checkInOutPatterns = [
    // Check-in patterns
    /check[\s-]in (?:at|to|for|in) (.*)/i,
    /check[\s-]in: (.*)/i,
    /arrival (?:at|to) (.*)/i,
    /arrive (?:at|to) (.*)/i,
    /checking in (?:at|to) (.*)/i,

    // Check-out patterns
    /check[\s-]out (?:from|of|at) (.*)/i,
    /check[\s-]out: (.*)/i,
    /departure (?:from|of) (.*)/i,
    /departing (?:from|of) (.*)/i,
    /leaving (?:from|of) (.*)/i,
    /checking out (?:from|of) (.*)/i,
  ];

  // Try each pattern to extract the hotel name
  for (const pattern of checkInOutPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const hotelName = match[1].trim();
      // Remove any trailing information like time
      return hotelName.replace(
        /\s+at\s+\d+.*$|\s+by\s+\d+.*$|\s+from\s+\d+.*$/,
        ""
      );
    }
  }

  // Special case for more complex phrasing
  if (
    lowerText.includes("check-in") ||
    lowerText.includes("check in") ||
    lowerText.includes("arrival") ||
    lowerText.includes("arrive")
  ) {
    // Try to find hotel indicators
    const hotelIndicators = [
      "hotel",
      "resort",
      "inn",
      "suites",
      "lodge",
      "motel",
      "palace",
      "plaza",
      "residence",
    ];

    for (const indicator of hotelIndicators) {
      const indicatorPos = lowerText.indexOf(indicator);
      if (indicatorPos !== -1) {
        // Extract text surrounding the indicator to get the full hotel name
        // Find the start of the hotel name by looking for spaces or sentence boundaries
        let startPos = indicatorPos;
        while (
          startPos > 0 &&
          !lowerText.substring(startPos - 1, startPos).match(/[.,:;\s]/)
        ) {
          startPos--;
        }

        // Find the end of the hotel name by looking for sentence end or commas
        let endPos = indicatorPos + indicator.length;
        while (
          endPos < lowerText.length &&
          !lowerText.substring(endPos, endPos + 1).match(/[.,:;]/)
        ) {
          endPos++;
        }

        // Extract and clean the hotel name
        const extractedName = text.substring(startPos, endPos).trim();
        if (extractedName) {
          return extractedName.replace(/^[.,:;\s]+|[.,:;\s]+$/g, "");
        }
      }
    }
  }

  // If no pattern matches, use a more general approach:
  // Remove check-in/out words and common prepositions
  let extracted = text
    .replace(
      /check[\s-]in|check[\s-]out|arrival|departure|checking in|checking out/gi,
      ""
    )
    .replace(/^(at|to|from|of|:)\s+/i, "")
    .replace(/\s+(at|by|from|to)\s+\d+.*$/, "") // Remove time information
    .trim();

  // Try to clean up any remaining artifacts
  if (extracted.match(/^\s*to\s+the\s+/i)) {
    extracted = extracted.replace(/^\s*to\s+the\s+/i, "");
  }

  return extracted;
}

/**
 * Normalize location name for better comparison
 * @param {string} name - The location name
 * @returns {string} - Normalized location name
 */
function normalizeLocationName(name) {
  if (!name) return "";

  // Convert to lowercase
  let normalized = name.toLowerCase();

  // Remove common prefix/suffix terms that don't add value to comparison
  const prefixTerms = ["the ", "hotel ", "resort ", "grand ", "royal "];
  const suffixTerms = [
    " hotel",
    " resort",
    " inn",
    " suites",
    " lodge",
    " hostel",
    " motel",
    " palace",
    " plaza",
  ];

  // Remove prefixes
  for (const prefix of prefixTerms) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.substring(prefix.length);
    }
  }

  // Remove suffixes
  for (const suffix of suffixTerms) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.substring(0, normalized.length - suffix.length);
    }
  }

  // Remove punctuation and extra whitespace
  normalized = normalized
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  // Remove very common words that don't help distinguish hotels
  const commonWords = ["the", "and", "by", "of", "in", "at", "to", "from"];
  const words = normalized.split(" ");
  const filteredWords = words.filter(
    (word) => !commonWords.includes(word) && word.length > 1
  );

  // Join back, ensuring we have something left
  return filteredWords.length > 0 ? filteredWords.join(" ") : normalized;
}

/**
 * Parse and display itinerary locations on the map
 * @param {string} itineraryText - The formatted itinerary text with location markers
 * @param {string} destination - The destination city/location of the itinerary
 * @param {boolean} incrementalMode - If true, don't clear previous locations (for day-by-day display)
 * @returns {Promise<Object>} - The processed locations
 */
export const displayItineraryLocations = async (
  itineraryText,
  destination,
  incrementalMode = false
) => {
  if (!itineraryText) return { hotels: [], restaurants: [], attractions: [] };

  console.log(
    `Extracting locations from itinerary text${
      incrementalMode ? " (incremental mode)" : ""
    }`
  );

  // Store animation session information in window object if not exists
  if (!window.__itineraryAnimationSession) {
    window.__itineraryAnimationSession = {
      timestamp: Date.now(),
      locations: {
        hotels: [],
        restaurants: [],
        attractions: [],
      },
      markersAdded: new Set(),
    };
  }

  // Extract locations from the itinerary text
  const extractedLocations = extractLocationsFromItinerary(itineraryText);

  // Process locations to add coordinates where missing
  const { processItineraryLocations } = await import("./ExternalDataAdapter");
  const newLocations = await processItineraryLocations(
    extractedLocations,
    destination
  );

  // In incremental mode, we need to merge with existing locations
  let mergedLocations;

  if (incrementalMode && window.__itineraryAnimationSession) {
    // Filter out locations we've already added to avoid duplicates
    const session = window.__itineraryAnimationSession;

    // Helper function to check if a location is already in the session
    const isLocationAlreadyAdded = (location, type) => {
      const key = `${type}:${location.name}`;
      if (session.markersAdded.has(key)) {
        return true;
      }
      session.markersAdded.add(key);
      return false;
    };

    // Merge and deduplicate locations
    const mergedHotels = [...session.locations.hotels];
    const mergedRestaurants = [...session.locations.restaurants];
    const mergedAttractions = [...session.locations.attractions];

    // Add new hotels that aren't already in the list
    newLocations.hotels.forEach((hotel) => {
      if (!isLocationAlreadyAdded(hotel, "hotel")) {
        hotel.isNew = true; // Mark as new for animation
        mergedHotels.push(hotel);
      }
    });

    // Add new restaurants that aren't already in the list
    newLocations.restaurants.forEach((restaurant) => {
      if (!isLocationAlreadyAdded(restaurant, "restaurant")) {
        restaurant.isNew = true; // Mark as new for animation
        mergedRestaurants.push(restaurant);
      }
    });

    // Add new attractions that aren't already in the list
    newLocations.attractions.forEach((attraction) => {
      if (!isLocationAlreadyAdded(attraction, "attraction")) {
        attraction.isNew = true; // Mark as new for animation
        mergedAttractions.push(attraction);
      }
    });

    // Update session with merged locations
    session.locations = {
      hotels: mergedHotels,
      restaurants: mergedRestaurants,
      attractions: mergedAttractions,
    };

    mergedLocations = session.locations;

    console.log(`Incremental mode: Total locations after merging: 
      ${mergedHotels.length} hotels, 
      ${mergedRestaurants.length} restaurants, 
      ${mergedAttractions.length} attractions`);
  } else {
    // For non-incremental mode or first run, just use the new locations
    mergedLocations = newLocations;

    // If this is a fresh start (not incremental), reset the session
    if (!incrementalMode) {
      window.__itineraryAnimationSession = {
        timestamp: Date.now(),
        locations: newLocations,
        markersAdded: new Set(),
      };

      // Add all locations to the tracked set
      newLocations.hotels.forEach((hotel) => {
        window.__itineraryAnimationSession.markersAdded.add(
          `hotel:${hotel.name}`
        );
      });

      newLocations.restaurants.forEach((restaurant) => {
        window.__itineraryAnimationSession.markersAdded.add(
          `restaurant:${restaurant.name}`
        );
      });

      newLocations.attractions.forEach((attraction) => {
        window.__itineraryAnimationSession.markersAdded.add(
          `attraction:${attraction.name}`
        );
      });
    }
  }

  // Create a custom event for displaying all itinerary locations at once
  const event = new CustomEvent(MAP_EVENTS.DISPLAY_ITINERARY_LOCATIONS, {
    detail: {
      data: mergedLocations,
      destination,
      incrementalMode: true, // Always use incremental mode to avoid removing markers
      timestamp: window.__itineraryAnimationSession.timestamp,
      animateNewMarkers: incrementalMode, // Only animate new markers in incremental mode
      highlightNewMarkers: incrementalMode, // Highlight newly added markers
    },
  });

  // Use setTimeout to ensure the event is processed in the next event loop
  // This helps prevent potential race conditions during animation
  setTimeout(() => {
    window.dispatchEvent(event);
  }, 10);

  // Fly to the destination only if not in incremental mode
  if (!incrementalMode) {
    const flyEvent = new CustomEvent(MAP_EVENTS.FLY_TO_LOCATION, {
      detail: { locationName: destination },
    });
    window.dispatchEvent(flyEvent);
  } else {
    // In incremental mode, let's just ensure all markers are visible
    // Find a central point from the new locations if possible
    let centerLocation = null;
    const allNewLocations = [
      ...newLocations.attractions,
      ...newLocations.hotels,
      ...newLocations.restaurants,
    ].filter((loc) => loc.lat && loc.lng);

    if (allNewLocations.length > 0) {
      // Use the first location with coordinates as a reference point
      centerLocation = {
        lat: allNewLocations[0].lat,
        lng: allNewLocations[0].lng,
      };

      // Fly to this location with a less aggressive zoom to keep context
      const gentleFlyEvent = new CustomEvent(MAP_EVENTS.FLY_TO_LOCATION, {
        detail: {
          location: centerLocation,
          options: {
            zoom: 13,
            animate: true,
            duration: 1.5,
            essential: true,
          },
        },
      });
      window.dispatchEvent(gentleFlyEvent);
    }
  }

  // Return the merged locations for potential further use
  return mergedLocations;
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

/**
 * Dispatch an event to highlight a specific marker on the map
 * @param {Object} markerInfo - Information about the marker to highlight
 * @param {string} markerInfo.name - Name of the location to highlight
 * @param {string} markerInfo.type - Type of marker (attractions, restaurants, hotels)
 * @param {Object} [markerInfo.coordinates] - Optional coordinates if known
 */
export const highlightMarkerOnMap = (markerInfo) => {
  if (!markerInfo || !markerInfo.name) {
    console.error("Invalid marker info provided for highlighting");
    return;
  }

  console.log(`Highlighting marker: ${markerInfo.name} (${markerInfo.type})`);

  // Add animation options to the event
  const animationOptions = {
    duration: 1500, // Animation duration in ms
    bounce: true, // Whether to bounce the marker
    zoom: true, // Whether to zoom to the marker
    zoomLevel: 15, // Zoom level when zooming to marker
    panToMarker: true, // Whether to pan to the marker
  };

  const event = new CustomEvent(MAP_EVENTS.HIGHLIGHT_MARKER, {
    detail: {
      name: markerInfo.name,
      type: markerInfo.type || "attractions", // Default to attractions if type not provided
      coordinates: markerInfo.coordinates || null,
      animation: animationOptions,
    },
  });

  window.dispatchEvent(event);
};

/**
 * Dispatch an event to clear all routes from the map
 */
export const clearRoutesFromMap = () => {
  window.dispatchEvent(new CustomEvent(MAP_EVENTS.CLEAR_ROUTES));
  console.log("Dispatched event to clear all routes from map");
};

/**
 * Dispatch an event to reset the map completely (clear markers and routes)
 */
export const resetMap = () => {
  window.dispatchEvent(new CustomEvent(MAP_EVENTS.RESET_MAP));
  console.log("Dispatched event to reset the map completely");
};

/**
 * Dispatch an event to fit the map bounds to show all markers and routes
 * @param {Object} options - Options for fitting bounds
 * @param {number} options.padding - Padding around the bounds in pixels
 * @param {number} options.maxZoom - Maximum zoom level
 */
export const fitMapBounds = (options = {}) => {
  window.dispatchEvent(
    new CustomEvent(MAP_EVENTS.FIT_BOUNDS, {
      detail: options,
    })
  );
  console.log("Dispatched event to fit map bounds");
};
