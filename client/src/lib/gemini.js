import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
];

// Initialize the API client - API key will be injected through environment variables
const API_KEY = import.meta.env.VITE_GEMINI_PUBLIC_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export const CustomTripPlanModel = {
  /**
   * Generates a personalized trip plan based on user-selected activities
   * @param {Object} itineraryData - User's selected activities organized by day and time slot
   * @param {Object} tripDetails - General trip information like destination, duration
   * @returns {Promise<Object>} - Generated trip plan
   */
  generatePersonalizedPlan: async (itineraryData, tripDetails) => {
    try {
      console.log("GeminiModel: Starting personalized plan generation");

      if (!API_KEY) {
        console.error("GeminiModel: Error - Gemini API key is not configured");
        throw new Error("Gemini API key is not configured");
      }

      // Format the itinerary data into a structured prompt
      console.log("GeminiModel: Formatting itinerary data for prompt");
      const formattedData = formatItineraryForPrompt(
        itineraryData,
        tripDetails
      );
      console.log(
        `GeminiModel: Formatted prompt length: ${formattedData.length} characters`
      );
      console.log(
        "GeminiModel: First 150 characters of formatted data:",
        formattedData.substring(0, 150).replace(/\n/g, "\\n")
      );

      // Get the model
      console.log("GeminiModel: Initializing model: gemini-2.0-flash");
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // Define the prompt
      const prompt = `
You are a travel guide AI specializing in creating personalized trip itineraries. 
I've already planned my trip by selecting specific activities for each day and time slot.
Based on my selections, create a coherent and optimized travel itinerary that:

1. Follows the exact schedule I've created (don't add or remove activities)
2. Adds logical transitions between activities considering distance and time
3. Enhances each activity with relevant local insights and tips
4. Suggests best times to visit each place based on its type and location
5. Recommends transportation options between activities

Here's my planned itinerary:
${formattedData}

Format your response as a detailed day-by-day itinerary with:
- A brief overall introduction to my trip
- For each day: Date, a theme/title for the day (if applicable)
- For each activity: Start time, description, insider tips, and suggested duration
- Transportation recommendations between activities with estimated travel times
- Brief conclusion with any other travel tips specific to my destination

Please provide the response in a clean format that's easy to read.
`;

      console.log(`GeminiModel: Prompt length: ${prompt.length} characters`);
      console.log("GeminiModel: Sending request to Gemini API");
      console.time("GeminiModel:APIRequestTime");

      // Generate content
      const result = await model.generateContent(prompt, { safetySettings });
      const response = result.response;

      console.timeEnd("GeminiModel:APIRequestTime");
      console.log("GeminiModel: Successfully received response from API");

      const responseText = response.text();
      console.log(
        `GeminiModel: Response length: ${responseText.length} characters`
      );
      console.log(
        "GeminiModel: Response preview:",
        responseText.substring(0, 150).replace(/\n/g, "\\n")
      );

      return {
        success: true,
        data: responseText,
      };
    } catch (error) {
      console.error(
        "GeminiModel: Error generating personalized trip plan:",
        error
      );
      console.error("GeminiModel: Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 300),
      });

      return {
        success: false,
        error: error.message || "Failed to generate trip plan",
      };
    }
  },
};

/**
 * Formats the itinerary data into a structured text format for the AI prompt
 * @param {Object} itineraryData - The itinerary data with days and time slots
 * @param {Object} tripDetails - Trip details like destination and duration
 * @returns {string} - Formatted itinerary text
 */
function formatItineraryForPrompt(itineraryData, tripDetails) {
  const { destination = "Unknown destination", duration = "Unknown duration" } =
    tripDetails;

  let formattedText = `DESTINATION: ${destination}\n`;
  formattedText += `DURATION: ${duration}\n\n`;

  // Process each day in the itinerary
  Object.keys(itineraryData)
    .sort()
    .forEach((day) => {
      const dayNumber = day.replace("day", "");
      formattedText += `DAY ${dayNumber}:\n`;

      // Process each time slot (morning, afternoon, evening)
      const timeSlots = itineraryData[day];
      ["morning", "afternoon", "evening"].forEach((timeSlot) => {
        if (timeSlots[timeSlot] && timeSlots[timeSlot].length > 0) {
          formattedText += `  ${timeSlot.toUpperCase()}:\n`;

          // Process activities in this time slot
          timeSlots[timeSlot].forEach((activity, index) => {
            formattedText += `    - ${activity.name} (${activity.type})\n`;
            if (activity.address)
              formattedText += `      Address: ${activity.address}\n`;
            if (activity.rating)
              formattedText += `      Rating: ${activity.rating}\n`;
          });
        }
      });

      formattedText += "\n";
    });

  return formattedText;
}
