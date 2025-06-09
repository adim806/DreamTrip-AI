// שירות חיפוש מלונות
const hotelService = {
  searchHotels: async (city, country, budget = "בינוני") => {
    try {
      // הערה: בקוד אמיתי יהיה כאן API call לשירות מלונות
      // כרגע נחזיר נתונים לדוגמה לצורך הבדיקות

      // התאמה של רמת התקציב למספר כוכבים ולטווח מחירים
      let minStars = 3;
      let maxStars = 4;
      let minPrice = 400;
      let maxPrice = 800;

      if (budget === "נמוך") {
        minStars = 1;
        maxStars = 3;
        minPrice = 150;
        maxPrice = 400;
      } else if (budget === "גבוה") {
        minStars = 4;
        maxStars = 5;
        minPrice = 800;
        maxPrice = 2500;
      }

      // רשימת מלונות לדוגמה
      const sampleHotels = [
        {
          id: "hotel1",
          name: "מלון פאר",
          stars: 5,
          price: 1200,
          image: "https://example.com/hotel1.jpg",
          address: `רחוב ראשי 123, ${city}`,
          rating: 4.8,
          amenities: ["בריכה", "חדר כושר", "ספא", "חדרי ישיבות", "מסעדת יוקרה"],
        },
        {
          id: "hotel2",
          name: "מלון מרכז העיר",
          stars: 4,
          price: 700,
          image: "https://example.com/hotel2.jpg",
          address: `שדרות מרכזיות 45, ${city}`,
          rating: 4.5,
          amenities: ["חדר כושר", "חנייה", "ארוחת בוקר"],
        },
        {
          id: "hotel3",
          name: "מלון תיירים",
          stars: 3,
          price: 350,
          image: "https://example.com/hotel3.jpg",
          address: `רחוב האזור התיירי 78, ${city}`,
          rating: 3.8,
          amenities: ["אינטרנט חופשי", "ארוחת בוקר"],
        },
        {
          id: "hotel4",
          name: "אכסנית צעירים",
          stars: 2,
          price: 150,
          image: "https://example.com/hotel4.jpg",
          address: `רחוב הרכבת 21, ${city}`,
          rating: 3.5,
          amenities: ["אינטרנט חופשי", "מטבח משותף"],
        },
      ];

      // סינון לפי רמת תקציב
      const filteredHotels = sampleHotels.filter(
        (hotel) =>
          hotel.stars >= minStars &&
          hotel.stars <= maxStars &&
          hotel.price >= minPrice &&
          hotel.price <= maxPrice
      );

      return { hotels: filteredHotels };
    } catch (error) {
      console.error("Error searching hotels:", error);
      throw new Error("Failed to fetch hotels data");
    }
  },
};

export default hotelService;
