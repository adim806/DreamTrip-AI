/**
 * Google Places API based restaurants service
 * Provides functionality to search for restaurants using Google Places API
 */

/**
 * Fetches restaurants data from Google Places API
 *
 * @param {Object} params - Search parameters
 * @param {string} params.location - The location to search for restaurants
 * @param {Object} params.filters - User filters
 * @param {string} params.filters.cuisine - Type of cuisine (italian, japanese, etc.)
 * @param {number} params.filters.rating - Minimum rating (1-5)
 * @param {string} params.filters.price - Price level (budget, moderate, expensive)
 * @returns {Promise<Object>} - Restaurants data response
 */
export const fetchRestaurantRecommendations = async (params) => {
  // Destructure at the top level so these variables are accessible in catch blocks
  const { location, filters = {} } = params || {};

  try {
    console.log("Fetching restaurant recommendations with params:", params);

    if (!location) {
      return {
        success: false,
        error: "Location is required to search for restaurants",
      };
    }

    // Google Places API key
    const apiKey = import.meta.env.VITE_GOOGLE_PLACE_API_KEY;

    if (!apiKey) {
      console.warn("No Google Places API key provided, using simulated data");
      return simulateRestaurantData(location, filters);
    }

    try {
      // First try using the backend proxy
      const backendUrl = "http://localhost:3000"; // Backend server URL
      const proxyUrl = `${backendUrl}/api/places/search?query=${encodeURIComponent(
        `restaurants in ${location}`
      )}&type=restaurant&radius=10000`;

      console.log("Fetching from backend proxy:", proxyUrl);

      // First check if the backend is reachable with a test call
      try {
        const testResponse = await fetch(`${backendUrl}/api/places/test`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          mode: "cors",
          timeout: 5000, // 5 second timeout
        });

        if (!testResponse.ok) {
          throw new Error(
            `Backend test failed with status: ${testResponse.status}`
          );
        }

        const testData = await testResponse.json();
        console.log("Backend test response:", testData);

        if (!testData.googlePlacesApiConfigured) {
          throw new Error("Google Places API not configured in backend");
        }
      } catch (testError) {
        console.error("Backend test failed:", testError);
        // If the backend test fails, immediately fall back to simulated data
        console.log("Backend not available, using simulated data");
        return simulateRestaurantData(location, filters);
      }

      // If we get here, the backend test passed, so try the actual request
      const response = await fetch(proxyUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        mode: "cors",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Proxy error (${response.status}): ${errorText}`);
        throw new Error(
          `Proxy error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Received data from proxy:", data);

      if (data.status !== "OK" || !data.results) {
        console.error("Places API error:", data);
        throw new Error(`Places API error: ${data.status || "Unknown error"}`);
      }

      // Map the results to our standard format
      const restaurants = await processRestaurantResults(
        data.results,
        filters,
        apiKey
      );

      return {
        success: true,
        location: location,
        restaurants: restaurants,
        source: "Google Places",
      };
    } catch (proxyError) {
      console.error("Error fetching from proxy:", proxyError);
      console.log("Falling back to simulated data");
      return simulateRestaurantData(location, filters);
    }
  } catch (error) {
    console.error("Error fetching restaurant data:", error);

    // Fall back to simulated data if the API fails
    console.log("Falling back to simulated data");
    return simulateRestaurantData(location, filters);
  }
};

/**
 * Process restaurant results from Google Places API
 *
 * @param {Array} results - Raw results from Places API
 * @param {Object} filters - User filters
 * @param {string} apiKey - Google Places API key for photos
 * @returns {Array} - Processed restaurant data
 */
