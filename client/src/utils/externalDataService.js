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

// API endpoint for server-side external data fetching
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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
    paris: "France",
    london: "United Kingdom",
    madrid: "Spain",
    berlin: "Germany",
    athens: "Greece",
    amsterdam: "Netherlands",
    brussels: "Belgium",
    vienna: "Austria",
    geneva: "Switzerland",
    zurich: "Switzerland",
    dublin: "Ireland",
    lisbon: "Portugal",
    barcelona: "Spain",
    florence: "Italy",
    milan: "Italy",
    venice: "Italy",
    naples: "Italy",
    munich: "Germany",
    frankfurt: "Germany",
    copenhagen: "Denmark",
    oslo: "Norway",
    stockholm: "Sweden",
    helsinki: "Finland",
    budapest: "Hungary",
    prague: "Czech Republic",
    warsaw: "Poland",
    istanbul: "Turkey",

    // Major North American cities
    "new york": "United States",
    "los angeles": "United States",
    chicago: "United States",
    toronto: "Canada",
    montreal: "Canada",
    vancouver: "Canada",
    "mexico city": "Mexico",

    // Major Asian cities
    tokyo: "Japan",
    kyoto: "Japan",
    osaka: "Japan",
    beijing: "China",
    shanghai: "China",
    "hong kong": "China",
    seoul: "South Korea",
    bangkok: "Thailand",
    singapore: "Singapore",
    dubai: "United Arab Emirates",
    mumbai: "India",
    delhi: "India",
    jerusalem: "Israel",
    "tel aviv": "Israel",

    // Major Australian/Oceanian cities
    sydney: "Australia",
    melbourne: "Australia",
    perth: "Australia",
    auckland: "New Zealand",
    wellington: "New Zealand",

    // Major South American cities
    "rio de janeiro": "Brazil",
    "buenos aires": "Argentina",
    lima: "Peru",
    bogota: "Colombia",
    santiago: "Chile",

    // Major African cities
    cairo: "Egypt",
    "cape town": "South Africa",
    johannesburg: "South Africa",
    casablanca: "Morocco",
    nairobi: "Kenya",
  };

  return wellKnownCities[normalizedCity] || null;
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
 * @returns {Promise<object>} - Results of the external data fetch
 */
export const fetchExternalData = async (
  intent,
  requestDetails = {},
  userProfile = null
) => {
  console.log(`Fetching external data for intent: ${intent}`, requestDetails);

  // Process request details using the existing logic
  const processedDetails = processRequestDetails(intent, {
    ...requestDetails,
    userProfile: userProfile,
  });

  // Early exit for missing critical fields
  if (!processedDetails || Object.keys(processedDetails).length === 0) {
    console.error("Missing required details for external data request");
    return {
      success: false,
      error: "Missing required details for this request",
    };
  }

  try {
    // Special handling for Find-Attractions to ensure location is properly set
    if (intent === "Find-Attractions") {
      console.log(
        "Processing Find-Attractions intent with details:",
        processedDetails
      );

      // Make sure we have a location parameter - check all possible location fields
      const location =
        processedDetails.location ||
        processedDetails.city ||
        processedDetails.vacation_location ||
        processedDetails.destination;

      if (!location) {
        console.error("Location is required for attractions search");
        return {
          success: false,
          error: "Location is required for attractions search",
        };
      }

      // Create a clean params object with the location properly set
      return await fetchAttractions(location, {
        country: processedDetails.country,
        category: processedDetails.category,
        rating: processedDetails.rating,
        ...processedDetails.filters,
      });
    }

    // For the other supported intents, use the server endpoint
    if (
      ["Weather-Request", "Find-Hotel", "Find-Restaurants"].includes(intent)
    ) {
      // Call the generic server endpoint with intent and all processed details
      const params = new URLSearchParams({
        intent,
        ...processedDetails,
      });

      // For complex objects, stringify them
      if (processedDetails.preferences) {
        params.delete("preferences");
        params.append(
          "preferences",
          JSON.stringify(processedDetails.preferences)
        );
      }

      if (processedDetails.filters) {
        params.delete("filters");
        params.append("filters", JSON.stringify(processedDetails.filters));
      }

      console.log(
        `Calling server endpoint for ${intent} with params:`,
        params.toString()
      );

      const response = await fetch(
        `${API_BASE_URL}/api/external/data?${params}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Server returned ${response.status}`
        );
      }

      const data = await response.json();
      console.log(`Received ${intent} data from server:`, data);
      return data;
    }

    // For unsupported intents, fall back to the original implementation
    switch (intent) {
      case "Flight-Information":
        return await fetchFlightInformation({
          origin: processedDetails.origin,
          destination: processedDetails.destination,
          date: processedDetails.date,
          returnDate: processedDetails.returnDate,
          passengers: processedDetails.passengers,
        });

      case "Local-Events":
        return await fetchLocalEvents({
          location:
            processedDetails.location || processedDetails.vacation_location,
          startDate:
            processedDetails.date ||
            (processedDetails.dates ? processedDetails.dates.from : null),
          endDate: processedDetails.dates ? processedDetails.dates.to : null,
          category: processedDetails.category || processedDetails.eventType,
          limit: 5,
        });

      case "Travel-Restrictions":
        return await fetchTravelRestrictions({
          country:
            processedDetails.country ||
            processedDetails.location ||
            processedDetails.vacation_location,
          citizenship: processedDetails.citizenship,
        });

      case "Currency-Conversion":
        return await fetchCurrencyConversion({
          from: processedDetails.from,
          to: processedDetails.to,
          amount: processedDetails.amount || 1,
        });

      case "Cost-Estimate":
        return await fetchCostEstimates({
          location:
            processedDetails.location || processedDetails.vacation_location,
          category: processedDetails.category,
          budget:
            processedDetails.budget_level ||
            processedDetails.budget ||
            (processedDetails.constraints
              ? processedDetails.constraints.budget
              : null) ||
            "moderate",
          currency: processedDetails.currency || "USD",
        });

      default:
        console.warn(`Unhandled external data intent: ${intent}`);
        return {
          success: false,
          error: `External data for ${intent} is not currently supported`,
        };
    }
  } catch (error) {
    console.error(`Error in fetchExternalData:`, error);
    return {
      success: false,
      error: `External data service error: ${error.message}`,
    };
  }
};

