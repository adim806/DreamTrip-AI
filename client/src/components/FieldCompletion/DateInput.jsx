import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { applyDatePickerFix } from "./DatePickerFix";

export default function DateInput({ onComplete, value = "", label = "Date" }) {
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  
  // Apply the date picker fix when the component mounts
  useEffect(() => {
    applyDatePickerFix();
  }, []);
  
  // Update local state when prop value changes
  useEffect(() => {
    if (value) {
      try {
        const dateValue = new Date(value);
        if (!isNaN(dateValue.getTime())) {
          setSelectedDate(dateValue);
        }
      } catch (err) {
        console.error("Invalid date value:", value);
      }
    }
  }, [value]);
  
  const handleChange = (date) => {
    setSelectedDate(date);
    
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
        onComplete({
          from: dateStr,
          to: calculateEndDate(date)
        });
      } else {
        // Default case - just return the date string
        onComplete(dateStr);
      }
    } else {
      onComplete("");
    }
  };
  
  // Helper function to calculate end date based on start date
  const calculateEndDate = (startDate) => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7); // Default to 7 days
    return endDate.toISOString().split('T')[0];
  };
  
  return (
    <div className="mb-3 date-input-container">
      <label className="block text-blue-300 font-medium mb-1">{label}:</label>
      <div className="date-picker-wrapper" style={{ position: 'relative', zIndex: 100 }}>
          <DatePicker
            selected={selectedDate}
            onChange={handleChange}
            dateFormat="yyyy-MM-dd"
            placeholderText={`Select ${label}`}
            className="w-full px-3 py-2 bg-[#23263a] border border-blue-500/30 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          wrapperClassName="date-picker-wrapper w-full"
          calendarClassName="custom-datepicker"
          // Use a simple configuration to avoid errors
          popperProps={{
            strategy: "fixed"
          }}
        />
      </div>
      
      {/* Add global styles for date picker */}
      <style>{`
        /* Override positioning to fix the error */
        .react-datepicker-popper {
          z-index: 9999 !important;
          position: absolute !important;
          inset: auto !important;
          transform: none !important;
          top: 100% !important;
          left: 0 !important;
          margin-top: 8px !important;
          width: 100% !important;
        }
        
        /* Make the calendar look good */
        .custom-datepicker,
        .react-datepicker {
          background-color: #1f2937 !important;
          color: white !important;
          border: 1px solid rgba(59, 130, 246, 0.3) !important;
          border-radius: 0.5rem !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
          width: 100% !important;
          max-width: 300px !important;
          font-family: inherit !important;
        }
        
        .react-datepicker__header {
          background-color: #111827 !important;
          border-bottom: 1px solid rgba(59, 130, 246, 0.2) !important;
        }
        
        .react-datepicker__current-month, 
        .react-datepicker__day-name {
          color: white !important;
        }
        
        .react-datepicker__day {
          color: #e5e7eb !important;
        }
        
        .react-datepicker__day:hover {
          background-color: rgba(59, 130, 246, 0.3) !important;
        }
        
        .react-datepicker__day--selected, 
        .react-datepicker__day--keyboard-selected {
          background-color: #3b82f6 !important;
          color: white !important;
        }
        
        .react-datepicker__day--disabled {
          color: #6b7280 !important;
        }
        
        .react-datepicker__navigation-icon::before {
          border-color: white !important;
        }
        
        /* Fix the date picker wrapper */
        .date-picker-wrapper {
          width: 100% !important;
          position: relative !important;
        }
      `}</style>
    </div>
  );
} 