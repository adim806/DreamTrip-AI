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

  // Build a structured prompt for the AI
  let prompt = `Generate a detailed day-by-day itinerary for a trip with the following details:

DESTINATION: ${vacation_location || "Not specified"}
DURATION: ${duration || "Not specified"} days
DATES: ${dates?.from ? `${dates.from} to ${dates.to}` : "Not specified"}
`;

  if (constraints) {
    prompt += `\nTRAVEL TYPE: ${constraints.travel_type || "Not specified"}`;
    prompt += `\nPREFERRED ACTIVITIES: ${
      constraints.preferred_activity || "Not specified"
    }`;
    prompt += `\nBUDGET: ${constraints.budget || "Not specified"}`;

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

  prompt += `\n\nFor each day, please include:
1. Morning activities (with specific locations and timing)
2. Recommended lunch options
3. Afternoon activities or attractions
4. Evening entertainment and dinner recommendations
5. Travel/transportation tips specific to that day

The itinerary should be practical, well-paced, and match the budget level and special requirements.
Include specific restaurant recommendations, attraction names, and any reservation/ticket requirements.

Present the itinerary in a clear, day-by-day Markdown format with headings and bullet points.
`;

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
      model: "gemini-pro",
      systemInstruction: `
        You are a specialized travel itinerary planner. Your task is to create detailed, practical day-by-day 
        travel itineraries based on the trip details provided. Your itineraries should:
        
        1. Be logistically feasible and consider travel times between attractions
        2. Match the specified budget level
        3. Accommodate any special requirements (accessibility, kid-friendly, etc.)
        4. Include specific, real locations, restaurants, and attractions
        5. Provide practical information like opening hours, reservation needs, and transportation options
        6. Balance activities with rest time
        7. Structure each day with morning activities, lunch, afternoon activities, and evening recommendations
        
        Return your response in clean Markdown format with day headers, bullet points for activities,
        and brief descriptions for each recommendation.
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
    // This is a placeholder function - you would implement your own API call
    // to save the itinerary to your backend
    console.log("Saving itinerary for chat:", chatId);

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/itineraries`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          itinerary: itineraryData.itinerary,
          metadata: itineraryData.metadata,
        }),
      }
    );

    return await response.json();
  } catch (error) {
    console.error("Error saving itinerary:", error);
    return { success: false, error: error.message };
  }
};
