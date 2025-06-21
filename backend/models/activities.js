import mongoose from "mongoose";

// Create a more flexible schema for activityData
const ActivityDataSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    rating: String,
    address: String,
    price: String,
    thumbnail: String,
    link: String,
    lat: Number,
    lng: Number,
  },
  { _id: false, strict: false }
); // Use strict: false to be more flexible with incoming data

const ActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    chatId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["hotel", "restaurant", "attraction"],
      required: true,
    },
    // Add explicit activity identifier fields to match existing DB indexes
    activityType: String,
    activityId: String,
    activityData: ActivityDataSchema,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Create compound index to ensure uniqueness of activity per user and chat
// First drop the old index
ActivitySchema.index(
  { userId: 1, chatId: 1, "activityData.id": 1 },
  { unique: false }
);
// Create a new compound index using the fields mentioned in the error message
ActivitySchema.index(
  { userId: 1, chatId: 1, activityType: 1, activityId: 1 },
  { unique: true }
);

// Pre-save hook to ensure lat/lng are properly converted to numbers
// And to populate the activityType and activityId fields from type and activityData.id
ActivitySchema.pre("save", function (next) {
  if (this.activityData) {
    // Convert lat/lng to numbers if they exist
    if (this.activityData.lat) {
      this.activityData.lat = Number(this.activityData.lat);
    }
    if (this.activityData.lng) {
      this.activityData.lng = Number(this.activityData.lng);
    }

    // Populate the activity identifier fields for the index
    this.activityType = this.type;
    this.activityId = this.activityData.id || "unknown";
  }
  next();
});

export default mongoose.models.Activity ||
  mongoose.model("Activity", ActivitySchema);
