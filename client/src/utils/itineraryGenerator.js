/**
 * Utilities for generating detailed trip itineraries
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Generates a structured prompt for trip itinerary creation
 * @param {Object} tripDetails - The complete trip details
 * @returns {string} - A formatted prompt for the AI model
 */
export const generateItineraryPrompt = (tripDetails) => {
  if (!tripDetails) {
    return "Please provide trip details to generate an itinerary.";
  }

  // Extract key data from trip details
  const {
    vacation_location,
    duration,
    dates,
    constraints = {},
    preferences = {},
    notes,
  } = tripDetails;

  // Calculate today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // Calculate if this is a current/upcoming trip or a future trip
  let tripTiming = "Planned for the future";
  if (dates?.from) {
    const tripDate = new Date(dates.from);
    const currentDate = new Date();
    const diffTime = tripDate - currentDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) {
      tripTiming = "Coming very soon (within a week)";
    } else if (diffDays <= 30) {
      tripTiming = "Coming soon (within a month)";
    }
  }

  // Convert budget level to standardized format
  let standardizedBudget = "Not specified";
  if (constraints.budget) {
    if (
      constraints.budget.toLowerCase().includes("budget") ||
      constraints.budget.toLowerCase().includes("low") ||
      constraints.budget.toLowerCase().includes("cheap")
    ) {
      standardizedBudget = "Budget/Economy";
    } else if (
      constraints.budget.toLowerCase().includes("moderate") ||
      constraints.budget.toLowerCase().includes("medium") ||
      constraints.budget.toLowerCase().includes("standard")
    ) {
      standardizedBudget = "Moderate/Standard";
    } else if (
      constraints.budget.toLowerCase().includes("luxury") ||
      constraints.budget.toLowerCase().includes("high") ||
      constraints.budget.toLowerCase().includes("premium")
    ) {
      standardizedBudget = "Luxury/Premium";
    } else {
      standardizedBudget = constraints.budget;
    }
  }

  // Build a structured prompt for the AI in English
  let prompt = `Create a detailed and personalized travel itinerary with the following details:

DESTINATION: ${vacation_location || "Not specified"}
DURATION: ${duration || "Not specified"} days
DATES: ${dates?.from ? `${dates.from} to ${dates.to}` : "Not specified"}
TRIP STATUS: ${tripTiming}
ITINERARY CREATION DATE: ${today}
`;

  if (constraints) {
    prompt += `\nTRAVEL TYPE: ${constraints.travel_type || "Not specified"}`;
    prompt += `\nPREFERRED ACTIVITIES: ${
      constraints.preferred_activity || "Not specified"
    }`;
    prompt += `\nBUDGET LEVEL: ${standardizedBudget}`;

    if (
      constraints.special_requirements &&
      constraints.special_requirements.length > 0
    ) {
      prompt += `\nSPECIAL REQUIREMENTS: ${constraints.special_requirements.join(
        ", "
      )}`;
    }
  }

  if (preferences) {
    prompt += `\nACCOMMODATION PREFERENCES: ${
      preferences.hotel_preferences || "Not specified"
    }`;
    prompt += `\nDINING PREFERENCES: ${
      preferences.dining_preferences || "Not specified"
    }`;
    prompt += `\nTRANSPORTATION: ${
      preferences.transportation_mode || "Not specified"
    }`;
  }

  if (notes) {
    prompt += `\nADDITIONAL NOTES: ${notes}`;
  }

  // Add specific requests for the itinerary quality
  prompt += `
\nPlease prepare a detailed day-by-day itinerary that includes:
1. Organization by days with dates (${
    dates?.from ? `starting from ${dates.from}` : "without specific dates"
  })
2. Morning activities (including hours, specific locations, and brief descriptions)
3. Lunch recommendations (including restaurant type, price range, and recommended menu items)
4. Afternoon activities or major attractions
5. Evening entertainment and dinner recommendations
6. Day-specific transportation/travel tips
7. Practical information regarding opening hours, reservation requirements, and transportation options

The itinerary should be practical, well-paced, and match the budget level and special requirements.
Include specific venue names, real restaurant recommendations, and ticket/reservation requirements.

Present the itinerary in a clean Markdown format with headings and bullet points.
`;

  // Add special requests based on trip details
  if (
    constraints.budget &&
    constraints.budget.toLowerCase().includes("budget")
  ) {
    prompt +=
      "\nFocus on free or low-cost attractions, public transportation options, and reasonably priced dining.";
  }

  if (constraints.special_requirements) {
    if (constraints.special_requirements.includes("Kid-Friendly")) {
      prompt +=
        "\nMake sure to include kid-friendly attractions and restaurants, with sufficient rest times.";
    }
    if (
      constraints.special_requirements.includes("Accessible for Disabilities")
    ) {
      prompt +=
        "\nEnsure all attractions and restaurants are accessible for people with disabilities, and include accessibility information.";
    }
    if (constraints.special_requirements.includes("Eco-Friendly")) {
      prompt +=
        "\nSuggest green transportation options and environmentally conscious attractions/restaurants.";
    }
  }

  // Add request for contingency plans
  prompt += "\nAdditionally, please include at the end of the itinerary:";
  prompt +=
    "\n1. A backup day with alternative activities in case of rain or change of plans";
  prompt += "\n2. A list of useful tips specific to the destination";
  prompt += "\n3. 'Hidden Gems' - non-touristy but locally recommended places";

  return prompt;
};

