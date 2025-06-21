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
  RiSaveLine,
  RiCheckLine,
  RiLoader4Line,
  RiBookmarkLine,
  RiMapLine,
  RiArrowRightLine,
} from "react-icons/ri";
import ReactMarkdown from "react-markdown";
import tripPlanService from "@/utils/services/tripPlanService";

/**
 * Component for displaying the AI-generated trip plan based on user's selected activities
 */
const TripPlannerResult = ({ plan, tripDetails, onClose }) => {
  const [expandedDay, setExpandedDay] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

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
    
    // Check if this plan is already saved
    if (tripDetails?.chatId) {
      tripPlanService.isPlanned(tripDetails.chatId).then(saved => {
        setIsSaved(saved);
      });
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
  
  const handleSaveTrip = async () => {
    if (!plan || !tripDetails?.chatId) return;
    
    setIsSaving(true);
    
    try {
      // Save the trip plan to MY TRIPS
      await tripPlanService.saveToMyTrips({
        plan,
        destination: tripDetails.destination,
        duration: tripDetails.duration,
        chatId: tripDetails.chatId
      });
      
      // Show success state
      setIsSaved(true);
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-4 left-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center transition-all duration-500 transform translate-y-20';
      notification.innerHTML = `
        <div class="mr-3 bg-white/20 rounded-full p-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <div>
          <p class="font-bold">Trip Saved Successfully!</p>
          <p class="text-sm">You can find it in MY TRIPS section</p>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Animate in
      setTimeout(() => {
        notification.style.transform = 'translateY(0)';
      }, 10);
      
      // Animate out after 4 seconds
      setTimeout(() => {
        notification.style.transform = 'translateY(20rem)';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 500);
      }, 4000);
      
    } catch (error) {
      console.error("Error saving trip plan:", error);
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-4 left-4 bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center transition-all duration-500 transform translate-y-20';
      notification.innerHTML = `
        <div class="mr-3 bg-white/20 rounded-full p-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <div>
          <p class="font-bold">Failed to Save Trip</p>
          <p class="text-sm">Please try again later</p>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Animate in
      setTimeout(() => {
        notification.style.transform = 'translateY(0)';
      }, 10);
      
      // Animate out after 4 seconds
      setTimeout(() => {
        notification.style.transform = 'translateY(20rem)';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 500);
      }, 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Extract days from markdown content
  const extractDays = () => {
    if (!plan) return [];
    
    const dayRegex = /## Day (\d+)/g;
    const days = [];
    let match;
    
    while ((match = dayRegex.exec(plan)) !== null) {
      days.push({
        dayNumber: parseInt(match[1]),
        position: match.index
      });
    }
    
    return days;
  };

  // No plan to display
  if (!plan) {
    return (
      <div className="trip-plan-result empty-state p-8 text-center bg-gray-900/50 rounded-xl border border-blue-900/50">
        <div className="empty-state-content flex flex-col items-center">
          <div className="icon text-6xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-blue-200 mb-2">No Trip Plan Generated Yet</h3>
          <p className="text-blue-100 opacity-80 max-w-md mx-auto">Use the &quot;Generate Trip Plan&quot; button after arranging your activities to create a personalized itinerary.</p>
        </div>
      </div>
    );
  }

  const days = extractDays();

  return (
    <motion.div 
      className="trip-plan-result bg-gradient-to-b from-gray-900/80 to-gray-800/90 rounded-2xl border border-blue-900/30 overflow-hidden shadow-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="trip-plan-header bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-blue-900/80 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="trip-plan-title">
          <motion.h2 
            className="text-2xl font-bold text-white mb-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Your Personalized Trip Itinerary
          </motion.h2>
          <motion.div 
            className="trip-plan-destination flex items-center text-blue-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <RiMapPin2Line className="mr-1" /> 
            <span className="font-medium">{tripDetails?.destination || "Your Destination"}</span>
            <span className="mx-2">•</span>
            <RiCalendarLine className="mr-1" />
            <span>{tripDetails?.duration || "Trip Duration"}</span>
          </motion.div>
        </div>
        
        <motion.div 
          className="trip-plan-actions flex space-x-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <button 
            className={`trip-plan-action-button flex items-center px-5 py-2 rounded-lg transition-all shadow-lg ${
              isSaved 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
            }`}
            onClick={handleSaveTrip}
            disabled={isSaving || isSaved}
            title={isSaved ? "Trip saved" : "Save trip to MY TRIPS"}
          >
            {isSaving ? (
              <>
                <RiLoader4Line className="mr-2 animate-spin" />
                Saving...
              </>
            ) : isSaved ? (
              <>
                <RiCheckLine className="mr-2" />
                Saved
              </>
            ) : (
              <>
                <RiBookmarkLine className="mr-2" />
                Save Trip
              </>
            )}
          </button>
          
          <button 
            className="trip-plan-action-button flex items-center px-3 py-2 bg-gray-700/80 hover:bg-gray-600 text-white rounded-lg transition-all"
            onClick={handlePrint}
            title="Print trip plan"
          >
            <RiPrinterLine className="mr-1" />
            <span className="hidden sm:inline">Print</span>
          </button>
          
          <button 
            className="trip-plan-action-button flex items-center px-3 py-2 bg-gray-700/80 hover:bg-gray-600 text-white rounded-lg transition-all"
            onClick={onClose}
            title="Close trip plan"
          >
            <RiCloseLine className="mr-1" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </motion.div>
      </div>

      {days.length > 0 && (
        <div className="trip-plan-navigation px-6 pt-4 pb-2 bg-gray-800/50 border-b border-blue-900/20 overflow-x-auto">
          <div className="flex space-x-2">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'overview' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            
            {days.map((day) => (
              <button
                key={day.dayNumber}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === `day${day.dayNumber}` 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                }`}
                onClick={() => setActiveTab(`day${day.dayNumber}`)}
              >
                Day {day.dayNumber}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <motion.div 
        className="trip-plan-content p-6 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        style={{ maxHeight: "calc(100vh - 300px)" }}
      >
        <div className="markdown-container prose prose-invert max-w-none prose-headings:text-blue-200 prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-a:text-blue-400 prose-strong:text-blue-300 prose-ul:my-2 prose-li:my-0.5 prose-hr:border-blue-900/30">
          <ReactMarkdown>{plan}</ReactMarkdown>
        </div>
      </motion.div>

      <motion.div 
        className="trip-plan-footer p-4 bg-gray-900/70 border-t border-blue-900/20 flex justify-between items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <div className="text-sm text-gray-400">
          <span className="flex items-center">
            <RiInformationLine className="mr-1" />
            Generated by DreamTrip AI
          </span>
        </div>
        
        {!isSaved && (
          <button 
            className="flex items-center text-blue-400 hover:text-blue-300 transition-colors text-sm"
            onClick={handleSaveTrip}
            disabled={isSaving}
          >
            <RiBookmarkLine className="mr-1" />
            Save this trip to your collection
            <RiArrowRightLine className="ml-1" />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
};

export default TripPlannerResult; 