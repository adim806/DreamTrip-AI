import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RiCalendarLine,
  RiMapPin2Line,
  RiInformationLine,
  RiDownload2Line,
  RiShare2Line,
  RiPrinterLine,
  RiCloseLine,
} from "react-icons/ri";
import ReactMarkdown from "react-markdown";
import tripPlanService from "@/utils/services/tripPlanService";

/**
 * Component for displaying the AI-generated trip plan based on user's selected activities
 */
const TripPlannerResult = ({ plan, tripDetails, onClose }) => {
  const [expandedDay, setExpandedDay] = useState(null);

  // If no plan is provided, try to load from storage
  useEffect(() => {
    if (!plan && tripDetails?.chatId) {
      const storedPlan = tripPlanService.getStoredPlan(tripDetails.chatId);
      if (storedPlan && storedPlan.plan) {
        // If we found a stored plan, we could update the parent component 
        // (This would require a callback prop like onPlanLoaded)
        console.log("Found stored trip plan", storedPlan);
      }
    }
  }, [plan, tripDetails]);

  const handleToggleDay = (dayNum) => {
    if (expandedDay === dayNum) {
      setExpandedDay(null);
    } else {
      setExpandedDay(dayNum);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // No plan to display
  if (!plan) {
    return (
      <div className="trip-plan-result empty-state">
        <div className="empty-state-content">
          <div className="icon">📝</div>
          <h3>No Trip Plan Generated Yet</h3>
          <p>Use the &quot;Generate Trip Plan&quot; button after arranging your activities to create a personalized itinerary.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trip-plan-result">
      <div className="trip-plan-header">
        <div className="trip-plan-title">
          <h2>Your Personalized Trip Plan</h2>
          <div className="trip-plan-destination">
            <RiMapPin2Line /> {tripDetails?.destination || "Your Destination"}
          </div>
        </div>
        
        <div className="trip-plan-actions">
          <button 
            className="trip-plan-action-button" 
            onClick={handlePrint}
            title="Print trip plan"
          >
            <RiPrinterLine />
          </button>
          <button 
            className="trip-plan-action-button" 
            onClick={onClose}
            title="Close trip plan"
          >
            <RiCloseLine />
          </button>
        </div>
      </div>
      
      <div className="trip-plan-content">
        <div className="markdown-container">
          <ReactMarkdown>{plan}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default TripPlannerResult; 