/**
 * Utilities for generating detailed trip itineraries
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Generates a structured prompt for trip itinerary creation
 * @param {Object} tripDetails - The complete trip details
 * @returns {string} - A formatted prompt for the AI model
 */
export const generateItineraryPrompt = (tripDetails) => {
  if (!tripDetails) {
    return "Please provide trip details to generate an itinerary.";
  }

  // Extract key data from trip details
  const {
    vacation_location,
    duration,
    dates,
    constraints = {},
    preferences = {},
    notes,
  } = tripDetails;

  // Calculate today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // Calculate if this is a current/upcoming trip or a future trip
  let tripTiming = "Planned for the future";
  if (dates?.from) {
    const tripDate = new Date(dates.from);
    const currentDate = new Date();
    const diffTime = tripDate - currentDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) {
      tripTiming = "Coming very soon (within a week)";
    } else if (diffDays <= 30) {
      tripTiming = "Coming soon (within a month)";
    }
  }

  // Convert budget level to standardized format
  let standardizedBudget = "Not specified";
  if (constraints.budget) {
    const budgetLower = constraints.budget.toLowerCase();
    console.log(
      `[ItineraryGenerator] Processing budget: "${constraints.budget}"`
    );

    if (
      budgetLower === "luxury" ||
      budgetLower.includes("luxury") ||
      budgetLower.includes("high") ||
      budgetLower.includes("premium") ||
      budgetLower.includes("expensive")
    ) {
      standardizedBudget = "Luxury/Premium";
      console.log(
        `[ItineraryGenerator] Standardized budget to: "Luxury/Premium"`
      );
    } else if (
      budgetLower === "moderate" ||
      budgetLower.includes("moderate") ||
      budgetLower.includes("medium") ||
      budgetLower.includes("standard")
    ) {
      standardizedBudget = "Moderate/Standard";
      console.log(
        `[ItineraryGenerator] Standardized budget to: "Moderate/Standard"`
      );
    } else if (
      budgetLower === "cheap" ||
      budgetLower.includes("budget") ||
      budgetLower.includes("low") ||
      budgetLower.includes("cheap") ||
      budgetLower.includes("economy")
    ) {
      standardizedBudget = "Budget/Economy";
      console.log(
        `[ItineraryGenerator] Standardized budget to: "Budget/Economy"`
      );
    } else {
      standardizedBudget = constraints.budget;
      console.log(
        `[ItineraryGenerator] Using original budget: "${standardizedBudget}"`
      );
    }
  } else if (tripDetails.budget) {
    // If constraints.budget is not set but tripDetails.budget is, use that instead
    const budgetLower = tripDetails.budget.toLowerCase();
    console.log(
      `[ItineraryGenerator] Using tripDetails.budget: "${tripDetails.budget}"`
    );

    if (
      budgetLower === "luxury" ||
      budgetLower.includes("luxury") ||
      budgetLower.includes("high") ||
      budgetLower.includes("premium") ||
      budgetLower.includes("expensive")
    ) {
      standardizedBudget = "Luxury/Premium";
      console.log(
        `[ItineraryGenerator] Standardized tripDetails.budget to: "Luxury/Premium"`
      );
    } else if (
      budgetLower === "moderate" ||
      budgetLower.includes("moderate") ||
      budgetLower.includes("medium") ||
      budgetLower.includes("standard")
    ) {
      standardizedBudget = "Moderate/Standard";
      console.log(
        `[ItineraryGenerator] Standardized tripDetails.budget to: "Moderate/Standard"`
      );
    } else if (
      budgetLower === "cheap" ||
      budgetLower.includes("budget") ||
      budgetLower.includes("low") ||
      budgetLower.includes("cheap") ||
      budgetLower.includes("economy")
    ) {
      standardizedBudget = "Budget/Economy";
      console.log(
        `[ItineraryGenerator] Standardized tripDetails.budget to: "Budget/Economy"`
      );
    } else {
      standardizedBudget = tripDetails.budget;
      console.log(
        `[ItineraryGenerator] Using original tripDetails.budget: "${standardizedBudget}"`
      );
    }
  }

  // Format dates in ISO format if available
  let formattedDates = {};
  if (dates?.from) {
    try {
      const fromDate = new Date(dates.from);
      const toDate = new Date(dates.to);
      formattedDates = {
        start: fromDate.toISOString().split("T")[0],
        end: toDate.toISOString().split("T")[0],
      };
    } catch (e) {
      formattedDates = { start: dates.from, end: dates.to };
    }
  }

  // Build the structured prompt for the AI - only dynamic trip information
  let prompt = `
Create a detailed JSON itinerary for:

DESTINATION: ${vacation_location || "Not specified"}
DURATION: ${duration || "Not specified"} days
DATES: ${dates?.from ? `From ${dates.from} to ${dates.to}` : "Not specified"}
BUDGET: ${standardizedBudget}
`;

  if (constraints) {
    if (constraints.travel_type) {
      prompt += `\nTRAVEL TYPE: ${constraints.travel_type}`;
    }
    if (constraints.preferred_activity) {
      prompt += `\nPREFERRED ACTIVITIES: ${constraints.preferred_activity}`;
    }

    if (
      constraints.special_requirements &&
      constraints.special_requirements.length > 0
    ) {
      prompt += `\nSPECIAL REQUIREMENTS: ${constraints.special_requirements.join(
        ", "
      )}`;
    }
  }

  if (preferences) {
    if (preferences.hotel_preferences) {
      prompt += `\nACCOMMODATION PREFERENCES (IMPORTANT): ${preferences.hotel_preferences}`;
    } else {
      // הוסף הוראה ברירת מחדל אם אין העדפות מלון
      prompt +=
        "\nACCOMMODATION (IMPORTANT): Please include appropriate hotel or accommodation options with check-in on first day and check-out on last day";
    }
    if (preferences.dining_preferences) {
      prompt += `\nDINING PREFERENCES: ${preferences.dining_preferences}`;
    }
    if (preferences.transportation_mode) {
      prompt += `\nTRANSPORTATION: ${preferences.transportation_mode}`;
    }
  } else {
    // אם אין העדפות כלל, הוסף הוראת ברירת מחדל למלון
    prompt +=
      "\nACCOMMODATION (IMPORTANT): Please include appropriate hotel or accommodation options with check-in on first day and check-out on last day";
  }

  if (notes) {
    prompt += `\nADDITIONAL NOTES: ${notes}`;
  }

  // Add special handling instructions for specific requirements
  if (constraints.special_requirements) {
    prompt += "\n\nSPECIAL HANDLING:";

    if (
      constraints.special_requirements.includes("Eco-Friendly") ||
      constraints.special_requirements.includes("אקולוגי")
    ) {
      prompt +=
        "\n- Prioritize eco-friendly activities and sustainable dining options";
      prompt += "\n- Add 'eco-friendly' tag to appropriate activities";
    }

    if (
      constraints.special_requirements.includes("Kid-Friendly") ||
      constraints.special_requirements.includes("ילדים")
    ) {
      prompt +=
        "\n- Include only kid-friendly activities with appropriate pacing";
      prompt +=
        "\n- Add 'family-friendly' and 'kid-friendly' tags to appropriate activities";
    }

    if (
      constraints.special_requirements.includes(
        "Accessible for Disabilities"
      ) ||
      constraints.special_requirements.includes("נגישות")
    ) {
      prompt += "\n- Only include venues with confirmed accessibility";
      prompt += "\n- Add 'accessible' tag to appropriate activities";
    }

    if (
      constraints.special_requirements.includes("Romantic") ||
      constraints.special_requirements.includes("רומנטי")
    ) {
      prompt += "\n- Focus on romantic settings and intimate experiences";
      prompt += "\n- Add 'romantic' tag to appropriate activities";
    }
  }

  prompt +=
    "\n\nReturn your response as a valid JSON object following the structure provided in your instructions.";

  return prompt;
};

/**
 * Generates a detailed itinerary based on trip details
 * @param {Object} tripDetails - The complete trip details
 * @returns {Promise<Object>} - The generated itinerary or error object
 */
