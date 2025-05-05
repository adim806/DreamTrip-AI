/**
 * Service utilities for fetching external data for RAG (Retrieval-Augmented Generation)
 */

/**
 * Fetches weather data for a specific location and date
 * @param {string} location - The location to get weather for
 * @param {string} date - The date to get weather for (YYYY-MM-DD)
 * @returns {Promise<Object>} - Weather data or error object
 */
export const fetchWeatherData = async (location, date) => {
  try {
    // Validate inputs
    if (!location) {
      console.warn("fetchWeatherData called without location");
      return {
        success: false,
        error: "Location is required for weather data",
      };
    }

    // Format date for display (handle undefined case)
    const formattedDate = date || new Date().toISOString().split("T")[0];
    const displayDate =
      formattedDate === new Date().toISOString().split("T")[0]
        ? "today"
        : formattedDate;

    console.log(
      `Fetching weather data for ${location} on ${displayDate} (${formattedDate})`
    );

    // Check if we're fetching current weather or forecast
    const isCurrentWeather =
      formattedDate === new Date().toISOString().split("T")[0];

    // Use the OpenWeatherMap API (you'll need to register for a free API key)
    const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

    let weatherData;

    if (isCurrentWeather) {
      // Fetch current weather
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          location
        )}&appid=${API_KEY}&units=metric`
      );

      if (!response.ok) {
        throw new Error(
          `Weather API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Map OpenWeatherMap response to our format
      weatherData = {
        success: true,
        location: location,
        date: formattedDate,
        displayDate: displayDate,
        forecast: {
          temperature: {
            current: Math.round(data.main.temp),
            min: Math.round(data.main.temp_min),
            max: Math.round(data.main.temp_max),
          },
          conditions: data.weather[0].main,
          precipitation: {
            chance: data.rain ? 100 : data.clouds.all, // Approximation based on cloudiness
            amount: data.rain ? data.rain["1h"] || 0 : 0,
          },
          humidity: data.main.humidity,
          wind: {
            speed: Math.round(data.wind.speed * 3.6), // Convert from m/s to km/h
            direction: degreesToDirection(data.wind.deg),
          },
        },
      };
    } else {
      // Fetch 5 day forecast for a specific date
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
          location
        )}&appid=${API_KEY}&units=metric`
      );

      if (!response.ok) {
        throw new Error(
          `Weather API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Find forecast entries for the requested date
      const targetDate = new Date(formattedDate);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      const dayForecasts = data.list.filter((entry) => {
        const entryDate = new Date(entry.dt * 1000).toISOString().split("T")[0];
        return entryDate === targetDateStr;
      });

      if (dayForecasts.length === 0) {
        // If no forecast found for the specific date (e.g., it's too far in the future)
        throw new Error(`No forecast available for ${formattedDate}`);
      }

      // Aggregate forecast data for the day
      const temps = dayForecasts.map((f) => f.main.temp);
      const minTemp = Math.min(...dayForecasts.map((f) => f.main.temp_min));
      const maxTemp = Math.max(...dayForecasts.map((f) => f.main.temp_max));
      const avgTemp = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;

      // Get most common condition for the day
      const conditions = dayForecasts.map((f) => f.weather[0].main);
      const mainCondition = getFrequentValue(conditions);

      // Check for precipitation
      const hasRain = dayForecasts.some((f) => f.rain && f.rain["3h"] > 0);
      const precipChance = hasRain
        ? Math.max(...dayForecasts.map((f) => f.clouds.all))
        : Math.round(
            dayForecasts.reduce((sum, f) => sum + f.clouds.all, 0) /
              dayForecasts.length
          );

      // Calculate average humidity and wind
      const avgHumidity = Math.round(
        dayForecasts.reduce((sum, f) => sum + f.main.humidity, 0) /
          dayForecasts.length
      );
      const avgWindSpeed = Math.round(
        (dayForecasts.reduce((sum, f) => sum + f.wind.speed, 0) /
          dayForecasts.length) *
          3.6
      ); // to km/h
      const windDirections = dayForecasts.map((f) => f.wind.deg);
      const avgWindDir = getAverageWindDirection(windDirections);

      weatherData = {
        success: true,
        location: location,
        date: formattedDate,
        displayDate: displayDate,
        forecast: {
          temperature: {
            current: Math.round(avgTemp),
            min: Math.round(minTemp),
            max: Math.round(maxTemp),
          },
          conditions: mainCondition,
          precipitation: {
            chance: precipChance,
            amount: hasRain
              ? dayForecasts.reduce(
                  (sum, f) => sum + (f.rain ? f.rain["3h"] || 0 : 0),
                  0
                )
              : 0,
          },
          humidity: avgHumidity,
          wind: {
            speed: avgWindSpeed,
            direction: degreesToDirection(avgWindDir),
          },
        },
      };
    }

    console.log("Retrieved weather data:", weatherData);
    return weatherData;
  } catch (error) {
    console.error("Error fetching weather data:", error);

    // If API fails, fall back to simulated data with a warning
    console.warn("Falling back to simulated weather data");

    // Format date for display if needed
    const formattedDate = date || new Date().toISOString().split("T")[0];
    const displayDate =
      formattedDate === new Date().toISOString().split("T")[0]
        ? "today"
        : formattedDate;

    return {
      success: true,
      location: location,
      date: formattedDate,
      displayDate: displayDate,
      simulated: true, // Mark as simulated so UI can show a disclaimer if needed
      forecast: {
        temperature: {
          min: Math.floor(Math.random() * 10) + 15,
          max: Math.floor(Math.random() * 10) + 25,
          current: Math.floor(Math.random() * 10) + 20,
        },
        conditions: ["Sunny", "Partly Cloudy", "Rainy", "Overcast"][
          Math.floor(Math.random() * 4)
        ],
        precipitation: {
          chance: Math.floor(Math.random() * 100),
          amount: Math.random() * 10,
        },
        humidity: Math.floor(Math.random() * 50) + 30,
        wind: {
          speed: Math.floor(Math.random() * 30),
          direction: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
            Math.floor(Math.random() * 8)
          ],
        },
      },
    };
  }
};

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
    // This is a placeholder - in a real implementation,
    // you would use a hotel API like Booking.com, Hotels.com, Expedia, etc.
    console.log(`Fetching hotel recommendations for ${location}`);

    // Simulate API call with timeout
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          location: location,
          hotels: [
            {
              name: "Grand Plaza Hotel",
              rating: 4.7,
              price_range: "$$$$",
              amenities: ["Pool", "Spa", "Free WiFi", "Restaurant"],
              location: "City Center",
            },
            {
              name: "Ocean View Resort",
              rating: 4.5,
              price_range: "$$$",
              amenities: [
                "Beach Access",
                "Pool",
                "Free WiFi",
                "Breakfast included",
              ],
              location: "Beachfront",
            },
            {
              name: "Comfort Inn",
              rating: 3.8,
              price_range: "$$",
              amenities: ["Free WiFi", "Breakfast included", "Parking"],
              location: "Downtown",
            },
          ],
        });
      }, 700);
    });
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
    // This is a placeholder - in a real implementation,
    // you would use a tourism API like TripAdvisor, Google Places, etc.
    console.log(`Fetching attractions for ${location}`);

    // Simulate API call with timeout
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          location: location,
          attractions: [
            {
              name: "Historical Museum",
              rating: 4.6,
              category: "Museum",
              description: "A fascinating collection of historical artifacts",
              price_range: "$",
            },
            {
              name: "Central Park",
              rating: 4.8,
              category: "Park",
              description:
                "Beautiful urban park with walking trails and gardens",
              price_range: "Free",
            },
            {
              name: "Skyline Tower",
              rating: 4.4,
              category: "Landmark",
              description: "Observation deck with panoramic city views",
              price_range: "$$",
            },
          ],
        });
      }, 600);
    });
  } catch (error) {
    console.error("Error fetching attractions:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Determines which external data to fetch based on intent and request details
 * @param {string} intent - The detected intent (Weather-Request, Find-Hotel, etc.)
 * @param {Object} requestDetails - Details extracted from the user query
 * @returns {Promise<Object>} - External data response
 */
export const fetchExternalData = async (intent, requestDetails) => {
  console.log(`fetchExternalData called for intent: ${intent}`, requestDetails);

  // Process and validate request details
  const processedDetails = processRequestDetails(intent, requestDetails);

  switch (intent) {
    case "Weather-Request":
      return await fetchWeatherData(
        processedDetails.location || processedDetails.vacation_location,
        processedDetails.date
      );

    case "Find-Hotel":
      return await fetchHotelRecommendations(
        processedDetails.location || processedDetails.vacation_location,
        processedDetails.preferences
      );

    case "Find-Attractions":
      return await fetchAttractions(
        processedDetails.location || processedDetails.vacation_location,
        processedDetails.filters
      );

    default:
      return {
        success: false,
        error: "No external data fetching implementation for this intent",
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

  // Handle Weather-Request specifics
  if (intent === "Weather-Request") {
    // Ensure we have a proper date
    if (!processedDetails.date || processedDetails.date === "undefined") {
      // Set to today's date in YYYY-MM-DD format
      processedDetails.date = new Date().toISOString().split("T")[0];
    }

    // Get date from dates object if exists
    if (
      !processedDetails.date &&
      processedDetails.dates &&
      processedDetails.dates.from
    ) {
      processedDetails.date = processedDetails.dates.from;
    }

    // Handle "today" as current date
    if (processedDetails.date === "today") {
      processedDetails.date = new Date().toISOString().split("T")[0];
    }

    console.log(`Processed weather request details:`, processedDetails);
  }

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
  if (!externalData.success) {
    return `${userMessage}\n\nNote: I tried to gather more information, but was unable to fetch the requested data.`;
  }

  let enrichedPrompt = `${userMessage}\n\n`;
  enrichedPrompt +=
    "Here is additional information to help answer this query:\n\n";

  switch (intent) {
    case "Weather-Request":
      enrichedPrompt += `Weather information for ${externalData.location} on ${externalData.displayDate} (${externalData.date}):\n`;
      enrichedPrompt += `- Current temperature: ${externalData.forecast.temperature.current}°C\n`;
      enrichedPrompt += `- Min/Max temperature: ${externalData.forecast.temperature.min}°C to ${externalData.forecast.temperature.max}°C\n`;
      enrichedPrompt += `- Conditions: ${externalData.forecast.conditions}\n`;
      enrichedPrompt += `- Precipitation chance: ${externalData.forecast.precipitation.chance}%\n`;
      enrichedPrompt += `- Humidity: ${externalData.forecast.humidity}%\n`;
      enrichedPrompt += `- Wind: ${externalData.forecast.wind.speed} km/h ${externalData.forecast.wind.direction}\n`;
      break;

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

    default:
      enrichedPrompt += JSON.stringify(externalData, null, 2);
  }

  return enrichedPrompt;
};
