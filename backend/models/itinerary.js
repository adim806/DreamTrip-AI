import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// Schema for activities within a day
const ActivitySchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['attraction', 'restaurant', 'hotel', 'transportation', 'other'],
    default: 'other'
  },
  location: { type: String },
  time: { type: String },
  duration: { type: String },
  cost: { type: String },
  notes: { type: String }
});

// Schema for time blocks (morning, afternoon, evening, etc.)
const TimeBlockSchema = new Schema({
  morning: [ActivitySchema],
  lunch: [ActivitySchema],
  afternoon: [ActivitySchema],
  dinner: [ActivitySchema],
  evening: [ActivitySchema]
});

// Schema for a single day in the itinerary
const DaySchema = new Schema({
  dayNumber: { type: Number, required: true },
  title: { type: String },
  date: { type: Date },
  summary: { type: String },
  activities: TimeBlockSchema,
  accommodation: {
    name: { type: String },
    address: { type: String },
    notes: { type: String }
  }
});

// Schema for additional information
const AdditionalInfoSchema = new Schema({
  tips: [String],
  warnings: [String],
  budgetNotes: [String],
  packingList: [String],
  localCustoms: [String],
  emergencyContacts: [String]
});

// Main Itinerary Schema
const ItinerarySchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  destination: {
    type: String, 
    required: true,
    index: true
  },
  duration: {
    type: String,
    required: true
  },
  dates: {
    from: { type: Date },
    to: { type: Date }
  },
  budget: {
    amount: { type: String },
    currency: { type: String, default: 'USD' },
    level: { type: String, enum: ['budget', 'moderate', 'luxury'] }
  },
  travelStyle: {
    type: String,
    enum: ['family', 'romantic', 'adventure', 'cultural', 'relaxation', 'business', 'solo', 'other'],
    default: 'other'
  },
  summary: {
    type: String
  },
  days: [DaySchema],
  additionalInfo: AdditionalInfoSchema,
  highlights: [String],
  travelMethods: [String],
  image: {
    type: String
  },
  rawContent: {
    type: String
  },
  processedContent: {
    type: String
  },
  chatId: {
    type: String,
    index: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  },
  activityCounts: {
    total: { type: Number, default: 0 },
    attractions: { type: Number, default: 0 },
    restaurants: { type: Number, default: 0 },
    hotels: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  type: {
    type: String,
    enum: ['itinerary', 'saved_trip', 'ai_generated'],
    default: 'itinerary'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Methods to easily extract important information
ItinerarySchema.methods.getDestination = function() {
  return this.destination;
};

ItinerarySchema.methods.getDuration = function() {
  return this.duration;
};

ItinerarySchema.methods.getDayCount = function() {
  return this.days.length;
};

// Calculate activity counts before saving
ItinerarySchema.pre('save', function(next) {
  let totalActivities = 0;
  let attractions = 0;
  let restaurants = 0;
  let hotels = 0;

  if (this.days && this.days.length > 0) {
    this.days.forEach(day => {
      if (day.activities) {
        // Count activities in each time block
        Object.values(day.activities).forEach(timeBlock => {
          if (Array.isArray(timeBlock)) {
            timeBlock.forEach(activity => {
              totalActivities++;
              if (activity.type === 'attraction') attractions++;
              if (activity.type === 'restaurant') restaurants++;
              if (activity.type === 'hotel') hotels++;
            });
          }
        });
      }
      
      // Count accommodation
      if (day.accommodation && day.accommodation.name) {
        totalActivities++;
        hotels++;
      }
    });
  }

  this.activityCounts = {
    total: totalActivities,
    attractions,
    restaurants,
    hotels
  };

  next();
});

// Static method to create a structured itinerary from raw content
ItinerarySchema.statics.createFromRawContent = function(userId, rawContent, options = {}) {
  // This would contain logic to parse the raw content and create a structured itinerary
  // For now it's a placeholder - the actual implementation would depend on your parsing logic
  
  const extractDestination = (content) => {
    const destinationMatch = content.match(/(?:יעד|destination):\s*([^\n]+)/i);
    return destinationMatch ? destinationMatch[1].trim() : "Unknown destination";
  };
  
  const extractDuration = (content) => {
    const durationMatch = content.match(/(?:משך|duration):\s*([^\n]+)/i) || 
                         content.match(/(\d+)\s+(?:ימים|days)/i);
    return durationMatch ? durationMatch[1].trim() : "Unknown duration";
  };
  
  // Create a basic structured itinerary with minimal information
  return {
    userId,
    rawContent,
    title: options.title || 'New Itinerary',
    destination: options.destination || extractDestination(rawContent),
    duration: options.duration || extractDuration(rawContent),
    days: [],  // Would be populated by a more sophisticated parsing function
    additionalInfo: {
      tips: [],
      warnings: [],
      budgetNotes: [],
      packingList: [],
      localCustoms: [],
      emergencyContacts: []
    },
    highlights: [],
    type: 'itinerary',
    chatId: options.chatId || null
  };
};

const ItineraryModel = mongoose.model('Itinerary', ItinerarySchema);
export default ItineraryModel;
