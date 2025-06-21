import express from "express";
import cors from "cors";
import ImageKit from "imagekit";
import mongoose from "mongoose";
import Chat from "./models/chat.js";
import UserChats from "./models/userChats.js";
import Itinerary from "./models/itinerary.js";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

// Add NodeCache for in-memory caching
import NodeCache from "node-cache";

import ActivityModel from "./models/activities.js";

const port = process.env.PORT || 3000;
const app = express();
dotenv.config();

// Initialize cache with default TTL of 30 minutes (1800 seconds)
const dataCache = new NodeCache({
  stdTTL: 1800,
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false, // Store references instead of cloning objects (more efficient)
});

// Define custom TTLs for different data types (in seconds)
const CACHE_TTL = {
  WEATHER: 30 * 60, // 30 minutes for weather
  CURRENT_WEATHER: 10 * 60, // 10 minutes for current weather
  HOTELS: 12 * 60 * 60, // 12 hours for hotels
  ATTRACTIONS: 24 * 60 * 60, // 24 hours for attractions
  RESTAURANTS: 12 * 60 * 60, // 12 hours for restaurants
  DEFAULT: 30 * 60, // 30 minutes default
  DAY: 24 * 60 * 60, // 24 hours for weather data
  SHORT: 2 * 60 * 60, // 2 hours for weather data
  MEDIUM: 4 * 60 * 60, // 4 hours for weather data
  LONG: 12 * 60 * 60, // 12 hours for weather data
};

// Cache helper functions
const generateCacheKey = (endpoint, params) => {
  // Make a copy of params to avoid modifying the original
  const normalizedParams = { ...params };

  // מדפיס את הפרמטרים המקוריים לניפוי באגים
  console.log(
    `🔍 Creating cache key for endpoint '${endpoint}' with params:`,
    Object.entries(params).map(
      ([key, value]) => `${key}=${value} (${typeof value})`
    )
  );

  // מיפוי פרמטרים חיוניים לפי סוג אנדפוינט - פתרון יסודי ומבוסס סוג שירות
  let essentialParams = {};

  // --- מזג אוויר ---
  if (endpoint === "weather" || endpoint.startsWith("data-Weather")) {
    // פרמטרים חיוניים למזג אוויר: עיר, מדינה, תאריך מנורמל
    const today = new Date().toISOString().split("T")[0];
    let normalizedDate = today; // ברירת מחדל: היום

    // קביעת המיקום בצורה אחידה
    if (normalizedParams.city) {
      essentialParams.city = normalizedParams.city.trim().toLowerCase();
    } else if (normalizedParams.location) {
      essentialParams.city = normalizedParams.location.trim().toLowerCase();
    }

    // קביעת המדינה בצורה אחידה
    if (normalizedParams.country) {
      essentialParams.country = normalizedParams.country.trim().toLowerCase();
    }

    // --- נרמול תאריך לפי סדר עדיפויות ---
    // 1. שימוש בתאריך מפורש אם קיים
    if (
      normalizedParams.date &&
      normalizedParams.date !== "undefined" &&
      normalizedParams.date !== "today" &&
      normalizedParams.date !== "tomorrow"
    ) {
      normalizedDate = normalizedParams.date;
    }
    // 2. בדיקת יחסי זמן "מחר"
    else if (
      normalizedParams.time === "tomorrow" ||
      normalizedParams.timeContext === "tomorrow" ||
      normalizedParams.isTomorrow === true ||
      normalizedParams.isTomorrow === "true"
    ) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      normalizedDate = tomorrow.toISOString().split("T")[0];
    }
    // 3. בדיקת יחסי זמן "סוף שבוע"
    else if (
      normalizedParams.time === "weekend" ||
      normalizedParams.timeContext === "weekend" ||
      normalizedParams.isWeekend === true ||
      normalizedParams.isWeekend === "true"
    ) {
      const weekend = new Date();
      const dayOfWeek = weekend.getDay();
      const daysUntilWeekend =
        dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
      weekend.setDate(weekend.getDate() + daysUntilWeekend);
      normalizedDate = weekend.toISOString().split("T")[0];
    }
    // 4. ברירת מחדל - היום
    else if (
      !normalizedParams.date ||
      normalizedParams.date === "today" ||
      normalizedParams.date === "undefined" ||
      normalizedParams.time === "now" ||
      normalizedParams.time === "today" ||
      normalizedParams.timeContext === "now" ||
      normalizedParams.timeContext === "today" ||
      normalizedParams.isToday === true ||
      normalizedParams.isToday === "true" ||
      normalizedParams.isCurrentTime === true ||
      normalizedParams.isCurrentTime === "true"
    ) {
      normalizedDate = today;
    }

    // קביעת תאריך מנורמל כפרמטר חיוני
    essentialParams.date = normalizedDate;

    console.log(`🗓️ Weather cache: Using normalized date: ${normalizedDate}`);
  }

  // --- מלונות ---
  else if (endpoint === "hotels" || endpoint.startsWith("data-Find-Hotel")) {
    // פרמטרים חיוניים למלונות: עיר, מדינה, רמת תקציב

    // קביעת המיקום בצורה אחידה
    if (normalizedParams.city) {
      essentialParams.city = normalizedParams.city.trim().toLowerCase();
    } else if (normalizedParams.location) {
      essentialParams.city = normalizedParams.location.trim().toLowerCase();
    }

    // קביעת המדינה בצורה אחידה
    if (normalizedParams.country) {
      essentialParams.country = normalizedParams.country.trim().toLowerCase();
    }

    // נרמול רמת תקציב
    let budget =
      normalizedParams.budget_level ||
      normalizedParams.hotel_type ||
      normalizedParams.price_level ||
      normalizedParams.budget ||
      normalizedParams.price_range ||
      "moderate";

    // נרמול של מילות תקציב שונות
    if (
      ["cheap", "budget", "economy", "low", "inexpensive"].includes(
        budget.toLowerCase()
      )
    ) {
      budget = "cheap";
    } else if (
      ["expensive", "luxury", "high", "premium", "deluxe"].includes(
        budget.toLowerCase()
      )
    ) {
      budget = "luxury";
    } else {
      budget = "moderate"; // ברירת מחדל
    }

    essentialParams.budget = budget;
  }

  // --- אטרקציות ---
  else if (
    endpoint === "attractions" ||
    endpoint.startsWith("data-Find-Attractions")
  ) {
    // פרמטרים חיוניים לאטרקציות: עיר, מדינה, קטגוריה (אופציונלי)

    // קביעת המיקום בצורה אחידה
    if (normalizedParams.city) {
      essentialParams.city = normalizedParams.city.trim().toLowerCase();
    } else if (normalizedParams.location) {
      essentialParams.city = normalizedParams.location.trim().toLowerCase();
    }

    // קביעת המדינה בצורה אחידה
    if (normalizedParams.country) {
      essentialParams.country = normalizedParams.country.trim().toLowerCase();
    }

    // קטגוריה (אם קיימת)
    if (normalizedParams.category) {
      essentialParams.category = normalizedParams.category.trim().toLowerCase();
    }
  }

  // --- מסעדות ---
  else if (
    endpoint === "restaurants" ||
    endpoint.startsWith("data-Find-Restaurants")
  ) {
    // פרמטרים חיוניים למסעדות: עיר, מדינה, מטבח (אופציונלי), רמת תקציב (אופציונלי)

    // קביעת המיקום בצורה אחידה
    if (normalizedParams.city) {
      essentialParams.city = normalizedParams.city.trim().toLowerCase();
    } else if (normalizedParams.location) {
      essentialParams.city = normalizedParams.location.trim().toLowerCase();
    }

    // קביעת המדינה בצורה אחידה
    if (normalizedParams.country) {
      essentialParams.country = normalizedParams.country.trim().toLowerCase();
    }

    // מטבח (אם קיים)
    if (normalizedParams.cuisine) {
      essentialParams.cuisine = normalizedParams.cuisine.trim().toLowerCase();
    }

    // רמת תקציב (אם קיימת)
    if (
      normalizedParams.budget_level ||
      normalizedParams.price_range ||
      normalizedParams.budget
    ) {
      let budget =
        normalizedParams.budget_level ||
        normalizedParams.price_range ||
        normalizedParams.budget;

      // נרמול של מילות תקציב שונות
      if (
        ["cheap", "budget", "economy", "low", "inexpensive"].includes(
          budget.toLowerCase()
        )
      ) {
        budget = "cheap";
      } else if (
        ["expensive", "luxury", "high", "premium", "deluxe"].includes(
          budget.toLowerCase()
        )
      ) {
        budget = "luxury";
      } else {
        budget = "moderate"; // ברירת מחדל
      }

      essentialParams.budget = budget;
    }
  }

  // עבור כל שאר האנדפוינטים - שימוש במנגנון רגיל
  else {
    // Normalize location parameter to handle case sensitivity and extra spaces
    if (normalizedParams.location) {
      essentialParams.location = normalizedParams.location.trim().toLowerCase();
    }

    // Normalize country parameter to handle case sensitivity and extra spaces
    if (normalizedParams.country) {
      essentialParams.country = normalizedParams.country.trim().toLowerCase();
    }

    // Handle other common parameters that should be normalized
    if (normalizedParams.city) {
      essentialParams.city = normalizedParams.city.trim().toLowerCase();
    }

    if (normalizedParams.intent) {
      essentialParams.intent = normalizedParams.intent.trim();
    }
  }

  // Create a sorted string of parameters from the essential ones only
  const sortedParams = Object.keys(essentialParams)
    .sort()
    .map((key) => `${key}=${essentialParams[key]}`)
    .join("&");

  // Log the generated key to help with debugging
  const key = `${endpoint}:${sortedParams}`;
  console.log(`🔑 Generated SMART cache key: ${key}`);
  console.log(`🗝️ Using essential params only:`, essentialParams);

  return key;
};

