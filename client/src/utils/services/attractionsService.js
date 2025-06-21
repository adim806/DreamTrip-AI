/**
 * Google Places API based attractions service
 * Provides functionality to search for attractions using Google Places API
 */

/**
 * Fetches attractions data from Google Places API
 *
 * @param {Object} params - Search parameters
 * @param {string} params.location - The location to search for attractions
 * @param {string} params.city - The city to search for attractions
 * @param {string} params.country - The country to search for attractions
 * @param {Object} params.filters - User filters
 * @param {string} params.filters.category - Category of attractions (museum, park, etc.)
 * @param {number} params.filters.rating - Minimum rating (1-5)
 * @returns {Promise<Object>} - Attractions data response
 */
export const fetchAttractionRecommendations = async (params) => {
  // Destructure at the top level so these variables are accessible in catch blocks
  const { location, city, country, filters = {} } = params || {};

  // Make sure we have a location to search with
  const searchLocation = location || city;

  if (!searchLocation) {
    console.error("Location is required for attractions search");
    return {
      success: false,
      error: "Location is required for attractions search",
    };
  }

  try {
    console.log(
      `Fetching attractions for ${searchLocation} with filters:`,
      filters
    );

    // Try to get real data from API
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // For now, return simulated data based on the location
      const attractionsData = simulateAttractionData(searchLocation, {
        ...filters,
        country: country,
      });

      return {
        success: true,
        location: searchLocation,
        country: country || null,
        attractions: attractionsData,
        source: "Simulated data",
      };
    } catch (apiError) {
      console.warn("API call failed, using fallback data:", apiError);
      // Fall back to simulated data
      const attractionsData = simulateAttractionData(searchLocation, filters);

      return {
        success: true,
        location: searchLocation,
        country: country || null,
        attractions: attractionsData,
        source: "Fallback simulated data",
      };
    }
  } catch (error) {
    console.error("Error in fetchAttractionRecommendations:", error);
    return {
      success: false,
      error: `Failed to fetch attractions: ${error.message}`,
      source: "Error",
    };
  }
};

/**
 * Process attraction results from Google Places API
 *
 * @param {Array} results - Raw results from Places API
 * @param {Object} filters - User filters
 * @param {string} apiKey - Google Places API key for photos
 * @returns {Array} - Processed attraction data
 */
