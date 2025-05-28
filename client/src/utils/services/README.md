# DreamTrip-AI RAG (Retrieval-Augmented Generation) Services

This directory contains service modules for the RAG layer in DreamTrip-AI, which enhances the AI assistant with real-time data from various sources.

## Service Modules

### 1. API Client (`apiClient.js`)

Base utilities for all API clients including:

- Retry logic with exponential backoff
- Standardized error handling
- Simulated data generation for fallback cases
- User-friendly error messages

### 2. Flight Service (`flightService.js`)

**Intents**: `Flight-Information`

**Methods**:

- `fetchFlightInformation()`: Retrieves flight options between destinations
- `fetchFlightStatus()`: Gets current status of a specific flight

**Request format**:

```javascript
{
  origin: "New York",           // Required
  destination: "London",        // Required
  date: "2023-12-15",           // Optional (defaults to today)
  returnDate: "2023-12-22",     // Optional
  passengers: 2                 // Optional (defaults to 1)
}
```

**Response format**:

```javascript
{
  success: true,
  origin: "New York",
  destination: "London",
  date: "2023-12-15",
  returnDate: "2023-12-22",
  flights: [
    {
      airline: "Example Air",
      flightNumber: "EA123",
      departureTime: "08:30",
      arrivalTime: "10:45",
      duration: "2h 15m",
      price: "$350",
      stops: 0,
      aircraft: "Boeing 737",
      cabinClass: "Economy"
    },
    // Additional flight options...
  ]
}
```

### 3. Events Service (`eventsService.js`)

**Intents**: `Local-Events`

**Methods**:

- `fetchLocalEvents()`: Retrieves events by location, dates, and category
- `fetchEventDetails()`: Gets detailed information about a specific event

**Request format**:

```javascript
{
  location: "Paris",           // Required
  startDate: "2023-12-01",     // Optional
  endDate: "2023-12-31",       // Optional
  category: "music",           // Optional (music, food, arts, sports, etc.)
  limit: 5                     // Optional (maximum number of results)
}
```

**Response format**:

```javascript
{
  success: true,
  location: "Paris",
  startDate: "2023-12-01",
  endDate: "2023-12-31",
  category: "music",
  events: [
    {
      name: "Jazz Night",
      type: "Concert",
      date: "Every Thursday",
      time: "8:00 PM - 11:00 PM",
      venue: "Blue Note Club",
      address: "789 Jazz Street",
      price: "$25",
      description: "Weekly jazz performance featuring local musicians",
      tags: ["jazz", "nightlife", "music"],
      url: "https://example.com/events/jazz-night"
    },
    // Additional events...
  ]
}
```

### 4. Restrictions Service (`restrictionsService.js`)

**Intents**: `Travel-Restrictions`, `Safety-Information`

**Methods**:

- `fetchTravelRestrictions()`: Retrieves entry requirements and visa information
- `fetchSafetyInformation()`: Gets health and safety advisories for a location

**Request format**:

```javascript
// For travel restrictions
{
  country: "Japan",            // Required
  citizenship: "USA"           // Optional (for traveler-specific requirements)
}

// For safety information
{
  location: "Thailand",        // Required
  type: "health"               // Optional (health, security, natural-disasters)
}
```

**Response format**:

```javascript
// Travel restrictions response
{
  success: true,
  country: "Japan",
  citizenship: "USA",
  restrictions: {
    visa: "Not required for stays under 90 days",
    passport: "Must be valid for the duration of your stay",
    covidRestrictions: "No COVID-19 restrictions in place",
    other: "Fingerprinting and photograph required at immigration"
  },
  safetyAdvisory: {
    level: "Level 1: Exercise Normal Precautions",
    lastUpdated: "2 months ago",
    details: "Japan is a very safe country with low crime rates..."
  },
  localLaws: [
    "Carrying your passport is required by law",
    "Some medications containing stimulants are prohibited",
    "Strict anti-drug laws with severe penalties"
  ],
  emergencyContacts: {
    police: "110",
    ambulance: "119",
    fire: "119",
    embassyUS: "+81-3-3224-5000"
  },
  lastUpdated: "2023-10-01"
}
```

### 5. Currency Service (`currencyService.js`)

**Intents**: `Currency-Conversion`, `Cost-Estimate`

**Methods**:

- `fetchCurrencyConversion()`: Converts between currencies
- `fetchCostEstimates()`: Provides travel cost estimates by location and budget level

**Request format**:

```javascript
// For currency conversion
{
  from: "USD",                 // Required
  to: "EUR",                   // Required
  amount: 100                  // Optional (defaults to 1)
}

// For cost estimates
{
  location: "Barcelona",       // Required
  category: "accommodation",   // Optional (accommodation, food, transportation, activities)
  budget: "moderate",          // Optional (budget, moderate, luxury)
  currency: "USD"              // Optional (defaults to USD)
}
```

**Response format**:

```javascript
// Currency conversion response
{
  success: true,
  from: "USD",
  to: "EUR",
  rate: "0.932500",
  amount: 100,
  converted: "93.25",
  lastUpdated: "2023-10-30T12:34:56.789Z"
}

// Cost estimates response
{
  success: true,
  location: "Barcelona",
  regionProxy: "france",
  budgetLevel: "moderate",
  currency: "USD",
  estimates: {
    accommodation: {
      lowRange: 100,
      highRange: 180,
      description: "3-star hotels, decent Airbnb"
    },
    food: {
      lowRange: 40,
      highRange: 60,
      description: "Mix of casual restaurants and self-catering"
    },
    // Additional categories...
  },
  dailyTotal: {
    low: 190,
    high: 320,
    average: 255
  },
  lastUpdated: "2023-09-15"
}
```

## Integration with AI System

These services are integrated with the AI system in the following ways:

1. **Intent Detection**: The AI model identifies user intents in the JSON response with `requires_external_data: true`

2. **External Data Fetching**: The `fetchExternalData()` function in `externalDataService.js` routes the request to the appropriate service

3. **Prompt Enhancement**: The `buildPromptWithExternalData()` function formats the retrieved data to enhance the AI prompt

4. **Error Handling**: Each service includes fallback mechanisms to handle API failures and generate simulated data when needed

## Error Handling

All services implement robust error handling with:

1. **Retries**: Failed API calls are retried with exponential backoff up to 3 times
2. **Clear Error Messages**: User-friendly error messages are generated based on intent type
3. **Simulated Fallback**: When APIs fail permanently, simulated data is provided with a flag to indicate it's not real data
4. **Logging**: Comprehensive error logging for debugging

## Adding New Data Sources

To add a new data source:

1. Create a new service module following the established pattern
2. Add the intent to `intentRequiresExternalData()` in `aiPromptUtils.js`
3. Update `fetchExternalData()` to handle the new intent
4. Add formatting logic in `buildPromptWithExternalData()`
5. Update the system prompt to inform the AI model about the new intent
