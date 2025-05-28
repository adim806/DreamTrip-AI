// Script to test cache specifically for Haifa weather
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

const API_URL = "http://localhost:3000";

async function testHaifaWeather() {
  console.log(
    `${colors.cyan}TESTING CACHE FOR HAIFA WEATHER - IDENTICAL TO CLIENT REQUEST${colors.reset}`
  );

  // Parameters matching exactly what was shown in the client logs
  const params = {
    intent: "Weather-Request",
    city: "Haifa",
    country: "Israel",
    time: "now",
    isCurrentTime: true,
    timeIndicator: "right now",
    isToday: false,
    isTomorrow: false,
    isWeekend: false,
    date: "2025-05-22",
    language: "en",
    location: "Haifa",
  };

  const queryString = new URLSearchParams(params).toString();
  const url = `${API_URL}/api/external/data?${queryString}`;

  console.log(`${colors.blue}URL: ${url}${colors.reset}\n`);

  // First request
  console.log(`${colors.yellow}FIRST REQUEST:${colors.reset}`);
  console.log(
    `${colors.yellow}======================================================${colors.reset}`
  );
  console.log(
    `${colors.yellow}This request should miss the cache and call the external API${colors.reset}`
  );
  console.log(
    `${colors.yellow}Check the server logs for "CACHE MISS" and API calls${colors.reset}`
  );
  console.log(
    `${colors.yellow}======================================================${colors.reset}\n`
  );

  const startFirst = Date.now();

  try {
    const firstResponse = await fetch(url);
    const firstData = await firstResponse.json();
    const firstDuration = Date.now() - startFirst;

    console.log(`${colors.green}✓ First request successful${colors.reset}`);
    console.log(`Duration: ${firstDuration}ms`);

    // Wait 2 seconds to make sure logs are visible
    console.log(`\n${colors.yellow}Waiting 2 seconds...${colors.reset}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Second request - identical
    console.log(`\n${colors.yellow}SECOND REQUEST - IDENTICAL:${colors.reset}`);
    console.log(
      `${colors.yellow}======================================================${colors.reset}`
    );
    console.log(
      `${colors.yellow}This request should HIT the cache and NOT call the external API${colors.reset}`
    );
    console.log(
      `${colors.yellow}Check the server logs for "CACHE HIT" and NO API calls${colors.reset}`
    );
    console.log(
      `${colors.yellow}======================================================${colors.reset}\n`
    );

    const startSecond = Date.now();
    const secondResponse = await fetch(url);
    const secondData = await secondResponse.json();
    const secondDuration = Date.now() - startSecond;

    console.log(`${colors.green}✓ Second request successful${colors.reset}`);
    console.log(`Duration: ${secondDuration}ms`);

    // Calculate the improvement
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

    // Third request with slightly different case to check normalization
    console.log(
      `\n${colors.yellow}THIRD REQUEST - DIFFERENT CASE:${colors.reset}`
    );
    console.log(
      `${colors.yellow}======================================================${colors.reset}`
    );
    console.log(
      `${colors.yellow}This request has "haifa" in lowercase but should still HIT the cache${colors.reset}`
    );
    console.log(
      `${colors.yellow}Check the server logs for "CACHE HIT" and NO API calls${colors.reset}`
    );
    console.log(
      `${colors.yellow}======================================================${colors.reset}\n`
    );

    // Change the case of location/city
    const lowercaseParams = { ...params, city: "haifa", location: "haifa" };
    const lowercaseQueryString = new URLSearchParams(
      lowercaseParams
    ).toString();
    const lowercaseUrl = `${API_URL}/api/external/data?${lowercaseQueryString}`;

    console.log(`${colors.blue}URL: ${lowercaseUrl}${colors.reset}\n`);

    const startThird = Date.now();
    const thirdResponse = await fetch(lowercaseUrl);
    const thirdData = await thirdResponse.json();
    const thirdDuration = Date.now() - startThird;

    console.log(`${colors.green}✓ Third request successful${colors.reset}`);
    console.log(`Duration: ${thirdDuration}ms`);

    if (thirdDuration < 10) {
      console.log(
        `${colors.green}✓ CACHE NORMALIZATION WORKS! Case-insensitive caching is working.${colors.reset}`
      );
    } else {
      console.log(
        `${colors.yellow}⚠ Case-insensitive caching might not be working properly.${colors.reset}`
      );
    }
  } catch (error) {
    console.error(
      `${colors.red}Error during test:${colors.reset}`,
      error.message
    );
  }
}

// Run the test
testHaifaWeather();
