/**
 * LocationResolver.js
 *
 * Smart service to validate and disambiguate city and country information.
 * Helps ensure weather requests and other location-based services use the correct
 * location data, especially for cities with the same name in different countries.
 */

// Database of well-known cities with their canonical country
// Used for disambiguation when a city name appears in multiple countries
const WELL_KNOWN_CITIES = {
  // Major European cities with potential disambiguation issues
  rome: { primaryCountry: "Italy", otherCountries: ["United States"] },
  paris: { primaryCountry: "France", otherCountries: ["United States"] },
  london: {
    primaryCountry: "United Kingdom",
    otherCountries: ["Canada", "United States"],
  },
  athens: { primaryCountry: "Greece", otherCountries: ["United States"] },
  dublin: { primaryCountry: "Ireland", otherCountries: ["United States"] },
  vienna: { primaryCountry: "Austria", otherCountries: ["United States"] },
  moscow: { primaryCountry: "Russia", otherCountries: ["United States"] },
  cambridge: {
    primaryCountry: "United Kingdom",
    otherCountries: ["United States"],
  },
  oxford: {
    primaryCountry: "United Kingdom",
    otherCountries: ["United States"],
  },
  manchester: {
    primaryCountry: "United Kingdom",
    otherCountries: ["United States"],
  },
  florence: { primaryCountry: "Italy", otherCountries: ["United States"] },
  granada: { primaryCountry: "Spain", otherCountries: ["Nicaragua"] },
  cordoba: { primaryCountry: "Spain", otherCountries: ["Argentina", "Mexico"] },
  leon: { primaryCountry: "Spain", otherCountries: ["Mexico", "Nicaragua"] },
  valencia: { primaryCountry: "Spain", otherCountries: ["Venezuela"] },
  toledo: { primaryCountry: "Spain", otherCountries: ["United States"] },
  leipzig: { primaryCountry: "Germany", otherCountries: ["United States"] },
  hamburg: { primaryCountry: "Germany", otherCountries: ["United States"] },
  frankfurt: { primaryCountry: "Germany", otherCountries: ["United States"] },
  bergen: { primaryCountry: "Norway", otherCountries: ["Netherlands"] },

  // Cities in the Americas with disambiguation
  portland: { primaryCountry: "United States", otherCountries: ["Australia"] },
  "san jose": {
    primaryCountry: "United States",
    otherCountries: ["Costa Rica"],
  },
  richmond: {
    primaryCountry: "United States",
    otherCountries: ["Canada", "Australia"],
  },
  springfield: { primaryCountry: "United States", otherCountries: [] },
  toronto: { primaryCountry: "Canada", otherCountries: ["United States"] },
  vancouver: { primaryCountry: "Canada", otherCountries: ["United States"] },
  bristol: {
    primaryCountry: "United Kingdom",
    otherCountries: ["United States"],
  },

  // Asian/Oceanian cities
  melbourne: { primaryCountry: "Australia", otherCountries: ["United States"] },
  perth: { primaryCountry: "Australia", otherCountries: ["United Kingdom"] },
  sydney: {
    primaryCountry: "Australia",
    otherCountries: ["Canada", "United States"],
  },
  wellington: {
    primaryCountry: "New Zealand",
    otherCountries: ["United States"],
  },
  "hong kong": { primaryCountry: "China", otherCountries: [] },
  shanghai: { primaryCountry: "China", otherCountries: [] },
  mumbai: { primaryCountry: "India", otherCountries: [] },
  tokyo: { primaryCountry: "Japan", otherCountries: [] },
  kyoto: { primaryCountry: "Japan", otherCountries: [] },

  // Add more cities as needed...
};

// Map of country name variations to standardized country names
const COUNTRY_VARIATIONS = {
  usa: "United States",
  us: "United States",
  america: "United States",
  "united states of america": "United States",
  uk: "United Kingdom",
  "great britain": "United Kingdom",
  england: "United Kingdom",
  deutschland: "Germany",
  italia: "Italy",
  espana: "Spain",
  españa: "Spain",
  nippon: "Japan",
  nihon: "Japan",
  nederland: "Netherlands",
  holland: "Netherlands",
  hellas: "Greece",
  schweiz: "Switzerland",
  suisse: "Switzerland",
  svizzera: "Switzerland",
  österreich: "Austria",
  osterreich: "Austria",
  danmark: "Denmark",
  norge: "Norway",
  sverige: "Sweden",
  suomi: "Finland",
  polska: "Poland",
  cesko: "Czech Republic",
  "ceská republika": "Czech Republic",
  magyar: "Hungary",
  magyarország: "Hungary",
  türkiye: "Turkey",
};

// Map of country names to two-letter ISO country codes
const COUNTRY_CODES = {
  "United States": "US",
  "United Kingdom": "GB",
  Italy: "IT",
  France: "FR",
  Germany: "DE",
  Spain: "ES",
  Japan: "JP",
  China: "CN",
  India: "IN",
  Brazil: "BR",
  Canada: "CA",
  Australia: "AU",
  Russia: "RU",
  Mexico: "MX",
  "South Korea": "KR",
  Greece: "GR",
  Switzerland: "CH",
  Sweden: "SE",
  Norway: "NO",
  Denmark: "DK",
  Finland: "FI",
  Netherlands: "NL",
  Belgium: "BE",
  Austria: "AT",
  Portugal: "PT",
  Ireland: "IE",
  "New Zealand": "NZ",
  Turkey: "TR",
  Poland: "PL",
  "Czech Republic": "CZ",
  Hungary: "HU",
};

