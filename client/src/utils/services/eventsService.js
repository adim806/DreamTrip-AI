/**
 * Events service module
 * Handles API requests for local events, festivals, concerts, and meetups
 */
import {
  fetchWithRetry,
  generateSimulatedData,
  createUserErrorMessage,
} from "./apiClient";

/**
 * Fetches local events for a specific location and date range
 * @param {Object} params - Events search parameters
 * @param {string} params.location - Location to search for events (city, region)
 * @param {string} params.startDate - Start date for events search (YYYY-MM-DD)
 * @param {string} params.endDate - End date for events search (YYYY-MM-DD)
 * @param {string} params.category - Event category (music, food, sports, arts, etc.)
 * @param {number} params.limit - Maximum number of events to return
 * @returns {Promise<Object>} - Local events search results
 */
export const fetchLocalEvents = async (params) => {
  try {
    // Validate required parameters
    if (!params.location) {
      throw new Error("Location is required for events search");
    }

    console.log("Fetching local events:", params);

    // In a production environment, you would use a real events API like Ticketmaster, Eventbrite, or Meetup
    // For demonstration, we'll simulate the API response

    // Uncomment this to use a real API when available
    /*
    const API_KEY = import.meta.env.VITE_EVENTS_API_KEY;
    const url = `https://api.eventsservice.example/search?apiKey=${API_KEY}`;
    
    const response = await fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    
    if (!response.success) {
      throw new Error(response.error || "Failed to fetch events information");
    }
    
    return {
      success: true,
      ...response.data,
    };
    */

    // For demo purposes, create a simulated delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Generate different events based on category if specified
    const generateEventsByCategory = (category) => {
      const eventTypes = {
        music: [
          {
            name: "Summer Music Festival",
            type: "Music Festival",
            date: "This weekend",
            time: "12:00 PM - 11:00 PM",
            venue: "Central Park",
            address: "123 Park Avenue",
            price: "From $45",
            description:
              "A two-day music festival featuring local and international artists across three stages.",
            tags: ["music", "festival", "outdoor"],
            url: "https://example.com/events/summer-music-festival",
          },
          {
            name: "Jazz Night",
            type: "Concert",
            date: "Every Thursday",
            time: "8:00 PM - 11:00 PM",
            venue: "Blue Note Club",
            address: "789 Jazz Street",
            price: "$25",
            description:
              "Weekly jazz performance featuring rotating local jazz musicians and occasional special guests.",
            tags: ["jazz", "nightlife", "music"],
            url: "https://example.com/events/jazz-night",
          },
          {
            name: "Symphony Orchestra Performance",
            type: "Classical Music",
            date: "Next Friday",
            time: "7:30 PM",
            venue: "Concert Hall",
            address: "456 Classical Avenue",
            price: "$30-80",
            description:
              "The city symphony orchestra performs classical masterpieces from Mozart and Beethoven.",
            tags: ["classical", "orchestra", "music"],
            url: "https://example.com/events/symphony-orchestra",
          },
        ],
        food: [
          {
            name: "Food & Wine Festival",
            type: "Culinary Event",
            date: "Next weekend",
            time: "11:00 AM - 7:00 PM",
            venue: "Riverfront Park",
            address: "100 River Street",
            price: "$15 entry",
            description:
              "Taste dishes from over 40 local restaurants, sample wines, and enjoy cooking demonstrations.",
            tags: ["food", "wine", "tasting"],
            url: "https://example.com/events/food-wine-festival",
          },
          {
            name: "Farmers Market",
            type: "Market",
            date: "Every Saturday",
            time: "8:00 AM - 1:00 PM",
            venue: "Downtown Square",
            address: "200 Main Street",
            price: "Free",
            description:
              "Weekly market featuring local farmers, artisans, and food vendors with fresh produce and crafts.",
            tags: ["market", "local", "food"],
            url: "https://example.com/events/farmers-market",
          },
          {
            name: "Cooking Class: International Cuisine",
            type: "Workshop",
            date: "This Tuesday",
            time: "6:30 PM - 9:00 PM",
            venue: "Culinary Institute",
            address: "500 Chef Lane",
            price: "$75",
            description:
              "Learn to prepare dishes from around the world with renowned local chef Maria Rodriguez.",
            tags: ["cooking", "class", "international"],
            url: "https://example.com/events/cooking-class",
          },
        ],
        arts: [
          {
            name: "Contemporary Art Exhibition",
            type: "Exhibition",
            date: "All month",
            time: "10:00 AM - 6:00 PM",
            venue: "Modern Art Museum",
            address: "300 Gallery Road",
            price: "$12",
            description:
              "Exhibition featuring works from emerging contemporary artists exploring themes of identity and technology.",
            tags: ["art", "exhibition", "modern"],
            url: "https://example.com/events/contemporary-art",
          },
          {
            name: "Theater Performance: Shakespeare in the Park",
            type: "Theater",
            date: "Weekends this month",
            time: "7:00 PM",
            venue: "Community Park Amphitheater",
            address: "400 Green Avenue",
            price: "$20 suggested donation",
            description:
              "Outdoor performance of 'A Midsummer Night's Dream' by the local theater company.",
            tags: ["theater", "shakespeare", "outdoor"],
            url: "https://example.com/events/shakespeare",
          },
          {
            name: "Poetry Reading Night",
            type: "Literary Event",
            date: "This Wednesday",
            time: "7:00 PM - 9:00 PM",
            venue: "Bookstore Café",
            address: "150 Reader Lane",
            price: "Free",
            description:
              "Open mic poetry night featuring both established and amateur poets from the community.",
            tags: ["poetry", "literature", "open-mic"],
            url: "https://example.com/events/poetry-night",
          },
        ],
        sports: [
          {
            name: "City Marathon",
            type: "Running Event",
            date: "First Sunday next month",
            time: "7:00 AM start",
            venue: "City streets",
            address: "Start: Stadium Plaza",
            price: "$50 registration",
            description:
              "Annual city marathon with full, half, and 10k options. All proceeds go to local charities.",
            tags: ["marathon", "running", "charity"],
            url: "https://example.com/events/city-marathon",
          },
          {
            name: "Basketball Tournament",
            type: "Sports Event",
            date: "This Saturday",
            time: "10:00 AM - 6:00 PM",
            venue: "Community Center",
            address: "250 Sports Avenue",
            price: "Free for spectators",
            description:
              "Local basketball tournament featuring teams from neighborhood communities.",
            tags: ["basketball", "tournament", "community"],
            url: "https://example.com/events/basketball-tournament",
          },
          {
            name: "Yoga in the Park",
            type: "Fitness",
            date: "Every Sunday",
            time: "9:00 AM - 10:00 AM",
            venue: "Sunrise Park",
            address: "350 Zen Road",
            price: "Free",
            description:
              "Weekly community yoga session suitable for all levels. Bring your own mat.",
            tags: ["yoga", "fitness", "outdoor"],
            url: "https://example.com/events/park-yoga",
          },
        ],
      };

      // Return events for the specified category or a mix if not specified
      if (category && eventTypes[category.toLowerCase()]) {
        return eventTypes[category.toLowerCase()];
      }

      // If no category specified or not found, return a mix of events
      const allEvents = [];
      Object.values(eventTypes).forEach((categoryEvents) => {
        allEvents.push(
          categoryEvents[Math.floor(Math.random() * categoryEvents.length)]
        );
      });

      return allEvents;
    };

    const events = generateEventsByCategory(params.category);
    const limit = params.limit || events.length;

    return {
      success: true,
      location: params.location,
      startDate: params.startDate || "upcoming",
      endDate: params.endDate,
      category: params.category || "all",
      events: events.slice(0, limit),
    };
  } catch (error) {
    console.error("Error fetching local events:", error);

    // Generate helpful error message
    const errorMessage = createUserErrorMessage("Local-Events", error);

    // Return simulated data with a flag indicating it's not real
    return generateSimulatedData("Local-Events", params);
  }
};

