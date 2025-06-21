import mongoose from "mongoose";

// Define a schema for coordinates
const coordinatesSchema = new mongoose.Schema(
  {
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

// Define a schema for external links
const externalLinksSchema = new mongoose.Schema(
  {
    official_site: String,
    google_maps: String,
    booking_url: String,
    tripadvisor: String,
  },
  { _id: false, strict: false }
);

// Define an enhanced activity schema with geolocation and metadata
const enhancedActivitySchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    type: {
      type: String,
      enum: [
        "attraction",
        "restaurant",
        "museum",
        "outdoor",
        "transport",
        "accommodation",
        "other",
      ],
      default: "attraction",
    },
    coordinates: coordinatesSchema,
    duration_minutes: Number,
    tags: [String],
    weather_sensitive: Boolean,
    eco_friendly: Boolean,
    is_accessible: Boolean,
    image_url: String,
    external_links: externalLinksSchema,
    timeBlock: String,
    dayNumber: Number,
    index: Number,
    significance: String,
    tip: String,
  },
  { _id: false, strict: false }
);

// Define a schema for cost estimates
const costEstimateSchema = new mongoose.Schema(
  {
    currency: {
      type: String,
      default: "USD",
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

// Define a schema for tags
const tagSchema = new mongoose.Schema(
  {
    type: String,
  },
  { _id: false }
);

// Define a schema for location coordinates
const locationSchema = new mongoose.Schema(
  {
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

// Define a schema for activity items
const activityItemSchema = new mongoose.Schema(
  {
    activityId: String,
    title: String,
    type: String,
    description: String,
    tip: String,
    alternative: String,
    location: locationSchema,
    tags: [String],
    estimatedCost: costEstimateSchema,
  },
  { _id: false, strict: false }
);

// Define a schema for restaurant items
const restaurantSchema = new mongoose.Schema(
  {
    activityId: String,
    name: String,
    type: String,
    cuisine: String,
    tags: [String],
    estimatedCost: costEstimateSchema,
    notes: String,
  },
  { _id: false, strict: false }
);

// Define a schema for evening options
const optionSchema = new mongoose.Schema(
  {
    activityId: String,
    type: String,
    place: String,
    description: String,
    tags: [String],
    estimatedCost: costEstimateSchema,
  },
  { _id: false, strict: false }
);

// Define a schema for sections in the new format
const sectionSchema = new mongoose.Schema(
  {
    timeOfDay: String,
    time: String,
    activities: {
      type: [activityItemSchema],
      default: undefined
    },
    restaurant: restaurantSchema,
    options: {
      type: [optionSchema],
      default: undefined
    }
  },
  { _id: false, strict: false }
);

// Define a flexible schema for activities that can handle various formats
const activitySchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    text: String,
    time: String,
    transitFromPrevious: String,
    isChoice: Boolean,
    options: [String],
    significance: String,
    tip: String,
    details: mongoose.Schema.Types.Mixed,
    // Allow any additional fields
  },
  { strict: false, _id: false }
);

// Define a schema for time blocks
const timeBlockSchema = new mongoose.Schema(
  {
    title: String,
    timeRange: String,
    activities: [mongoose.Schema.Types.Mixed],
  },
  { strict: false, _id: false }
);

// Define a schema for a day in the itinerary
const daySchema = new mongoose.Schema(
  {
    dayId: String,
    dayNumber: Number,
    title: String,
    theme: String,
    date: String,
    overview: String,
    activities: {
      morning: [mongoose.Schema.Types.Mixed],
      lunch: [mongoose.Schema.Types.Mixed],
      afternoon: [mongoose.Schema.Types.Mixed],
      evening: [mongoose.Schema.Types.Mixed],
      dinner: [mongoose.Schema.Types.Mixed],
      transportation: [String],
      notes: [String],
    },
    dayIndex: Number,
    enhancedActivities: [mongoose.Schema.Types.Mixed],
    sections: [sectionSchema],
  },
  { _id: false, strict: false }
);

// Define a schema for additional information
const additionalInfoSchema = new mongoose.Schema(
  {
    tips: [String],
    transportation: [String],
    accommodation: [String],
    createdAt: String,
    lastEnhanced: String,
  },
  { _id: false }
);

// Define a schema for dates
const datesSchema = new mongoose.Schema(
  {
    from: String,
    to: String,
    start: String,
    end: String,
  },
  { _id: false }
);

// Define a schema for metadata
const metadataSchema = new mongoose.Schema(
  {
    isFavorite: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    format: String,
    destination: String,
    duration: String,
    budget: String,
    dates: datesSchema,
    savedAt: String,
    generatedAt: String,
  },
  { _id: false, strict: false }
);

// Define a schema for structured content
const structuredContentSchema = new mongoose.Schema(
  {
    title: String,
    destination: String,
    duration: String,
    dates: datesSchema,
    days: [daySchema],
    budget: String,
    additionalInfo: additionalInfoSchema,
  },
  { _id: false, strict: false }
);

const itinerarySchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chat",
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: false,
      default: "יומן טיול",
    },
    destination: {
      type: String,
      required: false,
    },
    duration: {
      type: String,
      required: false,
    },
    dates: {
      type: datesSchema,
      default: () => ({}),
    },
    rawContent: {
      type: String,
      required: true,
    },
    structuredContent: {
      type: structuredContentSchema,
      default: () => ({}),
    },
    metadata: {
      type: metadataSchema,
      default: () => ({
        isFavorite: false,
        isPublic: false,
      }),
    },
    tags: {
      type: [String],
      default: [],
    },
    version: {
      type: Number,
      default: 1,
    },
    enhancedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, strict: false } // Set strict: false to allow flexible schema
);

// אינדקסים לשיפור ביצועים
itinerarySchema.index({ userId: 1, createdAt: -1 });
itinerarySchema.index({ isPublic: 1, createdAt: -1 });
itinerarySchema.index({ destination: 1 });
itinerarySchema.index({ tags: 1 });

export default mongoose.models.itinerary ||
  mongoose.model("itinerary", itinerarySchema);
