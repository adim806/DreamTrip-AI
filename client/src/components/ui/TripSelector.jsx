import React, { useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TripContext } from '../tripcontext/TripProvider';

/**
 * TripSelector component for managing multiple trips within a single chat
 * - Shows a list of active trips being planned or completed
 * - Allows user to switch between trips
 * - Provides option to start a new trip
 * 
 * Note: This component will only display when there are completed trips with itineraries.
 * Draft trips (in progress or cancelled) will not trigger this component to display.
 */
const TripSelector = () => {
  const { 
    tripDrafts, 
    completedTrips, 
    startNewTrip, 
    switchToTrip,
    activeItineraryIndex,
    conversationState,
    CONVERSATION_STATES
  } = useContext(TripContext);

  // Only render if there are completed trips to display
  // This ensures this component only appears after full itinerary generation
  if (completedTrips.length === 0) {
    return null;
  }

  // Get the status of the current conversation
  const isShowingItinerary = conversationState === CONVERSATION_STATES.DISPLAYING_ITINERARY;
  const isGeneratingItinerary = conversationState === CONVERSATION_STATES.GENERATING_ITINERARY;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="trip-selector bg-[#212532] border border-blue-500/10 rounded-lg p-2 m-2 text-white text-sm"
    >
      <div className="selector-header mb-2 pb-1 border-b border-gray-700">
        <h3 className="text-gray-300 text-xs font-medium">Your Trips</h3>
      </div>
      
      <div className="trips-list flex gap-2 overflow-x-auto pb-1">
        <AnimatePresence>
          {/* In-Progress Trips - Only show if they're not canceled/empty */}
          {tripDrafts.map((trip, index) => (
            <motion.button
              key={`draft-${trip.id || index}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => switchToTrip(index)}
              className={`trip-item min-w-[100px] px-2 py-1 rounded text-left truncate ${
                activeItineraryIndex === index 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              <div className="trip-title truncate font-medium">
                {trip.vacation_location || "Untitled Trip"}
              </div>
              <div className="trip-subtitle text-xs truncate opacity-70">
                {trip.duration ? `${trip.duration} days` : "Planning"}
              </div>
            </motion.button>
          ))}
          
          {/* Completed Trips with Itineraries */}
          {completedTrips.map((trip, index) => (
            <motion.button
              key={`completed-${index}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => switchToTrip(tripDrafts.length + index)}
              className={`trip-item-complete min-w-[100px] px-2 py-1 rounded text-left truncate ${
                activeItineraryIndex === tripDrafts.length + index 
                  ? 'bg-green-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              <div className="trip-title truncate font-medium">
                {trip.tripDetails?.vacation_location || "Completed Trip"}
              </div>
              <div className="trip-subtitle text-xs truncate opacity-70">
                {trip.tripDetails?.duration ? `${trip.tripDetails.duration} days` : "Itinerary Ready"}
              </div>
            </motion.button>
          ))}
          
          {/* New Trip Button - Only show if displaying an itinerary or at least one trip exists */}
          {(isShowingItinerary || completedTrips.length > 0) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={startNewTrip}
              className="new-trip-btn min-w-[42px] px-2 py-1 rounded text-center bg-blue-500/30 hover:bg-blue-500/50 text-blue-300"
              aria-label="Start a new trip"
            >
              <span className="text-lg">+</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TripSelector; 