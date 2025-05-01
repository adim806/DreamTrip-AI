import dotenv from "dotenv";
import { clerkClient } from "@clerk/clerk-sdk-node";

dotenv.config();

console.log("Testing Clerk configuration:");
console.log("CLERK_SECRET_KEY exists:", !!process.env.CLERK_SECRET_KEY);
console.log("CLERK_JWT_KEY exists:", !!process.env.CLERK_JWT_KEY);
console.log("CLIENT_URL:", process.env.CLIENT_URL);

// Try to use the Clerk client to verify it's properly initialized
try {
  // Basic operation to check if Clerk client is working
  console.log("Testing Clerk client...");
  console.log("Clerk client initialized:", !!clerkClient);
  console.log("Test complete");
} catch (error) {
  console.error("Clerk client error:", error.message);
}
