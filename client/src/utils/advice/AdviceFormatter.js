/**
 * AdviceFormatter.js
 *
 * Formats raw responses from externalDataService into natural language.
 * Provides intent-specific formatting for various types of external data.
 */

import { EXTERNAL_DATA_INTENTS, ADVICE_INTENTS } from "./AdviceFieldSchemas";
import { formatLocation } from "../cityCountryMapper";

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
    case "Itinerary-Question":
      leadIn = ""; // No lead-in to keep it concise
      break;
    case "Day-Specific-Advice":
      leadIn = ""; // No lead-in to keep it concise
      break;
    default:
      leadIn = "";
  }

  // Check if this is a day-specific query
  const hasDayInfo = data.dayInfo || data.daySpecificInfo || data.specificDay;

  // Add a day-specific prefix if applicable
  let dayPrefix = "";
  if (hasDayInfo) {
    const dayInfo = data.dayInfo || data.daySpecificInfo || {};
    if (dayInfo.dayNumber) {
      if (dayInfo.dayNumber === "last") {
        dayPrefix = `ליום האחרון של הטיול - `;
      } else {
        dayPrefix = `ליום ${dayInfo.dayNumber} של הטיול - `;
      }
    }
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
    case "Itinerary-Question":
      formattedResponse = formatItineraryQuestionResponse(data);
      break;
    case "Day-Specific-Advice":
      formattedResponse = formatDaySpecificAdviceResponse(data);
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

  // Add the day prefix if necessary
  if (dayPrefix && formattedResponse) {
    formattedResponse = dayPrefix + formattedResponse;
  }

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

  // Check if this is a specific day from an itinerary
  let dayPrefix = "";
  let dateContext = "";

  // First check if the date is beyond the 5-day forecast limit
  if (data.beyondForecastLimit) {
    // Format date for display
    let dateStr = "";
    try {
      if (data.requestData && data.requestData.date) {
        const requestDate = new Date(data.requestData.date);
        dateStr = requestDate.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } else {
        dateStr = `${data.daysInFuture || "more than 5"} days from now`;
      }
    } catch (error) {
      console.error(
        "Error formatting date for beyond forecast limit message:",
        error
      );
      dateStr = "the requested future date";
    }

    // Include day information in the error message if available
    let dayInfo = "";
    if (data.requestData && data.requestData.dayInfo) {
      const dayNumber =
        data.requestData.dayInfo.dayNumber ||
        data.requestData.daySpecificInfo?.dayNumber;

      if (dayNumber) {
        if (dayNumber === "last") {
          dayInfo = " (the last day of your trip)";
        } else {
          dayInfo = ` (day ${dayNumber} of your trip)`;
        }
      }
    }

    return `I can only provide accurate weather forecasts for up to 5 days in the future. The date you requested${dayInfo} (${dateStr}) is ${
      data.daysInFuture || "more than 5"
    } days from now.\n\nFor more distant forecasts, I recommend checking a weather service website closer to your travel date for the most up-to-date information.`;
  }

  // Extract day-specific information if available
  if (data.dayInfo || data.daySpecificInfo) {
    const dayInfo = data.dayInfo || data.daySpecificInfo;

    if (dayInfo.dayNumber) {
      if (dayInfo.dayNumber === "last") {
        dayPrefix = `ליום האחרון של הטיול: `;
      } else {
        dayPrefix = `ליום ${dayInfo.dayNumber} של הטיול: `;
      }
    }

    // Add date context
    if (dayInfo.date) {
      try {
        // If we have explicit year information, make sure to use it
        let dayDate;
        if (dayInfo.year && typeof dayInfo.year === "number") {
          // If we have a date string like "2025-06-15" it will parse correctly
          // But for partial dates, we need to ensure the year is set
          dayDate = new Date(dayInfo.date);

          // Check if the parsed date has a different year
          if (dayDate.getFullYear() !== dayInfo.year) {
            console.log(
              `Date parsed with incorrect year (${dayDate.getFullYear()}), using explicit year ${
                dayInfo.year
              }`
            );
            // Try to extract month and day and create a new date with correct year
            const dateParts = dayInfo.date.split("-");
            if (dateParts.length >= 3) {
              // If we have YYYY-MM-DD format
              dayDate = new Date(
                dayInfo.year,
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[2])
              );
            } else {
              // Just set the year
              dayDate.setFullYear(dayInfo.year);
            }
          }
        } else {
          dayDate = new Date(dayInfo.date);
        }

        if (!isNaN(dayDate.getTime())) {
          const dateOptions = {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          };
          dateContext = ` (${dayDate.toLocaleDateString(
            undefined,
            dateOptions
          )})`;
          console.log(`Formatted date context with full date: ${dateContext}`);
        } else {
          dateContext = ` (${dayInfo.date})`;
          console.log(`Using original date string: ${dayInfo.date}`);
        }
      } catch (e) {
        console.warn("Error formatting day date:", e);
        dateContext = ` (${dayInfo.date})`;
      }
    }
  }
  // If no day info but we have specific date info
  else if (data.requestData && data.requestData.date) {
    try {
      let requestDate;

      // If we have explicit year information, make sure to use it
      if (data.requestData.year && typeof data.requestData.year === "number") {
        requestDate = new Date(data.requestData.date);

        // Check if the parsed date has a different year
        if (requestDate.getFullYear() !== data.requestData.year) {
          console.log(
            `Request date parsed with incorrect year (${requestDate.getFullYear()}), using explicit year ${
              data.requestData.year
            }`
          );

          // Try to extract month and day and create a new date with correct year
          const dateParts = data.requestData.date.split("-");
          if (dateParts.length >= 3) {
            // If we have YYYY-MM-DD format
            requestDate = new Date(
              data.requestData.year,
              parseInt(dateParts[1]) - 1,
              parseInt(dateParts[2])
            );
          } else {
            // Just set the year
            requestDate.setFullYear(data.requestData.year);
          }
        }
      } else {
        requestDate = new Date(data.requestData.date);
      }

      if (!isNaN(requestDate.getTime())) {
        dateContext = ` (${requestDate.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })})`;
        console.log(`Formatted request date context: ${dateContext}`);
      }
    } catch (e) {
      console.warn("Error formatting request date:", e);
    }
  }

  // Check for any type of weather data (current or forecasted)
  const hasForecast = data.forecast && Object.keys(data.forecast).length > 0;
  const hasForecasts = data.forecasts && data.forecasts.length > 0;

  if (!hasForecast && !hasForecasts) {
    console.warn("Weather data is missing both forecast and forecasts:", data);
    return `Sorry, I couldn't find detailed weather information for ${formatLocation(
      data.requestData || { location: data.location, country: data.country }
    )}${dateContext}.`;
  }

  // Start building the response with location and date information
  let locationDisplay = "";
  try {
    const locationData = {
      city:
        data.city ||
        data.location ||
        data.requestData?.city ||
        data.requestData?.location,
      country:
        data.country || data.returnedCountry || data.requestData?.country,
    };

    locationDisplay = formatLocation(locationData);
  } catch (e) {
    locationDisplay = data.location || "the requested location";
  }

  // Build the response heading
  let responseText = `${dayPrefix}מזג האוויר ב${locationDisplay}${dateContext}:\n\n`;

  if (hasForecast) {
    // Format current or daily forecast
    const forecast = data.forecast;
    responseText += `🌡️ **טמפרטורה**: ${forecast.temperature.current}°C (מרגיש כמו ${forecast.temperature.feels_like}°C)\n`;

    // Add temperature range if available
    if (
      forecast.temperature.min !== undefined &&
      forecast.temperature.max !== undefined
    ) {
      responseText += `📊 **טווח טמפרטורות**: ${forecast.temperature.min}°C עד ${forecast.temperature.max}°C\n`;
    }

    // Add conditions with emoji
    const weatherEmoji = getWeatherEmoji(forecast.conditions);
    responseText += `${weatherEmoji} **מצב**: ${translateWeatherCondition(
      forecast.description,
      "he"
    )} (${forecast.description})\n`;

    // Add humidity and pressure
    responseText += `💧 **לחות**: ${forecast.humidity}%\n`;

    // Add wind info
    if (forecast.wind && forecast.wind.speed) {
      const windDirection = forecast.wind.direction
        ? ` מכיוון ${forecast.wind.direction}`
        : "";
      responseText += `💨 **רוח**: ${forecast.wind.speed} מ'/שנייה${windDirection}\n`;
    }

    // Add precipitation if available
    if (forecast.precipitation && forecast.precipitation.amount > 0) {
      responseText += `☔ **משקעים**: ${forecast.precipitation.amount} מ"מ\n`;
    } else if (forecast.precipitation && forecast.precipitation.chance > 0) {
      responseText += `☔ **סיכוי לגשם**: ${forecast.precipitation.chance}%\n`;
    }

    // Add sunrise/sunset if available
    if (forecast.sunrise && forecast.sunset) {
      const sunriseTime = new Date(forecast.sunrise * 1000).toLocaleTimeString(
        [],
        { hour: "2-digit", minute: "2-digit" }
      );
      const sunsetTime = new Date(forecast.sunset * 1000).toLocaleTimeString(
        [],
        { hour: "2-digit", minute: "2-digit" }
      );
      responseText += `🌅 **זריחה**: ${sunriseTime}\n`;
      responseText += `🌇 **שקיעה**: ${sunsetTime}\n`;
    }

    // Add summary if available
    if (forecast.summary) {
      responseText += `\n${forecast.summary}\n`;
    }
  } else if (hasForecasts) {
    // Handle detailed forecast intervals
    responseText += "תחזית לשעות היום:\n\n";

    data.forecasts.forEach((forecast, index) => {
      // Format the time for display
      const forecastTime = new Date(forecast.time);
      const timeStr = forecastTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Add a header for each forecast interval
      responseText += `⏰ **${timeStr}**:\n`;

      // Add temperature
      responseText += `🌡️ ${forecast.temperature.current}°C (מרגיש כמו ${forecast.temperature.feels_like}°C)\n`;

      // Add conditions with emoji
      const weatherEmoji = getWeatherEmoji(forecast.conditions);
      responseText += `${weatherEmoji} ${translateWeatherCondition(
        forecast.description,
        "he"
      )} (${forecast.description})\n`;

      // Add precipitation chance if available
      if (
        forecast.precipitation &&
        forecast.precipitation.chance !== undefined
      ) {
        responseText += `☔ סיכוי לגשם: ${forecast.precipitation.chance}%\n`;
      }

      // Add wind info
      if (forecast.wind && forecast.wind.speed) {
        responseText += `💨 רוח: ${forecast.wind.speed} מ'/שנייה\n`;
      }

      // Add separator between forecast intervals
      if (index < data.forecasts.length - 1) {
        responseText += "\n";
      }
    });
  }

  // If this is for a specific day in an itinerary, add relevant activities info
  if (data.dayInfo || data.daySpecificInfo) {
    const dayInfo = data.dayInfo || data.daySpecificInfo;

    // Check if we have activity information for the day
    if (dayInfo.activities) {
      responseText += "\n\n**תכנון היום שלך:**\n";

      // Add planned activities with weather relevance
      const activities = dayInfo.activities;
      const isRainy =
        data.forecast?.conditions?.toLowerCase().includes("rain") ||
        data.forecast?.description?.toLowerCase().includes("rain");

      // Morning activities
      if (activities.morning && activities.morning.length > 0) {
        responseText += "🌅 **בבוקר**: ";
        if (isRainy && isOutdoorActivity(activities.morning.join(" "))) {
          responseText +=
            "שים לב שמתוכנן גשם - כדאי להכין מטריה או לשקול פעילות פנימית. ";
        }
        responseText += activities.morning.join(", ").substring(0, 100) + "\n";
      }

      // Afternoon activities
      if (activities.afternoon && activities.afternoon.length > 0) {
        responseText += "☀️ **אחר הצהריים**: ";
        if (isRainy && isOutdoorActivity(activities.afternoon.join(" "))) {
          responseText +=
            "שים לב שמתוכנן גשם - כדאי להכין מטריה או לשקול פעילות פנימית. ";
        }
        responseText +=
          activities.afternoon.join(", ").substring(0, 100) + "\n";
      }
    }
  }

  // Add weather-specific recommendations
  responseText += "\n**המלצות לפי מזג האוויר:**\n";

  // Get conditions for recommendations
  const conditions = data.forecast?.conditions?.toLowerCase() || "";
  const temp = data.forecast?.temperature?.current || 20;

  if (conditions.includes("rain") || conditions.includes("shower")) {
    responseText += "🌂 כדאי לקחת מטריה או מעיל גשם\n";
  }

  if (temp > 28) {
    responseText += "🧴 מומלץ להשתמש בקרם הגנה ולשתות הרבה מים\n";
  } else if (temp < 12) {
    responseText += "🧣 מומלץ ללבוש שכבות חמות\n";
  }

  if (conditions.includes("cloud") && !conditions.includes("rain")) {
    responseText += "☁️ יום מעונן אבל לא גשום - מתאים לטיולים בחוץ\n";
  } else if (conditions.includes("clear") || conditions.includes("sun")) {
    responseText += "😎 יום שמשי מצוין לפעילויות בחוץ\n";
  }

  return responseText;
}

