/**
 * Map utilities index file
 */

// Export event service functions
export * from "./MapEventService";

// Export data adapter functions
export * from "./ExternalDataAdapter";

// Re-export everything for easier imports
import * as MapEvents from "./MapEventService";
import * as DataAdapter from "./ExternalDataAdapter";

// Default export for convenience
export default {
  MapEvents,
  DataAdapter,
};
