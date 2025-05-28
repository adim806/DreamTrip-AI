/**
 * AdviceFormatter.js
 *
 * Formats raw responses from externalDataService into natural language.
 * Provides intent-specific formatting for various types of external data.
 */

import { formatLocation } from "../core/LocationResolver";

/**
 * Main formatting function to convert external data to user-friendly text
 *
 * @param {string} intent - The advice intent
 * @param {Object} data - The raw data from external service
 * @returns {string} - Formatted response text
 */
export const formatAdviceResponse = (intent, data) => {
  // Handle error cases
  if (!data || !intent) {
    return formatErrorResponse(intent, data);
  }

  // Add a friendly lead-in based on the intent type
  let leadIn = "";

  // For most intents, we'll skip the lead-in to keep the response concise
  // Only use lead-ins for specific cases where it improves the response
  switch (intent) {
    case "Weather-Request":
      leadIn = ""; // No lead-in for weather to keep it concise
      break;
    case "Find-Hotel":
      leadIn = ""; // No lead-in to keep it concise
      break;
    case "Find-Attractions":
      leadIn = ""; // No lead-in to keep it concise
      break;
    case "Flight-Information":
      leadIn = ""; // No lead-in to keep it concise
      break;
    case "Local-Events":
      leadIn = ""; // No lead-in to keep it concise
      break;
    case "Travel-Restrictions":
      leadIn = ""; // No lead-in to keep it concise
      break;
    case "Currency-Conversion":
      leadIn = ""; // No lead-in to keep it concise
      break;
    case "Cost-Estimate":
      leadIn = ""; // No lead-in to keep it concise
      break;
    case "Safety-Information":
      leadIn = ""; // No lead-in to keep it concise
      break;
    case "Travel-Tips":
      leadIn = ""; // No lead-in to keep it concise
      break;
    case "Public-Transport-Info":
      leadIn = ""; // No lead-in to keep it concise
      break;
    case "Find-Restaurants":
      leadIn = ""; // No lead-in to keep it concise
      break;
    default:
      leadIn = "";
  }

  // Format the response based on intent
  let formattedResponse = "";

  switch (intent) {
    case "Weather-Request":
      formattedResponse = formatWeatherResponse(data);
      break;
    case "Travel-Restrictions":
      formattedResponse = formatTravelRestrictionsResponse(data);
      break;
    case "Safety-Information":
      formattedResponse = formatSafetyResponse(data);
      break;
    case "Currency-Conversion":
      formattedResponse = formatCurrencyResponse(data);
      break;
    case "Flight-Information":
      formattedResponse = formatFlightResponse(data);
      break;
    case "Find-Attractions":
      formattedResponse = formatAttractionsResponse(data);
      break;
    case "Local-Events":
      formattedResponse = formatEventsResponse(data);
      break;
    case "Cost-Estimate":
      formattedResponse = formatCostResponse(data);
      break;
    case "Travel-Tips":
      formattedResponse = formatTravelTipsResponse(data);
      break;
    case "Public-Transport-Info":
      formattedResponse = formatTransportResponse(data);
      break;
    case "Find-Hotel":
      formattedResponse = formatHotelResponse(data);
      break;
    case "Find-Restaurants":
      formattedResponse = formatRestaurantsResponse(data);
      break;
    default:
      formattedResponse = formatGenericResponse(intent, data);
  }

  // Remove any references to system mechanics, data fields, or JSON
  formattedResponse = formattedResponse
    .replace(/I need to collect/g, "I'd like to know")
    .replace(/required field/g, "information")
    .replace(/missing field/g, "detail")
    .replace(/to fetch data/g, "to provide information")
    .replace(/status.*?complete/gi, "")
    .replace(/I need the following fields/g, "Could you please tell me")
    .replace(/data object/gi, "information")
    .replace(/fields/g, "details")
    .replace(/JSON/g, "")
    .replace(/structure/g, "")
    .replace(/format/g, "")
    .replace(/API/g, "sources")
    .replace(/required information/g, "important details");

  // Add the lead-in if we have a formatted response
  if (formattedResponse && leadIn) {
    return leadIn + formattedResponse;
  }

  return formattedResponse;
};

/**
 * Formats an error response when data fetching fails
 *
 * @param {string} intent - The advice intent
 * @param {Object} data - The error data
 * @returns {string} - Formatted error message
 */