async function processRestaurantResults(results, filters, apiKey) {
  console.log("Processing restaurant results with filters:", filters);

  // Scoring function to rank restaurants based on user preferences
  const scoreRestaurant = (restaurant) => {
    let score = 0;

    // Base score from rating (0-5 points)
    score += restaurant.rating || 0;

    // Apply cuisine filters if specified
    if (filters.cuisine && restaurant.types) {
      const normalizedCuisine = filters.cuisine.toLowerCase();

      // Check if any of the types contains the cuisine
      const matchingType = restaurant.types.some(
        (type) =>
          type.toLowerCase().includes(normalizedCuisine) ||
          type.toLowerCase().replace("_", " ").includes(normalizedCuisine)
      );

      // Significant boost for matching the requested cuisine
      if (matchingType) {
        score += 3;
      }

      // Also check the restaurant name for cuisine terms
      if (restaurant.name.toLowerCase().includes(normalizedCuisine)) {
        score += 2;
      }
    }

    // Adjust for rating requirement
    if (filters.rating) {
      const minRating = parseFloat(filters.rating);
      // Restaurants that meet or exceed the minimum rating get bonus points
      if (restaurant.rating >= minRating) {
        score += 2;
        // Extra bonus for exceeding the minimum rating
        score += (restaurant.rating - minRating) * 0.5;
      } else {
        // Significant penalty for not meeting minimum rating
        score -= 5;
      }
    }

    // Adjust for price level if specified
    if (filters.price) {
      const requestedPrice = mapPriceFilterToLevel(filters.price);

      if (restaurant.price_level === requestedPrice) {
        // Perfect match
        score += 3;
      } else if (
        restaurant.price_level &&
        Math.abs(restaurant.price_level - requestedPrice) === 1
      ) {
        // Close match
        score += 1;
      }
    }

    // Ensure top-rated restaurants still score well
    if (restaurant.rating >= 4.5) {
      score += 1;
    }

    // Adjust for review count if available (more reviews = more reliable rating)
    if (restaurant.user_ratings_total) {
      score += Math.min(restaurant.user_ratings_total / 1000, 1); // Up to 1 extra point
    }

    return score;
  };

  // Apply filters based on user preferences
  let filteredResults = [...results];

  // Filter by minimum rating if specified
  if (filters.rating) {
    const minRating = parseFloat(filters.rating);
    filteredResults = filteredResults.filter(
      (restaurant) => !restaurant.rating || restaurant.rating >= minRating
    );

    console.log(
      `Filtered to ${filteredResults.length} restaurants with rating >= ${minRating}`
    );
  }

  // Filter by price level if specified
  if (filters.price) {
    const priceLevel = mapPriceFilterToLevel(filters.price);

    // Allow some flexibility in price - include price_level within +/- 1 of target
    filteredResults = filteredResults.filter((restaurant) => {
      // If no price level is specified, keep the restaurant
      if (!restaurant.price_level) return true;

      return Math.abs(restaurant.price_level - priceLevel) <= 1;
    });

    console.log(
      `Filtered to ${filteredResults.length} restaurants matching price level: ${filters.price} (${priceLevel})`
    );
  }

  // Filter by cuisine if specified
  if (filters.cuisine) {
    const normalizedCuisine = filters.cuisine.toLowerCase();

    // Check if the restaurant types include the specified cuisine
    // Also check restaurant name for cuisine indicators
    filteredResults = filteredResults.filter((restaurant) => {
      // Check name first
      if (restaurant.name.toLowerCase().includes(normalizedCuisine)) {
        return true;
      }

      // Check types next
      if (!restaurant.types || restaurant.types.length === 0) {
        return false; // No type information, can't match cuisine
      }

      return restaurant.types.some((type) => {
        const normalizedType = type.toLowerCase().replace("_", " ");
        return (
          normalizedType.includes(normalizedCuisine) ||
          normalizedCuisine.includes(normalizedType)
        );
      });
    });

    console.log(
      `Filtered to ${filteredResults.length} restaurants matching cuisine: ${filters.cuisine}`
    );
  }

  // If we filtered too aggressively, reset some filters to ensure we have results
  if (filteredResults.length < 3 && results.length > 3) {
    console.log("Filtered too aggressively, relaxing some filters");

    // Reset to original results and just apply rating filter if available
    filteredResults = [...results];

    if (filters.rating) {
      const minRating = parseFloat(filters.rating);
      filteredResults = filteredResults.filter(
        (restaurant) => !restaurant.rating || restaurant.rating >= minRating
      );
    }
  }

  // Score and sort restaurants
  const scoredRestaurants = filteredResults.map((restaurant) => ({
    restaurant,
    score: scoreRestaurant(restaurant),
  }));

  // Sort by score (highest first)
  scoredRestaurants.sort((a, b) => b.score - a.score);

  console.log(
    "Top scored restaurants:",
    scoredRestaurants.slice(0, 5).map((item) => ({
      name: item.restaurant.name,
      rating: item.restaurant.rating,
      price_level: item.restaurant.price_level,
      score: item.score,
    }))
  );

  // Take the top results (max 8)
  const topResults = scoredRestaurants
    .slice(0, 8)
    .map((item) => item.restaurant);
  console.log(
    `Selected top ${topResults.length} restaurants for display based on preference matching`
  );

  // Map to our standard format
  return topResults.map((restaurant) => {
    // Determine cuisine based on types
    const cuisine = getCuisineFromTypes(restaurant.types);

    // Format the location
    const location =
      restaurant.vicinity ||
      restaurant.formatted_address ||
      "Location info unavailable";

    // Create pricing info using $ symbols
    let price_range;
    if (restaurant.price_level !== undefined) {
      price_range = "$".repeat(restaurant.price_level) || "$";
    } else {
      price_range = "Varies";
    }

    // Create the restaurant object in our standard format
    return {
      id: restaurant.place_id,
      name: restaurant.name,
      rating: restaurant.rating || 0,
      price_range: price_range,
      cuisine: cuisine,
      location: location,
      address: restaurant.formatted_address || restaurant.vicinity,
      opening_hours: restaurant.opening_hours?.open_now ? "Open now" : "Closed",
      photo:
        restaurant.photos && restaurant.photos.length > 0
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${restaurant.photos[0].photo_reference}&key=${apiKey}`
          : null,
      coordinates: {
        lat: restaurant.geometry.location.lat,
        lng: restaurant.geometry.location.lng,
      },
      url: `https://www.google.com/maps/place/?q=place_id:${restaurant.place_id}`,
    };
  });
}

