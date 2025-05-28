import fetch from "node-fetch";

// Set the base URL for the API
const API_URL = "http://localhost:3000";

/**
 * Performs a test request and measures response time
 * @param {string} url - URL to test
 * @param {string} description - Test description
 * @returns {Promise<Object>} - Test results
 */
async function testRequest(url, description) {
  console.log(`\n=== TEST: ${description} ===`);
  console.log(`URL: ${url}`);

  const start = Date.now();
  try {
    const response = await fetch(url);
    const duration = Date.now() - start;

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Success! Duration: ${duration}ms`);

    return { success: true, duration, data };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, duration: Date.now() - start };
  }
}

/**
 * Tests different time parameter formats to verify caching
 */
async function runTimeParamTests() {
  console.log("\n======= TESTING TIME PARAMETER CACHING =======");

  // Test 1: Original format with isCurrentTime=true
  const test1 = await testRequest(
    `${API_URL}/api/external/weather?location=Berlin&country=Germany&isCurrentTime=true`,
    "Old format with isCurrentTime=true"
  );

  // Test 2: New format with timeContext=now
  const test2 = await testRequest(
    `${API_URL}/api/external/weather?location=Berlin&country=Germany&timeContext=now`,
    "New format with timeContext=now"
  );

  // Test 3: Original format with isToday=true
  const test3 = await testRequest(
    `${API_URL}/api/external/weather?location=Berlin&country=Germany&isToday=true`,
    "Old format with isToday=true"
  );

  // Test 4: New format with timeContext=today
  const test4 = await testRequest(
    `${API_URL}/api/external/weather?location=Berlin&country=Germany&timeContext=today`,
    "New format with timeContext=today"
  );

  // Test 5: Original format with isTomorrow=true
  const test5 = await testRequest(
    `${API_URL}/api/external/weather?location=Berlin&country=Germany&isTomorrow=true`,
    "Old format with isTomorrow=true"
  );

  // Test 6: New format with timeContext=tomorrow
  const test6 = await testRequest(
    `${API_URL}/api/external/weather?location=Berlin&country=Germany&timeContext=tomorrow`,
    "New format with timeContext=tomorrow"
  );

  // Test 7: Original format with time=now
  const test7 = await testRequest(
    `${API_URL}/api/external/weather?location=Berlin&country=Germany&time=now`,
    "Original format with time=now"
  );

  // Test 8: Original format with explicit date
  const today = new Date().toISOString().split("T")[0];
  const test8 = await testRequest(
    `${API_URL}/api/external/weather?location=Berlin&country=Germany&date=${today}`,
    "Using explicit date"
  );

  // Test 9: Mixed formats
  const test9 = await testRequest(
    `${API_URL}/api/external/weather?location=Berlin&country=Germany&time=now&timeContext=now`,
    "Mixed format with time=now and timeContext=now"
  );

  console.log("\n======= TIME PARAMETER TESTS SUMMARY =======");
  console.log(
    `Test 1 (isCurrentTime=true): ${
      test1.success ? "✅ Success" : "❌ Failed"
    } - ${test1.duration}ms`
  );
  console.log(
    `Test 2 (timeContext=now): ${
      test2.success ? "✅ Success" : "❌ Failed"
    } - ${test2.duration}ms`
  );
  console.log(
    `Test 3 (isToday=true): ${test3.success ? "✅ Success" : "❌ Failed"} - ${
      test3.duration
    }ms`
  );
  console.log(
    `Test 4 (timeContext=today): ${
      test4.success ? "✅ Success" : "❌ Failed"
    } - ${test4.duration}ms`
  );
  console.log(
    `Test 5 (isTomorrow=true): ${
      test5.success ? "✅ Success" : "❌ Failed"
    } - ${test5.duration}ms`
  );
  console.log(
    `Test 6 (timeContext=tomorrow): ${
      test6.success ? "✅ Success" : "❌ Failed"
    } - ${test6.duration}ms`
  );
  console.log(
    `Test 7 (time=now): ${test7.success ? "✅ Success" : "❌ Failed"} - ${
      test7.duration
    }ms`
  );
  console.log(
    `Test 8 (explicit date): ${test8.success ? "✅ Success" : "❌ Failed"} - ${
      test8.duration
    }ms`
  );
  console.log(
    `Test 9 (mixed formats): ${test9.success ? "✅ Success" : "❌ Failed"} - ${
      test9.duration
    }ms`
  );

  // Check if all tests share the same response data (indicating they hit the same cache)
  console.log("\n======= CACHE KEY VERIFICATION =======");
  if (test1.success && test2.success) {
    const sameData12 =
      JSON.stringify(test1.data) === JSON.stringify(test2.data);
    console.log(
      `Old format (isCurrentTime=true) and new format (timeContext=now) produce same cache key: ${
        sameData12 ? "✅ Yes" : "❌ No"
      }`
    );
  }

  if (test3.success && test4.success) {
    const sameData34 =
      JSON.stringify(test3.data) === JSON.stringify(test4.data);
    console.log(
      `Old format (isToday=true) and new format (timeContext=today) produce same cache key: ${
        sameData34 ? "✅ Yes" : "❌ No"
      }`
    );
  }

  if (test5.success && test6.success) {
    const sameData56 =
      JSON.stringify(test5.data) === JSON.stringify(test6.data);
    console.log(
      `Old format (isTomorrow=true) and new format (timeContext=tomorrow) produce same cache key: ${
        sameData56 ? "✅ Yes" : "❌ No"
      }`
    );
  }

  if (test1.success && test7.success) {
    const sameData17 =
      JSON.stringify(test1.data) === JSON.stringify(test7.data);
    console.log(
      `isCurrentTime=true and time=now produce same cache key: ${
        sameData17 ? "✅ Yes" : "❌ No"
      }`
    );
  }

  console.log("\n======= TEST COMPLETE =======");
}

// Run the tests
runTimeParamTests();
