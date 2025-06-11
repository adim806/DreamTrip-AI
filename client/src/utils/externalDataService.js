/**
 * Service utilities for fetching external data for RAG (Retrieval-Augmented Generation)
 */

// Import the new service modules
import {
  fetchFlightInformation,
  fetchFlightStatus,
} from "./services/flightService";
import { fetchLocalEvents, fetchEventDetails } from "./services/eventsService";
import {
  fetchTravelRestrictions,
  fetchSafetyInformation,
} from "./services/restrictionsService";
import {
  fetchCurrencyConversion,
  fetchCostEstimates,
} from "./services/currencyService";
import { fetchHotelRecommendations as fetchHotelsFromAPI } from "./services/hotelService";
import { fetchAttractionRecommendations as fetchAttractionsFromAPI } from "./services/attractionsService";
import { fetchRestaurantRecommendations as fetchRestaurantsFromAPI } from "./services/restaurantsService";
import {
  EXTERNAL_DATA_INTENTS,
  ADVICE_INTENTS,
  isAdviceIntent,
} from "./advice/AdviceFieldSchemas";

// Import location utilities
import {
  inferCountryForCity,
  parseLocationString,
  formatLocation,
} from "./cityCountryMapper";

// The location handling utility functions are imported from cityCountryMapper.js above

// API endpoint for server-side external data fetching
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Extract and normalize filter parameters from user input
 * Provides a unified approach to handle filters across all service types
 *
 * @param {string} intent - The service intent (Find-Hotel, Find-Attractions, Find-Restaurants)
 * @param {object} requestDetails - Raw request details including user constraints
 * @returns {object} - Normalized filter parameters for the specific service type
 */
export const extractFilterParameters = (intent, requestDetails) => {
  // Create a base filter object
  const filters = {};

  // Extract common filters available across services
  if (requestDetails.budget_level) {
    filters.budget_level = requestDetails.budget_level;
  }

  if (requestDetails.price_level) {
    filters.price_level =
      requestDetails.price_level || requestDetails.budget_level;
  }

  if (requestDetails.rating) {
    filters.rating = requestDetails.rating;
  }

  // Service-specific filter extraction
  switch (intent) {
    case "Find-Hotel":
      // Hotel specific filters
      if (requestDetails.amenities) {
        filters.amenities = Array.isArray(requestDetails.amenities)
          ? requestDetails.amenities
          : [requestDetails.amenities];
      }

      if (requestDetails.hotel_type || requestDetails.type) {
        filters.hotel_type = requestDetails.hotel_type || requestDetails.type;
      }

      // Map budget_level to price range if needed
      if (filters.budget_level && !filters.price_level) {
        // Map budget descriptions to price levels
        const budgetToPrice = {
          cheap: "budget",
          budget: "budget",
          affordable: "economy",
          moderate: "midrange",
          expensive: "luxury",
          luxury: "luxury",
          "high-end": "luxury",
        };

        filters.price_level =
          budgetToPrice[filters.budget_level.toLowerCase()] ||
          filters.budget_level;
      }

      break;

    case "Find-Attractions":
      // Attraction specific filters
      if (requestDetails.category) {
        filters.category = requestDetails.category;
      }

      if (requestDetails.activity_type || requestDetails.type) {
        filters.activity_type =
          requestDetails.activity_type || requestDetails.type;
      }

      if (requestDetails.duration) {
        filters.duration = requestDetails.duration;
      }

      break;

    case "Find-Restaurants":
      // Restaurant specific filters
      if (requestDetails.cuisine) {
        filters.cuisine = requestDetails.cuisine;
      }

      if (requestDetails.dietary || requestDetails.dietary_restrictions) {
        filters.dietary_restrictions =
          requestDetails.dietary || requestDetails.dietary_restrictions;
      }

      if (requestDetails.meal_type) {
        filters.meal_type = requestDetails.meal_type;
      }

      // Map budget_level to price range for restaurants
      if (filters.budget_level && !filters.price_level) {
        // Convert text budget levels to price indicators ($/$$/$$$)
        const budgetToPrice = {
          cheap: "$",
          budget: "$",
          affordable: "$$",
          moderate: "$$",
          expensive: "$$$",
          luxury: "$$$$",
          "high-end": "$$$$",
        };

        filters.price =
          budgetToPrice[filters.budget_level.toLowerCase()] ||
          filters.budget_level;
      }

      break;

    default:
      // No special handling for other intents
      break;
  }

  // Log extracted filters for debugging
  console.log(`Extracted ${intent} filters:`, filters);

  return filters;
};

/**
 * Fetches weather data for a specific location and date
 * @param {string} location - The location to get weather for
 * @param {string} country - The country where the location is
 * @param {string} date - The date to get weather for (YYYY-MM-DD)
 * @returns {Promise<Object>} - Weather data or error object
 */
export const fetchWeatherData = async (location, country, date) => {
  try {
    // Validate inputs
    if (!location) {
      console.warn("fetchWeatherData called without location");
      return {
        success: false,
        error: "Location is required for weather data",
      };
    }

    // Log all parameters to troubleshoot
    console.log(`fetchWeatherData called with parameters:`, {
      location,
      country,
      date,
    });

    // Call server-side endpoint instead of directly accessing OpenWeatherMap API
    const params = new URLSearchParams({
      location,
      ...(country && { country }),
      ...(date && { date }),
    });

    const response = await fetch(
      `${API_BASE_URL}/api/external/weather?${params}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server returned ${response.status}`);
    }

    const weatherData = await response.json();
    console.log("Retrieved weather data from server:", weatherData);
    return weatherData;
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return {
      success: false,
      error: "Failed to retrieve weather data from the service",
      simulated: false,
    };
  }
};

/**
 * Infers the country for well-known cities when country is not specified
 * @param {string} city - The city name
 * @returns {string|null} - The inferred country name or null if unknown
 */