/**
 * Map price filter terms to Google Places API price levels
 *
 * @param {string} priceFilter - Price filter term (budget, moderate, expensive, etc.)
 * @returns {number} - Google Places API price level (1-4)
 */
function mapPriceFilterToLevel(priceFilter) {
  const priceFilter_lower = priceFilter.toLowerCase();

  if (
    priceFilter_lower === "budget" ||
    priceFilter_lower === "cheap" ||
    priceFilter_lower === "inexpensive"
  ) {
    return 1;
  } else if (
    priceFilter_lower === "moderate" ||
    priceFilter_lower === "medium"
  ) {
    return 2;
  } else if (
    priceFilter_lower === "expensive" ||
    priceFilter_lower === "high-end"
  ) {
    return 3;
  } else if (
    priceFilter_lower === "luxury" ||
    priceFilter_lower === "very expensive"
  ) {
    return 4;
  }

  // If it's a number in string form, try to parse it
  const numericValue = parseInt(priceFilter_lower, 10);
  if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 4) {
    return numericValue;
  }

  // Default to moderate price level
  return 2;
}

/**
 * Determine cuisine from Place API types
 *
 * @param {Array} types - Google Place API types
 * @returns {string} - Cuisine description
 */
function getCuisineFromTypes(types) {
  if (!types || types.length === 0) {
    return "Various Cuisine";
  }

  // Map of Google Places types to cuisine categories
  const typeToCuisine = {
    restaurant: "Restaurant",
    cafe: "Café",
    bar: "Bar",
    meal_takeaway: "Takeaway",
    meal_delivery: "Delivery",
    bakery: "Bakery",
    food: "Food",
    italian_restaurant: "Italian",
    japanese_restaurant: "Japanese",
    chinese_restaurant: "Chinese",
    thai_restaurant: "Thai",
    mexican_restaurant: "Mexican",
    indian_restaurant: "Indian",
    french_restaurant: "French",
    greek_restaurant: "Greek",
    spanish_restaurant: "Spanish",
    american_restaurant: "American",
    pizza: "Pizza",
    seafood: "Seafood",
    steak_house: "Steakhouse",
    sushi: "Sushi",
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    barbecue: "BBQ",
    hamburger: "Hamburger",
    fast_food: "Fast Food",
    coffee_shop: "Coffee Shop",
    ice_cream: "Ice Cream",
    dessert: "Desserts",
    breakfast: "Breakfast",
    brunch: "Brunch",
    dinner: "Dinner",
  };

  // Look for specific cuisine types first
  for (const type of types) {
    if (typeToCuisine[type]) {
      return typeToCuisine[type];
    }
  }

  // Check for more generic food-related types
  const foodTypes = [
    "restaurant",
    "cafe",
    "bar",
    "food",
    "meal_takeaway",
    "meal_delivery",
  ];
  for (const type of types) {
    if (foodTypes.includes(type)) {
      return "Restaurant";
    }
  }

  // Default cuisine
  return "Various Cuisine";
}

/**
 * Generate simulated restaurant data for fallback
 *
 * @param {string} location - The location to simulate restaurants for
 * @param {Object} filterOptions - User filter options
 * @returns {Object} - Simulated restaurant data response
 */