function formatErrorResponse(intent, data) {
  // If data is null, provide a generic error message
  if (!data) {
    return `Sorry, I couldn't retrieve information for your ${intent
      .replace("-", " ")
      .toLowerCase()} request.`;
  }

  // Create a base message using the error details if available
  let baseMessage = data.error
    ? `Sorry, I couldn't retrieve the information: ${data.error}`
    : `Sorry, I couldn't get the information you requested.`;

  // Add specific location/country information if available
  if (data.requestData) {
    const locationInfo = data.requestData.location
      ? formatLocation(data.requestData)
      : null;

    if (locationInfo) {
      baseMessage = `Sorry, I couldn't retrieve ${intent
        .replace("-", " ")
        .toLowerCase()} information for ${locationInfo}.`;
    }
  }

  // Add intent-specific error handling
  switch (intent) {
    case "Weather-Request":
      return `${baseMessage} Would you like to try with a different location or date?`;
    case "Currency-Conversion":
      return `${baseMessage} Please check that you've provided valid currency codes.`;
    case "Flight-Information":
      return `${baseMessage} Flight information can change frequently. You might want to check directly with an airline or booking site.`;
    default:
      return `${baseMessage} Would you like to try again?`;
  }
}

/**
 * Formats weather data into a natural language response
 *
 * @param {Object} data - Weather data
 * @returns {string} - Formatted weather response
 */
