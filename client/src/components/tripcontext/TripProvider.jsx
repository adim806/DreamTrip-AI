// src/contexts/TripContext.js
import React, { createContext, useState } from 'react';

export const TripContext = createContext();

export function TripProvider({ children }) {
  const [tripDetails, setTripDetails] = useState(null);
  const [allTripData, setallTripData] = useState(null);


  return (
    <TripContext.Provider value={{ tripDetails, setTripDetails,allTripData, setallTripData }}>
      {children}
    </TripContext.Provider>
  );
}
