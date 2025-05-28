# Advice Handler Module

This module handles all advice-related processing in the DreamTrip AI application. It's responsible for processing user requests for external data like weather, currency conversion, travel restrictions, etc.

## Architecture

The Advice Handler consists of several components:

1. **AdviceHandler.js** - Main entry point for processing advice intents. Coordinates field validation, data fetching, and response formatting.
2. **AdviceFieldSchemas.js** - Defines required fields for each advice intent.
3. **AdviceFormatter.js** - Formats raw API responses into natural language.
4. **LocationResolver.js** - Smart service to validate and disambiguate location data.

## Example Usage

### Processing a Weather Request

Given a user query like "What will the weather be like in Rome right now?", the system:

1. Detects the intent `Weather-Request`
2. Extracts location data (`{ location: "Rome" }`)
3. Uses the LocationResolver to determine the correct country (`Italy`)
4. Validates all required fields are present
5. Fetches weather data from external API
6. Formats the response into natural language

```javascript
// Process a weather request for Rome
const result = await processAdviceIntent({
  userMessage: "What will the weather be like in Rome right now?",
  intent: "Weather-Request",
  data: { location: "Rome" },
  tripContext: null,
});

// Result will contain:
// {
//   success: true,
//   message: "The weather in Rome, Italy currently is 23°C with partly cloudy conditions.
//            There's a 10% chance of precipitation. Wind speeds are around 8 km/h."
// }
```

### Handling Ambiguous Locations

When a city name could refer to multiple places, the system prompts for clarification:

```javascript
// Process a weather request for a city that exists in multiple countries
const result = await processAdviceIntent({
  userMessage: "What will the weather be like in Paris right now?",
  intent: "Weather-Request",
  data: { location: "Paris", country: "USA" }, // Paris, USA was incorrectly identified
  tripContext: null,
});

// Result will contain:
// {
//   success: false,
//   needsFollowUp: true,
//   missingFields: ["location_confirmation"],
//   followUpQuestion: "I noticed a potential location conflict. Did you mean Paris, France?
//                      There's also Paris in United States. Is that correct?"
// }
```

## Benefits

1. **More accurate location matching** - Prevents errors when city names exist in multiple countries
2. **Consistent formatting** - All responses follow a consistent natural language pattern
3. **Improved user experience** - When information is missing, targeted follow-up questions are asked
4. **Modular architecture** - Easy to add new advice intents or modify existing ones
