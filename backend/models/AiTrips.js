import mongoose from "mongoose";

const AiTripsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  tripData: {
    hotels: [
      {
        Hotelname: String,
        address: String,
        price: String,
        image_url: String,
        geo_coordinates: String,
        rating: Number,
        description: String,
      },
    ],
    itinerary: [
      {
        day: Number,
        title: String,
        plan: [
          {
            time: String,
            place: String,
            details: String,
            image_url: String,
            geo_coordinates: String,
            ticket_pricing: String,
            rating: Number,
            time_to_spend: String,
          },
        ],
      },
    ],
  },
});

export default mongoose.models.Aitrips ||
  mongoose.model("Aitrips", AiTripsSchema);
