# DreamTrip-AI Utilities

## Context-Aware System Instructions

The `aiPromptUtils.js` module includes a dynamic system instruction builder that creates optimized, context-aware instructions for the AI model based on the current conversation state.

### Key Features

- **Dynamic Instruction Generation**: Creates tailored system instructions based on current context
- **Reduced Token Usage**: Only includes relevant instructions for the current state
- **Improved Response Relevance**: Guides the model to focus on appropriate actions for the current state
- **Better Context Handling**: Incorporates trip details, conversation state, and previous intents

### Usage Example

```javascript
import { getSystemInstruction } from "../utils/aiPromptUtils";

// Create a context-aware instruction
const instruction = getSystemInstruction({
  state: "TRIP_BUILDING_MODE",
  mode: "Trip-Building",
  tripDetails: {
    vacation_location: "Paris",
    duration: 7,
    // Other trip details...
  },
  lastIntent: "Build-Trip",
});

// Use the instruction with the AI model
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: instruction,
});
```

### Context Parameters

The system instruction builder accepts the following context parameters:

- **state**: Current conversation state (e.g., 'IDLE', 'TRIP_BUILDING_MODE', 'AWAITING_USER_TRIP_CONFIRMATION')
- **mode**: Current conversation mode ('Advice' or 'Trip-Building')
- **tripDetails**: Current trip information object
- **lastIntent**: The previously detected intent

### Benefits

1. **Reduced Prompt Size**: Only includes instructions relevant to the current context
2. **Better Guidance**: Directs the model to focus on the appropriate next steps
3. **Improved Consistency**: Maintains the expected response structure across all interactions
4. **Enhanced State Management**: Helps the model navigate the conversation state machine

By using context-aware system instructions, the DreamTrip-AI application can maintain more focused and efficient conversations with users while reducing token usage and improving response quality.