/**
 * Fetches details for a specific event
 * @param {Object} params - Event details
 * @param {string} params.eventId - ID of the event
 * @param {string} params.name - Name of the event (fallback if ID not available)
 * @returns {Promise<Object>} - Detailed event information
 */
export const fetchEventDetails = async (params) => {
  try {
    // Validate required parameters
    if (!params.eventId && !params.name) {
      throw new Error("Event ID or name is required");
    }

    console.log("Fetching event details:", params);

    // For demo purposes, create a simulated delay
    await new Promise((resolve) => setTimeout(resolve, 700));

    // Return mock event details
    return {
      success: true,
      eventId: params.eventId || "ev12345",
      name: params.name || "Sample Event",
      type: "Festival",
      date: "Next weekend",
      time: "12:00 PM - 10:00 PM",
      venue: {
        name: "Central Park",
        address: "123 Park Avenue",
        city: params.location || "New York",
        coordinates: {
          lat: 40.7812,
          lng: -73.9665,
        },
      },
      price: {
        range: "$15-45",
        ticketUrl: "https://example.com/tickets",
      },
      description:
        "A wonderful event featuring local artists, food vendors, and activities for all ages.",
      organizer: "City Events Committee",
      contactInfo: "info@example.com",
      website: "https://example.com/event",
      socialMedia: {
        facebook: "https://facebook.com/event",
        instagram: "https://instagram.com/event",
      },
      tags: ["festival", "family-friendly", "music", "food"],
      images: [
        "https://example.com/event-image1.jpg",
        "https://example.com/event-image2.jpg",
      ],
    };
  } catch (error) {
    console.error("Error fetching event details:", error);

    // Return simplified simulated data
    return {
      success: true,
      simulated: true,
      eventId: params.eventId || "unknown",
      name: params.name || "Event",
      description: "Event details are currently unavailable.",
      message:
        "The requested event information could not be retrieved at this time.",
    };
  }
};
