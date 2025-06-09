import request from "supertest";
import express from "express";
import cors from "cors";
import { jest } from "@jest/globals";
import mongoose from "mongoose";

// Mock models
const mockUser = {
  _id: "user-123",
  email: "test@example.com",
  name: "Test User",
};

jest.mock("../models/user", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockUser),
}));

// Mock data services
jest.mock("../services/weatherService", () => ({
  __esModule: true,
  default: {
    getWeatherForecast: jest.fn().mockResolvedValue({
      forecast: [
        { date: "2023-06-15", temp: 28, condition: "שמש" },
        { date: "2023-06-16", temp: 27, condition: "שמש חלקי" },
      ],
    }),
  },
}));

jest.mock("../services/hotelService", () => ({
  __esModule: true,
  default: {
    searchHotels: jest.fn().mockResolvedValue({
      hotels: [
        {
          id: "hotel-123",
          name: "מלון גראן ויה",
          stars: 4,
          price: 750,
          image: "https://example.com/hotel.jpg",
          address: "גראן ויה 123, ברצלונה",
          rating: 4.5,
        },
      ],
    }),
  },
}));

jest.mock("../services/attractionService", () => ({
  __esModule: true,
  default: {
    searchAttractions: jest.fn().mockResolvedValue({
      attractions: [
        {
          id: "attr-1",
          name: "סגרדה פמיליה",
          type: "אתר תיירות",
          price: "בינוני",
          image: "https://example.com/sagrada.jpg",
          description: "הכנסייה הגותית המפורסמת של גאודי",
        },
      ],
    }),
  },
}));

// Mock Trip model
const mockTrip = {
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock("../models/trip", () => ({
  __esModule: true,
  default: mockTrip,
}));

// מוק עבור שירות אימות
const authMiddleware = (req, res, next) => {
  req.user = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  };
  next();
};

jest.mock("../middlewares/auth", () => ({
  __esModule: true,
  default: authMiddleware,
}));

// יצירת אפליקציה לבדיקות אינטגרציה
const app = express();
app.use(cors());
app.use(express.json());

// נתיב API לקבלת מזג אוויר
app.get("/api/weather", async (req, res) => {
  try {
    const { city, country, date } = req.query;

    if (!city || !country) {
      return res.status(400).json({
        success: false,
        message: "חסרים פרמטרים נדרשים",
      });
    }

    const weatherService = (await import("../services/weatherService")).default;
    const weatherData = await weatherService.getWeatherForecast(
      city,
      country,
      date
    );

    res.json({
      success: true,
      data: weatherData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "אירעה שגיאה בקבלת נתוני מזג אוויר",
      error: error.message,
    });
  }
});

// נתיב API לחיפוש מלונות
app.get("/api/hotels", async (req, res) => {
  try {
    const { city, country, budget } = req.query;

    if (!city || !country) {
      return res.status(400).json({
        success: false,
        message: "חסרים פרמטרים נדרשים",
      });
    }

    const hotelService = (await import("../services/hotelService")).default;
    const hotelsData = await hotelService.searchHotels(city, country, budget);

    res.json({
      success: true,
      data: hotelsData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "אירעה שגיאה בחיפוש מלונות",
      error: error.message,
    });
  }
});

// נתיב API לחיפוש אטרקציות
app.get("/api/attractions", async (req, res) => {
  try {
    const { city, country, category } = req.query;

    if (!city || !country) {
      return res.status(400).json({
        success: false,
        message: "חסרים פרמטרים נדרשים",
      });
    }

    const attractionService = (await import("../services/attractionService"))
      .default;
    const attractionsData = await attractionService.searchAttractions(
      city,
      country,
      category
    );

    res.json({
      success: true,
      data: attractionsData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "אירעה שגיאה בחיפוש אטרקציות",
      error: error.message,
    });
  }
});

// נתיב API ליצירת תכנון טיול
app.post("/api/trips", (req, res) => {
  try {
    const tripData = {
      ...req.body,
      userId: req.user.id,
    };

    // בדיקת תקינות שדות חובה
    if (!tripData.destination || !tripData.startDate || !tripData.endDate) {
      return res.status(400).json({
        success: false,
        message: "חסרים פרטי טיול הכרחיים",
      });
    }

    // יצירת הטיול במסד הנתונים
    const newTrip = {
      _id: "trip-123",
      ...tripData,
      createdAt: new Date(),
    };

    mockTrip.create.mockReturnValue(newTrip);

    res.status(201).json({
      success: true,
      message: "תכנית הטיול נשמרה בהצלחה",
      trip: newTrip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "אירעה שגיאה בשמירת הטיול",
      error: error.message,
    });
  }
});

