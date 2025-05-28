/**
 * GeminiRAGProcessor.js
 *
 * מודל Gemini ייעודי לעיבוד תוצאות מידע חיצוני והפיכתן לתשובות טבעיות
 * המודל הזה מותאם במיוחד לעיבוד מידע חיצוני ויצירת תשובות שמשלבות את המידע באופן טבעי
 */

// ייבוא של API רלוונטי לגמיני
import { GoogleGenerativeAI } from "@google/generative-ai";

class GeminiRAGProcessor {
  constructor() {
    this.model = null;
    this.initialized = false;
    this.apiKey = import.meta.env.VITE_GEMINI_PUBLIC_KEY;
    this.modelName = "gemini-2.0-flash"; // ניתן להחליף גם ל-gemini-1.5-pro לפי הצורך
    this.responseCache = {}; // מטמון תשובות לחיסכון בקריאות API
    this.cacheTTL = 30 * 60 * 1000; // 30 דקות בmillis
  }

  /**
   * אתחול המודל עם מפתח API והגדרות התחלתיות
   * @param {string} apiKey - מפתח API של Google AI
   * @returns {Promise<boolean>} - האם האתחול הצליח
   */
  async initialize(apiKey) {
    if (this.initialized && this.apiKey === apiKey) {
      console.log("RAG Processor already initialized");
      return true;
    }

    try {
      this.apiKey = apiKey;

      // יצירת מופע של Google Generative AI
      const genAI = new GoogleGenerativeAI(apiKey);

      // יצירת מודל
      const geminiModel = genAI.getGenerativeModel({ model: this.modelName });

      console.log(`Initializing RAG Processor with ${this.modelName}`);

      // שמירת המודל
      this.model = geminiModel;
      this.initialized = true;

      console.log("RAG Processor initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize RAG Processor:", error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * עיבוד נתונים חיצוניים ויצירת תשובה טבעית
   *
   * @param {string} intent - הכוונה שזוהתה (Find-Hotel, Weather-Request, וכדומה)
   * @param {Object} externalData - הנתונים שנשלפו ממקור חיצוני
   * @param {string} userQuery - השאילתה המקורית של המשתמש
   * @param {Object} conversationContext - הקשר השיחה (אופציונלי)
   * @returns {Promise<string>} - תשובה מעובדת שמשלבת את המידע
   */
  async processExternalData(
    intent,
    externalData,
    userQuery,
    conversationContext = {}
  ) {
    // וידוא שהמודל אותחל
    if (!this.initialized || !this.model) {
      throw new Error(
        "RAG Processor not initialized. Call initialize() first."
      );
    }

    // בדיקה במטמון אם יש תשובה קיימת
    const cacheKey = this.generateCacheKey(intent, externalData, userQuery);
    const cachedResponse = this.getCachedResponse(cacheKey);
    if (cachedResponse) {
      console.log("Using cached RAG response");
      return cachedResponse;
    }

    try {
      // בניית פרומפט מותאם לסוג המידע
      const prompt = this.buildPrompt(
        intent,
        externalData,
        userQuery,
        conversationContext
      );

      // הגדרת הנחיות ספציפיות לפי סוג המידע (אופציונלי)
      const systemInstructions = this.getSystemInstructionsForIntent(intent);

      // יצירת תוכן לשליחה
      const contents = systemInstructions
        ? [{ role: "user", parts: [{ text: prompt }] }]
        : [{ role: "user", parts: [{ text: prompt }] }];

      console.log(`Sending prompt to ${this.modelName} for intent: ${intent}`);

      // שליחה למודל ה-Gemini
      const result = await this.model.generateContent({
        contents,
        generationConfig: {
          temperature: 0.2, // טמפרטורה נמוכה לתשובות עקביות
          maxOutputTokens: 1024,
        },
      });

      // חילוץ הטקסט מהתשובה
      const response = result.response.text();

      // שמירה במטמון
      this.cacheResponse(cacheKey, response);

      return response;
    } catch (error) {
      console.error(`Error in RAG processing for ${intent}:`, error);
      throw error;
    }
  }

  /**
   * בניית פרומפט מותאם לסוג המידע
   */
  buildPrompt(intent, externalData, userQuery, conversationContext = {}) {
    // התאמה לפי סוג השאילתה
    switch (intent) {
      case "Find-Hotel":
        return this.buildHotelPrompt(externalData, userQuery);
      case "Weather-Request":
        return this.buildWeatherPrompt(externalData, userQuery);
      case "Find-Attractions":
        return this.buildAttractionsPrompt(externalData, userQuery);
      case "Find-Restaurants":
        return this.buildRestaurantsPrompt(externalData, userQuery);
      default:
        return this.buildGenericPrompt(intent, externalData, userQuery);
    }
  }

  /**
   * בניית פרומפט למלונות
   */
  buildHotelPrompt(externalData, userQuery) {
    const { hotels, location, budget_level } = externalData;
    const displayLocation =
      location || externalData.requestData?.city || "the requested location";

    let prompt = `User query: "${userQuery}"\n\n`;
    prompt += `I need to provide hotel information for ${displayLocation}`;

    if (budget_level) {
      prompt += ` with ${budget_level} budget level`;
    }

    prompt += ".\n\n";

    if (!hotels || hotels.length === 0) {
      prompt += "No hotels found matching these criteria.\n";
      prompt +=
        "Please generate a helpful response that suggests alternatives or asks for different search parameters.\n";
      return prompt;
    }

    prompt += `Available hotels:\n`;
    hotels.forEach((hotel, index) => {
      prompt += `HOTEL ${index + 1}: ${hotel.name}\n`;
      prompt += `Rating: ${hotel.rating}/5\n`;
      prompt += `Price range: ${hotel.price_range}\n`;
      prompt += `Location: ${hotel.location}\n`;

      // Add address if available
      if (hotel.address) {
        prompt += `Address: ${hotel.address}\n`;
      }

      if (hotel.amenities && hotel.amenities.length > 0) {
        prompt += `Amenities: ${hotel.amenities.join(", ")}\n`;
      }

      prompt += "\n";
    });

    prompt += `
    Please format your response as follows:
    1. Start with a brief, concise introduction (1-2 sentences only)
    2. List only the top 3-5 hotels in an elegant, well-formatted list:
      - Use "🏨" only once at the beginning of your hotel list section
      - Format each hotel as: "• Hotel Name - Rating (★), Price Range, Location"
      - Include address on a separate line if available
      - Mention 1-2 standout amenities without using too many emojis
    3. Keep the ENTIRE response under 150 words
    4. End with a very brief question about preferences

    Present the information clearly and elegantly without cluttering the response with too many emojis.
    Focus on a clean, well-organized display of the key information from the data.
    DO NOT say you're an AI or that you've processed data - just present the hotel information naturally.
    `;

    return prompt;
  }

  /**
   * בניית פרומפט למזג אוויר
   */
  buildWeatherPrompt(externalData, userQuery) {
    const { location, country, date, forecast, forecasts } = externalData;
    const displayLocation = `${location}${country ? `, ${country}` : ""}`;

    let prompt = `User query: "${userQuery}"\n\n`;
    prompt += `I need to provide weather information for ${displayLocation} on ${
      date || "today"
    }.\n\n`;

    if (forecast) {
      // תחזית ליום אחד
      prompt += `Weather data:\n`;
      prompt += `- Temperature: ${forecast.temperature.current}°C (feels like ${forecast.temperature.feels_like}°C)\n`;
      prompt += `- Min/Max: ${forecast.temperature.min}°C to ${forecast.temperature.max}°C\n`;
      prompt += `- Conditions: ${forecast.conditions} (${forecast.description})\n`;
      prompt += `- Humidity: ${forecast.humidity}%\n`;
      prompt += `- Wind: ${forecast.wind.speed} m/s\n`;

      if (forecast.precipitation && forecast.precipitation.amount > 0) {
        prompt += `- Precipitation: ${forecast.precipitation.amount} mm\n`;
      }
    } else if (forecasts && forecasts.length > 0) {
      // תחזית למספר נקודות זמן ביום
      prompt += `Weather forecast times for ${date || "today"}:\n\n`;

      forecasts.forEach((fc, index) => {
        const time = new Date(fc.time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        prompt += `Time: ${time}\n`;
        prompt += `- Temperature: ${fc.temperature.current}°C (feels like ${fc.temperature.feels_like}°C)\n`;
        prompt += `- Conditions: ${fc.conditions} (${fc.description})\n`;
        prompt += `- Precipitation chance: ${fc.precipitation.chance}%\n`;
        prompt += `- Humidity: ${fc.humidity}%\n`;

        if (index < forecasts.length - 1) {
          prompt += `\n`;
        }
      });
    } else {
      prompt += "Weather data is not available for this location and date.\n";
    }

    prompt += `
    Please format your response as follows:
    1. Start with a very concise summary (maximum 1-2 sentences)
    2. Present the weather information in a clean, organized format:
      - Use one appropriate weather emoji based on the conditions
      - Current temperature and feels-like temperature
      - Min-Max temperature range
      - Conditions description
      - Humidity and wind information
    3. Add a 1-sentence practical recommendation
    4. Keep the ENTIRE response under 100 words

    Present the information in a clean, elegant format with minimal but effective use of formatting.
    Your response should be direct and helpful without unnecessary explanations or excess emojis.
    `;

    return prompt;
  }

  /**
   * בניית פרומפט לאטרקציות
   */
  buildAttractionsPrompt(externalData, userQuery) {
    const { location, country, attractions } = externalData;
    const displayLocation = `${location}${country ? `, ${country}` : ""}`;

    let prompt = `User query: "${userQuery}"\n\n`;
    prompt += `I need to provide information about attractions in ${displayLocation}.\n\n`;

    if (!attractions || attractions.length === 0) {
      prompt += "No attractions found for this location.\n";
      return prompt;
    }

    prompt += `Available attractions:\n`;
    attractions.forEach((attraction, index) => {
      prompt += `ATTRACTION ${index + 1}: ${attraction.name}\n`;
      prompt += `Rating: ${attraction.rating}/5\n`;
      prompt += `Category: ${attraction.category}\n`;
      prompt += `Location: ${attraction.location}\n`;

      // Add address if available
      if (attraction.address) {
        prompt += `Address: ${attraction.address}\n`;
      }

      if (attraction.description) {
        prompt += `Description: ${attraction.description}\n`;
      }

      prompt += "\n";
    });

    prompt += `
    Please format your response as follows:
    1. One brief sentence introducing top attractions (max 15 words)
    2. List ONLY top 3-5 attractions in a clean, well-formatted list:
      - Use "🏛️" only once at the beginning of your attractions list section
      - Format each attraction as: "• Attraction Name - Rating, Category"
      - Include location/address on a separate line if available
      - Add one brief descriptive phrase about what makes it special
    3. Keep the ENTIRE response under 120 words
    4. End with a very brief question

    Present the information in a clean, elegant format that's easy to read.
    Focus on a clear display of the information rather than excessive use of emojis.
    `;

    return prompt;
  }

  /**
   * בניית פרומפט למסעדות
   */
  buildRestaurantsPrompt(externalData, userQuery) {
    const { location, country, restaurants, cuisine } = externalData;
    const displayLocation = `${location}${country ? `, ${country}` : ""}`;

    let prompt = `User query: "${userQuery}"\n\n`;
    prompt += `I need to provide information about restaurants in ${displayLocation}`;

    if (cuisine) {
      prompt += ` specializing in ${cuisine} cuisine`;
    }

    prompt += ".\n\n";

    if (!restaurants || restaurants.length === 0) {
      prompt += "No restaurants found matching these criteria.\n";
      return prompt;
    }

    prompt += `Available restaurants:\n`;
    restaurants.forEach((restaurant, index) => {
      prompt += `RESTAURANT ${index + 1}: ${restaurant.name}\n`;
      prompt += `Rating: ${restaurant.rating}/5\n`;
      prompt += `Cuisine: ${restaurant.cuisine}\n`;
      prompt += `Price range: ${restaurant.price_range}\n`;

      if (restaurant.address) {
        prompt += `Address: ${restaurant.address}\n`;
      }

      if (restaurant.opening_hours) {
        prompt += `Status: ${restaurant.opening_hours}\n`;
      }

      prompt += "\n";
    });

    prompt += `
    Please format your response as follows:
    1. One short sentence introduction (max 15 words)
    2. List ONLY top 3-5 restaurants in a clean, well-formatted list:
      - Use "🍽️" only once at the beginning of your restaurant list section
      - Format each restaurant as: "• Restaurant Name - Rating, Cuisine Type, Price Range"
      - Include address on a separate line if available
      - Include opening hours if available
    3. Keep the ENTIRE response under 120 words
    4. End with a very short question

    Present the information in a clean, elegant format with minimal use of emojis.
    Focus on a well-organized display of the restaurant details from the data.
    `;

    return prompt;
  }

  /**
   * בניית פרומפט כללי לסוגי מידע אחרים
   */
  buildGenericPrompt(intent, externalData, userQuery) {
    const intentFormatted = intent.replace(/-/g, " ").toLowerCase();

    let prompt = `User query: "${userQuery}"\n\n`;
    prompt += `I need to provide ${intentFormatted} information based on the following data:\n\n`;

    // המרת האובייקט לטקסט בפורמט קריא
    prompt += JSON.stringify(externalData, null, 2);

    prompt += `\n\nPlease format your response as follows:
    1. Answer directly and concisely in under 100 words
    2. Present the information in a clean, well-organized list format
    3. Format related information consistently:
      - Use bullet points for clarity
      - Highlight important terms with bold formatting when appropriate
      - Include location/address information when available
      - Group similar information together
    4. Include only the most relevant details
    5. Add a very brief closing question if appropriate

    Present the information in a clean, elegant format with minimal use of emojis.
    Keep your response completely natural without mentioning data processing.
    `;

    return prompt;
  }

  /**
   * הנחיות מערכת ספציפיות לפי סוג המידע
   */
  getSystemInstructionsForIntent(intent) {
    // הנחיות ממוקדות לתצוגה נקייה ומאורגנת
    const baseInstructions = `You are a specialized travel information assistant focused on providing concise ${intent
      .replace(/-/g, " ")
      .toLowerCase()} information. 
    Present information in a clean, elegant, well-organized format.
    Use clear formatting with bullet points and occasional bold text for important elements.
    Include address/location information when available.
    Use minimal, strategic emojis - only where they genuinely enhance understanding.
    Focus on presenting the external data in a well-structured, easy-to-read format.
    Never reveal that you're an AI model or that you're processing data.
    Just respond as if you're a knowledgeable travel expert.`;

    return baseInstructions;
  }

  /**
   * יצירת מפתח מטמון
   */
  generateCacheKey(intent, data, query) {
    // יצירת מפתח ייחודי המבוסס על השאילתה והנתונים
    const dataString = JSON.stringify(data);
    return `${intent}_${query}_${dataString.length}`;
  }

  /**
   * שליפת תשובה מהמטמון
   */
  getCachedResponse(key) {
    const cachedItem = this.responseCache[key];
    if (!cachedItem) return null;

    // בדיקה אם התשובה במטמון עדיין תקפה
    const now = Date.now();
    if (now - cachedItem.timestamp > this.cacheTTL) {
      // פג תוקף המטמון
      delete this.responseCache[key];
      return null;
    }

    return cachedItem.response;
  }

  /**
   * שמירת תשובה במטמון
   */
  cacheResponse(key, response) {
    this.responseCache[key] = {
      response,
      timestamp: Date.now(),
    };
  }

  /**
   * ניקוי המטמון (למקרי צורך)
   */
  clearCache() {
    this.responseCache = {};
  }
}

// יצירת מופע יחיד (סינגלטון) של המעבד
const ragProcessor = new GeminiRAGProcessor();

export default ragProcessor;
