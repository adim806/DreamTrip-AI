/**
 * Test script for RAG services
 * Run with Node.js to verify functionality
 */

import { fetchFlightInformation } from "./flightService.js";
import { fetchLocalEvents } from "./eventsService.js";
import { fetchTravelRestrictions } from "./restrictionsService.js";
import {
  fetchCurrencyConversion,
  fetchCostEstimates,
} from "./currencyService.js";

/**
 * Run all tests
 */
const runTests = async () => {
  console.log("🧪 Testing RAG Services...\n");

  // Test Flight Information
  console.log("📊 Testing Flight Information Service:");
  const flightResult = await fetchFlightInformation({
    origin: "New York",
    destination: "London",
    date: "2023-12-15",
  });
  console.log("Success:", flightResult.success);
  console.log("Flights found:", flightResult.flights.length);
  console.log(
    "Sample flight:",
    flightResult.flights[0].airline,
    flightResult.flights[0].flightNumber
  );
  console.log("\n");

  // Test Local Events
  console.log("📊 Testing Local Events Service:");
  const eventsResult = await fetchLocalEvents({
    location: "Paris",
    category: "music",
  });
  console.log("Success:", eventsResult.success);
  console.log("Events found:", eventsResult.events.length);
  console.log("Sample event:", eventsResult.events[0].name);
  console.log("\n");

  // Test Travel Restrictions
  console.log("📊 Testing Travel Restrictions Service:");
  const restrictionsResult = await fetchTravelRestrictions({
    country: "Japan",
  });
  console.log("Success:", restrictionsResult.success);
  console.log("Visa requirements:", restrictionsResult.restrictions.visa);
  console.log("Safety level:", restrictionsResult.safetyAdvisory.level);
  console.log("\n");

  // Test Currency Conversion
  console.log("📊 Testing Currency Conversion Service:");
  const conversionResult = await fetchCurrencyConversion({
    from: "USD",
    to: "EUR",
    amount: 100,
  });
  console.log("Success:", conversionResult.success);
  console.log("Exchange rate:", conversionResult.rate);
  console.log("Converted amount:", conversionResult.converted);
  console.log("\n");

  // Test Cost Estimates
  console.log("📊 Testing Cost Estimates Service:");
  const costResult = await fetchCostEstimates({
    location: "Tokyo",
    budget: "moderate",
  });
  console.log("Success:", costResult.success);
  console.log(
    "Daily cost range:",
    `${costResult.dailyTotal.low}-${costResult.dailyTotal.high} ${costResult.currency}`
  );
  console.log(
    "Average daily cost:",
    `${costResult.dailyTotal.average} ${costResult.currency}`
  );
  console.log("\n");

  console.log("✅ All tests completed!");
};

// Run tests
runTests().catch((err) => {
  console.error("❌ Test failed with error:", err);
});