// Helper function to determine if activities are likely outdoors
function isOutdoorActivity(activityText) {
  const outdoorKeywords = [
    "פארק",
    "גן",
    "סיור",
    "טיול",
    "הליכה",
    "חוץ",
    "park",
    "garden",
    "tour",
    "walk",
    "outside",
    "outdoor",
  ];
  return outdoorKeywords.some((keyword) =>
    activityText.toLowerCase().includes(keyword)
  );
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
  if (!data || !data.success) {
    return formatErrorResponse("Find-Attractions", data);
  }

  // Start building the formatted response
  const location = data.location || "the requested location";

  // Extract applied filters for display
  const appliedFilters = [];

  // Check if category filter was applied
  if (data.category) {
    appliedFilters.push(data.category);
  }

  // Check if activity type filter was applied
  if (data.activity_type) {
    appliedFilters.push(data.activity_type);
  }

  // Check if duration filter was applied
  if (data.duration) {
    appliedFilters.push(`${data.duration}-hour`);
  }

  // Check if budget level filter was applied
  if (data.budget_level) {
    let budgetText = "";
    switch (data.budget_level.toLowerCase()) {
      case "cheap":
      case "budget":
        budgetText = "budget-friendly";
        break;
      case "moderate":
        budgetText = "moderately priced";
        break;
      case "luxury":
      case "expensive":
        budgetText = "premium";
        break;
      default:
        budgetText = data.budget_level;
    }
    appliedFilters.push(budgetText);
  }

  // Check if rating filter was applied
  if (data.rating) {
    appliedFilters.push(`${data.rating}+ star rated`);
  }

  // Create title with filters
  let titlePrefix =
    appliedFilters.length > 0
      ? `Here are some ${appliedFilters.join(", ")} attractions in `
      : `Here are top attractions in `;

  // Format response header
  let responseHeader = `${titlePrefix}${location}:`;

  // Format attractions list with enhanced details
  const attractionsList = data.attractions
    .map((attraction, index) => {
      // Format rating with stars
      const formattedRating =
        attraction.rating > 0
          ? `${attraction.rating}/5 ${"★".repeat(
              Math.floor(attraction.rating)
            )}${attraction.rating % 1 >= 0.5 ? "½" : ""}`
          : "Rating not available";

      // Format category if available
      const categoryStr = attraction.category
        ? `Category: ${attraction.category}`
        : "";

      // Format price range info
      const priceStr = attraction.price_range
        ? `Price: ${attraction.price_range}`
        : "";

      // Format description with proper truncation
      let descStr = "";
      if (attraction.description) {
        // Truncate long descriptions
        descStr =
          attraction.description.length > 150
            ? `Description: ${attraction.description.substring(0, 147)}...`
            : `Description: ${attraction.description}`;
      }

      // Return formatted attraction entry
      return `**${index + 1}. ${attraction.name}** (${formattedRating})
   ${categoryStr}${categoryStr && priceStr ? "\n   " : ""}${priceStr}${
        descStr ? "\n   " + descStr : ""
      }`;
    })
    .join("\n\n");

  // Add a helpful follow-up question
  const followupQuestion =
    "Would you like more details about any specific attraction or recommendations for planning your visit?";

  // Return the complete formatted response
  return `${responseHeader}\n\n${attractionsList}\n\n${followupQuestion}`;
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
  if (!data || !data.success) {
    return formatErrorResponse("Find-Hotel", data);
  }

  // Get location from data or fallback
  const location = data.location || "the requested location";

  // Extract applied filters for display
  const appliedFilters = [];

  // Check if budget level filter was applied
  if (data.budget_level) {
    let budgetText = "";
    switch (data.budget_level.toLowerCase()) {
      case "cheap":
      case "budget":
        budgetText = "budget-friendly";
        break;
      case "moderate":
        budgetText = "moderately priced";
        break;
      case "luxury":
      case "expensive":
        budgetText = "luxury";
        break;
      default:
        budgetText = data.budget_level;
    }
    appliedFilters.push(budgetText);
  }

  // Check if hotel type filter was applied
  if (data.hotel_type) {
    appliedFilters.push(data.hotel_type);
  }

  // Check if amenities filter was applied
  if (data.amenities && data.amenities.length > 0) {
    const amenitiesText =
      data.amenities.length === 1
        ? `with ${data.amenities[0]}`
        : `with amenities like ${data.amenities.slice(0, -1).join(", ")} and ${
            data.amenities[data.amenities.length - 1]
          }`;
    appliedFilters.push(amenitiesText);
  }

  // Check if rating filter was applied
  if (data.rating) {
    appliedFilters.push(`${data.rating}+ star rated`);
  }

  // Create title with filters
  let titlePrefix =
    appliedFilters.length > 0
      ? `Here are some ${appliedFilters.join(", ")} hotels in `
      : `Here are some recommended hotels in `;

  const messageStart = `${titlePrefix}${location}:`;

  // Format each hotel
  const hotelList = data.hotels
    .map((hotel, index) => {
      // Format star rating with emojis
      const stars =
        "★".repeat(Math.floor(hotel.rating)) +
        (hotel.rating % 1 >= 0.5 ? "½" : "");
      const formattedRating = `${hotel.rating}/5 ${stars}`;

      // Format price range using consistent symbols
      let priceSymbol = hotel.price_range;
      if (!priceSymbol.includes("$")) {
        // Convert text description to $ symbols
        if (hotel.price_range.toLowerCase().includes("budget")) {
          priceSymbol = "$";
        } else if (hotel.price_range.toLowerCase().includes("luxury")) {
          priceSymbol = "$$$$";
        } else if (hotel.price_range.toLowerCase().includes("moderate")) {
          priceSymbol = "$$";
        } else {
          priceSymbol = "$$";
        }
      }

      // Format amenities if available
      const amenitiesText =
        hotel.amenities && hotel.amenities.length > 0
          ? `Amenities: ${hotel.amenities.join(", ")}`
          : "";

      return `**${index + 1}. ${
        hotel.name
      }** (${formattedRating}) - ${priceSymbol}
   Location: ${hotel.location}
   ${amenitiesText}`;
    })
    .join("\n\n");

  // Create a complete response with a follow-up question
  return `${messageStart}\n\n${hotelList}\n\nWould you like more details about any of these hotels or assistance with booking?`;
};

