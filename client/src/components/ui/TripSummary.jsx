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

  // Simplify rendering conditions - focus on the two most important ones
  if (!tripDetails || 
      (conversationState !== CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION && !forceShow)) {
    return null;
  }
  
  // Format the summary text using the existing utility
  const summaryMarkdown = formatTripSummary(tripDetails);
  
  // Default handlers if not provided as props
  const handleConfirm = () => {
    // First hide this component directly to ensure it disappears
    if (window.__processingHookState && window.__processingHookState.setShowTripSummary) {
      window.__processingHookState.setShowTripSummary(false);
      // Force the UI to update immediately
      if (window.__processingHookState.forceUpdate) {
        window.__processingHookState.forceUpdate();
      }
    }
    
    // First try to use the provided handler
    if (onConfirm) {
      onConfirm();
    } 
    // Otherwise use our own implementation with the context
    else {
      // Hide this component using global hook if available
      if (window.__processingHookState && window.__processingHookState.setShowTripSummary) {
        window.__processingHookState.setShowTripSummary(false);
      }

      // Trigger itinerary generation
      if (typeof handleGenerateItinerary === 'function') {
        try {
          // Add a loading message first
          if (window.__processingHookState && window.__processingHookState.addSystemMessage) {
            window.__processingHookState.addSystemMessage(
              "Great! I'll generate your personalized travel itinerary now. This might take a moment..."
            );
          }
          
          // Call the generator function
          handleGenerateItinerary();
        } catch (error) {
          console.error("Error calling handleGenerateItinerary:", error);
          // Fallback to direct state transition
          transitionState(CONVERSATION_STATES.GENERATING_ITINERARY);
        }
      } else {
        console.warn("handleGenerateItinerary is not a function, falling back to direct state transition");
        transitionState(CONVERSATION_STATES.GENERATING_ITINERARY);
        
        // Emit a system message about generation starting
        if (window.__processingHookState && window.__processingHookState.addSystemMessage) {
          window.__processingHookState.addSystemMessage(
            "Great! I'll generate your personalized travel itinerary now. This might take a moment..."
          );
        }
      }
    }
  };
  
  const handleEdit = () => {
    // First hide this component directly to ensure it disappears
    if (window.__processingHookState && window.__processingHookState.setShowTripSummary) {
      window.__processingHookState.setShowTripSummary(false);
      // Force the UI to update immediately
      if (window.__processingHookState.forceUpdate) {
        window.__processingHookState.forceUpdate();
      }
    }
    
    if (onEdit) {
      onEdit();
    } else {
      // Hide this component using global hook if available
      if (window.__processingHookState && window.__processingHookState.setShowTripSummary) {
        window.__processingHookState.setShowTripSummary(false);
      }
      
      // Transition back to trip building mode
      transitionState(CONVERSATION_STATES.TRIP_BUILDING_MODE);
      
      // Emit a system message about editing
      if (window.__processingHookState && window.__processingHookState.addSystemMessage) {
        window.__processingHookState.addSystemMessage(
          "Let's edit your trip details. What would you like to change?"
        );
      }
    }
  };
  
  const handleCancel = () => {
    // First hide this component directly to ensure it disappears
    if (window.__processingHookState && window.__processingHookState.setShowTripSummary) {
      window.__processingHookState.setShowTripSummary(false);
      // Force the UI to update immediately
      if (window.__processingHookState.forceUpdate) {
        window.__processingHookState.forceUpdate();
      }
    }
    
    if (onCancel) {
      onCancel();
    } else {
      // Hide this component using global hook if available
      if (window.__processingHookState && window.__processingHookState.setShowTripSummary) {
        window.__processingHookState.setShowTripSummary(false);
      }
      
      // Mark the trip as cancelled
      setWasTripCancelled(true);
      
      // Use the dedicated cancelTrip function to properly clean up
      cancelTrip();
      
      // Emit a system message about cancellation
      if (window.__processingHookState && window.__processingHookState.addSystemMessage) {
        window.__processingHookState.addSystemMessage(
          "Trip planning cancelled. How else can I assist you today?"
        );
      }
    }
  };

  // If this is a force-show mode, ignore normal conditions
  if (forceShow && tripDetails) {
    // Format the summary text using the existing utility
    const summaryMarkdown = formatTripSummary(tripDetails);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="trip-summary-card"
        data-testid="trip-summary-card"
      >
        <div className="summary-header">
          <h3>Trip Summary (Debug Mode)</h3>
          <p>This summary is shown in forced debug mode</p>
        </div>
        
        <div
          className="summary-content"
          dangerouslySetInnerHTML={{
            __html: summaryMarkdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
          }}
        />
        
        <div className="action-buttons">
          <div className="buttons-row">
            <button
              onClick={handleCancel}
              className="btn-cancel"
              aria-label="Cancel trip planning"
              data-testid="btn-cancel-trip"
            >
              Cancel
            </button>
            
            <button
              onClick={handleEdit}
              className="btn-edit"
              aria-label="Edit trip details"
              data-testid="btn-edit-trip"
            >
              Edit Details
            </button>
            
            <button
              onClick={handleConfirm}
              className="btn-confirm"
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="trip-summary-card"
      data-testid="trip-summary-card"
    >
      <div className="summary-header">
        <h3>Trip Summary</h3>
        <p>Please review your trip details</p>
      </div>
      
      <div
        className="summary-content"
        dangerouslySetInnerHTML={{
          __html: summaryMarkdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
        }}
      />
      
      <div className="action-buttons">
        <div className="buttons-row">
          <button
            onClick={handleCancel}
            className="btn-cancel"
            aria-label="Cancel trip planning"
            data-testid="btn-cancel-trip"
          >
            Cancel
          </button>
          
          <button
            onClick={handleEdit}
            className="btn-edit"
            aria-label="Edit trip details"
            data-testid="btn-edit-trip"
          >
            Edit
          </button>
          
          <button
            onClick={handleConfirm}
            className="btn-confirm"
            aria-label="Generate itinerary"
            data-testid="btn-confirm-trip"
          >
            Confirm
          </button>
        </div>
        
        <div className="text-hint">
          <p>You can also type: &ldquo;confirm&rdquo;, &ldquo;edit&rdquo;, or &ldquo;cancel&rdquo;</p>
        </div>
      </div>
    </motion.div>
  );
};

export default TripSummary; 