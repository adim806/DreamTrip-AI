// שירות אטרקציות תיירותיות
const attractionService = {
  getAttractions: async (city, country, interests = []) => {
    try {
      // הערה: בקוד אמיתי יהיה כאן API call לשירות אטרקציות
      // כרגע נחזיר נתונים לדוגמה לצורך הבדיקות

      // רשימת אטרקציות לדוגמה
      const allAttractions = [
        {
          id: "attr1",
          name: "מוזיאון העיר",
          type: "תרבות",
          price: "50₪",
          image: "https://example.com/museum.jpg",
          description: "מוזיאון המציג את ההיסטוריה של העיר והתרבות המקומית",
          duration: "שעתיים",
        },
        {
          id: "attr2",
          name: "גן החיות",
          type: "משפחות",
          price: "80₪",
          image: "https://example.com/zoo.jpg",
          description: "גן חיות עם מגוון רחב של בעלי חיים מרחבי העולם",
          duration: "4 שעות",
        },
        {
          id: "attr3",
          name: "פארק מים",
          type: "פעילות",
          price: "120₪",
          image: "https://example.com/waterpark.jpg",
          description: "פארק מים עם מגלשות ובריכות לכל הגילאים",
          duration: "יום שלם",
        },
        {
          id: "attr4",
          name: "מסלול טיול בטבע",
          type: "טבע",
          price: "חינם",
          image: "https://example.com/hike.jpg",
          description: "מסלול טיול בנוף מרהיב עם תצפיות על העיר",
          duration: "3 שעות",
        },
        {
          id: "attr5",
          name: "שוק מקומי",
          type: "קניות",
          price: "כניסה חינם",
          image: "https://example.com/market.jpg",
          description: "שוק מקומי עם מגוון תוצרת מקומית, מזון ומזכרות",
          duration: "שעה-שעתיים",
        },
        {
          id: "attr6",
          name: "מופע מוזיקלי",
          type: "בידור",
          price: "150₪",
          image: "https://example.com/show.jpg",
          description: "מופע מוזיקלי עם אמנים מקומיים",
          duration: "שעתיים",
        },
      ];

      // קטגוריות של אטרקציות
      const categories = {
        משפחות: ["גן החיות", "פארק מים", "שוק מקומי"],
        תרבות: ["מוזיאון העיר", "מופע מוזיקלי"],
        טבע: ["מסלול טיול בטבע"],
        קניות: ["שוק מקומי"],
        אוכל: ["שוק מקומי"],
        אקסטרים: [],
      };

      // אם יש תחומי עניין מוגדרים, נסנן את האטרקציות
      if (interests && interests.length > 0) {
        // מיפוי של כל האטרקציות שבקטגוריות הנבחרות
        const relevantAttractionsNames = new Set();

        interests.forEach((interest) => {
          if (categories[interest]) {
            categories[interest].forEach((attrName) => {
              relevantAttractionsNames.add(attrName);
            });
          }
        });

        // סינון האטרקציות לפי השמות שנאספו
        const filteredAttractions = allAttractions.filter((attr) =>
          relevantAttractionsNames.has(attr.name)
        );

        // אם נמצאו אטרקציות מתאימות, נחזיר אותן. אחרת, נחזיר את כל האטרקציות
        return {
          attractions:
            filteredAttractions.length > 0
              ? filteredAttractions
              : allAttractions,
        };
      }

      // אם אין תחומי עניין, נחזיר את כל האטרקציות
      return { attractions: allAttractions };
    } catch (error) {
      console.error("Error getting attractions:", error);
      throw new Error("Failed to fetch attractions data");
    }
  },
};

export default attractionService;