function simulateRestaurantData(location, filterOptions = {}) {
  console.log(
    `Generating simulated restaurant data for ${location} with options:`,
    filterOptions
  );

  // Common restaurants across locations for fallback
  const commonRestaurants = [
    {
      name: "Local Bistro",
      rating: 4.5,
      price_range: "$$",
      cuisine: "European",
      description:
        "Cozy bistro serving seasonal local ingredients in a casual setting.",
      location: location,
      address: `Downtown, ${location}`,
      photo: null,
      simulated: true,
    },
    {
      name: "Sushi Delight",
      rating: 4.7,
      price_range: "$$$",
      cuisine: "Japanese",
      description: "Fresh sushi and sashimi prepared by experienced chefs.",
      location: location,
      address: `Central District, ${location}`,
      photo: null,
      simulated: true,
    },
    {
      name: "Pizza Palace",
      rating: 4.3,
      price_range: "$",
      cuisine: "Italian",
      description:
        "Authentic wood-fired pizzas with a variety of traditional toppings.",
      location: location,
      address: `Main Street, ${location}`,
      photo: null,
      simulated: true,
    },
    {
      name: "Golden Dragon",
      rating: 4.2,
      price_range: "$$",
      cuisine: "Chinese",
      description: "Traditional Chinese cuisine with regional specialties.",
      location: location,
      address: `Chinatown, ${location}`,
      photo: null,
      simulated: true,
    },
    {
      name: "Taco Fiesta",
      rating: 4.1,
      price_range: "$",
      cuisine: "Mexican",
      description: "Authentic Mexican street food in a colorful atmosphere.",
      location: location,
      address: `West Side, ${location}`,
      photo: null,
      simulated: true,
    },
    {
      name: "Fine Dining Experience",
      rating: 4.8,
      price_range: "$$$$",
      cuisine: "French",
      description:
        "Elegant fine dining restaurant with innovative French cuisine.",
      location: location,
      address: `Luxury District, ${location}`,
      photo: null,
      simulated: true,
    },
    {
      name: "Vegetarian Oasis",
      rating: 4.4,
      price_range: "$$",
      cuisine: "Vegetarian",
      description:
        "Creative vegetarian and vegan dishes using organic ingredients.",
      location: location,
      address: `Green Quarter, ${location}`,
      photo: null,
      simulated: true,
    },
    {
      name: "Breakfast Club",
      rating: 4.6,
      price_range: "$$",
      cuisine: "Breakfast",
      description:
        "All-day breakfast and brunch favorites in a casual setting.",
      location: location,
      address: `North End, ${location}`,
      photo: null,
      simulated: true,
    },
  ];

  // Location-specific restaurants for popular destinations
  const locationBasedRestaurants = {
    "New York": [
      {
        name: "Manhattan Steakhouse",
        rating: 4.7,
        price_range: "$$$$",
        cuisine: "Steakhouse",
        description:
          "Premium cuts of meat and classic cocktails in an upscale environment.",
        location: "Manhattan, New York",
        address: "123 Broadway, New York, NY",
        photo: null,
        simulated: true,
      },
      {
        name: "Brooklyn Pizza Co.",
        rating: 4.6,
        price_range: "$",
        cuisine: "Pizza",
        description: "Classic New York style pizza by the slice.",
        location: "Brooklyn, New York",
        address: "56 Jay St, Brooklyn, NY",
        photo: null,
        simulated: true,
      },
      {
        name: "Little Italy Trattoria",
        rating: 4.5,
        price_range: "$$$",
        cuisine: "Italian",
        description:
          "Family-owned Italian restaurant serving traditional recipes since 1950.",
        location: "Little Italy, New York",
        address: "205 Mulberry St, New York, NY",
        photo: null,
        simulated: true,
      },
    ],
    Paris: [
      {
        name: "Le Petit Bistro",
        rating: 4.8,
        price_range: "$$$",
        cuisine: "French",
        description:
          "Classic French bistro with a modern twist in the heart of Paris.",
        location: "Montmartre, Paris",
        address: "15 Rue des Abbesses, Paris",
        photo: null,
        simulated: true,
      },
      {
        name: "Café de Paris",
        rating: 4.3,
        price_range: "$$",
        cuisine: "Café",
        description:
          "Parisian café serving pastries, light meals, and excellent coffee.",
        location: "Saint-Germain-des-Prés, Paris",
        address: "10 Boulevard Saint-Germain, Paris",
        photo: null,
        simulated: true,
      },
      {
        name: "La Baguette Dorée",
        rating: 4.6,
        price_range: "$",
        cuisine: "Bakery",
        description:
          "Award-winning bakery offering fresh bread, pastries, and sandwiches.",
        location: "Le Marais, Paris",
        address: "26 Rue de Rivoli, Paris",
        photo: null,
        simulated: true,
      },
    ],
    London: [
      {
        name: "The Crown & Lion",
        rating: 4.4,
        price_range: "$$",
        cuisine: "British",
        description:
          "Traditional British pub serving classic pub fare and local ales.",
        location: "Soho, London",
        address: "42 Dean Street, London",
        photo: null,
        simulated: true,
      },
      {
        name: "Spice of India",
        rating: 4.5,
        price_range: "$$",
        cuisine: "Indian",
        description:
          "Authentic Indian cuisine featuring regional specialties and tandoori dishes.",
        location: "Brick Lane, London",
        address: "48 Brick Lane, London",
        photo: null,
        simulated: true,
      },
      {
        name: "The Savoy Grill",
        rating: 4.7,
        price_range: "$$$$",
        cuisine: "British",
        description:
          "Elegant dining experience with classic British dishes and impeccable service.",
        location: "The Strand, London",
        address: "The Savoy, Strand, London",
        photo: null,
        simulated: true,
      },
    ],
    Rome: [
      {
        name: "Trattoria da Luigi",
        rating: 4.6,
        price_range: "$$",
        cuisine: "Italian",
        description:
          "Family-run trattoria serving homemade pasta and traditional Roman dishes.",
        location: "Trastevere, Rome",
        address: "Via della Lungaretta 45, Rome",
        photo: null,
        simulated: true,
      },
      {
        name: "La Pizzeria Romana",
        rating: 4.5,
        price_range: "$",
        cuisine: "Pizza",
        description:
          "Authentic Roman-style thin crust pizza baked in a wood-fired oven.",
        location: "Centro Storico, Rome",
        address: "Via dei Fori Imperiali 35, Rome",
        photo: null,
        simulated: true,
      },
      {
        name: "Gelateria Classica",
        rating: 4.8,
        price_range: "$",
        cuisine: "Dessert",
        description:
          "Award-winning gelato in a wide variety of traditional and innovative flavors.",
        location: "Piazza Navona, Rome",
        address: "Via del Governo Vecchio 20, Rome",
        photo: null,
        simulated: true,
      },
    ],
  };

  // Try to match the location with one of our predefined cities
  let restaurantsList = commonRestaurants;

  for (const [city, restaurants] of Object.entries(locationBasedRestaurants)) {
    if (location.toLowerCase().includes(city.toLowerCase())) {
      // Use location-specific restaurants and add some common ones
      restaurantsList = [...restaurants, ...commonRestaurants.slice(0, 4)];
      break;
    }
  }

  // Apply filters to the simulated data
  const cuisine = filterOptions.cuisine?.toLowerCase();
  const minRating = filterOptions.rating ? parseFloat(filterOptions.rating) : 0;
  const priceFilter = filterOptions.price?.toLowerCase();

  // Filter by cuisine, rating and price
  let filteredRestaurants = restaurantsList;

  if (cuisine) {
    filteredRestaurants = filteredRestaurants.filter((restaurant) =>
      restaurant.cuisine.toLowerCase().includes(cuisine)
    );
  }

  if (minRating > 0) {
    filteredRestaurants = filteredRestaurants.filter(
      (restaurant) => restaurant.rating >= minRating
    );
  }

  if (priceFilter) {
    // Map the price filter to a price range pattern
    let pricePattern;
    if (
      priceFilter === "budget" ||
      priceFilter === "cheap" ||
      priceFilter === "inexpensive"
    ) {
      pricePattern = "$";
    } else if (priceFilter === "moderate" || priceFilter === "medium") {
      pricePattern = "$$";
    } else if (priceFilter === "expensive" || priceFilter === "high-end") {
      pricePattern = "$$$";
    } else if (priceFilter === "luxury" || priceFilter === "very expensive") {
      pricePattern = "$$$$";
    }

    if (pricePattern) {
      filteredRestaurants = filteredRestaurants.filter(
        (restaurant) => restaurant.price_range === pricePattern
      );
    }
  }

  // If we filtered too aggressively and have no results, fall back to the original list
  if (filteredRestaurants.length === 0) {
    console.log(
      "Filtered too aggressively, falling back to unfiltered restaurants"
    );
    filteredRestaurants = restaurantsList;
  }

  // Return the simulated restaurant data
  return {
    success: true,
    location: location,
    restaurants: filteredRestaurants,
    source: "Simulated Data",
  };
}
