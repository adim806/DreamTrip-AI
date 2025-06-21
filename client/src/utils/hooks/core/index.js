/**
 * Core modules for the refactored useProcessUserInput hook
 * This file exports all the modular utilities for easy import
 */

// Message handling utilities
export {
  useMessageHandling,
  generateMessageId,
  isValidMessage,
  formatMessageForDisplay,
} from "./messageHandling";

// Conversation memory utilities
export {
  useConversationMemory,
  extractEntitiesFromData,
  mergeEntities,
} from "./conversationMemory";

// Data transformation utilities
export {
  normalizeDataStructure,
  mergeWithExistingTripData,
  splitLocationField,
  standardizeBudgetLevel,
  enhanceExtractedData,
  validateAndCleanData,
  deepMerge,
} from "./dataTransformation";

// Intent processing utilities
export {
  sanitizeIntent,
  isExternalDataIntent,
  getRequiredFieldsForIntent,
  detectUserConfirmation,
  analyzeMessageContext,
  validateIntentDataConsistency,
} from "./intentProcessing";

// Date and time processing utilities
export {
  processRelativeDates,
  convertRelativeDate,
  processTimeReferences,
  normalizeTimeContext,
  isToday,
  isTomorrow,
  isWeekend,
} from "./dateTimeProcessing";

// TODO: Add database persistence module
// - Message saving to database
// - Chat history management
// - Offline/online sync
// - Error recovery and retry logic

// TODO: Add image processing module
// - Image upload handling
// - Image analysis integration
// - Image storage management

// TODO: Add advanced error handling module
// - Retry strategies
// - Fallback mechanisms
// - Error reporting and analytics

// Default exports for backward compatibility
import messageHandlingDefaults from "./messageHandling";
import dateTimeDefaults from "./dateTimeProcessing";
import dataTransformationDefaults from "./dataTransformation";
import intentProcessingDefaults from "./intentProcessing";
import conversationMemoryDefaults from "./conversationMemory";

export const CoreUtilities = {
  messageHandling: messageHandlingDefaults,
  dateTime: dateTimeDefaults,
  dataTransformation: dataTransformationDefaults,
  intentProcessing: intentProcessingDefaults,
  conversationMemory: conversationMemoryDefaults,
};
