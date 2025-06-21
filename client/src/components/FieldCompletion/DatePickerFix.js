/**
 * DatePickerFix.js - Polyfill to fix React DatePicker positioning errors
 *
 * This script patches the floating-ui/computePosition function to prevent
 * "fn is not a function" errors when using React DatePicker.
 */
import React from "react";

// Apply the fix when the component mounts
export function applyDatePickerFix() {
  try {
    // Add the fix to the window object so it's available globally
    if (!window.__datePickerFixApplied) {
      // Override the computePosition function that's causing errors
      const originalComputePosition = window.computePosition;

      if (typeof originalComputePosition === "function") {
        // Keep the original function if it exists
        window.__originalComputePosition = originalComputePosition;
      }

      // Create a safe wrapper function
      window.computePosition = function safeComputePosition(
        reference,
        floating,
        options
      ) {
        try {
          // If the original function exists and is callable, use it
          if (typeof window.__originalComputePosition === "function") {
            return window.__originalComputePosition(
              reference,
              floating,
              options
            );
          }

          // Otherwise, provide a fallback implementation
          return new Promise((resolve) => {
            // Simple positioning fallback
            const referenceRect = reference.getBoundingClientRect();

            // Calculate a reasonable position
            const position = {
              x: referenceRect.left,
              y: referenceRect.bottom + 8,
              placement: "bottom",
              strategy: "absolute",
              middlewareData: {},
            };

            resolve(position);
          });
        } catch (err) {
          console.log("DatePicker positioning fallback used");

          // Return a simple position object on error
          return Promise.resolve({
            x: 0,
            y: 0,
            placement: "bottom",
            strategy: "fixed",
            middlewareData: {},
          });
        }
      };

      window.__datePickerFixApplied = true;
      console.log("DatePicker positioning fix applied");
    }
  } catch (err) {
    console.error("Failed to apply DatePicker fix:", err);
  }
}

// Apply the fix immediately when this module is imported
applyDatePickerFix();

// Export a component wrapper that applies the fix
export function withDatePickerFix(Component) {
  return function WrappedComponent(props) {
    // Apply the fix when the component mounts
    React.useEffect(() => {
      applyDatePickerFix();
    }, []);

    // Render the original component with all props
    return React.createElement(Component, props);
  };
}
