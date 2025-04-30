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
    // This is a placeholder - in a real implementation,
    // you would use a weather API like OpenWeatherMap, WeatherAPI, etc.
    console.log(`Fetching weather data for ${location} on ${date}`);

    // Simulate API call with timeout
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          location: location,
          date: date,
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
        });
      }, 500);
    });
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return { success: false, error: error.message };
  }
};

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
  switch (intent) {
    case "Weather-Request":
      return await fetchWeatherData(
        requestDetails.location || requestDetails.vacation_location,
        requestDetails.date ||
          (requestDetails.dates && requestDetails.dates.from)
      );

    case "Find-Hotel":
      return await fetchHotelRecommendations(
        requestDetails.location || requestDetails.vacation_location,
        requestDetails.preferences
      );

    case "Find-Attractions":
      return await fetchAttractions(
        requestDetails.location || requestDetails.vacation_location,
        requestDetails.filters
      );

    default:
      return {
        success: false,
        error: "No external data fetching implementation for this intent",
      };
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
  if (!externalData.success) {
    return `${userMessage}\n\nNote: I tried to gather more information, but was unable to fetch the requested data.`;
  }

  let enrichedPrompt = `${userMessage}\n\n`;
  enrichedPrompt +=
    "Here is additional information to help answer this query:\n\n";

  switch (intent) {
    case "Weather-Request":
      enrichedPrompt += `Weather information for ${externalData.location} on ${externalData.date}:\n`;
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
