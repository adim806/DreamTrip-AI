/**
 * Simple test script for the LocationResolver
 *
 * Run with: node --experimental-modules tests/locationResolver.test.js
 */

import {
  resolveLocation,
  parseLocationString,
  formatLocation,
} from "../client/src/utils/core/LocationResolver.js";

// Test cases
const testCases = [
  {
    name: "Rome without country",
    input: { location: "Rome" },
    expected: { location: "Rome", country: "Italy" },
  },
  {
    name: "Rome with incorrect country",
    input: { location: "Rome", country: "USA" },
    expected: { locationConflict: true },
  },
  {
    name: "Paris, France",
    input: { location: "Paris", country: "France" },
    expected: { location: "Paris", country: "France" },
  },
  {
    name: "London, UK variation",
    input: { location: "London", country: "UK" },
    expected: { location: "London", country: "United Kingdom" },
  },
  {
    name: "Rome as combined string",
    input: parseLocationString("Rome, Italy"),
    expected: { location: "Rome", country: "Italy" },
  },
  {
    name: "Frankfurt without country",
    input: { location: "Frankfurt" },
    expected: { location: "Frankfurt", country: "Germany" },
  },
  {
    name: "Tokyo with Japanese name",
    input: { location: "Tokyo", country: "Nippon" },
    expected: { location: "Tokyo", country: "Japan" },
  },
];

// Run tests
console.log("Location Resolver Tests\n=====================\n");

testCases.forEach((test) => {
  console.log(`Test: ${test.name}`);
  console.log(`Input: ${JSON.stringify(test.input)}`);

  const result = resolveLocation(test.input);
  console.log(`Result: ${JSON.stringify(result)}`);

  // Check if the result matches expected outcome
  let passed = true;
  Object.keys(test.expected).forEach((key) => {
    if (result[key] !== test.expected[key]) {
      passed = false;
    }
  });

  console.log(`Passed: ${passed ? "✅" : "❌"}`);

  if (result.suggestedLocation) {
    console.log(`Suggestion: ${result.suggestedLocation.message}`);
  }

  console.log("\n");
});

// Test formatting
console.log("Location Formatting Tests\n=====================\n");

const formattingTests = [
  { location: "rome", country: "Italy" },
  { location: "paris", country: "France" },
  { location: "london" },
  { location: "New York", country: "United States" },
];

formattingTests.forEach((loc) => {
  console.log(`Input: ${JSON.stringify(loc)}`);
  console.log(`Formatted: "${formatLocation(loc)}"`);
  console.log("\n");
});

// Test parsing
console.log("Location String Parsing Tests\n=====================\n");

const parsingTests = [
  "Rome, Italy",
  "Tokyo, Japan",
  "Paris, France",
  "London",
  "New York City, USA",
];

parsingTests.forEach((str) => {
  console.log(`Input: "${str}"`);
  console.log(`Parsed: ${JSON.stringify(parseLocationString(str))}`);
  console.log("\n");
});