async function processAttractionResults(results, filters, apiKey) {
  console.log("Processing attraction results with filters:", filters);

  // Scoring function to rank attractions based on user preferences
  const scoreAttraction = (attraction) => {
    let score = 0;

    // Base score from rating (0-5 points)
    score += attraction.rating || 0;

    // Apply category filters if specified
    if (filters.category && attraction.types) {
      const normalizedCategory = filters.category.toLowerCase();
      const matchingType = attraction.types.some((type) =>
        type.toLowerCase().includes(normalizedCategory)
      );

      // Significant boost for matching the requested category
      if (matchingType) {
        score += 3;
      }
    }

    // Adjust for rating requirement
    if (filters.rating) {
      const minRating = parseFloat(filters.rating);
      // Attractions that meet or exceed the minimum rating get bonus points
      if (attraction.rating >= minRating) {
        score += 2;
        // Extra bonus for exceeding the minimum rating
        score += (attraction.rating - minRating) * 0.5;
      } else {
        // Significant penalty for not meeting minimum rating
        score -= 5;
      }
    }

    // Ensure top-rated attractions still score well
    if (attraction.rating >= 4.5) {
      score += 1;
    }

    // Adjust for review count if available (more reviews = more reliable rating)
    if (attraction.user_ratings_total) {
      score += Math.min(attraction.user_ratings_total / 1000, 1); // Up to 1 extra point
    }

    return score;
  };

  // Apply filters based on user preferences
  let filteredResults = [...results];

  // Filter by minimum rating if specified
  if (filters.rating) {
    const minRating = parseFloat(filters.rating);
    filteredResults = filteredResults.filter(
      (attraction) => !attraction.rating || attraction.rating >= minRating
    );

    console.log(
      `Filtered to ${filteredResults.length} attractions with rating >= ${minRating}`
    );
  }

  // Filter by category if specified
  if (filters.category) {
    const normalizedCategory = filters.category.toLowerCase();

    // Check if the attraction types include the specified category
    filteredResults = filteredResults.filter((attraction) => {
      if (!attraction.types || attraction.types.length === 0) {
        return true; // Keep attractions without type information
      }

      return attraction.types.some((type) =>
        type.toLowerCase().includes(normalizedCategory)
      );
    });

    console.log(
      `Filtered to ${filteredResults.length} attractions matching category: ${filters.category}`
    );
  }

  // Score and sort attractions
  const scoredAttractions = filteredResults.map((attraction) => ({
    attraction,
    score: scoreAttraction(attraction),
  }));

  // Sort by score (highest first)
  scoredAttractions.sort((a, b) => b.score - a.score);

  console.log(
    "Top scored attractions:",
    scoredAttractions.slice(0, 5).map((item) => ({
      name: item.attraction.name,
      rating: item.attraction.rating,
      score: item.score,
    }))
  );

  // Take the top results (max 8)
  const topResults = scoredAttractions
    .slice(0, 8)
    .map((item) => item.attraction);
  console.log(
    `Selected top ${topResults.length} attractions for display based on preference matching`
  );

  // Map to our standard format
  return topResults.map((attraction) => {
    // Categorize the attraction based on types
    const category =
      getCategoryFromTypes(attraction.types) || "Tourist Attraction";

    // Format the location
    const location =
      attraction.vicinity ||
      attraction.formatted_address ||
      "Location info unavailable";

    // Create pricing info (most attractions don't have price_level in Places API)
    let price_range;
    if (attraction.price_level) {
      price_range = "$".repeat(attraction.price_level);
    } else {
      // For attractions, if price level not available, mark as Unknown
      price_range = "Varies";
    }

    // Create the attraction object in our standard format
    return {
      id: attraction.place_id,
      name: attraction.name,
      rating: attraction.rating || 0,
      price_range: price_range,
      category: category,
      location: location,
      address: attraction.formatted_address || attraction.vicinity,
      description:
        attraction.editorial_summary?.overview ||
        `A popular ${category.toLowerCase()} in ${location.split(",")[0]}.`,
      photo:
        attraction.photos && attraction.photos.length > 0
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${attraction.photos[0].photo_reference}&key=${apiKey}`
          : null,
      coordinates: {
        lat: attraction.geometry.location.lat,
        lng: attraction.geometry.location.lng,
      },
      url: `https://www.google.com/maps/place/?q=place_id:${attraction.place_id}`,
    };
  });
}

/**
 * Determine category from Place API types
 *
 * @param {Array} types - Google Place API types
 * @returns {string} - Human-readable category
 */
function getCategoryFromTypes(types) {
  if (!types || types.length === 0) {
    return "Tourist Attraction";
  }

  // Map of Google Places types to readable categories
  const typeToCategory = {
    museum: "Museum",
    art_gallery: "Art Gallery",
    park: "Park",
    amusement_park: "Amusement Park",
    zoo: "Zoo",
    aquarium: "Aquarium",
    church: "Religious Site",
    mosque: "Religious Site",
    synagogue: "Religious Site",
    temple: "Religious Site",
    landmark: "Landmark",
    monument: "Monument",
    historic: "Historical Site",
    tourist_attraction: "Tourist Attraction",
    natural_feature: "Natural Feature",
    point_of_interest: "Point of Interest",
    shopping_mall: "Shopping",
    beach: "Beach",
    national_park: "National Park",
  };

  // Look for a matching category
  for (const type of types) {
    if (typeToCategory[type]) {
      return typeToCategory[type];
    } else {
      // Try to match part of the type
      for (const [key, value] of Object.entries(typeToCategory)) {
        if (type.includes(key)) {
          return value;
        }
      }
    }
  }

  // Default category
  return "Tourist Attraction";
}

/**
 * Generate simulated attraction data for fallback
 *
 * @param {string} location - The location to simulate attractions for
 * @param {Object} filterOptions - User filter options
 * @returns {Object} - Simulated attraction data response
 */
