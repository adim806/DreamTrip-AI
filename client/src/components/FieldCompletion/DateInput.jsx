import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function DateInput({ onComplete, value = "", label = "Date" }) {
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  
  // Update local state when prop value changes
  useEffect(() => {
    if (value) {
      try {
        const dateValue = new Date(value);
        if (!isNaN(dateValue.getTime()) && 
            (!selectedDate || dateValue.getTime() !== selectedDate.getTime())) {
          setSelectedDate(dateValue);
        }
      } catch (err) {
        console.error("Invalid date value:", value);
      }
    } else if (selectedDate !== null) {
      setSelectedDate(null);
    }
  }, [value, selectedDate]);
  
  const handleChange = (date) => {
    setSelectedDate(date);
    // Call onComplete with the new date value
    if (date) {
      onComplete(date.toISOString().split('T')[0]);
    } else {
      onComplete("");
    }
  };
  
  return (
    <div className="mb-3">
      <label className="block text-blue-300 font-medium mb-1">{label}:</label>
      <div className="flex gap-2">
        <div className="flex-1">
          <DatePicker
            selected={selectedDate}
            onChange={handleChange}
            dateFormat="yyyy-MM-dd"
            placeholderText={`Select ${label}`}
            className="w-full px-3 py-2 bg-[#23263a] border border-blue-500/30 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            popperPlacement="bottom"
            popperClassName="dark-datepicker-popper"
          />
        </div>
      </div>
      
      <style>{`
        .react-datepicker {
          background-color: #23263a;
          color: #ffffff;
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 0.5rem;
          font-family: inherit;
        }
        
        .react-datepicker__header {
          background-color: #2a2d3c;
          border-bottom: 1px solid rgba(59, 130, 246, 0.2);
        }
        
        .react-datepicker__current-month, 
        .react-datepicker__day-name {
          color: #ffffff;
        }
        
        .react-datepicker__day {
          color: #e0e6ff;
        }
        
        .react-datepicker__day:hover {
          background-color: rgba(59, 130, 246, 0.3);
        }
        
        .react-datepicker__day--selected, 
        .react-datepicker__day--keyboard-selected {
          background-color: #3b82f6;
          color: #ffffff;
        }
        
        .react-datepicker__day--disabled {
          color: #6b7280;
        }
        
        .react-datepicker__navigation-icon::before {
          border-color: #ffffff;
        }
        
        .react-datepicker__navigation:hover *::before {
          border-color: #3b82f6;
        }
      `}</style>
    </div>
  );
} 