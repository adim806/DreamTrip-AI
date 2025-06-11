/**
 * Message handling utilities for managing chat messages and UI updates
 * Extracted from useProcessUserInput.js for better modularity
 */

import { useState, useCallback } from "react";

/**
 * Custom hook for managing message-related functionality
 */
export const useMessageHandling = () => {
  const [pendingMessages, setPendingMessages] = useState([]);

  /**
   * Updates messages with a delay to ensure proper UI rendering
   * @param {Array} newMessages - Array of new messages to add
   * @param {number} delay - Delay in milliseconds (default: 300ms)
   */
  const updateWithDelay = useCallback((newMessages, delay = 300) => {
    console.log(`[Messages] Updating with ${delay}ms delay:`, newMessages);

    setTimeout(() => {
      setPendingMessages((prev) => {
        // Filter out loading messages before adding new ones
        const withoutLoading = prev.filter((msg) => !msg.isLoadingMessage);

        // Add new messages
        const updated = [...withoutLoading, ...newMessages];

        console.log(
          `[Messages] Updated after delay. Total messages: ${updated.length}`
        );
        return updated;
      });
    }, delay);
  }, []);

  /**
   * Replaces a loading message with a new message (with optional delay)
   * SAFETY: This will never replace user messages - only loading indicators
   * @param {string} loadingId - The ID of the loading message to replace
   * @param {Object} newMessage - The new message object
   * @param {number} delay - Optional delay in milliseconds before replacement
   */
  const replaceLoadingMessage = useCallback(
    (loadingId, newMessage, delay = 0) => {
      console.log(
        `[Messages] Replacing loading message ${loadingId} with: "${newMessage.message?.substring(
          0,
          50
        )}..."`
      );

      const performReplacement = () => {
        setPendingMessages((prev) => {
          console.log(
            `[Messages] Looking for loading message with ID: ${loadingId}`
          );
          console.log(
            `[Messages] Current pending messages:`,
            prev.map((msg) => ({
              id: msg.id,
              role: msg.role,
              isLoadingMessage: msg.isLoadingMessage,
              isExternalDataFetch: msg.isExternalDataFetch,
              message: msg.message?.substring(0, 30) + "...",
            }))
          );

          let messageFound = false;
          const updated = prev.map((msg) => {
            // Only replace if it's the exact loading message we're looking for
            if (msg.id === loadingId) {
              console.log(`[Messages] Found message with ID ${loadingId}:`);
              console.log(`   - isLoadingMessage: ${msg.isLoadingMessage}`);
              console.log(
                `   - isExternalDataFetch: ${msg.isExternalDataFetch}`
              );
              console.log(`   - role: ${msg.role}`);

              // Replace if it's a loading message OR external data fetch message
              if (msg.isLoadingMessage || msg.isExternalDataFetch) {
                console.log(
                  `[Messages] ✅ Replacing loading/external message ${loadingId}`
                );
                messageFound = true;
                return { ...newMessage, timestamp: new Date().toISOString() };
              } else {
                console.log(
                  `[Messages] ❌ Not replacing - not a loading/external message`
                );
              }
            }

            // SAFETY: Never replace user messages
            if (msg.role === "user") {
              console.log(
                `[Messages] Preserving user message during replacement: "${msg.message?.substring(
                  0,
                  30
                )}..."`
              );
              return msg;
            }

            return msg;
          });

          if (messageFound) {
            console.log(
              `[Messages] Successfully replaced loading message ${loadingId}`
            );
          } else {
            console.warn(
              `[Messages] ⚠️  Could not find loading message with ID ${loadingId} to replace!`
            );
          }

          return updated;
        });
      };

      if (delay > 0) {
        setTimeout(performReplacement, delay);
      } else {
        performReplacement();
      }
    },
    []
  );

  /**
   * Adds a system message to the conversation
   * @param {string} message - The system message text
   */
  const addSystemMessage = useCallback((message) => {
    if (!message) {
      console.warn(
        "[Messages] Attempted to add undefined or empty system message"
      );
      return;
    }

    // Ensure message is a string
    const messageStr = String(message);

    console.log(
      `[Messages] Adding system message: "${messageStr.substring(0, 50)}..."`
    );

    const systemMessage = {
      role: "model",
      message: messageStr,
      id: `system-${Date.now()}`,
      isSystemMessage: true,
      isPermanent: true,
    };

    setPendingMessages((prev) => [...prev, systemMessage]);

    console.log(`[Messages] System message added successfully`);
  }, []);

  /**
   * Checks if a message is a simple acknowledgment (like "thanks", "ok", etc.)
   * @param {string} message - The message to check
   * @returns {boolean} - True if it's an acknowledgment message
   */
  const isAcknowledgmentMessage = useCallback((message) => {
    if (!message || typeof message !== "string") return false;

    const lowerMsg = message.toLowerCase().trim();

    // List of acknowledgment phrases
    const acknowledgmentPhrases = [
      // English
      "thanks",
      "thank you",
      "thx",
      "ty",
      "thanks!",
      "thank you!",
      "great",
      "awesome",
      "perfect",
      "excellent",
      "amazing",
      "ok",
      "okay",
      "alright",
      "got it",
      "understood",
      "cool",
      "nice",
      "good",
      "sounds good",
      "looks good",

      // Shorter forms
      "ty",
      "k",
      "kk",
      "ok",

      // Hebrew
      "תודה",
      "תודה רבה",
      "מעולה",
      "נהדר",
      "סבבה",
      "מגניב",
      "הבנתי",
      "אחלה",
    ];

    // Check for exact matches or if the message starts with an acknowledgment phrase
    for (const phrase of acknowledgmentPhrases) {
      if (
        lowerMsg === phrase ||
        lowerMsg === `${phrase}.` ||
        lowerMsg === `${phrase}!`
      ) {
        return true;
      }
    }

    // Check if it's just a really short response (1-2 words) without question mark
    const wordCount = lowerMsg.split(/\s+/).length;
    if (
      wordCount <= 2 &&
      !lowerMsg.includes("?") &&
      !lowerMsg.includes("weather") &&
      !lowerMsg.includes("hotel") &&
      !lowerMsg.includes("flight") &&
      !lowerMsg.includes("attraction")
    ) {
      // Short message that's not asking about common external data services
      return true;
    }

    return false;
  }, []);

  /**
   * Removes loading messages from the pending messages array
   * SAFETY: This will never remove user messages - only loading indicators
   */
  const clearLoadingMessages = useCallback(() => {
    setPendingMessages((prev) => {
      const filtered = prev.filter((msg) => {
        // NEVER remove user messages
        if (msg.role === "user") {
          console.log(
            `[Messages] Preserving user message: "${msg.message?.substring(
              0,
              30
            )}..."`
          );
          return true;
        }

        // Remove only loading messages
        if (msg.isLoadingMessage) {
          console.log(`[Messages] Removing loading message: ${msg.id}`);
          return false;
        }

        // Keep all other messages
        return true;
      });

      console.log(
        `[Messages] clearLoadingMessages: Kept ${filtered.length} out of ${prev.length} messages`
      );
      return filtered;
    });
  }, []);

  /**
   * Adds a typing/loading indicator message
   * @param {string} customId - Optional custom ID for the loading message
   * @returns {string} - The ID of the created loading message
   */
  const addLoadingMessage = useCallback((customId = null) => {
    const loadingId = customId || `loading-${Date.now()}`;

    const loadingMessage = {
      role: "model",
      message: "...",
      id: loadingId,
      isLoadingMessage: true,
      isGenericTyping: true,
    };

    setPendingMessages((prev) => [...prev, loadingMessage]);

    console.log(`[Messages] Added loading message with ID: ${loadingId}`);
    return loadingId;
  }, []);

  return {
    pendingMessages,
    setPendingMessages,
    updateWithDelay,
    replaceLoadingMessage,
    addSystemMessage,
    isAcknowledgmentMessage,
    clearLoadingMessages,
    addLoadingMessage,
  };
};

/**
 * Standalone utility functions for message handling
 */

/**
 * Generates a unique message ID
 * @param {string} prefix - Prefix for the ID (e.g., 'user', 'model', 'system')
 * @returns {string} - Unique message ID
 */
export const generateMessageId = (prefix = "msg") => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validates message object structure
 * @param {Object} message - Message object to validate
 * @returns {boolean} - True if message is valid
 */
export const isValidMessage = (message) => {
  return (
    message &&
    typeof message === "object" &&
    typeof message.role === "string" &&
    (typeof message.message === "string" || message.message === null) &&
    typeof message.id === "string"
  );
};

/**
 * Formats a message for display
 * @param {Object} message - Raw message object
 * @returns {Object} - Formatted message object
 */
export const formatMessageForDisplay = (message) => {
  if (!isValidMessage(message)) {
    console.warn("Invalid message object provided to formatMessageForDisplay");
    return null;
  }

  return {
    ...message,
    timestamp: message.timestamp || new Date().toISOString(),
    isDisplayStable: true,
  };
};

export default useMessageHandling;
