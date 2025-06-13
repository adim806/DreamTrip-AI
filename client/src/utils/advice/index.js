/**
 * Advice Module Index
 *
 * This file serves as the entry point for the advice module,
 * exporting all components needed for advice handling.
 */

export * from "./AdviceHandler";
export * from "./AdviceFormatter";
export * from "./AdviceFieldSchemas";
export * from "./ExternalDataService";

// Re-export everything for easier imports
import * as AdviceHandler from "./AdviceHandler";
import * as AdviceFormatter from "./AdviceFormatter";
import * as AdviceFieldSchemas from "./AdviceFieldSchemas";
import * as ExternalDataService from "./ExternalDataService";

// Default export for convenience
export default {
  AdviceHandler,
  AdviceFormatter,
  AdviceFieldSchemas,
  ExternalDataService,
};