const getCachedData = (key) => {
  console.log(`🔎 Checking cache for key: ${key}`);
  const cachedItem = dataCache.get(key);

  if (!cachedItem) {
    console.log(`❌ CACHE MISS: No data in cache for key: ${key}`);
    return null;
  }

  // בדיקת תוקף הנתונים במטמון
  const now = Date.now();
  if (cachedItem.expiresAt && cachedItem.expiresAt < now) {
    console.log(`⏱️ CACHE EXPIRED: Data for key ${key} has expired`);
    dataCache.del(key);
    return null;
  }

  console.log(`✅ CACHE HIT: Found data in cache for key: ${key}`);
  console.log(`   Expires: ${new Date(cachedItem.expiresAt).toLocaleString()}`);
  console.log(
    `   TTL remaining: ${Math.round(
      (cachedItem.expiresAt - now) / 1000 / 60
    )} minutes`
  );

  return cachedItem.data;
};

const setCachedData = (key, data, ttl = CACHE_TTL.DEFAULT) => {
  try {
    // אם הנתונים הם undefined או null, לא נשמור במטמון
    if (data === undefined || data === null) {
      console.warn(`⚠️ Not caching undefined or null data for key: ${key}`);
      return false;
    }

    // קביעת TTL מותאם לפי סוג הבקשה
    let calculatedTtl = ttl;

    // מזג אוויר - TTL משתנה לפי מרחק התאריך
    if (key.startsWith("weather:") || key.startsWith("data-Weather-Request:")) {
      // בדיקה האם זה עבור היום (שעתיים), מחר (4 שעות) או הלאה (12 שעות)
      const dateMatch = key.match(/date=(\d{4}-\d{2}-\d{2})/);
      if (dateMatch && dateMatch[1]) {
        const requestDate = new Date(dateMatch[1]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const diffDays = Math.floor(
          (requestDate - today) / (1000 * 60 * 60 * 24)
        );

        if (diffDays < 0) {
          // מזג אוויר היסטורי - אפשר לשמור זמן רב יותר
          calculatedTtl = CACHE_TTL.DAY; // 24 שעות
          console.log(
            `📅 Weather for past date (${dateMatch[1]}): Setting TTL to 24 hours (${CACHE_TTL.DAY} seconds)`
          );
        } else if (diffDays === 0) {
          // מזג אוויר להיום - תוקף קצר יותר
          calculatedTtl = CACHE_TTL.SHORT; // שעתיים
          console.log(
            `📅 Weather for today (${dateMatch[1]}): Setting TTL to 2 hours (${CACHE_TTL.SHORT} seconds)`
          );
        } else if (diffDays === 1) {
          // מזג אוויר למחר - תוקף בינוני
          calculatedTtl = CACHE_TTL.MEDIUM; // 4 שעות
          console.log(
            `📅 Weather for tomorrow (${dateMatch[1]}): Setting TTL to 4 hours (${CACHE_TTL.MEDIUM} seconds)`
          );
        } else {
          // מזג אוויר לעתיד הרחוק - תוקף ארוך יותר
          calculatedTtl = CACHE_TTL.LONG; // 12 שעות
          console.log(
            `📅 Weather for future date (${dateMatch[1]}): Setting TTL to 12 hours (${CACHE_TTL.LONG} seconds)`
          );
        }
      } else {
        calculatedTtl = CACHE_TTL.SHORT; // ברירת מחדל למזג אוויר - שעתיים
        console.log(
          `📅 Weather (no date match): Setting default TTL to 2 hours (${CACHE_TTL.SHORT} seconds)`
        );
      }

      // מאחר שבמקרים מסוימים מגיע ערך שגוי לתוך מערכת המטמון, בודקים ערך תקין
      if (calculatedTtl < 60) {
        // אם פחות מדקה
        console.warn(
          `⚠️ TTL value suspiciously low (${calculatedTtl} seconds), overriding to 2 hours`
        );
        calculatedTtl = CACHE_TTL.SHORT; // מתקנים ל-2 שעות
      }
    }
    // מלונות, אטרקציות ומסעדות - תוקף ארוך יותר
    else if (
      key.startsWith("hotels:") ||
      key.startsWith("data-Find-Hotel:") ||
      key.startsWith("attractions:") ||
      key.startsWith("data-Find-Attractions:") ||
      key.startsWith("restaurants:") ||
      key.startsWith("data-Find-Restaurants:")
    ) {
      calculatedTtl = CACHE_TTL.LONG; // 12 שעות
      console.log(
        `🏨 Hotel/Attraction/Restaurant data: Setting TTL to 12 hours (${CACHE_TTL.LONG} seconds)`
      );
    }

    // בדיקת תקינות ערך ה-TTL - לא לאפשר ערכים שליליים או נמוכים מדי
    if (calculatedTtl <= 0) {
      console.warn(
        `⚠️ Invalid TTL (${calculatedTtl}), using default of 30 minutes`
      );
      calculatedTtl = CACHE_TTL.DEFAULT;
    } else if (calculatedTtl < 60) {
      // פחות מדקה
      console.warn(
        `⚠️ TTL too low (${calculatedTtl}), using minimum of 5 minutes`
      );
      calculatedTtl = 5 * 60; // מינימום 5 דקות
    }

    const expiresAt = Date.now() + calculatedTtl * 1000; // המרה לmilliseconds
    const cacheObj = {
      data,
      expiresAt,
    };

    // בדיקה האם קיים כבר ערך במטמון שמתאים למפתח הזה
    const existingItem = dataCache.get(key);
    if (existingItem) {
      console.log(`♻️ Cache update: Replacing existing entry for key: ${key}`);
      console.log(
        `   Old expiry: ${new Date(
          existingItem.expiresAt
        ).toLocaleTimeString()}`
      );
      console.log(`   New expiry: ${new Date(expiresAt).toLocaleTimeString()}`);
    } else {
      console.log(
        `➕ Cache add: New entry for key: ${key}, expires in ${
          calculatedTtl / 60
        } minutes (${calculatedTtl} seconds)`
      );
    }

    // שמירת האובייקט במטמון עם זמן תפוגה בשניות
    dataCache.set(key, cacheObj, calculatedTtl);

    // בדיקת אימות שהמטמון נשמר בהצלחה
    const savedItem = dataCache.get(key);
    if (savedItem) {
      const savedTTL = Math.round((savedItem.expiresAt - Date.now()) / 1000);
      console.log(
        `✅ Cache verification: Item saved with TTL of ~${savedTTL} seconds`
      );
    } else {
      console.warn(`⚠️ Cache verification failed: Item not found after save`);
    }

    return true;
  } catch (error) {
    console.error("Error setting cache data:", error);
    return false;
  }
};

// Print startup information
console.log("Starting server with config:");
console.log("- CLIENT_URL:", process.env.CLIENT_URL || "http://localhost:5173");
console.log("- Clerk configured:", !!process.env.CLERK_SECRET_KEY);

// Enable CORS with all necessary headers
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-User-ID"],
  })
);

app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Query params:`, req.query);
  next();
});

// Fallback auth middleware for development
const devAuthMiddleware = (req, res, next) => {
  // Extract userId from headers or query params for development
  const userId = req.query.userId;

  if (userId) {
    req.auth = { userId };
    console.log("Using query param auth with userId:", userId);
    return next();
  }

  // Try Clerk auth as fallback
  ClerkExpressRequireAuth({
    onError: (err) => {
      console.log("Clerk auth failed:", err.message);
      return res.status(401).json({ error: "Authentication required" });
    },
  })(req, res, next);
};

// Choose auth middleware
const authMiddleware = devAuthMiddleware;

// Connect to MongoDB
const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("Connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
};

// Configure ImageKit
try {
  const imagekit = new ImageKit({
    publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
    privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGE_KIT_ENDPOINT,
  });

  // ImageKit auth endpoint
  app.get("/api/upload", (req, res) => {
    const result = imagekit.getAuthenticationParameters();
    res.send(result);
  });
} catch (error) {
  console.error("Error initializing ImageKit:", error.message);
}

// Create a new chat
app.post("/api/chats", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  const { text } = req.body;

  try {
    const newChat = new Chat({
      userId: userId,
      history: [{ role: "user", parts: [{ text }] }],
    });
    const savedChat = await newChat.save();

    const userChats = await UserChats.find({ userId: userId });

    if (!userChats.length) {
      const newUserChats = new UserChats({
        userId: userId,
        chats: [{ _id: savedChat._id, title: text.substring(0, 40) }],
      });
      await newUserChats.save();
    } else {
      await UserChats.updateOne(
        { userId: userId },
        {
          $push: {
            chats: {
              _id: savedChat._id,
              title: text.substring(0, 40),
            },
          },
        }
      );
    }
    res.status(201).send(savedChat._id);
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).send("Error creating chats!");
  }
});

// Google Places API proxy endpoint
app.get("/api/places/search", async (req, res) => {
  // Add CORS headers
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "Google Places API key not configured" });
  }

  try {
    const { query, type, radius } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    // Build the URL for the Places API
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query
    )}&type=${type || "lodging"}&radius=${radius || 5000}&key=${apiKey}`;

    // Fetch from Google Places API
    const response = await fetch(url);
    const data = await response.json();

    // Return the result
    res.json(data);
  } catch (error) {
    console.error("Error proxying to Google Places API:", error);
    res.status(500).json({ error: "Failed to fetch from Google Places API" });
  }
});

