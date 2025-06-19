/**
 * Test utility for debugging itinerary parsing issues
 * This file provides functions to test the parsing of itineraries
 * from different formats and validate their structure
 */

import {
  convertItineraryToJSON,
  enhanceItineraryStructure,
  formatItineraryForDisplay,
} from "./itineraryGenerator.js";

/**
 * Tests the parsing of an itinerary from a string
 * @param {string} itineraryText - The raw itinerary text to parse
 * @returns {Object} - Results of the parsing test
 */
export const testItineraryParsing = (itineraryText) => {
  console.log("=== ITINERARY PARSING TEST STARTED ===");
  console.log(`Input text length: ${itineraryText.length} characters`);

  const results = {
    success: false,
    stages: [],
    parsedItinerary: null,
    formattedItinerary: null,
    errors: [],
  };

  try {
    // Stage 1: Clean input
    console.log("[1. INPUT CLEANING] Cleaning input text");
    const cleanText = itineraryText.replace(/```json|```/g, "").trim();
    results.stages.push({
      stage: "input_cleaning",
      success: true,
      output: `Cleaned ${itineraryText.length - cleanText.length} characters`,
    });

    // Stage 2: Try direct JSON parsing
    console.log("[2. DIRECT JSON PARSING] Attempting to parse as JSON");
    let parsedItinerary = null;
    try {
      if (cleanText.startsWith("{") && cleanText.endsWith("}")) {
        parsedItinerary = JSON.parse(cleanText);
        console.log("[SUCCESS] Successfully parsed as direct JSON");
        results.stages.push({
          stage: "direct_json_parsing",
          success: true,
          output: "Parsed as valid JSON",
        });
      } else {
        console.log("[SKIP] Text doesn't appear to be JSON format");
        results.stages.push({
          stage: "direct_json_parsing",
          success: false,
          skipped: true,
          output: "Text doesn't appear to be JSON format",
        });
      }
    } catch (error) {
      console.error("[ERROR] Failed to parse as direct JSON:", error.message);
      results.stages.push({
        stage: "direct_json_parsing",
        success: false,
        error: error.message,
      });
    }

    // Stage 3: Use converter if direct parsing failed
    if (!parsedItinerary) {
      console.log("[3. TEXT CONVERSION] Converting text to structured JSON");
      try {
        parsedItinerary = convertItineraryToJSON(cleanText);
        console.log("[SUCCESS] Successfully converted text to JSON structure");
        results.stages.push({
          stage: "text_conversion",
          success: true,
          output: "Converted text to JSON structure",
        });
      } catch (error) {
        console.error("[ERROR] Failed to convert text to JSON:", error.message);
        results.stages.push({
          stage: "text_conversion",
          success: false,
          error: error.message,
        });
        results.errors.push({
          stage: "text_conversion",
          message: error.message,
        });
      }
    }

    // Stage 4: Validate structure
    if (parsedItinerary) {
      console.log("[4. STRUCTURE VALIDATION] Validating itinerary structure");
      const validationResult = validateItineraryStructure(parsedItinerary);
      results.stages.push({
        stage: "structure_validation",
        success: validationResult.valid,
        issues: validationResult.issues,
        output: validationResult.valid
          ? "Valid structure"
          : `Found ${validationResult.issues.length} issues`,
      });

      if (!validationResult.valid) {
        console.warn(
          "[WARNING] Structure validation issues:",
          validationResult.issues
        );
      } else {
        console.log("[SUCCESS] Structure validation passed");
      }

      // Stage 5: Format for display
      console.log("[5. DISPLAY FORMATTING] Formatting itinerary for display");
      try {
        const formattedItinerary = formatItineraryForDisplay(parsedItinerary);
        console.log("[SUCCESS] Successfully formatted itinerary for display");
        console.log(
          `Formatted text length: ${formattedItinerary.length} characters`
        );
        results.stages.push({
          stage: "display_formatting",
          success: true,
          output: `Generated ${formattedItinerary.length} characters of formatted text`,
        });
        results.formattedItinerary = formattedItinerary;
      } catch (error) {
        console.error(
          "[ERROR] Failed to format itinerary for display:",
          error.message
        );
        results.stages.push({
          stage: "display_formatting",
          success: false,
          error: error.message,
        });
        results.errors.push({
          stage: "display_formatting",
          message: error.message,
        });
      }

      results.parsedItinerary = parsedItinerary;
    }

    // Final result
    results.success = results.errors.length === 0;
    console.log(
      `[RESULT] Parsing test ${results.success ? "PASSED" : "FAILED"}`
    );
    console.log(`Found ${results.errors.length} errors during parsing`);
    console.log("=== ITINERARY PARSING TEST COMPLETED ===");
  } catch (error) {
    console.error("[ERROR] Unexpected error during parsing test:", error);
    results.stages.push({
      stage: "unexpected_error",
      success: false,
      error: error.message,
    });
    results.errors.push({
      stage: "global",
      message: error.message,
    });
  }

  return results;
};

/**
 * Validates the structure of an itinerary
 * @param {Object} itinerary - The itinerary object to validate
 * @returns {Object} - Validation results
 */
