/**
 * Base API client with retry logic, error handling, and consistent response structure
 * All service modules will extend this base client
 */

/**
 * Makes an API request with retry capability and standardized error handling
 * @param {string} url - The API endpoint to call
 * @param {Object} options - Request options (method, headers, body, etc.)
 * @param {Object} retryConfig - Configuration for retry behavior
 * @returns {Promise<Object>} - Standardized response object
 */
export const fetchWithRetry = async (
  url,
  options = {},
  retryConfig = {
    maxRetries: 3,
    initialDelay: 500, // ms
    backoffFactor: 2,
  }
) => {
  const { maxRetries, initialDelay, backoffFactor } = retryConfig;
  let lastError = null;
  let currentDelay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add default headers if not provided
      const requestOptions = {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      };

      const response = await fetch(url, requestOptions);

      // Handle HTTP errors
      if (!response.ok) {
        throw new Error(
          `HTTP error ${response.status}: ${response.statusText}`
        );
      }

      // Parse JSON response
      const data = await response.json();

      // Return standardized success response
      return {
        success: true,
        data,
        error: null,
        simulated: false,
      };
    } catch (error) {
      lastError = error;
      console.error(
        `API request failed (attempt ${attempt + 1}/${maxRetries + 1}):`,
        error
      );

      // If we've reached max retries, break out
      if (attempt >= maxRetries) {
        break;
      }

      // Wait with exponential backoff before retrying
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoffFactor;
    }
  }

  // Return standardized error response
  return {
    success: false,
    data: null,
    error: lastError.message || "API request failed after multiple attempts",
    simulated: false,
  };
};

/**
 * Creates a user-facing error message based on the error type
 * @param {string} intent - The intent that triggered the API call
 * @param {Error|string} error - The error that occurred
 * @returns {string} - User-facing error message
 */
export const createUserErrorMessage = (intent, error) => {
  const defaultMessage =
    "I couldn't retrieve the requested information right now. Would you like to try again or continue without it?";

  const errorMessages = {
    "Weather-Request": "I couldn't retrieve the current weather information.",
    "Find-Hotel": "I wasn't able to find hotel recommendations at this time.",
    "Find-Attractions":
      "I couldn't fetch attraction details for this destination.",
    "Flight-Information":
      "I couldn't retrieve the flight information you requested.",
    "Local-Events":
      "I couldn't find information about local events at this time.",
    "Travel-Restrictions":
      "I couldn't retrieve current travel restrictions or safety information.",
    "Currency-Conversion":
      "I couldn't fetch the latest currency exchange rates.",
    "Cost-Estimate":
      "I wasn't able to calculate accurate cost estimates at this time.",
  };

  return errorMessages[intent] || defaultMessage;
};

/**
 * Generates simulated data for when API calls fail
 * @param {string} intent - The intent that triggered the API call
 * @param {Object} params - Parameters that were used in the original request
 * @returns {Object} - Simulated data with appropriate structure
 */
export const generateSimulatedData = (intent, params = {}) => {
  const simulationData = {
    "Weather-Request": () => ({
      location: params.location || "the requested location",
      date: params.date || new Date().toISOString().split("T")[0],
      displayDate: "today",
      simulated: true,
      forecast: {
        temperature: {
          current: Math.floor(Math.random() * 10) + 20,
          min: Math.floor(Math.random() * 10) + 15,
          max: Math.floor(Math.random() * 10) + 25,
        },
        conditions: ["Sunny", "Partly Cloudy", "Rainy", "Cloudy"][
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
    }),
    "Flight-Information": () => ({
      origin: params.origin || "origin city",
      destination: params.destination || "destination city",
      date: params.date || "today",
      simulated: true,
      flights: [
        {
          airline: "Sample Airline",
          flightNumber: `SA${Math.floor(Math.random() * 1000)}`,
          departureTime: "09:00",
          arrivalTime: "11:30",
          duration: "2h 30m",
          price: `$${Math.floor(Math.random() * 300) + 200}`,
          stops: 0,
        },
        {
          airline: "Example Air",
          flightNumber: `EA${Math.floor(Math.random() * 1000)}`,
          departureTime: "13:45",
          arrivalTime: "16:30",
          duration: "2h 45m",
          price: `$${Math.floor(Math.random() * 300) + 200}`,
          stops: 1,
        },
      ],
    }),
    "Local-Events": () => ({
      location: params.location || "the requested location",
      date: params.date || "upcoming",
      simulated: true,
      events: [
        {
          name: "Local Music Festival",
          type: "Music",
          date: "This weekend",
          venue: "Central Park",
          price: "From $25",
        },
        {
          name: "Food & Wine Expo",
          type: "Food",
          date: "Next week",
          venue: "Convention Center",
          price: "$15",
        },
        {
          name: "Cultural Exhibition",
          type: "Art",
          date: "All month",
          venue: "City Museum",
          price: "Free",
        },
      ],
    }),
    "Travel-Restrictions": () => ({
      country: params.country || params.location || "the requested destination",
      simulated: true,
      restrictions: {
        entryRequirements:
          "Valid passport required. No visa needed for stays under 90 days for many nationalities.",
        covidRequirements:
          "No testing or vaccination requirements currently in place.",
        safetyAdvisory: "Exercise normal precautions.",
        localRestrictions: "No significant restrictions for tourists.",
      },
    }),
    "Currency-Conversion": () => {
      const baseRate = 0.75 + Math.random() * 0.5;
      return {
        from: params.from || "USD",
        to: params.to || "EUR",
        simulated: true,
        rate: baseRate.toFixed(4),
        lastUpdated: "Today",
        conversion: {
          amount: params.amount || 100,
          converted: ((params.amount || 100) * baseRate).toFixed(2),
        },
      };
    },
  };

  // Get the simulation function or a default one if not found
  const simulationFn =
    simulationData[intent] ||
    (() => ({ simulated: true, note: "This is simulated data" }));

  return {
    success: true,
    ...simulationFn(),
    error: null,
    simulated: true,
  };
};