// External data service endpoints

// Weather data endpoint
app.get("/api/external/weather", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  try {
    const { location, country, date } = req.query;

    if (!location) {
      return res.status(400).json({
        success: false,
        error: "Location is required for weather data",
      });
    }

    // Generate cache key for this request
    const cacheKey = generateCacheKey("weather", req.query);

    // Check if we have cached data
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log(
        `Cache hit for weather data: ${location}, ${date || "today"}`
      );
      return res.json(cachedData);
    }

    console.log(`Cache miss for weather data: ${location}, ${date || "today"}`);

    // API key is now safely stored server-side
    const API_KEY = process.env.OPENWEATHER_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        error: "Weather API not configured on server",
      });
    }

    console.log(`Fetching weather data for ${location} on ${date || "today"}`);

    // Format location with country if available
    const locationQuery = country ? `${location},${country}` : location;

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];
    const formattedDate = date || today;

    // בדיקה אם מדובר במזג אוויר עכשווי או תחזית עתידית
    const isCurrentWeather =
      formattedDate === today ||
      req.query.time === "now" ||
      req.query.time === "today" ||
      req.query.timeContext === "now" ||
      req.query.timeContext === "today" ||
      req.query.isToday === true ||
      req.query.isToday === "true" ||
      req.query.isCurrentTime === true ||
      req.query.isCurrentTime === "true";

    console.log(
      `Weather endpoint: isCurrentWeather=${isCurrentWeather}, formattedDate=${formattedDate}, today=${today}`
    );

    let weatherData;

    if (isCurrentWeather) {
      // Fetch current weather
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          locationQuery
        )}&appid=${API_KEY}&units=metric`,
        { mode: "cors", cache: "no-cache" }
      );

      if (!response.ok) {
        throw new Error(
          `Weather API error: ${response.status} ${response.statusText}`
        );
      }

      const weatherResponseData = await response.json();

      // Process and return weather data
      weatherData = {
        success: true,
        location: location,
        country: country,
        date: formattedDate,
        displayDate: formattedDate === today ? "today" : formattedDate,
        forecast: {
          temperature: {
            current: weatherResponseData.main.temp,
            min: weatherResponseData.main.temp_min,
            max: weatherResponseData.main.temp_max,
            feels_like: weatherResponseData.main.feels_like,
          },
          conditions: weatherResponseData.weather[0].main,
          description: weatherResponseData.weather[0].description,
          icon: weatherResponseData.weather[0].icon,
          precipitation: {
            chance: weatherResponseData.clouds.all,
            amount: weatherResponseData.rain
              ? weatherResponseData.rain["1h"]
              : 0,
          },
          humidity: weatherResponseData.main.humidity,
          pressure: weatherResponseData.main.pressure,
          wind: {
            speed: weatherResponseData.wind.speed,
            degrees: weatherResponseData.wind.deg,
          },
          sunrise: weatherResponseData.sys.sunrise,
          sunset: weatherResponseData.sys.sunset,
          timezone: weatherResponseData.timezone,
        },
      };

      // Cache current weather data with shorter TTL since it changes frequently
      setCachedData(cacheKey, weatherData, CACHE_TTL.CURRENT_WEATHER);
    } else {
      // Fetch forecast
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
          locationQuery
        )}&appid=${API_KEY}&units=metric`,
        { mode: "cors", cache: "no-cache" }
      );

      if (!response.ok) {
        throw new Error(
          `Weather API error: ${response.status} ${response.statusText}`
        );
      }

      const forecastResponseData = await response.json();

      // Process forecast data for the requested date
      const targetDate = new Date(formattedDate);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      const dayForecasts = forecastResponseData.list.filter((entry) => {
        const entryDate = new Date(entry.dt * 1000).toISOString().split("T")[0];
        return entryDate === targetDateStr;
      });

      if (dayForecasts.length === 0) {
        throw new Error(`No forecast available for ${formattedDate}`);
      }

      weatherData = {
        success: true,
        location: location,
        country: country,
        date: formattedDate,
        displayDate: formattedDate === today ? "today" : formattedDate,
        forecasts: dayForecasts.map((forecast) => ({
          time: new Date(forecast.dt * 1000).toISOString(),
          temperature: {
            current: forecast.main.temp,
            min: forecast.main.temp_min,
            max: forecast.main.temp_max,
            feels_like: forecast.main.feels_like,
          },
          conditions: forecast.weather[0].main,
          description: forecast.weather[0].description,
          icon: forecast.weather[0].icon,
          precipitation: {
            chance: forecast.pop * 100,
            rain: forecast.rain ? forecast.rain["3h"] : 0,
            snow: forecast.snow ? forecast.snow["3h"] : 0,
          },
          humidity: forecast.main.humidity,
          pressure: forecast.main.pressure,
          wind: {
            speed: forecast.wind.speed,
            degrees: forecast.wind.deg,
          },
          visibility: forecast.visibility,
          clouds: forecast.clouds.all,
        })),
      };

      // Cache future forecast with standard weather TTL
      setCachedData(cacheKey, weatherData, CACHE_TTL.WEATHER);
    }

    res.json(weatherData);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).json({
      success: false,
      error: `Failed to retrieve weather data: ${error.message}`,
    });
  }
});

// Hotel recommendations endpoint
app.get("/api/external/hotels", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  try {
    const { location, country } = req.query;

    // Handle various budget field names, prioritizing budget_level
    let budgetLevel = req.query.budget_level;

    // If budget_level isn't present, check for alternative field names
    if (!budgetLevel) {
      budgetLevel =
        req.query.hotel_type ||
        req.query.price_level ||
        req.query.budget ||
        req.query.price_range ||
        "moderate"; // Default to moderate if no budget info provided

      console.log(
        `No budget_level found, using alternative field: ${budgetLevel}`
      );
    }

    const preferences = req.query.preferences
      ? JSON.parse(req.query.preferences)
      : {};

    if (!location) {
      return res.status(400).json({
        success: false,
        error: "Location is required for hotel search",
      });
    }

    // Generate cache key for this request
    const cacheKey = generateCacheKey("hotels", {
      location,
      country,
      budget_level: budgetLevel,
      preferences: JSON.stringify(preferences),
    });

    // Check if we have cached data
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for hotel data: ${location}`);
      return res.json(cachedData);
    }

    console.log(`Cache miss for hotel data: ${location}`);

    console.log(
      `Server: Fetching hotel recommendations for ${location} with budget level: ${budgetLevel}`
    );

    // Google Places API key is now safely stored server-side
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Google Places API not configured on server",
      });
    }

    // Build the search query with appropriate parameters
    const searchQuery = `${location} ${country || ""} hotels ${
      budgetLevel || preferences.budget_level || ""
    }`.trim();
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      searchQuery
    )}&type=lodging&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Google Places API error: ${data.status}`);
    }

    // Process and filter hotel results
    const hotels = data.results
      .map((place) => ({
        name: place.name,
        rating: place.rating || "N/A",
        price_range: place.price_level
          ? "$".repeat(place.price_level)
          : budgetLevel === "luxury"
          ? "$$$"
          : budgetLevel === "budget"
          ? "$"
          : "$$",
        location: place.formatted_address || `${location}, ${country || ""}`,
        place_id: place.place_id,
        amenities: ["Wi-Fi", "Parking", "Air conditioning"], // Placeholder, would need detailed place info
      }))
      .slice(0, 5);

    const hotelData = {
      success: true,
      location,
      country,
      budget_level: budgetLevel, // Always return standardized budget_level
      hotels: hotels,
    };

    // Cache hotel data
    setCachedData(cacheKey, hotelData, CACHE_TTL.HOTELS);

    res.json(hotelData);
  } catch (error) {
    console.error("Error fetching hotel data:", error);
    res.status(500).json({
      success: false,
      error: `Failed to retrieve hotel data: ${error.message}`,
    });
  }
});

// Attractions recommendations endpoint
app.get("/api/external/attractions", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  try {
    const { location, country } = req.query;
    const filters = req.query.filters ? JSON.parse(req.query.filters) : {};

    if (!location) {
      return res.status(400).json({
        success: false,
        error: "Location is required for attractions search",
      });
    }

    // Generate cache key for this request
    const cacheKey = generateCacheKey("attractions", {
      location,
      country,
      filters: JSON.stringify(filters),
    });

    // Check if we have cached data
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for attractions data: ${location}`);
      return res.json(cachedData);
    }

    console.log(`Cache miss for attractions data: ${location}`);

    console.log(`Server: Fetching attractions for ${location}`);

    // Google Places API key is now safely stored server-side
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Google Places API not configured on server",
      });
    }

    // Default to tourist attractions if no category specified
    const attractionType = filters.category || "tourist_attraction";

    // Build the search query
    const searchQuery = `${location} ${country || ""} ${attractionType}`.trim();
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      searchQuery
    )}&type=${attractionType}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Google Places API error: ${data.status}`);
    }

    // Process and filter attraction results
    const attractions = data.results
      .map((place) => ({
        name: place.name,
        rating: place.rating || "N/A",
        category: attractionType.replace("_", " "),
        price_range: place.price_level
          ? "$".repeat(place.price_level)
          : "Varies",
        location: place.formatted_address || `${location}, ${country || ""}`,
        place_id: place.place_id,
        description:
          place.business_status === "OPERATIONAL"
            ? "Open to visitors"
            : "Check for visiting hours",
      }))
      .slice(0, 5);

    const attractionsData = {
      success: true,
      location,
      country,
      attractions: attractions,
    };

    // Cache attractions data
    setCachedData(cacheKey, attractionsData, CACHE_TTL.ATTRACTIONS);

    res.json(attractionsData);
  } catch (error) {
    console.error("Error fetching attractions data:", error);
    res.status(500).json({
      success: false,
      error: `Failed to retrieve attractions data: ${error.message}`,
    });
  }
});