function formatWeatherResponse(data) {
  if (!data || !data.success) {
    return formatErrorResponse("Weather-Request", data);
  }

  // Check for any type of weather data (current or forecasted)
  const hasForecast = data.forecast && Object.keys(data.forecast).length > 0;
  const hasForecasts = data.forecasts && data.forecasts.length > 0;

  if (!hasForecast && !hasForecasts) {
    console.warn("Weather data is missing both forecast and forecasts:", data);
    return `Sorry, I couldn't find detailed weather information for ${formatLocation(
      data.requestData || { location: data.location, country: data.country }
    )}.`;
  }

  // Format the location with proper case and country
  // Prioritize requestData for location formatting
  let locationData = data.requestData || {};

  // If location field is empty, try using city field
  if (!locationData.location && locationData.city) {
    locationData.location = locationData.city;
  }

  // If still empty, fall back to data.location or data.city
  if (!locationData.location) {
    locationData.location = data.city || data.location;
  }

  // If no country in request data, try to get it from top-level data
  if (!locationData.country) {
    locationData.country = data.country || data.returnedCountry;
  }

  const location = formatLocation(locationData);

  // If location is still empty after all attempts, use a generic fallback
  const displayLocation = location || "the requested location";

  // Helper function to format time information
  const getTimeInfoDisplay = (data) => {
    if (data.isCurrentTime || data.requestData?.isCurrentTime) {
      return "right now";
    } else if (data.isTomorrow || data.requestData?.isTomorrow) {
      return "tomorrow";
    } else if (data.isToday || data.requestData?.isToday) {
      return "today";
    } else if (
      data.time === "all day" ||
      data.requestData?.time === "all day"
    ) {
      return "throughout the day";
    } else if (data.time && typeof data.time === "string") {
      return `for ${data.time}`;
    } else if (data.displayDate) {
      return `on ${data.displayDate}`;
    } else if (data.date) {
      try {
        const dateObj = new Date(data.date);
        return `on ${dateObj.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}`;
      } catch (e) {
        return `on ${data.date}`;
      }
    }
    return ""; // Default empty string if no time info
  };

  // Get time/date information
  const timeInfo = getTimeInfoDisplay(data);

  // Format the date - could be "current" or a specific date
  // Default language is English
  const language = data.language || "en";

  // Set date phrase based on language and available time data
  let datePhrase = language === "he" ? "כרגע" : "currently";

  // Check request data first, then fall back to top-level data
  const timeData =
    data.requestData?.time ||
    data.requestData?.date ||
    data.time ||
    data.date ||
    null;

  const isCurrentTime =
    data.requestData?.isCurrentTime || data.isCurrentTime || timeData === "now";
  const isToday =
    data.requestData?.isToday || data.isToday || timeData === "today";
  const isTomorrow =
    data.requestData?.isTomorrow || data.isTomorrow || timeData === "tomorrow";
  const isWeekend =
    data.requestData?.isWeekend || data.isWeekend || timeData === "weekend";

  if (isCurrentTime) {
    datePhrase = language === "he" ? "עכשיו" : "right now";
  } else if (isToday) {
    datePhrase = language === "he" ? "היום" : "today";
  } else if (isTomorrow) {
    datePhrase = language === "he" ? "מחר" : "tomorrow";
  } else if (isWeekend) {
    datePhrase = language === "he" ? "בסוף השבוע" : "this weekend";
  } else if (timeData) {
    // If there's a specific date that's not one of the special cases
    try {
      const dateObj = new Date(timeData);
      // Check if this is a valid date
      if (!isNaN(dateObj.getTime())) {
        datePhrase =
          language === "he"
            ? `בתאריך ${formatDate(timeData)}`
            : `on ${formatDate(timeData)}`;
      } else {
        // If not a valid date, just use the time string directly
        datePhrase = language === "he" ? `ב${timeData}` : `for ${timeData}`;
      }
    } catch (e) {
      // If date parsing fails, use the time string directly
      datePhrase = language === "he" ? `ב${timeData}` : `for ${timeData}`;
    }
  }

  // Determine which weather data to use
  const weather = hasForecast
    ? data.forecast
    : hasForecasts
    ? data.forecasts[0]
    : null;

  if (!weather) {
    return `Sorry, I couldn't find detailed weather information for ${displayLocation}.`;
  }

  // Main weather conditions
  const temperature = hasForecast
    ? weather.temperature.current
    : weather.temperature.current;
  const conditions = weather.conditions;
  const precipitation = hasForecast
    ? weather.precipitation
      ? weather.precipitation.chance
      : 0
    : weather.precipitation
    ? weather.precipitation.chance
    : 0;
  const wind = hasForecast
    ? weather.wind
      ? weather.wind.speed
      : null
    : weather.wind
    ? weather.wind.speed
    : null;

  // Format temperature with units
  const tempStr = temperature ? `${Math.round(temperature)}°C` : "";

  // Add weather emoji based on conditions
  const weatherEmoji = getWeatherEmoji(conditions);

  // Build a more concise, professional response
  let response = "";

  // Get additional data for enhanced response
  const tempMin = hasForecast ? weather.temperature.min : null;
  const tempMax = hasForecast ? weather.temperature.max : null;
  const feelsLike = hasForecast ? weather.temperature.feels_like : null;
  const humidity = hasForecast ? weather.humidity : null;
  const description = weather.description || "";

  if (language === "he") {
    // Hebrew response - more concise and professional
    response = `${weatherEmoji} **${displayLocation} ${datePhrase}**: ${tempStr}, ${translateWeatherCondition(
      conditions,
      "he"
    )}`;

    // Add temperature range if available
    if (tempMin && tempMax) {
      response += `\nטווח טמפרטורות: ${tempMin}°C עד ${tempMax}°C`;
    }

    // Add feels like if available and significantly different
    if (feelsLike && Math.abs(feelsLike - temperature) > 3) {
      response += `\nמרגיש כמו: ${feelsLike}°C`;
    }

    // Add wind and humidity in a second line for better formatting
    if (wind || humidity) {
      response += "\n";
      if (wind) {
        response += `🌬️ רוח: ${wind} קמ"ש `;
      }
      if (humidity) {
        response += `💧 לחות: ${humidity}%`;
      }
    }

    // Add recommendation based on weather on a new line
    if (weather.recommendation) {
      response += `\n\n${translateRecommendation(
        weather.recommendation,
        "he"
      )}`;
    }
  } else {
    // English response - more professional and concise
    response = `${weatherEmoji} **${displayLocation} ${datePhrase}**: ${tempStr}, ${conditions.toLowerCase()}`;

    // Add brief description if available and meaningful
    if (
      description &&
      description !== conditions &&
      !conditions.includes(description)
    ) {
      response += ` (${description.toLowerCase()})`;
    }

    // Add temperature range if available
    if (tempMin && tempMax) {
      response += `\nTemperature range: ${tempMin}°C to ${tempMax}°C`;
    }

    // Add feels like if available and significantly different
    if (feelsLike && Math.abs(feelsLike - temperature) > 3) {
      response += `\nFeels like: ${feelsLike}°C`;
    }

    // Add wind and humidity in a second line for better readability
    if (wind || (humidity && (humidity > 70 || humidity < 30))) {
      response += "\n";
      if (wind) {
        response += `🌬️ Wind: ${wind} km/h `;
      }
      if (humidity && (humidity > 70 || humidity < 30)) {
        response += `💧 Humidity: ${humidity}%`;
      }
    }

    // Add precipitation if significant
    if (precipitation && precipitation > 20) {
      response += `\nPrecipitation chance: ${precipitation}%`;
    }

    // Add recommendation based on weather on a new line
    if (weather.recommendation) {
      response += `\n\n${weather.recommendation}`;
    } else {
      // Generate a generic recommendation based on conditions
      const temp = parseFloat(tempStr);
      let recommendation = "";

      if (temp > 30) {
        recommendation = "Stay hydrated and try to keep cool.";
      } else if (temp < 10) {
        recommendation = "Dress warmly and consider layers.";
      } else if (conditions.toLowerCase().includes("rain")) {
        recommendation = "Remember to bring an umbrella.";
      } else if (
        conditions.toLowerCase().includes("sun") ||
        conditions.toLowerCase().includes("clear")
      ) {
        recommendation = "It's a good day to enjoy outdoor activities.";
      }

      if (recommendation) {
        response += `\n\n${recommendation}`;
      }
    }
  }

  // Add attribution if available (keep this minimal)
  if (data.attribution) {
    const shortAttribution = data.attribution.split(".")[0]; // Just use the first sentence
    response += `\n\n${shortAttribution}`;
  }

  return response;
}

