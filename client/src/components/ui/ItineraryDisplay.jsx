import React, { useContext, useState } from "react";
import { motion } from "framer-motion";
import { TripContext } from "../tripcontext/TripProvider";
import Markdown from "react-markdown";

/**
 * ItineraryDisplay component shows the generated trip itinerary with editing options
 *
 * Features:
 * - Displays trip details and full itinerary
 * - Provides options to edit or make changes to the itinerary
 * - Button to view full trip details in a more structured view
 * - Support for dynamic itinerary updates
 *
 * NOTE: This component is NOT meant to be displayed in the chat flow
 * It is for a dedicated section/view for examining the complete itinerary
 */
const ItineraryDisplay = ({ inChatView = false }) => {
  const {
    allTripData,
    tripDetails,
    conversationState,
    CONVERSATION_STATES,
    transitionState,
  } = useContext(TripContext);

  const [isExpanded, setIsExpanded] = useState(false);

  // If this component is being used in the chat view, don't render it
  // The itinerary should be displayed as a regular message in the chat flow instead
  if (inChatView) {
    return null;
  }

  // Don't render if no itinerary data or not in the right state
  if (
    !allTripData ||
    !allTripData.itinerary ||
    (conversationState !== CONVERSATION_STATES.DISPLAYING_ITINERARY &&
      conversationState !== CONVERSATION_STATES.EDITING_ITINERARY)
  ) {
    return null;
  }

  // Get the destination and dates for the header
  const destination = tripDetails?.vacation_location || "Your Destination";
  const dateRange = tripDetails?.dates
    ? `${tripDetails.dates.from} to ${tripDetails.dates.to}`
    : "Your Travel Dates";

  const handleViewFullTrip = () => {
    // Logic to navigate to the full trip view would go here
    console.log("Navigate to full trip view");
    // This could open a different tab in the UI or navigate to a different route
  };

  const handleEditItinerary = () => {
    transitionState(CONVERSATION_STATES.EDITING_ITINERARY);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`itinerary-container bg-[#2a3146] border border-blue-500/20 rounded-xl p-4 my-4 text-white ${
        isExpanded ? "max-w-[95%]" : "max-w-[90%]"
      } self-start`}
    >
      <div className="itinerary-header mb-3 border-b border-blue-400/20 pb-2">
        <h3 className="text-lg font-medium text-blue-300">
          Travel Itinerary for {destination}
        </h3>
        <p className="text-sm text-gray-300">{dateRange}</p>
      </div>

      <div
        className={`itinerary-content text-sm ${
          isExpanded ? "" : "max-h-[400px] overflow-y-auto"
        }`}
      >
        <Markdown className="prose prose-invert prose-sm max-w-none">
          {allTripData.itinerary}
        </Markdown>
      </div>

      <div className="action-buttons flex justify-between mt-4 pt-2 border-t border-blue-400/20">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn-toggle px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
        >
          {isExpanded ? "Collapse" : "Expand"}
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleEditItinerary}
            className="btn-edit px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-white text-sm transition-colors"
          >
            Edit Itinerary
          </button>

          <button
            onClick={handleViewFullTrip}
            className="btn-view-trip px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors"
          >
            View Trip Details
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ItineraryDisplay;
