import mongoose from "mongoose";

// סכימת נתונים עבור מלון
const hotelSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    stars: Number,
    price: Number,
    image: String,
    address: String,
    rating: Number,
    amenities: [String],
  },
  { _id: false }
);

// סכימת נתונים עבור אטרקציה
const attractionSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    type: String,
    price: String,
    image: String,
    description: String,
    duration: String,
  },
  { _id: false }
);

// סכימת נתוני מזג אוויר
const weatherSchema = new mongoose.Schema(
  {
    date: Date,
    temperature: Number,
    condition: String,
    icon: String,
  },
  { _id: false }
);

// סכימה מרכזית לטיול
const tripSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  destination: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  budget: {
    type: String,
    enum: ["נמוך", "בינוני", "גבוה"],
    default: "בינוני",
  },
  travelers: {
    type: Number,
    default: 1,
  },
  interests: {
    type: [String],
    default: [],
  },
  hotel: hotelSchema,
  attractions: [attractionSchema],
  weather: [weatherSchema],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// חישוב משך הטיול בימים
tripSchema.methods.calculateDuration = function () {
  if (!this.startDate || !this.endDate) return 0;
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// אימות שתאריך הסיום אחרי תאריך ההתחלה
tripSchema.pre("validate", function (next) {
  if (
    this.startDate &&
    this.endDate &&
    new Date(this.endDate) <= new Date(this.startDate)
  ) {
    this.invalidate("endDate", "End date must be after start date");
  }
  next();
});

// עדכון זמן עדכון אחרון
tripSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// מתודה סטטית למציאת טיולים לפי מזהה משתמש
tripSchema.statics.findByUserId = function (userId) {
  return this.find({ userId }).sort({ startDate: -1 });
};

const Trip = mongoose.model("Trip", tripSchema);

export default Trip;