// Restaurant recommendations endpoint
app.get("/api/external/restaurants", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  try {
    const { location, country, cuisine, price } = req.query;
    const filters = req.query.filters ? JSON.parse(req.query.filters) : {};

    // Handle rating preference
    const ratingPreference = req.query.rating || filters.rating;
    const hasHighRatingFilter =
      ratingPreference === "high" ||
      ratingPreference === "best" ||
      ratingPreference === "top" ||
      (req.query.preferences &&
        (req.query.preferences.includes("high rating") ||
          req.query.preferences.includes("good rating") ||
          req.query.preferences.includes("best")));

    if (!location) {
      return res.status(400).json({
        success: false,
        error: "Location is required for restaurant search",
      });
    }

    // Generate cache key for this request
    const cacheKey = generateCacheKey("restaurants", {
      location,
      country,
      cuisine,
      price,
      rating: ratingPreference,
      filters: JSON.stringify(filters),
      preferences: req.query.preferences,
    });

    // Check if we have cached data
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for restaurant data: ${location}`);
      return res.json(cachedData);
    }

    console.log(`Cache miss for restaurant data: ${location}`);

    console.log(
      `Server: Fetching restaurants for ${location} with rating preference: ${
        hasHighRatingFilter ? "high" : "any"
      }`
    );

    // Google Places API key is now safely stored server-side
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Google Places API not configured on server",
      });
    }

    // Build the search query with any cuisine preferences
    // Add rating keyword if high rating is requested
    let searchQuery = `${location} ${country || ""} restaurants ${
      cuisine || filters.cuisine || ""
    }`.trim();

    // Add rating related terms to the search query
    if (hasHighRatingFilter) {
      searchQuery += " best highly rated";
    }

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      searchQuery
    )}&type=restaurant&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Google Places API error: ${data.status}`);
    }

    // Process and filter restaurant results
    let restaurants = data.results.map((place) => ({
      name: place.name,
      rating: place.rating || "N/A",
      cuisine: cuisine || filters.cuisine || "Various",
      price_range: place.price_level ? "$".repeat(place.price_level) : "$$",
      address: place.formatted_address || `${location}, ${country || ""}`,
      opening_hours: place.opening_hours?.open_now ? "Open now" : "Check hours",
      place_id: place.place_id,
    }));

    // Filter by price if specified
    const priceFilter = price || filters.price;
    if (priceFilter) {
      restaurants = restaurants.filter(
        (r) => r.price_range.length === priceFilter.length
      );
    }

    // Apply additional rating filter for high rating requests
    if (hasHighRatingFilter) {
      // First sort by rating (highest first)
      restaurants.sort((a, b) => {
        const ratingA = typeof a.rating === "number" ? a.rating : 0;
        const ratingB = typeof b.rating === "number" ? b.rating : 0;
        return ratingB - ratingA;
      });

      // Then slice to get only top results
      // Keep minimum 3 results even if ratings are lower
      const minCount = Math.min(3, restaurants.length);
      // Only keep restaurants with rating 4.0+ if we have high rating filter,
      // or just return top 5 if we don't have enough highly rated ones
      const highRatedRestaurants = restaurants.filter((r) => r.rating >= 4.0);
      restaurants =
        highRatedRestaurants.length >= minCount
          ? highRatedRestaurants.slice(0, 5)
          : restaurants.slice(0, 5);
    } else {
      // Without rating filter, just return top 5
      restaurants = restaurants.slice(0, 5);
    }

    const restaurantData = {
      success: true,
      location,
      country,
      rating: hasHighRatingFilter ? "high" : undefined,
      cuisine: cuisine || filters.cuisine,
      restaurants: restaurants,
    };

    // Cache restaurant data
    setCachedData(cacheKey, restaurantData, CACHE_TTL.RESTAURANTS);

    res.json(restaurantData);
  } catch (error) {
    console.error("Error fetching restaurant data:", error);
    res.status(500).json({
      success: false,
      error: `Failed to retrieve restaurant data: ${error.message}`,
    });
  }
});

