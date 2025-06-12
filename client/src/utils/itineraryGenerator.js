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
  let prompt = `Create a sleek, minimalist travel itinerary for:

DESTINATION: ${vacation_location || "Not specified"}
DURATION: ${duration || "Not specified"} days
DATES: ${dates?.from ? `${dates.from} to ${dates.to}` : "Not specified"}
BUDGET: ${standardizedBudget}
`;

  if (constraints) {
    if (constraints.travel_type) {
      prompt += `\nTRAVEL TYPE: ${constraints.travel_type}`;
    }
    if (constraints.preferred_activity) {
      prompt += `\nPREFERRED ACTIVITIES: ${constraints.preferred_activity}`;
    }

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
    if (preferences.hotel_preferences) {
      prompt += `\nACCOMMODATION PREFERENCES: ${preferences.hotel_preferences}`;
    }
    if (preferences.dining_preferences) {
      prompt += `\nDINING PREFERENCES: ${preferences.dining_preferences}`;
    }
    if (preferences.transportation_mode) {
      prompt += `\nTRANSPORTATION: ${preferences.transportation_mode}`;
    }
  }

  if (notes) {
    prompt += `\nADDITIONAL NOTES: ${notes}`;
  }

  // Add specific requests for the itinerary style and format
  prompt += `
\nCreate a modern, elegant, minimalist itinerary with:

STYLE REQUIREMENTS:
- Use ### for day headings (smaller headings) instead of ## or #
- Each day should be compact and visually appealing
- Use emoji icons to represent activities (🏛️ for museums, 🍽️ for restaurants, etc.)
- Use **bold** to highlight venue names
- Format time and location info in a consistent, clean style
- Keep all content concise with minimal words

FOR EACH DAY, INCLUDE JUST:
- Day heading: "### Day X: Brief Theme (Date)" with date in parentheses
- Brief daily overview (1-2 lines) explaining the daily focus/area
- 2-3 main activities/attractions with emoji icon, including:
  * Name in **bold**
  * Time recommendation
  * 1-2 short sentences about what makes it special
  * Any special notes (cost, booking needs)
- 1 lunch recommendation with emoji icon, including:
  * Name in **bold**
  * Type of cuisine
  * Brief note about atmosphere or signature dish
- 1 dinner recommendation with emoji icon, including:
  * Name in **bold**
  * Type of cuisine
  * Brief note about atmosphere or signature dish
- Hotel/accommodation info when changing locations (one line)

FORMATTING:
- Use bullet points (not numbers) for all items
- Include small emoji icons before each type of activity
- Keep descriptions concise but informative (10-15 words maximum)
- No lengthy paragraphs or explanations
- Consistent spacing and clean layout throughout
- Add timeframe suggestions (morning/afternoon/evening)
`;

  // Add special requests based on trip details
  if (
    constraints.budget &&
    constraints.budget.toLowerCase().includes("budget")
  ) {
    prompt +=
      "\nInclude cost indicators like $ (budget), $$ (moderate) or $$$ (expensive) for restaurants and attractions.";
  }

  if (constraints.special_requirements) {
    if (constraints.special_requirements.includes("Kid-Friendly")) {
      prompt += "\nMark kid-friendly places with 👶 emoji.";
    }
    if (
      constraints.special_requirements.includes("Accessible for Disabilities")
    ) {
      prompt += "\nMark accessible places with ♿ emoji.";
    }
  }

  // Add request for simplified additional sections
  prompt += "\nAt the end, include three VERY brief sections:";
  prompt += "\n- 'Backup Options' (3-4 bullet points with emoji icons)";
  prompt += "\n- 'Essential Tips' (3-4 bullet points with emoji icons)";
  prompt += "\n- 'Hidden Gems' (2-3 bullet points with emoji icons)";

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
    You are a modern travel planner specializing in sleek, minimalist travel itineraries.
    Your task is to create a visually elegant itinerary that's brief yet informative.

    ## Modern Minimalist Style Guidelines:
    
    1. **Typography and Structure**: 
       - Use ### for day headings (smaller, more elegant headings)
       - Use consistent spacing between sections
       - Create visual hierarchy with minimal formatting
       - Keep line length short and readable

    2. **Visual Elements**:
       - Use emojis as visual indicators (🏛️ attractions, 🍽️ restaurants, 🏨 hotels, 🚶 walking)
       - Bold only the names of specific venues
       - Maintain clean, consistent formatting throughout
       - Use white space effectively

    3. **Content Philosophy**:
       - Balanced brevity - enough detail to be useful without overwhelming
       - Focus on what makes each place special or unique
       - Include practical details (opening times, cost indicators)
       - Skip obvious or generic information

    4. **Day Structure** (always in this order):
       - Day heading: "### Day X: Theme (Date)" - small and elegant
       - 1-2 line daily overview explaining the focus/neighborhood
       - 2-3 main attractions/activities with emoji icon (include brief descriptions)
       - Lunch recommendation with emoji icon (include cuisine type and brief note)
       - Dinner recommendation with emoji icon (include cuisine type and brief note)
       - Hotel information (only when relevant) with emoji icon

    ## Example Format:
    
    ### Day 1: Old Town Discovery (June 15)
    
    Explore the historic center's charming cobblestone streets and architectural highlights.
    
    - 🏛️ **British Museum** (10:00-13:00) - World-class ancient artifacts spanning civilizations. Free entry, photography allowed.
    - 🍽️ **Dishoom** - Modern Indian street food in vintage Bombay-style café. Try the house black daal.
    - 🏢 **Tower of London** (14:30-17:00) - Historic fortress housing crown jewels and royal armory. Book tickets online to skip lines.
    - 🍷 **Barrafina** - Upscale Spanish tapas bar with counter seating. Known for seafood and Spanish wines.
    - 🏨 **The Hoxton** - Stylish boutique hotel with comfortable beds and excellent lobby workspace.

    ### Essential Tips
    
    - 💳 Museums free on Sundays, book online to skip queues
    - 🚇 Oyster card saves 50% on transportation, available at stations
    - 🌧️ Always carry light raincoat, weather changes quickly

    Remember: Create an itinerary that balances visual elegance with practical information. Each activity should include enough information to understand what makes it special while maintaining the clean, minimalist aesthetic.
  `,
    });

    // Generate a prompt based on trip details
    const prompt = generateItineraryPrompt(tripDetails);
    console.log("Itinerary prompt:", prompt);

    // Set generation parameters for a detailed response
    const generationConfig = {
      temperature: 0.7,
      topP: 0.85,
      topK: 40,
      maxOutputTokens: 3000,
    };

    // Generate the itinerary
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = result.response;
    const itinerary = response.text();

    console.log("Itinerary generated successfully");

    // DEBUG: הדפסת המסלול המלא לקונסול לנוחות הדיבוג
    console.log("========= GENERATED ITINERARY START =========");
    console.log(itinerary);
    console.log("========= GENERATED ITINERARY END =========");

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
 * Converts a markdown itinerary string to structured JSON format
 * @param {string} itineraryString - The markdown formatted itinerary string
 * @returns {Object} - Structured JSON representation of the itinerary
 */
export const convertItineraryToJSON = (itineraryString) => {
  try {
    console.log("Converting itinerary string to JSON...");

    // Initialize the structure for our JSON format
    const itineraryJSON = {
      title: "",
      destination: "",
      duration: "",
      dates: { from: "", to: "" },
      days: [],
      additionalInfo: {
        backupPlans: [],
        tips: [],
        hiddenGems: [],
      },
      createdAt: new Date().toISOString(),
    };

    // Parse the title and basic information
    const lines = itineraryString.split("\n");
    let currentSection = null;
    let currentDay = null;
    let sectionContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) continue;

      // Extract title if it's one of the first lines (usually the first heading)
      if (line.startsWith("# ") && !itineraryJSON.title) {
        itineraryJSON.title = line.substring(2).trim();
        continue;
      }

      // Detect day headers - usually Day X: Title or Day X - Title format
      const dayMatch = line.match(/^#+\s*Day\s+(\d+)[\s:-]+(.+)$/i);
      if (dayMatch) {
        // If we were processing a previous day, save it
        if (currentDay) {
          itineraryJSON.days.push(currentDay);
        }

        // Start a new day
        currentDay = {
          dayNumber: parseInt(dayMatch[1]),
          title: dayMatch[2].trim(),
          date: "", // Will try to extract this
          activities: {
            morning: [],
            lunch: [],
            afternoon: [],
            evening: [],
            dinner: [],
          },
          transportation: [],
          notes: [],
        };

        // Look for a date in the title or the next line
        const dateMatch =
          dayMatch[2].match(/\(([^)]+)\)/) ||
          (lines[i + 1] &&
            lines[i + 1].match(
              /\b\d{1,2}(st|nd|rd|th)?.*(January|February|March|April|May|June|July|August|September|October|November|December)\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(st|nd|rd|th)?\b/i
            ));

        if (dateMatch) {
          currentDay.date = dateMatch[1] || dateMatch[0];
        }

        currentSection = null;
        continue;
      }

      // Detect section headers within a day
      if (currentDay) {
        if (
          line.match(/^#+\s*Morning/i) ||
          line.includes("🌅") ||
          line.includes("☀️")
        ) {
          currentSection = "morning";
          continue;
        } else if (
          line.match(/^#+\s*Lunch/i) ||
          line.includes("🍴") ||
          line.includes("🥪")
        ) {
          currentSection = "lunch";
          continue;
        } else if (line.match(/^#+\s*Afternoon/i) || line.includes("🌞")) {
          currentSection = "afternoon";
          continue;
        } else if (
          line.match(/^#+\s*Evening/i) ||
          line.includes("🌙") ||
          line.includes("🌆")
        ) {
          currentSection = "evening";
          continue;
        } else if (
          line.match(/^#+\s*Dinner/i) ||
          line.includes("🍽️") ||
          line.includes("🍷")
        ) {
          currentSection = "dinner";
          continue;
        } else if (
          line.match(/^#+\s*Transportation|Travel Tips/i) ||
          line.includes("🚌") ||
          line.includes("🚕") ||
          line.includes("🚆")
        ) {
          currentSection = "transportation";
          continue;
        } else if (line.match(/^#+\s*Notes/i)) {
          currentSection = "notes";
          continue;
        }

        // Process content based on current section
        if (currentSection && line.startsWith("- ")) {
          const content = line.substring(2).trim();
          if (currentSection === "transportation") {
            currentDay.transportation.push(content);
          } else if (currentSection === "notes") {
            currentDay.notes.push(content);
          } else if (currentDay.activities[currentSection]) {
            currentDay.activities[currentSection].push(content);
          }
        } else if (currentSection && line.startsWith("* ")) {
          const content = line.substring(2).trim();
          if (currentSection === "transportation") {
            currentDay.transportation.push(content);
          } else if (currentSection === "notes") {
            currentDay.notes.push(content);
          } else if (currentDay.activities[currentSection]) {
            currentDay.activities[currentSection].push(content);
          }
        }
      } else {
        // Handle sections after all days (backup plans, tips, hidden gems)
        if (
          line.match(/^#+\s*Backup Day|Contingency Plan|Backup Plan|Rain Day/i)
        ) {
          currentSection = "backupPlans";
          sectionContent = [];
          continue;
        } else if (line.match(/^#+\s*Tips|Useful Tips|Travel Tips/i)) {
          currentSection = "tips";
          sectionContent = [];
          continue;
        } else if (line.match(/^#+\s*Hidden Gems|Local Secrets/i)) {
          currentSection = "hiddenGems";
          sectionContent = [];
          continue;
        }

        // Add content to the appropriate section
        if (
          currentSection &&
          (line.startsWith("- ") || line.startsWith("* "))
        ) {
          const content = line.substring(2).trim();
          switch (currentSection) {
            case "backupPlans":
              itineraryJSON.additionalInfo.backupPlans.push(content);
              break;
            case "tips":
              itineraryJSON.additionalInfo.tips.push(content);
              break;
            case "hiddenGems":
              itineraryJSON.additionalInfo.hiddenGems.push(content);
              break;
          }
        }
      }
    }

    // Add the last day if we were processing one
    if (currentDay) {
      itineraryJSON.days.push(currentDay);
    }

    // Try to extract destination and duration from title or first lines
    const destinationMatch = itineraryJSON.title.match(
      /(?:for|in|to)\s+([^:,]+)/i
    );
    if (destinationMatch) {
      itineraryJSON.destination = destinationMatch[1].trim();
    }

    const durationMatch =
      itineraryJSON.title.match(/(\d+)[\s-]*(day|days)/i) ||
      itineraryString.match(/(\d+)[\s-]*(day|days)/i);
    if (durationMatch) {
      itineraryJSON.duration = `${durationMatch[1]} ${durationMatch[2]}`;
    } else {
      itineraryJSON.duration = `${itineraryJSON.days.length} days`;
    }

    // Extract dates from the text if available
    const dateRangeMatch = itineraryString.match(
      /(\d{1,2}(st|nd|rd|th)?.*(January|February|March|April|May|June|July|August|September|October|November|December).*(20\d{2}))\s*(?:to|-)\s*(\d{1,2}(st|nd|rd|th)?.*(January|February|March|April|May|June|July|August|September|October|November|December).*(20\d{2}))/i
    );
    if (dateRangeMatch) {
      itineraryJSON.dates.from = dateRangeMatch[1];
      itineraryJSON.dates.to = dateRangeMatch[5];
    }

    console.log("Conversion to JSON complete:", itineraryJSON);
    return itineraryJSON;
  } catch (error) {
    console.error("Error converting itinerary to JSON:", error);
    // Return a simplified JSON with the original string if conversion fails
    return {
      title: "Itinerary",
      originalText: itineraryString,
      days: [],
      error: error.message,
      conversionFailed: true,
      createdAt: new Date().toISOString(),
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

    // המרת יומן הטיול למבנה JSON אם עדיין לא בוצעה המרה
    const structuredItinerary =
      itineraryData.structuredItinerary ||
      convertItineraryToJSON(itineraryData.itinerary);

    console.log("Sending itinerary to be saved in the new Itinerary model");

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/itineraries?userId=${userId}`,
      {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          chatId,
          itinerary: itineraryData.itinerary, // Original string content
          structuredItinerary, // JSON structure
          metadata: {
            ...(itineraryData.metadata || {}),
            savedAt: new Date().toISOString(),
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to save itinerary: ${response.status}`);
    }

    const result = await response.json();
    console.log("Itinerary saved successfully with ID:", result.itineraryId);
    return {
      success: true,
      itineraryId: result.itineraryId,
      ...result,
    };
  } catch (error) {
    console.error("Error saving itinerary:", error);
    return { success: false, error: error.message };
  }
};

/**
 * בדיקה האם לצ'אט יש כבר יומן מסע קיים
 * @param {string} chatId - מזהה הצ'אט לבדיקה
 * @returns {Promise<Object>} - תוצאת הבדיקה עם פרטי היומן אם קיים
 */
export const checkForExistingItinerary = async (chatId) => {
  try {
    if (!chatId) {
      console.warn("No chatId provided to check for existing itinerary");
      return { exists: false };
    }

    console.log("Checking for existing itinerary for chat:", chatId);

    // הכנת הכותרות לבקשה
    let headers = { "Content-Type": "application/json" };
    try {
      // שימוש ב-Clerk לקבלת טוקן אותנטיקציה
      const Clerk = window.Clerk;
      if (Clerk?.session) {
        const token = await Clerk.session.getToken();
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (authError) {
      console.warn("Auth not available for itinerary check:", authError);
    }

    // קבלת מזהה המשתמש
    const userId = window.Clerk?.user?.id || localStorage.getItem("userId");

    // שליחת בקשה לשרת לבדיקת יומן קיים
    const response = await fetch(
      `${
        import.meta.env.VITE_API_URL
      }/api/itineraries/check?chatId=${chatId}&userId=${userId}`,
      {
        method: "GET",
        credentials: "include",
        headers,
      }
    );

    if (!response.ok) {
      console.warn(
        `Failed to check for existing itinerary: ${response.status}`
      );
      return { exists: false };
    }

    const result = await response.json();

    if (result.exists) {
      console.log("Found existing itinerary:", result.itineraryId);
      return {
        exists: true,
        itineraryId: result.itineraryId,
        metadata: result.metadata || {},
        destination: result.metadata?.destination,
      };
    }

    return { exists: false };
  } catch (error) {
    console.error("Error checking for existing itinerary:", error);
    return { exists: false, error: error.message };
  }
};

/**
 * חילוץ מידע על יום ספציפי מיומן מסע
 * @param {Object} structuredItinerary - יומן מסע במבנה JSON מובנה
 * @param {string} dayIdentifier - מזהה היום (למשל "first day", "day 2", וכו')
 * @returns {Object} - מידע על היום המבוקש
 */
export const extractDayInfoFromItinerary = (
  structuredItinerary,
  dayIdentifier
) => {
  if (!structuredItinerary || !structuredItinerary.days || !dayIdentifier) {
    return null;
  }

  // המרת מזהה היום למספר יום (1-based)
  let dayIndex = -1;
  dayIdentifier = dayIdentifier.toLowerCase().trim();

  // חיפוש התאמות עם מילות מפתח שונות
  if (
    dayIdentifier === "first day" ||
    dayIdentifier === "day 1" ||
    dayIdentifier === "היום הראשון" ||
    dayIdentifier === "יום 1" ||
    dayIdentifier === "יום ראשון בטיול" ||
    dayIdentifier === "first"
  ) {
    dayIndex = 0; // 0-based array index for first day
  } else if (
    dayIdentifier === "last day" ||
    dayIdentifier === "היום האחרון" ||
    dayIdentifier === "final day" ||
    dayIdentifier === "last"
  ) {
    dayIndex = structuredItinerary.days.length - 1;
  } else if (
    dayIdentifier.includes("second day") ||
    dayIdentifier.includes("day 2") ||
    dayIdentifier.includes("היום השני") ||
    dayIdentifier.includes("יום 2")
  ) {
    dayIndex = 1; // 0-based array index for second day
  } else if (
    dayIdentifier.includes("third day") ||
    dayIdentifier.includes("day 3") ||
    dayIdentifier.includes("היום השלישי") ||
    dayIdentifier.includes("יום 3")
  ) {
    dayIndex = 2; // 0-based array index for third day
  } else {
    // חיפוש מספר יום ספציפי בטקסט
    const dayNumberMatch =
      dayIdentifier.match(/day\s+(\d+)/i) || dayIdentifier.match(/יום\s+(\d+)/);

    if (dayNumberMatch && dayNumberMatch[1]) {
      const dayNumber = parseInt(dayNumberMatch[1], 10);
      if (
        !isNaN(dayNumber) &&
        dayNumber > 0 &&
        dayNumber <= structuredItinerary.days.length
      ) {
        dayIndex = dayNumber - 1; // המרה ל-0-based index
      }
    }
  }

  if (dayIndex === -1 || dayIndex >= structuredItinerary.days.length) {
    console.warn(`Could not find day matching identifier: ${dayIdentifier}`);
    return null;
  }

  // חילוץ המידע על היום המבוקש
  const day = structuredItinerary.days[dayIndex];

  // Get year from itinerary data - check multiple sources
  let tripYear = null;

  // Try to get year from trip metadata
  if (structuredItinerary.dates && structuredItinerary.dates.from) {
    const dateMatch = structuredItinerary.dates.from.match(/(\d{4})/);
    if (dateMatch) {
      tripYear = parseInt(dateMatch[1], 10);
      console.log(`Found year ${tripYear} in itinerary dates metadata`);
    }
  }

  // If no year found, check in the actual itinerary text
  if (!tripYear && structuredItinerary.originalText) {
    const yearMatch =
      structuredItinerary.originalText.match(/\b(202\d|203\d)\b/); // Look for years like 2023, 2024, 2030, etc.
    if (yearMatch) {
      tripYear = parseInt(yearMatch[1], 10);
      console.log(`Found year ${tripYear} in itinerary text`);
    }
  }

  // As a fallback, use the destination to guess if this is a future trip
  if (!tripYear && structuredItinerary.destination) {
    // For future trips, use next year as default
    const currentYear = new Date().getFullYear();
    tripYear = currentYear + 1;
    console.log(`No year found, defaulting to future year: ${tripYear}`);
  }

  // If still no year, use current year as fallback
  if (!tripYear) {
    tripYear = new Date().getFullYear();
    console.log(
      `No year indicators found, defaulting to current year: ${tripYear}`
    );
  }

  // חילוץ תאריך היום במבנה YYYY-MM-DD אם אפשר
  let formattedDate = null;
  let parsedYear = null;

  if (day.date) {
    try {
      console.log(`Extracting date from day ${dayIndex + 1}: "${day.date}"`);

      // Clean up the date string (remove parentheses, extra spaces, etc.)
      const dateStr = day.date.replace(/\(|\)/g, "").trim();

      // First check if the date already has a complete year
      const fullDateMatch = dateStr.match(/\b(202\d|203\d)\b/); // Look for years like 2023, 2024, 2030, etc.
      if (fullDateMatch) {
        parsedYear = parseInt(fullDateMatch[1], 10);
        console.log(`Found explicit year ${parsedYear} in day date`);

        // Try parsing as full date with year
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
          console.log(
            `Successfully parsed full date with year: ${formattedDate}`
          );
        }
      }

      // If no year in the date string itself, process month and day formats
      if (!formattedDate) {
        // Try different date formats with the extracted year from trip data
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];

        // Handle cases like "June 15" by adding the year
        let monthFound = false;
        for (let i = 0; i < monthNames.length; i++) {
          if (dateStr.toLowerCase().includes(monthNames[i].toLowerCase())) {
            // Extract day number using regex
            const dayMatch = dateStr.match(/(\d{1,2})(st|nd|rd|th)?/);
            if (dayMatch) {
              const dayNum = dayMatch[1];
              const month = i + 1; // 1-based month

              // Create date string in YYYY-MM-DD format
              const fullDateStr = `${tripYear}-${month
                .toString()
                .padStart(2, "0")}-${dayNum.toString().padStart(2, "0")}`;
              console.log(
                `Reconstructed date with year: ${fullDateStr} from "${dateStr}"`
              );
              formattedDate = fullDateStr;
              monthFound = true;
              break;
            }
          }
        }

        // If we didn't find a month name, try other formats
        if (!monthFound && !formattedDate) {
          // Try format like "15/06" or "15-06" (day/month)
          const shortDateMatch = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})/);
          if (shortDateMatch) {
            // Assuming day/month format
            const day = parseInt(shortDateMatch[1], 10);
            const month = parseInt(shortDateMatch[2], 10);

            // Only proceed if the numbers look like valid day/month
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
              formattedDate = `${tripYear}-${month
                .toString()
                .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
              console.log(
                `Parsed day/month format with year: ${formattedDate}`
              );
            }
          }
        }
      }

      // If still no formatted date, try adding year to original string
      if (!formattedDate) {
        // Try with the trip year we determined
        const dateWithYear = `${dateStr}, ${tripYear}`;
        const dateObj = new Date(dateWithYear);

        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
          console.log(`Added trip year and parsed: ${formattedDate}`);
        } else {
          // אם ההמרה נכשלה, השתמש בתאריך המקורי
          formattedDate = dateStr;
          console.log(
            `Could not parse date: ${dateStr}, using original string`
          );
        }
      }
    } catch (e) {
      console.warn(
        `Could not parse date from day ${dayIndex + 1}:`,
        day.date,
        e
      );
      formattedDate = day.date;
    }
  } else {
    // If no date in the day object, calculate it based on the trip's start date
    try {
      if (structuredItinerary.dates && structuredItinerary.dates.from) {
        const startDate = new Date(structuredItinerary.dates.from);
        if (!isNaN(startDate.getTime())) {
          // Calculate date by adding dayIndex days to start date
          const dayDate = new Date(startDate);
          dayDate.setDate(startDate.getDate() + dayIndex);
          formattedDate = dayDate.toISOString().split("T")[0];
          parsedYear = dayDate.getFullYear();
          console.log(
            `Calculated date for day ${
              dayIndex + 1
            } from trip start date: ${formattedDate}`
          );
        }
      }
    } catch (e) {
      console.warn(`Failed to calculate date for day ${dayIndex + 1}:`, e);
    }
  }

  // Extract specific year from the formatted date if we have it
  if (formattedDate && formattedDate.includes("-") && !parsedYear) {
    const yearMatch = formattedDate.match(/^(\d{4})/);
    if (yearMatch) {
      parsedYear = parseInt(yearMatch[1], 10);
    }
  }

  // ייצור אובייקט תשובה עם כל המידע הרלוונטי
  return {
    dayNumber: dayIndex + 1,
    date: formattedDate || day.date,
    title: day.title,
    activities: day.activities,
    // השתמש ביעד הטיול מהמטא-דאטה או מהכותרת
    location: structuredItinerary.destination,
    // Include the year explicitly if we found it
    year: parsedYear || tripYear,
  };
};

