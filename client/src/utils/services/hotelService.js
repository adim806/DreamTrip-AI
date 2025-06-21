/**
 * Google Places API based hotel service
 * Provides functionality to search for hotels using Google Places API
 */

/**
 * Fetches hotel data from Google Places API
 *
 * @param {Object} params - Search parameters
 * @param {string} params.location - The location to search for hotels
 * @param {Object} params.preferences - User preferences
 * @param {string} params.preferences.budget - Budget level (budget, moderate, luxury)
 * @param {number} params.preferences.rating - Minimum rating (1-5)
 * @param {Array} params.preferences.amenities - Required amenities
 * @returns {Promise<Object>} - Hotel data response
 */
export const fetchHotelRecommendations = async (params) => {
  // Destructure at the top level so these variables are accessible in catch blocks
  const { location, preferences = {} } = params || {};

  try {
    console.log("Fetching hotel recommendations with params:", params);

    // Ensure consistent budget parameter names
    if (preferences.budget_level && !preferences.budget) {
      preferences.budget = preferences.budget_level;
      console.log(
        `Using budget_level "${preferences.budget_level}" as budget parameter`
      );
    } else if (preferences.budget && !preferences.budget_level) {
      preferences.budget_level = preferences.budget;
      console.log(
        `Using budget "${preferences.budget}" as budget_level parameter`
      );
    }

    if (!location) {
      return {
        success: false,
        error: "Location is required to search for hotels",
      };
    }

    // Google Places API key
    const apiKey = import.meta.env.VITE_GOOGLE_PLACE_API_KEY;

    if (!apiKey) {
      console.warn("No Google Places API key provided, using simulated data");
      return simulateHotelData(location, preferences);
    }

    try {
      // First try using the backend proxy
      const backendUrl = "http://localhost:3000"; // Backend server URL
      const proxyUrl = `${backendUrl}/api/places/search?query=${encodeURIComponent(
        `hotels in ${location}`
      )}&type=lodging&radius=5000`;

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
        return simulateHotelData(location, preferences);
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
      const hotels = await processHotelResults(
        data.results,
        preferences,
        apiKey
      );

      return {
        success: true,
        location: location,
        hotels: hotels,
        source: "Google Places",
      };
    } catch (proxyError) {
      console.error("Error fetching from proxy:", proxyError);
      console.log("Falling back to simulated data");
      return simulateHotelData(location, preferences);
    }
  } catch (error) {
    console.error("Error fetching hotel data:", error);

    // Fall back to simulated data if the API fails
    console.log("Falling back to simulated data");
    return simulateHotelData(location, preferences);
  }
};

/**
 * Process hotel results and apply user preferences
 *
 * @param {Array} results - Raw results from Google Places API
 * @param {Object} preferences - User preferences
 * @param {string} apiKey - Google Places API key for detail requests
 * @returns {Array} - Processed hotel data
 */