/**
 * Resolves location data to ensure accurate country-city matching
 *
 * @param {Object} locationData - The location data with potentially incomplete information
 * @param {string} locationData.location - The city or place name
 * @param {string} [locationData.country] - The country name (if provided)
 * @returns {Object} - Enhanced location data with resolved country and city
 */
export const resolveLocation = (locationData) => {
  if (!locationData || !locationData.location) {
    return locationData; // Can't resolve without a location
  }

  // Make a copy to avoid modifying the original
  const resolvedData = { ...locationData };
  const location = resolvedData.location.trim().toLowerCase();

  // Step 1: If country is present, standardize it
  if (resolvedData.country) {
    const countryLower = resolvedData.country.trim().toLowerCase();
    // Check if this is a country variation we should standardize
    if (COUNTRY_VARIATIONS[countryLower]) {
      resolvedData.country = COUNTRY_VARIATIONS[countryLower];
      console.log(
        `Standardized country from "${locationData.country}" to "${resolvedData.country}"`
      );
    }
  }

  // Step 2: Check if this is a well-known city that needs country matching
  if (WELL_KNOWN_CITIES[location]) {
    // If country is missing, add the primary country for this city
    if (!resolvedData.country) {
      resolvedData.country = WELL_KNOWN_CITIES[location].primaryCountry;
      console.log(
        `Added primary country "${resolvedData.country}" for city "${location}"`
      );
    }
    // If country is provided but doesn't match the primary country, verify it's a valid alternative
    else {
      const cityInfo = WELL_KNOWN_CITIES[location];
      const standardCountry = resolvedData.country;

      // If provided country is neither the primary nor in the list of other valid countries
      if (
        standardCountry !== cityInfo.primaryCountry &&
        !cityInfo.otherCountries.includes(standardCountry)
      ) {
        // This is likely an error - set a confidence flag and suggest the primary country
        resolvedData.locationConflict = true;
        resolvedData.suggestedLocation = {
          city: location,
          country: cityInfo.primaryCountry,
          message: `Did you mean ${
            location.charAt(0).toUpperCase() + location.slice(1)
          }, ${cityInfo.primaryCountry}? There's also ${
            location.charAt(0).toUpperCase() + location.slice(1)
          } in ${cityInfo.otherCountries.join(", ")}.`,
        };

        console.warn(
          `Possible location conflict: ${location}, ${standardCountry} - did you mean ${location}, ${cityInfo.primaryCountry}?`
        );
      }
    }
  }

  // Step 3: Add country code for API calls if we have a standardized country
  if (resolvedData.country && COUNTRY_CODES[resolvedData.country]) {
    resolvedData.countryCode = COUNTRY_CODES[resolvedData.country];
  }

  return resolvedData;
};

/**
 * Parses a location string that might contain both city and country
 *
 * @param {string} locationString - A string like "Paris, France" or "Rome"
 * @returns {Object} - Separated city and country
 */
export const parseLocationString = (locationString) => {
  if (!locationString) return { location: null, country: null };

  // Check if it contains a comma (likely separating city and country)
  if (locationString.includes(",")) {
    const [city, country] = locationString
      .split(",")
      .map((part) => part.trim());
    return { location: city, country: country };
  }

  // Just a city name
  return { location: locationString.trim(), country: null };
};

/**
 * Formats a location for display, ensuring consistent format
 *
 * @param {Object} locationData - The resolved location data
 * @returns {string} - Formatted location string
 */
export const formatLocation = (locationData) => {
  if (!locationData || !locationData.location) return "";

  const city =
    locationData.location.charAt(0).toUpperCase() +
    locationData.location.slice(1);

  if (locationData.country) {
    return `${city}, ${locationData.country}`;
  }

  return city;
};

/**
 * Gets the confidence level for the location resolution
 *
 * @param {Object} resolvedLocation - The resolved location data
 * @returns {string} - "high", "medium", or "low" confidence
 */
export const getLocationConfidence = (resolvedLocation) => {
  if (!resolvedLocation) return "low";

  // Low confidence if there's a detected conflict
  if (resolvedLocation.locationConflict) return "low";

  // High confidence for well-known city with matched country
  if (
    resolvedLocation.location &&
    resolvedLocation.country &&
    WELL_KNOWN_CITIES[resolvedLocation.location.toLowerCase()] &&
    WELL_KNOWN_CITIES[resolvedLocation.location.toLowerCase()]
      .primaryCountry === resolvedLocation.country
  ) {
    return "high";
  }

  // Medium confidence if we have both city and country but not in our well-known database
  if (resolvedLocation.location && resolvedLocation.country) {
    return "medium";
  }

  // Low confidence if we only have city
  return "low";
};