// Generic external data endpoint that routes to the appropriate service
app.get("/api/external/data", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  try {
    const { intent, ...requestDetails } = req.query;

    if (!intent) {
      return res.status(400).json({
        success: false,
        error: "Intent is required for data requests",
      });
    }

    // Generate cache key for generic endpoint
    const cacheKey = generateCacheKey(`data-${intent}`, requestDetails);

    // Check if we have cached data
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for ${intent} data`);
      return res.json(cachedData);
    }

    console.log(
      `Server: Processing external data request for intent: ${intent}`
    );

    // Standardize budget field names for hotel requests
    if (intent === "Find-Hotel") {
      // If budget_level isn't present, check for alternative field names
      if (!requestDetails.budget_level) {
        requestDetails.budget_level =
          requestDetails.hotel_type ||
          requestDetails.price_level ||
          requestDetails.budget ||
          requestDetails.price_range;

        // Delete the alternative fields to avoid confusion
        delete requestDetails.hotel_type;
        delete requestDetails.price_level;
        delete requestDetails.price_range;

        if (requestDetails.budget_level) {
          console.log(
            `Standardized budget field to budget_level: ${requestDetails.budget_level}`
          );
        }
      }
    }

    let response;

    // Route to the appropriate service endpoint
    switch (intent) {
      case "Weather-Request":
        response = await fetch(
          `${req.protocol}://${req.get(
            "host"
          )}/api/external/weather?${new URLSearchParams(requestDetails)}`
        );
        break;
      case "Find-Hotel":
        response = await fetch(
          `${req.protocol}://${req.get(
            "host"
          )}/api/external/hotels?${new URLSearchParams(requestDetails)}`
        );
        break;
      case "Find-Attractions":
        response = await fetch(
          `${req.protocol}://${req.get(
            "host"
          )}/api/external/attractions?${new URLSearchParams(requestDetails)}`
        );
        break;
      case "Find-Restaurants":
        response = await fetch(
          `${req.protocol}://${req.get(
            "host"
          )}/api/external/restaurants?${new URLSearchParams(requestDetails)}`
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported intent: ${intent}`,
        });
    }

    const data = await response.json();

    // Cache data based on intent type
    let ttl = CACHE_TTL.DEFAULT;
    if (intent === "Weather-Request") {
      // Check if it's current weather or forecast
      const today = new Date().toISOString().split("T")[0];
      const isCurrentWeather =
        !requestDetails.date ||
        requestDetails.date === today ||
        requestDetails.time === "now" ||
        requestDetails.time === "today" ||
        requestDetails.timeContext === "now" ||
        requestDetails.timeContext === "today" ||
        requestDetails.isToday === true ||
        requestDetails.isToday === "true" ||
        requestDetails.isCurrentTime === true ||
        requestDetails.isCurrentTime === "true";

      console.log(
        `Cache TTL decision: isCurrentWeather=${isCurrentWeather}, setting TTL to ${
          isCurrentWeather ? CACHE_TTL.CURRENT_WEATHER : CACHE_TTL.WEATHER
        } seconds`
      );
      ttl = isCurrentWeather ? CACHE_TTL.CURRENT_WEATHER : CACHE_TTL.WEATHER;
    } else if (intent === "Find-Hotel") {
      ttl = CACHE_TTL.HOTELS;
    } else if (intent === "Find-Attractions") {
      ttl = CACHE_TTL.ATTRACTIONS;
    } else if (intent === "Find-Restaurants") {
      ttl = CACHE_TTL.RESTAURANTS;
    }

    setCachedData(cacheKey, data, ttl);

    res.json(data);
  } catch (error) {
    console.error("Error in external data endpoint:", error);
    res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`,
    });
  }
});

// Cache statistics and administration endpoint (protected)
app.get("/api/admin/cache-stats", authMiddleware, async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const stats = {
      keys: dataCache.keys(),
      keyCount: dataCache.keys().length,
      hits: dataCache.getStats().hits,
      misses: dataCache.getStats().misses,
      ksize: dataCache.getStats().ksize,
      vsize: dataCache.getStats().vsize,
      ttlValues: CACHE_TTL,
    };

    res.json(stats);
  } catch (error) {
    console.error("Error getting cache stats:", error);
    res.status(500).json({ error: "Failed to retrieve cache statistics" });
  }
});

// Cache flush endpoint (protected)
app.post("/api/admin/cache-flush", authMiddleware, async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { type } = req.body;

    if (
      type &&
      ["weather", "hotels", "attractions", "restaurants"].includes(type)
    ) {
      // Flush specific cache type
      const keysToFlush = dataCache
        .keys()
        .filter((key) => key.startsWith(`${type}:`));
      keysToFlush.forEach((key) => dataCache.del(key));
      res.json({
        success: true,
        message: `Flushed ${keysToFlush.length} ${type} cache entries`,
      });
    } else {
      // Flush all cache
      dataCache.flushAll();
      res.json({ success: true, message: "Entire cache has been flushed" });
    }
  } catch (error) {
    console.error("Error flushing cache:", error);
    res.status(500).json({ error: "Failed to flush cache" });
  }
});

// Get user's chat list
app.get("/api/userchats", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  console.log("Backend: Fetching chats for user:", userId);

  try {
    const userChats = await UserChats.find({ userId: userId });

    if (!userChats || userChats.length === 0) {
      console.log("No chats found for user:", userId);
      return res.status(200).send([]);
    }

    console.log(`Found ${userChats[0].chats.length} chats for user ${userId}`);
    res.status(200).send(userChats[0].chats);
  } catch (error) {
    console.error("Error fetching userchats:", error);
    res.status(500).send("Error fetching userchats");
  }
});

// Get chat history by ID
app.get("/api/chats/:id", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: userId });
    res.status(200).send(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    res.status(500).send("Error fetching chat");
  }
});

// Update chat history with new conversation
app.put("/api/chats/:id", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  const { question, answer, img } = req.body;

  // Add detailed debugging
  console.log("=== PUT /api/chats/:id DEBUG ===");
  console.log("Chat ID:", req.params.id);
  console.log("User ID:", userId);
  console.log("Request body:", JSON.stringify(req.body, null, 2));
  console.log("Question:", question);
  console.log("Answer:", answer);
  console.log("Image:", img);

  // Validate required fields
  if (!answer) {
    console.error("ERROR: Missing required 'answer' field");
    return res.status(400).json({ error: "Missing required 'answer' field" });
  }

  const newItems = [
    ...(question && question.trim()
      ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }]
      : []),
    { role: "model", parts: [{ text: answer }] },
  ];

  console.log("New items to add:", JSON.stringify(newItems, null, 2));

  try {
    // First check if chat exists
    const existingChat = await Chat.findOne({ _id: req.params.id, userId });
    if (!existingChat) {
      console.error("ERROR: Chat not found for user");
      return res.status(404).json({ error: "Chat not found" });
    }

    console.log("Found existing chat:", existingChat._id);

    const updatedChat = await Chat.updateOne(
      { _id: req.params.id, userId },
      {
        $push: {
          history: {
            $each: newItems,
          },
        },
      }
    );

    console.log("Update result:", updatedChat);
    console.log("=== PUT /api/chats/:id SUCCESS ===");

    res.status(200).send(updatedChat);
  } catch (err) {
    console.error("=== PUT /api/chats/:id ERROR ===");
    console.error("Error adding conversation:", err);
    console.error("Error stack:", err.stack);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("=== END ERROR ===");
    res.status(500).send("Error adding conversation!");
  }
});

// נקודת קצה חדשה לעדכון נתוני סשן בלבד
app.put("/api/chats/:id/session", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  const { sessionData } = req.body;

  if (!sessionData) {
    return res.status(400).json({ error: "No session data provided" });
  }

  try {
    const result = await Chat.updateOne(
      { _id: req.params.id, userId },
      { $set: { sessionData } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating session data:", error);
    res.status(500).json({ error: "Failed to update session data" });
  }
});

// Update chat title
app.put("/api/userchats/:id", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  const chatId = req.params.id;
  const { title } = req.body;

  if (!title || title.trim() === "") {
    return res.status(400).send("Title cannot be empty");
  }

  try {
    const result = await UserChats.updateOne(
      { userId, "chats._id": chatId },
      { $set: { "chats.$.title": title } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send("Chat not found");
    }

    res.status(200).send({ success: true });
  } catch (error) {
    console.error("Error updating chat title:", error);
    res.status(500).send("Error updating chat title");
  }
});

// Delete a chat
app.delete("/api/userchats/:id", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  const chatId = req.params.id;

  try {
    const userChatsResult = await UserChats.updateOne(
      { userId },
      { $pull: { chats: { _id: chatId } } }
    );

    const chatResult = await Chat.deleteOne({ _id: chatId, userId });

    if (userChatsResult.modifiedCount === 0 && chatResult.deletedCount === 0) {
      return res.status(404).send("Chat not found");
    }

    res.status(200).send({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).send("Error deleting chat");
  }
});

// Save an itinerary
app.post("/api/itineraries", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  const { chatId, itinerary, structuredItinerary, metadata } = req.body;

  try {
    console.log("=== ITINERARY SAVE PROCESS STARTED ===");
    console.log(
      `[1. REQUEST RECEIVED] Saving itinerary for user: ${userId}, chat: ${chatId}`
    );
    console.log(
      `[1.1] Received structured itinerary: ${
        structuredItinerary ? "Yes" : "No"
      }`
    );
    console.log(`[1.2] Format: ${metadata?.format || "unspecified"}`);
    console.log(
      `[1.3] Raw itinerary text length: ${
        typeof itinerary === "string" ? itinerary.length : "N/A"
      } characters`
    );

    // Debug: Log the structure of the data
    console.log("[2. REQUEST VALIDATION] Validating request data");
    console.log("[2.1] Request parameters:");
    console.log("  - chatId:", chatId);
    console.log("  - userId:", userId);
    console.log("  - metadata:", JSON.stringify(metadata, null, 2));
    console.log(
      "  - structuredItinerary keys:",
      structuredItinerary ? Object.keys(structuredItinerary) : "null"
    );

    // Debug: Log more details about the days and sections
    if (structuredItinerary?.days && structuredItinerary.days.length > 0) {
      console.log(`Itinerary has ${structuredItinerary.days.length} days`);

      // Log details of the first day
      const firstDay = structuredItinerary.days[0];
      console.log("First day:", {
        dayNumber: firstDay.dayNumber,
        title: firstDay.title,
        hasSections: !!firstDay.sections,
        sectionsCount: firstDay.sections?.length || 0,
      });

      // Log details of sections in the first day
      if (firstDay.sections && firstDay.sections.length > 0) {
        console.log(`First day has ${firstDay.sections.length} sections`);

        firstDay.sections.forEach((section, index) => {
          console.log(`Section ${index}:`, {
            timeOfDay: section.timeOfDay,
            time: section.time,
            hasActivities: !!section.activities,
            activitiesCount: Array.isArray(section.activities)
              ? section.activities.length
              : 0,
            hasRestaurant: !!section.restaurant,
            hasOptions: !!section.options,
            optionsCount: Array.isArray(section.options)
              ? section.options.length
              : 0,
          });

          // Log first activity if exists
          if (section.activities && section.activities.length > 0) {
            console.log(`First activity in section ${index}:`, {
              title: section.activities[0].title,
              type: section.activities[0].type,
              hasDescription: !!section.activities[0].description,
            });
          }
        });
      }
    }

    // Check for size limits - MongoDB has a 16MB document size limit
    const estimatedSize = JSON.stringify(structuredItinerary).length;
    console.log(`Estimated structuredItinerary size: ${estimatedSize} bytes`);

    if (estimatedSize > 15 * 1024 * 1024) {
      // 15MB safety limit
      console.error("Itinerary data exceeds MongoDB document size limit");
      return res.status(400).json({
        success: false,
        error: "Itinerary data too large for database storage",
      });
    }

    // Clean up any markdown formatting in the itinerary text
    let cleanItinerary = itinerary;
    if (typeof cleanItinerary === "string") {
      cleanItinerary = cleanItinerary.replace(/```json|```/g, "").trim();
    }

    // Clean up the structured content if needed
    let cleanStructuredItinerary = structuredItinerary;

    // If structuredItinerary is a string (which shouldn't happen but just in case)
    if (typeof structuredItinerary === "string") {
      try {
        const cleanText = structuredItinerary
          .replace(/```json|```/g, "")
          .trim();
        cleanStructuredItinerary = JSON.parse(cleanText);
        console.log("Parsed structuredItinerary from string");
      } catch (error) {
        console.error("Error parsing structuredItinerary string:", error);
      }
    }

    // Ensure we have a valid object even if null was provided
    if (!cleanStructuredItinerary) {
      cleanStructuredItinerary = {};
      console.log("Created empty object for null structuredItinerary");
    }

    // Extract destination from multiple sources and fix incorrect values
    let destinationFromText = null;

    // First try to extract from formatted text
    if (typeof cleanItinerary === "string") {
      // Try to extract destination from formatted text using regex patterns
      const destinationPatterns = [
        /\*\*Destination:\*\*\s+([^\n]+)/,
        /Destination:\s+([^\n]+)/i,
        /Trip to\s+([A-Za-z\s,]+)(?:\.|,|\n)/i,
        /Exploring\s+([A-Za-z\s,]+)(?:\.|,|\n)/i,
        /Experience in\s+([A-Za-z\s,]+)(?:\.|,|\n)/i,
        /Days? in\s+([A-Za-z\s,]+)(?:\.|,|\n)/i,
      ];

      for (const pattern of destinationPatterns) {
        const match = cleanItinerary.match(pattern);
        if (match && match[1]) {
          destinationFromText = match[1].trim();
          console.log(
            `Extracted destination from text: "${destinationFromText}"`
          );
          break;
        }
      }

      // If still not found, try to extract from the title
      if (!destinationFromText) {
        const titleMatch = cleanItinerary.match(
          /^#\s+.*?(?:in|at|to)\s+([A-Za-z\s,]+)(?::|\.|\n)/i
        );
        if (titleMatch && titleMatch[1]) {
          destinationFromText = titleMatch[1].trim();
          console.log(
            `Extracted destination from title: "${destinationFromText}"`
          );
        }
      }

      // If still not found, look for common city names in the text
      if (!destinationFromText) {
        const cityNames = [
          "Berlin",
          "Paris",
          "London",
          "Rome",
          "Barcelona",
          "Madrid",
          "Amsterdam",
          "Prague",
          "Vienna",
          "Budapest",
          "Athens",
          "Istanbul",
          "New York",
          "Tokyo",
          "Kyoto",
          "Bangkok",
          "Singapore",
          "Sydney",
          "Dubai",
          "Cairo",
        ];

        for (const city of cityNames) {
          if (cleanItinerary.includes(city)) {
            destinationFromText = city;
            console.log(`Found city name in text: "${destinationFromText}"`);
            break;
          }
        }
      }
    }

    // List of known incorrect destination values
    const incorrectDestinations = [
      "advance",
      "gourmet experiences",
      "culinary delights",
      "experiences",
      "luxury",
      "historical",
      "cultural",
    ];

    // Determine the final destination value using all available sources
    let cleanDestination;

    // First check if the current destination is incorrect
    if (
      !cleanStructuredItinerary.destination ||
      incorrectDestinations.includes(
        cleanStructuredItinerary.destination.toLowerCase()
      )
    ) {
      // Use the extracted text destination or metadata destination
      cleanDestination = destinationFromText || metadata?.destination;

      if (cleanDestination) {
        console.log(
          `Fixed incorrect destination "${cleanStructuredItinerary.destination}" to "${cleanDestination}"`
        );
        // Update the structured itinerary with the correct destination
        cleanStructuredItinerary.destination = cleanDestination;
      } else {
        cleanDestination = "Unknown Location";
        console.log(
          `Could not determine destination, using default: "${cleanDestination}"`
        );
      }
    } else {
      // Use the existing destination which is valid
      cleanDestination = cleanStructuredItinerary.destination;
      console.log(`Using existing destination: "${cleanDestination}"`);
    }

    // Clean up destination from markdown if needed
    if (
      typeof cleanDestination === "string" &&
      cleanDestination.includes("```")
    ) {
      cleanDestination = cleanDestination.replace(/```json|```/g, "").trim();
    }

    // Extract title from structured itinerary or metadata
    let cleanTitle =
      cleanStructuredItinerary.title || metadata?.title || "Travel Itinerary";

    // Clean up title from markdown if needed
    if (typeof cleanTitle === "string" && cleanTitle.includes("```")) {
      cleanTitle = cleanTitle.replace(/```json|```/g, "").trim();
    }

    // Extract dates
    let fromDate = "";
    let toDate = "";

    // First try to get dates from structuredItinerary
    if (cleanStructuredItinerary.dates) {
      fromDate =
        cleanStructuredItinerary.dates.from ||
        cleanStructuredItinerary.dates.start ||
        "";
      toDate =
        cleanStructuredItinerary.dates.to ||
        cleanStructuredItinerary.dates.end ||
        "";
    }

    // If not found, try metadata
    if ((!fromDate || !toDate) && metadata?.dates) {
      fromDate = fromDate || metadata.dates.from || metadata.dates.start || "";
      toDate = toDate || metadata.dates.to || metadata.dates.end || "";
    }

    // Try to extract dates from text if still not found
    if ((!fromDate || !toDate) && typeof cleanItinerary === "string") {
      const dateMatch = cleanItinerary.match(
        /\*\*Dates:\*\*\s+([^\n]+?)\s+to\s+([^\n]+)/i
      );
      if (dateMatch && dateMatch[1] && dateMatch[2]) {
        fromDate = fromDate || dateMatch[1].trim();
        toDate = toDate || dateMatch[2].trim();
        console.log(`Extracted dates from text: ${fromDate} to ${toDate}`);
      }
    }

    // Ensure days have proper structure with sections
    if (
      cleanStructuredItinerary.days &&
      Array.isArray(cleanStructuredItinerary.days)
    ) {
      cleanStructuredItinerary.days.forEach((day) => {
        // Ensure sections array exists
        if (!day.sections) {
          day.sections = [];
          console.log(`Added missing sections array to day ${day.dayNumber}`);
        }

        // Process each section to ensure proper structure
        if (day.sections && Array.isArray(day.sections)) {
          day.sections.forEach((section, sectionIndex) => {
            // Ensure section has timeOfDay
            if (!section.timeOfDay) {
              section.timeOfDay = getDefaultTimeOfDay(sectionIndex);
              console.log(
                `Added missing timeOfDay "${section.timeOfDay}" to section ${sectionIndex}`
              );
            }

            // Ensure section has time
            if (!section.time) {
              section.time = getDefaultTimeForBlock(
                section.timeOfDay.toLowerCase()
              );
              console.log(
                `Added missing time "${section.time}" to section ${sectionIndex}`
              );
            }

            // Fix activities array if it exists but is empty or undefined
            if (section.activities === undefined) {
              section.activities = [];
              console.log(
                `Added missing activities array to section ${sectionIndex}`
              );
            } else if (!Array.isArray(section.activities)) {
              // Convert to array if not already
              section.activities = [section.activities];
              console.log(
                `Converted activities to array in section ${sectionIndex}`
              );
            }

            // Ensure each activity has required fields
            if (section.activities && Array.isArray(section.activities)) {
              section.activities = section.activities.map(
                (activity, actIndex) => {
                  if (!activity.activityId) {
                    activity.activityId = `activity-${section.timeOfDay.toLowerCase()}-${actIndex}`;
                    console.log(
                      `Added missing activityId to activity ${actIndex} in section ${sectionIndex}`
                    );
                  }

                  // Ensure transition field has proper structure if present
                  if (activity.transition) {
                    if (!activity.transition.mode) {
                      activity.transition.mode = "Walking";
                      console.log(
                        `Added default mode to transition for activity ${actIndex} in section ${sectionIndex}`
                      );
                    }
                    if (!activity.transition.duration) {
                      activity.transition.duration = "10 min";
                      console.log(
                        `Added default duration to transition for activity ${actIndex} in section ${sectionIndex}`
                      );
                    }
                    if (!activity.transition.cost) {
                      activity.transition.cost = { currency: "EUR", amount: 0 };
                      console.log(
                        `Added default cost to transition for activity ${actIndex} in section ${sectionIndex}`
                      );
                    }
                  }

                  return activity;
                }
              );
            }

            // Fix restaurant if needed
            if (section.restaurant && typeof section.restaurant === "object") {
              // Make sure restaurant has required fields
              if (!section.restaurant.activityId) {
                section.restaurant.activityId = `restaurant-${section.timeOfDay.toLowerCase()}`;
                console.log(
                  `Added missing activityId to restaurant in section ${sectionIndex}`
                );
              }
              if (!section.restaurant.name) {
                section.restaurant.name = "Local Restaurant";
                console.log(
                  `Added missing name to restaurant in section ${sectionIndex}`
                );
              }
              if (!section.restaurant.type) {
                section.restaurant.type = "Restaurant";
                console.log(
                  `Added missing type to restaurant in section ${sectionIndex}`
                );
              }

              // Ensure transition field has proper structure if present
              if (section.restaurant.transition) {
                if (!section.restaurant.transition.mode) {
                  section.restaurant.transition.mode = "Walking";
                  console.log(
                    `Added default mode to transition for restaurant in section ${sectionIndex}`
                  );
                }
                if (!section.restaurant.transition.duration) {
                  section.restaurant.transition.duration = "10 min";
                  console.log(
                    `Added default duration to transition for restaurant in section ${sectionIndex}`
                  );
                }
                if (!section.restaurant.transition.cost) {
                  section.restaurant.transition.cost = {
                    currency: "EUR",
                    amount: 0,
                  };
                  console.log(
                    `Added default cost to transition for restaurant in section ${sectionIndex}`
                  );
                }
              }
            }

            // Fix options array if it exists but is empty or undefined
            if (section.options === undefined) {
              section.options = [];
              console.log(
                `Added missing options array to section ${sectionIndex}`
              );
            } else if (!Array.isArray(section.options)) {
              // Convert to array if not already
              section.options = [section.options];
              console.log(
                `Converted options to array in section ${sectionIndex}`
              );
            }

            // Ensure each option has required fields
            if (section.options && Array.isArray(section.options)) {
              section.options = section.options.map((option, optIndex) => {
                if (!option.activityId) {
                  option.activityId = `option-${section.timeOfDay.toLowerCase()}-${optIndex}`;
                  console.log(
                    `Added missing activityId to option ${optIndex} in section ${sectionIndex}`
                  );
                }

                // Ensure transition field has proper structure if present
                if (option.transition) {
                  if (!option.transition.mode) {
                    option.transition.mode = "Taxi";
                    console.log(
                      `Added default mode to transition for option ${optIndex} in section ${sectionIndex}`
                    );
                  }
                  if (!option.transition.duration) {
                    option.transition.duration = "15 min";
                    console.log(
                      `Added default duration to transition for option ${optIndex} in section ${sectionIndex}`
                    );
                  }
                  if (!option.transition.cost) {
                    option.transition.cost = { currency: "EUR", amount: 10 };
                    console.log(
                      `Added default cost to transition for option ${optIndex} in section ${sectionIndex}`
                    );
                  }
                }

                return option;
              });
            }
          });
        }

        // If we have day.activities (legacy format) but no content in sections,
        // try to convert the legacy activities to the new format
        if (
          day.activities &&
          Object.keys(day.activities).length > 0 &&
          (day.sections.length === 0 ||
            !day.sections.some(
              (s) => s.activities?.length || s.restaurant || s.options?.length
            ))
        ) {
          console.log(
            `Converting legacy activities to sections for day ${day.dayNumber}`
          );

          // Convert legacy activities to sections
          const timeBlocks = [
            "morning",
            "lunch",
            "afternoon",
            "evening",
            "dinner",
          ];

          timeBlocks.forEach((timeBlock) => {
            if (
              day.activities[timeBlock] &&
              day.activities[timeBlock].length > 0
            ) {
              const formattedTimeBlock =
                timeBlock.charAt(0).toUpperCase() + timeBlock.slice(1);

              if (timeBlock === "lunch" || timeBlock === "dinner") {
                // Create restaurant section
                const restaurant = day.activities[timeBlock][0];
                if (restaurant) {
                  day.sections.push({
                    timeOfDay: formattedTimeBlock,
                    time: getDefaultTimeForBlock(timeBlock),
                    restaurant: {
                      activityId: `restaurant-${timeBlock}-${
                        restaurant.name
                          ? restaurant.name.toLowerCase().replace(/\s+/g, "-")
                          : "meal"
                      }`,
                      name: restaurant.name || "Restaurant",
                      type: "Restaurant",
                      cuisine: restaurant.description || "Local Cuisine",
                      notes: restaurant.text || "",
                      tags: ["dining"],
                    },
                  });
                }
              } else {
                // Create regular activities section
                const sectionActivities = day.activities[timeBlock].map(
                  (act, index) => ({
                    activityId: `activity-${timeBlock}-${index}`,
                    title: act.name || "Activity",
                    type: act.type || "Activity",
                    description: act.description || act.text || "",
                    tags: [],
                  })
                );

                day.sections.push({
                  timeOfDay: formattedTimeBlock,
                  time: getDefaultTimeForBlock(timeBlock),
                  activities: sectionActivities,
                });
              }
            }
          });

          console.log(
            `Added ${day.sections.length} sections from legacy activities for day ${day.dayNumber}`
          );
        }
      });
    }

    // Check if we have the new JSON v2 format or the old format
    const isNewFormat =
      metadata?.format === "structured-json-v2" ||
      (cleanStructuredItinerary &&
        cleanStructuredItinerary.days &&
        cleanStructuredItinerary.days[0] &&
        cleanStructuredItinerary.days[0].sections);

    console.log(`Using ${isNewFormat ? "NEW" : "OLD"} itinerary format`);

    // Ensure the structuredContent is properly serializable for MongoDB
    // This prevents any circular references or non-serializable objects
    let safeStructuredContent;
    try {
      // First convert to JSON string and back to strip any non-serializable data
      safeStructuredContent = JSON.parse(
        JSON.stringify(cleanStructuredItinerary)
      );
      console.log("Successfully sanitized structuredContent for MongoDB");

      // Log the sections structure after sanitization
      if (safeStructuredContent.days && safeStructuredContent.days.length > 0) {
        const firstDay = safeStructuredContent.days[0];
        if (firstDay.sections && firstDay.sections.length > 0) {
          console.log(
            `After sanitization: first day has ${firstDay.sections.length} sections`
          );
          firstDay.sections.forEach((section, index) => {
            console.log(`After sanitization - Section ${index}:`, {
              timeOfDay: section.timeOfDay,
              activitiesCount: Array.isArray(section.activities)
                ? section.activities.length
                : 0,
              hasRestaurant: !!section.restaurant,
              optionsCount: Array.isArray(section.options)
                ? section.options.length
                : 0,
            });
          });
        }
      }
    } catch (error) {
      console.error("Error sanitizing structuredContent:", error);
      // Create a simplified version with just the essential data
      safeStructuredContent = {
        title: cleanTitle,
        destination: cleanDestination,
        dates: {
          from: fromDate,
          to: toDate,
        },
        format:
          metadata?.format || (isNewFormat ? "structured-json-v2" : "legacy"),
        days: cleanStructuredItinerary?.days || [],
      };
      console.log(
        "Created simplified structuredContent due to serialization error"
      );
    }

    // יצירת רשומת יומן חדשה במודל הנפרד
    const newItinerary = new Itinerary({
      chatId: chatId,
      userId: userId,
      title: cleanTitle,
      destination: cleanDestination,
      duration: metadata?.duration || cleanStructuredItinerary?.duration || "",
      dates: {
        from: fromDate,
        to: toDate,
      },
      rawContent: cleanItinerary,
      structuredContent: safeStructuredContent,
      metadata: {
        ...metadata,
        format:
          metadata?.format || (isNewFormat ? "structured-json-v2" : "legacy"),
        savedAt: new Date().toISOString(),
        destination: cleanDestination, // Ensure metadata also has the correct destination
      },
      version: 1,
    });

    // Debug: Log the validation errors if any
    const validationError = newItinerary.validateSync();
    if (validationError) {
      console.error("Validation error:", validationError);
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: validationError,
      });
    }

    // שמירת היומן במסד הנתונים
    console.log("[7. DATABASE SAVE] Saving itinerary to database");
    console.time("DatabaseSaveTime");
    const savedItinerary = await newItinerary.save();
    console.timeEnd("DatabaseSaveTime");
    console.log(`[7.1] Saved new itinerary with ID: ${savedItinerary._id}`);

    // הוספת קישור ליומן בצ'אט
    console.log("[8. CHAT UPDATE] Updating chat with itinerary reference");
    const updatedChat = await Chat.updateOne(
      { _id: chatId, userId },
      {
        $set: {
          itineraryId: savedItinerary._id,
        },
      }
    );

    if (updatedChat.matchedCount === 0) {
      console.error(
        `[ERROR] No chat found with ID: ${chatId} for user: ${userId}`
      );
      return res.status(404).send("Chat not found");
    }

    console.log(`[8.1] Successfully linked itinerary to chat: ${chatId}`);
    console.log("=== ITINERARY SAVE PROCESS COMPLETED ===");

    res.status(201).json({
      success: true,
      message: "Itinerary saved successfully",
      itineraryId: savedItinerary._id,
    });
  } catch (error) {
    console.error("=== ITINERARY SAVE ERROR ===");
    console.error("[ERROR] Error saving itinerary");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Log more context about the error
    console.error(
      "[ERROR CONTEXT] Error occurred during itinerary save process"
    );
    console.error("ChatId:", chatId);
    console.error("UserId:", userId);
    console.error("Metadata format:", metadata?.format || "unspecified");
    console.error("Has structured itinerary:", !!structuredItinerary);
    console.error("Has raw itinerary:", !!itinerary);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.message,
      });
    }

    res.status(500).send(`Error saving itinerary: ${error.message}`);
  }
});

