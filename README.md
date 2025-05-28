# DreamTrip-AI

An AI-powered travel planning application that helps you plan, organize, and share your dream vacations.

## Configuration

To run this application, you'll need to set up your environment variables:

1. Copy `.env.example` to `.env` in both the root and client directories
2. Fill in the required API keys:
   - `VITE_GEMINI_PUBLIC_KEY` - From [Google AI Studio](https://ai.google.dev/)
   - `VITE_OPENWEATHER_API_KEY` - From [OpenWeatherMap](https://openweathermap.org/api)
   - `VITE_GOOGLE_PLACES_API_KEY` - From [Google Cloud Console](https://console.cloud.google.com/) (enable Places API)
   - `GOOGLE_PLACES_API_KEY` - Add this to your backend .env file (same key as above)
   - Other keys as needed for additional services

## External Services

The application integrates with the following external APIs:

- **Google Gemini API**: Powers the AI chat interface
- **OpenWeatherMap API**: Provides weather data for locations
- **Google Places API**: Finds hotels and attractions
  - Note: The Google Places API requires a proxy server due to CORS restrictions
  - Our backend provides a `/api/places/search` endpoint to handle these requests
- **ImageKit**: For image handling and optimization

## Google Places API Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Places API" from the API Library
4. Create API credentials
5. Add the API key to both:
   - Frontend .env file as `VITE_GOOGLE_PLACES_API_KEY`
   - Backend .env file as `GOOGLE_PLACES_API_KEY`

## Running the Application

### Development

1. Install dependencies:

```bash
npm install
cd client && npm install
```

2. Start the backend:

```bash
npm run server
```

3. In another terminal, start the frontend:

```bash
cd client && npm run dev
```

### Production

```bash
npm run build
npm start
```

## Features

- AI-powered travel assistant
- Weather information for destinations
- Hotel recommendations
- Multi-day trip planning
- Itinerary generation
- Real-time data integration

## התקנה

1. קלונו את המאגר
2. התקינו את הספריות הנדרשות:

```bash
cd client
npm install
```

3. הגדירו את קובץ הסביבה:

```bash
cp .env.example .env
```

4. עדכנו את קובץ הסביבה `.env` עם הערכים הדרושים, כולל מפתח Gemini API:

```
# Base API URL
VITE_API_URL=http://localhost:3000

# ImageKit configuration
VITE_IMAGEKIT_URL_ENDPOINT="your-endpoint"
VITE_IMAGEKIT_PUBLIC_KEY="your-public-key"

# Google Generative AI API Key for Gemini model
VITE_GEMINI_API_KEY="your-gemini-api-key"
```

5. הריצו את הפרויקט:

```bash
npm run dev
```

## תיעוד

### עדכון מערכת RAG

המערכת עכשיו משתמשת במודל Gemini נפרד לעיבוד נתונים חיצוניים כדי לאפשר תשובות טבעיות יותר וביצועים משופרים. המודל הממוקד מתמחה בעיבוד מידע מובנה (כמו מלונות, מזג אוויר) והפיכתו לטקסט טבעי בפורמט אחיד ומונגש.

כדי להשתמש במודל:

1. קבלו מפתח API של Google AI (Gemini API)
2. הוסיפו את המפתח לקובץ הסביבה כמתואר למעלה
3. המערכת תשתמש במודל ה-RAG המיוחד באופן אוטומטי לעיבוד מידע חיצוני