// בדיקות אינטגרציה
describe("Trip Planning Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Weather API Integration", () => {
    it("should fetch weather data for a destination", async () => {
      const response = await request(app).get("/api/weather").query({
        city: "ברצלונה",
        country: "ספרד",
        date: "2023-06-15",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data.forecast");
      expect(response.body.data.forecast).toHaveLength(2);

      const weatherService = (await import("../services/weatherService"))
        .default;
      expect(weatherService.getWeatherForecast).toHaveBeenCalledWith(
        "ברצלונה",
        "ספרד",
        "2023-06-15"
      );
    });

    it("should return 400 if required weather parameters are missing", async () => {
      const response = await request(app)
        .get("/api/weather")
        .query({ city: "ברצלונה" }); // חסר פרמטר country

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("Hotels API Integration", () => {
    it("should fetch hotel options for a destination", async () => {
      const response = await request(app).get("/api/hotels").query({
        city: "ברצלונה",
        country: "ספרד",
        budget: "בינוני",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data.hotels");
      expect(response.body.data.hotels).toHaveLength(1);
      expect(response.body.data.hotels[0].name).toBe("מלון גראן ויה");

      const hotelService = (await import("../services/hotelService")).default;
      expect(hotelService.searchHotels).toHaveBeenCalledWith(
        "ברצלונה",
        "ספרד",
        "בינוני"
      );
    });
  });

  describe("Attractions API Integration", () => {
    it("should fetch attractions for a destination", async () => {
      const response = await request(app).get("/api/attractions").query({
        city: "ברצלונה",
        country: "ספרד",
        category: "היסטוריה",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data.attractions");
      expect(response.body.data.attractions).toHaveLength(1);
      expect(response.body.data.attractions[0].name).toBe("סגרדה פמיליה");

      const attractionService = (await import("../services/attractionService"))
        .default;
      expect(attractionService.searchAttractions).toHaveBeenCalledWith(
        "ברצלונה",
        "ספרד",
        "היסטוריה"
      );
    });
  });

  describe("Trip Creation Integration", () => {
    it("should create a complete trip plan", async () => {
      // הגדרות הנתונים שיוחזרו מהמודל
      const createdTrip = {
        _id: "trip-123",
        userId: "user-123",
        destination: "ברצלונה",
        country: "ספרד",
        startDate: new Date("2023-06-15"),
        endDate: new Date("2023-06-22"),
        budget: "בינוני",
        travelers: 2,
        hotel: {
          id: "hotel-123",
          name: "מלון גראן ויה",
          price: 750,
        },
        attractions: [
          {
            id: "attr-1",
            name: "סגרדה פמיליה",
            price: "בינוני",
          },
        ],
        weather: [
          {
            date: new Date("2023-06-15"),
            temp: 28,
            condition: "שמש",
          },
        ],
      };

      mockTrip.create.mockResolvedValueOnce(createdTrip);

      const tripData = {
        destination: "ברצלונה",
        country: "ספרד",
        startDate: "2023-06-15",
        endDate: "2023-06-22",
        budget: "בינוני",
        travelers: 2,
        hotel: {
          id: "hotel-123",
          name: "מלון גראן ויה",
          price: 750,
        },
        attractions: [
          {
            id: "attr-1",
            name: "סגרדה פמיליה",
            price: "בינוני",
          },
        ],
      };

      const response = await request(app).post("/api/trips").send(tripData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("trip");

      // וידוא שהמודל נקרא עם הנתונים הנכונים
      expect(mockTrip.create).toHaveBeenCalledWith({
        ...tripData,
        userId: "user-123",
      });
    });

    it("should return 400 if required trip parameters are missing", async () => {
      const invalidTripData = {
        // חסרים destination ו-startDate
        endDate: "2023-06-22",
        budget: "בינוני",
      };

      const response = await request(app)
        .post("/api/trips")
        .send(invalidTripData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty("success", false);
      expect(mockTrip.create).not.toHaveBeenCalled();
    });
  });

  describe("End-to-end Trip Planning Flow", () => {
    it("should handle the complete trip planning process", async () => {
      // 1. קבלת מזג אוויר
      const weatherResponse = await request(app).get("/api/weather").query({
        city: "ברצלונה",
        country: "ספרד",
        date: "2023-06-15",
      });

      expect(weatherResponse.statusCode).toBe(200);
      const weatherData = weatherResponse.body.data;

      // 2. חיפוש מלונות
      const hotelsResponse = await request(app).get("/api/hotels").query({
        city: "ברצלונה",
        country: "ספרד",
        budget: "בינוני",
      });

      expect(hotelsResponse.statusCode).toBe(200);
      const hotelData = hotelsResponse.body.data.hotels[0];

      // 3. חיפוש אטרקציות
      const attractionsResponse = await request(app)
        .get("/api/attractions")
        .query({
          city: "ברצלונה",
          country: "ספרד",
          category: "היסטוריה",
        });

      expect(attractionsResponse.statusCode).toBe(200);
      const attractionData = attractionsResponse.body.data.attractions[0];

      // 4. יצירת תכנון טיול
      const createdTrip = {
        _id: "trip-123",
        userId: "user-123",
        destination: "ברצלונה",
        country: "ספרד",
        startDate: "2023-06-15",
        endDate: "2023-06-22",
        budget: "בינוני",
        travelers: 2,
        hotel: hotelData,
        attractions: [attractionData],
        weather: weatherData.forecast,
      };

      mockTrip.create.mockResolvedValueOnce(createdTrip);

      const tripData = {
        destination: "ברצלונה",
        country: "ספרד",
        startDate: "2023-06-15",
        endDate: "2023-06-22",
        budget: "בינוני",
        travelers: 2,
        hotel: hotelData,
        attractions: [attractionData],
      };

      const tripResponse = await request(app).post("/api/trips").send(tripData);

      expect(tripResponse.statusCode).toBe(201);
      expect(tripResponse.body).toHaveProperty("success", true);
      expect(tripResponse.body).toHaveProperty("trip");
      expect(tripResponse.body.trip._id).toBe("trip-123");
      expect(tripResponse.body.trip.hotel.id).toBe("hotel-123");
      expect(tripResponse.body.trip.attractions[0].id).toBe("attr-1");
    });
  });
});
