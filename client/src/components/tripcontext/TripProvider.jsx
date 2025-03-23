// src/contexts/TripContext.js
import React, { createContext, useState } from 'react';

export const TripContext = createContext();

export function TripProvider({ children }) {
  const [tripDetails, setTripDetails] = useState(null);
  const [allTripData, setallTripData] = useState(null);
  // נתונים לכל קטגוריה
  const [hotelsData, setHotelsData] = useState(null);
  const [restaurantsData, setRestaurantsData] = useState(null);
  const [attractionsData, setAttractionsData] = useState(null);
  const [customRouteData, setCustomRouteData] = useState(null);

  // ניהול השכבה הפעילה במפה ותפריט ברירת מחדל
  const [activeLayer, setActiveLayer] = useState(null);
  const [defaultTab, setDefaultTab] = useState("generalInfo"); // ברירת מחדל ל"תיאור כללי"

  // משתנה לניהול המלון הנבחר
  const [selectedHotel, setSelectedHotel] = useState(null);

  return (
    <TripContext.Provider
      value={{
        tripDetails,
        setTripDetails,
        allTripData,
        setallTripData,
        hotelsData,
        setHotelsData,
        restaurantsData,
        setRestaurantsData,
        attractionsData,
        setAttractionsData,
        customRouteData,
        setCustomRouteData,
        activeLayer,
        setActiveLayer,
        defaultTab,
        setDefaultTab,
        selectedHotel,
        setSelectedHotel,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}
