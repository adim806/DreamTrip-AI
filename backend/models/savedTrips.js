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
  
  // Structured plan data (for better display)
  structuredPlan: {
    type: Object,
    default: {},
  },
  
  // Additional metadata
  metadata: {
    type: Object,
    default: {},
  },
  
  // Preview information
  preview: {
    type: Object,
    default: {},
  },
  
  // Activity counts
  activityCounts: {
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
  
  // Extract destination from content if it looks incorrect
  if (!this.destination || 
      this.destination === "Unknown destination" || 
      this.destination.includes("Imperial") || 
      this.destination.includes("Grandeur") ||
      this.destination.includes("Luxury") || 
      this.destination.includes("Experience")) {
    
    console.log("SavedTrip: Attempting to extract destination from content");
    
    // Try to extract destination from the content using multiple patterns
    if (this.plan) {
      const content = this.plan;
      const patterns = [
        /(?:יעד|destination):\s*([^\n]+)/i,
        /(?:מיקום|location):\s*([^\n]+)/i,
        /טיול ב([^\n]+)/i,
        /טיול ל([^\n]+)/i,
        /Trip to ([^\n]+)/i,
        /Exploring ([^\n]+)/i,
        /Experience in ([^\n]+)/i
      ];
      
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          const extractedDestination = match[1].trim()
            .replace(/\*\*/g, '') // Remove markdown bold
            .replace(/\*/g, '')   // Remove markdown italic
            .replace(/:$/, '')    // Remove trailing colon
            .trim();
          
          if (extractedDestination && extractedDestination !== "Unknown destination") {
            console.log(`SavedTrip: Extracted destination: "${extractedDestination}"`);
            this.destination = extractedDestination;
            
            // Also update in tripDetails and structuredPlan if they exist
            if (this.tripDetails) {
              this.tripDetails.destination = extractedDestination;
            }
            
            if (this.structuredPlan) {
              this.structuredPlan.destination = extractedDestination;
            }
            
            break;
          }
        }
      }
      
      // If still not found, try to extract from the title
      if (this.destination === "Unknown destination") {
        const titleMatch = content.match(/^#\s+.*?(?:in|at|to)\s+([A-Za-z\s,]+)(?::|\.|\n)/i);
        if (titleMatch && titleMatch[1]) {
          const extractedDestination = titleMatch[1].trim();
          console.log(`SavedTrip: Extracted destination from title: "${extractedDestination}"`);
          this.destination = extractedDestination;
          
          // Also update in tripDetails and structuredPlan if they exist
          if (this.tripDetails) {
            this.tripDetails.destination = extractedDestination;
          }
          
          if (this.structuredPlan) {
            this.structuredPlan.destination = extractedDestination;
          }
        }
      }
    }
  }
  
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
