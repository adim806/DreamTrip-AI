/**
 * Conversation memory and context management utilities
 * Handles conversation state, memory, and context tracking
 */

import { useState, useRef } from "react";

/**
 * Custom hook for managing conversation memory and context
 */
export const useConversationMemory = () => {
  // Conversation memory state
  const [conversationMemory, setConversationMemory] = useState({
    intents: [], // Track recent intents
    entities: {}, // Track extracted entities
    context: {}, // Track conversation context
    userProfile: {}, // Track user preferences and data
    lastUpdated: null,
  });

  // Session metadata tracking
  const sessionMetadataRef = useRef({
    lastState: null,
    lastIntent: null,
    contextUpdates: 0,
    lastTripDetails: null,
    requiresReset: false,
  });

  /**
   * Updates conversation memory with new intent and data
   * @param {string} intent - The detected intent
   * @param {Object} data - Associated data with the intent
   */
  const updateConversationMemory = (intent, data = {}) => {
    if (!intent) {
      console.warn("[ConversationMemory] No intent provided for memory update");
      return;
    }

    console.log(
      `[ConversationMemory] Updating memory with intent: ${intent}`,
      data
    );

    setConversationMemory((prev) => {
      const updated = { ...prev };

      // Update intents history (keep last 10)
      updated.intents = [intent, ...prev.intents.slice(0, 9)];

      // Update entities based on intent type
      if (data) {
        // Location entities
        if (data.city || data.country || data.location) {
          updated.entities.location = {
            city: data.city || updated.entities.location?.city,
            country: data.country || updated.entities.location?.country,
            fullLocation:
              data.location || updated.entities.location?.fullLocation,
            lastUpdated: new Date().toISOString(),
          };
        }

        // Time entities
        if (data.date || data.time || data.dates) {
          updated.entities.time = {
            date: data.date || updated.entities.time?.date,
            time: data.time || updated.entities.time?.time,
            dates: data.dates || updated.entities.time?.dates,
            lastUpdated: new Date().toISOString(),
          };
        }

        // Budget entities
        if (data.budget || data.budget_level) {
          updated.entities.budget = {
            level: data.budget_level || updated.entities.budget?.level,
            amount: data.budget || updated.entities.budget?.amount,
            lastUpdated: new Date().toISOString(),
          };
        }

        // Trip entities
        if (data.vacation_location || data.duration) {
          updated.entities.trip = {
            destination:
              data.vacation_location || updated.entities.trip?.destination,
            duration: data.duration || updated.entities.trip?.duration,
            lastUpdated: new Date().toISOString(),
          };
        }
      }

      // Update context
      updated.context[intent] = {
        data: data,
        timestamp: new Date().toISOString(),
        count: (updated.context[intent]?.count || 0) + 1,
      };

      // Update metadata
      updated.lastUpdated = new Date().toISOString();

      return updated;
    });

    // Update session metadata
    sessionMetadataRef.current = {
      ...sessionMetadataRef.current,
      lastIntent: intent,
      contextUpdates: sessionMetadataRef.current.contextUpdates + 1,
      lastUpdated: new Date().toISOString(),
    };

    console.log("[ConversationMemory] Memory updated successfully");
  };

  /**
   * Merges new data with existing conversation memory
   * @param {Object} newData - New data to merge
   * @param {string} category - Category to merge into (optional)
   */
  const mergeWithConversationMemory = (newData, category = null) => {
    if (!newData || typeof newData !== "object") {
      console.warn("[ConversationMemory] Invalid data provided for merging");
      return;
    }

    console.log(`[ConversationMemory] Merging data into memory`, {
      newData,
      category,
    });

    setConversationMemory((prev) => {
      const updated = { ...prev };

      if (category) {
        // Merge into specific category
        updated[category] = {
          ...updated[category],
          ...newData,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        // Merge into root level with deep merge
        Object.keys(newData).forEach((key) => {
          if (
            typeof newData[key] === "object" &&
            !Array.isArray(newData[key])
          ) {
            updated[key] = {
              ...updated[key],
              ...newData[key],
            };
          } else {
            updated[key] = newData[key];
          }
        });

        updated.lastUpdated = new Date().toISOString();
      }

      return updated;
    });
  };

  /**
   * Gets recent chat history for context
   * @param {Array} chatHistory - Full chat history
   * @param {number} limit - Number of recent messages to return
   * @returns {Array} - Recent chat messages
   */
  const getRecentChatHistory = (chatHistory, limit = 5) => {
    if (!Array.isArray(chatHistory)) {
      return [];
    }

    return chatHistory.slice(-limit).map((msg) => ({
      role: msg.role,
      content: msg.parts?.[0]?.text || msg.content || "",
      timestamp: msg.timestamp,
    }));
  };

  /**
   * Extracts relevant context for current intent
   * @param {string} currentIntent - Current intent being processed
   * @returns {Object} - Relevant context data
   */
  const getRelevantContext = (currentIntent) => {
    if (!currentIntent) return {};

    const context = {};

    // Get entities relevant to the intent
    switch (currentIntent) {
      case "Weather-Request":
        if (conversationMemory.entities.location) {
          context.location = conversationMemory.entities.location;
        }
        if (conversationMemory.entities.time) {
          context.time = conversationMemory.entities.time;
        }
        break;

      case "Find-Hotel":
      case "Find-Attractions":
      case "Find-Restaurants":
        if (conversationMemory.entities.location) {
          context.location = conversationMemory.entities.location;
        }
        if (conversationMemory.entities.budget) {
          context.budget = conversationMemory.entities.budget;
        }
        if (conversationMemory.entities.time) {
          context.time = conversationMemory.entities.time;
        }
        break;

      case "Trip-Planning":
      case "Trip-Building":
        if (conversationMemory.entities.trip) {
          context.trip = conversationMemory.entities.trip;
        }
        if (conversationMemory.entities.budget) {
          context.budget = conversationMemory.entities.budget;
        }
        if (conversationMemory.entities.time) {
          context.time = conversationMemory.entities.time;
        }
        break;

      default:
        // For general queries, provide minimal context
        context.recentIntents = conversationMemory.intents.slice(0, 3);
        break;
    }

    // Add conversation flow context
    context.conversationFlow = {
      recentIntents: conversationMemory.intents.slice(0, 3),
      lastIntent: conversationMemory.intents[0] || null,
      intentCount: conversationMemory.context[currentIntent]?.count || 0,
    };

    return context;
  };

  /**
   * Clears conversation memory (partial or complete)
   * @param {string} category - Specific category to clear (optional)
   */
  const clearConversationMemory = (category = null) => {
    if (category) {
      console.log(`[ConversationMemory] Clearing memory category: ${category}`);

      setConversationMemory((prev) => ({
        ...prev,
        [category]: category === "entities" ? {} : [],
        lastUpdated: new Date().toISOString(),
      }));
    } else {
      console.log("[ConversationMemory] Clearing all conversation memory");

      setConversationMemory({
        intents: [],
        entities: {},
        context: {},
        userProfile: {},
        lastUpdated: new Date().toISOString(),
      });

      // Reset session metadata
      sessionMetadataRef.current = {
        lastState: null,
        lastIntent: null,
        contextUpdates: 0,
        lastTripDetails: null,
        requiresReset: false,
      };
    }
  };

  /**
   * Checks if memory needs to be reset based on session changes
   * @param {Object} currentSession - Current session data
   * @returns {boolean} - True if reset is needed
   */
  const shouldResetMemory = (currentSession) => {
    if (!currentSession) return false;

    // Check if session ID changed
    if (
      sessionMetadataRef.current.sessionId &&
      currentSession.id !== sessionMetadataRef.current.sessionId
    ) {
      return true;
    }

    // Check if too much time has passed
    if (conversationMemory.lastUpdated) {
      const lastUpdate = new Date(conversationMemory.lastUpdated);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

      if (hoursSinceUpdate > 24) {
        // Reset after 24 hours
        return true;
      }
    }

    return false;
  };

  /**
   * Gets conversation statistics
   * @returns {Object} - Statistics about the conversation
   */
  const getConversationStats = () => {
    return {
      totalIntents: conversationMemory.intents.length,
      uniqueIntents: [...new Set(conversationMemory.intents)].length,
      entitiesTracked: Object.keys(conversationMemory.entities).length,
      contextEntries: Object.keys(conversationMemory.context).length,
      lastUpdated: conversationMemory.lastUpdated,
      sessionStats: {
        contextUpdates: sessionMetadataRef.current.contextUpdates,
        lastIntent: sessionMetadataRef.current.lastIntent,
        lastState: sessionMetadataRef.current.lastState,
      },
    };
  };

  return {
    conversationMemory,
    sessionMetadataRef,
    updateConversationMemory,
    mergeWithConversationMemory,
    getRecentChatHistory,
    getRelevantContext,
    clearConversationMemory,
    shouldResetMemory,
    getConversationStats,
  };
};

/**
 * Utility functions for conversation memory management
 */

/**
 * Extracts entities from structured data
 * @param {Object} data - Structured data from AI
 * @returns {Object} - Extracted entities organized by type
 */
export const extractEntitiesFromData = (data) => {
  if (!data || typeof data !== "object") {
    return {};
  }

  const entities = {};

  // Location entities
  if (data.city || data.country || data.location || data.vacation_location) {
    entities.location = {
      city: data.city,
      country: data.country,
      location: data.location,
      vacation_location: data.vacation_location,
      extracted: new Date().toISOString(),
    };
  }

  // Time entities
  if (data.date || data.time || data.dates || data.duration) {
    entities.time = {
      date: data.date,
      time: data.time,
      dates: data.dates,
      duration: data.duration,
      extracted: new Date().toISOString(),
    };
  }

  // Budget entities
  if (data.budget || data.budget_level || data.constraints?.budget) {
    entities.budget = {
      budget: data.budget,
      budget_level: data.budget_level,
      constraints_budget: data.constraints?.budget,
      extracted: new Date().toISOString(),
    };
  }

  return entities;
};

/**
 * Merges entities while preserving the most recent and complete data
 * @param {Object} existingEntities - Current entities
 * @param {Object} newEntities - New entities to merge
 * @returns {Object} - Merged entities
 */
export const mergeEntities = (existingEntities, newEntities) => {
  if (!existingEntities) return newEntities || {};
  if (!newEntities) return existingEntities;

  const merged = { ...existingEntities };

  Object.keys(newEntities).forEach((entityType) => {
    if (newEntities[entityType]) {
      merged[entityType] = {
        ...merged[entityType],
        ...newEntities[entityType],
        lastMerged: new Date().toISOString(),
      };
    }
  });

  return merged;
};

export default {
  useConversationMemory,
  extractEntitiesFromData,
  mergeEntities,
};
