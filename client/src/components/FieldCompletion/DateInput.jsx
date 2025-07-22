import React, { useState, useEffect, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { motion, AnimatePresence } from "framer-motion";
import { applyDatePickerFix } from "./DatePickerFix";

export default function DateInput({ onComplete, value = "", label = "Date", duration }) {
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const [isOpen, setIsOpen] = useState(false);
  const datePickerRef = useRef(null);
  const inputRef = useRef(null);
  
  // Apply the date picker fix when the component mounts
  useEffect(() => {
    applyDatePickerFix();
  }, []);
  
  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target) && 
          inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [datePickerRef]);
  
  // Update local state when prop value changes
  useEffect(() => {
    if (value) {
      try {
        // Handle both string dates and objects with from/to properties
        if (typeof value === 'object' && value.from) {
          const dateValue = new Date(value.from);
          if (!isNaN(dateValue.getTime())) {
            setSelectedDate(dateValue);
          }
        } else {
          const dateValue = new Date(value);
          if (!isNaN(dateValue.getTime())) {
            setSelectedDate(dateValue);
          }
        }
      } catch (err) {
        console.error("Invalid date value:", value);
      }
    }
  }, [value]);
  
  const handleChange = (date) => {
    setSelectedDate(date);
    setIsOpen(false);
    
    // Call onComplete with the new date value
    if (date) {
      // Format date as string in YYYY-MM-DD format
      const dateStr = date.toISOString().split('T')[0];
      
      // Always return a string for 'date' field to avoid [object Object] issues
      if (label.toLowerCase() === 'date') {
        onComplete(dateStr);
      }
      // If the field name is 'dates', format it as an object with from/to
      else if (label.toLowerCase() === 'dates') {
        // Get the actual duration value, defaulting to 1 if not provided
        const actualDuration = duration ? parseInt(duration, 10) : 1;
        
        // Create end date by adding duration-1 days to start date
        const endDate = new Date(date);
        endDate.setDate(date.getDate() + actualDuration - 1);
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // Return properly formatted date object with from and to properties
        onComplete({
          from: dateStr,
          to: endDateStr
        });
        
        console.log(`[DateInput] Completed with date range: ${dateStr} to ${endDateStr}`);
      } else {
        // Default case - just return the date string
        onComplete(dateStr);
      }
    } else {
      onComplete("");
    }
  };
  
  const handleClick = () => {
    setIsOpen(!isOpen);
  };
  
  // Helper function to calculate end date based on start date
  const calculateEndDate = (startDate, daysToAdd = 7) => {
    const endDate = new Date(startDate);
    // Use the provided duration prop if available, otherwise use the passed parameter
    const actualDays = daysToAdd || 7;
    console.log(`[DateInput] Using ${actualDays} days for date range calculation`);
    endDate.setDate(startDate.getDate() + actualDays - 1); // Subtract 1 to include the start day in the count
    return endDate.toISOString().split('T')[0];
  };
  
  // Format the date for display
  const formatDateForDisplay = (date) => {
    if (!date) return '';
    
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(date).toLocaleDateString(undefined, options);
  };
  
  // Get the end date for display
  const getEndDateForDisplay = () => {
    if (!selectedDate) return '';
    
    const actualDuration = duration ? parseInt(duration, 10) : 7;
    if (actualDuration === 1) return formatDateForDisplay(selectedDate);
    
    const endDate = new Date(selectedDate);
    endDate.setDate(selectedDate.getDate() + actualDuration - 1);
    return formatDateForDisplay(endDate);
  };
  
  // Get the formatted date range string
  const getDateRangeString = () => {
    if (!selectedDate) return '';
    
    const actualDuration = duration ? parseInt(duration, 10) : 7;
    if (actualDuration === 1) {
      return formatDateForDisplay(selectedDate);
    }
    
    return `${formatDateForDisplay(selectedDate)} - ${getEndDateForDisplay()}`;
  };
  
  return (
    <div className="mb-3 date-input-container">
      <label className="block text-blue-300 font-medium mb-1 text-xs uppercase tracking-wide">{label}:</label>
      <div className="date-picker-wrapper relative" ref={datePickerRef}>
        <div className="relative">
          <input
            ref={inputRef}
            value={selectedDate ? formatDateForDisplay(selectedDate) : ''}
            onClick={handleClick}
            readOnly
            placeholder={`Select ${label}`}
            className="w-full px-3 py-2 appearance-none bg-slate-800/60 border border-blue-500/20 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 h-8 cursor-pointer"
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-400">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M1 4c0-1.1.9-2 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4zm2 2v12h14V6H3zm2-6h2v2H5V0zm8 0h2v2h-2V0zM5 9h2v2H5V9zm0 4h2v2H5v-2zm4-4h2v2H9V9zm0 4h2v2H9v-2zm4-4h2v2h-2V9zm0 4h2v2h-2v-2z" />
            </svg>
          </div>
        </div>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              className="fixed z-50 left-1/2 transform -translate-x-1/2"
              style={{ 
                top: "calc(50% - 150px)",
                width: "320px",
              }}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="enhanced-date-picker-container">
                <div className="date-picker-header flex justify-between items-center p-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-lg">
                  <span className="text-sm font-medium">Select {label}</span>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-white/80 hover:text-white p-1 rounded-full hover:bg-blue-700/50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <DatePicker
                  selected={selectedDate}
                  onChange={handleChange}
                  inline
                  calendarClassName="custom-calendar"
                />
                {label.toLowerCase() === 'dates' && selectedDate && (
                  <div className="p-2 bg-slate-800 border-t border-blue-900/50 rounded-b-lg">
                    <div className="text-xs text-blue-300 font-medium">
                      Trip duration: {duration} {parseInt(duration, 10) === 1 ? 'day' : 'days'}
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      {parseInt(duration, 10) === 1 
                        ? formatDateForDisplay(selectedDate)
                        : `${formatDateForDisplay(selectedDate)} - ${getEndDateForDisplay()}`}
                    </div>
                  </div>
                )}
              </div>
              <div className="fixed inset-0 bg-black/50 -z-10" onClick={() => setIsOpen(false)}></div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {selectedDate && !isOpen && label.toLowerCase() === 'dates' && (
          <div className="mt-1 text-xs text-blue-300 opacity-80">
            {parseInt(duration, 10) === 1 
              ? formatDateForDisplay(selectedDate)
              : `${formatDateForDisplay(selectedDate)} - ${getEndDateForDisplay()}`}
          </div>
        )}
      </div>
      
      {/* Add global styles for date picker */}
      <style>{`
        .enhanced-date-picker-container {
          background-color: #1e293b;
          border-radius: 0.75rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3), 0 5px 15px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          position: relative;
          z-index: 60;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        
        .custom-calendar {
          background-color: #1e293b !important;
          border: none !important;
          width: 100% !important;
          font-family: inherit !important;
          box-shadow: none !important;
          padding: 0.5rem !important;
        }
        
        .react-datepicker {
          background-color: transparent !important;
          border: none !important;
          width: 100% !important;
          font-family: inherit !important;
          box-shadow: none !important;
        }
        
        .react-datepicker__header {
          background-color: #0f172a !important;
          border-bottom: 1px solid rgba(59, 130, 246, 0.2) !important;
          padding: 0.75rem 0 !important;
        }
        
        .react-datepicker__current-month {
          color: #93c5fd !important;
          font-weight: 600 !important;
          font-size: 1rem !important;
          margin-bottom: 0.5rem !important;
        }
        
        .react-datepicker__day-name {
          color: #64748b !important;
          width: 2.25rem !important;
          margin: 0.1rem !important;
          font-size: 0.75rem !important;
          font-weight: 500 !important;
        }
        
        .react-datepicker__month-container {
          float: none !important;
          width: 100% !important;
        }
        
        .react-datepicker__month {
          margin: 0.5rem !important;
          padding: 0 !important;
        }
        
        .react-datepicker__day {
          color: #e2e8f0 !important;
          width: 2.25rem !important;
          height: 2.25rem !important;
          line-height: 2.25rem !important;
          margin: 0.1rem !important;
          border-radius: 50% !important;
          font-size: 0.875rem !important;
          font-weight: 400 !important;
        }
        
        .react-datepicker__day:hover {
          background-color: rgba(59, 130, 246, 0.3) !important;
          color: white !important;
        }
        
        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background-color: #3b82f6 !important;
          color: white !important;
          font-weight: 600 !important;
        }
        
        .react-datepicker__day--outside-month {
          color: #475569 !important;
          opacity: 0.6 !important;
        }
        
        .react-datepicker__navigation-icon::before {
          border-color: #93c5fd !important;
          border-width: 2px 2px 0 0 !important;
          height: 8px !important;
          width: 8px !important;
        }
        
        .react-datepicker__navigation:hover *::before {
          border-color: #3b82f6 !important;
        }
        
        .react-datepicker__navigation {
          top: 0.9rem !important;
        }
        
        @media (max-width: 480px) {
          .enhanced-date-picker-container {
            width: 90vw !important;
            max-width: 320px !important;
          }
        }
      `}</style>
    </div>
  );
} 