/**
 * Generates a detailed itinerary based on trip details
 * @param {Object} tripDetails - The complete trip details
 * @returns {Promise<Object>} - The generated itinerary or error object
 */
export const generateItinerary = async (tripDetails) => {
  try {
    console.log("Generating itinerary for:", tripDetails);

    // Create the AI model with specialized system instruction for itinerary generation
    const genAI = new GoogleGenerativeAI(
      import.meta.env.VITE_GEMINI_PUBLIC_KEY
    );
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `
        You are an expert travel itinerary planner specializing in creating personalized travel experiences.
        Your task is to create a detailed, practical, and personalized itinerary based on the provided trip details.

        ## Core Principles for Your Itinerary:
        
        1. **Logistical Feasibility**: 
           - Plan a sensible route considering distances and travel times between attractions
           - Account for opening and closing times of venues
           - Allocate realistic time for each activity including transit time

        2. **Budget Alignment**:
           - Tailor all recommendations to the specified budget level (budget/moderate/luxury)
           - Indicate estimated costs where relevant
           - Suggest free or low-cost alternatives when appropriate

        3. **Special Requirements Accommodation**:
           - Carefully address all special requirements such as accessibility, kid-friendliness, or dietary preferences
           - Offer adapted alternatives when necessary
           - Ensure each day is planned with these requirements in mind
           
        4. **Specific and Realistic Recommendations**:
           - Include precise names of real restaurants, attractions, and hotels
           - Add brief descriptions and relevant information for each recommendation (why it's special)
           - Mention contact details or websites when helpful

        5. **Practical Information**:
           - Indicate opening hours, reservation requirements, and entry costs
           - Detail specific transportation options including specific bus/train lines
           - Include useful local tips (busy hours, seasonal alternatives, etc.)

        6. **Balance and Pacing**:
           - Incorporate rest and recovery time throughout the day
           - Avoid overscheduling activities
           - Consider weather and seasons in activity planning

        7. **Perfect Day Structure**:
           - Morning activities (with specific locations and timings)
           - Recommended lunch options with information on style and price range
           - Afternoon activities or attractions
           - Evening entertainment and dinner recommendations
           - Transportation/travel tips specific to that day

        ## Format and Structure:
        - Use clean Markdown format with headers and list markers
        - Organize by days with clear headings indicating the day and date
        - Include a brief overview at the start of each day highlighting the main theme or area
        - Use bullet points for individual items and brief descriptions

        ## Special Additions:
        - Add an alternative day at the end of the itinerary for weather changes or plan alterations
        - Include a list of destination-specific local tips
        - Suggest options for travelers with different budgets
        - Include "Hidden Gems" or recommendations for non-touristy sites

        Produce an itinerary that feels personal, inspiring, and practical - like a recommendation from an experienced local.
      `,
    });

    // Generate a prompt based on trip details
    const prompt = generateItineraryPrompt(tripDetails);
    console.log("Itinerary prompt:", prompt);

    // Set generation parameters for a detailed response
    const generationConfig = {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 4000,
    };

    // Generate the itinerary
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = result.response;
    const itinerary = response.text();

    console.log("Itinerary generated successfully");

    return {
      success: true,
      itinerary,
      // Add metadata for the itinerary
      metadata: {
        destination: tripDetails.vacation_location,
        duration: tripDetails.duration,
        dates: tripDetails.dates,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error generating itinerary:", error);
    return {
      success: false,
      error: error.message || "Failed to generate itinerary",
    };
  }
};

/**
 * Save an itinerary to the backend
 * @param {string} chatId - The chat ID to associate with this itinerary
 * @param {Object} itineraryData - The generated itinerary data
 * @returns {Promise<Object>} - API response
 */
export const saveItinerary = async (chatId, itineraryData) => {
  try {
    console.log("Saving itinerary for chat:", chatId);

    // Get authentication token if available
    let headers = { "Content-Type": "application/json" };
    try {
      // Use clerk-js directly in this utility function
      const Clerk = window.Clerk;
      if (Clerk?.session) {
        const token = await Clerk.session.getToken();
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (authError) {
      console.warn("Auth not available for itinerary save:", authError);
    }

    // Get the current user ID
    const userId = window.Clerk?.user?.id || localStorage.getItem("userId");

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/itineraries?userId=${userId}`,
      {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          chatId,
          itinerary: itineraryData.itinerary,
          metadata: itineraryData.metadata,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to save itinerary: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error saving itinerary:", error);
    return { success: false, error: error.message };
  }
};
