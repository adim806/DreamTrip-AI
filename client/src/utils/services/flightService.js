/**
 * Flight information service module
 * Handles API requests for flight information, schedules, and status
 */
import {
  fetchWithRetry,
  generateSimulatedData,
  createUserErrorMessage,
} from "./apiClient";

/**
 * Fetches flight information between two locations on a specific date
 * @param {Object} params - Flight search parameters
 * @param {string} params.origin - Departure city/airport
 * @param {string} params.destination - Arrival city/airport
 * @param {string} params.date - Flight date (YYYY-MM-DD)
 * @param {string} params.returnDate - Return flight date for round trips (optional)
 * @param {number} params.passengers - Number of passengers
 * @returns {Promise<Object>} - Flight search results
 */
export const fetchFlightInformation = async (params) => {
  try {
    // Validate required parameters
    if (!params.origin || !params.destination) {
      throw new Error("Origin and destination are required for flight search");
    }

    console.log("Fetching flight information:", params);

    // NOTE: In a production environment, you would use a real flight API like Amadeus, Skyscanner, or Kiwi
    // For demonstration, we'll simulate the API response

    // Uncomment this to use a real API when available
    /*
    const API_KEY = import.meta.env.VITE_FLIGHT_API_KEY;
    const url = `https://api.flightservice.example/search?apiKey=${API_KEY}`;
    
    const response = await fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    
    if (!response.success) {
      throw new Error(response.error || "Failed to fetch flight information");
    }
    
    return {
      success: true,
      ...response.data,
    };
    */

    // For demo purposes, create a simulated delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate sample flight data based on the provided parameters
    return {
      success: true,
      origin: params.origin,
      destination: params.destination,
      date: params.date || new Date().toISOString().split("T")[0],
      returnDate: params.returnDate,
      flights: [
        {
          airline: "SkyWings Airlines",
          flightNumber: "SW" + Math.floor(Math.random() * 1000),
          departureTime: "08:30",
          arrivalTime: "10:45",
          duration: "2h 15m",
          price: `$${Math.floor(Math.random() * 200) + 150}`,
          stops: 0,
          aircraft: "Boeing 737",
          cabinClass: "Economy",
        },
        {
          airline: "Global Airways",
          flightNumber: "GA" + Math.floor(Math.random() * 1000),
          departureTime: "12:15",
          arrivalTime: "14:50",
          duration: "2h 35m",
          price: `$${Math.floor(Math.random() * 150) + 200}`,
          stops: 1,
          aircraft: "Airbus A320",
          cabinClass: "Economy",
          stopLocation: "Transfer City",
        },
        {
          airline: "Trans Continental",
          flightNumber: "TC" + Math.floor(Math.random() * 1000),
          departureTime: "16:40",
          arrivalTime: "19:05",
          duration: "2h 25m",
          price: `$${Math.floor(Math.random() * 250) + 180}`,
          stops: 0,
          aircraft: "Boeing 787",
          cabinClass: "Economy",
        },
      ],
    };
  } catch (error) {
    console.error("Error fetching flight information:", error);

    // Generate helpful error message
    const errorMessage = createUserErrorMessage("Flight-Information", error);

    // Return simulated data with a flag indicating it's not real
    return generateSimulatedData("Flight-Information", params);
  }
};

/**
 * Fetches real-time status for a specific flight
 * @param {Object} params - Flight details
 * @param {string} params.airline - Airline code or name
 * @param {string} params.flightNumber - Flight number
 * @param {string} params.date - Flight date (optional, defaults to today)
 * @returns {Promise<Object>} - Current flight status
 */
export const fetchFlightStatus = async (params) => {
  try {
    // Validate required parameters
    if (!params.airline || !params.flightNumber) {
      throw new Error("Airline and flight number are required");
    }

    console.log("Fetching flight status:", params);

    // For demo purposes, create a simulated delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Generate sample flight status data
    const statuses = [
      "On Time",
      "Delayed",
      "Boarding",
      "In Air",
      "Landed",
      "Cancelled",
    ];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    let statusDetails = {};
    switch (randomStatus) {
      case "Delayed":
        statusDetails = {
          newDepartureTime: "10:45",
          delayReason: "Weather conditions",
          delayDuration: "45 minutes",
        };
        break;
      case "Boarding":
        statusDetails = {
          gate: "B12",
          boardingStarted: "09:15",
          boardingEnds: "09:45",
        };
        break;
      case "In Air":
        statusDetails = {
          departedAt: "09:30",
          estimatedArrival: "11:45",
          currentLocation: "In air over destination approach",
        };
        break;
      case "Landed":
        statusDetails = {
          landedAt: "11:30",
          terminal: "Terminal 2",
          baggageClaim: "Belt 5",
        };
        break;
      case "Cancelled":
        statusDetails = {
          cancellationReason: "Operational issues",
          rebookOptions: "Contact airline customer service",
        };
        break;
      default: // On Time
        statusDetails = {
          gate: "A22",
          scheduledDeparture: "10:00",
          scheduledArrival: "12:15",
        };
    }

    return {
      success: true,
      airline: params.airline,
      flightNumber: params.flightNumber,
      date: params.date || new Date().toISOString().split("T")[0],
      status: randomStatus,
      ...statusDetails,
    };
  } catch (error) {
    console.error("Error fetching flight status:", error);

    // Generate fallback data
    return {
      success: true,
      simulated: true,
      airline: params.airline,
      flightNumber: params.flightNumber,
      date: params.date || new Date().toISOString().split("T")[0],
      status: "Unknown",
      message: "Flight status information is currently unavailable.",
    };
  }
};