export const validateItineraryStructure = (itinerary) => {
  const issues = [];

  // Check for required top-level properties
  if (!itinerary.destination) issues.push("Missing destination");
  if (!itinerary.title) issues.push("Missing title");

  // Check days structure
  if (!itinerary.days || !Array.isArray(itinerary.days)) {
    issues.push("Missing or invalid days array");
  } else if (itinerary.days.length === 0) {
    issues.push("Days array is empty");
  } else {
    // Check if this is the new format with sections
    const hasNewFormat = itinerary.days.some((day) => day.sections);

    if (hasNewFormat) {
      // Check each day in the new format
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
          // Check each section
          day.sections.forEach((section, sectionIndex) => {
            if (!section.timeOfDay) {
              issues.push(
                `Day ${index + 1}, Section ${
                  sectionIndex + 1
                } missing timeOfDay`
              );
            }

            // Check activities if present
            if (section.activities && !Array.isArray(section.activities)) {
              issues.push(
                `Day ${index + 1}, Section ${
                  sectionIndex + 1
                } has invalid activities (not an array)`
              );
            } else if (
              section.activities &&
              Array.isArray(section.activities)
            ) {
              // Check transitions in activities
              section.activities.forEach((activity, activityIndex) => {
                if (
                  activity.transition &&
                  typeof activity.transition !== "object"
                ) {
                  issues.push(
                    `Day ${index + 1}, Section ${sectionIndex + 1}, Activity ${
                      activityIndex + 1
                    } has invalid transition (not an object)`
                  );
                } else if (activity.transition) {
                  // Validate transition structure
                  if (!activity.transition.mode) {
                    issues.push(
                      `Day ${index + 1}, Section ${
                        sectionIndex + 1
                      }, Activity ${activityIndex + 1} missing transition mode`
                    );
                  }
                  if (!activity.transition.duration) {
                    issues.push(
                      `Day ${index + 1}, Section ${
                        sectionIndex + 1
                      }, Activity ${
                        activityIndex + 1
                      } missing transition duration`
                    );
                  }
                }
              });
            }

            // Check restaurant if present
            if (section.restaurant && typeof section.restaurant !== "object") {
              issues.push(
                `Day ${index + 1}, Section ${
                  sectionIndex + 1
                } has invalid restaurant (not an object)`
              );
            } else if (section.restaurant && section.restaurant.transition) {
              // Validate restaurant transition
              if (typeof section.restaurant.transition !== "object") {
                issues.push(
                  `Day ${index + 1}, Section ${
                    sectionIndex + 1
                  }, Restaurant has invalid transition (not an object)`
                );
              } else {
                if (!section.restaurant.transition.mode) {
                  issues.push(
                    `Day ${index + 1}, Section ${
                      sectionIndex + 1
                    }, Restaurant missing transition mode`
                  );
                }
                if (!section.restaurant.transition.duration) {
                  issues.push(
                    `Day ${index + 1}, Section ${
                      sectionIndex + 1
                    }, Restaurant missing transition duration`
                  );
                }
              }
            }

            // Check options if present
            if (section.options && !Array.isArray(section.options)) {
              issues.push(
                `Day ${index + 1}, Section ${
                  sectionIndex + 1
                } has invalid options (not an array)`
              );
            } else if (section.options && Array.isArray(section.options)) {
              // Check transitions in options
              section.options.forEach((option, optionIndex) => {
                if (
                  option.transition &&
                  typeof option.transition !== "object"
                ) {
                  issues.push(
                    `Day ${index + 1}, Section ${sectionIndex + 1}, Option ${
                      optionIndex + 1
                    } has invalid transition (not an object)`
                  );
                } else if (option.transition) {
                  // Validate transition structure
                  if (!option.transition.mode) {
                    issues.push(
                      `Day ${index + 1}, Section ${sectionIndex + 1}, Option ${
                        optionIndex + 1
                      } missing transition mode`
                    );
                  }
                  if (!option.transition.duration) {
                    issues.push(
                      `Day ${index + 1}, Section ${sectionIndex + 1}, Option ${
                        optionIndex + 1
                      } missing transition duration`
                    );
                  }
                }
              });
            }
          });
        }
      });
    } else {
      // Check each day in the legacy format
      itinerary.days.forEach((day, index) => {
        if (
          typeof day.dayNumber !== "number" &&
          typeof day.dayNumber !== "string"
        ) {
          issues.push(`Day ${index + 1} missing dayNumber`);
        }

        if (!day.title) issues.push(`Day ${index + 1} missing title`);

        // Check activities in legacy format
        if (!day.activities) {
          issues.push(`Day ${index + 1} missing activities`);
        } else if (typeof day.activities !== "object") {
          issues.push(
            `Day ${index + 1} has invalid activities (not an object)`
          );
        }
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    format:
      itinerary.days && itinerary.days[0] && itinerary.days[0].sections
        ? "structured-json-v2"
        : "legacy",
  };
};

/**
 * Export the test utility functions
 */
export default {
  testItineraryParsing,
  validateItineraryStructure,
};

// Example usage:
// import { testItineraryParser } from './testItineraryParser.js';
// const itineraryText = "Tel Aviv: A Luxury Exploration..."; // Your itinerary text
// const result = testItineraryParser(itineraryText);
// console.log(result);