function inferCountryForWellKnownCity(city) {
  if (!city) return null;

  // Normalize the city name for comparison
  const normalizedCity = city.trim().toLowerCase();

  // Map of well-known cities to their countries
  const wellKnownCities = {
    // Major European cities
    rome: "Italy",
    milan: "Italy",
    florence: "Italy",
    venice: "Italy",
    naples: "Italy",
    paris: "France",
    nice: "France",
    lyon: "France",
    marseille: "France",
    london: "United Kingdom",
    manchester: "United Kingdom",
    liverpool: "United Kingdom",
    edinburgh: "United Kingdom",
    glasgow: "United Kingdom",
    madrid: "Spain",
    barcelona: "Spain",
    seville: "Spain",
    valencia: "Spain",
    berlin: "Germany",
    munich: "Germany",
    hamburg: "Germany",
    frankfurt: "Germany",
    cologne: "Germany",
    athens: "Greece",
    thessaloniki: "Greece",
    amsterdam: "Netherlands",
    rotterdam: "Netherlands",
    brussels: "Belgium",
    antwerp: "Belgium",
    vienna: "Austria",
    salzburg: "Austria",
    zurich: "Switzerland",
    geneva: "Switzerland",
    bern: "Switzerland",
    copenhagen: "Denmark",
    stockholm: "Sweden",
    oslo: "Norway",
    helsinki: "Finland",
    lisbon: "Portugal",
    porto: "Portugal",
    dublin: "Ireland",
    prague: "Czech Republic",
    budapest: "Hungary",
    warsaw: "Poland",
    krakow: "Poland",

    // Major North American cities
    "new york": "USA",
    "los angeles": "USA",
    chicago: "USA",
    houston: "USA",
    phoenix: "USA",
    philadelphia: "USA",
    "san antonio": "USA",
    "san diego": "USA",
    dallas: "USA",
    "san jose": "USA",
    austin: "USA",
    miami: "USA",
    atlanta: "USA",
    toronto: "Canada",
    montreal: "Canada",
    vancouver: "Canada",
    "mexico city": "Mexico",

    // Major Asian cities
    tokyo: "Japan",
    osaka: "Japan",
    kyoto: "Japan",
    seoul: "South Korea",
    beijing: "China",
    shanghai: "China",
    "hong kong": "Hong Kong",
    singapore: "Singapore",
    bangkok: "Thailand",
    mumbai: "India",
    delhi: "India",

    // Major Middle Eastern cities
    dubai: "United Arab Emirates",
    "abu dhabi": "United Arab Emirates",
    doha: "Qatar",
    istanbul: "Turkey",
    jerusalem: "Israel",
    "tel aviv": "Israel",

    // Major Australian cities
    sydney: "Australia",
    melbourne: "Australia",
    brisbane: "Australia",
    perth: "Australia",
  };

  // Try direct match
  if (wellKnownCities[normalizedCity]) {
    console.log(
      `Inferred country for ${city}: ${wellKnownCities[normalizedCity]}`
    );
    return wellKnownCities[normalizedCity];
  }

  // Try to find a match with part of the name (for cities with compound names)
  for (const knownCity in wellKnownCities) {
    if (
      normalizedCity.includes(knownCity) ||
      knownCity.includes(normalizedCity)
    ) {
      console.log(
        `Fuzzy match: Inferred country for ${city}: ${wellKnownCities[knownCity]}`
      );
      return wellKnownCities[knownCity];
    }
  }

  // No match found
  return null;
}

/**
 * Gets the preferred country code for internationally known cities with multiple versions
 * @param {string} city - The city name
 * @returns {string|null} - The preferred country code or null
 */
function getPreferredCountryForCity(city) {
  if (!city) return null;

  // Normalize the city name for comparison
  const normalizedCity = city.trim().toLowerCase();

  // Cities that are known to have namesakes but one is more internationally recognized
  const cityPreferences = {
    rome: "IT", // Rome, Italy is more well-known than Rome, GA (US)
    paris: "FR", // Paris, France is more well-known than Paris, TX (US)
    london: "GB", // London, UK is more well-known than London, ON (Canada)
    athens: "GR", // Athens, Greece is more well-known than Athens, GA (US)
    dublin: "IE", // Dublin, Ireland is more well-known than Dublin, CA (US)
    vienna: "AT", // Vienna, Austria is more well-known than Vienna, VA (US)
    moscow: "RU", // Moscow, Russia is more well-known than Moscow, ID (US)
    sydney: "AU", // Sydney, Australia is more well-known than Sydney, NS (Canada)
    birmingham: "GB", // Birmingham, UK is more well-known than Birmingham, AL (US)
    manchester: "GB", // Manchester, UK is more well-known than Manchester, NH (US)
    cambridge: "GB", // Cambridge, UK is more well-known than Cambridge, MA (US)
    oxford: "GB", // Oxford, UK is more well-known than Oxford, MS (US)
    hamburg: "DE", // Hamburg, Germany is more well-known than Hamburg, NY (US)
    melbourne: "AU", // Melbourne, Australia is more well-known than Melbourne, FL (US)
    glasgow: "GB", // Glasgow, Scotland is more well-known than Glasgow, KY (US)
    stockholm: "SE", // Stockholm, Sweden is more well-known than Stockholm, NJ (US)
    florence: "IT", // Florence, Italy is more well-known than Florence, SC (US)
    barcelona: "ES", // Barcelona, Spain is more well-known than Barcelona, Venezuela
    cairo: "EG", // Cairo, Egypt is more well-known than Cairo, GA (US)
    berlin: "DE", // Berlin, Germany is more well-known than Berlin, NH (US)
    naples: "IT", // Naples, Italy is more well-known than Naples, FL (US)
  };

  return cityPreferences[normalizedCity] || null;
}

/**
 * Get ISO country code from country name
 * @param {string} countryName - Country name
 * @returns {string|null} - Two-letter ISO country code or null if not found
 */
function getCountryCode(countryName) {
  if (!countryName) return null;

  // Common country mappings
  const countryMappings = {
    "united states": "US",
    usa: "US",
    "united states of america": "US",
    uk: "GB",
    "united kingdom": "GB",
    "great britain": "GB",
    england: "GB",
    italy: "IT",
    italia: "IT",
    france: "FR",
    germany: "DE",
    deutschland: "DE",
    spain: "ES",
    españa: "ES",
    japan: "JP",
    china: "CN",
    india: "IN",
    brazil: "BR",
    brasil: "BR",
    canada: "CA",
    australia: "AU",
    russia: "RU",
    mexico: "MX",
    "south korea": "KR",
    korea: "KR",
    israel: "IL",
    greece: "GR",
    switzerland: "CH",
    sweden: "SE",
    norway: "NO",
    denmark: "DK",
    finland: "FI",
    netherlands: "NL",
    holland: "NL",
    belgium: "BE",
    austria: "AT",
    portugal: "PT",
    ireland: "IE",
    "new zealand": "NZ",
    turkey: "TR",
    türkiye: "TR",
    egypt: "EG",
    "south africa": "ZA",
    poland: "PL",
    ukraine: "UA",
    romania: "RO",
    thailand: "TH",
    indonesia: "ID",
    malaysia: "MY",
    singapore: "SG",
    philippines: "PH",
    vietnam: "VN",
    "saudi arabia": "SA",
    "united arab emirates": "AE",
    uae: "AE",
    qatar: "QA",
    argentina: "AR",
    chile: "CL",
    colombia: "CO",
    peru: "PE",
    venezuela: "VE",
  };

  // Try to find a match
  const normalizedCountry = countryName.toLowerCase().trim();
  if (countryMappings[normalizedCountry]) {
    return countryMappings[normalizedCountry];
  }

  // If it's already a 2-letter code, verify and return
  if (
    normalizedCountry.length === 2 &&
    normalizedCountry === normalizedCountry.toUpperCase()
  ) {
    return normalizedCountry;
  }

  // Return null if no match found
  return null;
}

/**
 * Get country name from ISO country code
 * @param {string} countryCode - Two-letter ISO country code
 * @returns {string} - Country name or the code itself if not found
 */
function getCountryName(countryCode) {
  if (!countryCode) return "Unknown";

  // Common country code to name mappings
  const codeToCountry = {
    US: "United States",
    GB: "United Kingdom",
    IT: "Italy",
    FR: "France",
    DE: "Germany",
    ES: "Spain",
    JP: "Japan",
    CN: "China",
    IN: "India",
    BR: "Brazil",
    CA: "Canada",
    AU: "Australia",
    RU: "Russia",
    MX: "Mexico",
    KR: "South Korea",
    IL: "Israel",
    GR: "Greece",
    CH: "Switzerland",
    SE: "Sweden",
    NO: "Norway",
    DK: "Denmark",
    FI: "Finland",
    NL: "Netherlands",
    BE: "Belgium",
    AT: "Austria",
    PT: "Portugal",
    IE: "Ireland",
    NZ: "New Zealand",
    TR: "Turkey",
    EG: "Egypt",
    ZA: "South Africa",
    PL: "Poland",
    UA: "Ukraine",
    RO: "Romania",
    TH: "Thailand",
    ID: "Indonesia",
    MY: "Malaysia",
    SG: "Singapore",
    PH: "Philippines",
    VN: "Vietnam",
    SA: "Saudi Arabia",
    AE: "United Arab Emirates",
    QA: "Qatar",
    AR: "Argentina",
    CL: "Chile",
    CO: "Colombia",
    PE: "Peru",
    VE: "Venezuela",
  };

  return codeToCountry[countryCode] || countryCode;
}