/**
 * Returns an appropriate emoji for the weather conditions
 * @param {string} conditions - Weather conditions text
 * @returns {string} - Weather emoji
 */
function getWeatherEmoji(conditions) {
  if (!conditions) return "🌡️";

  const conditionsLower = conditions.toLowerCase();

  if (conditionsLower.includes("clear") || conditionsLower.includes("sunny")) {
    return "☀️";
  } else if (
    conditionsLower.includes("few clouds") ||
    conditionsLower.includes("partly cloudy")
  ) {
    return "🌤️";
  } else if (
    conditionsLower.includes("scattered clouds") ||
    conditionsLower.includes("broken clouds")
  ) {
    return "⛅";
  } else if (
    conditionsLower.includes("clouds") ||
    conditionsLower.includes("cloudy")
  ) {
    return "☁️";
  } else if (
    conditionsLower.includes("shower rain") ||
    conditionsLower.includes("light rain")
  ) {
    return "🌦️";
  } else if (conditionsLower.includes("rain")) {
    return "🌧️";
  } else if (conditionsLower.includes("thunderstorm")) {
    return "⛈️";
  } else if (conditionsLower.includes("snow")) {
    return "❄️";
  } else if (
    conditionsLower.includes("mist") ||
    conditionsLower.includes("fog")
  ) {
    return "🌫️";
  } else if (
    conditionsLower.includes("tornado") ||
    conditionsLower.includes("hurricane")
  ) {
    return "🌪️";
  } else if (conditionsLower.includes("wind")) {
    return "💨";
  }

  return "🌡️"; // Default for unknown conditions
}

/**
 * Translates English weather conditions to Hebrew
 * @param {string} condition - The weather condition in English
 * @param {string} targetLang - The target language code
 * @returns {string} - Translated condition
 */
function translateWeatherCondition(condition, targetLang) {
  if (targetLang !== "he") return condition.toLowerCase();

  const conditionMap = {
    "clear sky": "שמיים בהירים",
    "few clouds": "מעט עננים",
    "scattered clouds": "עננים מפוזרים",
    "broken clouds": "עננים חלקיים",
    "overcast clouds": "עננים מעוננים",
    "light rain": "גשם קל",
    "moderate rain": "גשם בינוני",
    "heavy rain": "גשם כבד",
    thunderstorm: "סופת רעמים",
    snow: "שלג",
    mist: "ערפל",
    fog: "ערפל כבד",
    drizzle: "טפטוף",
    "shower rain": "מקלחת גשם",
    rain: "גשם",
    "thunderstorm with light rain": "סופת רעמים עם גשם קל",
    "thunderstorm with rain": "סופת רעמים עם גשם",
    "thunderstorm with heavy rain": "סופת רעמים עם גשם כבד",
    "light snow": "שלג קל",
    "heavy snow": "שלג כבד",
    sleet: "שלג מעורב בגשם",
    "shower snow": "מקלחת שלג",
    haze: "אובך",
    dust: "אבק",
    sand: "חול",
    smoke: "עשן",
    squalls: "משבי רוח",
    tornado: "טורנדו",
    sunny: "שמשי",
    "partly cloudy": "מעונן חלקית",
    cloudy: "מעונן",
    windy: "רוחות חזקות",
    hot: "חם",
    cold: "קר",
    humid: "לח",
  };

  const lowerCondition = condition.toLowerCase();
  return conditionMap[lowerCondition] || lowerCondition;
}

