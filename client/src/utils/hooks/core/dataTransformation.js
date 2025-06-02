/**
 * Data transformation utilities
 * Extracted from useProcessUserInput.js for better modularity
 */

/**
 * Normalizes data structure from AI response to consistent format
 * @param {Object} dataFromAI - Raw data from AI model
 * @param {Object} existingTripDetails - Existing trip details for reference
 * @returns {Object} - Normalized data structure
 */
export const normalizeDataStructure = (dataFromAI, existingTripDetails) => {
  if (!dataFromAI || typeof dataFromAI !== "object") {
    console.warn(
      "[DataTransformation] Invalid data provided to normalizeDataStructure"
    );
    return {};
  }

  console.log("[DataTransformation] Normalizing data structure:", dataFromAI);

  const normalized = { ...dataFromAI };

  // Check for "tomorrow" reference in the text
  const checkForTomorrowReference = (text) => {
    if (!text || typeof text !== "string") return false;

    const lowerText = text.toLowerCase();
    const tomorrowIndicators = [
      "tomorrow",
      "next day",
      "the following day",
      "מחר", // Hebrew for tomorrow
    ];

    return tomorrowIndicators.some((indicator) =>
      lowerText.includes(indicator)
    );
  };

  // Process text-based tomorrow references
  if (
    normalized.userMessage &&
    checkForTomorrowReference(normalized.userMessage)
  ) {
    normalized.isTomorrow = true;
    console.log(
      "[DataTransformation] Set isTomorrow=true based on text analysis"
    );
  }

  // Standardize budget level fields
  if (normalized.budget_level && typeof normalized.budget_level === "string") {
    normalized.budget_level = standardizeBudgetLevel({
      budget_level: normalized.budget_level,
    }).budget_level;
  }

  // Handle constraints object
  if (normalized.constraints && typeof normalized.constraints === "object") {
    if (normalized.constraints.budget) {
      normalized.constraints.budget = standardizeBudgetLevel({
        budget_level: normalized.constraints.budget,
      }).budget_level;
    }
  }

  // Normalize location data
  if (normalized.location && !normalized.city && !normalized.country) {
    const locationData = splitLocationField({ location: normalized.location });
    if (locationData.city) normalized.city = locationData.city;
    if (locationData.country) normalized.country = locationData.country;
  }

  console.log("[DataTransformation] Normalized data:", normalized);
  return normalized;
};

/**
 * Merges new data with existing trip data based on specified rules
 * @param {Object} dataFromAI - New data from AI
 * @param {Array} modelManagedFields - Fields managed by the model
 * @param {Object} rules - Merging rules
 * @returns {Object} - Merged data
 */
export const mergeWithExistingTripData = (
  dataFromAI,
  modelManagedFields = [],
  rules = null
) => {
  if (!dataFromAI) {
    console.warn(
      "[DataTransformation] No data provided to mergeWithExistingTripData"
    );
    return {};
  }

  console.log("[DataTransformation] Merging data with existing trip data");
  console.log("- New data from AI:", dataFromAI);
  console.log("- Model managed fields:", modelManagedFields);
  console.log("- Rules:", rules);

  // Start with a copy of the new data
  let mergedData = { ...dataFromAI };

  // Apply default rules if none provided
  const mergeRules = rules || {
    preserve_context: true,
    merge_user_data: true,
    require_all_fields_before_confirmation: true,
  };

  // If we have rules about preserving context
  if (mergeRules.preserve_context) {
    // Preserve important context fields even if they're not in the new data
    // This would be implemented based on specific business logic
  }

  // Handle model-managed fields
  if (modelManagedFields && modelManagedFields.length > 0) {
    console.log(
      `[DataTransformation] Processing ${modelManagedFields.length} model-managed fields`
    );

    // For model-managed fields, trust the AI's decisions completely
    modelManagedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(dataFromAI, field)) {
        mergedData[field] = dataFromAI[field];
        console.log(
          `[DataTransformation] Model-managed field ${field} set to:`,
          dataFromAI[field]
        );
      }
    });
  }

  console.log("[DataTransformation] Final merged data:", mergedData);
  return mergedData;
};

/**
 * Process date entries from various formats
 */
export const processDateFormats = (data) => {
  if (!data) return data;

  const processedData = { ...data };

  // Process date string in "YYYY-MM-DD to YYYY-MM-DD" format
  if (
    data.dates &&
    typeof data.dates === "string" &&
    data.dates.includes(" to ")
  ) {
    const [from, to] = data.dates.split(" to ").map((d) => d.trim());
    processedData.dates = { from, to };
    console.log(
      "[DataTransformation] Processed date string to object:",
      processedData.dates
    );
  }

  return processedData;
};

/**
 * Splits a combined location field into city and country when possible
 * @param {Object} data - The data object containing location information
 * @returns {Object} - The transformed data object with separated fields
 */
export const splitLocationField = (data) => {
  // Early return if there's no data or it's not an object
  if (!data || typeof data !== "object") return data;

  // Process date formats first
  const processedData = processDateFormats({ ...data });

  // Check if it's already in the desired format
  if (processedData.city && processedData.country) {
    return processedData;
  }

  // Create a copy to avoid mutating the original
  const transformedData = { ...processedData };

  // If there is an explicit location field, try to split it
  if (
    transformedData.location &&
    typeof transformedData.location === "string"
  ) {
    const locationParts = transformedData.location.split(/,\s*/);

    if (locationParts.length >= 2) {
      transformedData.city = locationParts[0].trim();
      transformedData.country = locationParts[locationParts.length - 1].trim();
      transformedData.vacation_location = transformedData.location; // Keep the original as vacation_location
    }
  }

  // If there's a vacation_location, try to split it too
  if (
    transformedData.vacation_location &&
    typeof transformedData.vacation_location === "string" &&
    !transformedData.city
  ) {
    const locationParts = transformedData.vacation_location.split(/,\s*/);

    if (locationParts.length >= 2) {
      transformedData.city = locationParts[0].trim();
      transformedData.country = locationParts[locationParts.length - 1].trim();
    }
  }

  return transformedData;
};