/**
 * Helper function to convert wind direction in degrees to cardinal direction
 * @param {number} degrees - Wind direction in degrees
 * @returns {string} - Cardinal direction (N, NE, E, etc.)
 */
function degreesToDirection(degrees) {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round((degrees % 360) / 22.5) % 16;
  return directions[index];
}

/**
 * Helper function to get the most frequent value in an array
 * @param {Array} array - Array of values
 * @returns {*} - Most frequent value
 */
function getFrequentValue(array) {
  const frequency = {};
  let maxFreq = 0;
  let mostFrequent;

  for (const value of array) {
    frequency[value] = (frequency[value] || 0) + 1;

    if (frequency[value] > maxFreq) {
      maxFreq = frequency[value];
      mostFrequent = value;
    }
  }

  return mostFrequent;
}

/**
 * Helper function to calculate average wind direction in degrees
 * @param {Array<number>} degrees - Array of wind directions in degrees
 * @returns {number} - Average wind direction in degrees
 */
function getAverageWindDirection(degrees) {
  // Convert degrees to radians
  const radians = degrees.map((deg) => (deg * Math.PI) / 180);

  // Calculate average of sine and cosine components
  const sumSin = radians.reduce((sum, rad) => sum + Math.sin(rad), 0);
  const sumCos = radians.reduce((sum, rad) => sum + Math.cos(rad), 0);

  // Calculate average angle
  const avgRadian = Math.atan2(
    sumSin / radians.length,
    sumCos / radians.length
  );

  // Convert back to degrees
  let avgDegree = (avgRadian * 180) / Math.PI;

  // Ensure result is between 0-360
  if (avgDegree < 0) avgDegree += 360;

  return avgDegree;
}

/**
 * Fetches hotel recommendations for a location with given constraints
 * @param {string} location - The location to find hotels in
 * @param {Object} preferences - User preferences for filtering hotels
 * @returns {Promise<Object>} - Hotel data or error object
 */