/**
 * Helper function to get default time of day based on section index
 * @param {number} index - The section index
 * @returns {string} - Default time of day
 */
function getDefaultTimeOfDay(index) {
  const timeOfDays = ["Morning", "Lunch", "Afternoon", "Evening", "Dinner"];
  return index < timeOfDays.length ? timeOfDays[index] : "Activity";
}

/**
 * Helper function to get default time range for a time block
 * @param {string} timeBlock - The time block name
 * @returns {string} - Default time range
 */
function getDefaultTimeForBlock(timeBlock) {
  switch (timeBlock.toLowerCase()) {
    case "morning":
      return "9:00 AM - 1:00 PM";
    case "lunch":
      return "1:00 PM - 2:00 PM";
    case "afternoon":
      return "2:00 PM - 6:00 PM";
    case "evening":
      return "7:00 PM onwards";
    case "dinner":
      return "7:00 PM - 9:00 PM";
    default:
      return "";
  }
}

// Get all itineraries for a user
app.get("/api/itineraries", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;

  try {
    const itineraries = await Itinerary.find({ userId })
      .sort({ createdAt: -1 })
      .select("-rawContent -structuredContent"); // לא מחזירים את כל התוכן כדי לצמצם את גודל התגובה

    res.status(200).json(itineraries);
  } catch (error) {
    console.error("Error fetching itineraries:", error);
    res.status(500).send("Error fetching itineraries");
  }
});

