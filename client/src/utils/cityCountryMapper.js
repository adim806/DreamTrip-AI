/**
 * Utility to map city names to countries
 */

/**
 * Infers the country for well-known cities when country is not specified
 * @param {string} city - The city name
 * @returns {string|null} - The inferred country name or null if unknown
 */
export const inferCountryForCity = (city) => {
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
};

/**
 * Extract city and country from a location string
 * @param {string} locationString - Location string (e.g., "Paris, France")
 * @returns {Object} - Object with city and country properties
 */
export const parseLocationString = (locationString) => {
  if (!locationString) return { city: null, country: null };

  // Try to split by comma
  const parts = locationString.split(",").map((part) => part.trim());

  if (parts.length > 1) {
    // Format is "City, Country"
    return {
      city: parts[0],
      country: parts[1],
    };
  } else {
    // Only city is provided, try to infer country
    const city = parts[0];
    const country = inferCountryForCity(city);

    return {
      city: city,
      country: country,
    };
  }
};

/**
 * Format location for display
 * @param {Object} location - Location object with city and/or country
 * @returns {string} - Formatted location string
 */
export const formatLocation = (location) => {
  if (!location) return "Unknown Location";

  const city = location.city || location.location;
  const country = location.country;

  if (city && country) {
    return `${city}, ${country}`;
  } else if (city) {
    return city;
  } else if (country) {
    return country;
  } else {
    return "Unknown Location";
  }
};