/**
 * Translates English weather recommendations to Hebrew
 * @param {string} recommendation - The recommendation in English
 * @param {string} targetLang - The target language code
 * @returns {string} - Translated recommendation
 */
function translateRecommendation(recommendation, targetLang) {
  if (targetLang !== "he") return recommendation;

  // Simple translation logic - in a real app, this would use a more sophisticated translation service
  if (recommendation.includes("umbrella")) {
    return "כדאי לקחת מטריה!";
  } else if (recommendation.includes("sunscreen")) {
    return "מומלץ למרוח קרם הגנה!";
  } else if (
    recommendation.includes("jacket") ||
    recommendation.includes("coat")
  ) {
    return "כדאי ללבוש מעיל!";
  } else if (
    recommendation.includes("hot") ||
    recommendation.includes("warm")
  ) {
    return "כדאי להצטייד במים ולהימנע מחשיפה ממושכת לשמש!";
  }

  // Default case - return original recommendation
  return recommendation;
}

/**
 * Formats travel restrictions information
 *
 * @param {Object} data - Travel restrictions data
 * @returns {string} - Formatted travel restrictions
 */
function formatTravelRestrictionsResponse(data) {
  const { restrictions, requestData } = data;

  if (!restrictions) {
    return `Sorry, I couldn't find travel restriction information for ${requestData.country}.`;
  }

  // Build the response
  let response = `Travel information for ${requestData.country}:\n\n`;

  if (restrictions.entry_requirements) {
    response += `Entry Requirements: ${restrictions.entry_requirements}\n\n`;
  }

  if (restrictions.visa_info) {
    response += `Visa Information: ${restrictions.visa_info}\n\n`;
  }

  if (restrictions.covid_restrictions) {
    response += `COVID-19 Restrictions: ${restrictions.covid_restrictions}\n\n`;
  }

  if (restrictions.travel_advisory) {
    response += `Travel Advisory: ${restrictions.travel_advisory}\n\n`;
  }

  return response;
}

/**
 * Formats safety information
 *
 * @param {Object} data - Safety data
 * @returns {string} - Formatted safety information
 */
function formatSafetyResponse(data) {
  const { safety, requestData } = data;

  if (!safety) {
    return `Sorry, I couldn't find safety information for ${formatLocation(
      requestData
    )}.`;
  }

  const location = formatLocation(requestData);

  let response = `Safety information for ${location}:\n\n`;

  if (safety.overall_rating) {
    response += `Overall Safety Rating: ${safety.overall_rating}/10\n\n`;
  }

  if (safety.advisories && safety.advisories.length > 0) {
    response += `Advisories:\n`;
    safety.advisories.forEach((advisory) => {
      response += `- ${advisory}\n`;
    });
    response += "\n";
  }

  if (safety.precautions && safety.precautions.length > 0) {
    response += `Recommended Precautions:\n`;
    safety.precautions.forEach((precaution) => {
      response += `- ${precaution}\n`;
    });
    response += "\n";
  }

  if (safety.emergency_numbers) {
    response += `Emergency Numbers: ${safety.emergency_numbers}\n\n`;
  }

  return response;
}

/**
 * Formats currency conversion information
 *
 * @param {Object} data - Currency data
 * @returns {string} - Formatted currency conversion
 */
function formatCurrencyResponse(data) {
  const { conversion, requestData } = data;

  if (!conversion) {
    return `Sorry, I couldn't find currency conversion information for ${requestData.from} to ${requestData.to}.`;
  }

  const amount = requestData.amount || 1;
  const fromCurrency = requestData.from.toUpperCase();
  const toCurrency = requestData.to.toUpperCase();

  let response = `${amount} ${fromCurrency} equals ${
    conversion.rate * amount
  } ${toCurrency}`;

  if (conversion.last_updated) {
    response += ` (as of ${conversion.last_updated})`;
  }

  if (conversion.trend) {
    response += `. The exchange rate has been ${conversion.trend} recently.`;
  }

  return response;
}