// Get a specific itinerary by ID
app.get("/api/itineraries/:id", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  const itineraryId = req.params.id;

  try {
    const itinerary = await Itinerary.findOne({
      _id: itineraryId,
      $or: [{ userId: userId }, { isPublic: true }],
    });

    if (!itinerary) {
      return res.status(404).send("Itinerary not found");
    }

    res.status(200).json(itinerary);
  } catch (error) {
    console.error("Error fetching itinerary:", error);
    res.status(500).send("Error fetching itinerary");
  }
});

// Update an itinerary
app.put("/api/itineraries/:id", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  const itineraryId = req.params.id;
  const { title, isFavorite, isPublic, tags } = req.body;

  try {
    const updateFields = {};

    if (title !== undefined) updateFields.title = title;
    if (isFavorite !== undefined) updateFields.isFavorite = isFavorite;
    if (isPublic !== undefined) updateFields.isPublic = isPublic;
    if (tags !== undefined) updateFields.tags = tags;

    const updatedItinerary = await Itinerary.findOneAndUpdate(
      { _id: itineraryId, userId: userId },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedItinerary) {
      return res.status(404).send("Itinerary not found");
    }

    res.status(200).json(updatedItinerary);
  } catch (error) {
    console.error("Error updating itinerary:", error);
    res.status(500).send("Error updating itinerary");
  }
});

// Delete an itinerary
app.delete("/api/itineraries/:id", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  const itineraryId = req.params.id;

  try {
    const deletedItinerary = await Itinerary.findOneAndDelete({
      _id: itineraryId,
      userId: userId,
    });

    if (!deletedItinerary) {
      return res.status(404).send("Itinerary not found");
    }

    // Remove reference from chat if it exists
    await Chat.updateMany(
      { itineraryId: itineraryId },
      { $unset: { itineraryId: "" } }
    );

    res.status(200).json({
      success: true,
      message: "Itinerary deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting itinerary:", error);
    res.status(500).send("Error deleting itinerary");
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err.stack);
  res.status(401).send("Authentication error");
});