/**
 * Process and validate request details before sending to API
 * @param {string} intent - The detected intent
 * @param {Object} details - Original request details
 * @returns {Object} - Processed request details
 */
const processRequestDetails = (intent, details) => {
  if (!details) return {};

  // Create a copy to avoid modifying the original
  const processedDetails = { ...details };

  // Check if collectedData exists and has fields - integrate them
  if (details.collectedData && Object.keys(details.collectedData).length > 0) {
    console.log(
      "Found collectedData, integrating with details:",
      details.collectedData
    );

    // Add any fields from collectedData that aren't in the main details
    Object.entries(details.collectedData).forEach(([key, value]) => {
      if (
        processedDetails[key] === undefined &&
        value !== undefined &&
        key !== "lastUpdated" &&
        value !== null
      ) {
        processedDetails[key] = value;
        console.log(`Added ${key} from collectedData:`, value);
      }
    });

    // Remove the collectedData field from processed details to avoid confusion
    delete processedDetails.collectedData;
  }

  // Check if we have a user profile field and process it
  if (details.userProfile && Object.keys(details.userProfile).length > 0) {
    console.log(
      "Found userProfile data, integrating with details:",
      details.userProfile
    );

    // בדיקה האם יש שדה timeContext בפרופיל המשתמש לטיפול בזמנים
    if (details.userProfile.timeContext && !processedDetails.timeContext) {
      console.log(
        `Using timeContext=${details.userProfile.timeContext} from userProfile`
      );
      processedDetails.timeContext = details.userProfile.timeContext;
    }

    // הסרת שדות boolean ישנים אם קיימים בפרופיל המשתמש
    const oldTimeFlags = [
      "isCurrentTime",
      "isToday",
      "isTomorrow",
      "isWeekend",
    ];
    let hasOldTimeFlag = false;
    let detectedTimeContext = null;

    // בדיקה אם יש דגלי זמן ישנים בפרופיל המשתמש
    oldTimeFlags.forEach((flag) => {
      if (
        details.userProfile[flag] === true ||
        details.userProfile[flag] === "true"
      ) {
        hasOldTimeFlag = true;
        console.log(`Found old time flag in userProfile: ${flag}=true`);

        // המרה לפורמט החדש
        if (flag === "isCurrentTime") detectedTimeContext = "now";
        else if (flag === "isToday") detectedTimeContext = "today";
        else if (flag === "isTomorrow") detectedTimeContext = "tomorrow";
        else if (flag === "isWeekend") detectedTimeContext = "weekend";
      }
    });

    // אם מצאנו דגל ישן ואין timeContext מוגדר, נשתמש בערך שזיהינו
    if (
      hasOldTimeFlag &&
      detectedTimeContext &&
      !processedDetails.timeContext
    ) {
      console.log(
        `Converting old time flags to timeContext=${detectedTimeContext}`
      );
      processedDetails.timeContext = detectedTimeContext;
    }

    // Add any fields from userProfile that aren't in the main details
    Object.entries(details.userProfile).forEach(([key, value]) => {
      if (
        // לא להעתיק את השדות הבוליאניים הישנים
        !oldTimeFlags.includes(key) &&
        processedDetails[key] === undefined &&
        value !== undefined &&
        key !== "lastUpdated" &&
        value !== null
      ) {
        processedDetails[key] = value;
        console.log(`Added ${key} from userProfile:`, value);
      }
    });

    // Remove the userProfile field from processed details to avoid confusion
    delete processedDetails.userProfile;
  }

  // Standardize field names - ensure we use consistent names for the same concepts
  // This is critical for Find-Hotel intent to properly recognize budget levels
  if (intent === "Find-Hotel") {
    // Check for alternative budget field names and standardize to budget_level
    if (!processedDetails.budget_level) {
      // Look for alternative field names that might contain budget information
      const budgetLevel =
        processedDetails.hotel_type ||
        processedDetails.price_level ||
        processedDetails.budget ||
        processedDetails.price_range;

      if (budgetLevel) {
        console.log(
          `Standardizing budget field: ${budgetLevel} → budget_level`
        );
        processedDetails.budget_level = budgetLevel;

        // Clean up alternative fields to avoid confusion
        delete processedDetails.hotel_type;
        delete processedDetails.price_level;
        delete processedDetails.price_range;
      }
    }

    // If we still don't have a budget_level, check the original query for keywords
    if (
      !processedDetails.budget_level &&
      (processedDetails.original_query ||
        processedDetails.query ||
        processedDetails.userMessage)
    ) {
      const queryText = (
        processedDetails.original_query ||
        processedDetails.query ||
        processedDetails.userMessage ||
        ""
      ).toLowerCase();

      if (
        queryText.includes("luxury") ||
        queryText.includes("expensive") ||
        queryText.includes("high-end") ||
        queryText.includes("fancy") ||
        queryText.includes("5-star") ||
        queryText.includes("premium")
      ) {
        processedDetails.budget_level = "luxury";
        console.log(
          `Detected luxury keyword in query, setting budget_level=luxury`
        );
      } else if (
        queryText.includes("cheap") ||
        queryText.includes("budget") ||
        queryText.includes("inexpensive") ||
        queryText.includes("affordable") ||
        queryText.includes("low cost") ||
        queryText.includes("cheapest") ||
        queryText.includes("economical")
      ) {
        // Use "cheap" instead of "budget" for better consistency across system
        processedDetails.budget_level = "cheap";
        console.log(
          `Detected budget keyword in query, setting budget_level=cheap`
        );
      } else if (
        queryText.includes("moderate") ||
        queryText.includes("mid-range") ||
        queryText.includes("average") ||
        queryText.includes("standard")
      ) {
        processedDetails.budget_level = "moderate";
        console.log(
          `Detected moderate keyword in query, setting budget_level=moderate`
        );
      }
    }
  }
  // Special handling for restaurant searches
  else if (intent === "Find-Restaurants") {
    // Handle preferences array or string
    if (processedDetails.preferences) {
      let preferencesList = [];

      // Convert to array if it's a string
      if (typeof processedDetails.preferences === "string") {
        preferencesList = [processedDetails.preferences];
      }
      // Keep as is if it's already an array
      else if (Array.isArray(processedDetails.preferences)) {
        preferencesList = processedDetails.preferences;
      }

      // Extract rating information from preferences
      for (const pref of preferencesList) {
        const prefLower = pref.toLowerCase();
        if (
          prefLower.includes("high rating") ||
          prefLower.includes("good rating") ||
          prefLower.includes("top rated") ||
          prefLower.includes("best") ||
          prefLower.includes("highest rated")
        ) {
          processedDetails.rating = "high";
          console.log(
            `Detected high rating preference from preferences array, setting rating=high`
          );
          break;
        }
      }
    }

    // If rating not set from preferences, check the original query
    if (
      !processedDetails.rating &&
      (processedDetails.original_query ||
        processedDetails.query ||
        processedDetails.userMessage)
    ) {
      const queryText = (
        processedDetails.original_query ||
        processedDetails.query ||
        processedDetails.userMessage ||
        ""
      ).toLowerCase();

      if (
        queryText.includes("high rating") ||
        queryText.includes("top rated") ||
        queryText.includes("good rating") ||
        queryText.includes("best restaurant") ||
        queryText.includes("highly rated") ||
        queryText.includes("great restaurant")
      ) {
        processedDetails.rating = "high";
        console.log(`Detected rating keywords in query, setting rating=high`);
      }
    }

    // Handle "city" vs "location" field for restaurants
    if (processedDetails.city && !processedDetails.location) {
      processedDetails.location = processedDetails.city;
      console.log(
        `Using city as location for restaurant search: ${processedDetails.city}`
      );
    } else if (processedDetails.location && !processedDetails.city) {
      processedDetails.city = processedDetails.location;
      console.log(
        `Using location as city for restaurant search: ${processedDetails.location}`
      );
    }
  }

  // Process common fields for any intent
  const originalDetails = details;
  if (
    originalDetails.original_query ||
    originalDetails.query ||
    originalDetails.userMessage
  ) {
    const queryText = (
      originalDetails.original_query ||
      originalDetails.query ||
      originalDetails.userMessage ||
      ""
    ).toLowerCase();

    // Check for budget terms for all intents that might need it
    if (
      intent === "Find-Hotel" ||
      intent === "Find-Restaurants" ||
      intent === "Find-Attractions"
    ) {
      // Check for budget terms
      let budgetLevel = null;
      if (
        queryText.includes("luxury") ||
        queryText.includes("expensive") ||
        queryText.includes("high-end") ||
        queryText.includes("5-star") ||
        queryText.includes("premium")
      ) {
        budgetLevel = "luxury";
      } else if (
        queryText.includes("cheap") ||
        queryText.includes("budget") ||
        queryText.includes("inexpensive") ||
        queryText.includes("affordable") ||
        queryText.includes("low cost")
      ) {
        budgetLevel = "budget";
      } else if (
        queryText.includes("moderate") ||
        queryText.includes("mid-range") ||
        queryText.includes("average") ||
        queryText.includes("standard")
      ) {
        budgetLevel = "moderate";
      }

      // If budget term found, add to both formats for compatibility
      if (budgetLevel) {
        console.log(
          `Detected budget level from query: ${budgetLevel} for ${intent}`
        );

        // Create preferences object if it doesn't exist
        if (!processedDetails.preferences) {
          processedDetails.preferences = {};
        }

        // Set budget in both formats for compatibility with different services
        processedDetails.preferences.budget = budgetLevel;
        processedDetails.preferences.budget_level = budgetLevel;
        processedDetails.budget_level = budgetLevel;

        console.log(`Set budget level to ${budgetLevel} for ${intent} search`);
      }
    }
  }

  // Handle Weather-Request specifics
  if (intent === "Weather-Request") {
    console.log("Raw weather request details:", processedDetails);

    // Handle new field naming - city instead of location
    if (processedDetails.city && !processedDetails.location) {
      processedDetails.location = processedDetails.city;
      console.log(`Using city field as location: ${processedDetails.city}`);
    }

    // Handle time field - התאמה לגישה החדשה עם timeContext
    if (processedDetails.time) {
      // Process time indicator words
      if (
        processedDetails.time === "now" ||
        processedDetails.time === "current" ||
        processedDetails.time === "currently"
      ) {
        processedDetails.timeContext = "now";
        console.log(
          `Set timeContext="now" based on time="${processedDetails.time}"`
        );
      } else if (processedDetails.time === "today") {
        processedDetails.timeContext = "today";
        console.log(
          `Set timeContext="today" based on time="${processedDetails.time}"`
        );
      } else if (processedDetails.time === "tomorrow") {
        processedDetails.timeContext = "tomorrow";
        console.log(
          `Set timeContext="tomorrow" based on time="${processedDetails.time}"`
        );
      } else if (processedDetails.time === "weekend") {
        processedDetails.timeContext = "weekend";
        console.log(
          `Set timeContext="weekend" based on time="${processedDetails.time}"`
        );
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
        const dayOfWeek = weekend.getDay();
        const daysUntilWeekend =
          dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
        weekend.setDate(weekend.getDate() + daysUntilWeekend);
        processedDetails.date = weekend.toISOString().split("T")[0];
        console.log(
          `Set date=${processedDetails.date} based on timeContext="${processedDetails.timeContext}"`
        );
      }
    }
    // מבטל את השימוש בשדות הבוליאניים הישנים
    else if (!processedDetails.date) {
      // גיבוי אחורה: אם אין timeContext ואין date, ננסה להתייחס לדגלים ישנים ולהמיר אותם
      const today = new Date();

      if (
        processedDetails.isCurrentTime === true ||
        processedDetails.isCurrentTime === "true"
      ) {
        processedDetails.date = today.toISOString().split("T")[0];
        processedDetails.timeContext = "now";
        console.log(
          `Using legacy isCurrentTime flag, setting timeContext="now" and date=${processedDetails.date}`
        );
        // מחיקת השדה הישן
        delete processedDetails.isCurrentTime;
      } else if (
        processedDetails.isToday === true ||
        processedDetails.isToday === "true"
      ) {
        processedDetails.date = today.toISOString().split("T")[0];
        processedDetails.timeContext = "today";
        console.log(
          `Using legacy isToday flag, setting timeContext="today" and date=${processedDetails.date}`
        );
        // מחיקת השדה הישן
        delete processedDetails.isToday;
      } else if (
        processedDetails.isTomorrow === true ||
        processedDetails.isTomorrow === "true"
      ) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        processedDetails.date = tomorrow.toISOString().split("T")[0];
        processedDetails.timeContext = "tomorrow";
        console.log(
          `Using legacy isTomorrow flag, setting timeContext="tomorrow" and date=${processedDetails.date}`
        );
        // מחיקת השדה הישן
        delete processedDetails.isTomorrow;
      } else if (
        processedDetails.isWeekend === true ||
        processedDetails.isWeekend === "true"
      ) {
        const weekend = new Date(today);
        const dayOfWeek = weekend.getDay();
        const daysUntilWeekend =
          dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
        weekend.setDate(weekend.getDate() + daysUntilWeekend);
        processedDetails.date = weekend.toISOString().split("T")[0];
        processedDetails.timeContext = "weekend";
        console.log(
          `Using legacy isWeekend flag, setting timeContext="weekend" and date=${processedDetails.date}`
        );
        // מחיקת השדה הישן
        delete processedDetails.isWeekend;
      }
    }

    // מחיקה מוחלטת של כל השדות הישנים שעלולים לגרום לקונפליקטים
    delete processedDetails.isCurrentTime;
    delete processedDetails.isToday;
    delete processedDetails.isTomorrow;
    delete processedDetails.isWeekend;

    // Ensure we have a proper date
    if (!processedDetails.date || processedDetails.date === "undefined") {
      // Set to today's date in YYYY-MM-DD format
      processedDetails.date = new Date().toISOString().split("T")[0];
      console.log(
        `No valid date found, defaulting to today: ${processedDetails.date}`
      );
    }

    // Get date from dates object if exists
    if (
      !processedDetails.date &&
      processedDetails.dates &&
      processedDetails.dates.from
    ) {
      processedDetails.date = processedDetails.dates.from;
      console.log(`Using date from dates.from: ${processedDetails.date}`);
    }

    // Handle "today" as current date
    if (processedDetails.date === "today") {
      processedDetails.date = new Date().toISOString().split("T")[0];
      processedDetails.timeContext = "today";
      console.log(
        `Converted date="today" to ${processedDetails.date} with timeContext="today"`
      );
    }

    // בדיקה נוספת אם יש date אבל אין timeContext
    if (processedDetails.date && !processedDetails.timeContext) {
      // הוספת timeContext לפי התאריך
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      if (processedDetails.date === today) {
        processedDetails.timeContext = "today";
      } else if (processedDetails.date === tomorrowStr) {
        processedDetails.timeContext = "tomorrow";
      }
    }

    // Try to extract country from the location field if it contains both city and country
    if (!processedDetails.country && processedDetails.location) {
      // Check if location contains a comma (likely city, country format)
      const locationParts = processedDetails.location.split(",");
      if (locationParts.length > 1) {
        // Update location to be just the city
        processedDetails.location = locationParts[0].trim();
        processedDetails.city = locationParts[0].trim(); // Also update city field
        // Set country to the part after the comma
        processedDetails.country = locationParts[1].trim();
        console.log(
          `Extracted country from location: ${processedDetails.country}`
        );
      }

      // Check for common patterns like "Tel Aviv Israel"
      else {
        const locationWords = processedDetails.location.split(" ");
        // If we have multiple words, the last word might be a country
        if (locationWords.length > 1) {
          // Check if the last word is a known country
          const possibleCountry = locationWords[locationWords.length - 1];
          const countryCode = getCountryCode(possibleCountry);

          if (countryCode) {
            // If it's a recognized country, separate it
            processedDetails.country = possibleCountry;
            processedDetails.location = locationWords.slice(0, -1).join(" ");
            processedDetails.city = processedDetails.location; // Also update city field
            console.log(
              `Detected country in location string: ${processedDetails.country}`
            );
          }
        }
      }
    }

    // Ensure country is present for weather requests
    if (!processedDetails.country && processedDetails.vacation_location) {
      // If we're requesting weather for the trip destination and we have country info in trip details
      const locationParts = processedDetails.vacation_location.split(",");
      if (locationParts.length > 1) {
        processedDetails.location = locationParts[0].trim();
        processedDetails.city = locationParts[0].trim(); // Also update city field
        processedDetails.country = locationParts[1].trim();
      }
    }

    // For locations like "Tel Aviv Israel" where there's no comma but both city and country
    // are in the same string, try to separate them
    if (!processedDetails.country && processedDetails.location) {
      const words = processedDetails.location.split(/\s+/);
      // Try to identify if the last word could be a country
      if (words.length > 1) {
        const lastWord = words[words.length - 1];
        if (
          inferCountryForWellKnownCity(lastWord) ||
          getCountryCode(lastWord)
        ) {
          processedDetails.country = lastWord;
          processedDetails.location = words.slice(0, -1).join(" ");
          processedDetails.city = processedDetails.location; // Also update city field
          console.log(
            `Separated city and country from: "${details.location}" to location: "${processedDetails.location}", country: "${processedDetails.country}"`
          );
        }
      }
    }

    // Last resort: If we have a well-known city, infer the country
    if (!processedDetails.country && processedDetails.location) {
      const inferredCountry = inferCountryForWellKnownCity(
        processedDetails.location
      );
      if (inferredCountry) {
        processedDetails.country = inferredCountry;
        console.log(
          `Inferred country for well-known city: ${processedDetails.location} -> ${inferredCountry}`
        );
      }
    }

    console.log(`Processed weather request details:`, processedDetails);
  } else if (intent === "Find-Hotel") {
    // Handle hotel request specifics

    // Handle city as location
    if (processedDetails.city && !processedDetails.location) {
      processedDetails.location = processedDetails.city;
      console.log(
        `Using city field as location for hotel search: ${processedDetails.city}`
      );
    }

    // Try to extract country from location if it's in "City, Country" format
    if (!processedDetails.country && processedDetails.location) {
      // Check if location contains a comma (likely city, country format)
      const locationParts = processedDetails.location.split(",");
      if (locationParts.length > 1) {
        // Update location to be just the city
        processedDetails.location = locationParts[0].trim();
        // Set country to the part after the comma
        processedDetails.country = locationParts[1].trim();
        console.log(
          `Extracted country from location: ${processedDetails.country}`
        );
      }

      // If location is "Tel Aviv Israel" format without comma
      else if (processedDetails.location.includes(" ")) {
        const locationWords = processedDetails.location.split(" ");
        // Check if the last word could be a country
        const lastWord = locationWords[locationWords.length - 1];

        // Use a very simple check for common countries
        const commonCountries = [
          "israel",
          "usa",
          "uk",
          "france",
          "spain",
          "italy",
          "germany",
        ];
        if (commonCountries.includes(lastWord.toLowerCase())) {
          processedDetails.country = lastWord;
          processedDetails.location = locationWords.slice(0, -1).join(" ");
          console.log(
            `Detected country in location string: ${processedDetails.country}`
          );
        }
      }
    }

    // Extract budget terms from the original request
    const originalDetails = details;
    if (originalDetails.original_query || originalDetails.query) {
      const queryText = (
        originalDetails.original_query || originalDetails.query
      ).toLowerCase();

      // Check for budget terms
      let budgetLevel = null;
      if (
        queryText.includes("luxury") ||
        queryText.includes("expensive") ||
        queryText.includes("high-end") ||
        queryText.includes("5-star") ||
        queryText.includes("premium")
      ) {
        budgetLevel = "luxury";
      } else if (
        queryText.includes("cheap") ||
        queryText.includes("budget") ||
        queryText.includes("inexpensive") ||
        queryText.includes("affordable") ||
        queryText.includes("low cost")
      ) {
        budgetLevel = "budget";
      } else if (
        queryText.includes("moderate") ||
        queryText.includes("mid-range") ||
        queryText.includes("average") ||
        queryText.includes("standard")
      ) {
        budgetLevel = "moderate";
      }

      // If budget term found, add to both formats for compatibility
      if (budgetLevel) {
        console.log(`Detected budget level from query: ${budgetLevel}`);

        // Create preferences object if it doesn't exist
        if (!processedDetails.preferences) {
          processedDetails.preferences = {};
        }

        // Set budget in both formats for compatibility with different services
        processedDetails.preferences.budget = budgetLevel;
        processedDetails.preferences.budget_level = budgetLevel;
        processedDetails.budget_level = budgetLevel;

        console.log(`Set budget level to ${budgetLevel} for hotel search`);
      }
    }

    // Process check-in date only if explicitly provided, but don't require it
    if (processedDetails.time && !processedDetails.checkIn) {
      // Process time indicators but make it optional
      if (
        processedDetails.time === "now" ||
        processedDetails.time === "today"
      ) {
        processedDetails.checkIn = new Date().toISOString().split("T")[0];
      } else if (processedDetails.time === "tomorrow") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        processedDetails.checkIn = tomorrow.toISOString().split("T")[0];
      } else if (
        processedDetails.time &&
        processedDetails.time.match(/\d{4}-\d{2}-\d{2}/)
      ) {
        // Only use as checkIn if it's a valid date format
        processedDetails.checkIn = processedDetails.time;
      }

      if (processedDetails.checkIn) {
        console.log(`Set check-in date to: ${processedDetails.checkIn}`);
      } else {
        console.log(
          `No valid check-in date provided, proceeding without date filtering`
        );
      }
    }
  } else if (intent === "Find-Restaurants") {
    // Handle restaurant request specifics

    // Handle city as location
    if (processedDetails.city && !processedDetails.location) {
      processedDetails.location = processedDetails.city;
      console.log(
        `Using city field as location for restaurant search: ${processedDetails.city}`
      );
    }

    // Try to extract country from location if it's in "City, Country" format
    if (!processedDetails.country && processedDetails.location) {
      // Check if location contains a comma (likely city, country format)
      const locationParts = processedDetails.location.split(",");
      if (locationParts.length > 1) {
        // Update location to be just the city
        processedDetails.location = locationParts[0].trim();
        // Set country to the part after the comma
        processedDetails.country = locationParts[1].trim();
        console.log(
          `Extracted country from location: ${processedDetails.country}`
        );
      }

      // If location is "Tel Aviv Israel" format without comma
      else if (processedDetails.location.includes(" ")) {
        const locationWords = processedDetails.location.split(" ");
        // Check if the last word could be a country
        const lastWord = locationWords[locationWords.length - 1];

        // Use a very simple check for common countries
        const commonCountries = [
          "israel",
          "usa",
          "uk",
          "france",
          "spain",
          "italy",
          "germany",
        ];
        if (commonCountries.includes(lastWord.toLowerCase())) {
          processedDetails.country = lastWord;
          processedDetails.location = locationWords.slice(0, -1).join(" ");
          console.log(
            `Detected country in location string: ${processedDetails.country}`
          );
        }
      }
    }
  }

  // Remove internal meta fields to keep just data fields for API calls
  delete processedDetails.meta;
  delete processedDetails.rules;
  delete processedDetails.missingFields;
  delete processedDetails.status;
  delete processedDetails.next_state;
  delete processedDetails.next_action;

  console.log("Processed request details:", processedDetails);
  return processedDetails;
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