/**
 * בדיקה אם השאלה היא בקשת מידע לאחר יצירת יומן
 * פונקציה זו מזהה אם השאלה היא בקשה למידע חיצוני כמו מזג אוויר, מלונות וכו'
 * @param {string} question - השאלה שהמשתמש שאל
 * @param {Object} tripContext - הקונטקסט של היומן הקיים
 * @returns {Object} - תוצאת הניתוח
 */
export const analyzePostItineraryQuestion = (question, tripContext) => {
  if (!question || !tripContext) {
    return { isAdviceQuestion: false };
  }

  console.log("Analyzing post-itinerary question:", question);
  console.log("Itinerary context:", tripContext);

  // רשימת מילות מפתח לזיהוי שאלות מידע
  const weatherKeywords = [
    "weather",
    "מזג אוויר",
    "מזג-אוויר",
    "גשם",
    "שמש",
    "טמפרטורה",
    "יהיה חם",
    "קר",
    "תחזית",
  ];

  const hotelsKeywords = [
    "hotel",
    "מלון",
    "מלונות",
    "לינה",
    "אכסניה",
    "להתארח",
    "לישון",
    "ללון",
    "booking",
    "אירבנב",
    "airbnb",
  ];

  const restaurantsKeywords = [
    "restaurant",
    "מסעדה",
    "מסעדות",
    "אוכל",
    "לאכול",
    "ארוחה",
    "dining",
    "eat",
    "food",
  ];

  const attractionsKeywords = [
    "attractions",
    "אטרקציות",
    "מה לעשות",
    "מקומות",
    "מוזיאון",
    "museum",
    "site",
    "park",
    "פארק",
  ];

  const transportKeywords = [
    "transportation",
    "תחבורה",
    "אוטובוס",
    "רכבת",
    "מטרו",
    "taxi",
    "מונית",
    "bus",
    "train",
    "transport",
  ];

  // מילות מפתח לזיהוי ימים ספציפיים ביומן
  const dayIdentifierKeywords = [
    "first day",
    "day 1",
    "second day",
    "day 2",
    "third day",
    "day 3",
    "last day",
    "final day",
    "יום ראשון",
    "יום 1",
    "יום שני",
    "יום 2",
    "היום הראשון",
    "היום השני",
    "היום האחרון",
    "day one",
    "day two",
    "trip day",
    "יום טיול",
    "יום ספציפי",
    "specific day",
  ];

  // מילות מפתח עם מספרים ספציפיים לימים
  const ordinalDayIdentifiers = [
    "1st day",
    "2nd day",
    "3rd day",
    "4th day",
    "5th day",
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "ראשון",
    "שני",
    "שלישי",
    "רביעי",
    "חמישי",
  ];

  const questionLower = question.toLowerCase();

  // בדיקה אם השאלה מכילה מילות מפתח מאחת הקטגוריות
  const isWeatherQuestion = weatherKeywords.some((keyword) =>
    questionLower.includes(keyword)
  );
  const isHotelQuestion = hotelsKeywords.some((keyword) =>
    questionLower.includes(keyword)
  );
  const isRestaurantQuestion = restaurantsKeywords.some((keyword) =>
    questionLower.includes(keyword)
  );
  const isAttractionQuestion = attractionsKeywords.some((keyword) =>
    questionLower.includes(keyword)
  );
  const isTransportQuestion = transportKeywords.some((keyword) =>
    questionLower.includes(keyword)
  );

  // חיפוש התייחסות ליום ספציפי ביומן
  let hasDayIdentifier = false;
  let specificDay = null;

  // חיפוש מילות מפתח רגילות לימים
  for (const keyword of dayIdentifierKeywords) {
    if (questionLower.includes(keyword)) {
      hasDayIdentifier = true;
      specificDay = keyword;
      console.log(`Found day identifier: ${keyword}`);
      break;
    }
  }

  // חיפוש מספר יום במשפט אם לא נמצא עדיין
  if (!hasDayIdentifier) {
    // חיפוש משפטים כמו "on day 2" או "day 3 of my trip"
    const dayMatches = [
      ...questionLower.matchAll(
        /(?:on|for|about|during|in)?\s*(?:the)?\s*day\s+(\d+)/gi
      ),
      ...questionLower.matchAll(/יום\s+(\d+)/g),
    ];

    if (dayMatches.length > 0) {
      const dayNumber = dayMatches[0][1];
      specificDay = `day ${dayNumber}`;
      hasDayIdentifier = true;
      console.log(`Found day number match: ${specificDay}`);
    }

    // חיפוש ביטויים סידוריים כמו "second day" אם עדיין לא נמצא
    if (!hasDayIdentifier) {
      for (const ordinal of ordinalDayIdentifiers) {
        if (questionLower.includes(ordinal)) {
          specificDay = ordinal;
          hasDayIdentifier = true;
          console.log(`Found ordinal day identifier: ${ordinal}`);

          // המרת מספרים סידוריים לפורמט יום
          if (ordinal === "first" || ordinal === "ראשון") specificDay = "day 1";
          else if (ordinal === "second" || ordinal === "שני")
            specificDay = "day 2";
          else if (ordinal === "third" || ordinal === "שלישי")
            specificDay = "day 3";
          else if (ordinal === "fourth" || ordinal === "רביעי")
            specificDay = "day 4";
          else if (ordinal === "fifth" || ordinal === "חמישי")
            specificDay = "day 5";
          else if (ordinal === "1st day") specificDay = "day 1";
          else if (ordinal === "2nd day") specificDay = "day 2";
          else if (ordinal === "3rd day") specificDay = "day 3";
          else if (ordinal === "4th day") specificDay = "day 4";
          else if (ordinal === "5th day") specificDay = "day 5";
          break;
        }
      }
    }
  }

  // זיהוי הקטגוריה המתאימה
  let adviceType = null;
  let intent = null;

  if (isWeatherQuestion) {
    adviceType = "weather";
    intent = "Weather-Request";
  } else if (isHotelQuestion) {
    adviceType = "hotels";
    intent = "Find-Hotel";
  } else if (isRestaurantQuestion) {
    adviceType = "restaurants";
    intent = "Find-Restaurants";
  } else if (isAttractionQuestion) {
    adviceType = "attractions";
    intent = "Find-Attractions";
  } else if (isTransportQuestion) {
    adviceType = "transportation";
    intent = "Public-Transport-Info";
  }

  // אם זוהתה שאלת מידע כלשהי
  const isAdviceQuestion = adviceType !== null;

  // מידע מיקום בסיסי מיעד הטיול
  let locationInfo = {};
  if (tripContext.vacation_location) {
    // ניסיון לפצל את המיקום לעיר ומדינה
    const locationParts = tripContext.vacation_location
      .split(",")
      .map((part) => part.trim());
    if (locationParts.length >= 2) {
      locationInfo = {
        city: locationParts[0],
        country: locationParts[1],
      };
    } else {
      locationInfo = {
        location: tripContext.vacation_location,
      };
    }
  }

  // בדיקה אם יש מבנה מסלול מאורגן
  if (!tripContext.structuredItinerary) {
    console.log("No structured itinerary found in trip context");

    // ניסיון לחלץ מסלול מובנה מהמחרוזת של היומן אם יש
    if (tripContext.itinerary && typeof tripContext.itinerary === "string") {
      try {
        console.log("Attempting to extract structured itinerary from text");
        tripContext.structuredItinerary = convertItineraryToJSON(
          tripContext.itinerary
        );
      } catch (e) {
        console.error("Failed to convert itinerary to JSON:", e);
      }
    }
  }

  // מידע נוסף מיום ספציפי ביומן המסע
  let dayInfo = null;
  if (hasDayIdentifier && tripContext.structuredItinerary) {
    console.log("Extracting info for day:", specificDay);
    console.log("From structured itinerary:", tripContext.structuredItinerary);
    dayInfo = extractDayInfoFromItinerary(
      tripContext.structuredItinerary,
      specificDay
    );
    console.log(`Found day info for ${specificDay}:`, dayInfo);
  } else if (hasDayIdentifier) {
    console.log("Day identifier found but no structured itinerary available");
  }

  // שילוב המידע מהיום הספציפי עם מידע המיקום הבסיסי
  let enhancedLocationInfo = { ...locationInfo };

  // הוספת תאריך ספציפי אם נמצא
  if (dayInfo && dayInfo.date) {
    enhancedLocationInfo.date = dayInfo.date;
    enhancedLocationInfo.time = dayInfo.date; // לטובת בקשת מזג אוויר

    if (intent === "Weather-Request") {
      // להגדיר את timeContext לפי השוואת התאריך לתאריך הנוכחי
      try {
        const dayDate = new Date(dayInfo.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // אפס את השעה להשוואת תאריכים בלבד

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (dayDate.toDateString() === today.toDateString()) {
          enhancedLocationInfo.timeContext = "today";
          enhancedLocationInfo.isToday = true;
        } else if (dayDate.toDateString() === tomorrow.toDateString()) {
          enhancedLocationInfo.timeContext = "tomorrow";
          enhancedLocationInfo.isTomorrow = true;
        } else {
          enhancedLocationInfo.timeContext = "specific_date";
        }
      } catch (e) {
        console.warn("Error comparing dates:", e);
      }
    }
  } else if (hasDayIdentifier && specificDay && intent === "Weather-Request") {
    // אם אין תאריך מפורש אבל יש יום ספציפי, נסה למצוא או לחשב תאריך
    const today = new Date();

    // חילוץ מידע מהמספר של היום המבוקש
    let dayNumber = 1;

    if (
      specificDay.includes("1") ||
      specificDay.includes("one") ||
      specificDay.includes("first")
    ) {
      dayNumber = 1;
    } else if (
      specificDay.includes("2") ||
      specificDay.includes("two") ||
      specificDay.includes("second")
    ) {
      dayNumber = 2;
    } else if (
      specificDay.includes("3") ||
      specificDay.includes("three") ||
      specificDay.includes("third")
    ) {
      dayNumber = 3;
    } else if (
      specificDay.includes("4") ||
      specificDay.includes("four") ||
      specificDay.includes("fourth")
    ) {
      dayNumber = 4;
    } else if (
      specificDay.includes("5") ||
      specificDay.includes("five") ||
      specificDay.includes("fifth")
    ) {
      dayNumber = 5;
    }

    console.log(`Using calculated day number: ${dayNumber} for ${specificDay}`);

    // חישוב התאריך לפי מספר הימים מהיום הראשון של הטיול
    let startDate = null;

    // נסה למצוא את היום הראשון מתאריכי הטיול
    if (tripContext.dates && tripContext.dates.from) {
      startDate = new Date(tripContext.dates.from);
    } else if (
      tripContext.structuredItinerary &&
      tripContext.structuredItinerary.days &&
      tripContext.structuredItinerary.days[0] &&
      tripContext.structuredItinerary.days[0].date
    ) {
      startDate = new Date(tripContext.structuredItinerary.days[0].date);
    }

    // Try harder to find the trip dates from global context if available
    if (!startDate || isNaN(startDate.getTime())) {
      // Try to find the start date from tripContext metadata
      if (
        tripContext.metadata &&
        tripContext.metadata.dates &&
        tripContext.metadata.dates.from
      ) {
        try {
          startDate = new Date(tripContext.metadata.dates.from);
          console.log(
            `Using trip start date from metadata: ${
              startDate.toISOString().split("T")[0]
            }`
          );
        } catch (e) {
          console.warn("Error parsing metadata date:", e);
        }
      }

      // If still no valid date, look at the first day of the structured itinerary more carefully
      if (
        (!startDate || isNaN(startDate.getTime())) &&
        tripContext.structuredItinerary &&
        tripContext.structuredItinerary.days &&
        tripContext.structuredItinerary.days[0]
      ) {
        const firstDayDate = tripContext.structuredItinerary.days[0].date;
        if (firstDayDate) {
          // Try to extract a full date with year
          try {
            // Check if the title or content has year information
            let yearMatch = null;
            if (tripContext.itinerary) {
              yearMatch = tripContext.itinerary.match(/202\d/); // Find first year like 2023, 2024, etc.
            }

            const firstDayDateStr = firstDayDate.replace(/\(|\)/g, "").trim();
            let modifiedDateStr = firstDayDateStr;

            // If we found a year in the itinerary, add it to the date string
            if (yearMatch && yearMatch[0]) {
              modifiedDateStr = `${firstDayDateStr} ${yearMatch[0]}`;
              console.log(
                `Adding year ${yearMatch[0]} found in itinerary to ${firstDayDateStr}`
              );
            }

            startDate = new Date(modifiedDateStr);

            // If that didn't work, try more formats
            if (isNaN(startDate.getTime())) {
              // Try month name formats
              const monthNames = [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ];

              for (let i = 0; i < monthNames.length; i++) {
                if (firstDayDateStr.includes(monthNames[i])) {
                  const dayMatch = firstDayDateStr.match(
                    /(\d{1,2})(st|nd|rd|th)?/
                  );
                  if (dayMatch) {
                    const dayNum = parseInt(dayMatch[1]);
                    const month = i + 1;
                    const year = yearMatch
                      ? parseInt(yearMatch[0])
                      : new Date().getFullYear();

                    startDate = new Date(year, month - 1, dayNum);
                    console.log(
                      `Parsed first day date using month name: ${
                        startDate.toISOString().split("T")[0]
                      }`
                    );
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Error parsing first day date:", e);
          }
        }
      }

      // If all else fails, default to today's date
      if (!startDate || isNaN(startDate.getTime())) {
        console.log("No valid start date found, using today's date");
        startDate = today;
      }
    }

    // חישוב התאריך לפי מספר היום
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + (dayNumber - 1)); // -1 כי יום 1 הוא יום ההתחלה

    // הוספת התאריך המחושב למידע המיקום
    const fullDateIsoString = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD
    enhancedLocationInfo.date = fullDateIsoString;
    enhancedLocationInfo.time = fullDateIsoString;

    // Add year explicitly to make sure we have complete date information
    enhancedLocationInfo.year = targetDate.getFullYear();
    console.log(
      `Setting explicit year=${enhancedLocationInfo.year} for the date`
    );

    // קביעת timeContext לפי תאריך יחסי
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (targetDate.toDateString() === today.toDateString()) {
      enhancedLocationInfo.timeContext = "today";
      enhancedLocationInfo.isToday = true;
    } else if (targetDate.toDateString() === tomorrow.toDateString()) {
      enhancedLocationInfo.timeContext = "tomorrow";
      enhancedLocationInfo.isTomorrow = true;
    } else {
      enhancedLocationInfo.timeContext = "specific_date";
    }

    console.log(
      `Calculated date for day ${dayNumber}: ${enhancedLocationInfo.date} (${enhancedLocationInfo.timeContext})`
    );
  }

  // מידע מיקום ספציפי מהיום המבוקש אם יש
  if (
    dayInfo &&
    dayInfo.location &&
    dayInfo.location !== enhancedLocationInfo.location
  ) {
    // אם יש מיקום ספציפי ליום זה, השתמש בו במקום המיקום הכללי של הטיול
    try {
      const dayLocationParts = dayInfo.location
        .split(",")
        .map((part) => part.trim());
      if (dayLocationParts.length >= 2) {
        enhancedLocationInfo.city = dayLocationParts[0];
        enhancedLocationInfo.country = dayLocationParts[1];
      } else {
        enhancedLocationInfo.location = dayInfo.location;
      }
    } catch (e) {
      console.warn("Error parsing day location:", e);
    }
  }

  // אם לא הצלחנו לחלץ מיקום מהיום הספציפי, נשתמש במיקום הכללי של הטיול
  if (
    hasDayIdentifier &&
    !enhancedLocationInfo.city &&
    !enhancedLocationInfo.country &&
    enhancedLocationInfo.location &&
    enhancedLocationInfo.location.includes(",")
  ) {
    const parts = enhancedLocationInfo.location.split(",").map((p) => p.trim());
    if (parts.length >= 2) {
      enhancedLocationInfo.city = parts[0];
      enhancedLocationInfo.country = parts[1];
      console.log(
        `Using general location from trip: city=${parts[0]}, country=${parts[1]}`
      );
    }
  }

  // לוג נרחב למטרות דיבאג
  console.log("Question analysis complete");
  console.log("Is advice question:", isAdviceQuestion);
  console.log("Intent:", intent);
  console.log("Has day identifier:", hasDayIdentifier);
  console.log("Specific day:", specificDay);
  console.log("Enhanced location info:", enhancedLocationInfo);

  return {
    isAdviceQuestion,
    adviceType,
    intent,
    specificDay: hasDayIdentifier ? specificDay : null,
    dayInfo,
    locationInfo: enhancedLocationInfo, // כולל תאריך והקשר זמן אם נמצאו
    suggestedState: isAdviceQuestion ? "ITINERARY_ADVICE_MODE" : null,
  };
};
