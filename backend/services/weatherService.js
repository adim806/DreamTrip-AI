// שירות מזג אוויר
const weatherService = {
  getWeatherForecast: async (city, country, date) => {
    try {
      // הערה: בקוד אמיתי יהיה כאן API call לשירות מזג אוויר
      // כרגע נחזיר נתונים לדוגמה לצורך הבדיקות

      const today = new Date();
      const forecastDate = date ? new Date(date) : today;

      // מערך נתוני מזג אוויר לדוגמה
      const forecast = [];

      // יצירת 7 ימים של תחזית
      for (let i = 0; i < 7; i++) {
        const forecastDay = new Date(forecastDate);
        forecastDay.setDate(forecastDay.getDate() + i);

        // טמפרטורה רנדומלית בין 15-30 מעלות צלזיוס
        const temp = Math.floor(Math.random() * 15) + 15;

        // מצבי מזג אוויר אפשריים
        const conditions = ["שמש", "שמש חלקי", "מעונן", "גשם קל", "גשם"];
        const conditionIndex = Math.floor(Math.random() * conditions.length);

        forecast.push({
          date: forecastDay.toISOString().split("T")[0], // רק תאריך ללא שעה
          temp: temp,
          condition: conditions[conditionIndex],
          // אייקונים לדוגמה
          icon: ["sun", "partly-cloudy", "cloudy", "rain-light", "rain"][
            conditionIndex
          ],
        });
      }

      return { forecast };
    } catch (error) {
      console.error("Error getting weather forecast:", error);
      throw new Error("Failed to fetch weather data");
    }
  },
};

export default weatherService;
