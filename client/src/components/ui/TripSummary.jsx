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

  // Add a delay before showing the summary to ensure system message is displayed first
  const [showSummary, setShowSummary] = useState(false);
  
  const location = useLocation();
  const currentChatId = location.pathname.split('/').pop();

  // Delay showing the summary to ensure it appears after the system message
  useEffect(() => {
    let timeoutId;
    if (tripDetails && conversationState === CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION) {
      // Delay showing the summary by 800ms to ensure the system message is displayed first
      timeoutId = setTimeout(() => {
        setShowSummary(true);
      }, 800);
    } else {
      setShowSummary(false);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [tripDetails, conversationState, CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION]);

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
        forceShow,
        showSummary
      });
      
      // Set the flag to prevent duplicate logs
      hasLoggedDebugInfo.current = true;
      
      // Reset the flag after a delay to allow future logs
      setTimeout(() => {
        hasLoggedDebugInfo.current = false;
      }, 2000);
    }
  }, [tripDetails, conversationState, activeTripChatId, currentChatId, activeChatId, showSummary]);
  
  // Simplify rendering conditions - focus on the two most important ones
  if ((!tripDetails || 
      (conversationState !== CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION && !forceShow)) ||
      (!forceShow && !showSummary)) {
    // Only log once in a while to prevent infinite console spam
    if (!hasLoggedDebugInfo.current) {
      console.log('TripSummary not rendering due to basic conditions or timing delay');
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
    console.log("FORCED rendering of TripSummary");
    // Format the summary text using the existing utility
    const summaryMarkdown = formatTripSummary(tripDetails);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
        className="trip-summary-card bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900/80 border border-blue-500/20 rounded-xl p-4 my-3 text-white max-w-[85%] self-start shadow-lg"
        style={{
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2), 0 5px 10px rgba(0, 0, 0, 0.15)",
          backdropFilter: "blur(8px)"
        }}
        data-testid="trip-summary-card"
      >
        <div className="summary-header mb-2.5 border-b border-blue-400/20 pb-2">
          <h3 className="text-base font-medium text-blue-300 flex items-center">
            <svg className="w-4 h-4 mr-1.5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Trip Summary (Debug Mode)
          </h3>
          <p className="text-xs text-blue-200/70 mt-0.5">This summary is shown in forced debug mode</p>
        </div>
        
        <div
          className="summary-content mb-3 text-sm leading-relaxed text-slate-200 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar"
          dangerouslySetInnerHTML={{
            __html: summaryMarkdown
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-300">$1</strong>')
              .replace(/\n/g, '<br/>')
          }}
        />
        
        <div className="action-buttons flex flex-col gap-2">
          <div className="buttons-row flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="btn-cancel px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition-colors flex items-center"
              aria-label="Cancel trip planning"
              data-testid="btn-cancel-trip"
            >
              <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
            
            <button
              onClick={handleEdit}
              className="btn-edit px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-xs font-medium transition-colors flex items-center"
              aria-label="Edit trip details"
              data-testid="btn-edit-trip"
            >
              <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Edit Details
            </button>
            
            <motion.button
              onClick={handleConfirm}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="btn-confirm px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-medium transition-colors flex items-center shadow-md"
              aria-label="Generate itinerary"
              data-testid="btn-confirm-trip"
            >
              <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Generate Itinerary
            </motion.button>
          </div>
          
          <div className="debug-buttons flex flex-col mt-2">
            <button 
              onClick={() => setForceShow(false)} 
              className="px-3 py-1 mt-1 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded-md flex items-center justify-center"
            >
              <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Exit Debug Mode
            </button>
            <button 
              onClick={() => transitionState(CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION)} 
              className="px-3 py-1 mt-1 bg-yellow-600/80 hover:bg-yellow-600 text-white text-xs rounded-md flex items-center justify-center"
            >
              <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Force Confirmation State
            </button>
          </div>
        </div>
        
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 3px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(30, 41, 59, 0.3);
            border-radius: 4px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(96, 165, 250, 0.3);
            border-radius: 4px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(96, 165, 250, 0.5);
          }
        `}</style>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
      className="trip-summary-card bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900/80 border border-blue-500/20 rounded-xl p-4 my-3 text-white max-w-[85%] self-start shadow-lg"
      style={{
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2), 0 5px 10px rgba(0, 0, 0, 0.15)",
        backdropFilter: "blur(8px)"
      }}
      data-testid="trip-summary-card"
    >
      <div className="summary-header mb-2.5 border-b border-blue-400/20 pb-2 flex items-center">
        <div className="flex-1">
          <h3 className="text-base font-medium text-blue-300 flex items-center">
            <svg className="w-4 h-4 mr-1.5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Trip Summary
          </h3>
          <p className="text-xs text-blue-200/70 mt-0.5">Please review your trip details before we generate your itinerary</p>
        </div>
      </div>
      
      <div
        className="summary-content mb-3 text-sm leading-relaxed text-slate-200 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar"
        dangerouslySetInnerHTML={{
          __html: summaryMarkdown
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-300">$1</strong>')
            .replace(/\n/g, '<br/>')
        }}
      />
      
      <div className="action-buttons flex flex-col gap-2">
        <div className="buttons-row flex gap-2 justify-end">
          <button
            onClick={handleCancel}
            className="btn-cancel px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition-colors flex items-center"
            aria-label="Cancel trip planning"
            data-testid="btn-cancel-trip"
          >
            <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
          
          <button
            onClick={handleEdit}
            className="btn-edit px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-xs font-medium transition-colors flex items-center"
            aria-label="Edit trip details"
            data-testid="btn-edit-trip"
          >
            <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit Details
          </button>
          
          <motion.button
            onClick={handleConfirm}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-confirm px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-medium transition-colors flex items-center shadow-md"
            aria-label="Generate itinerary"
            data-testid="btn-confirm-trip"
          >
            <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Generate Itinerary
          </motion.button>
        </div>
        
        <div className="text-hint text-[10px] text-blue-200/50 text-right">
          <p>You can also type: &ldquo;<span className="text-blue-200/80">confirm</span>&rdquo;, &ldquo;<span className="text-blue-200/80">edit</span>&rdquo;, or &ldquo;<span className="text-blue-200/80">cancel</span>&rdquo;</p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.3);
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(96, 165, 250, 0.3);
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(96, 165, 250, 0.5);
        }
      `}</style>
    </motion.div>
  );
};

export default TripSummary; 