function simulateAttractionData(location, filterOptions = {}) {
  console.log(
    `Generating simulated attraction data for ${location} with options:`,
    filterOptions
  );

  // Common attractions across locations for fallback
  const commonAttractions = [
    {
      name: "City Museum",
      rating: 4.6,
      price_range: "$",
      category: "Museum",
      description:
        "A fascinating collection of historical artifacts and cultural exhibits.",
      location: location,
      address: `Downtown, ${location}`,
      photo: null,
      simulated: true,
    },
    {
      name: "Central Park",
      rating: 4.8,
      price_range: "Free",
      category: "Park",
      description:
        "A beautiful urban park with walking trails, gardens, and recreation areas.",
      location: location,
      address: `Midtown, ${location}`,
      photo: null,
      simulated: true,
    },
    {
      name: "Art Gallery",
      rating: 4.3,
      price_range: "$",
      category: "Art Gallery",
      description:
        "Contemporary and classic art exhibits from local and international artists.",
      location: location,
      address: `Arts District, ${location}`,
      photo: null,
      simulated: true,
    },
    {
      name: "Historical Landmark",
      rating: 4.5,
      price_range: "$",
      category: "Landmark",
      description: "An important historical site with guided tours available.",
      location: location,
      address: `Old Town, ${location}`,
      photo: null,
      simulated: true,
    },
    {
      name: "Nature Reserve",
      rating: 4.7,
      price_range: "Free",
      category: "Natural Feature",
      description:
        "Protected natural area with hiking trails and wildlife viewing.",
      location: location,
      address: `Outside ${location}`,
      photo: null,
      simulated: true,
    },
    {
      name: "Science Center",
      rating: 4.4,
      price_range: "$$",
      category: "Museum",
      description:
        "Interactive exhibits and demonstrations of scientific principles and discoveries.",
      location: location,
      address: `University District, ${location}`,
      photo: null,
      simulated: true,
    },
    {
      name: "Cultural Center",
      rating: 4.2,
      price_range: "$",
      category: "Point of Interest",
      description:
        "Showcasing the rich cultural heritage and traditions of the region.",
      location: location,
      address: `Downtown, ${location}`,
      photo: null,
      simulated: true,
    },
    {
      name: "Botanical Gardens",
      rating: 4.6,
      price_range: "$",
      category: "Park",
      description:
        "Beautiful gardens featuring diverse plant collections and seasonal displays.",
      location: location,
      address: `Park District, ${location}`,
      photo: null,
      simulated: true,
    },
  ];

  // Location-specific attractions for popular destinations
  const locationBasedAttractions = {
    "New York": [
      {
        name: "Empire State Building",
        rating: 4.7,
        price_range: "$$$",
        category: "Landmark",
        description:
          "Iconic 102-story skyscraper with observation decks offering panoramic views.",
        location: "Manhattan, New York",
        address: "350 Fifth Avenue, New York, NY",
        photo: null,
        simulated: true,
      },
      {
        name: "Statue of Liberty",
        rating: 4.7,
        price_range: "$$",
        category: "Monument",
        description:
          "Iconic statue and symbol of freedom, accessible by ferry.",
        location: "Liberty Island, New York",
        address: "Liberty Island, New York, NY",
        photo: null,
        simulated: true,
      },
      {
        name: "Central Park",
        rating: 4.8,
        price_range: "Free",
        category: "Park",
        description:
          "Sprawling urban park with walking paths, lakes, and recreational facilities.",
        location: "Manhattan, New York",
        address: "Central Park, New York, NY",
        photo: null,
        simulated: true,
      },
      {
        name: "Metropolitan Museum of Art",
        rating: 4.8,
        price_range: "$$",
        category: "Museum",
        description:
          "World-renowned art museum with extensive collections spanning thousands of years.",
        location: "Manhattan, New York",
        address: "1000 Fifth Avenue, New York, NY",
        photo: null,
        simulated: true,
      },
    ],
    Paris: [
      {
        name: "Eiffel Tower",
        rating: 4.7,
        price_range: "$$$",
        category: "Landmark",
        description:
          "Iconic iron tower with observation decks offering panoramic city views.",
        location: "Champ de Mars, Paris",
        address: "Champ de Mars, 5 Avenue Anatole France, Paris",
        photo: null,
        simulated: true,
      },
      {
        name: "Louvre Museum",
        rating: 4.8,
        price_range: "$$",
        category: "Museum",
        description:
          "World-famous art museum, home to thousands of works including the Mona Lisa.",
        location: "1st arrondissement, Paris",
        address: "Rue de Rivoli, Paris",
        photo: null,
        simulated: true,
      },
      {
        name: "Notre-Dame Cathedral",
        rating: 4.7,
        price_range: "Free",
        category: "Religious Site",
        description:
          "Historic medieval Catholic cathedral with Gothic architecture.",
        location: "Île de la Cité, Paris",
        address: "6 Parvis Notre-Dame, Paris",
        photo: null,
        simulated: true,
      },
    ],
    London: [
      {
        name: "British Museum",
        rating: 4.8,
        price_range: "Free",
        category: "Museum",
        description:
          "World-renowned museum of art and antiquities from around the globe.",
        location: "Bloomsbury, London",
        address: "Great Russell Street, London",
        photo: null,
        simulated: true,
      },
      {
        name: "Tower of London",
        rating: 4.7,
        price_range: "$$$",
        category: "Historical Site",
        description:
          "Historic castle and former prison on the north bank of the River Thames.",
        location: "Central London",
        address: "Tower Hill, London",
        photo: null,
        simulated: true,
      },
      {
        name: "Buckingham Palace",
        rating: 4.6,
        price_range: "$$$",
        category: "Landmark",
        description:
          "The London residence and administrative headquarters of the British monarch.",
        location: "Westminster, London",
        address: "Westminster, London",
        photo: null,
        simulated: true,
      },
    ],
    Rome: [
      {
        name: "Colosseum",
        rating: 4.8,
        price_range: "$$",
        category: "Historical Site",
        description:
          "Iconic ancient Roman amphitheater, once used for gladiatorial contests.",
        location: "Rome, Italy",
        address: "Piazza del Colosseo, Rome",
        photo: null,
        simulated: true,
      },
      {
        name: "Vatican Museums",
        rating: 4.7,
        price_range: "$$",
        category: "Museum",
        description:
          "Museums displaying works collected by the Catholic Church throughout the centuries.",
        location: "Vatican City, Rome",
        address: "Viale Vaticano, Rome",
        photo: null,
        simulated: true,
      },
      {
        name: "Trevi Fountain",
        rating: 4.8,
        price_range: "Free",
        category: "Landmark",
        description:
          "Iconic 18th-century fountain featuring a mythological sculptural composition.",
        location: "Rome, Italy",
        address: "Piazza di Trevi, Rome",
        photo: null,
        simulated: true,
      },
    ],
  };

  // Try to match the location with one of our predefined cities
  let attractionsList = commonAttractions;

  for (const [city, attractions] of Object.entries(locationBasedAttractions)) {
    if (location.toLowerCase().includes(city.toLowerCase())) {
      // Use location-specific attractions and add some common ones
      attractionsList = [...attractions, ...commonAttractions.slice(0, 3)];
      break;
    }
  }

  // Apply filters to the simulated data
  const category = filterOptions.category?.toLowerCase();
  const minRating = filterOptions.rating ? parseFloat(filterOptions.rating) : 0;

  // Filter by category and rating
  let filteredAttractions = attractionsList;

  if (category) {
    filteredAttractions = filteredAttractions.filter((attraction) =>
      attraction.category.toLowerCase().includes(category)
    );
  }

  if (minRating > 0) {
    filteredAttractions = filteredAttractions.filter(
      (attraction) => attraction.rating >= minRating
    );
  }

  // If we filtered too aggressively and have no results, fall back to the original list
  if (filteredAttractions.length === 0) {
    console.log(
      "Filtered too aggressively, falling back to unfiltered attractions"
    );
    filteredAttractions = attractionsList;
  }

  // Return the simulated attraction data
  return {
    success: true,
    location: location,
    attractions: filteredAttractions,
    source: "Simulated Data",
  };
}
