/**
 * Travel Restrictions Service Module
 * Handles API requests for travel restrictions, entry requirements, and safety advisories
 */
import {
  fetchWithRetry,
  generateSimulatedData,
  createUserErrorMessage,
} from "./apiClient";

/**
 * Fetches travel restrictions and entry requirements for a country
 * @param {Object} params - Search parameters
 * @param {string} params.country - Country to check restrictions for
 * @param {string} params.citizenship - Citizenship of the traveler (optional)
 * @returns {Promise<Object>} - Travel restrictions data
 */
export const fetchTravelRestrictions = async (params) => {
  try {
    // Validate required parameters
    if (!params.country) {
      throw new Error("Country is required for travel restrictions search");
    }

    console.log("Fetching travel restrictions:", params);

    // In a production environment, you would use a real travel API like Sherpa, IATA, or government data
    // For demonstration, we'll simulate the API response

    // Uncomment this to use a real API when available
    /*
    const API_KEY = import.meta.env.VITE_RESTRICTIONS_API_KEY;
    const url = `https://api.travelrestrictions.example/search?apiKey=${API_KEY}`;
    
    const response = await fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    
    if (!response.success) {
      throw new Error(response.error || "Failed to fetch travel restrictions");
    }
    
    return {
      success: true,
      ...response.data,
    };
    */

    // For demo purposes, create a simulated delay
    await new Promise((resolve) => setTimeout(resolve, 900));

    // Generate sample data based on the country
    const countries = {
      france: {
        entryRequirements: {
          visa: "Not required for stays under 90 days for US, Canada, UK, EU citizens",
          passport:
            "Must be valid for at least 3 months beyond your planned date of departure",
          covidRestrictions:
            "No COVID-19 restrictions in place. No testing or vaccination requirements.",
          other:
            "European Travel Information and Authorization System (ETIAS) will be required starting 2023",
        },
        safetyAdvisory: {
          level: "Level 2: Exercise Increased Caution",
          lastUpdated: "3 months ago",
          details:
            "Exercise increased caution due to terrorism and civil unrest. Be aware of your surroundings in tourist areas and transportation hubs.",
        },
        localLaws: [
          "Identification must be carried at all times",
          "Photography of military installations is prohibited",
          "Smoking is banned in public places",
        ],
        emergencyContacts: {
          police: "17",
          ambulance: "15",
          fire: "18",
          embassyUS: "+33-1-43-12-22-22",
          embassyUK: "+33-1-44-51-31-00",
        },
      },
      japan: {
        entryRequirements: {
          visa: "Not required for stays under 90 days for tourism for many countries",
          passport: "Must be valid for the duration of your stay",
          covidRestrictions:
            "No COVID-19 restrictions in place. No testing or vaccination requirements.",
          other: "Fingerprinting and photograph required at immigration",
        },
        safetyAdvisory: {
          level: "Level 1: Exercise Normal Precautions",
          lastUpdated: "2 months ago",
          details:
            "Japan is a very safe country with low crime rates. Exercise normal precautions and be aware of earthquake and tsunami risks.",
        },
        localLaws: [
          "Carrying your passport is required by law",
          "Some medications containing stimulants are prohibited",
          "Strict anti-drug laws with severe penalties",
        ],
        emergencyContacts: {
          police: "110",
          ambulance: "119",
          fire: "119",
          embassyUS: "+81-3-3224-5000",
          embassyUK: "+81-3-5211-1100",
        },
      },
      thailand: {
        entryRequirements: {
          visa: "Not required for stays under 30 days for many nationalities",
          passport: "Must be valid for at least 6 months beyond arrival date",
          covidRestrictions:
            "No COVID-19 restrictions in place. No testing or vaccination requirements.",
          other: "Proof of onward travel may be required",
        },
        safetyAdvisory: {
          level: "Level 2: Exercise Increased Caution",
          lastUpdated: "4 months ago",
          details:
            "Exercise increased caution due to civil unrest and terrorism. Avoid the far southern provinces due to ongoing conflict.",
        },
        localLaws: [
          "Criticism of the monarchy is illegal and punishable by imprisonment",
          "Drug offenses carry severe penalties including death",
          "It's illegal to drive without a shirt",
        ],
        emergencyContacts: {
          police: "191",
          ambulance: "1669",
          tourist_police: "1155",
          embassyUS: "+66-2-205-4000",
          embassyUK: "+66-2-305-8333",
        },
      },
    };

    // Default data for countries not in our sample dataset
    const defaultData = {
      entryRequirements: {
        visa: "Requirements vary based on citizenship. Check with the embassy or consulate.",
        passport:
          "Must be valid for at least 6 months beyond your planned date of departure",
        covidRestrictions:
          "Check for current COVID-19 restrictions before travel",
        other:
          "Proof of sufficient funds and onward/return ticket may be required",
      },
      safetyAdvisory: {
        level: "Check official government travel advisories",
        lastUpdated: "Unknown",
        details:
          "Exercise normal precautions. Be aware of your surroundings and keep travel documents secure.",
      },
      localLaws: [
        "Respect local customs and dress codes",
        "Photography may be restricted in some areas",
        "Always carry identification",
      ],
      emergencyContacts: {
        police: "Check local emergency numbers",
        ambulance: "Check local emergency numbers",
        fire: "Check local emergency numbers",
      },
    };

    // Normalize country name for lookup
    const normalizedCountry = params.country.toLowerCase().trim();
    const countryData = countries[normalizedCountry] || defaultData;

    return {
      success: true,
      country: params.country,
      citizenship: params.citizenship || "General advice",
      restrictions: countryData.entryRequirements,
      safetyAdvisory: countryData.safetyAdvisory,
      localLaws: countryData.localLaws,
      emergencyContacts: countryData.emergencyContacts,
      lastUpdated: "2023-10-01",
      sourceInfo: "DreamTrip AI Travel Information Database",
    };
  } catch (error) {
    console.error("Error fetching travel restrictions:", error);

    // Generate helpful error message
    const errorMessage = createUserErrorMessage("Travel-Restrictions", error);

    // Return simulated data with a flag indicating it's not real
    return generateSimulatedData("Travel-Restrictions", params);
  }
};