/**
 * Formats flight information
 *
 * @param {Object} data - Flight data
 * @returns {string} - Formatted flight information
 */
function formatFlightResponse(data) {
  const { flights, requestData } = data;

  if (!flights || flights.length === 0) {
    return `Sorry, I couldn't find flight information from ${
      requestData.origin
    } to ${requestData.destination} on ${formatDate(requestData.date)}.`;
  }

  let response = `Flight options from ${requestData.origin} to ${
    requestData.destination
  } on ${formatDate(requestData.date)}:\n\n`;

  flights.slice(0, 3).forEach((flight, index) => {
    response += `Option ${index + 1}: ${flight.airline} ${
      flight.flight_number
    }\n`;
    response += `Departure: ${flight.departure_time}, Arrival: ${flight.arrival_time}\n`;
    response += `Duration: ${flight.duration}, Price: ${flight.price}\n\n`;
  });

  if (flights.length > 3) {
    response += `... and ${flights.length - 3} more options.`;
  }

  return response;
}

/**
 * Formats attractions data
 *
 * @param {Object} data - Attractions data
 * @returns {string} - Formatted attractions information
 */
function formatAttractionsResponse(data) {
  const { attractions, requestData, location } = data;

  if (!attractions || attractions.length === 0) {
    return `Sorry, I couldn't find attraction information for ${formatLocation(
      requestData || { location: location }
    )}.`;
  }

  // Use the location from data or fallback to location in requestData
  const displayLocation = location || formatLocation(requestData);
  let response = `**Top attractions in ${displayLocation}:**\n\n`;

  // Show the top attractions with their details
  attractions.slice(0, 5).forEach((attraction, index) => {
    response += `**${index + 1}. ${attraction.name}** `;

    // Add rating if available
    if (attraction.rating) {
      response += `(${attraction.rating}★)`;
    }

    response += `\n`;

    // Add category if available
    if (attraction.category) {
      response += `**Category:** ${attraction.category}`;

      // Add price range if available
      if (attraction.price_range) {
        response += ` | **Price:** ${attraction.price_range}`;
      }

      response += `\n`;
    }

    // Add description if available
    if (attraction.description) {
      response += `${attraction.description.substring(0, 150)}${
        attraction.description.length > 150 ? "..." : ""
      }\n`;
    }

    // Add address if available
    if (attraction.address) {
      response += `**Location:** ${attraction.address}\n`;
    }

    response += `\n`;
  });

  // Add a note about more attractions if there are more than we displayed
  if (attractions.length > 5) {
    response += `*There are ${
      attractions.length - 5
    } more attractions available in this area.*\n\n`;
  }

  // Add a recommendation for planning
  response += `Would you like more specific information about any of these attractions, or would you like recommendations for a different type of attraction in ${displayLocation}?`;

  return response;
}

/**
 * Formats local events information
 *
 * @param {Object} data - Events data
 * @returns {string} - Formatted events information
 */
function formatEventsResponse(data) {
  const { events, requestData } = data;

  if (!events || events.length === 0) {
    return `Sorry, I couldn't find event information for ${formatLocation(
      requestData
    )}.`;
  }

  const dateInfo = requestData.date
    ? ` on ${formatDate(requestData.date)}`
    : " in the coming days";

  let response = `Events in ${formatLocation(requestData)}${dateInfo}:\n\n`;

  events.slice(0, 5).forEach((event, index) => {
    response += `${index + 1}. ${event.name}\n`;
    if (event.date) {
      response += `   Date: ${formatDate(event.date)}\n`;
    }
    if (event.venue) {
      response += `   Venue: ${event.venue}\n`;
    }
    if (event.category) {
      response += `   Category: ${event.category}\n`;
    }
    response += "\n";
  });

  return response;
}

/**
 * Formats cost estimate information
 *
 * @param {Object} data - Cost estimate data
 * @returns {string} - Formatted cost estimates
 */
