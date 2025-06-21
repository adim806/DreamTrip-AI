// Simple script to test the caching functionality
import fetch from "node-fetch";

// Colors for console output
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
};

// Base URL for the API
const API_URL = "http://localhost:3000";

// Test function to make identical requests and check timing
async function testCache(endpoint, params, description) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_URL}${endpoint}?${queryString}`;

  console.log(`\n${colors.magenta}===== TESTING CACHE: ${description} =====`);
  console.log(`${colors.blue}URL: ${url}${colors.reset}\n`);

  // First request (should miss cache)
  console.log(
    `${colors.yellow}FIRST REQUEST (should miss cache):${colors.reset}`
  );
  const startFirst = Date.now();
  try {
    const firstResponse = await fetch(url);
    const firstData = await firstResponse.json();
    const firstDuration = Date.now() - startFirst;

    console.log(`${colors.green}✓ First request successful${colors.reset}`);
    console.log(`Duration: ${firstDuration}ms`);
    console.log(
      `Data received: ${JSON.stringify(firstData).substring(0, 100)}...`
    );

    // Wait a moment to make sure logs are visible
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Second request (should hit cache)
    console.log(
      `\n${colors.yellow}SECOND REQUEST (should hit cache):${colors.reset}`
    );
    const startSecond = Date.now();

    const secondResponse = await fetch(url);
    const secondData = await secondResponse.json();
    const secondDuration = Date.now() - startSecond;

    console.log(`${colors.green}✓ Second request successful${colors.reset}`);
    console.log(`Duration: ${secondDuration}ms`);

    // Calculate the improvement percentage
    const improvement = (
      ((firstDuration - secondDuration) / firstDuration) *
      100
    ).toFixed(2);

    console.log(`\n${colors.cyan}RESULTS:${colors.reset}`);
    console.log(`First request: ${firstDuration}ms`);
    console.log(`Second request: ${secondDuration}ms`);
    console.log(
      `${colors.green}Improvement: ${improvement}% faster${colors.reset}`
    );

    if (secondDuration < firstDuration) {
      console.log(
        `${colors.green}✓ CACHE IS WORKING! Second request was faster.${colors.reset}`
      );
    } else {
      console.log(
        `${colors.yellow}⚠ Unexpected result: Second request was not faster.${colors.reset}`
      );
    }

    return {
      firstDuration,
      secondDuration,
      improvement,
    };
  } catch (error) {
    console.error(
      `${colors.red}Error during test:${colors.reset}`,
      error.message
    );
  }
}

async function runTests() {
  console.log(`${colors.cyan}STARTING CACHE TESTS${colors.reset}`);
  console.log(
    `${colors.yellow}Make sure your server is running on http://localhost:3000${colors.reset}\n`
  );

  // Test 1: Weather data
  await testCache(
    "/api/external/weather",
    {
      location: "Tel Aviv",
      country: "Israel",
    },
    "Weather Data for Tel Aviv"
  );

  // Test 2: Hotel data
  await testCache(
    "/api/external/hotels",
    {
      location: "Paris",
      budget_level: "moderate",
    },
    "Hotel Data for Paris"
  );

  // Test 3: Attractions data
  await testCache(
    "/api/external/attractions",
    {
      location: "Rome",
      country: "Italy",
    },
    "Attractions Data for Rome"
  );

  // Test 4: Generic endpoint with intent
  await testCache(
    "/api/external/data",
    {
      intent: "Weather-Request",
      location: "London",
      country: "UK",
    },
    "Generic Endpoint with Weather Intent for London"
  );

  // Add a new test specifically for Gedera, Israel
  await testCache(
    "/api/external/weather",
    {
      location: "Gedera",
      country: "Israel",
    },
    "Weather Data for Gedera, Israel"
  );

  // Test with slight variations in capitalization and spacing to verify normalization
  await testCache(
    "/api/external/weather",
    {
      location: "gedera",
      country: "israel",
    },
    "Weather Data for gedera, israel (lowercase)"
  );

  await testCache(
    "/api/external/weather",
    {
      location: " Gedera ",
      country: " Israel ",
    },
    "Weather Data for Gedera with extra spaces"
  );

  console.log(`\n${colors.magenta}===== ALL TESTS COMPLETED =====`);
  console.log(
    `${colors.cyan}Check the server logs to confirm "Cache hit" messages.${colors.reset}`
  );
}

// Run the tests
runTests();