/**
 * Formats restaurant data
 *
 * @param {Object} data - Restaurant data
 * @returns {string} - Formatted restaurant information
 */
function formatRestaurantsResponse(data) {
  if (!data || !data.success) {
    return formatErrorResponse("Find-Restaurants", data);
  }

  // Get location from data or fallback
  const location = data.location || "your requested location";

  // Extract applied filters for display
  const appliedFilters = [];

  // Check if budget level filter was applied
  if (data.budget_level) {
    let budgetText = "";
    switch (data.budget_level.toLowerCase()) {
      case "cheap":
      case "budget":
        budgetText = "budget-friendly";
        break;
      case "moderate":
        budgetText = "moderately priced";
        break;
      case "luxury":
      case "expensive":
        budgetText = "upscale";
        break;
      default:
        budgetText = data.budget_level;
    }
    appliedFilters.push(budgetText);
  }

  // Check if cuisine filter was applied
  if (data.cuisine) {
    appliedFilters.push(data.cuisine);
  }

  // Check if dietary restriction filter was applied
  if (data.dietary_restrictions) {
    appliedFilters.push(data.dietary_restrictions);
  }

  // Check if meal type filter was applied
  if (data.meal_type) {
    appliedFilters.push(`${data.meal_type}`);
  }

  // Check if rating filter was applied
  if (data.rating) {
    appliedFilters.push(`${data.rating}+ star rated`);
  }

  // Create title with filters
  let titlePrefix =
    appliedFilters.length > 0
      ? `Here are some ${appliedFilters.join(", ")} restaurants in `
      : `Here are some top restaurants in `;

  // Format restaurant list header
  const header = `${titlePrefix}${location}:`;

  // Format each restaurant entry
  const restaurantsList = data.restaurants
    .map((restaurant, index) => {
      const formattedRating =
        restaurant.rating > 0
          ? `${restaurant.rating}/5 ${"★".repeat(
              Math.floor(restaurant.rating)
            )}${restaurant.rating % 1 >= 0.5 ? "½" : ""}`
          : "Rating not available";

      // Format cuisine information
      const cuisineInfo = restaurant.cuisine
        ? `Cuisine: ${restaurant.cuisine}`
        : "";

      // Format price indicators consistently
      const priceInfo = restaurant.price_range
        ? `Price: ${restaurant.price_range}`
        : "";

      // Format address if available
      const addressInfo = restaurant.address
        ? `Address: ${restaurant.address}`
        : "";

      // Format opening hours if available
      const hoursInfo = restaurant.opening_hours
        ? `${restaurant.opening_hours}`
        : "";

      return `**${index + 1}. ${restaurant.name}** (${formattedRating})
   ${cuisineInfo}${cuisineInfo ? "\n   " : ""}${priceInfo}${
        addressInfo ? "\n   " + addressInfo : ""
      }${hoursInfo ? "\n   " + hoursInfo : ""}`;
    })
    .join("\n\n");

  // Format the complete response with a follow-up question
  return `${header}\n\n${restaurantsList}\n\nWould you like more details about any of these restaurants or help with reservations?`;
}