function formatCostResponse(data) {
  const { costs, requestData } = data;

  if (!costs) {
    return `Sorry, I couldn't find cost information for ${formatLocation(
      requestData
    )}.`;
  }

  let response = `Cost estimates for ${formatLocation(requestData)}:\n\n`;

  if (costs.accommodation) {
    response += `Accommodation: ${costs.accommodation}\n`;
  }

  if (costs.food) {
    response += `Food: ${costs.food}\n`;
  }

  if (costs.transportation) {
    response += `Transportation: ${costs.transportation}\n`;
  }

  if (costs.activities) {
    response += `Activities: ${costs.activities}\n`;
  }

  if (costs.daily_budget) {
    response += `\nEstimated daily budget: ${costs.daily_budget}\n`;
  }

  return response;
}

/**
 * Formats travel tips into a user-friendly response
 *
 * @param {Object} data - Travel tips data
 * @returns {string} - Formatted tips response
 */
function formatTravelTipsResponse(data) {
  const { tips, requestData } = data;

  if (!tips || tips.length === 0) {
    return `Sorry, I couldn't find travel tips for ${formatLocation(
      requestData
    )}.`;
  }

  let response = `Travel tips for ${formatLocation(requestData)}:\n\n`;

  tips.forEach((tip, index) => {
    response += `${index + 1}. ${tip}\n`;
  });

  return response;
}

/**
 * Formats public transport information into a user-friendly response
 *
 * @param {Object} data - Transport data
 * @returns {string} - Formatted transport response
 */
function formatTransportResponse(data) {
  const { transport, requestData } = data;

  if (!transport) {
    return `Sorry, I couldn't find public transport information for ${formatLocation(
      requestData
    )}.`;
  }

  let response = `Public transport in ${formatLocation(requestData)}:\n\n`;

  if (transport.options && transport.options.length > 0) {
    response += `Available Options:\n`;
    transport.options.forEach((option) => {
      response += `- ${option.type}: ${option.description}\n`;
    });
    response += "\n";
  }

  if (transport.ticketing) {
    response += `Ticketing: ${transport.ticketing}\n\n`;
  }

  if (transport.tips && transport.tips.length > 0) {
    response += `Tips:\n`;
    transport.tips.forEach((tip) => {
      response += `- ${tip}\n`;
    });
    response += "\n";
  }

  return response;
}

/**
 * Formats a generic response for intents without specific formatters
 *
 * @param {string} intent - The intent
 * @param {Object} data - The data
 * @returns {string} - Formatted generic response
 */
function formatGenericResponse(intent, data) {
  // Extract request data and result
  const { requestData, result } = data;

  if (!result) {
    return `Sorry, I couldn't find information for your ${intent
      .replace("-", " ")
      .toLowerCase()} request.`;
  }

  // Create a title based on the intent
  const title = intent
    .replace("-", " ")
    .replace(/([A-Z])/g, " $1")
    .trim();

  // Start with a title
  let response = `${title} Information:\n\n`;

  // Add the main content if it's a string
  if (typeof result === "string") {
    response += result;
    return response;
  }

  // Otherwise, iterate through object properties
  Object.keys(result).forEach((key) => {
    const value = result[key];

    // Format the key for display
    const formattedKey = key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .trim()
      .replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );

    // Format arrays as bullet points
    if (Array.isArray(value)) {
      response += `${formattedKey}:\n`;
      value.forEach((item) => {
        response += `- ${
          typeof item === "string" ? item : JSON.stringify(item)
        }\n`;
      });
      response += "\n";
    }
    // Format objects recursively
    else if (typeof value === "object" && value !== null) {
      response += `${formattedKey}:\n`;
      Object.keys(value).forEach((subKey) => {
        const subKeyFormatted = subKey
          .replace(/([A-Z])/g, " $1")
          .replace(/_/g, " ")
          .trim()
          .replace(
            /\w\S*/g,
            (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
          );

        response += `  ${subKeyFormatted}: ${value[subKey]}\n`;
      });
      response += "\n";
    }
    // Format simple key-value pairs
    else {
      response += `${formattedKey}: ${value}\n`;
    }
  });

  return response;
}

/**
 * Helper function to format dates in a readable way
 *
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {string} - Formatted date
 */
function formatDate(dateStr) {
  if (!dateStr) return "";

  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch (error) {
    return dateStr;
  }
}

/**
 * Helper function to capitalize the first letter of a string
 *
 * @param {string} str - Input string
 * @returns {string} - String with first letter capitalized
 */