export const generateItinerary = async (tripDetails) => {
  try {
    console.log("Generating itinerary for:", tripDetails);
    console.log("=== ITINERARY GENERATION PROCESS STARTED ===");

    // Create the AI model with specialized system instruction for JSON itinerary generation
    const genAI = new GoogleGenerativeAI(
      import.meta.env.VITE_GEMINI_PUBLIC_KEY
    );
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `
      You are a specialized travel planner that creates detailed, structured travel itineraries in JSON format.
      Your task is to create comprehensive travel plans that include specific details about activities, 
      restaurants, and practical information.

      ## JSON Structure Guidelines:

      1. **Always return valid JSON**: Ensure the response is properly formatted JSON with no syntax errors
      2. **Follow the exact structure**: Match the requested JSON schema precisely
      3. **Create unique IDs**: Generate meaningful IDs for days and activities
      4. **Include geographic coordinates**: Provide accurate latitude and longitude for all locations
      5. **Add relevant tags**: Categorize activities with appropriate tags
      6. **Provide cost estimates**: Include realistic price estimates in local currency
      7. **Provide practical tips**: Add useful visitor information for each activity
      8. **Respect budget level**: Tailor recommendations to match the specified budget
      9. **DO NOT include explanatory text**: Return ONLY the JSON object

      ## Content Guidelines:
      0. **Always ensure smooth flow and realistic timing between activities**
      1. **CRITICAL: You MUST include hotel accommodation with check-in time on the first day and check-out time on the last day**
      2. **Every itinerary MUST have at least one hotel/accommodation included - this is mandatory**
      3. **Insert transitions between far-away locations with mode of travel and estimated duration**
      4. **Adapt plan to user's daily rhythm, and avoid unnecessary back-and-forth between areas**
      5. **Balance must-see attractions with local experiences**
      6. **Group activities by geographic proximity when possible**
      7. **Include practical tips specific to each attraction**
      8. **Consider the logistics and flow between activities**
      9. **Provide alternatives where appropriate**
      10. **Respect any special requirements (accessibility, family-friendly, etc.)**
      11. **Always include transportation transitions between activities**

      ## Required JSON Structure:

      {
        "destination": "City name",
        "title": "Descriptive title for the itinerary",
        "dates": {
          "start": "YYYY-MM-DD",
          "end": "YYYY-MM-DD"
        },
        "budget": "Budget category (Luxury/Premium, Moderate/Standard, or Budget/Economy)",
        "days": [
          {
            "dayId": "unique-id-for-day",
            "dayNumber": 1,
            "title": "Thematic title for the day",
            "theme": "Brief description of the day's focus",
            "sections": [
              {
                "timeOfDay": "Morning",
                "time": "9:00 AM - 1:00 PM",
                "activities": [
                  {
                    "activityId": "unique-id-for-activity",
                    "title": "Name of attraction or activity",
                    "type": "Category (Landmark, Museum, etc.)",
                    "description": "Brief description",
                    "tip": "Practical advice for visitors",
                    "alternative": "Optional alternative activity",
                    "location": {
                      "lat": 52.5163,
                      "lng": 13.3777
                    },
                    "tags": ["history", "art", "outdoor"],
                    "estimatedCost": {
                      "currency": "EUR",
                      "amount": 15
                    },
                    "transition": {
                      "mode": "Walking/Public Transport/Taxi/etc.",
                      "duration": "15 min",
                      "description": "Brief description of the transportation between this and the next activity",
                      "cost": {
                        "currency": "EUR",
                        "amount": 5
                      }
                    }
                  }
                ]
              },
              {
                "timeOfDay": "Lunch",
                "time": "1:00 PM - 2:00 PM",
                "restaurant": {
                  "activityId": "unique-id-for-lunch",
                  "name": "Restaurant name",
                  "type": "Restaurant",
                  "cuisine": "Cuisine type",
                  "tags": ["fine-dining", "local"],
                  "estimatedCost": {
                    "currency": "EUR",
                    "amount": 30
                  },
                  "notes": "Brief description or highlights",
                  "transition": {
                    "mode": "Walking/Public Transport/Taxi/etc.",
                    "duration": "10 min",
                    "description": "Brief description of the transportation to the next activity",
                    "cost": {
                      "currency": "EUR",
                      "amount": 0
                    }
                  }
                }
              },
              {
                "timeOfDay": "Afternoon",
                "time": "2:00 PM - 6:00 PM",
                "activities": []
              },
              {
                "timeOfDay": "Evening",
                "time": "7:00 PM onwards",
                "options": [
                  {
                    "activityId": "unique-id-for-evening-option",
                    "type": "Restaurant/Bar/Entertainment",
                    "place": "Venue name",
                    "description": "Brief description",
                    "tags": ["dining", "entertainment"],
                    "estimatedCost": {
                      "currency": "EUR",
                      "amount": 50
                    },
                    "transition": {
                      "mode": "Taxi",
                      "duration": "15 min",
                      "description": "Take a taxi back to your hotel",
                      "cost": {
                        "currency": "EUR",
                        "amount": 15
                      }
                    }
                  }
                ]
              }
            ]
          }
        ]
      }

      IMPORTANT: You MUST complete the entire JSON structure with all days and activities before returning. Never return a partial or incomplete response.
      Your ENTIRE response must be a single, valid JSON object with no additional text.
      Always include closing braces for all objects and arrays.
        `,
    });

    // Generate a prompt based on trip details
    const prompt = generateItineraryPrompt(tripDetails);
    console.log("[1. PROMPT GENERATION] Itinerary prompt created");
    console.log("Prompt length:", prompt.length, "characters");

    // Set generation parameters for a structured JSON response
    const generationConfig = {
      temperature: 0.2, // Lower temperature for more structured output
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8000, // Increased from 4000 to ensure complete responses
    };

    // Ensure we have a valid location
    const destination = tripDetails.vacation_location || "";
    console.log(
      `[2. MODEL PREPARATION] Using destination: "${destination}" for itinerary generation`
    );

    // Generate the itinerary with AI
    console.log("[3. API CALL] Sending request to Gemini model...");
    console.time("ModelGenerationTime");

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });

    console.timeEnd("ModelGenerationTime");
    console.log("[4. RESPONSE RECEIVED] Got response from Gemini model");

    const response = result.response;
    const itineraryText = response.text();

    // Validate response completeness
    console.log("[5. RESPONSE VALIDATION] Checking response completeness");
    console.log("Response length:", itineraryText.length, "characters");

    // Check if response appears to be truncated
    const hasOpeningBrace = itineraryText.includes("{");
    const hasClosingBrace = itineraryText.includes("}");
    const openBraces = (itineraryText.match(/{/g) || []).length;
    const closeBraces = (itineraryText.match(/}/g) || []).length;

    console.log(
      `Response contains ${openBraces} opening braces and ${closeBraces} closing braces`
    );

    if (!hasOpeningBrace || !hasClosingBrace || openBraces !== closeBraces) {
      console.warn("[WARNING] Response may be truncated or incomplete");
      console.warn(
        `Opening braces: ${openBraces}, Closing braces: ${closeBraces}`
      );
    }

    // Check for expected JSON structure elements
    const hasDestination = itineraryText.includes('"destination"');
    const hasDays = itineraryText.includes('"days"');
    const hasSections = itineraryText.includes('"sections"');

    console.log(
      `Response structure check: destination=${hasDestination}, days=${hasDays}, sections=${hasSections}`
    );

    if (!hasDestination || !hasDays || !hasSections) {
      console.warn("[WARNING] Response may be missing key structural elements");
    }

    console.log("[6. RAW RESPONSE] Itinerary generated successfully");
    console.log("========= GENERATED ITINERARY START =========");
    console.log(itineraryText);
    console.log("========= GENERATED ITINERARY END =========");

    // Parse the JSON response
    console.log("[7. JSON PARSING] Beginning JSON parsing and processing");
    let structuredItinerary;
    try {
      // Remove any markdown code block indicators if present
      const cleanJson = itineraryText.replace(/```json|```/g, "").trim();
      console.log("[7.1] Removed markdown code blocks");
      console.log("Clean JSON length:", cleanJson.length, "characters");

      // Attempt to parse the JSON
      try {
        console.log("[7.2] Attempting standard JSON parsing");
        structuredItinerary = JSON.parse(cleanJson);
        console.log("[SUCCESS] Successfully parsed structured itinerary JSON");

        // Validate the parsed structure
        console.log("[7.3] Validating parsed structure");
        const validationResult =
          validateItineraryStructure(structuredItinerary);
        if (!validationResult.valid) {
          console.warn(
            `[WARNING] Structure validation issues: ${validationResult.issues.join(
              ", "
            )}`
          );
        } else {
          console.log("[SUCCESS] Structure validation passed");
        }
      } catch (jsonParseError) {
        console.error("[ERROR] Initial JSON parsing failed:", jsonParseError);
        console.log("[7.4] Beginning JSON repair process");

        // Attempt to repair the JSON by fixing common issues
        let repairedJson = cleanJson;

        // Check if the JSON is truncated (ends abruptly)
        if (repairedJson.lastIndexOf("{") > repairedJson.lastIndexOf("}")) {
          console.log("[REPAIR] Detected truncated JSON, attempting to repair");

          // Count open and close braces to detect if we're missing closing braces
          const openBraces = (repairedJson.match(/{/g) || []).length;
          const closeBraces = (repairedJson.match(/}/g) || []).length;
          const missingCloseBraces = openBraces - closeBraces;

          if (missingCloseBraces > 0) {
            // Add missing closing braces
            repairedJson += "}".repeat(missingCloseBraces);
            console.log(
              `[REPAIR] Added ${missingCloseBraces} missing closing braces`
            );
          }
        }

        // Check for unterminated strings (strings without closing quotes)
        const lastQuoteIndex = repairedJson.lastIndexOf('"');
        if (lastQuoteIndex > -1) {
          const textAfterLastQuote = repairedJson.substring(lastQuoteIndex + 1);
          if (
            !textAfterLastQuote.includes('"') &&
            (textAfterLastQuote.includes(",") ||
              textAfterLastQuote.includes("}"))
          ) {
            // Add a closing quote where it seems one is missing
            repairedJson =
              repairedJson.substring(0, lastQuoteIndex + 1) +
              '"' +
              repairedJson.substring(lastQuoteIndex + 1);
            console.log("[REPAIR] Added missing closing quote to repair JSON");
          }
        }

        // Fix property names that are not properly quoted
        const originalLength = repairedJson.length;
        repairedJson = repairedJson.replace(
          /([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g,
          '$1"$2"$3'
        );
        if (repairedJson.length !== originalLength) {
          console.log("[REPAIR] Fixed unquoted property names in JSON");
        }

        // Fix trailing commas before closing brackets
        repairedJson = repairedJson.replace(/,(\s*[\]}])/g, "$1");
        console.log("[REPAIR] Fixed trailing commas in JSON");

        // Try to find the location of the truncation
        const errorMatch = jsonParseError.message.match(/position (\d+)/);
        if (errorMatch && errorMatch[1]) {
          const errorPosition = parseInt(errorMatch[1]);
          const problematicPart = cleanJson.substring(
            Math.max(0, errorPosition - 50),
            Math.min(cleanJson.length, errorPosition + 50)
          );
          console.log(
            `[ERROR LOCATION] JSON error around position ${errorPosition}:`,
            problematicPart
          );

          // Try to fix common specific issues
          if (
            jsonParseError.message.includes("Unterminated string") ||
            jsonParseError.message.includes(
              "Expected double-quoted property name"
            ) ||
            jsonParseError.message.includes("Expected ',' or '}'")
          ) {
            // More aggressive reconstruction approach
            console.log(
              "[REPAIR] Attempting more aggressive JSON reconstruction"
            );

            // Extract the core structure first
            let partialItinerary = null;

            // Extract the main properties
            console.log("[EXTRACTION] Extracting core itinerary properties");
            const destinationMatch = cleanJson.match(
              /"destination"\s*:\s*"([^"]+)"/
            );
            const titleMatch = cleanJson.match(/"title"\s*:\s*"([^"]+)"/);
            const datesMatch = cleanJson.match(
              /"dates"\s*:\s*{\s*"start"\s*:\s*"([^"]+)"\s*,\s*"end"\s*:\s*"([^"]+)"\s*}/
            );
            const budgetMatch = cleanJson.match(/"budget"\s*:\s*"([^"]+)"/);

            if (destinationMatch)
              console.log(`[FOUND] Destination: "${destinationMatch[1]}"`);
            if (titleMatch) console.log(`[FOUND] Title: "${titleMatch[1]}"`);
            if (datesMatch)
              console.log(
                `[FOUND] Dates: ${datesMatch[1]} to ${datesMatch[2]}`
              );
            if (budgetMatch) console.log(`[FOUND] Budget: "${budgetMatch[1]}"`);

            // Start building a valid JSON object
            let reconstructedJson = "{\n";
            if (destinationMatch)
              reconstructedJson += `  "destination": "${destinationMatch[1]}",\n`;
            if (titleMatch)
              reconstructedJson += `  "title": "${titleMatch[1]}",\n`;
            if (datesMatch)
              reconstructedJson += `  "dates": { "start": "${datesMatch[1]}", "end": "${datesMatch[2]}" },\n`;
            if (budgetMatch)
              reconstructedJson += `  "budget": "${budgetMatch[1]}",\n`;

            // Extract complete days - using a more robust regex pattern
            console.log("[EXTRACTION] Extracting day objects");
            reconstructedJson += '  "days": [\n';

            // Extract day objects
            const dayPattern =
              /{[^{]*?"dayId"\s*:\s*"[^"]*"[^}]*?"sections"\s*:\s*\[[^\]]*\][^}]*?}/gs;
            const dayMatches = [...cleanJson.matchAll(dayPattern)];
            console.log(`[FOUND] ${dayMatches.length} potential day objects`);

            // Define validDays array at this scope level so it's available throughout
            const validDays = [];

            if (dayMatches && dayMatches.length > 0) {
              for (let i = 0; i < dayMatches.length; i++) {
                const dayText = dayMatches[i][0];
                try {
                  // Test if this day object is valid JSON when wrapped
                  const testJson = `{"test":${dayText}}`;
                  JSON.parse(testJson);
                  validDays.push(dayText);
                  console.log(`[VALID] Day ${i + 1} is valid JSON`);
                } catch (e) {
                  console.log(
                    `[INVALID] Day ${i + 1} is not valid JSON, skipping`
                  );
                  // If it's the last day and invalid, it might be truncated
                  if (i === dayMatches.length - 1) {
                    console.log(
                      "Last day appears truncated, attempting to fix"
                    );

                    // Extract only the valid parts we can be sure of
                    const dayIdMatch = dayText.match(/"dayId"\s*:\s*"([^"]+)"/);
                    const dayNumberMatch = dayText.match(
                      /"dayNumber"\s*:\s*(\d+)/
                    );
                    const dayTitleMatch = dayText.match(
                      /"title"\s*:\s*"([^"]+)"/
                    );
                    const dayThemeMatch = dayText.match(
                      /"theme"\s*:\s*"([^"]+)"/
                    );

                    if (dayIdMatch && dayNumberMatch) {
                      // Construct a minimal valid day object
                      let fixedDay = "{\n";
                      fixedDay += `    "dayId": "${dayIdMatch[1]}",\n`;
                      fixedDay += `    "dayNumber": ${dayNumberMatch[1]},\n`;
                      if (dayTitleMatch)
                        fixedDay += `    "title": "${dayTitleMatch[1]}",\n`;
                      if (dayThemeMatch)
                        fixedDay += `    "theme": "${dayThemeMatch[1]}",\n`;
                      fixedDay += '    "sections": []\n';
                      fixedDay += "  }";

                      validDays.push(fixedDay);
                      console.log(
                        "[REPAIR] Added fixed minimal version of truncated day"
                      );
                    }
                  }
                }
              }

              // Add all valid days to the reconstructed JSON
              reconstructedJson += validDays.join(",\n");
            }

            // Close the JSON structure
            reconstructedJson += "\n  ]\n}";
            console.log("[RECONSTRUCTION] Completed JSON reconstruction");

            try {
              // Try to parse the reconstructed JSON
              console.log("[PARSING] Attempting to parse reconstructed JSON");
              partialItinerary = JSON.parse(reconstructedJson);
              console.log(
                "[SUCCESS] Successfully reconstructed partial itinerary JSON"
              );
              console.log(
                `[STRUCTURE] Reconstructed itinerary has ${partialItinerary.days.length} days`
              );
              structuredItinerary = partialItinerary;
            } catch (reconstructError) {
              console.error(
                "[ERROR] Failed to reconstruct partial itinerary:",
                reconstructError
              );

              // Last resort: create a minimal valid itinerary with whatever we could extract
              console.log("[FALLBACK] Creating minimal valid itinerary");
              try {
                const minimalJson = `{
                  "destination": "${
                    destination ||
                    (destinationMatch ? destinationMatch[1] : "Unknown")
                  }",
                  "title": "${titleMatch ? titleMatch[1] : "Travel Itinerary"}",
                  "dates": ${
                    datesMatch
                      ? `{ "start": "${datesMatch[1]}", "end": "${datesMatch[2]}" }`
                      : '{ "start": "", "end": "" }'
                  },
                  "budget": "${budgetMatch ? budgetMatch[1] : "Not specified"}",
                  "days": []
                }`;

                structuredItinerary = JSON.parse(minimalJson);
                console.log(
                  "[SUCCESS] Created minimal valid itinerary as fallback"
                );

                // Try to add at least some days if we found any valid ones
                // Only reference validDays if it exists
                if (
                  typeof validDays !== "undefined" &&
                  validDays &&
                  validDays.length > 0
                ) {
                  try {
                    for (const dayText of validDays) {
                      const testJson = `{"day":${dayText}}`;
                      const parsed = JSON.parse(testJson);
                      structuredItinerary.days.push(parsed.day);
                    }
                    console.log(
                      `[SUCCESS] Added ${structuredItinerary.days.length} valid days to minimal itinerary`
                    );
                  } catch (e) {
                    console.error(
                      "[ERROR] Failed to add days to minimal itinerary:",
                      e
                    );
                  }
                }
              } catch (minimalError) {
                console.error(
                  "[ERROR] Failed to create minimal itinerary:",
                  minimalError
                );
              }
            }
          }
        }

        // If we still don't have a structured itinerary, try one more time with the repaired JSON
        if (!structuredItinerary) {
          try {
            console.log("[ATTEMPT] Trying to parse repaired JSON");
            structuredItinerary = JSON.parse(repairedJson);
            console.log("[SUCCESS] Successfully parsed repaired JSON");
          } catch (repairError) {
            console.error(
              "[ERROR] Failed to parse repaired JSON:",
              repairError
            );

            // Fallback to text-to-JSON conversion as last resort
            try {
              console.log(
                "[FALLBACK] Converting text itinerary to JSON format"
              );
              structuredItinerary = convertItineraryToJSON(itineraryText);
              console.log(
                "[SUCCESS] Converted text itinerary to JSON format as fallback"
              );
            } catch (conversionError) {
              console.error(
                "[ERROR] Failed to convert text to JSON:",
                conversionError
              );

              // Create an absolute minimal structure to avoid complete failure
              structuredItinerary = {
                destination: destination || "Unknown",
                title: "Travel Itinerary",
                dates: { start: "", end: "" },
                budget: "Not specified",
                days: [],
              };
              console.log(
                "[LAST RESORT] Created absolute minimal itinerary structure"
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("[ERROR] Error parsing itinerary JSON:", error);
      console.log("[DEBUG] Raw itinerary text:", itineraryText);

      // Fallback to old format if JSON parsing fails
      try {
        // Try to convert the text format to JSON as a fallback
        console.log("[FALLBACK] Attempting text-to-JSON conversion");
        structuredItinerary = convertItineraryToJSON(itineraryText);
        console.log(
          "[SUCCESS] Converted text itinerary to JSON format as fallback"
        );
      } catch (conversionError) {
        console.error("[ERROR] Error in fallback conversion:", conversionError);
        return {
          success: false,
          error: "Failed to parse structured itinerary",
          rawItinerary: itineraryText,
        };
      }
    }

    // Ensure the destination is set
    if (!structuredItinerary.destination && destination) {
      structuredItinerary.destination = destination;
      console.log(
        `[FIX] Added missing destination "${destination}" to structured itinerary`
      );
    }

    // Generate a formatted text version of the itinerary for display
    console.log(
      "[8. FORMATTING] Generating formatted text version for display"
    );
    const formattedItinerary = formatItineraryForDisplay(structuredItinerary);
    console.log("[SUCCESS] Generated formatted itinerary text for display");
    console.log(
      "Formatted text length:",
      formattedItinerary.length,
      "characters"
    );

    console.log(
      "[9. PROCESS COMPLETE] Itinerary generation process finished successfully"
    );
    return {
      success: true,
      itinerary: formattedItinerary, // Use the formatted text for display
      rawItinerary: itineraryText, // Keep the raw JSON text
      structuredItinerary, // Keep the structured JSON object
      // Add metadata for the itinerary
      metadata: {
        destination: structuredItinerary.destination || destination,
        duration: tripDetails.duration,
        dates: structuredItinerary.dates || tripDetails.dates,
        generatedAt: new Date().toISOString(),
        format: "structured-json-v2",
      },
    };
  } catch (error) {
    console.error("[ERROR] Error generating itinerary:", error);
    return {
      success: false,
      error: error.message || "Failed to generate itinerary",
    };
  }
};

/**
 * Validates the structure of the parsed itinerary
 * @param {Object} itinerary - The parsed itinerary object
 * @returns {Object} - Validation result with valid flag and issues array
 */
function validateItineraryStructure(itinerary) {
  const issues = [];

  // Check for required top-level properties
  if (!itinerary.destination) issues.push("Missing destination");
  if (!itinerary.title) issues.push("Missing title");
  if (!itinerary.days || !Array.isArray(itinerary.days))
    issues.push("Missing or invalid days array");

  // Check days structure if available
  if (itinerary.days && Array.isArray(itinerary.days)) {
    if (itinerary.days.length === 0) {
      issues.push("Days array is empty");
    } else {
      // Check if there's accommodation information either in additionalInfo or in day sections
      let hasAccommodation = false;

      // Check additionalInfo for accommodation
      if (
        itinerary.additionalInfo &&
        itinerary.additionalInfo.accommodation &&
        itinerary.additionalInfo.accommodation.length > 0
      ) {
        hasAccommodation = true;
      }

      // Check for accommodation activities in days/sections
      if (!hasAccommodation) {
        for (const day of itinerary.days) {
          if (day.sections) {
            for (const section of day.sections) {
              if (section.activities && Array.isArray(section.activities)) {
                for (const activity of section.activities) {
                  if (
                    activity.type &&
                    (activity.type.toLowerCase().includes("hotel") ||
                      activity.type.toLowerCase().includes("accommodation") ||
                      activity.type.toLowerCase().includes("lodging") ||
                      activity.type.toLowerCase().includes("check-in") ||
                      activity.type.toLowerCase().includes("check-out"))
                  ) {
                    hasAccommodation = true;
                    break;
                  }
                }
              }
              if (hasAccommodation) break;
            }
          }
          if (hasAccommodation) break;
        }
      }

      // Add warning if no accommodation found
      if (!hasAccommodation) {
        issues.push("Itinerary does not include any accommodation information");
      }

      // Check each day
      itinerary.days.forEach((day, index) => {
        if (!day.dayId) issues.push(`Day ${index + 1} missing dayId`);
        if (!day.dayNumber) issues.push(`Day ${index + 1} missing dayNumber`);
        if (!day.title) issues.push(`Day ${index + 1} missing title`);

        // Check sections
        if (!day.sections || !Array.isArray(day.sections)) {
          issues.push(`Day ${index + 1} missing or invalid sections array`);
        } else if (day.sections.length === 0) {
          issues.push(`Day ${index + 1} has empty sections array`);
        } else {
          // Check for transitions in activities
          day.sections.forEach((section, sectionIndex) => {
            if (section.activities && Array.isArray(section.activities)) {
              section.activities.forEach((activity, activityIndex) => {
                // Check if transition is properly structured when present
                if (
                  activity.transition &&
                  typeof activity.transition === "object"
                ) {
                  if (!activity.transition.mode) {
                    issues.push(
                      `Day ${index + 1}, Section ${
                        sectionIndex + 1
                      }, Activity ${
                        activityIndex + 1
                      } has transition but missing mode`
                    );
                  }
                  if (!activity.transition.duration) {
                    issues.push(
                      `Day ${index + 1}, Section ${
                        sectionIndex + 1
                      }, Activity ${
                        activityIndex + 1
                      } has transition but missing duration`
                    );
                  }
                }
              });
            }

            // Check for transition in restaurant
            if (section.restaurant && section.restaurant.transition) {
              if (!section.restaurant.transition.mode) {
                issues.push(
                  `Day ${index + 1}, Section ${
                    sectionIndex + 1
                  }, Restaurant has transition but missing mode`
                );
              }
              if (!section.restaurant.transition.duration) {
                issues.push(
                  `Day ${index + 1}, Section ${
                    sectionIndex + 1
                  }, Restaurant has transition but missing duration`
                );
              }
            }

            // Check for transitions in evening options
            if (section.options && Array.isArray(section.options)) {
              section.options.forEach((option, optionIndex) => {
                if (
                  option.transition &&
                  typeof option.transition === "object"
                ) {
                  if (!option.transition.mode) {
                    issues.push(
                      `Day ${index + 1}, Section ${sectionIndex + 1}, Option ${
                        optionIndex + 1
                      } has transition but missing mode`
                    );
                  }
                  if (!option.transition.duration) {
                    issues.push(
                      `Day ${index + 1}, Section ${sectionIndex + 1}, Option ${
                        optionIndex + 1
                      } has transition but missing duration`
                    );
                  }
                }
              });
            }
          });
        }
      });

      // Check if first day has check-in and last day has check-out
      const firstDay = itinerary.days[0];
      const lastDay = itinerary.days[itinerary.days.length - 1];

      let hasCheckIn = false;
      let hasCheckOut = false;

      // Check first day for check-in
      if (firstDay.sections) {
        for (const section of firstDay.sections) {
          if (section.activities && Array.isArray(section.activities)) {
            for (const activity of section.activities) {
              if (
                (activity.title &&
                  activity.title.toLowerCase().includes("check-in")) ||
                (activity.type &&
                  activity.type.toLowerCase().includes("check-in"))
              ) {
                hasCheckIn = true;
                break;
              }
            }
          }
          if (hasCheckIn) break;
        }
      }

      // Check last day for check-out
      if (lastDay.sections) {
        for (const section of lastDay.sections) {
          if (section.activities && Array.isArray(section.activities)) {
            for (const activity of section.activities) {
              if (
                (activity.title &&
                  activity.title.toLowerCase().includes("check-out")) ||
                (activity.type &&
                  activity.type.toLowerCase().includes("check-out"))
              ) {
                hasCheckOut = true;
                break;
              }
            }
          }
          if (hasCheckOut) break;
        }
      }

      // Add warnings for missing check-in/check-out
      if (!hasCheckIn) {
        issues.push("First day missing hotel check-in activity");
      }

      if (!hasCheckOut) {
        issues.push("Last day missing hotel check-out activity");
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Placeholder for external data fetching functionality
 * Currently disabled as we're using the new itinerary format without external API calls
 *
 * @param {Object} tripDetails - The trip details
 * @returns {Promise<Object>} - Empty object with placeholder data
 */
export const fetchExternalDataInParallel = async (tripDetails) => {
  console.log("External data fetching is currently disabled");
  return {
    hotels: [],
    restaurants: [],
    attractions: [],
  };
};

/**
 * Helper function to determine attraction category from preferences
 * @param {string} preferredActivity - User's preferred activity
 * @returns {string} - Google Places API category
 */
export const getCategoryFromPreferences = (preferredActivity) => {
  if (!preferredActivity) return "tourist_attraction";

  const activity = preferredActivity.toLowerCase();

  if (activity.includes("museum") || activity.includes("art")) {
    return "museum";
  } else if (activity.includes("nature") || activity.includes("park")) {
    return "park";
  } else if (activity.includes("food") || activity.includes("eat")) {
    return "restaurant";
  } else if (activity.includes("shop")) {
    return "shopping_mall";
  } else if (activity.includes("night") || activity.includes("bar")) {
    return "night_club";
  }

  return "tourist_attraction";
};

/**
 * Placeholder for enhancing itinerary with external data
 * Currently disabled as we're using the new itinerary format without external API calls
 *
 * @param {Object} structuredItinerary - The structured JSON itinerary
 * @param {Object} tripDetails - The original trip details with constraints
 * @returns {Promise<Object>} - The original itinerary without modifications
 */
export const enhanceItineraryWithExternalData = async (
  structuredItinerary,
  tripDetails
) => {
  console.log("Enhancing itinerary with external data...");

  // Ensure we have a valid destination for external API calls
  let destination = null;

  // Try to get destination from various sources
  if (structuredItinerary.destination) {
    destination = structuredItinerary.destination;
    console.log(`Using destination from structured itinerary: ${destination}`);
  } else if (tripDetails.vacation_location) {
    destination = tripDetails.vacation_location;
    structuredItinerary.destination = destination;
    console.log(
      `Using destination from tripDetails.vacation_location: ${destination}`
    );
  } else if (tripDetails.metadata?.destination) {
    destination = tripDetails.metadata.destination;
    structuredItinerary.destination = destination;
    console.log(
      `Using destination from tripDetails.metadata.destination: ${destination}`
    );
  } else {
    console.warn(
      "No destination found in any data source, external data enhancement may fail"
    );
  }

  // בדיקה אם יש מידע על מלון באיטינררי
  const hasAccommodationInAdditionalInfo =
    structuredItinerary.additionalInfo &&
    structuredItinerary.additionalInfo.accommodation &&
    structuredItinerary.additionalInfo.accommodation.length > 0;

  const hasAccommodationInDays =
    structuredItinerary.days &&
    structuredItinerary.days.some((day) => {
      return (
        day.sections &&
        day.sections.some((section) => {
          // בדיק אם יש פעילות מסוג מלון/לינה
          if (section.activities) {
            return section.activities.some(
              (activity) =>
                activity.type &&
                (activity.type.toLowerCase().includes("hotel") ||
                  activity.type.toLowerCase().includes("accommodation") ||
                  activity.type.toLowerCase().includes("lodging"))
            );
          }
          return false;
        })
      );
    });

  console.log(
    `Accommodation check: additionalInfo=${hasAccommodationInAdditionalInfo}, inDays=${hasAccommodationInDays}`
  );

  // אם אין מידע על מלון, הוסף מידע ברירת מחדל
  if (!hasAccommodationInAdditionalInfo && !hasAccommodationInDays) {
    console.log(
      "No accommodation found in itinerary, adding default hotel information"
    );

    if (!structuredItinerary.additionalInfo) {
      structuredItinerary.additionalInfo = {};
    }

    if (!structuredItinerary.additionalInfo.accommodation) {
      structuredItinerary.additionalInfo.accommodation = [];
    }

    structuredItinerary.additionalInfo.accommodation.push({
      name: `Hotel in ${
        destination || structuredItinerary.destination || "destination"
      }`,
      description: "Accommodation based on your preferences",
      checkIn: "Day 1",
      checkOut: `Day ${
        structuredItinerary.days
          ? structuredItinerary.days.length
          : "of departure"
      }`,
    });

    // הוסף גם לסקשן של היום הראשון והאחרון
    if (structuredItinerary.days && structuredItinerary.days.length > 0) {
      // הוסף check-in ליום הראשון
      const firstDay = structuredItinerary.days[0];

      if (!firstDay.sections) {
        firstDay.sections = [];
      }

      // בדוק אם כבר יש פעילות מלון ביום הראשון
      const hasHotelActivityInFirstDay = firstDay.sections.some(
        (section) =>
          section.activities &&
          section.activities.some(
            (activity) =>
              activity.type &&
              (activity.type.toLowerCase().includes("hotel") ||
                activity.type.toLowerCase().includes("accommodation") ||
                activity.type.toLowerCase().includes("check-in"))
          )
      );

      if (!hasHotelActivityInFirstDay) {
        // הוסף את פעילות ה-check-in בתחילת היום
        firstDay.sections.unshift({
          timeOfDay: "Morning",
          time: "Upon arrival",
          activities: [
            {
              activityId: "hotel-checkin",
              title: `Check-in at Hotel in ${
                destination ||
                structuredItinerary.destination ||
                "your destination"
              }`,
              type: "Accommodation",
              description: "Check in to your hotel and get settled",
            },
          ],
        });
        console.log("Added hotel check-in activity to first day");
      }

      // הוסף check-out ליום האחרון
      const lastDayIndex = structuredItinerary.days.length - 1;
      const lastDay = structuredItinerary.days[lastDayIndex];

      if (!lastDay.sections) {
        lastDay.sections = [];
      }

      // בדוק אם כבר יש פעילות checkout ביום האחרון
      const hasHotelCheckoutInLastDay = lastDay.sections.some(
        (section) =>
          section.activities &&
          section.activities.some(
            (activity) =>
              (activity.title &&
                activity.title.toLowerCase().includes("check-out")) ||
              (activity.type &&
                activity.type.toLowerCase().includes("check-out"))
          )
      );

      if (!hasHotelCheckoutInLastDay) {
        // הוסף את פעילות ה-check-out לסוף היום
        lastDay.sections.push({
          timeOfDay: "Before Departure",
          time: "Before leaving",
          activities: [
            {
              activityId: "hotel-checkout",
              title: "Hotel Check-out",
              type: "Accommodation",
              description:
                "Check out from your hotel before continuing your journey",
            },
          ],
        });
        console.log("Added hotel check-out activity to last day");
      }
    }
  }

  return structuredItinerary;
};

/**
 * Placeholder for hotel recommendation functionality
 * Currently disabled as we're using the new itinerary format without external API calls
 *
 * @param {Object} params - Parameters for hotel search
 * @returns {Promise<Object>} - Empty hotel recommendations
 */
export const fetchOptimalHotels = async ({
  location,
  budget_level = "moderate",
  preferences = [],
}) => {
  // Validate location parameter to prevent API errors
  if (!location || typeof location !== "string" || location.trim() === "") {
    console.warn("Invalid or missing location parameter in fetchOptimalHotels");
    return { hotels: [] };
  }

  console.log("Hotel recommendations functionality is currently disabled");
  return { hotels: [] };
};

/**
 * Placeholder for restaurant recommendation functionality
 * Currently disabled as we're using the new itinerary format without external API calls
 *
 * @param {Object} params - Parameters for restaurant search
 * @returns {Promise<Object>} - Empty restaurant recommendations
 */
export const fetchOptimalRestaurants = async ({
  location,
  mealTime,
  preferences = {},
}) => {
  // Validate location parameter to prevent API errors
  if (!location || typeof location !== "string" || location.trim() === "") {
    console.warn(
      "Invalid or missing location parameter in fetchOptimalRestaurants"
    );
    return { restaurants: [] };
  }

  console.log("Restaurant recommendations functionality is currently disabled");
  return { restaurants: [] };
};

/**
 * Placeholder for attraction recommendation functionality
 * Currently disabled as we're using the new itinerary format without external API calls
 *
 * @param {Object} params - Parameters for attraction search
 * @returns {Promise<Object>} - Empty attraction recommendations
 */
export const fetchOptimalAttractions = async ({
  location,
  category = "tourist_attraction",
  preferences = {},
}) => {
  // Validate location parameter to prevent API errors
  if (!location || typeof location !== "string" || location.trim() === "") {
    console.warn(
      "Invalid or missing location parameter in fetchOptimalAttractions"
    );
    return { attractions: [] };
  }

  console.log("Attraction recommendations functionality is currently disabled");
  return { attractions: [] };
};

/**
 * Optimize the itinerary days for geographical efficiency
 * @param {Array} days - The array of itinerary days
 * @returns {Array} - Optimized array of days
 */
export const optimizeGeographically = (days) => {
  // Create a copy to avoid mutating the original
  const optimizedDays = [...days];

  for (let i = 0; i < optimizedDays.length; i++) {
    let dayData = optimizedDays[i];

    // If the day has morning, afternoon, and evening activities, try to optimize them
    if (dayData.activities) {
      // Extract all activities for the day
      let allDayActivities = [];

      // Collect activities from each time segment
      if (dayData.activities.morning && dayData.activities.morning.length > 0) {
        allDayActivities = allDayActivities.concat(
          dayData.activities.morning.map((act) => ({
            ...act,
            timeOfDay: "morning",
          }))
        );
      }

      if (
        dayData.activities.afternoon &&
        dayData.activities.afternoon.length > 0
      ) {
        allDayActivities = allDayActivities.concat(
          dayData.activities.afternoon.map((act) => ({
            ...act,
            timeOfDay: "afternoon",
          }))
        );
      }

      if (dayData.activities.evening && dayData.activities.evening.length > 0) {
        allDayActivities = allDayActivities.concat(
          dayData.activities.evening.map((act) => ({
            ...act,
            timeOfDay: "evening",
          }))
        );
      }

      // Keep lunch and dinner fixed at their respective times
      const lunch = dayData.activities.lunch
        ? [...dayData.activities.lunch]
        : [];
      const dinner = dayData.activities.dinner
        ? [...dayData.activities.dinner]
        : [];

      // Calculate optimal ordering (this would require actual geo data)
      // For now, preserve the time-of-day constraints while ensuring attractions
      // are grouped by assumed proximity (would need actual distance calculation)

      // Re-organize activities based on time of day and assumed proximity
      dayData.activities.morning = allDayActivities
        .filter((act) => act.timeOfDay === "morning")
        .slice(
          0,
          dayData.activities.morning ? dayData.activities.morning.length : 0
        );

      dayData.activities.afternoon = allDayActivities
        .filter((act) => act.timeOfDay === "afternoon")
        .slice(
          0,
          dayData.activities.afternoon ? dayData.activities.afternoon.length : 0
        );

      dayData.activities.evening = allDayActivities
        .filter((act) => act.timeOfDay === "evening")
        .slice(
          0,
          dayData.activities.evening ? dayData.activities.evening.length : 0
        );

      // Restore lunch and dinner
      dayData.activities.lunch = lunch;
      dayData.activities.dinner = dinner;

      // Add transit descriptions between activities
      const updatedDay = addTransitDescriptions(dayData);

      // Update in the array
      optimizedDays[i] = updatedDay;
    }
  }

  return optimizedDays;
};

/**
 * Add transit descriptions between activities
 * @param {Object} day - A day object from the itinerary
 * @returns {Object} - Day object with added transit descriptions
 */
export const addTransitDescriptions = (day) => {
  // This is a placeholder function that would ideally use actual distance data
  // In a real implementation, this would call mapping APIs to get actual walking/transit times

  // Create a copy of the day to avoid direct mutation
  const updatedDay = JSON.parse(JSON.stringify(day));

  // For demonstration purposes, add estimated transit times between activities
  if (
    updatedDay.activities &&
    updatedDay.activities.morning &&
    updatedDay.activities.morning.length > 0
  ) {
    for (let i = 1; i < updatedDay.activities.morning.length; i++) {
      updatedDay.activities.morning[i].transitFromPrevious = "🚶 ~10 min walk";
    }
  }

  // Add transit between morning and lunch
  if (
    updatedDay.activities &&
    updatedDay.activities.lunch &&
    updatedDay.activities.lunch.length > 0 &&
    updatedDay.activities.morning &&
    updatedDay.activities.morning.length > 0
  ) {
    updatedDay.activities.lunch[0].transitFromPrevious = "🚶 ~15 min walk";
  }

  // Add transit between lunch and afternoon
  if (
    updatedDay.activities &&
    updatedDay.activities.afternoon &&
    updatedDay.activities.afternoon.length > 0 &&
    updatedDay.activities.lunch &&
    updatedDay.activities.lunch.length > 0
  ) {
    updatedDay.activities.afternoon[0].transitFromPrevious = "🚶 ~12 min walk";
  }

  // Add transit between afternoon activities
  if (
    updatedDay.activities &&
    updatedDay.activities.afternoon &&
    updatedDay.activities.afternoon.length > 0
  ) {
    for (let i = 1; i < updatedDay.activities.afternoon.length; i++) {
      updatedDay.activities.afternoon[i].transitFromPrevious = "🚶 ~8 min walk";
    }
  }

  // Add transit between afternoon and dinner
  if (
    updatedDay.activities &&
    updatedDay.activities.dinner &&
    updatedDay.activities.dinner.length > 0 &&
    updatedDay.activities.afternoon &&
    updatedDay.activities.afternoon.length > 0
  ) {
    updatedDay.activities.dinner[0].transitFromPrevious =
      "🚕 ~10 min taxi ride";
  }

  return updatedDay;
};

/**
 * Modify an activity in the itinerary
 * @param {Object} structuredItinerary - The structured itinerary
 * @param {Number} dayIndex - Index of the day to modify
 * @param {String} timeOfDay - Time of day (morning, lunch, afternoon, dinner, evening)
 * @param {Number} activityIndex - Index of the activity to modify
 * @param {Object} newActivity - New activity data
 * @returns {Object} - Updated itinerary
 */
export const modifyItineraryActivity = (
  structuredItinerary,
  dayIndex,
  timeOfDay,
  activityIndex,
  newActivity
) => {
  // Create a deep copy of the itinerary
  const updatedItinerary = JSON.parse(JSON.stringify(structuredItinerary));

  // Check if the day exists
  if (!updatedItinerary.days[dayIndex]) {
    console.error(`Day ${dayIndex} doesn't exist in itinerary`);
    return structuredItinerary;
  }

  // Check if the time of day exists
  if (!updatedItinerary.days[dayIndex].activities[timeOfDay]) {
    console.error(`Time of day ${timeOfDay} doesn't exist in day ${dayIndex}`);
    return structuredItinerary;
  }

  // Replace the activity
  updatedItinerary.days[dayIndex].activities[timeOfDay][activityIndex] =
    newActivity;

  // Recalculate transit descriptions
  updatedItinerary.days[dayIndex] = addTransitDescriptions(
    updatedItinerary.days[dayIndex]
  );

  return updatedItinerary;
};

/**
 * Add an optional activity slot to the itinerary
 * @param {Object} structuredItinerary - The structured itinerary
 * @param {Number} dayIndex - Index of the day
 * @param {String} timeOfDay - Time of day (morning, afternoon, evening)
 * @returns {Object} - Updated itinerary
 */
export const addOptionalSlot = (structuredItinerary, dayIndex, timeOfDay) => {
  // Create a deep copy of the itinerary
  const updatedItinerary = JSON.parse(JSON.stringify(structuredItinerary));

  // Check if the day exists
  if (!updatedItinerary.days[dayIndex]) {
    console.error(`Day ${dayIndex} doesn't exist in itinerary`);
    return structuredItinerary;
  }

  // Initialize activities for this time of day if it doesn't exist
  if (!updatedItinerary.days[dayIndex].activities[timeOfDay]) {
    updatedItinerary.days[dayIndex].activities[timeOfDay] = [];
  }

  // Create optional activity placeholder
  const optionalActivity = {
    type: "optional",
    name: "Free time / Optional activity",
    description: "Time for spontaneous exploration or rest",
    duration: 90,
  };

  // Add the optional activity
  updatedItinerary.days[dayIndex].activities[timeOfDay].push(optionalActivity);

  // Recalculate transit descriptions
  updatedItinerary.days[dayIndex] = addTransitDescriptions(
    updatedItinerary.days[dayIndex]
  );

  return updatedItinerary;
};

/**
 * Enhanced structure for activities with geolocation and additional metadata
 * @param {string} name - The name of the activity
 * @param {string} description - Description of the activity
 * @param {string} type - Type of activity (attraction, restaurant, etc.)
 * @returns {Object} - Enhanced activity object
 */
export const createEnhancedActivity = (
  name,
  description,
  type = "attraction"
) => {
  // Create a basic enhanced activity structure
  return {
    name: name || "",
    description: description || "",
    type: type || "attraction",
    coordinates: {
      lat: null,
      lng: null,
    },
    duration_minutes: 60, // Default duration
    tags: [],
    weather_sensitive: false,
    eco_friendly: false,
    is_accessible: true,
    image_url: "",
    external_links: {
      official_site: "",
      google_maps: `https://maps.google.com/?q=${encodeURIComponent(
        name || ""
      )}`,
    },
  };
};

/**
 * Creates an enhanced itinerary structure with geolocation and additional metadata
 * @param {Object} structuredItinerary - The basic structured itinerary
 * @returns {Object} - Enhanced itinerary with additional metadata
 */
export const enhanceItineraryStructure = (structuredItinerary) => {
  if (!structuredItinerary || !structuredItinerary.days) {
    console.log("Cannot enhance itinerary: Invalid structure");
    return structuredItinerary;
  }

  console.log("Enhancing itinerary structure with geolocation and metadata");

  // Create a deep copy to avoid modifying the original
  const enhancedItinerary = JSON.parse(JSON.stringify(structuredItinerary));

  // Add top-level metadata
  enhancedItinerary.metadata = enhancedItinerary.metadata || {};
  enhancedItinerary.metadata.enhanced = true;
  enhancedItinerary.metadata.enhancedAt = new Date().toISOString();

  // Process each day
  enhancedItinerary.days = enhancedItinerary.days.map((day, dayIndex) => {
    // Create enhanced day structure
    const enhancedDay = {
      ...day,
      dayIndex: dayIndex,
      dayNumber: day.dayNumber || dayIndex + 1,
      activities: day.activities || {},
      enhancedActivities: [],
    };

    // Process activities for each time block
    const timeBlocks = ["morning", "lunch", "afternoon", "evening", "dinner"];
    timeBlocks.forEach((timeBlock) => {
      if (!day.activities || !day.activities[timeBlock]) return;

      // Process each activity in the time block
      enhancedDay.activities[timeBlock] = day.activities[timeBlock].map(
        (activity, activityIndex) => {
          if (typeof activity === "string") {
            // Convert string activities to objects
            return {
              name: activity,
              text: activity,
              timeBlock: timeBlock,
              index: activityIndex,
            };
          } else {
            // Add timeBlock and index to existing activity objects
            return {
              ...activity,
              timeBlock: timeBlock,
              index: activityIndex,
            };
          }
        }
      );

      // Create enhanced activities with geolocation and metadata
      day.activities[timeBlock].forEach((activity, activityIndex) => {
        const activityName =
          activity.name || (typeof activity === "string" ? activity : "");
        const activityDesc = activity.description || "";

        // Determine activity type based on timeBlock and content
        let activityType = "attraction";
        if (timeBlock === "lunch" || timeBlock === "dinner") {
          activityType = "restaurant";
        } else if (
          activityName.toLowerCase().includes("museum") ||
          activityName.toLowerCase().includes("gallery")
        ) {
          activityType = "museum";
        } else if (
          activityName.toLowerCase().includes("beach") ||
          activityName.toLowerCase().includes("park")
        ) {
          activityType = "outdoor";
        }

        // Create enhanced activity
        const enhancedActivity = createEnhancedActivity(
          activityName,
          activityDesc,
          activityType
        );

        // Add time block information
        enhancedActivity.timeBlock = timeBlock;
        enhancedActivity.dayNumber = enhancedDay.dayNumber;
        enhancedActivity.index = activityIndex;

        // Extract additional information if available
        if (activity.significance) {
          enhancedActivity.significance = activity.significance;
        }

        if (activity.tip) {
          enhancedActivity.tip = activity.tip;
          // Extract tags from tips
          const tipText = activity.tip.toLowerCase();
          if (
            tipText.includes("book") ||
            tipText.includes("reserve") ||
            tipText.includes("advance")
          ) {
            enhancedActivity.tags.push("booking-required");
          }
          if (tipText.includes("walk") || tipText.includes("stroll")) {
            enhancedActivity.tags.push("walking");
          }
          if (tipText.includes("view") || tipText.includes("panorama")) {
            enhancedActivity.tags.push("scenic-view");
          }
        }

        // Add to enhanced activities array
        enhancedDay.enhancedActivities.push(enhancedActivity);
      });
    });

    return enhancedDay;
  });

  console.log(
    `Enhanced itinerary structure with ${enhancedItinerary.days.length} days`
  );
  return enhancedItinerary;
};

/**
 * Converts a markdown itinerary string to structured JSON format with enhanced data support
 * @param {string} itineraryString - The markdown formatted itinerary string
 * @returns {Object} - Structured JSON representation of the itinerary
 */
export const convertItineraryToJSON = (itineraryString) => {
  try {
    console.log("Converting itinerary string to JSON...");

    // Initialize the structure for our JSON format with enhanced data support
    const itineraryJSON = {
      title: "",
      destination: "",
      duration: "",
      dates: { from: "", to: "" },
      days: [],
      additionalInfo: {
        tips: [],
        transportation: [],
        accommodation: [],
      },
      createdAt: new Date().toISOString(),
      lastEnhanced: null, // Track when external data was last added
    };

    // Parse the title and basic information
    const lines = itineraryString.split("\n");
    let currentDay = null;
    let currentSection = null;
    let currentTimeBlock = null;
    let possibleDestinations = new Set();
    let inGettingAround = false;
    let inAccommodation = false;
    let inTips = false;
    let currentActivity = null;

    // First pass to extract title, destination, and duration
    for (let i = 0; i < 20 && i < lines.length; i++) {
      const line = lines[i].trim();

      // Try to extract destination from first lines using multiple patterns
      if (!itineraryJSON.destination) {
        // Pattern 1: "in Berlin" pattern
        if (line.includes("in ")) {
          const destMatch1 = line.match(
            /in\s+([A-Za-z\s]+)(?:is|for|\.|,|\s)/i
          );
          if (destMatch1 && destMatch1[1]) {
            itineraryJSON.destination = destMatch1[1].trim();
            console.log(
              `Found destination (pattern 1): ${itineraryJSON.destination}`
            );
          }
        }
        // Pattern 2: "days in Berlin" pattern
        else if (line.match(/days?\s+in\s+([A-Za-z\s]+)/i)) {
          const destMatch2 = line.match(/days?\s+in\s+([A-Za-z\s]+)/i);
          if (destMatch2 && destMatch2[1]) {
            itineraryJSON.destination = destMatch2[1].trim();
            console.log(
              `Found destination (pattern 2): ${itineraryJSON.destination}`
            );
          }
        }
        // Pattern 3: "Berlin is" pattern at start of sentence
        else if (line.match(/^([A-Za-z\s]+)\s+(?:is|has)/i)) {
          const destMatch3 = line.match(/^([A-Za-z\s]+)\s+(?:is|has)/i);
          if (destMatch3 && destMatch3[1] && destMatch3[1].length < 20) {
            itineraryJSON.destination = destMatch3[1].trim();
            console.log(
              `Found destination (pattern 3): ${itineraryJSON.destination}`
            );
          }
        }
        // Pattern 4: "City: Description" at start of line
        else if (line.match(/^([A-Za-z\s]+):\s+[A-Z]/)) {
          const destMatch4 = line.match(/^([A-Za-z\s]+):/);
          if (destMatch4 && destMatch4[1] && destMatch4[1].length < 20) {
            itineraryJSON.destination = destMatch4[1].trim();
            console.log(
              `Found destination (pattern 4): ${itineraryJSON.destination}`
            );
          }
        }
        // Pattern 5: "Prague: A Luxury Exploration (June 14-15, 2025)" format
        else if (line.match(/^([A-Za-z\s]+):\s+[A-Z][a-z]+\s+[A-Z][a-z]+/)) {
          const destMatch5 = line.match(/^([A-Za-z\s]+):/);
          if (destMatch5 && destMatch5[1] && destMatch5[1].length < 20) {
            itineraryJSON.destination = destMatch5[1].trim();
            console.log(
              `Found destination (pattern 5): ${itineraryJSON.destination}`
            );

            // This is likely the title line too
            if (!itineraryJSON.title) {
              itineraryJSON.title = line.trim();
              console.log(`Using line as title: ${itineraryJSON.title}`);
            }

            // Try to extract date from this line if it contains a date pattern
            const datePart = line.match(/\(([^)]+)\)/);
            if (datePart && datePart[1]) {
              const dateText = datePart[1];
              console.log(`Found date in title: ${dateText}`);

              // Check for month names in the date text
              const monthMatch = dateText.match(
                /(January|February|March|April|May|June|July|August|September|October|November|December)/i
              );
              if (monthMatch) {
                // This looks like a date, try to parse it
                if (dateText.includes("-")) {
                  // Format like "June 14-15, 2025"
                  const compactDateMatch = dateText.match(
                    /(\w+)\s+(\d{1,2})-(\d{1,2})(?:,\s*|\s+)(\d{4})/i
                  );
                  if (compactDateMatch) {
                    const month = compactDateMatch[1];
                    const startDay = compactDateMatch[2];
                    const endDay = compactDateMatch[3];
                    const year = compactDateMatch[4];

                    itineraryJSON.dates.from = `${month} ${startDay}, ${year}`;
                    itineraryJSON.dates.to = `${month} ${endDay}, ${year}`;
                    console.log(
                      `Parsed date range from title: ${itineraryJSON.dates.from} to ${itineraryJSON.dates.to}`
                    );
                  }
                }
              }
            }
          }
        }
      }

      // Try to extract duration from first lines
      if (!itineraryJSON.duration) {
        const durMatch = line.match(/(\d+)\s*days?/i);
        if (durMatch && durMatch[1]) {
          itineraryJSON.duration = `${durMatch[1]} days`;
          console.log(`Found duration in intro: ${itineraryJSON.duration}`);
        }
      }
    }

    // Main parsing loop
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) continue;

      // Extract title if it's one of the first lines
      if (
        (line.startsWith("# ") || i < 3) &&
        !itineraryJSON.title &&
        line.length > 5
      ) {
        itineraryJSON.title = line.replace(/^#\s*/, "").trim();

        // Try to extract destination from title if not already found
        if (!itineraryJSON.destination && itineraryJSON.title) {
          // Look for "in [City]" pattern
          const titleDestMatch1 = itineraryJSON.title.match(
            /in\s+([A-Za-z\s]+)(?:,|\.|$|\s)/i
          );
          if (titleDestMatch1 && titleDestMatch1[1]) {
            itineraryJSON.destination = titleDestMatch1[1].trim();
            console.log(
              `Found destination in title (pattern 1): ${itineraryJSON.destination}`
            );
          }
          // Look for "for [City]" pattern
          else if (
            itineraryJSON.title.match(/for\s+([A-Za-z\s]+)(?:,|\.|$|\s)/i)
          ) {
            const titleDestMatch2 = itineraryJSON.title.match(
              /for\s+([A-Za-z\s]+)(?:,|\.|$|\s)/i
            );
            if (titleDestMatch2 && titleDestMatch2[1]) {
              itineraryJSON.destination = titleDestMatch2[1].trim();
              console.log(
                `Found destination in title (pattern 2): ${itineraryJSON.destination}`
              );
            }
          }
          // Look for a standalone city name at the beginning
          else if (
            itineraryJSON.title.match(
              /^([A-Za-z\s]+)(?:\s+Itinerary|\s+Travel|\s+Trip|\s+Guide)/i
            )
          ) {
            const titleDestMatch3 = itineraryJSON.title.match(
              /^([A-Za-z\s]+)(?:\s+Itinerary|\s+Travel|\s+Trip|\s+Guide)/i
            );
            if (
              titleDestMatch3 &&
              titleDestMatch3[1] &&
              titleDestMatch3[1].length < 20
            ) {
              itineraryJSON.destination = titleDestMatch3[1].trim();
              console.log(
                `Found destination in title (pattern 3): ${itineraryJSON.destination}`
              );
            }
          }
        }

        continue;
      }

      // Check for "Getting Around" or "Transportation" section
      if (line.match(/^(Getting Around|Transportation):/i)) {
        inGettingAround = true;
        inAccommodation = false;
        inTips = false;
        currentSection = "transportation";

        // Extract the transportation info if it's on the same line
        const transportMatch = line.match(
          /^(Getting Around|Transportation):\s*(.+)$/i
        );
        if (
          transportMatch &&
          transportMatch[2] &&
          transportMatch[2].trim().length > 0
        ) {
          itineraryJSON.additionalInfo.transportation.push(
            transportMatch[2].trim()
          );
        }

        continue;
      }

      // Check for "Accommodation" section
      if (line.match(/^Accommodation:/i)) {
        inGettingAround = false;
        inAccommodation = true;
        inTips = false;
        currentSection = "accommodation";
        continue;
      }

      // Check for "Tips for your Trip" section
      if (line.match(/^(Tips for your|Essential Tips|Tips for your Trip)/i)) {
        inGettingAround = false;
        inAccommodation = false;
        inTips = true;
        currentSection = "tips";

        // Extract the tip if it's on the same line
        const tipMatch = line.match(
          /^(Tips for your|Essential Tips|Tips for your Trip)[^:]*:\s*(.+)$/i
        );
        if (tipMatch && tipMatch[2] && tipMatch[2].trim().length > 0) {
          itineraryJSON.additionalInfo.tips.push(tipMatch[2].trim());
        }

        continue;
      }

      // Process transportation info
      if (inGettingAround && line.length > 10) {
        itineraryJSON.additionalInfo.transportation.push(line);

        // If we're in a day, also add to the day's transportation
        if (currentDay) {
          currentDay.transportation = currentDay.transportation || [];
          currentDay.transportation.push(line);
        }

        continue;
      }

      // Process accommodation info
      if (inAccommodation && line.length > 10) {
        itineraryJSON.additionalInfo.accommodation.push(line);
        continue;
      }

      // Process tips
      if (
        inTips &&
        (line.startsWith("-") || line.startsWith("*") || line.match(/^\d+\.\s/))
      ) {
        const tipContent =
          line.startsWith("-") || line.startsWith("*")
            ? line.substring(1).trim()
            : line.replace(/^\d+\.\s/, "").trim();

        itineraryJSON.additionalInfo.tips.push(tipContent);
        continue;
      }

      // Process tips without bullet points (paragraph style)
      if (
        inTips &&
        line.length > 15 &&
        !line.match(/^(Day|Morning|Afternoon|Evening|Lunch|Dinner)/i)
      ) {
        itineraryJSON.additionalInfo.tips.push(line);
        continue;
      }

      // Detect day headers - Day X: Title format (with or without heading markers)
      const dayMatch = line.match(/^(?:#+\s*)?Day\s+(\d+)(?::|-)?\s*(.+)$/i);
      if (dayMatch) {
        // If we were processing a previous day, save it
        if (currentDay) {
          itineraryJSON.days.push(currentDay);
        }

        // Start a new day with structure for the new format
        currentDay = {
          dayNumber: parseInt(dayMatch[1]),
          title: dayMatch[2].trim(),
          date: "", // Will try to extract this
          overview: "",
          activities: {
            morning: [],
            lunch: [],
            afternoon: [],
            evening: [],
            dinner: [],
          },
          transportation: [],
          notes: [],
        };

        // Extract destination from day title if possible
        const titleParts = dayMatch[2].split("&");
        if (titleParts.length > 0) {
          const possibleLocation = titleParts[0].trim();
          if (
            !possibleLocation.match(
              /^(iconic|historic|cultural|old town|downtown|city center|exploration|discovery|highlights)$/i
            )
          ) {
            possibleDestinations.add(possibleLocation);
          }
        }

        currentSection = "overview";
        currentTimeBlock = null;
        currentActivity = null;
        inGettingAround = false;
        inAccommodation = false;
        inTips = false;
        continue;
      }

      // If we're in a day section, process the content
      if (currentDay) {
        // Check for time blocks like "Morning (9:00 AM - 1:00 PM)" or just "Morning:"
        const timeBlockMatch = line.match(
          /^(Morning|Afternoon|Evening|Lunch|Dinner)(?:\s*\(?([\d:]+\s*(?:AM|PM)?\s*-\s*[\d:]+\s*(?:AM|PM)?)\)?)?:?\s*(.*)?$/i
        );
        if (timeBlockMatch) {
          const blockType = timeBlockMatch[1].toLowerCase();
          const timeRange = timeBlockMatch[2];
          const blockTitle = timeBlockMatch[3] ? timeBlockMatch[3].trim() : "";

          // Map the time block to our structure
          switch (blockType) {
            case "morning":
              currentTimeBlock = "morning";
              break;
            case "lunch":
              currentTimeBlock = "lunch";
              break;
            case "afternoon":
              currentTimeBlock = "afternoon";
              break;
            case "evening":
              currentTimeBlock = "evening";
              break;
            case "dinner":
              currentTimeBlock = "dinner";
              break;
          }

          // Reset current activity
          currentActivity = null;

          // Add time block metadata
          if (currentTimeBlock) {
            // Ensure the array exists
            if (!currentDay.activities[currentTimeBlock]) {
              currentDay.activities[currentTimeBlock] = [];
            }

            // Store time range and title as metadata for the time block
            currentDay.activities[currentTimeBlock].timeRange = timeRange;
            if (blockTitle) {
              currentDay.activities[currentTimeBlock].title = blockTitle;
            }
          }

          currentSection = "activities";
          continue;
        }

        // Process day overview (lines right after day header)
        if (
          currentSection === "overview" &&
          line.length > 10 &&
          !line.match(
            /^(Morning|Afternoon|Evening|Lunch|Dinner|Getting Around)/i
          )
        ) {
          if (currentDay.overview) {
            currentDay.overview += " " + line;
          } else {
            currentDay.overview = line;
          }
          continue;
        }

        // Process activities based on current time block
        if (
          currentSection === "activities" &&
          currentTimeBlock &&
          line.length > 5
        ) {
          // Check for activity start patterns
          const startAtMatch = line.match(/^Start at\s+([^:]+):\s*(.+)$/i);
          const visitMatch = line.match(/^Visit\s+([^:]+):\s*(.+)$/i);
          const colonMatch = line.match(/^([^:]+):\s*(.+)$/i);

          // Check if this is a new activity
          if (
            startAtMatch ||
            visitMatch ||
            colonMatch ||
            line.startsWith("-") ||
            line.startsWith("*")
          ) {
            // If we were processing a previous activity, finalize it
            if (currentActivity) {
              // Ensure the time block array exists
              if (!currentDay.activities[currentTimeBlock]) {
                currentDay.activities[currentTimeBlock] = [];
              }

              // Add the completed activity
              currentDay.activities[currentTimeBlock].push(currentActivity);
            }

            // Create a new activity
            currentActivity = {
              name: "",
              description: "",
              text: line,
              details: {},
            };

            // Extract activity name and description
            if (startAtMatch) {
              currentActivity.name = startAtMatch[1].trim();
              currentActivity.description = startAtMatch[2].trim();
            } else if (visitMatch) {
              currentActivity.name = visitMatch[1].trim();
              currentActivity.description = visitMatch[2].trim();
            } else if (
              colonMatch &&
              !line.match(/^(Significance|Tip|Alternative|Option \d+):/i)
            ) {
              currentActivity.name = colonMatch[1].trim();
              currentActivity.description = colonMatch[2].trim();
            } else if (line.startsWith("-") || line.startsWith("*")) {
              const content = line.substring(1).trim();
              const contentColonMatch = content.match(/^([^:]+):\s*(.+)$/);

              if (contentColonMatch) {
                currentActivity.name = contentColonMatch[1].trim();
                currentActivity.description = contentColonMatch[2].trim();
              } else {
                currentActivity.name = content;
              }
            }

            // Extract time information if available
            const timeMatch = line.match(
              /\((\d{1,2}:\d{2}(?:\s*(?:AM|PM))?(?:-\d{1,2}:\d{2}(?:\s*(?:AM|PM))?))\)/i
            );
            if (timeMatch) {
              currentActivity.time = timeMatch[1];
            }
          }
          // Check for significance information
          else if (line.match(/^Significance:/i)) {
            if (currentActivity) {
              const significanceText = line
                .replace(/^Significance:\s*/i, "")
                .trim();
              currentActivity.significance = significanceText;
              currentActivity.details.significance = significanceText;
            }
          }
          // Check for tip information
          else if (line.match(/^Tip:/i)) {
            if (currentActivity) {
              const tipText = line.replace(/^Tip:\s*/i, "").trim();
              currentActivity.tip = tipText;
              currentActivity.details.tip = tipText;
            }
          }
          // Check for alternative options
          else if (line.match(/^Alternative:/i)) {
            if (currentActivity) {
              const alternativeText = line
                .replace(/^Alternative:\s*/i, "")
                .trim();
              if (!currentActivity.alternatives) {
                currentActivity.alternatives = [];
              }
              currentActivity.alternatives.push(alternativeText);
            } else {
              // Create a new choice activity
              currentActivity = {
                name: "Options",
                isChoice: true,
                options: [line],
                text: line,
              };
            }
          }
          // Check for option patterns
          else if (line.match(/^Option \d+:/i)) {
            if (currentActivity && currentActivity.isChoice) {
              const optionText = line.replace(/^Option \d+:\s*/i, "").trim();
              if (!currentActivity.options) {
                currentActivity.options = [];
              }
              currentActivity.options.push(optionText);
            } else {
              // Create a new choice activity
              currentActivity = {
                name: "Options",
                isChoice: true,
                options: [line],
                text: line,
              };
            }
          }
          // Check for "Choose" patterns
          else if (line.match(/^Choose/i)) {
            // Create a new choice activity
            currentActivity = {
              name: line,
              isChoice: true,
              text: line,
              options: [],
            };
          }
          // If none of the above, treat as additional description for current activity
          else if (currentActivity) {
            if (currentActivity.description) {
              currentActivity.description += " " + line;
            } else {
              currentActivity.description = line;
            }
          }
          // If no current activity, create a generic one
          else {
            currentActivity = {
              text: line,
            };
          }

          continue;
        }
      }
    }

    // Add the last activity if we were processing one
    if (currentDay && currentTimeBlock && currentActivity) {
      if (!currentDay.activities[currentTimeBlock]) {
        currentDay.activities[currentTimeBlock] = [];
      }
      currentDay.activities[currentTimeBlock].push(currentActivity);
    }

    // Add the last day if we were processing one
    if (currentDay) {
      itineraryJSON.days.push(currentDay);
    }

    // If we didn't find a destination yet, try from the collected possible destinations
    if (!itineraryJSON.destination && possibleDestinations.size > 0) {
      const destinationsArray = Array.from(possibleDestinations);
      itineraryJSON.destination = destinationsArray[0];
      console.log(
        `Extracted destination from day titles: ${itineraryJSON.destination}`
      );
    }

    // If we didn't find duration yet, use the number of days
    if (!itineraryJSON.duration && itineraryJSON.days.length > 0) {
      itineraryJSON.duration = `${itineraryJSON.days.length} days`;
      console.log(
        `Set duration based on number of days: ${itineraryJSON.duration}`
      );
    }

    // Extract dates from the text if available
    const dateRangeMatch = itineraryString.match(
      /(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{4})?)\s*(?:to|-)\s*(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{4})?)/i
    );

    // Also try to match date formats like "June 14-15, 2025" or "(June 14-15, 2025)"
    const compactDateRangeMatch = itineraryString.match(
      /\(?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:-|\s*to\s*)(\d{1,2})(?:,\s*|\s+)(\d{4})\)?/i
    );

    if (dateRangeMatch) {
      itineraryJSON.dates.from = dateRangeMatch[1];
      itineraryJSON.dates.to = dateRangeMatch[2];
      console.log(
        `Found date range: ${itineraryJSON.dates.from} to ${itineraryJSON.dates.to}`
      );
    } else if (compactDateRangeMatch) {
      // For format like "June 14-15, 2025"
      const month = compactDateRangeMatch[0].match(
        /(?:January|February|March|April|May|June|July|August|September|October|November|December)/i
      )[0];
      const startDay = compactDateRangeMatch[1];
      const endDay = compactDateRangeMatch[2];
      const year = compactDateRangeMatch[3];

      itineraryJSON.dates.from = `${month} ${startDay}, ${year}`;
      itineraryJSON.dates.to = `${month} ${endDay}, ${year}`;
      console.log(
        `Found compact date range: ${itineraryJSON.dates.from} to ${itineraryJSON.dates.to}`
      );
    }

    // Try to standardize dates if we found them
    try {
      if (itineraryJSON.dates.from) {
        const fromDate = new Date(itineraryJSON.dates.from);
        if (!isNaN(fromDate.getTime())) {
          itineraryJSON.dates.from = fromDate.toISOString().split("T")[0];
        }
      }

      if (itineraryJSON.dates.to) {
        const toDate = new Date(itineraryJSON.dates.to);
        if (!isNaN(toDate.getTime())) {
          itineraryJSON.dates.to = toDate.toISOString().split("T")[0];
        }
      }
    } catch (e) {
      console.warn("Could not standardize dates:", e);
    }

    // If no days were parsed but we have the original text, create a fallback day
    if (itineraryJSON.days.length === 0 && itineraryString) {
      console.log("No days were parsed. Creating a fallback day structure.");

      // Create a single day with the entire content
      const fallbackDay = {
        dayNumber: 1,
        title: itineraryJSON.title || "Day 1",
        overview: itineraryString.substring(0, 200) + "...",
        activities: {
          morning: [
            {
              name: "Activities",
              description: "See the full itinerary text for details",
              text: "The itinerary parsing encountered an issue. Please refer to the original text.",
            },
          ],
        },
      };

      itineraryJSON.days.push(fallbackDay);
      console.log(
        "Added fallback day structure to ensure itinerary has content"
      );

      // Make sure we have at least a basic destination
      if (!itineraryJSON.destination) {
        // Try to extract destination from title
        const titleDestMatch =
          itineraryJSON.title &&
          itineraryJSON.title.match(/for\s+([A-Za-z\s]+)/i);
        if (titleDestMatch && titleDestMatch[1]) {
          itineraryJSON.destination = titleDestMatch[1].trim();
          console.log(
            `Extracted destination from title: ${itineraryJSON.destination}`
          );
        } else {
          itineraryJSON.destination = "Unknown Location";
          console.log("Using default destination: Unknown Location");
        }
      }

      // Set a default duration if missing
      if (!itineraryJSON.duration) {
        itineraryJSON.duration = "1 day";
        console.log("Using default duration: 1 day");
      }
    }

    console.log("Conversion to JSON complete, enhancing structure...");

    // Enhance the itinerary with geolocation and additional metadata
    const enhancedItinerary = enhanceItineraryStructure(itineraryJSON);

    return enhancedItinerary;
  } catch (error) {
    console.error("Error converting itinerary to JSON:", error);
    // Return a simplified JSON with the original string if conversion fails
    return {
      title: "Itinerary",
      originalText: itineraryString,
      days: [
        {
          dayNumber: 1,
          title: "Itinerary Details",
          overview: itineraryString.substring(0, 200) + "...",
          activities: {
            morning: [
              {
                name: "Activities",
                description: "See the full itinerary text for details",
                text: "The itinerary parsing encountered an issue. Please refer to the original text.",
              },
            ],
          },
        },
      ],
      error: error.message,
      conversionFailed: true,
      createdAt: new Date().toISOString(),
    };
  }
};

/**
 * Save an itinerary to the backend
 * @param {string} chatId - The chat ID to associate with this itinerary
 * @param {Object} itineraryData - The generated itinerary data
 * @returns {Promise<Object>} - API response
 */
export const saveItinerary = async (chatId, itineraryData) => {
  try {
    console.log("Saving itinerary for chat:", chatId);

    // Get authentication token if available
    let headers = { "Content-Type": "application/json" };
    try {
      // Use clerk-js directly in this utility function
      const Clerk = window.Clerk;
      if (Clerk?.session) {
        const token = await Clerk.session.getToken();
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (authError) {
      console.warn("Auth not available for itinerary save:", authError);
    }

    // Get the current user ID
    const userId = window.Clerk?.user?.id || localStorage.getItem("userId");

    // Clean up the itinerary text if it contains markdown code blocks
    // First check if we have rawItinerary (from generateItinerary) or itinerary (from direct save)
    let cleanItineraryText =
      itineraryData.rawItinerary || itineraryData.itinerary;
    if (cleanItineraryText) {
      // Remove markdown code block indicators
      cleanItineraryText = cleanItineraryText
        .replace(/```json|```/g, "")
        .trim();
      console.log("Cleaned itinerary text from markdown code blocks");
    }

    // Use the structured itinerary from the new format or convert from text if needed
    let structuredItinerary = itineraryData.structuredItinerary;

    // If no structured itinerary provided but we have text content, try to convert it
    if (!structuredItinerary && cleanItineraryText) {
      try {
        console.log("No structured itinerary provided, converting from text");

        // Try to parse as JSON first if it looks like JSON
        if (cleanItineraryText.trim().startsWith("{")) {
          try {
            structuredItinerary = JSON.parse(cleanItineraryText);
            console.log("Successfully parsed itinerary text as JSON");
          } catch (jsonError) {
            console.warn(
              "Failed to parse as JSON, falling back to converter:",
              jsonError
            );
            structuredItinerary = convertItineraryToJSON(cleanItineraryText);
          }
        } else {
          structuredItinerary = convertItineraryToJSON(cleanItineraryText);
          console.log(
            "Successfully converted itinerary text to JSON structure"
          );
        }
      } catch (conversionError) {
        console.error("Error converting itinerary to JSON:", conversionError);
        // Create a minimal structure to avoid errors
        structuredItinerary = {
          title: itineraryData.metadata?.title || "Travel Itinerary",
          destination:
            itineraryData.metadata?.destination || "Unknown Location",
          duration: itineraryData.metadata?.duration || "Unknown Duration",
          dates: itineraryData.metadata?.dates || { from: "", to: "" },
          days: [],
          format: "legacy-fallback",
          createdAt: new Date().toISOString(),
        };
      }
    }

    // If we still don't have a structured itinerary, create a minimal one
    if (!structuredItinerary) {
      console.log("Creating minimal structured itinerary as fallback");
      structuredItinerary = {
        title: itineraryData.metadata?.title || "Travel Itinerary",
        destination: itineraryData.metadata?.destination || "Unknown Location",
        duration: itineraryData.metadata?.duration || "Unknown Duration",
        dates: itineraryData.metadata?.dates || { from: "", to: "" },
        days: [],
        format: "legacy-fallback",
        createdAt: new Date().toISOString(),
      };
    }

    console.log("Sending structured itinerary to be saved");
    console.log(
      "Structure format:",
      itineraryData.metadata?.format || "legacy"
    );
    console.log(
      "Structure contains:",
      structuredItinerary.days
        ? `${structuredItinerary.days.length} days`
        : structuredItinerary.sections
        ? `${structuredItinerary.sections.length} sections`
        : "Unknown structure"
    );

    // Clean up the title if it contains markdown artifacts
    if (
      structuredItinerary.title &&
      structuredItinerary.title.includes("```")
    ) {
      structuredItinerary.title = structuredItinerary.title
        .replace(/```json|```/g, "")
        .trim();
    }

    // Extract correct destination from formatted text
    let extractedDestination = null;
    if (cleanItineraryText) {
      // Try to extract destination from the formatted text using regex
      const destinationMatch = cleanItineraryText.match(
        /\*\*Destination:\*\*\s+([^\n]+)/
      );
      if (destinationMatch && destinationMatch[1]) {
        extractedDestination = destinationMatch[1].trim();
        console.log(
          `Extracted destination from text: "${extractedDestination}"`
        );
      }
    }

    // Fix destination if it's incorrect (like "advance" or "gourmet experiences")
    const incorrectDestinations = [
      "advance",
      "gourmet experiences",
      "culinary delights",
      "experiences",
    ];
    if (
      !structuredItinerary.destination ||
      incorrectDestinations.includes(
        structuredItinerary.destination.toLowerCase()
      )
    ) {
      // Use extracted destination or metadata destination
      const correctDestination =
        extractedDestination || itineraryData.metadata?.destination;
      if (correctDestination) {
        console.log(
          `Fixing incorrect destination "${structuredItinerary.destination}" to "${correctDestination}"`
        );
        structuredItinerary.destination = correctDestination;
      }
    }

    // Extract dates from formatted text if they're missing
    if (
      (!structuredItinerary.dates?.from || !structuredItinerary.dates?.to) &&
      cleanItineraryText
    ) {
      const datesMatch = cleanItineraryText.match(/\*\*Dates:\*\*\s+([^\n]+)/);
      if (datesMatch && datesMatch[1]) {
        const dateText = datesMatch[1].trim();
        const dateParts = dateText.split(" to ");

        if (dateParts.length === 2) {
          if (!structuredItinerary.dates) {
            structuredItinerary.dates = {};
          }

          structuredItinerary.dates.from = dateParts[0].trim();
          structuredItinerary.dates.to = dateParts[1].trim();

          console.log(
            `Extracted dates from text: from="${structuredItinerary.dates.from}", to="${structuredItinerary.dates.to}"`
          );
        }
      }
    }

    // Make sure days have the correct structure for the new format
    if (structuredItinerary.days && Array.isArray(structuredItinerary.days)) {
      // Check if this is the new format with sections
      const hasNewFormat = structuredItinerary.days.some((day) => day.sections);

      if (hasNewFormat) {
        // Ensure all days have sections property
        structuredItinerary.days.forEach((day) => {
          if (!day.sections) {
            day.sections = [];
            console.log(`Added missing sections array to day ${day.dayNumber}`);
          }
        });
      } else {
        // Try to convert from legacy format to new format with sections
        console.log(
          "Converting from legacy format to new format with sections"
        );

        structuredItinerary.days.forEach((day) => {
          // Create sections array if it doesn't exist
          if (!day.sections) {
            day.sections = [];
          }

          // Extract activities from day overview if available
          if (day.overview) {
            const sections = [];

            // Extract Morning section
            const morningMatch = day.overview.match(/### Morning[^#]*/i);
            if (morningMatch) {
              sections.push({
                timeOfDay: "Morning",
                time: extractTimeRange(morningMatch[0]) || "9:00 AM - 1:00 PM",
                activities: extractActivities(morningMatch[0]),
              });
            }

            // Extract Lunch section
            const lunchMatch = day.overview.match(/### Lunch[^#]*/i);
            if (lunchMatch) {
              const restaurant = extractRestaurant(lunchMatch[0]);
              if (restaurant) {
                sections.push({
                  timeOfDay: "Lunch",
                  time: extractTimeRange(lunchMatch[0]) || "1:00 PM - 2:00 PM",
                  restaurant: restaurant,
                });
              }
            }

            // Extract Afternoon section
            const afternoonMatch = day.overview.match(/### Afternoon[^#]*/i);
            if (afternoonMatch) {
              sections.push({
                timeOfDay: "Afternoon",
                time:
                  extractTimeRange(afternoonMatch[0]) || "2:00 PM - 6:00 PM",
                activities: extractActivities(afternoonMatch[0]),
              });
            }

            // Extract Evening section
            const eveningMatch = day.overview.match(/### Evening[^#]*/i);
            if (eveningMatch) {
              sections.push({
                timeOfDay: "Evening",
                time: extractTimeRange(eveningMatch[0]) || "7:00 PM onwards",
                options: extractEveningOptions(eveningMatch[0]),
              });
            }

            // Add sections to day
            if (sections.length > 0) {
              day.sections = sections;
              console.log(
                `Added ${sections.length} sections to day ${day.dayNumber}`
              );
            }
          }

          // If we still don't have sections but have activities, convert them
          if (day.sections.length === 0 && day.activities) {
            const timeBlocks = [
              "morning",
              "lunch",
              "afternoon",
              "evening",
              "dinner",
            ];

            timeBlocks.forEach((timeBlock) => {
              if (
                day.activities[timeBlock] &&
                day.activities[timeBlock].length > 0
              ) {
                const formattedTimeBlock =
                  timeBlock.charAt(0).toUpperCase() + timeBlock.slice(1);

                if (timeBlock === "lunch" || timeBlock === "dinner") {
                  // Create restaurant section
                  const restaurant = day.activities[timeBlock][0];
                  if (restaurant) {
                    day.sections.push({
                      timeOfDay: formattedTimeBlock,
                      time: getDefaultTimeForBlock(timeBlock),
                      restaurant: {
                        name: restaurant.name || "Restaurant",
                        cuisine: restaurant.description || "Local Cuisine",
                        notes: restaurant.text || "",
                      },
                    });
                  }
                } else {
                  // Create regular activities section
                  day.sections.push({
                    timeOfDay: formattedTimeBlock,
                    time: getDefaultTimeForBlock(timeBlock),
                    activities: day.activities[timeBlock].map((act) => ({
                      title: act.name || "Activity",
                      description: act.description || act.text || "",
                      type: act.type || "Activity",
                    })),
                  });
                }
              }
            });

            console.log(
              `Converted legacy activities to ${day.sections.length} sections for day ${day.dayNumber}`
            );
          }
        });
      }
    }

    // Prepare metadata with format information
    const metadata = {
      ...(itineraryData.metadata || {}),
      savedAt: new Date().toISOString(),
      format:
        itineraryData.metadata?.format ||
        (structuredItinerary.days &&
        structuredItinerary.days[0] &&
        structuredItinerary.days[0].sections
          ? "structured-json-v2"
          : "legacy"),
      destination:
        extractedDestination ||
        structuredItinerary.destination ||
        itineraryData.metadata?.destination,
      title: structuredItinerary.title || itineraryData.metadata?.title,
      budget: structuredItinerary.budget || itineraryData.metadata?.budget,
      dates: {
        from:
          structuredItinerary.dates?.from ||
          itineraryData.metadata?.dates?.from ||
          "",
        to:
          structuredItinerary.dates?.to ||
          itineraryData.metadata?.dates?.to ||
          "",
      },
    };

    // Clean up title in metadata if needed
    if (metadata.title && metadata.title.includes("```")) {
      metadata.title = metadata.title.replace(/```json|```/g, "").trim();
    }

    // Make sure the structuredItinerary is serializable
    let safeStructuredItinerary;
    try {
      // Convert to string and back to remove any circular references or non-serializable data
      safeStructuredItinerary = JSON.parse(JSON.stringify(structuredItinerary));
      console.log("Successfully sanitized structuredItinerary for saving");
    } catch (error) {
      console.error("Error sanitizing structuredItinerary:", error);
      // Create a minimal version as fallback
      safeStructuredItinerary = {
        title: structuredItinerary.title || "Travel Itinerary",
        destination:
          extractedDestination ||
          structuredItinerary.destination ||
          "Unknown Destination",
        dates: structuredItinerary.dates || { from: "", to: "" },
        days: [],
      };
      console.log(
        "Created simplified structuredItinerary due to serialization error"
      );
    }

    // Check size before sending - MongoDB has a 16MB document size limit
    const estimatedSize = JSON.stringify(safeStructuredItinerary).length;
    console.log(`Estimated structuredItinerary size: ${estimatedSize} bytes`);

    if (estimatedSize > 15 * 1024 * 1024) {
      // 15MB safety limit
      console.error("Itinerary data exceeds MongoDB document size limit");
      return {
        success: false,
        error: "Itinerary data too large for database storage",
      };
    }

    // Log the data structure being sent
    console.log("Metadata being sent:", JSON.stringify(metadata, null, 2));

    // Send the data to the backend
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/itineraries?userId=${userId}`,
      {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          chatId,
          // Include both raw text and structured content
          itinerary: cleanItineraryText,
          structuredItinerary: safeStructuredItinerary,
          metadata,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Server response error:", errorData);
      throw new Error(
        `Failed to save itinerary: ${response.status} - ${errorData}`
      );
    }

    const result = await response.json();
    console.log("Itinerary saved successfully with ID:", result.itineraryId);
    return {
      success: true,
      itineraryId: result.itineraryId,
      ...result,
    };
  } catch (error) {
    console.error("Error saving itinerary:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Helper function to extract time range from a section text
 * @param {string} sectionText - The text of a section
 * @returns {string|null} - Extracted time range or null if not found
 */
function extractTimeRange(sectionText) {
  const timeMatch = sectionText.match(
    /\(([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM|am|pm)?\s*-\s*[0-9]{1,2}:[0-9]{2}\s*(?:AM|PM|am|pm)?)\)/
  );
  return timeMatch ? timeMatch[1] : null;
}

/**
 * Helper function to extract activities from a section text
 * @param {string} sectionText - The text of a section
 * @returns {Array} - Array of activity objects
 */
function extractActivities(sectionText) {
  const activities = [];

  // Match patterns like "**Activity Name** - Type" or "**Activity Name**"
  const activityMatches = sectionText.matchAll(
    /\*\*(.*?)\*\*(?:\s*-\s*([^\n]*))?([^*]*)/g
  );

  for (const match of activityMatches) {
    const title = match[1].trim();
    const type = match[2] ? match[2].trim() : "Activity";
    const descriptionBlock = match[3] || "";

    // Extract description (text before any *Tip:* or similar)
    let description = descriptionBlock.trim();
    const tipIndex = description.indexOf("*Tip:");
    if (tipIndex > 0) {
      description = description.substring(0, tipIndex).trim();
    }

    // Extract tip if available
    let tip = null;
    const tipMatch = descriptionBlock.match(/\*Tip:\s*(.*?)\*/);
    if (tipMatch) {
      tip = tipMatch[1].trim();
    }

    // Extract alternative if available
    let alternative = null;
    const altMatch = descriptionBlock.match(/\*Alternative:\s*(.*?)\*/);
    if (altMatch) {
      alternative = altMatch[1].trim();
    }

    // Extract cost if available
    let estimatedCost = null;
    const costMatch = descriptionBlock.match(/\*Cost:\s*(\d+)\s*([A-Z]{3})\*/);
    if (costMatch) {
      estimatedCost = {
        amount: parseInt(costMatch[1]),
        currency: costMatch[2],
      };
    }

    // Only add if it's actually an activity (not a section header)
    if (
      title &&
      !title.includes("Morning") &&
      !title.includes("Afternoon") &&
      !title.includes("Evening") &&
      !title.includes("Lunch") &&
      !title.includes("Dinner")
    ) {
      activities.push({
        activityId: title.toLowerCase().replace(/\s+/g, "-"),
        title,
        type,
        description,
        tip,
        alternative,
        estimatedCost,
        tags: [],
      });
    }
  }

  return activities;
}

/**
 * Helper function to extract restaurant from a lunch/dinner section
 * @param {string} sectionText - The text of a section
 * @returns {Object|null} - Restaurant object or null if not found
 */
function extractRestaurant(sectionText) {
  // Match patterns like "**Restaurant Name** - Cuisine Type"
  const restaurantMatch = sectionText.match(
    /\*\*(.*?)\*\*(?:\s*-\s*([^\n]*))?([^*]*)/
  );

  if (restaurantMatch) {
    const name = restaurantMatch[1].trim();
    const cuisine = restaurantMatch[2]
      ? restaurantMatch[2].trim()
      : "Restaurant";
    const descriptionBlock = restaurantMatch[3] || "";

    // Extract notes (text before any *Cost:* or similar)
    let notes = descriptionBlock.trim();
    const costIndex = notes.indexOf("*Cost:");
    if (costIndex > 0) {
      notes = notes.substring(0, costIndex).trim();
    }

    // Extract cost if available
    let estimatedCost = null;
    const costMatch = descriptionBlock.match(/\*Cost:\s*(\d+)\s*([A-Z]{3})\*/);
    if (costMatch) {
      estimatedCost = {
        amount: parseInt(costMatch[1]),
        currency: costMatch[2],
      };
    }

    return {
      activityId: `restaurant-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      type: "Restaurant",
      cuisine,
      notes,
      estimatedCost,
      tags: ["dining"],
    };
  }

  return null;
}

/**
 * Helper function to extract evening options
 * @param {string} sectionText - The text of a section
 * @returns {Array} - Array of option objects
 */
function extractEveningOptions(sectionText) {
  const options = [];

  // Check if there's an "Evening Options:" section
  if (
    sectionText.includes("Evening Options:") ||
    sectionText.includes("**Evening Options:**")
  ) {
    // Match patterns like "1. **Place Name** - Type" or numbered options
    const optionMatches = sectionText.matchAll(
      /\d+\.\s*\*\*(.*?)\*\*(?:\s*-\s*([^\n]*))?([^*\d]*)/g
    );

    for (const match of optionMatches) {
      const place = match[1].trim();
      const type = match[2] ? match[2].trim() : "Entertainment";
      const descriptionBlock = match[3] || "";

      // Extract description (text before any *Cost:* or similar)
      let description = descriptionBlock.trim();
      const costIndex = description.indexOf("*Cost:");
      if (costIndex > 0) {
        description = description.substring(0, costIndex).trim();
      }

      // Extract cost if available
      let estimatedCost = null;
      const costMatch = descriptionBlock.match(
        /\*Cost:\s*(\d+)\s*([A-Z]{3})\*/
      );
      if (costMatch) {
        estimatedCost = {
          amount: parseInt(costMatch[1]),
          currency: costMatch[2],
        };
      }

      options.push({
        activityId: `option-${place.toLowerCase().replace(/\s+/g, "-")}`,
        type,
        place,
        description,
        estimatedCost,
        tags: [type.toLowerCase()],
      });
    }
  }

  return options;
}

/**
 * Helper function to get default time range for a time block
 * @param {string} timeBlock - The time block name
 * @returns {string} - Default time range
 */
function getDefaultTimeForBlock(timeBlock) {
  switch (timeBlock.toLowerCase()) {
    case "morning":
      return "9:00 AM - 1:00 PM";
    case "lunch":
      return "1:00 PM - 2:00 PM";
    case "afternoon":
      return "2:00 PM - 6:00 PM";
    case "evening":
    case "dinner":
      return "7:00 PM onwards";
    default:
      return "";
  }
}

/**
 * בדיקה האם לצ'אט יש כבר יומן מסע קיים
 * @param {string} chatId - מזהה הצ'אט לבדיקה
 * @returns {Promise<Object>} - תוצאת הבדיקה עם פרטי היומן אם קיים
 */
export const checkForExistingItinerary = async (chatId) => {
  try {
    if (!chatId) {
      console.warn("No chatId provided to check for existing itinerary");
      return { exists: false };
    }

    console.log("Checking for existing itinerary for chat:", chatId);

    // הכנת הכותרות לבקשה
    let headers = { "Content-Type": "application/json" };
    try {
      // שימוש ב-Clerk לקבלת טוקן אותנטיקציה
      const Clerk = window.Clerk;
      if (Clerk?.session) {
        const token = await Clerk.session.getToken();
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (authError) {
      console.warn("Auth not available for itinerary check:", authError);
    }

    // קבלת מזהה המשתמש
    const userId = window.Clerk?.user?.id || localStorage.getItem("userId");

    // שליחת בקשה לשרת לבדיקת יומן קיים
    const response = await fetch(
      `${
        import.meta.env.VITE_API_URL
      }/api/itineraries/check?chatId=${chatId}&userId=${userId}`,
      {
        method: "GET",
        credentials: "include",
        headers,
      }
    );

    if (!response.ok) {
      console.warn(
        `Failed to check for existing itinerary: ${response.status}`
      );
      return { exists: false };
    }

    const result = await response.json();

    if (result.exists) {
      console.log("Found existing itinerary:", result.itineraryId);
      return {
        exists: true,
        itineraryId: result.itineraryId,
        metadata: result.metadata || {},
        destination: result.metadata?.destination,
      };
    }

    return { exists: false };
  } catch (error) {
    console.error("Error checking for existing itinerary:", error);
    return { exists: false, error: error.message };
  }
};

/**
 * חילוץ מידע על יום ספציפי מיומן מסע במבנה החדש (JSON v2)
 * @param {Object} structuredItinerary - יומן מסע במבנה JSON מובנה החדש
 * @param {string} dayIdentifier - מזהה היום (למשל "first day", "day 2", וכו')
 * @returns {Object} - מידע על היום המבוקש
 */
export const extractDayInfoFromNewFormat = (
  structuredItinerary,
  dayIdentifier
) => {
  if (!structuredItinerary || !structuredItinerary.days || !dayIdentifier) {
    return null;
  }

  // המרת מזהה היום למספר יום (1-based)
  let dayIndex = -1;
  dayIdentifier = dayIdentifier.toLowerCase().trim();

  // חיפוש התאמות עם מילות מפתח שונות
  if (
    dayIdentifier === "first day" ||
    dayIdentifier === "day 1" ||
    dayIdentifier === "היום הראשון" ||
    dayIdentifier === "יום 1" ||
    dayIdentifier === "יום ראשון בטיול" ||
    dayIdentifier === "first"
  ) {
    dayIndex = 0; // 0-based array index for first day
  } else if (
    dayIdentifier === "last day" ||
    dayIdentifier === "היום האחרון" ||
    dayIdentifier === "final day" ||
    dayIdentifier === "last"
  ) {
    dayIndex = structuredItinerary.days.length - 1;
  } else if (
    dayIdentifier.includes("second day") ||
    dayIdentifier.includes("day 2") ||
    dayIdentifier.includes("היום השני") ||
    dayIdentifier.includes("יום 2")
  ) {
    dayIndex = 1; // 0-based array index for second day
  } else if (
    dayIdentifier.includes("third day") ||
    dayIdentifier.includes("day 3") ||
    dayIdentifier.includes("היום השלישי") ||
    dayIdentifier.includes("יום 3")
  ) {
    dayIndex = 2; // 0-based array index for third day
  } else {
    // חיפוש מספר יום ספציפי בטקסט
    const dayNumberMatch =
      dayIdentifier.match(/day\s+(\d+)/i) || dayIdentifier.match(/יום\s+(\d+)/);

    if (dayNumberMatch && dayNumberMatch[1]) {
      const dayNumber = parseInt(dayNumberMatch[1], 10);
      if (
        !isNaN(dayNumber) &&
        dayNumber > 0 &&
        dayNumber <= structuredItinerary.days.length
      ) {
        dayIndex = dayNumber - 1; // המרה ל-0-based index
      }
    }
  }

  if (dayIndex === -1 || dayIndex >= structuredItinerary.days.length) {
    console.warn(`Could not find day matching identifier: ${dayIdentifier}`);
    return null;
  }

  // חילוץ המידע על היום המבוקש
  const day = structuredItinerary.days[dayIndex];

  // חילוץ פעילויות לפי זמני היום
  const activities = {};
  const allActivities = [];

  // עיבוד המקטעים (sections) של היום
  if (day.sections && Array.isArray(day.sections)) {
    day.sections.forEach((section) => {
      const timeOfDay = section.timeOfDay.toLowerCase();

      // הוספת פעילויות רגילות
      if (section.activities && Array.isArray(section.activities)) {
        activities[timeOfDay] = section.activities;
        allActivities.push(
          ...section.activities.map((act) => ({
            ...act,
            timeOfDay,
            time: section.time,
          }))
        );
      }

      // הוספת מסעדה אם קיימת
      if (section.restaurant) {
        activities[timeOfDay] = [section.restaurant];
        allActivities.push({
          ...section.restaurant,
          timeOfDay,
          time: section.time,
          type: "Restaurant",
        });
      }

      // הוספת אפשרויות ערב
      if (section.options && Array.isArray(section.options)) {
        activities[timeOfDay] = section.options;
        allActivities.push(
          ...section.options.map((opt) => ({
            ...opt,
            timeOfDay,
            time: section.time,
          }))
        );
      }
    });
  }

  // ייצור אובייקט תשובה עם כל המידע הרלוונטי
  return {
    dayNumber: day.dayNumber,
    dayId: day.dayId,
    title: day.title,
    theme: day.theme,
    activities,
    allActivities,
    sections: day.sections,
    // השתמש ביעד הטיול מהמטא-דאטה
    location: structuredItinerary.destination,
    // הוספת מידע תאריך אם קיים
    date: structuredItinerary.dates?.start
      ? new Date(
          new Date(structuredItinerary.dates.start).getTime() +
            (day.dayNumber - 1) * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split("T")[0]
      : null,
  };
};

/**
 * בדיקה האם היומן הוא במבנה החדש (JSON v2)
 * @param {Object} structuredItinerary - יומן מסע במבנה JSON מובנה
 * @returns {boolean} - האם היומן במבנה החדש
 */
export const isNewItineraryFormat = (structuredItinerary) => {
  if (!structuredItinerary) return false;

  // בדיקה אם יש מטא-דאטה עם ציון פורמט
  if (structuredItinerary.metadata?.format === "structured-json-v2") {
    return true;
  }

  // בדיקה לפי מבנה היומן
  if (
    structuredItinerary.days &&
    structuredItinerary.days.length > 0 &&
    structuredItinerary.days[0].sections
  ) {
    return true;
  }

  return false;
};

/**
 * חילוץ מידע על יום ספציפי מיומן מסע במבנה הישן
 * @param {Object} structuredItinerary - יומן מסע במבנה JSON מובנה הישן
 * @param {string} dayIdentifier - מזהה היום (למשל "first day", "day 2", וכו')
 * @returns {Object} - מידע על היום המבוקש
 */
export const extractDayInfoFromLegacyFormat = (
  structuredItinerary,
  dayIdentifier
) => {
  if (!structuredItinerary || !structuredItinerary.days || !dayIdentifier) {
    return null;
  }

  // המרת מזהה היום למספר יום (1-based)
  let dayIndex = -1;
  dayIdentifier = dayIdentifier.toLowerCase().trim();

  // חיפוש התאמות עם מילות מפתח שונות
  if (
    dayIdentifier === "first day" ||
    dayIdentifier === "day 1" ||
    dayIdentifier === "היום הראשון" ||
    dayIdentifier === "יום 1" ||
    dayIdentifier === "יום ראשון בטיול" ||
    dayIdentifier === "first"
  ) {
    dayIndex = 0; // 0-based array index for first day
  } else if (
    dayIdentifier === "last day" ||
    dayIdentifier === "היום האחרון" ||
    dayIdentifier === "final day" ||
    dayIdentifier === "last"
  ) {
    dayIndex = structuredItinerary.days.length - 1;
  } else if (
    dayIdentifier.includes("second day") ||
    dayIdentifier.includes("day 2") ||
    dayIdentifier.includes("היום השני") ||
    dayIdentifier.includes("יום 2")
  ) {
    dayIndex = 1; // 0-based array index for second day
  } else if (
    dayIdentifier.includes("third day") ||
    dayIdentifier.includes("day 3") ||
    dayIdentifier.includes("היום השלישי") ||
    dayIdentifier.includes("יום 3")
  ) {
    dayIndex = 2; // 0-based array index for third day
  } else {
    // חיפוש מספר יום ספציפי בטקסט
    const dayNumberMatch =
      dayIdentifier.match(/day\s+(\d+)/i) || dayIdentifier.match(/יום\s+(\d+)/);

    if (dayNumberMatch && dayNumberMatch[1]) {
      const dayNumber = parseInt(dayNumberMatch[1], 10);
      if (
        !isNaN(dayNumber) &&
        dayNumber > 0 &&
        dayNumber <= structuredItinerary.days.length
      ) {
        dayIndex = dayNumber - 1; // המרה ל-0-based index
      }
    }
  }

  if (dayIndex === -1 || dayIndex >= structuredItinerary.days.length) {
    console.warn(`Could not find day matching identifier: ${dayIdentifier}`);
    return null;
  }

  // חילוץ המידע על היום המבוקש
  const day = structuredItinerary.days[dayIndex];

  // Get year from itinerary data - check multiple sources
  let tripYear = null;

  // Try to get year from trip metadata
  if (structuredItinerary.dates && structuredItinerary.dates.from) {
    const dateMatch = structuredItinerary.dates.from.match(/(\d{4})/);
    if (dateMatch) {
      tripYear = parseInt(dateMatch[1], 10);
      console.log(`Found year ${tripYear} in itinerary dates metadata`);
    }
  }

  // If no year found, check in the actual itinerary text
  if (!tripYear && structuredItinerary.originalText) {
    const yearMatch =
      structuredItinerary.originalText.match(/\b(202\d|203\d)\b/); // Look for years like 2023, 2024, 2030, etc.
    if (yearMatch) {
      tripYear = parseInt(yearMatch[1], 10);
      console.log(`Found year ${tripYear} in itinerary text`);
    }
  }

  // As a fallback, use the destination to guess if this is a future trip
  if (!tripYear && structuredItinerary.destination) {
    // For future trips, use next year as default
    const currentYear = new Date().getFullYear();
    tripYear = currentYear + 1;
    console.log(`No year found, defaulting to future year: ${tripYear}`);
  }

  // If still no year, use current year as fallback
  if (!tripYear) {
    tripYear = new Date().getFullYear();
    console.log(
      `No year indicators found, defaulting to current year: ${tripYear}`
    );
  }

  // חילוץ תאריך היום במבנה YYYY-MM-DD אם אפשר
  let formattedDate = null;
  let parsedYear = null;

  if (day.date) {
    try {
      console.log(`Extracting date from day ${dayIndex + 1}: "${day.date}"`);

      // Clean up the date string (remove parentheses, extra spaces, etc.)
      const dateStr = day.date.replace(/\(|\)/g, "").trim();

      // First check if the date already has a complete year
      const fullDateMatch = dateStr.match(/\b(202\d|203\d)\b/); // Look for years like 2023, 2024, 2030, etc.
      if (fullDateMatch) {
        parsedYear = parseInt(fullDateMatch[1], 10);
        console.log(`Found explicit year ${parsedYear} in day date`);

        // Try parsing as full date with year
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
          console.log(
            `Successfully parsed full date with year: ${formattedDate}`
          );
        }
      }

      // If no year in the date string itself, process month and day formats
      if (!formattedDate) {
        // Try different date formats with the extracted year from trip data
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];

        // Handle cases like "June 15" by adding the year
        let monthFound = false;
        for (let i = 0; i < monthNames.length; i++) {
          if (dateStr.toLowerCase().includes(monthNames[i].toLowerCase())) {
            // Extract day number using regex
            const dayMatch = dateStr.match(/(\d{1,2})(st|nd|rd|th)?/);
            if (dayMatch) {
              const dayNum = dayMatch[1];
              const month = i + 1; // 1-based month

              // Create date string in YYYY-MM-DD format
              const fullDateStr = `${tripYear}-${month
                .toString()
                .padStart(2, "0")}-${dayNum.toString().padStart(2, "0")}`;
              console.log(
                `Reconstructed date with year: ${fullDateStr} from "${dateStr}"`
              );
              formattedDate = fullDateStr;
              monthFound = true;
              break;
            }
          }
        }

        // If we didn't find a month name, try other formats
        if (!monthFound && !formattedDate) {
          // Try format like "15/06" or "15-06" (day/month)
          const shortDateMatch = dateStr.match(/(\d{1,2})[-./](\d{1,2})/);
          if (shortDateMatch) {
            // Assuming day/month format
            const day = parseInt(shortDateMatch[1], 10);
            const month = parseInt(shortDateMatch[2], 10);

            // Only proceed if the numbers look like valid day/month
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
              formattedDate = `${tripYear}-${month
                .toString()
                .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
              console.log(
                `Parsed day/month format with year: ${formattedDate}`
              );
            }
          }
        }
      }

      // If still no formatted date, try adding year to original string
      if (!formattedDate) {
        // Try with the trip year we determined
        const dateWithYear = `${dateStr}, ${tripYear}`;
        const dateObj = new Date(dateWithYear);

        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
          console.log(`Added trip year and parsed: ${formattedDate}`);
        } else {
          // אם ההמרה נכשלה, השתמש בתאריך המקורי
          formattedDate = dateStr;
          console.log(
            `Could not parse date: ${dateStr}, using original string`
          );
        }
      }
    } catch (e) {
      console.warn(
        `Could not parse date from day ${dayIndex + 1}:`,
        day.date,
        e
      );
      formattedDate = day.date;
    }
  } else {
    // If no date in the day object, calculate it based on the trip's start date
    try {
      if (structuredItinerary.dates && structuredItinerary.dates.from) {
        const startDate = new Date(structuredItinerary.dates.from);
        if (!isNaN(startDate.getTime())) {
          // Calculate date by adding dayIndex days to start date
          const dayDate = new Date(startDate);
          dayDate.setDate(startDate.getDate() + dayIndex);
          formattedDate = dayDate.toISOString().split("T")[0];
          parsedYear = dayDate.getFullYear();
          console.log(
            `Calculated date for day ${
              dayIndex + 1
            } from trip start date: ${formattedDate}`
          );
        }
      }
    } catch (e) {
      console.warn(`Failed to calculate date for day ${dayIndex + 1}:`, e);
    }
  }

  // Extract specific year from the formatted date if we have it
  if (formattedDate && formattedDate.includes("-") && !parsedYear) {
    const yearMatch = formattedDate.match(/^(\d{4})/);
    if (yearMatch) {
      parsedYear = parseInt(yearMatch[1], 10);
    }
  }

  // ייצור אובייקט תשובה עם כל המידע הרלוונטי
  return {
    dayNumber: dayIndex + 1,
    date: formattedDate || day.date,
    title: day.title,
    activities: day.activities,
    // השתמש ביעד הטיול מהמטא-דאטה או מהכותרת
    location: structuredItinerary.destination,
    // Include the year explicitly if we found it
    year: parsedYear || tripYear,
  };
};

/**
 * פונקציה מאוחדת לחילוץ מידע על יום ספציפי מיומן מסע, תומכת בשני המבנים
 * @param {Object} structuredItinerary - יומן מסע במבנה JSON מובנה
 * @param {string} dayIdentifier - מזהה היום (למשל "first day", "day 2", וכו')
 * @returns {Object} - מידע על היום המבוקש
 */
export const getDayInfo = (structuredItinerary, dayIdentifier) => {
  // בדיקה אם היומן במבנה החדש
  if (isNewItineraryFormat(structuredItinerary)) {
    console.log("Using new itinerary format parser");
    return extractDayInfoFromNewFormat(structuredItinerary, dayIdentifier);
  } else {
    console.log("Using legacy itinerary format parser");
    return extractDayInfoFromLegacyFormat(structuredItinerary, dayIdentifier);
  }
};

/**
 * בדיקה אם השאלה היא בקשת מידע לאחר יצירת יומן
 * פונקציה זו מזהה אם השאלה היא בקשה למידע חיצוני כמו מזג אוויר, מלונות וכו'
 * @param {string} question - השאלה שהמשתמש שאל
 * @param {Object} tripContext - הקונטקסט של היומן הקיים
 * @returns {Object} - תוצאת הניתוח
 */
export const analyzePostItineraryQuestion = (question, tripContext) => {
  if (!question || !tripContext) {
    return { isAdviceQuestion: false };
  }

  console.log("Analyzing post-itinerary question:", question);
  console.log("Itinerary context:", tripContext);

  // רשימת מילות מפתח לזיהוי שאלות מידע
  const weatherKeywords = [
    "weather",
    "מזג אוויר",
    "מזג-אוויר",
    "גשם",
    "שמש",
    "טמפרטורה",
    "יהיה חם",
    "קר",
    "תחזית",
  ];

  const hotelsKeywords = [
    "hotel",
    "מלון",
    "מלונות",
    "לינה",
    "אכסניה",
    "להתארח",
    "לישון",
    "ללון",
    "booking",
    "אירבנב",
    "airbnb",
  ];

  const restaurantsKeywords = [
    "restaurant",
    "מסעדה",
    "מסעדות",
    "אוכל",
    "לאכול",
    "ארוחה",
    "dining",
    "eat",
    "food",
  ];

  const attractionsKeywords = [
    "attractions",
    "אטרקציות",
    "מה לעשות",
    "מקומות",
    "מוזיאון",
    "museum",
    "site",
    "park",
    "פארק",
  ];

  const transportKeywords = [
    "transportation",
    "תחבורה",
    "אוטובוס",
    "רכבת",
    "מטרו",
    "taxi",
    "מונית",
    "bus",
    "train",
    "transport",
  ];

  // מילות מפתח לזיהוי ימים ספציפיים ביומן
  const dayIdentifierKeywords = [
    "first day",
    "day 1",
    "second day",
    "day 2",
    "third day",
    "day 3",
    "last day",
    "final day",
    "יום ראשון",
    "יום 1",
    "יום שני",
    "יום 2",
    "היום הראשון",
    "היום השני",
    "היום האחרון",
    "day one",
    "day two",
    "trip day",
    "יום טיול",
    "יום ספציפי",
    "specific day",
  ];

  // מילות מפתח עם מספרים ספציפיים לימים
  const ordinalDayIdentifiers = [
    "1st day",
    "2nd day",
    "3rd day",
    "4th day",
    "5th day",
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "ראשון",
    "שני",
    "שלישי",
    "רביעי",
    "חמישי",
  ];

  const questionLower = question.toLowerCase();

  // בדיקה אם השאלה מכילה מילות מפתח מאחת הקטגוריות
  const isWeatherQuestion = weatherKeywords.some((keyword) =>
    questionLower.includes(keyword)
  );
  const isHotelQuestion = hotelsKeywords.some((keyword) =>
    questionLower.includes(keyword)
  );
  const isRestaurantQuestion = restaurantsKeywords.some((keyword) =>
    questionLower.includes(keyword)
  );
  const isAttractionQuestion = attractionsKeywords.some((keyword) =>
    questionLower.includes(keyword)
  );
  const isTransportQuestion = transportKeywords.some((keyword) =>
    questionLower.includes(keyword)
  );

  // חיפוש התייחסות ליום ספציפי ביומן
  let hasDayIdentifier = false;
  let specificDay = null;

  // חיפוש מילות מפתח רגילות לימים
  for (const keyword of dayIdentifierKeywords) {
    if (questionLower.includes(keyword)) {
      hasDayIdentifier = true;
      specificDay = keyword;
      console.log(`Found day identifier: ${keyword}`);
      break;
    }
  }

  // חיפוש מספר יום במשפט אם לא נמצא עדיין
  if (!hasDayIdentifier) {
    // חיפוש משפטים כמו "on day 2" או "day 3 of my trip"
    const dayMatches = [
      ...questionLower.matchAll(
        /(?:on|for|about|during|in)?\s*(?:the)?\s*day\s+(\d+)/gi
      ),
      ...questionLower.matchAll(/יום\s+(\d+)/g),
    ];

    if (dayMatches.length > 0) {
      const dayNumber = dayMatches[0][1];
      specificDay = `day ${dayNumber}`;
      hasDayIdentifier = true;
      console.log(`Found day number match: ${specificDay}`);
    }

    // חיפוש ביטויים סידוריים כמו "second day" אם עדיין לא נמצא
    if (!hasDayIdentifier) {
      for (const ordinal of ordinalDayIdentifiers) {
        if (questionLower.includes(ordinal)) {
          specificDay = ordinal;
          hasDayIdentifier = true;
          console.log(`Found ordinal day identifier: ${ordinal}`);

          // המרת מספרים סידוריים לפורמט יום
          if (ordinal === "first" || ordinal === "ראשון") specificDay = "day 1";
          else if (ordinal === "second" || ordinal === "שני")
            specificDay = "day 2";
          else if (ordinal === "third" || ordinal === "שלישי")
            specificDay = "day 3";
          else if (ordinal === "fourth" || ordinal === "רביעי")
            specificDay = "day 4";
          else if (ordinal === "fifth" || ordinal === "חמישי")
            specificDay = "day 5";
          else if (ordinal === "1st day") specificDay = "day 1";
          else if (ordinal === "2nd day") specificDay = "day 2";
          else if (ordinal === "3rd day") specificDay = "day 3";
          else if (ordinal === "4th day") specificDay = "day 4";
          else if (ordinal === "5th day") specificDay = "day 5";
          break;
        }
      }
    }
  }

  // זיהוי הקטגוריה המתאימה
  let adviceType = null;
  let intent = null;

  if (isWeatherQuestion) {
    adviceType = "weather";
    intent = "Weather-Request";
  } else if (isHotelQuestion) {
    adviceType = "hotels";
    intent = "Find-Hotel";
  } else if (isRestaurantQuestion) {
    adviceType = "restaurants";
    intent = "Find-Restaurants";
  } else if (isAttractionQuestion) {
    adviceType = "attractions";
    intent = "Find-Attractions";
  } else if (isTransportQuestion) {
    adviceType = "transportation";
    intent = "Public-Transport-Info";
  }

  // אם זוהתה שאלת מידע כלשהי
  const isAdviceQuestion = adviceType !== null;

  // מידע מיקום בסיסי מיעד הטיול
  let locationInfo = {};
  if (tripContext.vacation_location) {
    // ניסיון לפצל את המיקום לעיר ומדינה
    const locationParts = tripContext.vacation_location
      .split(",")
      .map((part) => part.trim());
    if (locationParts.length >= 2) {
      locationInfo = {
        city: locationParts[0],
        country: locationParts[1],
      };
    } else {
      locationInfo = {
        location: tripContext.vacation_location,
      };
    }
  }

  // בדיקה אם יש מבנה מסלול מאורגן
  if (!tripContext.structuredItinerary) {
    console.log("No structured itinerary found in trip context");

    // ניסיון לחלץ מסלול מובנה מהמחרוזת של היומן אם יש
    if (tripContext.itinerary && typeof tripContext.itinerary === "string") {
      try {
        console.log("Attempting to extract structured itinerary from text");
        tripContext.structuredItinerary = convertItineraryToJSON(
          tripContext.itinerary
        );
      } catch (e) {
        console.error("Failed to convert itinerary to JSON:", e);
      }
    }
  }

  // מידע נוסף מיום ספציפי ביומן המסע
  let dayInfo = null;
  if (hasDayIdentifier && tripContext.structuredItinerary) {
    console.log("Extracting info for day:", specificDay);
    console.log("From structured itinerary:", tripContext.structuredItinerary);

    // שימוש בפונקציה המאוחדת לחילוץ מידע על היום המבוקש
    dayInfo = getDayInfo(tripContext.structuredItinerary, specificDay);
    console.log(`Found day info for ${specificDay}:`, dayInfo);
  } else if (hasDayIdentifier) {
    console.log("Day identifier found but no structured itinerary available");
  }

  // שילוב המידע מהיום הספציפי עם מידע המיקום הבסיסי
  let enhancedLocationInfo = { ...locationInfo };

  // הוספת תאריך ספציפי אם נמצא
  if (dayInfo && dayInfo.date) {
    enhancedLocationInfo.date = dayInfo.date;
    enhancedLocationInfo.time = dayInfo.date; // לטובת בקשת מזג אוויר

    if (intent === "Weather-Request") {
      // להגדיר את timeContext לפי השוואת התאריך לתאריך הנוכחי
      try {
        const dayDate = new Date(dayInfo.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // אפס את השעה להשוואת תאריכים בלבד

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (dayDate.toDateString() === today.toDateString()) {
          enhancedLocationInfo.timeContext = "today";
          enhancedLocationInfo.isToday = true;
        } else if (dayDate.toDateString() === tomorrow.toDateString()) {
          enhancedLocationInfo.timeContext = "tomorrow";
          enhancedLocationInfo.isTomorrow = true;
        } else {
          enhancedLocationInfo.timeContext = "specific_date";
        }
      } catch (e) {
        console.warn("Error comparing dates:", e);
      }
    }
  } else if (hasDayIdentifier && specificDay && intent === "Weather-Request") {
    // אם אין תאריך מפורש אבל יש יום ספציפי, נסה למצוא או לחשב תאריך
    const today = new Date();

    // חילוץ מידע מהמספר של היום המבוקש
    let dayNumber = 1;

    if (
      specificDay.includes("1") ||
      specificDay.includes("one") ||
      specificDay.includes("first")
    ) {
      dayNumber = 1;
    } else if (
      specificDay.includes("2") ||
      specificDay.includes("two") ||
      specificDay.includes("second")
    ) {
      dayNumber = 2;
    } else if (
      specificDay.includes("3") ||
      specificDay.includes("three") ||
      specificDay.includes("third")
    ) {
      dayNumber = 3;
    } else if (
      specificDay.includes("4") ||
      specificDay.includes("four") ||
      specificDay.includes("fourth")
    ) {
      dayNumber = 4;
    } else if (
      specificDay.includes("5") ||
      specificDay.includes("five") ||
      specificDay.includes("fifth")
    ) {
      dayNumber = 5;
    }

    console.log(`Using calculated day number: ${dayNumber} for ${specificDay}`);

    // חישוב התאריך לפי מספר הימים מהיום הראשון של הטיול
    let startDate = null;

    // נסה למצוא את היום הראשון מתאריכי הטיול
    if (tripContext.dates && tripContext.dates.from) {
      startDate = new Date(tripContext.dates.from);
    } else if (
      tripContext.structuredItinerary &&
      tripContext.structuredItinerary.days &&
      tripContext.structuredItinerary.days[0] &&
      tripContext.structuredItinerary.days[0].date
    ) {
      startDate = new Date(tripContext.structuredItinerary.days[0].date);
    }

    // Try harder to find the trip dates from global context if available
    if (!startDate || isNaN(startDate.getTime())) {
      // Try to find the start date from tripContext metadata
      if (
        tripContext.metadata &&
        tripContext.metadata.dates &&
        tripContext.metadata.dates.from
      ) {
        try {
          startDate = new Date(tripContext.metadata.dates.from);
          console.log(
            `Using trip start date from metadata: ${
              startDate.toISOString().split("T")[0]
            }`
          );
        } catch (e) {
          console.warn("Error parsing metadata date:", e);
        }
      }

      // If still no valid date, look at the first day of the structured itinerary more carefully
      if (
        (!startDate || isNaN(startDate.getTime())) &&
        tripContext.structuredItinerary &&
        tripContext.structuredItinerary.days &&
        tripContext.structuredItinerary.days[0]
      ) {
        const firstDayDate = tripContext.structuredItinerary.days[0].date;
        if (firstDayDate) {
          // Try to extract a full date with year
          try {
            // Check if the title or content has year information
            let yearMatch = null;
            if (tripContext.itinerary) {
              yearMatch = tripContext.itinerary.match(/202\d/); // Find first year like 2023, 2024, etc.
            }

            const firstDayDateStr = firstDayDate.replace(/\(|\)/g, "").trim();
            let modifiedDateStr = firstDayDateStr;

            // If we found a year in the itinerary, add it to the date string
            if (yearMatch && yearMatch[0]) {
              modifiedDateStr = `${firstDayDateStr} ${yearMatch[0]}`;
              console.log(
                `Adding year ${yearMatch[0]} found in itinerary to ${firstDayDateStr}`
              );
            }

            startDate = new Date(modifiedDateStr);

            // If that didn't work, try more formats
            if (isNaN(startDate.getTime())) {
              // Try month name formats
              const monthNames = [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ];

              for (let i = 0; i < monthNames.length; i++) {
                if (firstDayDateStr.includes(monthNames[i])) {
                  const dayMatch = firstDayDateStr.match(
                    /(\d{1,2})(st|nd|rd|th)?/
                  );
                  if (dayMatch) {
                    const dayNum = parseInt(dayMatch[1]);
                    const month = i + 1;
                    const year = yearMatch
                      ? parseInt(yearMatch[0])
                      : new Date().getFullYear();

                    startDate = new Date(year, month - 1, dayNum);
                    console.log(
                      `Parsed first day date using month name: ${
                        startDate.toISOString().split("T")[0]
                      }`
                    );
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Error parsing first day date:", e);
          }
        }
      }

      // If all else fails, default to today's date
      if (!startDate || isNaN(startDate.getTime())) {
        console.log("No valid start date found, using today's date");
        startDate = today;
      }
    }

    // חישוב התאריך לפי מספר היום
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + (dayNumber - 1)); // -1 כי יום 1 הוא יום ההתחלה

    // הוספת התאריך המחושב למידע המיקום
    const fullDateIsoString = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD
    enhancedLocationInfo.date = fullDateIsoString;
    enhancedLocationInfo.time = fullDateIsoString;

    // Add year explicitly to make sure we have complete date information
    enhancedLocationInfo.year = targetDate.getFullYear();
    console.log(
      `Setting explicit year=${enhancedLocationInfo.year} for the date`
    );

    // קביעת timeContext לפי תאריך יחסי
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (targetDate.toDateString() === today.toDateString()) {
      enhancedLocationInfo.timeContext = "today";
      enhancedLocationInfo.isToday = true;
    } else if (targetDate.toDateString() === tomorrow.toDateString()) {
      enhancedLocationInfo.timeContext = "tomorrow";
      enhancedLocationInfo.isTomorrow = true;
    } else {
      enhancedLocationInfo.timeContext = "specific_date";
    }

    console.log(
      `Calculated date for day ${dayNumber}: ${enhancedLocationInfo.date} (${enhancedLocationInfo.timeContext})`
    );
  }

  // מידע מיקום ספציפי מהיום המבוקש אם יש
  if (
    dayInfo &&
    dayInfo.location &&
    dayInfo.location !== enhancedLocationInfo.location
  ) {
    // אם יש מיקום ספציפי ליום זה, השתמש בו במקום המיקום הכללי של הטיול
    try {
      const dayLocationParts = dayInfo.location
        .split(",")
        .map((part) => part.trim());
      if (dayLocationParts.length >= 2) {
        enhancedLocationInfo.city = dayLocationParts[0];
        enhancedLocationInfo.country = dayLocationParts[1];
      } else {
        enhancedLocationInfo.location = dayInfo.location;
      }
    } catch (e) {
      console.warn("Error parsing day location:", e);
    }
  }

  // אם לא הצלחנו לחלץ מיקום מהיום הספציפי, נשתמש במיקום הכללי של הטיול
  if (
    hasDayIdentifier &&
    !enhancedLocationInfo.city &&
    !enhancedLocationInfo.country &&
    enhancedLocationInfo.location &&
    enhancedLocationInfo.location.includes(",")
  ) {
    const parts = enhancedLocationInfo.location.split(",").map((p) => p.trim());
    if (parts.length >= 2) {
      enhancedLocationInfo.city = parts[0];
      enhancedLocationInfo.country = parts[1];
      console.log(
        `Using general location from trip: city=${parts[0]}, country=${parts[1]}`
      );
    }
  }

  // לוג נרחב למטרות דיבאג
  console.log("Question analysis complete");
  console.log("Is advice question:", isAdviceQuestion);
  console.log("Intent:", intent);
  console.log("Has day identifier:", hasDayIdentifier);
  console.log("Specific day:", specificDay);
  console.log("Enhanced location info:", enhancedLocationInfo);

  return {
    isAdviceQuestion,
    adviceType,
    intent,
    specificDay: hasDayIdentifier ? specificDay : null,
    dayInfo,
    locationInfo: enhancedLocationInfo, // כולל תאריך והקשר זמן אם נמצאו
    suggestedState: isAdviceQuestion ? "ITINERARY_ADVICE_MODE" : null,
  };
};

/**
 * Simplified placeholder for external data integration
 * This function is currently disabled as we're using the new itinerary format
 * without external API calls
 *
 * @param {Object} structuredItinerary - The structured itinerary
 * @returns {Object} - The same itinerary without modifications
 */
export const integrateExternalDataIntoItinerary = (structuredItinerary) => {
  console.log("External data integration is currently disabled");
  return structuredItinerary;
};

/**
 * Format a structured itinerary JSON into a readable text format for display in chat
 * @param {Object} structuredItinerary - The structured itinerary JSON object
 * @returns {string} - A formatted string representation of the itinerary
 */
export const formatItineraryForDisplay = (structuredItinerary) => {
  if (!structuredItinerary) {
    return "No itinerary data available.";
  }

  try {
    // Check if this is the new format or legacy format
    const isNewFormat = isNewItineraryFormat(structuredItinerary);

    // Start building the formatted string
    let formattedText = "";

    // Add title and destination with enhanced styling - MADE SMALLER
    const title = structuredItinerary.title || "Travel Itinerary";
    const destination =
      structuredItinerary.destination || "Unknown Destination";
    formattedText += `## ${title}\n\n`;

    // Add trip overview in a more elegant format
    formattedText += `**Destination:** ${destination}\n`;

    // Add dates if available
    if (structuredItinerary.dates) {
      const startDate =
        structuredItinerary.dates.start || structuredItinerary.dates.from || "";
      const endDate =
        structuredItinerary.dates.end || structuredItinerary.dates.to || "";

      if (startDate && endDate) {
        formattedText += `**Dates:** ${startDate} to ${endDate}\n`;
      }
    }

    // Add budget if available
    if (structuredItinerary.budget) {
      formattedText += `**Budget Level:** ${structuredItinerary.budget}\n`;
    }

    formattedText += "\n---\n\n";

    // Set to track already formatted locations to avoid duplicates
    const formattedLocations = new Set();

    // Helper function to format location names in square brackets as links
    // Returns whether a replacement was made and the replacement text
    const formatLocationInText = (text) => {
      if (!text) return { text, replaced: false };

      // Track if any replacements were made
      let anyReplacement = false;

      // Find all location names in square brackets and replace them with formatted links
      const newText = text.replace(/\[([^\]]+)\]/g, (match, locationName) => {
        // Create a unique identifier for this location to avoid duplicates
        const locationKey = locationName.trim().toLowerCase();

        // If this location was already formatted, return the original text
        if (formattedLocations.has(locationKey)) {
          return match;
        }

        // Determine appropriate icon based on context
        let icon = "📍"; // Default icon for attractions

        const lowerText = text.toLowerCase();
        if (
          lowerText.includes("restaurant") ||
          lowerText.includes("dining") ||
          lowerText.includes("eat") ||
          lowerText.includes("food") ||
          lowerText.includes("lunch") ||
          lowerText.includes("dinner")
        ) {
          icon = "🍽️"; // For restaurants
        } else if (
          lowerText.includes("bar") ||
          lowerText.includes("club") ||
          lowerText.includes("lounge") ||
          lowerText.includes("evening") ||
          lowerText.includes("night")
        ) {
          icon = "🌆"; // For evening venues
        } else if (
          lowerText.includes("hotel") ||
          lowerText.includes("stay") ||
          lowerText.includes("accommodation")
        ) {
          icon = "🏨"; // For hotels
        }

        // Mark this location as formatted
        formattedLocations.add(locationKey);

        // Signal that a replacement was made
        anyReplacement = true;

        // Return formatted link with standard markdown formatting
        return `**${icon} [${locationName}]**`;
      });

      return { text: newText, replaced: anyReplacement };
    };

    // Helper function to get the appropriate transportation icon based on mode
    const getTransportIcon = (mode) => {
      if (!mode) return "🚗"; // Default icon

      const lowerMode = mode.toLowerCase();

      if (lowerMode.includes("walk") || lowerMode.includes("foot")) {
        return "🚶";
      } else if (
        lowerMode.includes("bus") ||
        lowerMode.includes("public") ||
        lowerMode.includes("transit") ||
        lowerMode.includes("metro") ||
        lowerMode.includes("subway")
      ) {
        return "🚌";
      } else if (lowerMode.includes("taxi") || lowerMode.includes("cab")) {
        return "🚕";
      } else if (lowerMode.includes("train") || lowerMode.includes("rail")) {
        return "🚆";
      } else if (
        lowerMode.includes("plane") ||
        lowerMode.includes("fly") ||
        lowerMode.includes("air")
      ) {
        return "✈️";
      } else if (
        lowerMode.includes("boat") ||
        lowerMode.includes("ferry") ||
        lowerMode.includes("ship") ||
        lowerMode.includes("cruise")
      ) {
        return "🚢";
      } else if (
        lowerMode.includes("bike") ||
        lowerMode.includes("bicycle") ||
        lowerMode.includes("cycling")
      ) {
        return "🚲";
      } else {
        return "🚗"; // Default to car for other modes
      }
    };

    // Process days based on format
    if (isNewFormat) {
      // Process new format with sections
      structuredItinerary.days.forEach((day) => {
        // Add day header with horizontal line for visual separation - REDUCED FROM ## to ### for smaller headings
        formattedText += `### Day ${day.dayNumber}: ${day.title}\n\n`;

        // Add day theme if available
        if (day.theme) {
          formattedText += `*${day.theme}*\n\n`;
        }

        // Process each section of the day
        day.sections.forEach((section) => {
          // Add section header with time information - REDUCED FROM ### to #### for better hierarchy
          formattedText += `#### ${section.timeOfDay} (${section.time})\n\n`;

          // Process activities if present
          if (section.activities && section.activities.length > 0) {
            section.activities.forEach((activity, activityIndex) => {
              // Determine the appropriate icon based on activity type
              let icon = "📍"; // Default for attractions

              // Check activity type to determine the correct icon
              if (activity.type) {
                const activityType = activity.type.toLowerCase();
                if (
                  activityType.includes("restaurant") ||
                  activityType.includes("dining") ||
                  activityType.includes("café") ||
                  activityType.includes("cafe") ||
                  activityType.includes("food")
                ) {
                  icon = "🍽️"; // For dining
                } else if (
                  activityType.includes("hotel") ||
                  activityType.includes("accommodation") ||
                  activityType.includes("lodging") ||
                  activityType.includes("resort")
                ) {
                  icon = "🏨"; // For hotels
                } else if (
                  activityType.includes("bar") ||
                  activityType.includes("club") ||
                  activityType.includes("nightlife") ||
                  activityType.includes("entertainment") ||
                  activityType.includes("evening")
                ) {
                  icon = "🌆"; // For evening venues
                }
              }

              // Check if the name itself has square brackets that need to be extracted
              let activityName = activity.title || activity.name || "";
              const bracketMatch = activityName.match(/\[([^\]]+)\]/);
              if (bracketMatch) {
                // Use just the content inside the brackets
                activityName = bracketMatch[1];
              }

              // Create a unique identifier for this location to avoid duplicates
              const locationKey = activityName.trim().toLowerCase();

              // Add to set of formatted locations
              formattedLocations.add(locationKey);

              // Mark the location with a special format for map display: 📍 [NAME](lat,lng)
              // Always include a space between emoji and bracket for better clickability
              const hasLocation =
                activity.location &&
                (activity.location.lat || activity.location.lng);
              const locationTag = hasLocation
                ? `${icon} [${activityName}](${activity.location.lat},${activity.location.lng})`
                : `${icon} [${activityName}]`;

              formattedText += `**${locationTag}** - *${
                activity.type || "Activity"
              }*\n`;

              if (activity.description) {
                // Format any location names in the description
                const { text: formattedDescription } = formatLocationInText(
                  activity.description
                );
                formattedText += `${formattedDescription}\n\n`;
              } else {
                formattedText += "\n";
              }

              // Create a bullet list for activity details
              let detailsList = [];

              // Add tips if available - IMPROVED STYLING AS BULLET
              if (activity.tip) {
                const { text: formattedTip } = formatLocationInText(
                  activity.tip
                );
                detailsList.push(`💡 **Tip:** *${formattedTip}*`);
              }

              // Add alternative if available - IMPROVED STYLING AS BULLET
              if (activity.alternative) {
                const { text: formattedAlternative } = formatLocationInText(
                  activity.alternative
                );
                detailsList.push(
                  `🔄 **Alternative:** *${formattedAlternative}*`
                );
              }

              // Add cost estimate if available - IMPROVED STYLING AS BULLET
              if (activity.estimatedCost) {
                detailsList.push(
                  `💰 **Cost:** *${activity.estimatedCost.amount} ${activity.estimatedCost.currency}*`
                );
              }

              // Add transition information if available - IMPROVED STYLING WITH APPROPRIATE ICON
              if (activity.transition) {
                const transIcon = getTransportIcon(activity.transition.mode);
                let transText = `${transIcon} **Transportation:** *${activity.transition.mode}, ${activity.transition.duration}*`;

                if (activity.transition.description) {
                  transText += `\n   *${activity.transition.description}*`;
                }

                if (
                  activity.transition.cost &&
                  activity.transition.cost.amount > 0
                ) {
                  transText += `\n   **Transit cost:** *${activity.transition.cost.amount} ${activity.transition.cost.currency}*`;
                }

                detailsList.push(transText);
              }

              // Add the details list if there are items
              if (detailsList.length > 0) {
                formattedText +=
                  detailsList.map((item) => `- ${item}`).join("\n") + "\n\n";
              }
            });
          }

          // Process restaurant if present
          if (section.restaurant) {
            const rest = section.restaurant;

            // Check if the name has square brackets that need to be extracted
            let restaurantName = rest.name || "";
            const bracketMatch = restaurantName.match(/\[([^\]]+)\]/);
            if (bracketMatch) {
              // Use just the content inside the brackets
              restaurantName = bracketMatch[1];
            }

            // Create a unique identifier for this location to avoid duplicates
            const locationKey = restaurantName.trim().toLowerCase();

            // Add to set of formatted locations
            formattedLocations.add(locationKey);

            // Mark the restaurant location for map display - ensure space between emoji and bracket
            const hasLocation =
              rest.location && (rest.location.lat || rest.location.lng);
            const locationTag = hasLocation
              ? `🍽️ [${restaurantName}](${rest.location.lat},${rest.location.lng})`
              : `🍽️ [${restaurantName}]`;

            formattedText += `**${locationTag}** - *${
              rest.cuisine || "Restaurant"
            }*\n`;

            if (rest.notes) {
              // Format any location names in the notes
              const { text: formattedNotes } = formatLocationInText(rest.notes);
              formattedText += `${formattedNotes}\n\n`;
            } else {
              formattedText += "\n";
            }

            // Create a bullet list for restaurant details
            let detailsList = [];

            // Add cost estimate if available - IMPROVED STYLING AS BULLET
            if (rest.estimatedCost) {
              detailsList.push(
                `💰 **Cost:** *${rest.estimatedCost.amount} ${rest.estimatedCost.currency}*`
              );
            }

            // Add transition information if available - IMPROVED STYLING WITH APPROPRIATE ICON
            if (rest.transition) {
              const transIcon = getTransportIcon(rest.transition.mode);
              let transText = `${transIcon} **Transportation:** *${rest.transition.mode}, ${rest.transition.duration}*`;

              if (rest.transition.description) {
                transText += `\n   *${rest.transition.description}*`;
              }

              if (rest.transition.cost && rest.transition.cost.amount > 0) {
                transText += `\n   **Transit cost:** *${rest.transition.cost.amount} ${rest.transition.cost.currency}*`;
              }

              detailsList.push(transText);
            }

            // Add the details list if there are items
            if (detailsList.length > 0) {
              formattedText +=
                detailsList.map((item) => `- ${item}`).join("\n") + "\n\n";
            }
          }

          // Process evening options if present
          if (section.options && section.options.length > 0) {
            formattedText += "**Evening Options:**\n\n";

            section.options.forEach((option, index) => {
              // Check if the place/name has square brackets that need to be extracted
              let venueName = option.place || option.name || "";
              const bracketMatch = venueName.match(/\[([^\]]+)\]/);
              if (bracketMatch) {
                // Use just the content inside the brackets
                venueName = bracketMatch[1];
              }

              // Create a unique identifier for this location to avoid duplicates
              const locationKey = venueName.trim().toLowerCase();

              // Add to set of formatted locations
              formattedLocations.add(locationKey);

              // Mark the evening option location for map display - ensure space between emoji and bracket
              const hasLocation =
                option.location && (option.location.lat || option.location.lng);
              const locationTag = hasLocation
                ? `🌆 [${venueName}](${option.location.lat},${option.location.lng})`
                : `🌆 [${venueName}]`;

              formattedText += `${index + 1}. **${locationTag}** - *${
                option.type || "Evening Venue"
              }*\n`;

              if (option.description) {
                // Format any location names in the description
                const { text: formattedDescription } = formatLocationInText(
                  option.description
                );
                formattedText += `${formattedDescription}\n\n`;
              } else {
                formattedText += "\n";
              }

              // Create a bullet list for option details
              let detailsList = [];

              // Add cost estimate if available - IMPROVED STYLING AS BULLET
              if (option.estimatedCost) {
                detailsList.push(
                  `💰 **Cost:** *${option.estimatedCost.amount} ${option.estimatedCost.currency}*`
                );
              }

              // Add transition information if available - IMPROVED STYLING WITH APPROPRIATE ICON
              if (option.transition) {
                const transIcon = getTransportIcon(option.transition.mode);
                let transText = `${transIcon} **Transportation:** *${option.transition.mode}, ${option.transition.duration}*`;

                if (option.transition.description) {
                  transText += `\n   *${option.transition.description}*`;
                }

                if (
                  option.transition.cost &&
                  option.transition.cost.amount > 0
                ) {
                  transText += `\n   **Transit cost:** *${option.transition.cost.amount} ${option.transition.cost.currency}*`;
                }

                detailsList.push(transText);
              }

              // Add the details list if there are items
              if (detailsList.length > 0) {
                formattedText +=
                  detailsList.map((item) => `- ${item}`).join("\n") + "\n\n";
              }
            });
          }

          // Add a separator between sections for better readability
          formattedText += "---\n\n";
        });
      });
    } else {
      // Process legacy format
      if (structuredItinerary.days && Array.isArray(structuredItinerary.days)) {
        structuredItinerary.days.forEach((day, index) => {
          // Add day header with horizontal line for visual separation - REDUCED FROM ## to ### for smaller headings
          const { text: formattedTitle } = formatLocationInText(
            day.title || ""
          );
          formattedText += `### Day ${index + 1}${
            day.title ? `: ${formattedTitle}` : ""
          }\n\n`;

          // Add day date if available
          if (day.date) {
            formattedText += `*Date: ${day.date}*\n\n`;
          }

          // Add day overview if available
          if (day.overview) {
            // Format location names in the overview text
            const { text: formattedOverview } = formatLocationInText(
              day.overview
            );
            formattedText += `${formattedOverview}\n\n`;
          }

          // Process activities by time blocks
          const timeBlocks = [
            "morning",
            "lunch",
            "afternoon",
            "evening",
            "dinner",
          ];

          timeBlocks.forEach((timeBlock) => {
            if (
              day.activities &&
              day.activities[timeBlock] &&
              day.activities[timeBlock].length > 0
            ) {
              // Capitalize first letter of time block - REDUCED FROM ### to #### for better hierarchy
              const formattedTimeBlock =
                timeBlock.charAt(0).toUpperCase() + timeBlock.slice(1);
              formattedText += `#### ${formattedTimeBlock}\n\n`;

              // Add time range if available
              if (day.activities[timeBlock].timeRange) {
                formattedText += `*${day.activities[timeBlock].timeRange}*\n\n`;
              }

              // Process each activity
              day.activities[timeBlock].forEach((activity) => {
                if (typeof activity === "string") {
                  // For string activities, determine icon based on time block
                  let icon = "📍"; // default for activities

                  if (timeBlock === "lunch" || timeBlock === "dinner") {
                    icon = "🍽️"; // for food
                  } else if (timeBlock === "evening") {
                    icon = "🌆"; // for evening activities
                  }

                  // Check if the activity string contains a name in square brackets
                  const bracketMatch = activity.match(/\[([^\]]+)\]/);
                  if (bracketMatch) {
                    // If it has a name in brackets, highlight it properly
                    const venueName = bracketMatch[1];

                    // Create a unique identifier for this location
                    const locationKey = venueName.trim().toLowerCase();

                    // Check if this location was already formatted
                    if (!formattedLocations.has(locationKey)) {
                      // Add to set of formatted locations
                      formattedLocations.add(locationKey);

                      // Replace the original bracketed name with a properly formatted link
                      const formattedName = `**${icon} [${venueName}]**`;
                      const restOfText = activity.replace(/\[.*?\]/, "").trim();

                      // Check if there's any description text after the venue name
                      if (restOfText) {
                        // Look for a pattern like " - Restaurant" or " - Bar"
                        const typePattern = /\s*-\s*(.*?)(?:\n|$)/;
                        const typeMatch = restOfText.match(typePattern);

                        if (typeMatch && typeMatch[1]) {
                          // Format with type info after the dash
                          const venueType = typeMatch[1].trim();
                          // Remove the type part from restOfText
                          const cleanedText = restOfText
                            .replace(typePattern, "")
                            .trim();

                          formattedText += `- ${formattedName} - *${venueType}*\n`;

                          // Add any remaining text
                          if (cleanedText) {
                            const { text: formattedCleanedText } =
                              formatLocationInText(cleanedText);
                            formattedText += `${formattedCleanedText}\n\n`;
                          } else {
                            formattedText += "\n";
                          }
                        } else {
                          // Just add the remaining text
                          const { text: formattedRestOfText } =
                            formatLocationInText(restOfText);
                          formattedText += `- ${formattedName} ${formattedRestOfText}\n\n`;
                        }
                      } else {
                        formattedText += `- ${formattedName}\n\n`;
                      }
                    } else {
                      // This location was already formatted, use plain formatting
                      formattedText += `- ${activity}\n\n`;
                    }
                  } else {
                    // Regular string activity without brackets - still format any location names in the text
                    const { text: formattedActivity } =
                      formatLocationInText(activity);
                    formattedText += `- **${icon} [${formattedActivity}]**\n\n`;
                  }
                } else {
                  // Activity is an object - mark for map display
                  // Choose the appropriate icon based on timeBlock and type
                  let icon = "📍"; // default for attractions

                  // Determine icon based on time block and activity type
                  if (
                    timeBlock === "lunch" ||
                    timeBlock === "dinner" ||
                    (activity.type &&
                      (activity.type.toLowerCase().includes("restaurant") ||
                        activity.type.toLowerCase().includes("dining") ||
                        activity.type.toLowerCase().includes("cafe") ||
                        activity.type.toLowerCase().includes("food")))
                  ) {
                    icon = "🍽️"; // for food
                  } else if (
                    timeBlock === "evening" ||
                    (activity.type &&
                      (activity.type.toLowerCase().includes("night") ||
                        activity.type.toLowerCase().includes("entertainment") ||
                        activity.type.toLowerCase().includes("bar") ||
                        activity.type.toLowerCase().includes("club")))
                  ) {
                    icon = "🌆"; // for evening activities
                  } else if (
                    activity.type &&
                    (activity.type.toLowerCase().includes("hotel") ||
                      activity.type.toLowerCase().includes("accommodation") ||
                      activity.type.toLowerCase().includes("lodging") ||
                      activity.type.toLowerCase().includes("resort"))
                  ) {
                    icon = "🏨"; // for accommodations
                  }

                  // Check if the activity name is already in brackets
                  let activityName = activity.name || "Activity";
                  const bracketMatch = activityName.match(/\[([^\]]+)\]/);
                  if (bracketMatch) {
                    // If it has brackets already, use the content inside
                    activityName = bracketMatch[1];
                  }

                  // Create a unique identifier for this location
                  const locationKey = activityName.trim().toLowerCase();

                  // Add to set of formatted locations
                  formattedLocations.add(locationKey);

                  // Create location tag with coordinates if available - ensure space between emoji and bracket
                  let locationTag = `${icon} [${activityName}]`;

                  if (
                    activity.coordinates &&
                    (activity.coordinates.lat || activity.coordinates.lng)
                  ) {
                    locationTag = `${icon} [${activityName}](${activity.coordinates.lat},${activity.coordinates.lng})`;
                  } else if (activity.lat && activity.lng) {
                    locationTag = `${icon} [${activityName}](${activity.lat},${activity.lng})`;
                  }

                  formattedText += `- **${locationTag}**`;

                  // Add activity type if available
                  if (activity.type) {
                    formattedText += ` - *${activity.type}*`;
                  }
                  formattedText += `\n`;

                  if (activity.description) {
                    // Format any location names in the description
                    const { text: formattedDescription } = formatLocationInText(
                      activity.description
                    );
                    formattedText += `${formattedDescription}\n\n`;
                  } else {
                    formattedText += "\n";
                  }

                  // Create a bullet list for activity details
                  let detailsList = [];

                  // Add time if available - IMPROVED STYLING AS BULLET
                  if (activity.time) {
                    detailsList.push(`⏱️ **Time:** *${activity.time}*`);
                  }

                  // Add significance if available - IMPROVED STYLING AS BULLET
                  if (activity.significance) {
                    const { text: formattedSignificance } =
                      formatLocationInText(activity.significance);
                    detailsList.push(
                      `✨ **Significance:** *${formattedSignificance}*`
                    );
                  }

                  // Add tip if available - IMPROVED STYLING AS BULLET
                  if (activity.tip) {
                    const { text: formattedTip } = formatLocationInText(
                      activity.tip
                    );
                    detailsList.push(`💡 **Tip:** *${formattedTip}*`);
                  }

                  // Add alternatives if available - IMPROVED STYLING AS BULLET
                  if (
                    activity.alternatives &&
                    activity.alternatives.length > 0
                  ) {
                    const { text: formattedAlternative } = formatLocationInText(
                      activity.alternatives[0]
                    );
                    detailsList.push(
                      `🔄 **Alternative:** *${formattedAlternative}*`
                    );
                  }

                  // Add the details list if there are items
                  if (detailsList.length > 0) {
                    formattedText +=
                      detailsList.map((item) => `  - ${item}`).join("\n") +
                      "\n\n";
                  }
                }
              });

              // Add a separator after each time block
              formattedText += "---\n\n";
            }
          });
        });
      }
    }

    // Add additional information if available
    if (structuredItinerary.additionalInfo) {
      const info = structuredItinerary.additionalInfo;

      // Add transportation info - IMPROVED STYLING
      if (info.transportation && info.transportation.length > 0) {
        formattedText += "### Transportation\n\n";
        info.transportation.forEach((item) => {
          // Format any location names in the transportation info
          const { text: formattedItem } = formatLocationInText(item);

          // Try to determine the appropriate icon for this transportation item
          let icon = "🚗"; // Default

          const lowerItem = formattedItem.toLowerCase();
          if (lowerItem.includes("walk") || lowerItem.includes("foot")) {
            icon = "🚶";
          } else if (
            lowerItem.includes("bus") ||
            lowerItem.includes("public transport")
          ) {
            icon = "🚌";
          } else if (
            lowerItem.includes("train") ||
            lowerItem.includes("rail")
          ) {
            icon = "🚆";
          } else if (lowerItem.includes("taxi") || lowerItem.includes("cab")) {
            icon = "🚕";
          } else if (
            lowerItem.includes("bike") ||
            lowerItem.includes("cycling")
          ) {
            icon = "🚲";
          } else if (
            lowerItem.includes("ferry") ||
            lowerItem.includes("boat")
          ) {
            icon = "🚢";
          } else if (lowerItem.includes("plane") || lowerItem.includes("fly")) {
            icon = "✈️";
          }

          formattedText += `- ${icon} ${formattedItem}\n`;
        });
        formattedText += "\n";
      }

      // Add accommodation info with mapping markers - IMPROVED STYLING
      if (info.accommodation && info.accommodation.length > 0) {
        formattedText += "### Accommodation\n\n";
        info.accommodation.forEach((item) => {
          // Mark accommodations for map display - ensure space between emoji and bracket
          if (typeof item === "string") {
            // Check if the item has square brackets already
            const bracketMatch = item.match(/\[([^\]]+)\]/);
            if (bracketMatch) {
              const hotelName = bracketMatch[1];
              // Create a unique identifier for this location
              const locationKey = hotelName.trim().toLowerCase();

              // Check if this location was already formatted
              if (!formattedLocations.has(locationKey)) {
                // Add to set of formatted locations
                formattedLocations.add(locationKey);
                formattedText += `- **🏨 [${hotelName}]**\n`;
              } else {
                formattedText += `- 🏨 ${item}\n`;
              }
            } else {
              const { text: formattedItem } = formatLocationInText(item);
              formattedText += `- **🏨 [${formattedItem}]**\n`;
            }
          } else {
            // Check if the hotel name has square brackets
            let hotelName = item.name || "Hotel";
            const bracketMatch = hotelName.match(/\[([^\]]+)\]/);
            if (bracketMatch) {
              hotelName = bracketMatch[1];
            }

            // Create a unique identifier for this location
            const locationKey = hotelName.trim().toLowerCase();

            // Add to set of formatted locations
            formattedLocations.add(locationKey);

            const hasLocation =
              item.location && (item.location.lat || item.location.lng);
            const locationTag = hasLocation
              ? `🏨 [${hotelName}](${item.location.lat},${item.location.lng})`
              : `🏨 [${hotelName}]`;

            formattedText += `- **${locationTag}**`;

            if (item.description) {
              const { text: formattedDescription } = formatLocationInText(
                item.description
              );
              formattedText += `: ${formattedDescription}`;
            }

            formattedText += `\n`;
          }
        });
        formattedText += "\n";
      }

      // Add tips - IMPROVED STYLING
      if (info.tips && info.tips.length > 0) {
        formattedText += "### Travel Tips\n\n";
        info.tips.forEach((tip) => {
          // Format any location names in the tips
          const { text: formattedTip } = formatLocationInText(tip);
          formattedText += `- 💡 ${formattedTip}\n`;
        });
        formattedText += "\n";
      }
    }

    // Add a legend for the map markers with improved styling
    formattedText += "### Map Legend\n\n";
    formattedText += "- 📍 - Attractions and activities\n";
    formattedText += "- 🍽️ - Restaurants and dining\n";
    formattedText += "- 🏨 - Accommodations\n";
    formattedText += "- 🌆 - Evening activities and entertainment\n";

    // Add transportation icon legend
    formattedText += "\n**Transportation Icons:**\n";
    formattedText += "- 🚶 - Walking\n";
    formattedText += "- 🚗 - Car/Driving\n";
    formattedText += "- 🚕 - Taxi\n";
    formattedText += "- 🚌 - Bus/Public Transport\n";
    formattedText += "- 🚆 - Train\n";
    formattedText += "- 🚲 - Bicycle\n";
    formattedText += "- 🚢 - Boat/Ferry\n";
    formattedText += "- ✈️ - Plane\n";

    // Add a note about clicking on locations with improved styling
    formattedText +=
      "\n*Click on any location marked with an emoji to see it on the map*\n";

    return formattedText;
  } catch (error) {
    console.error("Error formatting itinerary for display:", error);
    return `Error formatting itinerary: ${error.message}. Please check the JSON structure.`;
  }
};
