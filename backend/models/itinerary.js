import mongoose from "mongoose";

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
      from: {
        type: String,
        required: false,
      },
      to: {
        type: String,
        required: false,
      },
    },
    rawContent: {
      type: String,
      required: true,
    },
    structuredContent: {
      title: String,
      destination: String,
      duration: String,
      dates: {
        from: String,
        to: String,
      },
      days: [
        {
          dayNumber: Number,
          title: String,
          date: String,
          activities: {
            morning: [String],
            lunch: [String],
            afternoon: [String],
            evening: [String],
            dinner: [String],
          },
          transportation: [String],
          notes: [String],
        },
      ],
      additionalInfo: {
        backupPlans: [String],
        tips: [String],
        hiddenGems: [String],
      },
    },
    metadata: {
      type: Object,
      default: {},
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    tags: [String],
    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

// אינדקסים לשיפור ביצועים
itinerarySchema.index({ userId: 1, createdAt: -1 });
itinerarySchema.index({ isPublic: 1, createdAt: -1 });

export default mongoose.models.itinerary ||
  mongoose.model("itinerary", itinerarySchema);