/**
 * Fetches health and safety advisories for a location
 * @param {Object} params - Search parameters
 * @param {string} params.location - Location to check (country or city)
 * @param {string} params.type - Type of advisory (health, security, natural-disasters)
 * @returns {Promise<Object>} - Safety advisories data
 */
export const fetchSafetyInformation = async (params) => {
  try {
    // Validate required parameters
    if (!params.location) {
      throw new Error("Location is required for safety information");
    }

    console.log("Fetching safety information:", params);

    // For demo purposes, create a simulated delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Sample health advisories by region
    const healthAdvisories = {
      africa: [
        {
          disease: "Malaria",
          risk: "High in many regions",
          prevention: "Antimalarial medication, insect repellent, bed nets",
        },
        {
          disease: "Yellow Fever",
          risk: "Present in many countries",
          prevention: "Vaccination required for entry to some countries",
        },
        {
          disease: "Dengue Fever",
          risk: "Present in urban areas",
          prevention: "Insect repellent, protective clothing",
        },
      ],
      asia: [
        {
          disease: "Dengue Fever",
          risk: "Common in Southeast Asia",
          prevention: "Insect repellent, protective clothing",
        },
        {
          disease: "Hepatitis A",
          risk: "Moderate",
          prevention: "Vaccination, food and water precautions",
        },
        {
          disease: "Japanese Encephalitis",
          risk: "Present in rural areas",
          prevention: "Vaccination for long-term stays",
        },
      ],
      europe: [
        {
          disease: "Tick-borne Encephalitis",
          risk: "Present in forested areas",
          prevention: "Vaccination, proper clothing, tick checks",
        },
        {
          disease: "Measles",
          risk: "Outbreaks in some countries",
          prevention: "MMR vaccination",
        },
        {
          disease: "Rabies",
          risk: "Present in wildlife",
          prevention:
            "Avoid animal contact, vaccination for high-risk activities",
        },
      ],
      americas: [
        {
          disease: "Zika Virus",
          risk: "Present in parts of Latin America and Caribbean",
          prevention: "Insect repellent, protective clothing",
        },
        {
          disease: "Dengue Fever",
          risk: "Present in tropical regions",
          prevention: "Insect repellent, protective clothing",
        },
        {
          disease: "Lyme Disease",
          risk: "Present in wooded areas of North America",
          prevention: "Insect repellent, tick checks",
        },
      ],
      oceania: [
        {
          disease: "Dengue Fever",
          risk: "Present in some islands",
          prevention: "Insect repellent, protective clothing",
        },
        {
          disease: "Ross River Virus",
          risk: "Present in Australia",
          prevention: "Insect repellent, protective clothing",
        },
        {
          disease: "Leptospirosis",
          risk: "Present in freshwater",
          prevention: "Avoid contact with potentially contaminated water",
        },
      ],
    };

    // Sample security advisories
    const securityAdvisories = {
      general: [
        {
          issue: "Petty Crime",
          advice:
            "Keep valuables secure, be vigilant in tourist areas and public transportation",
        },
        {
          issue: "Scams",
          advice:
            "Be wary of unsolicited help, unofficial taxis, and too-good-to-be-true offers",
        },
        {
          issue: "Cybersecurity",
          advice:
            "Use secure networks, be cautious with public Wi-Fi, use VPN when possible",
        },
      ],
      highRisk: [
        {
          issue: "Political Unrest",
          advice:
            "Avoid demonstrations and public gatherings, monitor local news",
        },
        {
          issue: "Terrorism",
          advice:
            "Stay vigilant in public places, follow security guidance from local authorities",
        },
        {
          issue: "Kidnapping",
          advice:
            "Use reputable transportation, avoid isolated areas, especially at night",
        },
      ],
    };

    // Sample natural disaster advisories
    const naturalDisasterAdvisories = {
      earthquake: {
        risk: "Be aware of earthquake procedures, know emergency exits in buildings",
      },
      flooding: {
        risk: "Check weather forecasts, avoid flood-prone areas during heavy rain",
      },
      hurricane: {
        risk: "Monitor weather alerts during hurricane season, know evacuation routes",
      },
      tsunami: {
        risk: "If near coastlines, know tsunami warning signs and evacuation routes",
      },
      wildfire: {
        risk: "During dry seasons, monitor fire alerts and follow evacuation orders",
      },
    };

    // Determine region and risk level based on location
    let region = "general";
    let riskLevel = "standard";
    const locationLower = params.location.toLowerCase();

    if (
      locationLower.includes("africa") ||
      ["egypt", "kenya", "south africa", "morocco", "nigeria"].some((c) =>
        locationLower.includes(c)
      )
    ) {
      region = "africa";
    } else if (
      locationLower.includes("asia") ||
      ["japan", "china", "india", "thailand", "vietnam"].some((c) =>
        locationLower.includes(c)
      )
    ) {
      region = "asia";
    } else if (
      locationLower.includes("europe") ||
      ["france", "italy", "germany", "spain", "uk"].some((c) =>
        locationLower.includes(c)
      )
    ) {
      region = "europe";
    } else if (
      locationLower.includes("america") ||
      ["usa", "canada", "mexico", "brazil", "peru"].some((c) =>
        locationLower.includes(c)
      )
    ) {
      region = "americas";
    } else if (
      locationLower.includes("australia") ||
      locationLower.includes("zealand") ||
      locationLower.includes("pacific") ||
      locationLower.includes("oceania")
    ) {
      region = "oceania";
    }

    // Determine high-risk regions based on simplified criteria
    if (
      ["syria", "afghanistan", "somalia", "yemen", "iraq", "libya"].some((c) =>
        locationLower.includes(c)
      )
    ) {
      riskLevel = "high";
    }

    // Create response based on requested type
    let advisories = [];

    if (!params.type || params.type === "health") {
      advisories = [...(healthAdvisories[region] || healthAdvisories.general)];
    }

    if (!params.type || params.type === "security") {
      advisories = [
        ...advisories,
        ...securityAdvisories[riskLevel === "high" ? "highRisk" : "general"],
      ];
    }

    if (!params.type || params.type === "natural-disasters") {
      // Add relevant natural disaster risks based on region
      const disasterRisks = [];
      if (region === "asia" || region === "americas")
        disasterRisks.push(naturalDisasterAdvisories.earthquake);
      if (region === "asia" || region === "oceania")
        disasterRisks.push(naturalDisasterAdvisories.tsunami);
      if (region === "americas" && locationLower.includes("caribbean"))
        disasterRisks.push(naturalDisasterAdvisories.hurricane);
      if (
        region === "asia" &&
        (locationLower.includes("india") ||
          locationLower.includes("bangladesh"))
      ) {
        disasterRisks.push(naturalDisasterAdvisories.flooding);
      }
      if (region === "oceania" && locationLower.includes("australia"))
        disasterRisks.push(naturalDisasterAdvisories.wildfire);

      advisories = [...advisories, ...disasterRisks];
    }

    return {
      success: true,
      location: params.location,
      advisoryType: params.type || "comprehensive",
      overallRiskLevel: riskLevel,
      advisories: advisories,
      generalAdvice:
        "Register with your country's embassy or consulate before travel. Purchase comprehensive travel insurance.",
      emergencyContacts: {
        internationalEmergency: "112 (works in many countries)",
        medicalAssistance:
          "Check local emergency numbers or contact your travel insurance provider",
      },
      lastUpdated: "2023-09-15",
    };
  } catch (error) {
    console.error("Error fetching safety information:", error);

    // Return simpler simulated data
    return {
      success: true,
      simulated: true,
      location: params.location,
      advisoryType: params.type || "comprehensive",
      overallRiskLevel: "standard",
      advisories: [
        {
          issue: "General Safety",
          advice:
            "Exercise normal precautions and maintain awareness of your surroundings",
        },
        {
          issue: "Health",
          advice: "Consider routine vaccinations and travel health insurance",
        },
        {
          issue: "Natural Hazards",
          advice:
            "Be aware of local weather conditions and potential natural hazards",
        },
      ],
      message:
        "This is simulated safety information. For accurate and up-to-date advisories, please check official government travel websites.",
    };
  }
};