/**
 * Format a response for a general itinerary question
 * @param {Object} data - Response data
 * @returns {string} - Formatted response
 */
function formatItineraryQuestionResponse(data) {
  if (!data || !data.success) {
    return formatErrorResponse("Itinerary-Question", data);
  }

  // אם יש מידע ספציפי על יום ביומן, נשתמש בו
  if (data.dayInfo || data.dayContext) {
    const dayInfo = data.dayInfo || {};
    const dayContext = data.dayContext || "";

    let response = "";

    if (dayInfo.dayNumber) {
      const dayNum =
        typeof dayInfo.dayNumber === "number"
          ? dayInfo.dayNumber
          : dayInfo.dayNumber === "last"
          ? "האחרון"
          : dayInfo.dayNumber;

      response += `${dayContext || `מידע על יום ${dayNum}`}:\n\n`;
    }

    // אם יש מידע על פעילויות היום
    if (dayInfo.activities) {
      const activities = dayInfo.activities;

      if (activities.morning && activities.morning.length > 0) {
        response += `בבוקר: ${activities.morning.join(", ")}\n`;
      }

      if (activities.lunch && activities.lunch.length > 0) {
        response += `צהריים: ${activities.lunch.join(", ")}\n`;
      }

      if (activities.afternoon && activities.afternoon.length > 0) {
        response += `אחה"צ: ${activities.afternoon.join(", ")}\n`;
      }

      if (activities.dinner && activities.dinner.length > 0) {
        response += `ערב: ${activities.dinner.join(", ")}\n`;
      }
    }

    return (
      response ||
      data.message ||
      "אין מידע ספציפי זמין על היום המבוקש ביומן המסע."
    );
  }

  // אם אין מידע ספציפי, החזר את ההודעה כפי שהיא
  return data.message || "לא מצאתי מידע ספציפי על יומן המסע שלך.";
}

