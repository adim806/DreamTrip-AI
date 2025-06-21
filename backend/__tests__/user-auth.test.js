import request from "supertest";
import mongoose from "mongoose";
import { jest } from "@jest/globals";
import bcrypt from "bcryptjs";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

// Mock של אימות JWT
jest.mock("jsonwebtoken");

// יצירת הסיסמה המוצפנת עבור בדיקות
const hashedTestPassword = bcrypt.hashSync("Password123!", 10);

// Mock של מודל משתמש
const mockUsers = {
  "user@example.com": {
    _id: "user-id-123",
    email: "user@example.com",
    name: "משתמש קיים",
    password: hashedTestPassword,
    roles: ["user"],
  },
  "admin@example.com": {
    _id: "admin-id-456",
    email: "admin@example.com",
    name: "מנהל המערכת",
    password: hashedTestPassword,
    roles: ["user", "admin"],
  },
};

const mockUserFindOne = jest.fn().mockImplementation((criteria) => {
  if (criteria.email && mockUsers[criteria.email]) {
    return Promise.resolve(mockUsers[criteria.email]);
  }
  return Promise.resolve(null);
});

mongoose.model = jest.fn().mockImplementation(() => ({
  findOne: mockUserFindOne,
}));

// מוק של יצירת JWT
jwt.sign.mockImplementation((payload) => {
  return `mocked-jwt-token-for-${payload.userId}`;
});

// יצירת אפליקצית אקספרס לבדיקות
const app = express();
app.use(cors());
app.use(express.json());

// נקודת קצה לבדיקת התחברות
app.post("/api/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // בדיקת תקינות שדות
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "דרושים אימייל וסיסמה",
      });
    }

    // בדיקה אם המשתמש קיים
    const user = await mongoose.model("User").findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "אימייל או סיסמה שגויים",
      });
    }

    // בדיקת סיסמה
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "אימייל או סיסמה שגויים",
      });
    }

    // יצירת טוקן JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        roles: user.roles || ["user"],
      },
      "your-jwt-secret",
      { expiresIn: "1h" }
    );

    // החזרת תגובה
    res.status(200).json({
      success: true,
      message: "התחברות בוצעה בהצלחה",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles || ["user"],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "שגיאה בתהליך ההתחברות",
      error: error.message,
    });
  }
});

describe("User Authentication API", () => {
  beforeEach(() => {
    mockUserFindOne.mockClear();
    jwt.sign.mockClear();
  });

  it("should authenticate a valid user", async () => {
    const userData = {
      email: "user@example.com",
      password: "Password123!",
    };

    const response = await request(app).post("/api/users/login").send(userData);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("token");
    expect(response.body.user).toHaveProperty("email", userData.email);
    expect(response.body.user).not.toHaveProperty("password");
    expect(jwt.sign).toHaveBeenCalledTimes(1);
  });

  it("should not authenticate with wrong password", async () => {
    const userData = {
      email: "user@example.com",
      password: "WrongPassword123!",
    };

    const response = await request(app).post("/api/users/login").send(userData);

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty("success", false);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it("should not authenticate non-existent user", async () => {
    const userData = {
      email: "nonexistent@example.com",
      password: "Password123!",
    };

    const response = await request(app).post("/api/users/login").send(userData);

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty("success", false);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it("should handle missing credentials", async () => {
    const response = await request(app)
      .post("/api/users/login")
      .send({ email: "user@example.com" }); // ללא סיסמה

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("success", false);
  });

  it("should include user roles in token and response", async () => {
    const userData = {
      email: "admin@example.com", // משתמש עם הרשאות מנהל
      password: "Password123!",
    };

    const response = await request(app).post("/api/users/login").send(userData);

    expect(response.statusCode).toBe(200);
    expect(response.body.user).toHaveProperty("roles");
    expect(response.body.user.roles).toContain("admin");

    // בדיקה שהתפקידים נכללו בטוקן
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        roles: expect.arrayContaining(["user", "admin"]),
      }),
      "your-jwt-secret",
      { expiresIn: "1h" }
    );
  });
});
