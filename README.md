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

## Testing Documentation

This project includes comprehensive testing setup for both client and server sides using Jest for unit tests and Cypress for E2E tests.

### Client-side Testing

#### Unit Tests with Jest

The client-side unit tests use Jest with React Testing Library to test React components and utility functions.

To run client-side unit tests:

```bash
cd client
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

#### E2E Tests with Cypress

End-to-end tests use Cypress to test the full application flow including frontend and backend integration.

To run E2E tests:

```bash
cd client
npm run cypress:open    # Open Cypress test runner
npm run cypress:run     # Run Cypress tests headlessly
npm run e2e            # Run E2E tests in CI mode
```

### Backend Testing

The backend uses Jest with Supertest for API testing.

To run backend tests:

```bash
cd backend
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

### CI Integration

The project includes GitHub Actions workflows that run all tests on push and pull requests:

- Unit tests for client
- Unit tests for backend (with MongoDB service)
- E2E tests (running both client and backend servers)

## Test Structure

### Client Tests

- Unit tests: `client/src/__tests__/`
  - Component tests: `client/src/__tests__/components/`
  - Utility tests: `client/src/__tests__/utils/`

### E2E Tests

- Cypress tests: `client/cypress/e2e/`
- Cypress custom commands: `client/cypress/support/commands.js`

### Backend Tests

- API tests: `backend/__tests__/`
- Utility tests: `backend/__tests__/utils.test.js`

## Adding New Tests

### Adding Client Unit Tests

1. Create a new file in `client/src/__tests__/` with the naming pattern `*.test.jsx`
2. Import React Testing Library and Jest
3. Write your tests using the Jest syntax

### Adding E2E Tests

1. Create a new file in `client/cypress/e2e/` with the naming pattern `*.cy.js`
2. Use Cypress commands to interact with your application
3. Add custom commands in `client/cypress/support/commands.js` if needed

### Adding Backend Tests

1. Create a new file in `backend/__tests__/` with the naming pattern `*.test.js`
2. Import Supertest for API testing
3. Write your tests using the Jest syntax

## בדיקות מקיפות למערכת

פרויקט זה כולל מערך בדיקות מקיף עבור פונקציונליות מלאה בצד השרת והלקוח, הכולל הן בדיקות יחידה והן בדיקות End-to-End.

### בדיקות יחידה בצד השרת (Backend)

#### בדיקות רישום והתחברות משתמשים

- בדיקת תהליך רישום משתמש מלא (`user-registration.test.js`)
- בדיקת הצפנת סיסמאות באמצעות bcrypt
- בדיקת תקינות נתוני משתמש וטיפול בשגיאות
- בדיקת תהליך התחברות והנפקת טוקנים JWT (`user-auth.test.js`)
- בדיקת אימות הרשאות משתמשים

#### בדיקות מודל נתונים של טיול

- בדיקות CRUD מלאות למודל הטיול (`trip-model.test.js`)
- בדיקת תקינות שדות חובה בטיול
- בדיקת לוגיקה עסקית כגון חישוב משך טיול ואימות תאריכים
- בדיקת יחסים בין טיולים למשתמשים

#### בדיקות אינטגרציה מלאות לתכנון טיול

- בדיקת זרימת העבודה המלאה מתחילת תכנון ועד ליצירת טיול (`trip-planning-integration.test.js`)
- אינטגרציה בין שירותי מזג אוויר, מלונות ואטרקציות
- בדיקת טיפול בשגיאות במהלך תהליך תכנון הטיול

### בדיקות End-to-End (Cypress)

#### בדיקת תהליך תכנון טיול מקצה לקצה

- בדיקת תהליך תכנון טיול מלא כולל כל השלבים (`trip-planning.cy.js`):
  1. התחברות המשתמש
  2. בחירת יעד וזמן
  3. קבלת נתוני מזג אוויר
  4. בחירת מלון מתאים
  5. בחירת אטרקציות
  6. סיכום וביצוע הזמנה
- בדיקות טיפול בשגיאות ומצבי קיצון
- בדיקת מצבי טעינה וריענון נתונים

## איך להריץ את הבדיקות

### הרצת בדיקות שרת (Backend)

```bash
cd backend
npm test                     # הרצת כל הבדיקות
npm test -- user-auth.test.js  # הרצת קובץ בדיקה ספציפי
npm run test:coverage        # הרצת בדיקות עם דוח כיסוי
```

### הרצת בדיקות E2E

```bash
cd client
npm run cypress:open         # פתיחת ממשק Cypress
npm run cypress:run          # הרצת בדיקות Cypress ללא ממשק
npm run e2e                  # הרצת כל בדיקות ה-E2E במצב CI
```

## מבנה הבדיקות

```
backend/
  ├── __tests__/
  │   ├── user-registration.test.js  # בדיקות רישום משתמש
  │   ├── user-auth.test.js          # בדיקות אימות משתמש
  │   ├── trip-model.test.js         # בדיקות מודל טיול
  │   └── trip-planning-integration.test.js  # בדיקות אינטגרציה

client/
  ├── cypress/
  │   ├── e2e/
  │   │   ├── trip-planning.cy.js    # בדיקת זרימת תכנון טיול
  │   │   └── ...
  │   └── support/
  │       ├── commands.js             # פקודות מותאמות אישית
  │       └── ...
  └── src/
      └── __tests__/
          └── components/
              └── ...                 # בדיקות רכיבים
```
