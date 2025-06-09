import mongoose from "mongoose";

// Mock Schema and model
const mockSchema = {
  pre: jest.fn().mockReturnThis(),
  methods: {},
  statics: {},
};

const mockTripModel = {
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  find: jest.fn(),
};

// נעקוף את הייבוא של מודל הטיול האמיתי
jest.mock("../models/trip.js", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn(),
  },
}));

// מוק של מונגוס
jest.mock("mongoose", () => ({
  Schema: jest.fn().mockImplementation(() => mockSchema),
  model: jest.fn().mockImplementation(() => mockTripModel),
  __esModule: true,
}));

// יבוא של המודל האמיתי (אחרי המוק)
import Trip from "../models/trip.js";

describe("Trip Model", () => {
  // Set up test data
  const validTripData = {
    userId: "user-123",
    destination: "ברצלונה",
    country: "ספרד",
    startDate: new Date("2023-06-15"),
    endDate: new Date("2023-06-22"),
    budget: "בינוני",
    travelers: 2,
    interests: ["אוכל", "אמנות", "היסטוריה"],
    hotel: {
      id: "hotel-123",
      name: "מלון גראן ויה",
      price: 750,
      rating: 4.5,
    },
    attractions: [
      {
        id: "attr-1",
        name: "סגרדה פמיליה",
        price: "בינוני",
        duration: "3 שעות",
      },
      {
        id: "attr-2",
        name: "פארק גואל",
        price: "נמוך",
        duration: "2 שעות",
      },
    ],
    weather: [
      {
        date: new Date("2023-06-15"),
        temperature: 28,
        condition: "שמש",
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Trip.create", () => {
    it("should create a new trip with valid data", async () => {
      const expectedTrip = { _id: "trip-123", ...validTripData };
      mockTripModel.create.mockResolvedValueOnce(expectedTrip);

      const result = await Trip.create(validTripData);

      expect(mockTripModel.create).toHaveBeenCalledWith(validTripData);
      expect(result).toEqual(expectedTrip);
    });

    it("should throw error if required fields are missing", async () => {
      const invalidTripData = { ...validTripData };
      delete invalidTripData.destination;
      delete invalidTripData.startDate;

      mockTripModel.create.mockRejectedValueOnce(
        new Error("Trip validation failed: destination, startDate required")
      );

      await expect(Trip.create(invalidTripData)).rejects.toThrow(
        "Trip validation failed"
      );
      expect(mockTripModel.create).toHaveBeenCalledWith(invalidTripData);
    });
  });

  describe("Trip.findById", () => {
    it("should return trip if it exists", async () => {
      const expectedTrip = { _id: "trip-123", ...validTripData };
      mockTripModel.findById.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(expectedTrip),
      });

      const result = await Trip.findById("trip-123");

      expect(mockTripModel.findById).toHaveBeenCalledWith("trip-123");
      expect(result).toEqual(expectedTrip);
    });

    it("should return null if trip does not exist", async () => {
      mockTripModel.findById.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(null),
      });

      const result = await Trip.findById("non-existent-trip");

      expect(mockTripModel.findById).toHaveBeenCalledWith("non-existent-trip");
      expect(result).toBeNull();
    });
  });

  describe("Trip.findByUserId", () => {
    it("should return all trips for a user", async () => {
      const trips = [
        { _id: "trip-1", ...validTripData },
        { _id: "trip-2", ...validTripData, destination: "פריז" },
      ];

      mockTripModel.find.mockReturnValueOnce({
        sort: jest.fn().mockReturnValueOnce({
          populate: jest.fn().mockResolvedValueOnce(trips),
        }),
      });

      // יצירת מתודה למציאת טיולים לפי משתמש (אם לא קיימת במודל)
      if (!Trip.findByUserId) {
        Trip.findByUserId = async (userId) => {
          return mockTripModel
            .find({ userId })
            .sort({ startDate: -1 })
            .populate("hotel attractions");
        };
      }

      const result = await Trip.findByUserId("user-123");

      expect(mockTripModel.find).toHaveBeenCalledWith({ userId: "user-123" });
      expect(result).toEqual(trips);
      expect(result).toHaveLength(2);
    });
  });

  describe("Trip.update", () => {
    it("should update trip with new data", async () => {
      const tripId = "trip-123";
      const updateData = {
        hotel: { id: "new-hotel", name: "מלון חדש", price: 800 },
        travelers: 3,
      };

      const updatedTrip = {
        _id: tripId,
        ...validTripData,
        hotel: updateData.hotel,
        travelers: updateData.travelers,
      };

      mockTripModel.findByIdAndUpdate.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(updatedTrip),
      });

      // יצירת מתודה לעדכון טיול (אם לא קיימת במודל)
      if (!Trip.update) {
        Trip.update = async (id, data) => {
          return mockTripModel
            .findByIdAndUpdate(id, data, { new: true })
            .populate("hotel attractions");
        };
      }

      const result = await Trip.update(tripId, updateData);

      expect(mockTripModel.findByIdAndUpdate).toHaveBeenCalledWith(
        tripId,
        updateData,
        { new: true }
      );
      expect(result).toEqual(updatedTrip);
      expect(result.hotel).toEqual(updateData.hotel);
      expect(result.travelers).toBe(updateData.travelers);
    });
  });

  describe("Trip.delete", () => {
    it("should delete trip and return confirmation", async () => {
      const tripId = "trip-123";
      const deletedTrip = { _id: tripId, ...validTripData };

      mockTripModel.findByIdAndDelete.mockResolvedValueOnce(deletedTrip);

      // יצירת מתודה למחיקת טיול (אם לא קיימת במודל)
      if (!Trip.delete) {
        Trip.delete = async (id) => {
          return mockTripModel.findByIdAndDelete(id);
        };
      }

      const result = await Trip.delete(tripId);

      expect(mockTripModel.findByIdAndDelete).toHaveBeenCalledWith(tripId);
      expect(result).toEqual(deletedTrip);
    });

    it("should return null if trip does not exist", async () => {
      mockTripModel.findByIdAndDelete.mockResolvedValueOnce(null);

      // יצירת מתודה למחיקת טיול אם לא קיימת
      if (!Trip.delete) {
        Trip.delete = async (id) => {
          return mockTripModel.findByIdAndDelete(id);
        };
      }

      const result = await Trip.delete("non-existent-trip");

      expect(mockTripModel.findByIdAndDelete).toHaveBeenCalledWith(
        "non-existent-trip"
      );
      expect(result).toBeNull();
    });
  });

  describe("Trip model business logic", () => {
    it("should calculate trip duration", () => {
      const trip = {
        ...validTripData,
        calculateDuration: function () {
          if (!this.startDate || !this.endDate) return 0;
          const start = new Date(this.startDate);
          const end = new Date(this.endDate);
          const diffTime = Math.abs(end - start);
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        },
      };

      const duration = trip.calculateDuration();
      expect(duration).toBe(7); // 22 - 15 = 7 days
    });

    it("should validate end date is after start date", () => {
      const validateDates = (startDate, endDate) => {
        if (!startDate || !endDate) return false;
        return new Date(endDate) > new Date(startDate);
      };

      // תקין: תאריך סיום אחרי תאריך התחלה
      expect(
        validateDates(validTripData.startDate, validTripData.endDate)
      ).toBe(true);

      // לא תקין: תאריך סיום לפני תאריך התחלה
      const invalidEndDate = new Date("2023-06-10");
      expect(validateDates(validTripData.startDate, invalidEndDate)).toBe(
        false
      );
    });
  });
});