async function processHotelResults(results, preferences, apiKey) {
  console.log("Processing hotel results with preferences:", preferences);

  // Ensure budget parameters are consistent
  if (preferences.budget_level && !preferences.budget) {
    preferences.budget = preferences.budget_level;
    console.log(
      `Using budget_level "${preferences.budget_level}" as budget parameter in result processing`
    );
  } else if (preferences.budget && !preferences.budget_level) {
    preferences.budget_level = preferences.budget;
    console.log(
      `Using budget "${preferences.budget}" as budget_level parameter in result processing`
    );
  }

  // Create a scoring system to rank hotels by preference match
  const scoreHotel = (hotel) => {
    let score = 0;

    // Base score from rating (0-5 points)
    score += hotel.rating || 0;

    // Adjust for price range preference
    if (preferences.budget) {
      const budgetStr = preferences.budget.toString().toLowerCase();

      // Luxury preference - higher price_level hotels get more points
      if (
        budgetStr.includes("luxury") ||
        budgetStr.includes("expensive") ||
        budgetStr.includes("high-end") ||
        budgetStr.includes("premium")
      ) {
        // Price level 4 = +3 points, 3 = +2 points, 2 = +1 point, 1 = +0 points
        score += (hotel.price_level || 0) * 0.75;
      }
      // Budget preference - lower price_level hotels get more points
      else if (
        budgetStr.includes("budget") ||
        budgetStr.includes("cheap") ||
        budgetStr.includes("inexpensive") ||
        budgetStr.includes("affordable") ||
        budgetStr.includes("economical") ||
        budgetStr.includes("low")
      ) {
        // Price level 1 = +3 points, 2 = +2 points, 3 = +1 point, 4 = +0 points
        score += (5 - (hotel.price_level || 0)) * 0.75;
      }
      // Moderate preference - mid-range price_level hotels get more points
      else if (
        budgetStr.includes("moderate") ||
        budgetStr.includes("mid-range") ||
        budgetStr.includes("average") ||
        budgetStr.includes("standard")
      ) {
        // Price level 2-3 = +3 points, 1 and 4 = +1 point
        score +=
          hotel.price_level === 2 || hotel.price_level === 3 ? 2.25 : 0.75;
      }
    }

    // Adjust for rating requirement
    if (preferences.rating) {
      const minRating = parseFloat(preferences.rating);
      // Hotels that meet or exceed the minimum rating get bonus points
      if (hotel.rating >= minRating) {
        score += 2;
        // Extra bonus for exceeding the minimum rating
        score += (hotel.rating - minRating) * 0.5;
      } else {
        // Significant penalty for not meeting minimum rating
        score -= 5;
      }
    }

    // Check for amenities match if specified
    if (preferences.amenities && preferences.amenities.length > 0) {
      const hotelAmenities = getAmenitiesFromTypes(hotel.types);
      let amenityMatchCount = 0;

      preferences.amenities.forEach((requestedAmenity) => {
        const hasAmenity = hotelAmenities.some((amenity) =>
          amenity.toLowerCase().includes(requestedAmenity.toLowerCase())
        );
        if (hasAmenity) {
          amenityMatchCount++;
        }
      });

      // Add points for matching amenities
      score += amenityMatchCount * 0.5;
    }

    // Ensure top-rated hotels still score well
    if (hotel.rating >= 4.5) {
      score += 1;
    }

    // Adjust for review count if available (more reviews = more reliable rating)
    if (hotel.user_ratings_total) {
      score += Math.min(hotel.user_ratings_total / 1000, 1); // Up to 1 extra point
    }

    return score;
  };

  // Apply filters based on user preferences
  let filteredResults = [...results]; // Create a copy to avoid modifying the original

  // Apply hard rating filter if specified
  if (preferences.rating) {
    const minRating = parseFloat(preferences.rating);
    const preFilterCount = filteredResults.length;

    filteredResults = filteredResults.filter(
      (hotel) => hotel.rating >= minRating
    );

    console.log(
      `Applied rating filter (${minRating}): ${preFilterCount} -> ${filteredResults.length} results`
    );

    // If rating filter is too restrictive, relax it slightly
    if (filteredResults.length < 3 && results.length > 3) {
      const relaxedMinRating = minRating - 0.3;
      console.log(
        `Rating filter too restrictive, relaxing to ${relaxedMinRating}`
      );

      filteredResults = results.filter(
        (hotel) => hotel.rating >= relaxedMinRating
      );
      console.log(`Relaxed rating filter results: ${filteredResults.length}`);
    }
  }

  // Apply price level filter based on budget preference
  if (preferences.budget) {
    const budgetStr = preferences.budget.toString().toLowerCase();
    console.log(`Applying budget filter: ${budgetStr}`);

    let priceLevel;
    let relaxedPriceLevels = [];

    // Map budget preference to Google Places price_level
    if (
      budgetStr.includes("luxury") ||
      budgetStr.includes("expensive") ||
      budgetStr.includes("high-end") ||
      budgetStr.includes("premium")
    ) {
      priceLevel = [3, 4]; // Expensive or Very Expensive
      relaxedPriceLevels = [2, 3, 4];
      console.log("Mapped to luxury price levels: 3-4");
    } else if (
      budgetStr.includes("budget") ||
      budgetStr.includes("cheap") ||
      budgetStr.includes("inexpensive") ||
      budgetStr.includes("low")
    ) {
      priceLevel = [1]; // Inexpensive
      relaxedPriceLevels = [1, 2];
      console.log("Mapped to budget price level: 1");
    } else if (
      budgetStr.includes("moderate") ||
      budgetStr.includes("mid-range") ||
      budgetStr.includes("average") ||
      budgetStr.includes("standard")
    ) {
      priceLevel = [2]; // Moderate
      relaxedPriceLevels = [1, 2, 3];
      console.log("Mapped to moderate price level: 2");
    }

    if (priceLevel) {
      const preFilterCount = filteredResults.length;

      // Filter by price level
      filteredResults = filteredResults.filter((hotel) => {
        // If price level is not available, use rating as a fallback
        if (!hotel.price_level) {
          if (Array.isArray(priceLevel) && priceLevel.includes(3)) {
            // For luxury, high ratings are acceptable substitutes
            return hotel.rating >= 4.5;
          } else if (Array.isArray(priceLevel) && priceLevel.includes(1)) {
            // For budget, lower ratings might indicate budget properties
            return hotel.rating <= 4.0;
          } else {
            // For moderate, mid-range ratings suggest moderate hotels
            return hotel.rating > 3.5 && hotel.rating < 4.5;
          }
        }

        return Array.isArray(priceLevel)
          ? priceLevel.includes(hotel.price_level)
          : hotel.price_level === priceLevel;
      });

      console.log(
        `Budget filter applied: ${preFilterCount} -> ${filteredResults.length} results`
      );

      // If filter eliminated too many results, use relaxed price levels
      if (filteredResults.length < 3 && results.length > 3) {
        console.log("Budget filter too restrictive, relaxing constraints");

        // Use relaxed price levels and resort by score later
        filteredResults = results.filter((hotel) => {
          if (!hotel.price_level) {
            // Use rating as proxy for missing price_level
            if (
              relaxedPriceLevels.includes(3) ||
              relaxedPriceLevels.includes(4)
            ) {
              return hotel.rating >= 4.0; // For relaxed luxury
            } else if (relaxedPriceLevels.includes(1)) {
              return true; // Accept all ratings for relaxed budget
            } else {
              return hotel.rating >= 3.5; // For relaxed moderate
            }
          }

          return relaxedPriceLevels.includes(hotel.price_level);
        });

        console.log(`Relaxed budget filter results: ${filteredResults.length}`);
      }
    }
  }

  // Apply amenities filter if specified
  if (preferences.amenities && preferences.amenities.length > 0) {
    const preFilterCount = filteredResults.length;

    // Filter for hotels that have ALL required amenities
    filteredResults = filteredResults.filter((hotel) => {
      const hotelAmenities = getAmenitiesFromTypes(hotel.types);

      // Check if all requested amenities are present
      return preferences.amenities.every((requestedAmenity) =>
        hotelAmenities.some((amenity) =>
          amenity.toLowerCase().includes(requestedAmenity.toLowerCase())
        )
      );
    });

    console.log(
      `Amenities filter applied: ${preFilterCount} -> ${filteredResults.length} results`
    );

    // If too restrictive (requiring ALL amenities), relax to require at least ONE
    if (filteredResults.length < 3 && results.length > 3) {
      console.log(
        "Amenities filter too restrictive, requiring at least one match"
      );

      filteredResults = results.filter((hotel) => {
        const hotelAmenities = getAmenitiesFromTypes(hotel.types);

        // Check if at least one requested amenity is present
        return preferences.amenities.some((requestedAmenity) =>
          hotelAmenities.some((amenity) =>
            amenity.toLowerCase().includes(requestedAmenity.toLowerCase())
          )
        );
      });

      console.log(
        `Relaxed amenities filter results: ${filteredResults.length}`
      );
    }
  }

  // If we have no results after filtering, use the original list
  if (filteredResults.length === 0 && results.length > 0) {
    console.log(
      "No results after filtering, using original results with sorting"
    );
    filteredResults = results;
  }

  // Score and sort the hotels
  const scoredHotels = filteredResults.map((hotel) => ({
    hotel,
    score: scoreHotel(hotel),
  }));

  // Sort by score (highest first)
  scoredHotels.sort((a, b) => b.score - a.score);

  console.log(
    "Top scored hotels:",
    scoredHotels.slice(0, 5).map((item) => ({
      name: item.hotel.name,
      rating: item.hotel.rating,
      price_level: item.hotel.price_level,
      score: item.score,
    }))
  );

  // Take the top results (max 8)
  const topResults = scoredHotels.slice(0, 8).map((item) => item.hotel);
  console.log(
    `Selected top ${topResults.length} hotels for display based on preference matching`
  );

  // Map to our standard format
  return topResults.map((hotel) => {
    // Map Google price_level to $ symbols
    let price_range = "";
    if (hotel.price_level) {
      price_range = "$".repeat(hotel.price_level);
    } else {
      // If price_level is not available, estimate based on rating
      if (hotel.rating >= 4.5) price_range = "$$$$";
      else if (hotel.rating >= 4.0) price_range = "$$$";
      else if (hotel.rating >= 3.0) price_range = "$$";
      else price_range = "$";
    }

    // Extract amenities from types
    const amenities = getAmenitiesFromTypes(hotel.types);

    // Format the location
    const location =
      hotel.vicinity || hotel.formatted_address || "Location info unavailable";

    // Create the hotel object in our standard format
    return {
      id: hotel.place_id,
      name: hotel.name,
      rating: hotel.rating || 0,
      price_range: price_range,
      location: location,
      address: hotel.formatted_address,
      amenities: amenities,
      photo:
        hotel.photos && hotel.photos.length > 0
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${hotel.photos[0].photo_reference}&key=${apiKey}`
          : null,
      coordinates: {
        lat: hotel.geometry.location.lat,
        lng: hotel.geometry.location.lng,
      },
      url: `https://www.google.com/maps/place/?q=place_id:${hotel.place_id}`,
    };
  });
}

