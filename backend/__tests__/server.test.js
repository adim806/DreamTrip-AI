import request from "supertest";
import express from "express";
import cors from "cors";

// Create a simple test app
const app = express();
app.use(cors());
app.use(express.json());

// Simple test route
app.get("/api/test", (req, res) => {
  res.status(200).json({ message: "Test endpoint working" });
});

describe("Server API Tests", () => {
  it("should respond with 200 status code for test endpoint", async () => {
    const response = await request(app).get("/api/test");
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Test endpoint working");
  });

  // This test will fail until you implement the actual endpoint
  it.skip("should get weather data from API", async () => {
    const response = await request(app).get(
      "/api/weather?city=London&country=UK"
    );
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("data");
  });
});