// Start server
app.listen(port, () => {
  connect();
  console.log(`Server running on port ${port}`);
});

// Add a test endpoint for debugging
app.get("/api/places/test", (req, res) => {
  // Add CORS headers
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  res.json({
    serverRunning: true,
    googlePlacesApiConfigured: !!apiKey,
    apiKeyFirstFiveChars: apiKey ? apiKey.substring(0, 5) + "..." : null,
    timestamp: new Date().toISOString(),
  });
});

// Add this after the existing itinerary routes

// Check for existing itinerary
app.get("/api/itineraries/check", authMiddleware, async (req, res) => {
  try {
    console.log("=== ITINERARY CHECK PROCESS STARTED ===");
    const { chatId } = req.query;
    const userId = req.auth?.userId;

    console.log(
      `[1. CHECK REQUEST] Checking for existing itinerary - ChatId: ${chatId}, UserId: ${userId}`
    );

    if (!chatId) {
      console.error("[ERROR] Missing chatId in check request");
      return res.status(400).json({ error: "Missing chatId parameter" });
    }

    // Query the database
    console.log("[2. DATABASE QUERY] Querying database for existing itinerary");

    const query = { chatId };
    if (userId) {
      query.userId = userId;
    }

    const itinerary = await Itinerary.findOne(query).select(
      "_id metadata destination title"
    );

    if (itinerary) {
      console.log(`[3. RESULT] Found existing itinerary: ${itinerary._id}`);
      console.log(
        `Destination: ${itinerary.destination}, Title: ${itinerary.title}`
      );
      console.log(
        `Metadata format: ${itinerary.metadata?.format || "unspecified"}`
      );
      console.log("=== ITINERARY CHECK PROCESS COMPLETED ===");

      return res.json({
        exists: true,
        itineraryId: itinerary._id,
        metadata: itinerary.metadata,
        destination: itinerary.destination,
      });
    }

    console.log("[3. RESULT] No existing itinerary found");
    console.log("=== ITINERARY CHECK PROCESS COMPLETED ===");

    res.json({ exists: false });
  } catch (error) {
    console.error("[ERROR] Error checking for existing itinerary:", error);
    res.status(500).json({ error: "Failed to check for existing itinerary" });
  }
});

// Save activity endpoint
app.post("/api/activities", async (req, res) => {
  try {
    const { userId, chatId, type, activityData } = req.body;

    console.log("Save activity request:", { userId, chatId, type });

    // Validate required fields with better error reporting
    if (!userId) {
      return res.status(400).json({ error: "Missing userId field" });
    }
    if (!chatId) {
      return res.status(400).json({ error: "Missing chatId field" });
    }
    if (!type) {
      return res.status(400).json({ error: "Missing type field" });
    }
    if (!activityData) {
      return res.status(400).json({ error: "Missing activityData field" });
    }
    if (!activityData.id) {
      return res.status(400).json({ error: "Missing activityData.id field" });
    }

    console.log(
      "Activity data structure:",
      JSON.stringify(activityData, null, 2)
    );

    // Sanitize the activity data to prevent potential MongoDB errors
    // Remove any undefined values and ensure types are correct
    const sanitizedActivityData = {
      id: String(activityData.id || ""),
      name: String(activityData.name || ""),
      rating: String(activityData.rating || ""),
      address: String(activityData.address || ""),
      price: String(activityData.price || ""),
      thumbnail: String(activityData.thumbnail || ""),
      link: String(activityData.link || ""),
      lat: Number(activityData.lat || 0),
      lng: Number(activityData.lng || 0),
    };

    // Check if activity already exists using the new activityType and activityId fields
    const existingActivity = await ActivityModel.findOne({
      userId,
      chatId,
      activityType: type,
      activityId: sanitizedActivityData.id,
    });

    if (existingActivity) {
      // Activity already saved - remove it (toggle functionality)
      console.log("Deleting existing activity:", existingActivity._id);
      await ActivityModel.deleteOne({ _id: existingActivity._id });
      return res
        .status(200)
        .json({ message: "Activity removed successfully", removed: true });
    }

    // Create new activity with sanitized data
    const activity = new ActivityModel({
      userId,
      chatId,
      type,
      activityType: type, // Add explicit activityType field
      activityId: sanitizedActivityData.id, // Add explicit activityId field
      activityData: sanitizedActivityData,
    });

    const savedActivity = await activity.save();
    console.log("Activity saved successfully:", savedActivity._id);

    return res.status(201).json({
      message: "Activity saved successfully",
      activity: savedActivity,
    });
  } catch (error) {
    console.error("Error saving activity:", error);
    // Send more detailed error information for debugging
    return res.status(500).json({
      error: "Failed to save activity",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Get saved activities by chatId
app.get("/api/activities/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({ error: "Missing chatId parameter" });
    }

    console.log("Fetching activities for chatId:", chatId);

    const activities = await ActivityModel.find({ chatId }).sort({
      createdAt: -1,
    });

    console.log(`Found ${activities.length} activities for chatId ${chatId}`);

    return res.status(200).json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return res.status(500).json({
      error: "Failed to fetch activities",
      details: error.message,
    });
  }
});

// Import the SavedTrip model
import SavedTrip from "./models/savedTrips.js";

// Save a trip plan to MongoDB
app.post("/api/trips/save", authMiddleware, async (req, res) => {
  try {
    const { plan, tripDetails, chatId, itineraryData } = req.body;
    const userId = req.auth?.userId || req.body.userId;

    console.log(`Saving trip plan for user ${userId}, chat ${chatId}`);

    if (!plan || !chatId) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "plan and chatId are required",
      });
    }

    // Check if this trip already exists
    const existingTrip = await SavedTrip.findByChatId(chatId, userId);

    if (existingTrip) {
      console.log(`Updating existing trip plan for chat ${chatId}`);

      // Update the existing trip
      existingTrip.plan = plan;
      existingTrip.destination =
        tripDetails?.destination || existingTrip.destination;
      existingTrip.duration = tripDetails?.duration || existingTrip.duration;

      if (tripDetails) {
        existingTrip.tripDetails = tripDetails;
      }

      if (itineraryData) {
        existingTrip.itineraryData = itineraryData;
      }

      existingTrip.lastViewedAt = new Date();
      await existingTrip.save();

      return res.status(200).json({
        success: true,
        message: "Trip plan updated successfully",
        tripId: existingTrip._id,
        isUpdate: true,
      });
    }

    // Create a new saved trip
    const newTrip = new SavedTrip({
      userId,
      chatId,
      plan,
      destination: tripDetails?.destination || "Unknown destination",
      duration: tripDetails?.duration || "Unknown duration",
      tripDetails: tripDetails || {},
      itineraryData: itineraryData || {},
    });

    const savedTrip = await newTrip.save();
    console.log(`New trip plan saved with ID: ${savedTrip._id}`);

    return res.status(201).json({
      success: true,
      message: "Trip plan saved successfully",
      tripId: savedTrip._id,
      isUpdate: false,
    });
  } catch (error) {
    console.error("Error saving trip plan:", error);
    return res.status(500).json({
      error: "Failed to save trip plan",
      details: error.message,
    });
  }
});

// Check if a trip plan is saved
app.get("/api/trips/check/:chatId", authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.auth?.userId;

    if (!chatId) {
      return res.status(400).json({ error: "Missing chatId parameter" });
    }

    const trip = await SavedTrip.findByChatId(chatId, userId);

    return res.json({
      isSaved: !!trip,
      tripId: trip ? trip._id : null,
    });
  } catch (error) {
    console.error("Error checking saved trip:", error);
    return res.status(500).json({ error: "Failed to check saved trip" });
  }
});

// Get all saved trips for a user
app.get("/api/trips/saved", authMiddleware, async (req, res) => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    console.log(`Fetching saved trips for user ${userId}`);

    const trips = await SavedTrip.findByUserId(userId);

    // Return limited data for the list view
    const formattedTrips = trips.map((trip) => ({
      id: trip._id,
      chatId: trip.chatId,
      destination: trip.destination,
      duration: trip.duration,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
      lastViewedAt: trip.lastViewedAt,
    }));

    console.log(
      `Found ${formattedTrips.length} saved trips for user ${userId}`
    );

    return res.status(200).json(formattedTrips);
  } catch (error) {
    console.error("Error fetching saved trips:", error);
    return res.status(500).json({ error: "Failed to fetch saved trips" });
  }
});

// Get a specific saved trip by ID
app.get("/api/trips/saved/:tripId", authMiddleware, async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.auth?.userId;

    if (!tripId) {
      return res.status(400).json({ error: "Missing tripId parameter" });
    }

    console.log(`Fetching saved trip ${tripId} for user ${userId}`);

    const trip = await SavedTrip.findOne({ _id: tripId, userId });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Update last viewed timestamp
    trip.lastViewedAt = new Date();
    await trip.save();

    return res.status(200).json(trip);
  } catch (error) {
    console.error("Error fetching saved trip:", error);
    return res.status(500).json({ error: "Failed to fetch saved trip" });
  }
});

// Delete a saved trip
app.delete("/api/trips/saved/:tripId", authMiddleware, async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.auth?.userId;

    if (!tripId) {
      return res.status(400).json({ error: "Missing tripId parameter" });
    }

    console.log(`Deleting saved trip ${tripId} for user ${userId}`);

    const result = await SavedTrip.deleteOne({ _id: tripId, userId });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ error: "Trip not found or already deleted" });
    }

    return res.status(200).json({
      success: true,
      message: "Trip deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting saved trip:", error);
    return res.status(500).json({ error: "Failed to delete saved trip" });
  }
});