/**
 * Extract amenities from place types
 *
 * @param {Array} types - Google place types
 * @returns {Array} - List of amenities
 */
function getAmenitiesFromTypes(types) {
  const amenities = [];

  // Map place types to common amenities
  if (types.includes("lodging")) amenities.push("Accommodation");
  if (types.includes("restaurant")) amenities.push("Restaurant");
  if (types.includes("bar")) amenities.push("Bar");
  if (types.includes("spa")) amenities.push("Spa");
  if (types.includes("gym")) amenities.push("Gym");
  if (types.includes("parking")) amenities.push("Parking");
  if (types.includes("airport_shuttle")) amenities.push("Airport Shuttle");

  // Add common amenities based on hotel type
  if (types.includes("lodging")) {
    amenities.push("Free WiFi");
    amenities.push("Air Conditioning");
  }

  return amenities;
}

/**
 * Simulate hotel data when the API is unavailable
 *
 * @param {string} location - Location name
 * @param {Object} preferenceOptions - User preferences
 * @returns {Object} - Simulated hotel data
 */
function simulateHotelData(location, preferenceOptions = {}) {
  console.log(
    `Simulating hotel data for ${location} with preferences:`,
    preferenceOptions
  );

  // Ensure budget parameters are consistent
  if (preferenceOptions.budget_level && !preferenceOptions.budget) {
    preferenceOptions.budget = preferenceOptions.budget_level;
    console.log(
      `Using budget_level "${preferenceOptions.budget_level}" as budget parameter in simulation`
    );
  } else if (preferenceOptions.budget && !preferenceOptions.budget_level) {
    preferenceOptions.budget_level = preferenceOptions.budget;
    console.log(
      `Using budget "${preferenceOptions.budget}" as budget_level parameter in simulation`
    );
  }

  // Process budget preferences
  let budget = "moderate"; // Default
  let priceRange = "$$";

  if (preferenceOptions.budget) {
    const budgetStr = preferenceOptions.budget.toString().toLowerCase();
    console.log(`Processing budget preference: ${budgetStr}`);

    // Map various budget terms
    if (
      budgetStr.includes("luxury") ||
      budgetStr.includes("expensive") ||
      budgetStr.includes("high-end") ||
      budgetStr.includes("premium")
    ) {
      budget = "luxury";
      priceRange = "$$$$";
    } else if (
      budgetStr.includes("moderate") ||
      budgetStr.includes("mid-range") ||
      budgetStr.includes("standard") ||
      budgetStr.includes("medium")
    ) {
      budget = "moderate";
      priceRange = "$$";
    } else if (
      budgetStr.includes("budget") ||
      budgetStr.includes("cheap") ||
      budgetStr.includes("inexpensive") ||
      budgetStr.includes("affordable") ||
      budgetStr.includes("low")
    ) {
      budget = "cheap";
      priceRange = "$";
    }

    console.log(`Mapped budget '${budgetStr}' to: ${budget} (${priceRange})`);
  }

  // Determine the minimum rating required (default: no minimum)
  let minRating = 0;
  if (preferenceOptions.rating) {
    minRating = parseFloat(preferenceOptions.rating);
    console.log(`Minimum rating requirement: ${minRating}`);
  }

  // Create a collection of hotels for all supported cities
  const cityHotels = {};

  // Las Vegas hotels
  cityHotels.lasVegas = {
    luxury: [
      {
        name: "Bellagio Las Vegas",
        rating: 4.8,
        price_range: "$$$$",
        price_level: 4,
        amenities: [
          "Pool",
          "Spa",
          "Casino",
          "Gourmet Restaurants",
          "Fountain Show",
          "Fine Art Gallery",
        ],
        location: "Las Vegas Strip",
        address: "3600 S Las Vegas Blvd, Las Vegas, NV",
        photo: null,
        simulated: true,
      },
      {
        name: "Wynn Las Vegas",
        rating: 4.9,
        price_range: "$$$$",
        price_level: 4,
        amenities: [
          "Luxury Spa",
          "Golf Course",
          "Casino",
          "Designer Shopping",
          "Fine Dining",
          "Nightclub",
        ],
        location: "Las Vegas Strip",
        address: "3131 Las Vegas Blvd S, Las Vegas, NV",
        photo: null,
        simulated: true,
      },
      {
        name: "The Venetian Resort",
        rating: 4.7,
        price_range: "$$$$",
        price_level: 4,
        amenities: [
          "Grand Canal Shoppes",
          "Casino",
          "Gondola Rides",
          "Canyon Ranch Spa",
          "Celebrity Restaurants",
        ],
        location: "Las Vegas Strip",
        address: "3355 Las Vegas Blvd S, Las Vegas, NV",
        photo: null,
        simulated: true,
      },
      {
        name: "Aria Resort & Casino",
        rating: 4.6,
        price_range: "$$$$",
        price_level: 4,
        amenities: [
          "Modern Luxury",
          "High-tech Rooms",
          "Fine Dining",
          "Spa",
          "Pool Complex",
        ],
        location: "Las Vegas Strip",
        address: "3730 S Las Vegas Blvd, Las Vegas, NV",
        photo: null,
        simulated: true,
      },
      {
        name: "Cosmopolitan of Las Vegas",
        rating: 4.7,
        price_range: "$$$$",
        price_level: 4,
        amenities: [
          "Luxury Suites",
          "Award-winning Restaurants",
          "Nightlife",
          "Rooftop Pool",
          "Casino",
        ],
        location: "Las Vegas Strip",
        address: "3708 Las Vegas Blvd S, Las Vegas, NV",
        photo: null,
        simulated: true,
      },
    ],
    moderate: [
      {
        name: "The LINQ Hotel & Casino",
        rating: 4.1,
        price_range: "$$",
        price_level: 2,
        amenities: [
          "Casino",
          "High Roller Observation Wheel",
          "Shopping Promenade",
          "Outdoor Pool",
        ],
        location: "Las Vegas Strip",
        address: "3535 Las Vegas Blvd S, Las Vegas, NV",
        photo: null,
        simulated: true,
      },
      {
        name: "MGM Park",
        rating: 4.3,
        price_range: "$$",
        price_level: 2,
        amenities: [
          "Casino",
          "Pool Complex",
          "Entertainment Venues",
          "Dining Options",
        ],
        location: "Las Vegas Strip",
        address: "3770 Las Vegas Blvd S, Las Vegas, NV",
        photo: null,
        simulated: true,
      },
      {
        name: "Flamingo Las Vegas",
        rating: 4.0,
        price_range: "$$",
        price_level: 2,
        amenities: ["Wildlife Habitat", "Pool", "Casino", "Live Entertainment"],
        location: "Las Vegas Strip",
        address: "3555 Las Vegas Blvd S, Las Vegas, NV",
        photo: null,
        simulated: true,
      },
      {
        name: "Treasure Island",
        rating: 4.2,
        price_range: "$$",
        price_level: 2,
        amenities: ["Casino", "Pool", "Dining Options", "Entertainment"],
        location: "Las Vegas Strip",
        address: "3300 Las Vegas Blvd S, Las Vegas, NV",
        photo: null,
        simulated: true,
      },
    ],
    cheap: [
      {
        name: "Excalibur Hotel & Casino",
        rating: 3.7,
        price_range: "$",
        price_level: 1,
        amenities: ["Casino", "Pool", "Budget Dining", "Entertainment"],
        location: "Las Vegas Strip",
        address: "3850 Las Vegas Blvd S, Las Vegas, NV",
        photo: null,
        simulated: true,
      },
      {
        name: "Circus Circus Hotel & Casino",
        rating: 3.5,
        price_range: "$",
        price_level: 1,
        amenities: [
          "Adventuredome Theme Park",
          "Circus Acts",
          "Budget Rooms",
          "Casino",
        ],
        location: "Las Vegas Strip",
        address: "2880 Las Vegas Blvd S, Las Vegas, NV",
        photo: null,
        simulated: true,
      },
      {
        name: "Luxor Hotel & Casino",
        rating: 3.8,
        price_range: "$",
        price_level: 1,
        amenities: [
          "Pyramid Structure",
          "Casino",
          "Pool",
          "Entertainment Shows",
        ],
        location: "Las Vegas Strip",
        address: "3900 S Las Vegas Blvd, Las Vegas, NV",
        photo: null,
        simulated: true,
      },
      {
        name: "The Strat Hotel & Casino",
        rating: 3.9,
        price_range: "$",
        price_level: 1,
        amenities: [
          "Observation Tower",
          "Thrill Rides",
          "Casino",
          "Budget Rooms",
        ],
        location: "North Las Vegas Strip",
        address: "2000 Las Vegas Blvd S, Las Vegas, NV",
        photo: null,
        simulated: true,
      },
    ],
  };

  // Tel Aviv hotels
  cityHotels.telAviv = {
    luxury: [
      {
        name: "Dan Tel Aviv Hotel",
        rating: 4.8,
        price_range: "$$$$",
        price_level: 4,
        amenities: [
          "Pool",
          "Spa",
          "Free WiFi",
          "Restaurant",
          "Room Service",
          "Beach Access",
        ],
        location: "Tel Aviv Beachfront",
        address: "99 HaYarkon St, Tel Aviv",
        photo: null,
        simulated: true,
      },
      {
        name: "Hilton Tel Aviv",
        rating: 4.6,
        price_range: "$$$$",
        price_level: 4,
        amenities: [
          "Pool",
          "Spa",
          "Free WiFi",
          "Business Center",
          "Fitness Center",
          "Beach Access",
        ],
        location: "Independence Park",
        address: "205 HaYarkon St, Tel Aviv",
        photo: null,
        simulated: true,
      },
      {
        name: "The Norman Tel Aviv",
        rating: 4.9,
        price_range: "$$$$",
        price_level: 4,
        amenities: [
          "Luxury Boutique",
          "Fine Dining",
          "Rooftop Pool",
          "Spa",
          "Art Collection",
        ],
        location: "Central Tel Aviv",
        address: "23-25 Nachmani St, Tel Aviv",
        photo: null,
        simulated: true,
      },
      {
        name: "Royal Beach Tel Aviv",
        rating: 4.7,
        price_range: "$$$$",
        price_level: 4,
        amenities: [
          "Beachfront",
          "Spa",
          "Infinity Pool",
          "Gourmet Dining",
          "Luxury Rooms",
        ],
        location: "Tel Aviv Beachfront",
        address: "19 HaYarkon St, Tel Aviv",
        photo: null,
        simulated: true,
      },
    ],
    moderate: [
      {
        name: "Rothschild 22 Hotel",
        rating: 4.3,
        price_range: "$$$",
        price_level: 3,
        amenities: [
          "Free WiFi",
          "Breakfast included",
          "City Views",
          "Business Center",
        ],
        location: "Rothschild Boulevard",
        address: "22 Rothschild Blvd, Tel Aviv",
        photo: null,
        simulated: true,
      },
      {
        name: "Hotel Saul",
        rating: 4.1,
        price_range: "$$",
        price_level: 2,
        amenities: [
          "Free WiFi",
          "Modern Design",
          "Central Location",
          "Bicycle Rental",
        ],
        location: "City Center",
        address: "17 Tchernichovsky St, Tel Aviv",
        photo: null,
        simulated: true,
      },
      {
        name: "Prima City Hotel",
        rating: 4.0,
        price_range: "$$",
        price_level: 2,
        amenities: [
          "Breakfast Included",
          "Near Beach",
          "Terrace",
          "Good Value",
        ],
        location: "Beach Area",
        address: "9 Mapu St, Tel Aviv",
        photo: null,
        simulated: true,
      },
      {
        name: "Abraham Hostel Tel Aviv",
        rating: 4.4,
        price_range: "$$",
        price_level: 2,
        amenities: [
          "Rooftop Terrace",
          "Bar",
          "Social Events",
          "Budget Friendly",
        ],
        location: "Rothschild Area",
        address: "21 Levontin St, Tel Aviv",
        photo: null,
        simulated: true,
      },
    ],
    budget: [
      {
        name: "Dizengoff Inn TLV",
        rating: 3.8,
        price_range: "$",
        price_level: 1,
        amenities: [
          "Free WiFi",
          "24-hour Reception",
          "Budget Friendly",
          "Walking Distance to Beach",
        ],
        location: "Dizengoff Area",
        address: "126 Dizengoff St, Tel Aviv",
        photo: null,
        simulated: true,
      },
      {
        name: "Olympic Hotel Tel Aviv",
        rating: 3.5,
        price_range: "$",
        price_level: 1,
        amenities: [
          "Budget Rooms",
          "Central Location",
          "WiFi",
          "Basic Accommodations",
        ],
        location: "Tel Aviv Center",
        address: "5 Shalom Aleichem St, Tel Aviv",
        photo: null,
        simulated: true,
      },
      {
        name: "Sky Hostel TLV",
        rating: 3.6,
        price_range: "$",
        price_level: 1,
        amenities: [
          "Budget Friendly",
          "Shared Kitchen",
          "Lounge Area",
          "Central Location",
        ],
        location: "City Center",
        address: "2 Florentin St, Tel Aviv",
        photo: null,
        simulated: true,
      },
    ],
  };

  // Generic hotels (used for any location not specifically defined)
  cityHotels.generic = {
    luxury: [
      {
        name: "{location} Grand Luxury Hotel",
        rating: 4.9,
        price_range: "$$$$",
        price_level: 4,
        amenities: ["Pool", "Spa", "Fine Dining", "Concierge", "Room Service"],
        location: "Premium District",
        address: "123 Luxury Ave, {location}",
        photo: null,
        simulated: true,
      },
      {
        name: "Royal {location} Palace",
        rating: 4.8,
        price_range: "$$$$",
        price_level: 4,
        amenities: [
          "Pool",
          "Spa",
          "Gourmet Restaurant",
          "Butler Service",
          "Luxury Suites",
        ],
        location: "City Center",
        address: "45 Royal Blvd, {location}",
        photo: null,
        simulated: true,
      },
      {
        name: "The {location} Grand Hotel",
        rating: 4.7,
        price_range: "$$$$",
        price_level: 4,
        amenities: [
          "Historic Building",
          "Luxury Amenities",
          "Restaurant",
          "Bar",
          "Concierge",
        ],
        location: "Downtown",
        address: "1 Main Plaza, {location}",
        photo: null,
        simulated: true,
      },
    ],
    moderate: [
      {
        name: "{location} Plaza Inn",
        rating: 4.2,
        price_range: "$$$",
        price_level: 3,
        amenities: ["Free WiFi", "Breakfast included", "Fitness Center"],
        location: "Downtown",
        address: "456 Market St, {location}",
        photo: null,
        simulated: true,
      },
      {
        name: "Comfort Lodge {location}",
        rating: 3.8,
        price_range: "$$",
        price_level: 2,
        amenities: ["Free WiFi", "Parking", "Pet Friendly"],
        location: "Suburb Area",
        address: "789 Oak Ave, {location}",
        photo: null,
        simulated: true,
      },
      {
        name: "Central {location} Inn",
        rating: 4.0,
        price_range: "$$",
        price_level: 2,
        amenities: ["City Views", "Restaurant", "Business Center", "WiFi"],
        location: "City Center",
        address: "500 Center St, {location}",
        photo: null,
        simulated: true,
      },
    ],
    budget: [
      {
        name: "Budget Stay {location}",
        rating: 3.5,
        price_range: "$",
        price_level: 1,
        amenities: ["Free WiFi", "24-hour Reception"],
        location: "Near Airport",
        address: "101 Airport Rd, {location}",
        photo: null,
        simulated: true,
      },
      {
        name: "Economy Inn {location}",
        rating: 3.2,
        price_range: "$",
        price_level: 1,
        amenities: ["Free Parking", "Basic Amenities", "Budget Friendly"],
        location: "Outskirts",
        address: "222 Value St, {location}",
        photo: null,
        simulated: true,
      },
      {
        name: "{location} Budget Hostel",
        rating: 3.4,
        price_range: "$",
        price_level: 1,
        amenities: ["Shared Facilities", "Budget Friendly", "Common Area"],
        location: "City Outskirts",
        address: "15 Economy Rd, {location}",
        photo: null,
        simulated: true,
      },
    ],
  };

  // Determine which city's hotel data to use
  let cityKey = "generic";
  const normalizedLocation = location.toLowerCase();

  if (
    normalizedLocation.includes("las vegas") ||
    normalizedLocation.includes("vegas")
  ) {
    cityKey = "lasVegas";
    console.log("Using Las Vegas hotel data");
  } else if (normalizedLocation.includes("tel aviv")) {
    cityKey = "telAviv";
    console.log("Using Tel Aviv hotel data");
  } else {
    console.log(`Using generic hotel data for ${location}`);
  }

  // Get the full set of hotels for this city
  let allHotels = [];

  // Start with hotels matching the budget preference
  let hotelsFound = false;

  // First try exact match with the requested budget level
  if (cityHotels[cityKey][budget]) {
    allHotels = [...cityHotels[cityKey][budget]];
    hotelsFound = true;
  }
  // Special handling for "cheap" vs "budget" compatibility
  else if (budget === "cheap" && cityHotels[cityKey].budget) {
    // If "cheap" is requested but we only have "budget" category
    allHotels = [...cityHotels[cityKey].budget];
    console.log("Used legacy 'budget' category for 'cheap' request");
    hotelsFound = true;
  } else if (budget === "budget" && cityHotels[cityKey].cheap) {
    // If "budget" is requested but we have the new "cheap" category
    allHotels = [...cityHotels[cityKey].cheap];
    console.log("Used 'cheap' category for 'budget' request");
    hotelsFound = true;
  }

  // If we need more hotels or need to match rating, add other categories
  if (allHotels.length < 5 || minRating > 0) {
    // Add luxury hotels if needed (high ratings)
    if (budget !== "luxury" && (minRating >= 4.5 || allHotels.length < 3)) {
      allHotels = [...allHotels, ...cityHotels[cityKey].luxury];
    }

    // Add moderate hotels if needed
    if (budget !== "moderate" && allHotels.length < 5) {
      allHotels = [...allHotels, ...cityHotels[cityKey].moderate];
    }

    // Add budget/cheap hotels if needed
    if (budget !== "cheap" && allHotels.length < 5) {
      // Support both new "cheap" and legacy "budget" categories
      if (cityHotels[cityKey].cheap) {
        allHotels = [...allHotels, ...cityHotels[cityKey].cheap];
      } else if (cityHotels[cityKey].budget) {
        // Fallback to legacy "budget" category if needed
        allHotels = [...allHotels, ...cityHotels[cityKey].budget];
      }
    }
  }

  // For generic locations, replace {location} in hotel names and addresses
  if (cityKey === "generic") {
    allHotels = allHotels.map((hotel) => ({
      ...hotel,
      name: hotel.name.replace("{location}", location),
      address: hotel.address.replace("{location}", location),
    }));
  }

  // Apply rating filter if specified
  if (minRating > 0) {
    const preFilterCount = allHotels.length;
    allHotels = allHotels.filter((hotel) => hotel.rating >= minRating);
    console.log(
      `Applied rating filter (${minRating}): ${preFilterCount} -> ${allHotels.length} results`
    );

    // If filter is too restrictive, relax it slightly
    if (allHotels.length < 3 && preFilterCount > 3) {
      const relaxedMinRating = minRating - 0.3;
      allHotels = allHotels.filter((hotel) => hotel.rating >= relaxedMinRating);
      console.log(
        `Relaxed rating filter to ${relaxedMinRating}, results: ${allHotels.length}`
      );
    }
  }

  // Apply amenities filter if specified
  if (preferenceOptions.amenities && preferenceOptions.amenities.length > 0) {
    const preFilterCount = allHotels.length;

    // Filter for hotels that have at least one of the requested amenities
    allHotels = allHotels.filter((hotel) =>
      preferenceOptions.amenities.some((requestedAmenity) =>
        hotel.amenities.some((amenity) =>
          amenity.toLowerCase().includes(requestedAmenity.toLowerCase())
        )
      )
    );

    console.log(
      `Applied amenities filter: ${preFilterCount} -> ${allHotels.length} results`
    );
  }

  // Calculate a score for each hotel based on how well it matches preferences
  const scoreHotel = (hotel) => {
    let score = 0;

    // Base score from rating (0-5 points)
    score += hotel.rating || 0;

    // Budget preference score
    if (budget === "luxury") {
      // For luxury, higher price levels get more points
      score += (hotel.price_level || 0) * 0.5;
    } else if (budget === "cheap" || budget === "budget") {
      // For cheap/budget, lower price levels get more points
      score += (5 - (hotel.price_level || 0)) * 0.5;
    } else {
      // For moderate, mid range gets more points
      score += hotel.price_level === 2 || hotel.price_level === 3 ? 1.5 : 0.5;
    }

    // Bonus for exactly matching the budget level
    if (
      (budget === "luxury" && hotel.price_level === 4) ||
      (budget === "moderate" && hotel.price_level === 2) ||
      ((budget === "cheap" || budget === "budget") && hotel.price_level === 1)
    ) {
      score += 1;
    }

    // Amenity matching
    if (preferenceOptions.amenities && preferenceOptions.amenities.length > 0) {
      let matchCount = 0;
      preferenceOptions.amenities.forEach((requestedAmenity) => {
        if (
          hotel.amenities.some((amenity) =>
            amenity.toLowerCase().includes(requestedAmenity.toLowerCase())
          )
        ) {
          matchCount++;
        }
      });
      score += matchCount * 0.5;
    }

    return score;
  };

  // Score and sort the hotels
  const scoredHotels = allHotels.map((hotel) => ({
    hotel,
    score: scoreHotel(hotel),
  }));

  // Sort by score (highest first)
  scoredHotels.sort((a, b) => b.score - a.score);

  console.log(
    "Top scored hotels:",
    scoredHotels.slice(0, 5).map((item) => ({
      name: item.hotel.name,
      rating: item.hotel.rating,
      price_range: item.hotel.price_range,
      score: item.score,
    }))
  );

  // Take the top results
  const selectedHotels = scoredHotels.slice(0, 8).map((item) => item.hotel);

  // Create the response object
  const hotelData = {
    success: true,
    location: location,
    hotels: selectedHotels,
    simulated: true,
  };

  console.log(`Generated ${selectedHotels.length} hotels for ${location}`);
  return hotelData;
}
