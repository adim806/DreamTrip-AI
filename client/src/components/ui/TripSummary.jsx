import React, { useContext, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TripContext } from '../tripcontext/TripProvider';
import { formatTripSummary } from '../../utils/tripUtils';
import { useLocation } from 'react-router-dom';

/**
 * TripSummary component displays a summary of the trip with confirmation options
 * 
 * The component shows structured trip information and provides three action buttons:
 * - Confirm: Proceed to generate the itinerary
 * - Edit: Allow the user to modify specific trip details
 * - Cancel: Abort trip planning and return to idle/advisory mode
 */
const TripSummary = ({ onConfirm, onEdit, onCancel, activeChatId }) => {
  const { 
    tripDetails, 
    CONVERSATION_STATES, 
    conversationState, 
    activeTripChatId,
    transitionState,
    handleGenerateItinerary,
    setTripDetails,
    startNewTrip,
    cancelTrip,
    setWasTripCancelled
  } = useContext(TripContext);
  
  // Force the component to re-render for debugging if needed
  const [forceShow, setForceShow] = useState(false);
  
  // Track if we've logged the debug info to prevent infinite logging
  const hasLoggedDebugInfo = useRef(false);
  
  const location = useLocation();
  const currentChatId = location.pathname.split('/').pop();

  // Add a global debug object for easier troubleshooting from the console
  useEffect(() => {
    if (!window.__tripDebug) {
      window.__tripDebug = {
        showTripSummary: () => {
          console.log("Force-showing TripSummary");
          setForceShow(true);
        },
        getTripDetails: () => tripDetails,
        getConversationState: () => conversationState,
        getCurrentChatId: () => currentChatId,
        setConversationState: (newState) => {
          if (CONVERSATION_STATES[newState]) {
            console.log(`Manually setting conversation state to: ${newState}`);
            transitionState(CONVERSATION_STATES[newState]);
            return true;
          }
          return false;
        }
      };
    }
    
    return () => {
      // Clean up when component unmounts
      delete window.__tripDebug;
    };
  }, [tripDetails, conversationState, currentChatId, transitionState]);

  // Add debug output to understand why component might not render
  // Only log if we haven't logged recently to prevent infinite logging
  useEffect(() => {
    if (!hasLoggedDebugInfo.current) {
      const shouldRender = !!tripDetails && 
        conversationState === CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION;
      
      console.log('TripSummary render check:', {
        hasTripDetails: !!tripDetails,
        conversationState,
        isAwaitingConfirmation: conversationState === CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION,
        activeTripChatId,
        currentChatId,
        activeChatId,
        shouldRender,
        forceShow
      });
      
      // Set the flag to prevent duplicate logs
      hasLoggedDebugInfo.current = true;
      
      // Reset the flag after a delay to allow future logs
      setTimeout(() => {
        hasLoggedDebugInfo.current = false;
      }, 2000);
    }
  }, [tripDetails, conversationState, activeTripChatId, currentChatId, activeChatId]);
  
  // Simplify rendering conditions - focus on the two most important ones
  if (!tripDetails || 
      (conversationState !== CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION && !forceShow)) {
    // Only log once in a while to prevent infinite console spam
    if (!hasLoggedDebugInfo.current) {
      console.log('TripSummary not rendering due to basic conditions');
      hasLoggedDebugInfo.current = true;
      
      // Reset the flag after a delay
      setTimeout(() => {
        hasLoggedDebugInfo.current = false;
      }, 2000);
    }
    return null;
  }
  
  // Check chat ID conditions separately and log if they're causing issues
  if (!forceShow && (activeTripChatId && activeTripChatId !== currentChatId)) {
    console.log('TripSummary not rendering due to activeTripChatId mismatch');
    // Temporarily disabling this condition to see if it helps
    // return null;
  }
  
  if (!forceShow && (activeChatId && activeTripChatId !== activeChatId)) {
    console.log('TripSummary not rendering due to activeChatId mismatch');
    // Temporarily disabling this condition to see if it helps
    // return null;
  }

  // Format the summary text using the existing utility
  const summaryMarkdown = formatTripSummary(tripDetails);
  
  // Default handlers if not provided as props
  const handleConfirm = () => {
    // First try to use the provided handler
    if (onConfirm) {
      onConfirm();
    } 
    // Otherwise use our own implementation with the context
    else {
      // Trigger itinerary generation
      if (typeof handleGenerateItinerary === 'function') {
        handleGenerateItinerary();
      } else {
        transitionState(CONVERSATION_STATES.GENERATING_ITINERARY);
        
        // Emit a system message about generation starting
        if (window.__processingHookState && window.__processingHookState.addSystemMessage) {
          window.__processingHookState.addSystemMessage(
            "Great! I'll generate your personalized travel itinerary now. This might take a moment..."
          );
          
          // REMOVING SYNTHETIC MESSAGE - This was causing infinite loop
          // setTimeout(() => {
          //   window.__processingHookState.processUserInput("Confirm the trip details and generate the itinerary");
          // }, 500);
        }
      }
    }
  };
  
  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      // Transition back to trip building mode
      transitionState(CONVERSATION_STATES.TRIP_BUILDING_MODE);
      
      // Emit a system message about editing
      if (window.__processingHookState && window.__processingHookState.addSystemMessage) {
        window.__processingHookState.addSystemMessage(
          "Let's edit your trip details. What would you like to change?"
        );
        
        // REMOVING SYNTHETIC MESSAGE - This was causing infinite loop
        // setTimeout(() => {
        //   window.__processingHookState.processUserInput("I want to edit the trip details");
        // }, 500);
      }
    }
  };
  
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // Mark the trip as cancelled
      setWasTripCancelled(true);
      
      // Use the dedicated cancelTrip function to properly clean up
      cancelTrip();
      
      // Emit a system message about cancellation
      if (window.__processingHookState && window.__processingHookState.addSystemMessage) {
        window.__processingHookState.addSystemMessage(
          "Trip planning cancelled. How else can I assist you today?"
        );
        
        // REMOVING SYNTHETIC MESSAGE - This was causing infinite loop
        // setTimeout(() => {
        //   window.__processingHookState.processUserInput("Cancel the trip planning");
        // }, 500);
      }
    }
  };

  // If this is a force-show mode, ignore normal conditions
  if (forceShow && tripDetails) {
    console.log("FORCED rendering of TripSummary");
    // Format the summary text using the existing utility
    const summaryMarkdown = formatTripSummary(tripDetails);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="trip-summary-card bg-[#2a3146] border border-blue-500/20 rounded-xl p-4 my-4 text-white max-w-[90%] self-start"
        data-testid="trip-summary-card"
      >
        <div className="summary-header mb-3 border-b border-blue-400/20 pb-2">
          <h3 className="text-lg font-medium text-blue-300">Trip Summary (Debug Mode)</h3>
          <p className="text-sm text-gray-300">This summary is shown in forced debug mode</p>
        </div>
        
        <div
          className="summary-content mb-4 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: summaryMarkdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
          }}
        />
        
        <div className="action-buttons flex flex-col gap-3">
          <div className="buttons-row flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="btn-cancel px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
              aria-label="Cancel trip planning"
              data-testid="btn-cancel-trip"
            >
              Cancel
            </button>
            
            <button
              onClick={handleEdit}
              className="btn-edit px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-white text-sm transition-colors"
              aria-label="Edit trip details"
              data-testid="btn-edit-trip"
            >
              Edit Details
            </button>
            
            <button
              onClick={handleConfirm}
              className="btn-confirm px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors"
              aria-label="Generate itinerary"
              data-testid="btn-confirm-trip"
            >
              Generate Itinerary
            </button>
          </div>
          
          <div className="debug-buttons flex flex-col">
            <button 
              onClick={() => setForceShow(false)} 
              className="px-3 py-1 mt-2 bg-red-600 text-white text-xs rounded"
            >
              Exit Debug Mode
            </button>
            <button 
              onClick={() => transitionState(CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION)} 
              className="px-3 py-1 mt-1 bg-yellow-600 text-white text-xs rounded"
            >
              Force Confirmation State
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="trip-summary-card bg-[#2a3146] border border-blue-500/20 rounded-xl p-4 my-4 text-white max-w-[90%] self-start"
      data-testid="trip-summary-card"
    >
      <div className="summary-header mb-3 border-b border-blue-400/20 pb-2">
        <h3 className="text-lg font-medium text-blue-300">Trip Summary</h3>
        <p className="text-sm text-gray-300">Please review your trip details before we generate your itinerary</p>
      </div>
      
      <div
        className="summary-content mb-4 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: summaryMarkdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
        }}
      />
      
      <div className="action-buttons flex flex-col gap-3">
        <div className="buttons-row flex gap-2 justify-end">
          <button
            onClick={handleCancel}
            className="btn-cancel px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
            aria-label="Cancel trip planning"
            data-testid="btn-cancel-trip"
          >
            Cancel
          </button>
          
          <button
            onClick={handleEdit}
            className="btn-edit px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-white text-sm transition-colors"
            aria-label="Edit trip details"
            data-testid="btn-edit-trip"
          >
            Edit Details
          </button>
          
          <button
            onClick={handleConfirm}
            className="btn-confirm px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors"
            aria-label="Generate itinerary"
            data-testid="btn-confirm-trip"
          >
            Generate Itinerary
          </button>
        </div>
        
        <div className="text-hint text-xs text-gray-400 text-right">
          <p>You can also type: &ldquo;<span className="text-gray-300">confirm</span>&rdquo;, &ldquo;<span className="text-gray-300">edit</span>&rdquo;, or &ldquo;<span className="text-gray-300">cancel</span>&rdquo;</p>
        </div>
      </div>
    </motion.div>
  );
};

export default TripSummary; 