export const fetchHotelRecommendations = async (location, preferences = {}) => {
  try {
    console.log(
      `Fetching hotel recommendations for ${location} with preferences:`,
      preferences
    );

    // Call server-side endpoint instead of direct API access
    const params = new URLSearchParams({
      location,
      ...(preferences.country && { country: preferences.country }),
      ...(preferences.budget_level && {
        budget_level: preferences.budget_level,
      }),
      ...(preferences.price_level && {
        price_level: preferences.price_level,
      }),
      ...(preferences.rating && {
        rating: preferences.rating,
      }),
      ...(preferences.hotel_type && {
        hotel_type: preferences.hotel_type,
      }),
    });

    // If there are complex preferences, stringify and add them
    if (Object.keys(preferences).length > 0) {
      params.append("preferences", JSON.stringify(preferences));
    }

    const response = await fetch(
      `${API_BASE_URL}/api/external/hotels?${params}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server returned ${response.status}`);
    }

    const hotelData = await response.json();
    console.log("Retrieved hotel data from server:", hotelData);
    return hotelData;
  } catch (error) {
    console.error("Error fetching hotel recommendations:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetches top attractions for a given location
 * @param {string} location - The location to find attractions in
 * @param {Object} filters - Filters like categories, ratings, etc.
 * @returns {Promise<Object>} - Attractions data or error object
 */
export const fetchAttractions = async (location, filters = {}) => {
  try {
    console.log(`Fetching attractions for ${location} with filters:`, filters);

    // Call server-side endpoint instead of direct API access
    const params = new URLSearchParams({
      location,
      ...(filters.country && { country: filters.country }),
      ...(filters.category && { category: filters.category }),
      ...(filters.rating && { rating: filters.rating }),
      ...(filters.price_level && { price_level: filters.price_level }),
      ...(filters.activity_type && { activity_type: filters.activity_type }),
      ...(filters.budget_level && { budget_level: filters.budget_level }),
    });

    // If there are complex filters, stringify and add them
    if (Object.keys(filters).length > 0) {
      params.append("filters", JSON.stringify(filters));
    }

    const response = await fetch(
      `${API_BASE_URL}/api/external/attractions?${params}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server returned ${response.status}`);
    }

    const attractionsData = await response.json();
    console.log("Retrieved attractions data from server:", attractionsData);
    return attractionsData;
  } catch (error) {
    console.error("Error fetching attractions:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch restaurant recommendations for a location
 *
 * @param {string} location - Location to search for restaurants
 * @param {Object} filters - Filtering options (cuisine, rating, price)
 * @returns {Promise<Object>} - Restaurant recommendations data
 */
export const fetchRestaurants = async (location, filters = {}) => {
  console.log("Fetching restaurants for", location, "with filters:", filters);

  try {
    // Call server-side endpoint instead of direct API access
    const params = new URLSearchParams({
      location,
      ...(filters.country && { country: filters.country }),
      ...(filters.cuisine && { cuisine: filters.cuisine }),
      ...(filters.price && { price: filters.price }),
      ...(filters.rating && { rating: filters.rating }),
      ...(filters.dietary_restrictions && {
        dietary_restrictions: filters.dietary_restrictions,
      }),
      ...(filters.meal_type && { meal_type: filters.meal_type }),
      ...(filters.budget_level && { budget_level: filters.budget_level }),
    });

    // If there are complex filters, stringify and add them
    if (Object.keys(filters).length > 0) {
      params.append("filters", JSON.stringify(filters));
    }

    const response = await fetch(
      `${API_BASE_URL}/api/external/restaurants?${params}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server returned ${response.status}`);
    }

    const restaurantsData = await response.json();
    console.log("Retrieved restaurants data from server:", restaurantsData);
    return restaurantsData;
  } catch (error) {
    console.error("Error fetching restaurant data:", error);
    return {
      success: false,
      error: `Failed to fetch restaurant data: ${error.message}`,
      source: "Error",
    };
  }
};

/**
 * Main entry point for all external data services
 * Handles routing to the correct service and error handling
 *
 * @param {string} intent - The intent that requires external data
 * @param {object} requestDetails - The details needed for this request, varies by intent
 * @param {object} userProfile - Optional user profile data to enhance the request
 * @param {object} daySpecificInfo - Optional information about a specific day from the itinerary
 * @returns {Promise<object>} - Results of the external data fetch
 */
export const fetchExternalData = async (
  intent,
  requestDetails = {},
  userProfile = null,
  daySpecificInfo = null
) => {
  console.log(`Fetching external data for intent: ${intent}`, requestDetails);

  // אם יש מידע על יום ספציפי, הוסף אותו לפרטי הבקשה
  if (daySpecificInfo) {
    console.log(
      "Using day-specific information for external data request:",
      daySpecificInfo
    );

    // שילוב מידע היום בפרטי הבקשה אם חסר
    if (daySpecificInfo.city && !requestDetails.city) {
      requestDetails.city = daySpecificInfo.city;
    }

    if (daySpecificInfo.country && !requestDetails.country) {
      requestDetails.country = daySpecificInfo.country;
    }

    if (daySpecificInfo.date) {
      // תוספת תאריך ספציפי עבור בקשות מזג אוויר
      if (intent === "Weather-Request" && !requestDetails.time) {
        requestDetails.time = daySpecificInfo.date;
      }

      // תאריך כללי
      if (!requestDetails.date) {
        requestDetails.date = daySpecificInfo.date;
      }

      // הוספת היסטים זמנים
      if (daySpecificInfo.timeContext && !requestDetails.timeContext) {
        requestDetails.timeContext = daySpecificInfo.timeContext;
      }
    }
  } else {
    // בדיקה אם יש מידע בחלון הגלובלי
    if (window.__daySpecificInfo) {
      console.log(
        "Found day-specific info in global state:",
        window.__daySpecificInfo
      );

      const globalInfo = window.__daySpecificInfo;

      // שילוב המידע הגלובלי אם חסר בבקשה הנוכחית
      if (globalInfo.city && !requestDetails.city) {
        requestDetails.city = globalInfo.city;
        console.log(`Added city from global state: ${globalInfo.city}`);
      }

      if (globalInfo.country && !requestDetails.country) {
        requestDetails.country = globalInfo.country;
        console.log(`Added country from global state: ${globalInfo.country}`);
      }

      if (globalInfo.date) {
        if (intent === "Weather-Request" && !requestDetails.time) {
          requestDetails.time = globalInfo.date;
          console.log(`Added time from global state: ${globalInfo.date}`);
        }

        if (!requestDetails.date) {
          requestDetails.date = globalInfo.date;
          console.log(`Added date from global state: ${globalInfo.date}`);
        }
      }
    }
  }

  // לוג החלקים החשובים של הבקשה לפני עיבוד
  if (intent === "Weather-Request") {
    console.log(`Weather request details:
    - City: ${requestDetails.city || "missing"}
    - Country: ${requestDetails.country || "missing"}
    - Time: ${requestDetails.time || "missing"}
    - TimeContext: ${requestDetails.timeContext || "missing"}`);
  } else if (intent === "Find-Hotel" || intent === "Find-Attractions") {
    console.log(`${intent} request details:
    - City: ${requestDetails.city || "missing"}
    - Country: ${requestDetails.country || "missing"}`);
  }

  try {
    // Process the request details to ensure we have correct data formats
    // For certain intents, this will enrich the data with additional context
    const enhancedDetails = processRequestDetails(requestDetails);
    console.log("Enhanced request details:", enhancedDetails);

    // Extract filter parameters for service-specific filtering
    const filters = extractFilterParameters(intent, enhancedDetails);
    console.log(`Extracted filters for ${intent}:`, filters);

    // Route to the appropriate handler based on intent
    switch (intent) {
      // Weather intents
      case "Weather-Request": {
        // Weather handling code remains the same
        const { city, country, time = "now", timeContext } = enhancedDetails;

        // If we have a specific location, fetch weather data
        if (city && country) {
          // For historical weather lookups, WMO API requires different logic
          // Use appropriate service based on whether this is current or historical
          return await fetchWeatherData(city, country, time, { timeContext });
        } else if (city) {
          // If we have city but not country, try to infer country from well-known cities
          const inferredCountry = inferCountryForWellKnownCity(city);
          if (inferredCountry) {
            console.log(`Inferred country ${inferredCountry} for city ${city}`);
            return await fetchWeatherData(city, inferredCountry, time, {
              timeContext,
            });
          }

          // If we couldn't infer the country, return an error
          return {
            success: false,
            error: "Missing country for weather lookup",
            requestData: enhancedDetails,
          };
        } else if (enhancedDetails.location) {
          // If we have a combined location string, try to parse it
          const parsedLocation = parseLocationString(enhancedDetails.location);
          if (parsedLocation && parsedLocation.city && parsedLocation.country) {
            return await fetchWeatherData(
              parsedLocation.city,
              parsedLocation.country,
              time,
              { timeContext }
            );
          }
        }

        // If we get here, we don't have enough data for a weather lookup
        return {
          success: false,
          error: "Incomplete location data for weather lookup",
          requestData: enhancedDetails,
        };
      }

      // Hotel search intents
      case "Find-Hotel": {
        // Extract city, country, and preferences from request
        let { city, country, budget_level, ...preferences } = enhancedDetails;

        // Add direct data mapping from the original request fields
        const directData =
          requestDetails.data || requestDetails.collectedData || {};
        if (!city && directData.city) {
          city = directData.city;
          console.log(`Using city directly from hotel request data: ${city}`);
        }

        if (!country && directData.country) {
          country = directData.country;
          console.log(
            `Using country directly from hotel request data: ${country}`
          );
        }

        if (!budget_level && directData.budget_level) {
          budget_level = directData.budget_level;
          console.log(
            `Using budget level directly from hotel request data: ${budget_level}`
          );
        }

        // Try to get location from vacation_location if available
        if (!city && requestDetails.vacation_location) {
          const parsedVacationLocation = parseLocationString(
            requestDetails.vacation_location
          );
          if (parsedVacationLocation.city) {
            city = parsedVacationLocation.city;
            console.log(
              `Extracted city for hotel search from vacation_location: ${city}`
            );

            if (!country && parsedVacationLocation.country) {
              country = parsedVacationLocation.country;
              console.log(
                `Extracted country for hotel search from vacation_location: ${country}`
              );
            }
          }
        }

        // If we have a specific location, search for hotels
        if (city && country) {
          // Format location as simple string with city and country
          const location = `${city}, ${country}`;

          // Merge extracted filters with existing preferences
          const enhancedPreferences = {
            ...preferences,
            ...filters,
            budget_level,
            city,
            country,
          };

          console.log(
            `Searching hotels with location: ${location}, filters:`,
            enhancedPreferences
          );

          return await fetchHotelRecommendations(location, enhancedPreferences);
        } else if (city) {
          // Try to infer country if we only have city
          const inferredCountry = inferCountryForCity(city);
          if (inferredCountry) {
            country = inferredCountry;
            console.log(
              `Inferred country for hotel search: ${inferredCountry}`
            );
            // Format location as simple string with city and country
            const location = `${city}, ${inferredCountry}`;

            // Merge extracted filters with existing preferences
            const enhancedPreferences = {
              ...preferences,
              ...filters,
              budget_level,
              city,
              country: inferredCountry,
            };

            console.log(
              `Searching hotels with inferred location: ${location}, filters:`,
              enhancedPreferences
            );

            return await fetchHotelRecommendations(
              location,
              enhancedPreferences
            );
          }
        } else if (enhancedDetails.location) {
          // If we have a combined location string, try to parse it
          const parsedLocation = parseLocationString(enhancedDetails.location);
          if (parsedLocation && parsedLocation.city) {
            // Create location string directly from parsed parts
            const locationStr = parsedLocation.country
              ? `${parsedLocation.city}, ${parsedLocation.country}`
              : parsedLocation.city;

            // Merge extracted filters with existing preferences
            const enhancedPreferences = {
              ...preferences,
              ...filters,
              budget_level,
              city: parsedLocation.city,
              country: parsedLocation.country,
            };

            console.log(
              `Parsed location for hotel search: ${locationStr}, filters:`,
              enhancedPreferences
            );

            return await fetchHotelRecommendations(
              locationStr,
              enhancedPreferences
            );
          }
        }

        // Log what's missing to help debug
        console.error("Hotel search failed - missing data:", {
          city: city || "missing",
          country: country || "missing",
          originalRequest: requestDetails,
        });

        // If we get here, we don't have enough data for a hotel search
        return {
          success: false,
          error: "Incomplete location data for hotel search",
          requestData: enhancedDetails,
          debug: {
            originalCity: directData.city,
            originalCountry: directData.country,
            enhancedCity: city,
            enhancedCountry: country,
          },
        };
      }

      // Attraction search intents
      case "Find-Attractions": {
        // Extract city, country, and filters from request
        let { city, country, category, ...otherDetails } = enhancedDetails;

        // Add direct data mapping from the original request fields
        const directData =
          requestDetails.data || requestDetails.collectedData || {};
        if (!city && directData.city) {
          city = directData.city;
          console.log(
            `Using city directly from attractions request data: ${city}`
          );
        }

        if (!country && directData.country) {
          country = directData.country;
          console.log(
            `Using country directly from attractions request data: ${country}`
          );
        }

        if (!category && directData.category) {
          category = directData.category;
          console.log(
            `Using category directly from attractions request data: ${category}`
          );
        }

        // Try to get location from vacation_location if available
        if (!city && requestDetails.vacation_location) {
          const parsedVacationLocation = parseLocationString(
            requestDetails.vacation_location
          );
          if (parsedVacationLocation.city) {
            city = parsedVacationLocation.city;
            console.log(
              `Extracted city for attractions from vacation_location: ${city}`
            );

            if (!country && parsedVacationLocation.country) {
              country = parsedVacationLocation.country;
              console.log(
                `Extracted country for attractions from vacation_location: ${country}`
              );
            }
          }
        }

        // If we have a specific location, search for attractions
        if (city && country) {
          // Format location as simple string with city and country
          const location = `${city}, ${country}`;

          // Merge extracted filters with existing parameters
          const enhancedFilters = {
            ...otherDetails,
            ...filters,
            category,
            city,
            country,
          };

          console.log(
            `Searching attractions with location: ${location}, filters:`,
            enhancedFilters
          );

          return await fetchAttractions(location, enhancedFilters);
        } else if (city) {
          // Try to infer country if we only have city
          const inferredCountry = inferCountryForCity(city);
          if (inferredCountry) {
            country = inferredCountry;
            console.log(
              `Inferred country for attractions search: ${inferredCountry}`
            );
            // Format location as simple string with city and country
            const location = `${city}, ${inferredCountry}`;

            // Merge extracted filters with existing parameters
            const enhancedFilters = {
              ...otherDetails,
              ...filters,
              category,
              city,
              country: inferredCountry,
            };

            console.log(
              `Searching attractions with inferred location: ${location}, filters:`,
              enhancedFilters
            );

            return await fetchAttractions(location, enhancedFilters);
          }
        } else if (enhancedDetails.location) {
          // If we have a combined location string, try to parse it
          const parsedLocation = parseLocationString(enhancedDetails.location);
          if (parsedLocation && parsedLocation.city) {
            // Create location string directly from parsed parts
            const locationStr = parsedLocation.country
              ? `${parsedLocation.city}, ${parsedLocation.country}`
              : parsedLocation.city;

            // Merge extracted filters with existing parameters
            const enhancedFilters = {
              ...otherDetails,
              ...filters,
              category,
              city: parsedLocation.city,
              country: parsedLocation.country,
            };

            console.log(
              `Parsed location for attractions search: ${locationStr}, filters:`,
              enhancedFilters
            );

            return await fetchAttractions(locationStr, enhancedFilters);
          }
        }

        // Log what's missing to help debug
        console.error("Attractions search failed - missing data:", {
          city: city || "missing",
          country: country || "missing",
          originalRequest: requestDetails,
        });

        // If we get here, we don't have enough data for an attraction search
        return {
          success: false,
          error: "Incomplete location data for attraction search",
          requestData: enhancedDetails,
          debug: {
            originalCity: directData.city,
            originalCountry: directData.country,
            enhancedCity: city,
            enhancedCountry: country,
          },
        };
      }

      // Restaurant search intents
      case "Find-Restaurants": {
        // Extract city, country, and filters from request
        let { city, country, cuisine, budget_level, ...otherDetails } =
          enhancedDetails;

        // Add direct data mapping from the original request fields
        const directData =
          requestDetails.data || requestDetails.collectedData || {};
        if (!city && directData.city) {
          city = directData.city;
          console.log(`Using city directly from request data: ${city}`);
        }

        if (!country && directData.country) {
          country = directData.country;
          console.log(`Using country directly from request data: ${country}`);
        }

        if (!budget_level && directData.budget_level) {
          budget_level = directData.budget_level;
          console.log(
            `Using budget level directly from request data: ${budget_level}`
          );
        }

        // Try to get location from vacation_location if available
        if (!city && requestDetails.vacation_location) {
          const parsedVacationLocation = parseLocationString(
            requestDetails.vacation_location
          );
          if (parsedVacationLocation.city) {
            city = parsedVacationLocation.city;
            console.log(`Extracted city from vacation_location: ${city}`);

            if (!country && parsedVacationLocation.country) {
              country = parsedVacationLocation.country;
              console.log(
                `Extracted country from vacation_location: ${country}`
              );
            }
          }
        }

        // If we have a specific location, search for restaurants
        if (city && country) {
          // Format location properly as a string containing both city and country
          const location = `${city}, ${country}`;

          // Merge extracted filters with existing parameters
          const enhancedFilters = {
            ...otherDetails,
            ...filters,
            cuisine,
            budget_level,
            city,
            country,
          };

          console.log(
            `Searching restaurants with location: ${location}, filters:`,
            enhancedFilters
          );

          return await fetchRestaurants(location, enhancedFilters);
        } else if (city) {
          // Try to infer country if we only have city
          const inferredCountry = inferCountryForCity(city);
          if (inferredCountry) {
            country = inferredCountry;
            console.log(
              `Inferred country for restaurant search: ${inferredCountry}`
            );
            // Format location as simple string with city and country
            const location = `${city}, ${inferredCountry}`;

            // Merge extracted filters with existing parameters
            const enhancedFilters = {
              ...otherDetails,
              ...filters,
              cuisine,
              budget_level,
              city,
              country: inferredCountry,
            };

            console.log(
              `Searching restaurants with inferred location: ${location}, filters:`,
              enhancedFilters
            );

            return await fetchRestaurants(location, enhancedFilters);
          }
        } else if (enhancedDetails.location) {
          // If we have a combined location string, try to parse it
          const parsedLocation = parseLocationString(enhancedDetails.location);
          if (parsedLocation && parsedLocation.city) {
            // Create location string directly from parsed parts
            const locationStr = parsedLocation.country
              ? `${parsedLocation.city}, ${parsedLocation.country}`
              : parsedLocation.city;

            // Merge extracted filters with existing parameters
            const enhancedFilters = {
              ...otherDetails,
              ...filters,
              cuisine,
              budget_level,
              city: parsedLocation.city,
              country: parsedLocation.country,
            };

            console.log(
              `Parsed location for restaurant search: ${locationStr}, filters:`,
              enhancedFilters
            );

            return await fetchRestaurants(locationStr, enhancedFilters);
          }
        }

        // Log what's missing to help debug
        console.error("Restaurant search failed - missing data:", {
          city: city || "missing",
          country: country || "missing",
          originalRequest: requestDetails,
        });

        // If we get here, we don't have enough data for a restaurant search
        return {
          success: false,
          error: "Incomplete location data for restaurant search",
          requestData: enhancedDetails,
          debug: {
            originalCity: directData.city,
            originalCountry: directData.country,
            enhancedCity: city,
            enhancedCountry: country,
          },
        };
      }

      // Handle other intents with appropriate function calls
      default:
        // For intents we don't handle yet, return an error response
        console.warn(`No handler implemented for intent: ${intent}`);
        return {
          success: false,
          error: `Service for ${intent} not implemented yet`,
          requestData: enhancedDetails,
          fakeResponse: true, // Indicate this is a fake/placeholder response
          details: {
            message: `This would normally fetch ${intent
              .toLowerCase()
              .replace(/-/g, " ")} data from an external service`,
          },
        };
    }
  } catch (error) {
    console.error(`Error in external data service for ${intent}:`, error);
    return {
      success: false,
      error: error.message || `Failed to fetch data for ${intent}`,
      requestData: requestDetails,
    };
  }
};

/**
 * Process the API request details and normalize them for the external services
 * @param {Object} requestDetails - The original request details
 * @returns {Object} - Normalized request details
 */
export const processRequestDetails = (requestDetails) => {
  try {
    console.log("Processing request details:", requestDetails);

    // Deep clone to avoid modifying the original
    const processedDetails = JSON.parse(JSON.stringify(requestDetails || {}));

    // Extract location and country information
    if (
      processedDetails.location ||
      processedDetails.city ||
      processedDetails.vacation_location
    ) {
      // Use city field if available, otherwise use location
      const locationStr =
        processedDetails.city ||
        processedDetails.location ||
        processedDetails.vacation_location ||
        "";

      // Use our location parser to extract city and country
      const parsedLocation = parseLocationString(locationStr);

      if (parsedLocation.city) {
        processedDetails.city = parsedLocation.city;
        console.log(`Set city to: ${processedDetails.city}`);
      }

      if (parsedLocation.country && !processedDetails.country) {
        processedDetails.country = parsedLocation.country;
        console.log(`Set country to: ${processedDetails.country}`);
      } else if (!processedDetails.country) {
        // Try to infer country from city if we still don't have it
        const inferredCountry = inferCountryForCity(processedDetails.city);
        if (inferredCountry) {
          processedDetails.country = inferredCountry;
          console.log(
            `Inferred country for ${processedDetails.city}: ${inferredCountry}`
          );
        }
      }
    }

    // Extract dates from trip data if available
    if (processedDetails.dates && typeof processedDetails.dates === "string") {
      // Parse date range strings like "2025-06-15 to 2025-06-22"
      const dateRangeMatch = processedDetails.dates.match(
        /(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/
      );

      if (dateRangeMatch) {
        console.log(`Found date range in trip data: ${processedDetails.dates}`);

        // Store the structured dates
        processedDetails.structuredDates = {
          from: dateRangeMatch[1],
          to: dateRangeMatch[2],
        };

        // If no specific date is requested, use start date as default
        if (!processedDetails.date) {
          processedDetails.date = dateRangeMatch[1];
          console.log(
            `Using first day of trip for date: ${processedDetails.date}`
          );
        }

        // Extract year for explicit use
        const yearMatch = dateRangeMatch[1].match(/^(\d{4})/);
        if (yearMatch) {
          processedDetails.year = parseInt(yearMatch[1], 10);
          console.log(
            `Extracted year from trip dates: ${processedDetails.year}`
          );
        }
      }
    }

    // עיבוד וייצור תאריך לפי timeContext
    if (processedDetails.timeContext) {
      const today = new Date();

      if (
        processedDetails.timeContext === "now" ||
        processedDetails.timeContext === "today"
      ) {
        processedDetails.date = today.toISOString().split("T")[0];
        console.log(
          `Set date=${processedDetails.date} based on timeContext="${processedDetails.timeContext}"`
        );
      } else if (processedDetails.timeContext === "tomorrow") {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        processedDetails.date = tomorrow.toISOString().split("T")[0];
        console.log(
          `Set date=${processedDetails.date} based on timeContext="${processedDetails.timeContext}"`
        );
      } else if (processedDetails.timeContext === "weekend") {
        const weekend = new Date(today);
        // Find next Saturday (6 is Saturday in JavaScript)
        const daysToAdd = (6 - today.getDay() + 7) % 7;
        weekend.setDate(today.getDate() + daysToAdd);
        processedDetails.date = weekend.toISOString().split("T")[0];
        console.log(
          `Set date=${processedDetails.date} based on timeContext="${processedDetails.timeContext}" (next Saturday)`
        );
      } else if (
        // If date is already set, don't override it
        !processedDetails.date &&
        (processedDetails.timeContext.includes("day") ||
          processedDetails.timeContext.includes("date"))
      ) {
        // Try to parse date from the timeContext itself
        try {
          // Look for date format like "2023-01-15"
          const dateMatch =
            processedDetails.timeContext.match(/\d{4}-\d{2}-\d{2}/);
          if (dateMatch) {
            processedDetails.date = dateMatch[0];
            console.log(
              `Extracted date=${processedDetails.date} from timeContext="${processedDetails.timeContext}"`
            );
          } else {
            // Try to parse a natural language date
            const naturalDate = new Date(processedDetails.timeContext);
            if (!isNaN(naturalDate.getTime())) {
              processedDetails.date = naturalDate.toISOString().split("T")[0];
              console.log(
                `Parsed natural language date=${processedDetails.date} from timeContext="${processedDetails.timeContext}"`
              );
            }
          }
        } catch (e) {
          console.warn(
            "Failed to parse date from timeContext:",
            processedDetails.timeContext,
            e
          );
        }
      }

      // Check if the date is more than 5 days in the future (OpenWeather API limitation)
      if (processedDetails.date) {
        try {
          const requestDate = new Date(processedDetails.date);
          const today = new Date();

          // Reset time part for accurate day comparison
          today.setHours(0, 0, 0, 0);

          // Calculate days difference
          const diffTime = requestDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Flag if beyond forecast limit
          if (diffDays > 5) {
            processedDetails.beyondForecastLimit = true;
            processedDetails.daysInFuture = diffDays;
            console.log(
              `Date ${processedDetails.date} is ${diffDays} days in future, beyond 5-day forecast limit`
            );
          }
        } catch (error) {
          console.error("Error calculating days difference:", error);
        }
      }
    }

    // If we have a daySpecificInfo object with date information, use it
    if (processedDetails.daySpecificInfo) {
      console.log(
        "Processing day-specific information:",
        processedDetails.daySpecificInfo
      );

      // If no date is set already, use the day-specific date
      if (
        processedDetails.daySpecificInfo.date &&
        (!processedDetails.date || processedDetails.date === "undefined")
      ) {
        processedDetails.date = processedDetails.daySpecificInfo.date;
        console.log(`Using day-specific date: ${processedDetails.date}`);
      }

      // If we have a year from day-specific info, use it explicitly
      if (processedDetails.daySpecificInfo.year && !processedDetails.year) {
        processedDetails.year = processedDetails.daySpecificInfo.year;
        console.log(`Using day-specific year: ${processedDetails.year}`);
      }

      // If location is missing, use the one from day-specific info
      if (
        !processedDetails.city &&
        !processedDetails.location &&
        processedDetails.daySpecificInfo.location
      ) {
        // Use our location parser
        const parsedLocation = parseLocationString(
          processedDetails.daySpecificInfo.location
        );

        if (parsedLocation.city) {
          processedDetails.city = parsedLocation.city;
          console.log(
            `Set city to: ${processedDetails.city} from day-specific info`
          );
        }

        if (parsedLocation.country) {
          processedDetails.country = parsedLocation.country;
          console.log(
            `Set country to: ${processedDetails.country} from day-specific info`
          );
        }
      }
    }

    // Handle references to specific days in the itinerary when dates are available but no specific date is set
    if (
      (!processedDetails.date || processedDetails.date === "undefined") &&
      processedDetails.dates
    ) {
      // First check if we have dates in object format
      if (
        typeof processedDetails.dates === "object" &&
        processedDetails.dates.from
      ) {
        console.log(
          `Using first day of trip from dates object: ${processedDetails.dates.from}`
        );
        processedDetails.date = processedDetails.dates.from;
      }
      // Then check if we have dates in string format
      else if (typeof processedDetails.dates === "string") {
        const dateRangeMatch = processedDetails.dates.match(
          /(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/
        );

        if (dateRangeMatch) {
          console.log(`Using first day from date range: ${dateRangeMatch[1]}`);
          processedDetails.date = dateRangeMatch[1];
        }
      }

      // If we've set the date from the trip dates, extract the year too
      if (processedDetails.date && !processedDetails.year) {
        const yearMatch = processedDetails.date.match(/^(\d{4})/);
        if (yearMatch) {
          processedDetails.year = parseInt(yearMatch[1], 10);
          console.log(`Extracted year from date: ${processedDetails.year}`);
        }
      }
    }

    // Ensure we have a proper date
    if (!processedDetails.date || processedDetails.date === "undefined") {
      // Set to today's date in YYYY-MM-DD format
      processedDetails.date = new Date().toISOString().split("T")[0];
      console.log(
        `No valid date found, defaulting to today: ${processedDetails.date}`
      );
    } else {
      // Check if the date is more than 5 days in the future (OpenWeather API limitation)
      try {
        const requestDate = new Date(processedDetails.date);
        const today = new Date();

        // Reset time part for accurate day comparison
        today.setHours(0, 0, 0, 0);

        // Calculate days difference
        const diffTime = requestDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Flag if beyond forecast limit
        if (diffDays > 5) {
          processedDetails.beyondForecastLimit = true;
          processedDetails.daysInFuture = diffDays;
          console.log(
            `Date ${processedDetails.date} is ${diffDays} days in future, beyond 5-day forecast limit`
          );
        }
      } catch (error) {
        console.error("Error calculating days difference:", error);
      }
    }

    // Add a formatted location string for display
    if (processedDetails.city || processedDetails.country) {
      processedDetails.formattedLocation = formatLocation({
        city: processedDetails.city,
        country: processedDetails.country,
      });
      console.log(
        `Set formatted location: ${processedDetails.formattedLocation}`
      );
    }

    console.log("Processed request details:", processedDetails);
    return processedDetails;
  } catch (error) {
    console.error("Error processing request details:", error);
    return { ...requestDetails, error: "Failed to process request details" };
  }
};

/**
 * Builds an enriched prompt by combining user query with external data
 * @param {string} userMessage - The original user message
 * @param {Object} externalData - The fetched external data
 * @param {string} intent - The detected intent
 * @returns {string} - Enriched prompt for the AI model
 */
export const buildPromptWithExternalData = (
  userMessage,
  externalData,
  intent
) => {
  const { location, requestData } = externalData;

  // Format the data as a markdown string for easy reading by the model
  let dataString = "";

  // Create a custom, more detailed prompt for hotel searches
  if (intent === "Find-Hotel") {
    // Get the specific hotel data
    const { hotels, location, requestData } = externalData;

    // Show basic information first
    dataString = `I've found ${hotels?.length || 0} hotels in ${
      location || requestData?.city || "the requested location"
    }.
    
Here's the hotel information to answer the user's query "${userMessage}":
    
`;

    // Add each hotel with details
    if (hotels && hotels.length > 0) {
      hotels.forEach((hotel, index) => {
        dataString += `HOTEL ${index + 1}: ${hotel.name}\n`;
        dataString += `Rating: ${hotel.rating || "N/A"}/5\n`;
        dataString += `Price Range: ${hotel.price_range || "N/A"}\n`;

        if (hotel.location) {
          dataString += `Location: ${hotel.location}\n`;
        }

        if (hotel.amenities && hotel.amenities.length > 0) {
          dataString += `Amenities: ${hotel.amenities.join(", ")}\n`;
        }

        dataString += `\n`;
      });

      dataString += `
Please provide a comprehensive response that:
1. Introduces the hotels available in ${location || requestData?.city}
2. Lists each hotel with its name, rating (use stars ★), price range, and key amenities
3. Ends with a question asking if the user wants more details or booking assistance
4. Makes the response conversational and helpful

Do NOT say you're an AI assistant or that you've retrieved this information, just present it conversationally.`;
    } else {
      dataString +=
        "No hotels found matching the criteria. Please suggest alternatives or ask if they'd like to try a different search.";
    }

    return dataString;
  }

  // For other intent types, keep the existing logic
  if (!externalData.success) {
    return `${userMessage}\n\nNote: I tried to gather more information, but was unable to fetch the requested data.`;
  }

  let enrichedPrompt = `${userMessage}\n\n`;
  enrichedPrompt +=
    "Here is additional information to help answer this query:\n\n";

  // Add a simulated data warning if applicable
  if (externalData.simulated) {
    enrichedPrompt +=
      "Note: This is simulated data for demonstration purposes.\n\n";
  }

  // Add country mismatch warning if applicable
  if (externalData.countryMismatch) {
    enrichedPrompt += `${externalData.warning}\n\n`;
  }

  switch (intent) {
    case "Weather-Request": {
      const locationDisplay = `${externalData.location}, ${
        externalData.returnedCountry || externalData.country
      }`;
      enrichedPrompt += `Weather information for ${locationDisplay} on ${externalData.displayDate} (${externalData.date}):\n`;

      if (externalData.forecast) {
        // Current weather data
        const forecast = externalData.forecast;
        enrichedPrompt += `- Current temperature: ${forecast.temperature.current}°C\n`;
        enrichedPrompt += `- Feels like: ${forecast.temperature.feels_like}°C\n`;
        enrichedPrompt += `- Min/Max temperature: ${forecast.temperature.min}°C to ${forecast.temperature.max}°C\n`;
        enrichedPrompt += `- Conditions: ${forecast.conditions} (${forecast.description})\n`;
        enrichedPrompt += `- Humidity: ${forecast.humidity}%\n`;
        enrichedPrompt += `- Pressure: ${forecast.pressure} hPa\n`;
        enrichedPrompt += `- Wind: ${forecast.wind.speed} m/s (${forecast.wind.direction})\n`;

        if (forecast.precipitation.amount > 0) {
          enrichedPrompt += `- Precipitation: ${forecast.precipitation.amount} mm\n`;
        }

        // Add sunrise/sunset if available
        if (forecast.sunrise && forecast.sunset) {
          const sunriseTime = new Date(
            forecast.sunrise * 1000
          ).toLocaleTimeString();
          const sunsetTime = new Date(
            forecast.sunset * 1000
          ).toLocaleTimeString();
          enrichedPrompt += `- Sunrise: ${sunriseTime}\n`;
          enrichedPrompt += `- Sunset: ${sunsetTime}\n`;
        }
      } else if (externalData.forecasts) {
        // Multiple forecast points for a day
        enrichedPrompt += `Forecast intervals for the day:\n\n`;

        externalData.forecasts.forEach((forecast, index) => {
          const timeStr = new Date(forecast.time).toLocaleTimeString();
          enrichedPrompt += `Time: ${timeStr}\n`;
          enrichedPrompt += `- Temperature: ${forecast.temperature.current}°C (feels like ${forecast.temperature.feels_like}°C)\n`;
          enrichedPrompt += `- Conditions: ${forecast.conditions} (${forecast.description})\n`;
          enrichedPrompt += `- Precipitation chance: ${forecast.precipitation.chance}%\n`;
          if (forecast.precipitation.rain > 0) {
            enrichedPrompt += `- Rain: ${forecast.precipitation.rain} mm\n`;
          }
          if (forecast.precipitation.snow > 0) {
            enrichedPrompt += `- Snow: ${forecast.precipitation.snow} mm\n`;
          }
          enrichedPrompt += `- Humidity: ${forecast.humidity}%\n`;
          enrichedPrompt += `- Wind: ${forecast.wind.speed} m/s (${forecast.wind.direction})\n`;

          if (index < externalData.forecasts.length - 1) {
            enrichedPrompt += `\n`;
          }
        });
      }
      break;
    }

    case "Find-Hotel":
      enrichedPrompt += `Top hotel recommendations for ${externalData.location}:\n`;
      externalData.hotels.forEach((hotel, index) => {
        enrichedPrompt += `${index + 1}. ${hotel.name} (${hotel.rating}★)\n`;
        enrichedPrompt += `   Price: ${hotel.price_range}, Location: ${hotel.location}\n`;
        enrichedPrompt += `   Amenities: ${hotel.amenities.join(", ")}\n`;
      });
      break;

    case "Find-Attractions":
      enrichedPrompt += `Top attractions in ${externalData.location}:\n`;
      externalData.attractions.forEach((attraction, index) => {
        enrichedPrompt += `${index + 1}. ${attraction.name} (${
          attraction.rating
        }★)\n`;
        enrichedPrompt += `   Category: ${attraction.category}, Price: ${attraction.price_range}\n`;
        enrichedPrompt += `   Description: ${attraction.description}\n`;
      });
      break;

    case "Find-Restaurants": {
      // Get the appropriate location to display
      const restaurantLocation =
        externalData.location ||
        (externalData.requestData &&
          (externalData.requestData.location || externalData.requestData.city));

      enrichedPrompt += `Top restaurants in ${restaurantLocation}:\n`;
      externalData.restaurants.forEach((restaurant, index) => {
        enrichedPrompt += `${index + 1}. ${restaurant.name} (${
          restaurant.rating
        }★)\n`;
        enrichedPrompt += `   Cuisine: ${restaurant.cuisine}, Price: ${restaurant.price_range}\n`;
        if (restaurant.address) {
          enrichedPrompt += `   Address: ${restaurant.address}\n`;
        }
        if (restaurant.opening_hours) {
          enrichedPrompt += `   Status: ${restaurant.opening_hours}\n`;
        }
      });
      break;
    }

    case "Flight-Information":
      enrichedPrompt += `Flight information from ${externalData.origin} to ${externalData.destination} on ${externalData.date}:\n\n`;
      externalData.flights.forEach((flight, index) => {
        enrichedPrompt += `Option ${index + 1}:\n`;
        enrichedPrompt += `- Airline: ${flight.airline}\n`;
        enrichedPrompt += `- Flight: ${flight.flightNumber}\n`;
        enrichedPrompt += `- Departure: ${flight.departureTime}\n`;
        enrichedPrompt += `- Arrival: ${flight.arrivalTime}\n`;
        enrichedPrompt += `- Duration: ${flight.duration}\n`;
        enrichedPrompt += `- Price: ${flight.price}\n`;
        enrichedPrompt += `- Stops: ${flight.stops}\n`;
        if (flight.stopLocation) {
          enrichedPrompt += `- Connection: ${flight.stopLocation}\n`;
        }
        if (index < externalData.flights.length - 1) {
          enrichedPrompt += `\n`;
        }
      });
      break;

    case "Local-Events":
      enrichedPrompt += `Events in ${externalData.location} ${
        externalData.startDate !== "upcoming"
          ? `starting from ${externalData.startDate}`
          : "coming up"
      }:\n\n`;
      externalData.events.forEach((event, index) => {
        enrichedPrompt += `${index + 1}. ${event.name}\n`;
        enrichedPrompt += `   Type: ${event.type}\n`;
        enrichedPrompt += `   When: ${event.date}${
          event.time ? `, ${event.time}` : ""
        }\n`;
        enrichedPrompt += `   Venue: ${event.venue}${
          event.address ? `, ${event.address}` : ""
        }\n`;
        enrichedPrompt += `   Price: ${event.price}\n`;
        if (event.description) {
          enrichedPrompt += `   Description: ${event.description}\n`;
        }
        if (index < externalData.events.length - 1) {
          enrichedPrompt += `\n`;
        }
      });
      break;

    case "Travel-Restrictions":
      enrichedPrompt += `Travel information for ${externalData.country}:\n\n`;
      enrichedPrompt += `Entry Requirements:\n`;
      enrichedPrompt += `- Visa: ${externalData.restrictions.visa}\n`;
      enrichedPrompt += `- Passport: ${externalData.restrictions.passport}\n`;
      enrichedPrompt += `- COVID-19: ${externalData.restrictions.covidRestrictions}\n`;
      if (externalData.restrictions.other) {
        enrichedPrompt += `- Other: ${externalData.restrictions.other}\n`;
      }

      enrichedPrompt += `\nSafety Advisory:\n`;
      enrichedPrompt += `- Level: ${externalData.safetyAdvisory.level}\n`;
      enrichedPrompt += `- Details: ${externalData.safetyAdvisory.details}\n`;

      enrichedPrompt += `\nLocal Laws to be aware of:\n`;
      externalData.localLaws.forEach((law, index) => {
        enrichedPrompt += `- ${law}\n`;
      });

      enrichedPrompt += `\nEmergency Contacts:\n`;
      Object.entries(externalData.emergencyContacts).forEach(
        ([service, number]) => {
          enrichedPrompt += `- ${
            service.charAt(0).toUpperCase() + service.slice(1)
          }: ${number}\n`;
        }
      );

      enrichedPrompt += `\nLast Updated: ${externalData.lastUpdated}\n`;
      break;

    case "Currency-Conversion":
      enrichedPrompt += `Currency conversion from ${externalData.from} to ${externalData.to}:\n\n`;
      enrichedPrompt += `- Exchange rate: 1 ${externalData.from} = ${externalData.rate} ${externalData.to}\n`;
      enrichedPrompt += `- Converted amount: ${externalData.amount} ${externalData.from} = ${externalData.converted} ${externalData.to}\n`;
      enrichedPrompt += `- Last updated: ${externalData.lastUpdated}\n`;
      break;

    case "Cost-Estimate":
      enrichedPrompt += `Travel cost estimates for ${externalData.location} (${externalData.budgetLevel} budget, in ${externalData.currency}):\n\n`;

      Object.entries(externalData.estimates).forEach(([category, data]) => {
        const formattedCategory =
          category.charAt(0).toUpperCase() + category.slice(1);
        enrichedPrompt += `- ${formattedCategory}: ${data.lowRange}-${data.highRange} ${externalData.currency} per day\n`;
        enrichedPrompt += `  (${data.description})\n`;
      });

      enrichedPrompt += `\nDaily total estimate: ${externalData.dailyTotal.low}-${externalData.dailyTotal.high} ${externalData.currency} (average: ${externalData.dailyTotal.average} ${externalData.currency})\n`;

      if (externalData.notes) {
        enrichedPrompt += `\nNote: ${externalData.notes}\n`;
      }
      break;

    default:
      enrichedPrompt += JSON.stringify(externalData, null, 2);
  }

  return enrichedPrompt;
};