function capitalizeFirstLetter(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a hotel search response
 *
 * @param {Object} data - The raw hotel data
 * @returns {string} - Formatted hotel response
 */
const formatHotelResponse = (data) => {
  // Log received data for debugging
  console.log("Formatting hotel response with data:", data);

  // Handle simulated data notification
  const simulatedNote = data.simulated
    ? "\n\n*Note: This is demonstration data as the hotel service is currently in test mode.*"
    : "";

  // If no hotels found or hotels array doesn't exist
  if (!data.hotels || data.hotels.length === 0) {
    return `I couldn't find any hotels in ${
      data.location || data.requestData?.city || "the requested location"
    } matching your criteria. Would you like to try with different preferences?${simulatedNote}`;
  }

  // Start with a greeting and location
  let response = `Here are some recommended hotels in ${
    data.location || data.requestData?.city || "the requested location"
  }:\n\n`;

  // Add each hotel with details
  data.hotels.forEach((hotel, index) => {
    response += `**${index + 1}. ${hotel.name}** `;

    // Add rating
    if (hotel.rating) {
      const stars =
        "★".repeat(Math.floor(hotel.rating)) +
        (hotel.rating % 1 >= 0.5 ? "½" : "");
      response += `(${hotel.rating}/5 ${stars}) `;
    }

    // Add price range
    if (hotel.price_range) {
      response += `- ${hotel.price_range}\n`;
    } else {
      response += `\n`;
    }

    // Add location/address
    if (hotel.location) {
      response += `   Location: ${hotel.location}\n`;
    } else if (hotel.address) {
      response += `   Address: ${hotel.address}\n`;
    }

    // Add amenities if available
    if (hotel.amenities && hotel.amenities.length > 0) {
      response += `   Amenities: ${hotel.amenities.join(", ")}\n`;
    }

    // Add a newline between hotels except the last one
    if (index < data.hotels.length - 1) {
      response += `\n`;
    }
  });

  // Add a conclusion
  response += `\nWould you like more details about any of these hotels or assistance with booking?${simulatedNote}`;

  return response;
};

/**
 * Formats restaurant data
 *
 * @param {Object} data - Restaurant data
 * @returns {string} - Formatted restaurant information
 */
function formatRestaurantsResponse(data) {
  const { restaurants, requestData, location } = data;

  if (!restaurants || restaurants.length === 0) {
    return `Sorry, I couldn't find restaurant information for ${formatLocation(
      requestData || { location: location }
    )}.`;
  }

  // Use the location from data or fallback to location in requestData
  let displayLocation;

  if (location) {
    // If we have a direct location string, use it
    displayLocation = location;
  } else if (requestData) {
    // If we have request data, handle both location and city fields
    if (requestData.location) {
      displayLocation = formatLocation(requestData);
    } else if (requestData.city) {
      displayLocation = requestData.city;
    } else {
      displayLocation = "the requested location";
    }
  } else {
    displayLocation = "the requested location";
  }

  let response = `**Top restaurants in ${displayLocation}:**\n\n`;

  // Show the top restaurants with their details
  restaurants.slice(0, 5).forEach((restaurant, index) => {
    response += `**${index + 1}. ${restaurant.name}** `;

    // Add rating if available
    if (restaurant.rating) {
      response += `(${restaurant.rating}★)`;
    }

    response += `\n`;

    // Add price range if available
    if (restaurant.price_range) {
      response += `Price: ${restaurant.price_range}`;
    }

    // Add cuisine if available
    if (restaurant.cuisine) {
      if (restaurant.price_range) {
        response += ` • `;
      }
      response += `Cuisine: ${restaurant.cuisine}`;
    }

    response += `\n`;

    // Add location/address if available
    if (restaurant.address) {
      response += `Address: ${restaurant.address}\n`;
    }

    // Add description if available (mostly for simulated data)
    if (restaurant.description) {
      response += `${restaurant.description}\n`;
    }

    // Add opening hours if available
    if (restaurant.opening_hours) {
      response += `${restaurant.opening_hours}\n`;
    }

    // Add URL if available
    if (restaurant.url) {
      response += `[View on Google Maps](${restaurant.url})\n`;
    }

    response += `\n`;
  });

  // If there are more restaurants than we displayed
  if (restaurants.length > 5) {
    response += `... and ${restaurants.length - 5} more restaurants.`;
  }

  return response;
}
