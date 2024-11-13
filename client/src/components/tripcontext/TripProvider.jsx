// src/contexts/TripContext.js
import React, { createContext, useState } from 'react';

export const TripContext = createContext();

export function TripProvider({ children }) {
  const [tripDetails, setTripDetails] = useState(null);

  return (
    <TripContext.Provider value={{ tripDetails, setTripDetails }}>
      {children}
    </TripContext.Provider>
  );
}
