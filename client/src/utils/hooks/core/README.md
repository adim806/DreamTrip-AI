# Core Utilities - Modular Hook System

This directory contains the modularized core utilities extracted from the monolithic `useProcessUserInput.js` hook. The goal is to improve maintainability, testability, and reusability while maintaining the existing functionality.

## 📁 Module Structure

```
core/
├── index.js                  # Main exports and aggregator
├── messageHandling.js        # Message lifecycle and UI updates
├── dateTimeProcessing.js     # Date/time conversion and validation
├── dataTransformation.js     # Data normalization and merging
├── intentProcessing.js       # Intent detection and validation
├── conversationMemory.js     # Context and memory management
└── README.md                 # This documentation
```

## 🛠️ Modules Overview

### 1. Message Handling (`messageHandling.js`)

**Purpose**: Manages chat messages, UI updates, and message lifecycle.

**Key Functions**:

- `useMessageHandling()` - Hook for message state management
- `updateWithDelay()` - Delayed message updates for smooth UX
- `replaceLoadingMessage()` - Replace loading indicators
- `addSystemMessage()` - Add system notifications
- `isAcknowledgmentMessage()` - Detect simple user acknowledgments

**Usage**:

```javascript
import { useMessageHandling } from "./core/messageHandling";

const { pendingMessages, updateWithDelay, addSystemMessage } =
  useMessageHandling();
```

### 2. Date/Time Processing (`dateTimeProcessing.js`)

**Purpose**: Handles all date and time related operations.

**Key Functions**:

- `processRelativeDates()` - Convert relative dates ("tomorrow", "next week")
- `convertRelativeDate()` - Single date conversion
- `processTimeReferences()` - Process time context in data
- `isToday()`, `isTomorrow()`, `isWeekend()` - Date validation helpers

**Usage**:

```javascript
import {
  processRelativeDates,
  convertRelativeDate,
} from "./core/dateTimeProcessing";

const processedDates = processRelativeDates(userDates, tripDuration);
const actualDate = convertRelativeDate("tomorrow");
```

### 3. Data Transformation (`dataTransformation.js`)

**Purpose**: Normalizes, validates, and transforms data structures.

**Key Functions**:

- `normalizeDataStructure()` - Standardize AI response data
- `mergeWithExistingTripData()` - Intelligent data merging
- `splitLocationField()` - Separate city/country from combined location
- `standardizeBudgetLevel()` - Normalize budget terms
- `validateAndCleanData()` - Data validation and cleanup

**Usage**:

```javascript
import {
  normalizeDataStructure,
  mergeWithExistingTripData,
} from "./core/dataTransformation";

const normalized = normalizeDataStructure(aiResponse);
const merged = mergeWithExistingTripData(newData, modelFields, rules);
```

### 4. Intent Processing (`intentProcessing.js`)

**Purpose**: Handles user intent detection, validation, and processing.

**Key Functions**:

- `sanitizeIntent()` - Validate and normalize intent values
- `getRequiredFieldsForIntent()` - Get required fields by intent type
- `detectUserConfirmation()` - Detect user approval/confirmation
- `analyzeMessageContext()` - Context-aware intent analysis
- `validateIntentDataConsistency()` - Ensure data matches intent

**Usage**:

```javascript
import {
  sanitizeIntent,
  detectUserConfirmation,
} from "./core/intentProcessing";

const cleanIntent = sanitizeIntent(rawIntent);
const isConfirming = detectUserConfirmation(userMessage, data, state);
```

### 5. Conversation Memory (`conversationMemory.js`)

**Purpose**: Manages conversation context, memory, and session state.

**Key Functions**:

- `useConversationMemory()` - Hook for memory management
- `updateConversationMemory()` - Update context with new data
- `getRelevantContext()` - Extract relevant context for intent
- `extractEntitiesFromData()` - Extract entities from structured data

**Usage**:

```javascript
import { useConversationMemory } from "./core/conversationMemory";

const { conversationMemory, updateConversationMemory, getRelevantContext } =
  useConversationMemory();
```

## 🔄 Migration Strategy

### Phase 1: ✅ **Completed - Basic Modules**

- Created core modular structure
- Extracted message handling utilities
- Extracted date/time processing
- Extracted data transformation utilities
- Extracted intent processing utilities
- Extracted conversation memory management

### Phase 2: **Next Steps - Integration**

- Update `useProcessUserInput.js` to use new modules
- Replace inline functions with module imports
- Maintain backward compatibility
- Test all existing functionality

### Phase 3: **Future Enhancements**

- Add comprehensive unit tests for each module
- Create additional specialized modules as needed
- Optimize performance with memoization where appropriate
- Add TypeScript definitions

## 📖 Usage Examples

### Simple Import Pattern

```javascript
// Import specific functions
import {
  useMessageHandling,
  processRelativeDates,
  sanitizeIntent,
} from "./core";

// Use in component
const { pendingMessages, addSystemMessage } = useMessageHandling();
```

### Comprehensive Import Pattern

```javascript
// Import all utilities from index
import { CoreUtilities } from "./core";

// Access via namespace
const cleanedData = CoreUtilities.dataTransformation.validateAndCleanData(data);
const processedDate = CoreUtilities.dateTime.convertRelativeDate("tomorrow");
```

### Hook Composition Pattern

```javascript
// Combine multiple hooks for complex functionality
import { useMessageHandling, useConversationMemory } from "./core";

export function useProcessUserInput(chatData) {
  const messageHandling = useMessageHandling();
  const conversationMemory = useConversationMemory();

  // Compose functionality
  return {
    ...messageHandling,
    ...conversationMemory,
    // Additional processing logic
  };
}
```

## 🧪 Testing

Each module is designed to be independently testable. Example test structure:

```javascript
// Example: messageHandling.test.js
import { isAcknowledgmentMessage, generateMessageId } from "./messageHandling";

describe("Message Handling", () => {
  test("detects acknowledgment messages", () => {
    expect(isAcknowledgmentMessage("thanks")).toBe(true);
    expect(isAcknowledgmentMessage("how about hotels?")).toBe(false);
  });

  test("generates unique message IDs", () => {
    const id1 = generateMessageId();
    const id2 = generateMessageId();
    expect(id1).not.toBe(id2);
  });
});
```

## 🔧 Configuration

### Environment Setup

No additional configuration needed. Modules work with existing environment variables and dependencies.

### Dependencies

All modules use existing project dependencies:

- React hooks (`useState`, `useCallback`, `useRef`, `useEffect`)
- No external libraries required for core functionality

## 📝 Contributing

When adding new functionality:

1. **Choose the right module** - Place functions in the most appropriate module
2. **Maintain consistency** - Follow existing naming and structure patterns
3. **Add documentation** - Include JSDoc comments for all functions
4. **Export properly** - Add exports to both module and index file
5. **Test thoroughly** - Ensure new functions don't break existing functionality

## 🚨 Breaking Changes

**None** - This modularization maintains full backward compatibility. The original `useProcessUserInput.js` will continue to work exactly as before while using the new modular structure internally.

## 📞 Support

For questions about the modular structure or help with integration, refer to:

- Individual module documentation (JSDoc comments)
- Test files for usage examples
- Original `useProcessUserInput.js` for context
