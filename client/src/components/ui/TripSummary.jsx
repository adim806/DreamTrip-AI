import React, { useContext } from 'react';
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
    handleGenerateItinerary
  } = useContext(TripContext);
  
  const location = useLocation();
  const currentChatId = location.pathname.split('/').pop();

  // Don't render if:
  // 1. No trip details
  // 2. Not in awaiting confirmation state
  // 3. The current chat ID doesn't match the active trip chat ID (if activeTripChatId is set)
  // 4. If activeChatId is provided explicitly, check against that
  if (!tripDetails || 
      conversationState !== CONVERSATION_STATES.AWAITING_USER_TRIP_CONFIRMATION ||
      (activeTripChatId && activeTripChatId !== currentChatId) ||
      (activeChatId && activeTripChatId !== activeChatId)) {
    return null;
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
      }
    }
  };
  
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // Reset to idle state
      transitionState(CONVERSATION_STATES.IDLE);
      
      // Emit a system message about cancellation
      if (window.__processingHookState && window.__processingHookState.addSystemMessage) {
        window.__processingHookState.addSystemMessage(
          "Trip planning cancelled. How else can I assist you today?"
        );
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="trip-summary-card bg-[#2a3146] border border-blue-500/20 rounded-xl p-4 my-4 text-white max-w-[90%] self-start"
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
          >
            Cancel
          </button>
          
          <button
            onClick={handleEdit}
            className="btn-edit px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-white text-sm transition-colors"
          >
            Edit Details
          </button>
          
          <button
            onClick={handleConfirm}
            className="btn-confirm px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors"
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