/**
 * Standardizes budget level values to ensure consistency
 * @param {Object} data - The data object to standardize
 * @returns {Object} - Data with standardized budget_level
 */
export const standardizeBudgetLevel = (data) => {
  if (!data) return data;

  // Make a copy of the data
  const processedData = { ...data };

  // Check if there's a budget_level field to standardize
  if (processedData.budget_level) {
    const currentLevel = processedData.budget_level.toLowerCase();

    // Map various terms to standard values
    if (
      currentLevel === "budget" ||
      currentLevel === "inexpensive" ||
      currentLevel === "affordable" ||
      currentLevel === "low" ||
      currentLevel === "economical"
    ) {
      processedData.budget_level = "cheap";
      console.log(
        `[DataTransformation] Standardized budget_level from "${currentLevel}" to "cheap"`
      );
    } else if (
      currentLevel === "mid range" ||
      currentLevel === "mid-range" ||
      currentLevel === "average" ||
      currentLevel === "standard" ||
      currentLevel === "middle"
    ) {
      processedData.budget_level = "moderate";
      console.log(
        `[DataTransformation] Standardized budget_level from "${currentLevel}" to "moderate"`
      );
    } else if (
      currentLevel === "high end" ||
      currentLevel === "high-end" ||
      currentLevel === "expensive" ||
      currentLevel === "premium" ||
      currentLevel === "deluxe"
    ) {
      processedData.budget_level = "luxury";
      console.log(
        `[DataTransformation] Standardized budget_level from "${currentLevel}" to "luxury"`
      );
    }
  }

  return processedData;
};

/**
 * Enhances extracted data with additional context and validation
 * @param {Object} extractedData - Raw extracted data
 * @param {Object} contextData - Additional context data
 * @returns {Object} - Enhanced data structure
 */
export const enhanceExtractedData = (extractedData, contextData) => {
  if (!extractedData || !extractedData.data) {
    console.warn(
      "[DataTransformation] Invalid extracted data provided to enhanceExtractedData"
    );
    return extractedData;
  }

  console.log("[DataTransformation] Enhancing extracted data with context");

  const enhanced = {
    ...extractedData,
    data: { ...extractedData.data },
  };

  // Add context information if available
  if (contextData) {
    // Merge relevant context fields
    Object.keys(contextData).forEach((key) => {
      if (contextData[key] !== undefined && !enhanced.data[key]) {
        enhanced.data[key] = contextData[key];
        console.log(
          `[DataTransformation] Added context field ${key}:`,
          contextData[key]
        );
      }
    });
  }

  // Normalize the enhanced data
  enhanced.data = normalizeDataStructure(enhanced.data, contextData);

  // Apply data transformations
  enhanced.data = splitLocationField(enhanced.data);
  enhanced.data = standardizeBudgetLevel(enhanced.data);

  return enhanced;
};

/**
 * Validates and cleans data object
 * @param {Object} data - Data to validate and clean
 * @returns {Object} - Cleaned data object
 */
export const validateAndCleanData = (data) => {
  if (!data || typeof data !== "object") {
    return {};
  }

  const cleaned = {};

  // Only include valid, non-empty values
  Object.keys(data).forEach((key) => {
    const value = data[key];

    if (value !== undefined && value !== null && value !== "") {
      // Special handling for different data types
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          cleaned[key] = trimmed;
        }
      } else if (typeof value === "object" && !Array.isArray(value)) {
        // Recursively clean nested objects
        const cleanedNested = validateAndCleanData(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else if (Array.isArray(value)) {
        // Clean arrays by filtering out empty values
        const cleanedArray = value.filter(
          (item) => item !== undefined && item !== null && item !== ""
        );
        if (cleanedArray.length > 0) {
          cleaned[key] = cleanedArray;
        }
      } else {
        // For numbers, booleans, etc., include as-is
        cleaned[key] = value;
      }
    }
  });

  return cleaned;
};

/**
 * Deep merges two objects, with second object taking precedence
 * @param {Object} target - Target object
 * @param {Object} source - Source object to merge
 * @returns {Object} - Merged object
 */
export const deepMerge = (target, source) => {
  if (!target) return { ...source };
  if (!source) return { ...target };

  const result = { ...target };

  Object.keys(source).forEach((key) => {
    if (source[key] !== undefined && source[key] !== null) {
      if (
        typeof source[key] === "object" &&
        !Array.isArray(source[key]) &&
        typeof target[key] === "object" &&
        !Array.isArray(target[key])
      ) {
        // Recursively merge nested objects
        result[key] = deepMerge(target[key], source[key]);
      } else {
        // Override with source value
        result[key] = source[key];
      }
    }
  });

  return result;
};

export default {
  normalizeDataStructure,
  mergeWithExistingTripData,
  splitLocationField,
  standardizeBudgetLevel,
  enhanceExtractedData,
  validateAndCleanData,
  deepMerge,
};