/**
 * Format a response for day-specific advice
 * @param {Object} data - Response data
 * @returns {string} - Formatted response
 */
function formatDaySpecificAdviceResponse(data) {
  if (!data || !data.success) {
    return formatErrorResponse("Day-Specific-Advice", data);
  }

  // מזהה את סוג השאלה לפי המידע שהתקבל
  const adviceType = data.adviceType || data.intent;

  // בדיקה אם יש מידע על יום ספציפי
  const dayInfo = data.dayInfo || data.daySpecificInfo;
  const hasDayContext = dayInfo && (dayInfo.dayNumber || dayInfo.date);

  let dayPrefix = "";
  if (hasDayContext) {
    if (dayInfo.dayNumber === "last") {
      dayPrefix = `ליום האחרון של הטיול`;
    } else if (typeof dayInfo.dayNumber === "number") {
      dayPrefix = `ליום ${dayInfo.dayNumber} של הטיול`;
    } else if (dayInfo.date) {
      dayPrefix = `לתאריך ${dayInfo.date}`;
    }

    // הוספת מיקום אם קיים
    if (dayInfo.location) {
      dayPrefix += ` ב${dayInfo.location}`;
    }

    dayPrefix += " - ";
  }

  // על פי סוג השאלה, נפנה לפונקציית הפורמוט המתאימה ונוסיף את תחילית היום
  switch (adviceType) {
    case "Weather-Request":
      return dayPrefix + formatWeatherResponse(data);
    case "Find-Hotel":
      return dayPrefix + formatHotelResponse(data);
    case "Find-Attractions":
      return dayPrefix + formatAttractionsResponse(data);
    case "Find-Restaurants":
      return dayPrefix + formatRestaurantsResponse(data);
    default:
      // אם אין פונקציית פורמוט ספציפית, החזר את ההודעה כפי שהיא
      return (
        dayPrefix +
        (data.message || "המידע המבוקש אינו זמין עבור היום הספציפי.")
      );
  }
}
