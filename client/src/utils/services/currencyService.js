/**
 * Currency Service Module
 * Handles API requests for currency conversion, exchange rates, and cost estimates
 */
import {
  fetchWithRetry,
  generateSimulatedData,
  createUserErrorMessage,
} from "./apiClient";

/**
 * Fetches currency conversion rates between two currencies
 * @param {Object} params - Conversion parameters
 * @param {string} params.from - Source currency code (e.g., USD)
 * @param {string} params.to - Target currency code (e.g., EUR)
 * @param {number} params.amount - Amount to convert (optional, defaults to 1)
 * @returns {Promise<Object>} - Currency conversion data
 */
export const fetchCurrencyConversion = async (params) => {
  try {
    // Validate required parameters
    if (!params.from || !params.to) {
      throw new Error("Source and target currencies are required");
    }

    // Normalize currency codes
    const fromCurrency = params.from.toUpperCase().trim();
    const toCurrency = params.to.toUpperCase().trim();
    const amount = params.amount || 1;

    console.log(
      `Fetching currency conversion from ${fromCurrency} to ${toCurrency} for amount ${amount}`
    );

    // In a production environment, you would use a real currency API like Open Exchange Rates, Fixer.io, or ExchangeRate-API
    // For demonstration, we'll simulate the API response

    // Uncomment this to use a real API when available
    /*
    const API_KEY = import.meta.env.VITE_CURRENCY_API_KEY;
    const url = `https://api.currencyservice.example/convert?apiKey=${API_KEY}&from=${fromCurrency}&to=${toCurrency}&amount=${amount}`;
    
    const response = await fetchWithRetry(url);
    
    if (!response.success) {
      throw new Error(response.error || "Failed to fetch currency conversion");
    }
    
    return {
      success: true,
      ...response.data,
    };
    */

    // For demo purposes, create a simulated delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Sample exchange rates against USD (simplified)
    const ratesAgainstUSD = {
      USD: 1.0,
      EUR: 0.93,
      GBP: 0.79,
      JPY: 149.56,
      CAD: 1.38,
      AUD: 1.55,
      CHF: 0.89,
      CNY: 7.24,
      HKD: 7.8,
      NZD: 1.67,
      SEK: 10.49,
      NOK: 10.76,
      MXN: 18.25,
      SGD: 1.35,
      THB: 35.56,
      ILS: 3.68,
      RUB: 91.75,
      ZAR: 18.16,
      INR: 83.28,
      BRL: 5.05,
    };

    // Calculate exchange rate and conversion
    let rate;

    if (fromCurrency === "USD") {
      rate = ratesAgainstUSD[toCurrency] || 1.0;
    } else if (toCurrency === "USD") {
      rate = 1 / (ratesAgainstUSD[fromCurrency] || 1.0);
    } else {
      // For cross-rates, convert via USD
      const fromToUSD = 1 / (ratesAgainstUSD[fromCurrency] || 1.0);
      const usdToTarget = ratesAgainstUSD[toCurrency] || 1.0;
      rate = fromToUSD * usdToTarget;
    }

    // Apply a small random variation to simulate real-time market changes
    const variation = 1 + (Math.random() * 0.02 - 0.01); // ±1% variation
    rate *= variation;

    const convertedAmount = amount * rate;

    return {
      success: true,
      from: fromCurrency,
      to: toCurrency,
      rate: rate.toFixed(6),
      amount: amount,
      converted: convertedAmount.toFixed(2),
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching currency conversion:", error);

    // Generate helpful error message
    const errorMessage = createUserErrorMessage("Currency-Conversion", error);

    // Return simulated data with a flag indicating it's not real
    return generateSimulatedData("Currency-Conversion", params);
  }
};

/**
 * Fetches cost estimates for travel expenses in a specific location
 * @param {Object} params - Estimate parameters
 * @param {string} params.location - Destination location (country or city)
 * @param {string} params.category - Expense category (accommodation, food, transportation, activities)
 * @param {string} params.budget - Budget level (budget, moderate, luxury)
 * @param {string} params.currency - Preferred currency for estimates (optional, defaults to USD)
 * @returns {Promise<Object>} - Travel cost estimates
 */
export const fetchCostEstimates = async (params) => {
  try {
    // Validate required parameters
    if (!params.location) {
      throw new Error("Location is required for cost estimates");
    }

    console.log("Fetching cost estimates:", params);

    // For demo purposes, create a simulated delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Default values if not specified
    const category = params.category || "all";
    const budget = params.budget || "moderate";
    const currency = params.currency || "USD";

    // Sample cost data by country/region
    const costData = {
      // Western Europe
      france: {
        budget: {
          accommodation: {
            lowRange: 50,
            highRange: 80,
            description: "Hostels or budget hotels",
          },
          food: {
            lowRange: 20,
            highRange: 30,
            description: "Street food, bakeries, and grocery stores",
          },
          transportation: {
            lowRange: 10,
            highRange: 15,
            description: "Public transportation, daily metro pass",
          },
          activities: {
            lowRange: 10,
            highRange: 25,
            description: "Free museums, parks, some paid attractions",
          },
        },
        moderate: {
          accommodation: {
            lowRange: 100,
            highRange: 180,
            description: "3-star hotels, decent Airbnb",
          },
          food: {
            lowRange: 40,
            highRange: 60,
            description: "Mix of casual restaurants and self-catering",
          },
          transportation: {
            lowRange: 15,
            highRange: 30,
            description: "Public transportation, occasional taxi",
          },
          activities: {
            lowRange: 25,
            highRange: 50,
            description: "Museums, tours, attractions",
          },
        },
        luxury: {
          accommodation: {
            lowRange: 200,
            highRange: 500,
            description: "4-5 star hotels, premium Airbnb",
          },
          food: {
            lowRange: 80,
            highRange: 150,
            description: "Fine dining restaurants, wine bars",
          },
          transportation: {
            lowRange: 50,
            highRange: 100,
            description: "Taxis, private transfers, car rentals",
          },
          activities: {
            lowRange: 60,
            highRange: 150,
            description: "Private tours, premium experiences",
          },
        },
      },
      // Southeast Asia
      thailand: {
        budget: {
          accommodation: {
            lowRange: 10,
            highRange: 25,
            description: "Hostels, guesthouses",
          },
          food: {
            lowRange: 5,
            highRange: 15,
            description: "Street food, local eateries",
          },
          transportation: {
            lowRange: 3,
            highRange: 10,
            description: "Public buses, shared songthaews",
          },
          activities: {
            lowRange: 5,
            highRange: 15,
            description: "Temples, public beaches, some attractions",
          },
        },
        moderate: {
          accommodation: {
            lowRange: 30,
            highRange: 80,
            description: "3-star hotels, nice Airbnb",
          },
          food: {
            lowRange: 15,
            highRange: 30,
            description: "Mix of local and western restaurants",
          },
          transportation: {
            lowRange: 10,
            highRange: 20,
            description: "Taxis, scooter rental",
          },
          activities: {
            lowRange: 15,
            highRange: 40,
            description: "Tours, attractions, island trips",
          },
        },
        luxury: {
          accommodation: {
            lowRange: 100,
            highRange: 300,
            description: "4-5 star resorts, luxury villas",
          },
          food: {
            lowRange: 30,
            highRange: 80,
            description: "Upscale restaurants, resort dining",
          },
          transportation: {
            lowRange: 20,
            highRange: 100,
            description: "Private drivers, speedboat transfers",
          },
          activities: {
            lowRange: 50,
            highRange: 150,
            description: "Private tours, yacht charters, spa treatments",
          },
        },
      },
      // North America
      usa: {
        budget: {
          accommodation: {
            lowRange: 70,
            highRange: 120,
            description: "Hostels, budget hotels, shared Airbnb",
          },
          food: {
            lowRange: 25,
            highRange: 40,
            description: "Fast food, diners, self-catering",
          },
          transportation: {
            lowRange: 15,
            highRange: 30,
            description: "Public transportation, bus passes",
          },
          activities: {
            lowRange: 10,
            highRange: 30,
            description: "Free museums, parks, budget attractions",
          },
        },
        moderate: {
          accommodation: {
            lowRange: 130,
            highRange: 250,
            description: "3-star hotels, private Airbnb",
          },
          food: {
            lowRange: 40,
            highRange: 70,
            description: "Casual restaurants, cafes",
          },
          transportation: {
            lowRange: 30,
            highRange: 60,
            description: "Rideshares, public transit, occasional car rental",
          },
          activities: {
            lowRange: 30,
            highRange: 70,
            description: "Museums, attractions, tours",
          },
        },
        luxury: {
          accommodation: {
            lowRange: 300,
            highRange: 800,
            description: "4-5 star hotels, luxury apartments",
          },
          food: {
            lowRange: 80,
            highRange: 200,
            description: "Fine dining, upscale restaurants",
          },
          transportation: {
            lowRange: 70,
            highRange: 150,
            description: "Car rentals, private drivers",
          },
          activities: {
            lowRange: 80,
            highRange: 200,
            description: "Premium experiences, shows, private tours",
          },
        },
      },
    };

    // Helper to determine the closest region match for location
    const getRegionMatch = (location) => {
      const locationLower = location.toLowerCase();

      // Direct country matches
      if (costData[locationLower]) return locationLower;

      // Western Europe
      if (
        [
          "europe",
          "uk",
          "italy",
          "spain",
          "germany",
          "switzerland",
          "netherlands",
          "belgium",
          "austria",
        ].some((c) => locationLower.includes(c))
      ) {
        return "france"; // Using France as proxy for Western Europe
      }

      // Southeast Asia
      if (
        [
          "asia",
          "vietnam",
          "cambodia",
          "laos",
          "malaysia",
          "indonesia",
          "philippines",
          "myanmar",
        ].some((c) => locationLower.includes(c))
      ) {
        return "thailand"; // Using Thailand as proxy for Southeast Asia
      }

      // North America
      if (
        [
          "america",
          "canada",
          "mexico",
          "united states",
          "new york",
          "california",
          "florida",
        ].some((c) => locationLower.includes(c))
      ) {
        return "usa"; // Using USA as proxy for North America
      }

      // Default to USA if no match found
      return "usa";
    };

    // Get appropriate cost data based on location
    const regionMatch = getRegionMatch(params.location);
    const regionData = costData[regionMatch];
    const budgetData = regionData[budget];

    // Format the response based on requested category
    let estimates;
    if (category !== "all") {
      // Return only the requested category
      if (budgetData[category]) {
        estimates = {
          [category]: budgetData[category],
        };
      } else {
        // If invalid category, return all categories
        estimates = budgetData;
      }
    } else {
      // Return all categories
      estimates = budgetData;
    }

    // Calculate daily total and trip total (assuming average values)
    let dailyTotal = 0;
    Object.values(estimates).forEach((item) => {
      dailyTotal += (item.lowRange + item.highRange) / 2;
    });

    return {
      success: true,
      location: params.location,
      regionProxy: regionMatch,
      budgetLevel: budget,
      currency: currency,
      estimates: estimates,
      dailyTotal: {
        low: Object.values(estimates).reduce(
          (sum, item) => sum + item.lowRange,
          0
        ),
        high: Object.values(estimates).reduce(
          (sum, item) => sum + item.highRange,
          0
        ),
        average: Math.round(dailyTotal),
      },
      notes:
        "Costs are daily estimates and may vary based on season, specific locations within the region, and current economic conditions.",
      lastUpdated: "2023-09-15",
    };
  } catch (error) {
    console.error("Error fetching cost estimates:", error);

    // Generate helpful error message
    const errorMessage = createUserErrorMessage("Cost-Estimate", error);

    // Return basic simulated data
    return {
      success: true,
      simulated: true,
      location: params.location,
      budgetLevel: params.budget || "moderate",
      currency: params.currency || "USD",
      estimates: {
        accommodation: {
          lowRange: 50,
          highRange: 150,
          description: "Varies by location and quality",
        },
        food: {
          lowRange: 20,
          highRange: 60,
          description: "Varies by dining choices",
        },
        transportation: {
          lowRange: 10,
          highRange: 40,
          description: "Varies by transport mode",
        },
        activities: {
          lowRange: 15,
          highRange: 50,
          description: "Varies by activity type",
        },
      },
      dailyTotal: {
        low: 95,
        high: 300,
        average: 198,
      },
      message:
        "This is simulated cost data. For accurate estimates, please check specialized travel budget websites or guides for your specific destination.",
    };
  }
};
