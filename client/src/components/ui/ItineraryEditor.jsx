import React, { useState, useContext, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TripContext } from '../tripcontext/TripProvider';
import Markdown from 'react-markdown';

/**
 * ItineraryEditor component handles both minor and major edits to existing itineraries
 * 
 * This component supports:
 * - Day-specific edits (minor changes)
 * - Full itinerary regeneration with modified parameters (major changes)
 * - Dynamic preview of changes
 */
const ItineraryEditor = () => {
  const { 
    allTripData, 
    tripDetails, 
    conversationState, 
    CONVERSATION_STATES, 
    transitionState,
    setTripDetails 
  } = useContext(TripContext);
  
  const [editType, setEditType] = useState('minor'); // 'minor' or 'major'
  const [dayToEdit, setDayToEdit] = useState(1);
  const [editDetails, setEditDetails] = useState('');
  const [modifiedTripDetails, setModifiedTripDetails] = useState({});
  
  // Initialize modified trip details when the component mounts
  // This must be before any conditionals to avoid React Hook errors
  useEffect(() => {
    if (tripDetails) {
      setModifiedTripDetails({...tripDetails});
    }
  }, [tripDetails]);
  
  // Don't render if not in editing mode
  if (conversationState !== CONVERSATION_STATES.EDITING_ITINERARY || !allTripData) {
    return null;
  }
  
  // Calculate number of days in the itinerary
  const calculateDayCount = () => {
    if (!tripDetails || !tripDetails.duration) {
      // Try to estimate from the itinerary text
      const dayMatches = allTripData.itinerary.match(/day\s+\d+/gi);
      if (dayMatches) {
        const uniqueDays = new Set();
        dayMatches.forEach(match => {
          const day = match.match(/\d+/)[0];
          uniqueDays.add(parseInt(day, 10));
        });
        return Math.max(...uniqueDays.values());
      }
      return 3; // Default fallback
    }
    return tripDetails.duration;
  };
  
  const dayCount = calculateDayCount();
  
  const handleEditTypeChange = (type) => {
    setEditType(type);
  };
  
  const handleDayChange = (e) => {
    setDayToEdit(parseInt(e.target.value, 10));
  };
  
  const handleEditDetailsChange = (e) => {
    setEditDetails(e.target.value);
  };
  
  const handleTripDetailChange = (field, value) => {
    setModifiedTripDetails(prev => {
      const updated = {...prev};
      
      // Handle nested fields
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        updated[parent] = {...updated[parent], [child]: value};
      } else {
        updated[field] = value;
      }
      
      return updated;
    });
  };
  
  const handleApplyChanges = () => {
    if (editType === 'minor') {
      // Process minor edit to specific day
      // In a real implementation, this would call AI to modify just that day
      console.log(`Apply minor edit to day ${dayToEdit}: ${editDetails}`);
      
      // Example implementation - would be replaced with actual AI call
      const message = `I've updated day ${dayToEdit} of your itinerary with the changes you requested.`;
      
      // Transition back to displaying the itinerary
      transitionState(CONVERSATION_STATES.DISPLAYING_ITINERARY);
    } else {
      // For major edits, update trip details and regenerate
      console.log('Apply major changes and regenerate itinerary', modifiedTripDetails);
      
      // Update the trip details in context
      setTripDetails(modifiedTripDetails);
      
      // Transition to generating state which will trigger regeneration
      transitionState(CONVERSATION_STATES.GENERATING_ITINERARY);
    }
  };
  
  const handleCancel = () => {
    // Return to displaying the existing itinerary
    transitionState(CONVERSATION_STATES.DISPLAYING_ITINERARY);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="itinerary-editor bg-[#2a3146] border border-blue-500/20 rounded-xl p-4 my-4 text-white max-w-[90%] self-start"
    >
      <div className="editor-header mb-3 border-b border-blue-400/20 pb-2">
        <h3 className="text-lg font-medium text-blue-300">Edit Your Itinerary</h3>
        <p className="text-sm text-gray-300">Make changes to your travel plan</p>
      </div>
      
      <div className="edit-type-selector mb-4">
        <div className="text-sm mb-2">Edit Type:</div>
        <div className="flex gap-3">
          <button
            onClick={() => handleEditTypeChange('minor')}
            className={`px-3 py-1.5 rounded text-sm ${
              editType === 'minor' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            }`}
          >
            Minor Adjustment
          </button>
          <button
            onClick={() => handleEditTypeChange('major')}
            className={`px-3 py-1.5 rounded text-sm ${
              editType === 'major' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            }`}
          >
            Major Revision
          </button>
        </div>
      </div>
      
      {editType === 'minor' ? (
        // Minor edit form
        <div className="minor-edit-form">
          <div className="mb-3">
            <label className="block text-sm mb-1">Day to Edit:</label>
            <select 
              value={dayToEdit}
              onChange={handleDayChange}
              className="bg-[#1e2130] border border-blue-500/20 rounded p-2 w-full text-sm"
            >
              {Array.from({length: dayCount}, (_, i) => (
                <option key={i+1} value={i+1}>Day {i+1}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm mb-1">What changes would you like to make?</label>
            <textarea
              value={editDetails}
              onChange={handleEditDetailsChange}
              className="bg-[#1e2130] border border-blue-500/20 rounded p-2 w-full h-24 text-sm"
              placeholder="E.g., Add more museum visits, replace dinner restaurant, include a morning hike..."
            />
          </div>
        </div>
      ) : (
        // Major edit form
        <div className="major-edit-form grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Destination:</label>
            <input
              type="text"
              value={modifiedTripDetails.vacation_location || ''}
              onChange={(e) => handleTripDetailChange('vacation_location', e.target.value)}
              className="bg-[#1e2130] border border-blue-500/20 rounded p-2 w-full text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1">Duration (days):</label>
            <input
              type="number"
              min="1"
              value={modifiedTripDetails.duration || ''}
              onChange={(e) => handleTripDetailChange('duration', parseInt(e.target.value, 10))}
              className="bg-[#1e2130] border border-blue-500/20 rounded p-2 w-full text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1">Travel Type:</label>
            <input
              type="text"
              value={modifiedTripDetails.constraints?.travel_type || ''}
              onChange={(e) => handleTripDetailChange('constraints.travel_type', e.target.value)}
              className="bg-[#1e2130] border border-blue-500/20 rounded p-2 w-full text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1">Budget:</label>
            <input
              type="text"
              value={modifiedTripDetails.constraints?.budget || ''}
              onChange={(e) => handleTripDetailChange('constraints.budget', e.target.value)}
              className="bg-[#1e2130] border border-blue-500/20 rounded p-2 w-full text-sm"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Preferred Activities:</label>
            <input
              type="text"
              value={modifiedTripDetails.constraints?.preferred_activity || ''}
              onChange={(e) => handleTripDetailChange('constraints.preferred_activity', e.target.value)}
              className="bg-[#1e2130] border border-blue-500/20 rounded p-2 w-full text-sm"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Additional Notes:</label>
            <textarea
              value={modifiedTripDetails.notes || ''}
              onChange={(e) => handleTripDetailChange('notes', e.target.value)}
              className="bg-[#1e2130] border border-blue-500/20 rounded p-2 w-full h-24 text-sm"
              placeholder="Any other changes or preferences you'd like to include..."
            />
          </div>
        </div>
      )}
      
      <div className="action-buttons flex justify-end mt-4 pt-3 border-t border-blue-400/20 gap-2">
        <button
          onClick={handleCancel}
          className="btn-cancel px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
        >
          Cancel
        </button>
        
        <button
          onClick={handleApplyChanges}
          className="btn-apply px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors"
        >
          {editType === 'minor' ? 'Apply Changes' : 'Regenerate Itinerary'}
        </button>
      </div>
    </motion.div>
  );
};

export default ItineraryEditor; 