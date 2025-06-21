import mongoose from "mongoose";

/**
 * Schema for saved trip plans
 * This model stores user-generated trip plans that have been explicitly saved by users
 */
const savedTripSchema = new mongoose.Schema({
  // User ID from authentication system (Clerk)
  userId: {
    type: String,
    required: true,
    index: true,
  },

  // Chat ID that this trip plan is associated with
  chatId: {
    type: String,
    required: true,
    index: true,
  },

  // Trip destination information
  destination: {
    type: String,
    required: true,
  },

  // Trip duration (e.g., "5 days")
  duration: {
    type: String,
    required: true,
  },

  // The full trip plan content (markdown format)
  plan: {
    type: String,
    required: true,
  },

  // Original itinerary data that was used to generate the plan
  itineraryData: {
    type: Object,
    default: {},
  },

  // Trip details and metadata
  tripDetails: {
    type: Object,
    default: {},
  },

  // Creation and update timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },

  // Last time the trip was viewed
  lastViewedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp on save
savedTripSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find trips by user ID
savedTripSchema.statics.findByUserId = function (userId) {
  return this.find({ userId }).sort({ updatedAt: -1 });
};

// Static method to find a trip by chat ID and user ID
savedTripSchema.statics.findByChatId = function (chatId, userId) {
  return this.findOne({ chatId, userId });
};

// Create the model
const SavedTrip =
  mongoose.models.SavedTrip || mongoose.model("SavedTrip", savedTripSchema);

export default SavedTrip;
