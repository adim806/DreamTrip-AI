import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { applyDatePickerFix } from "./DatePickerFix";
import { motion } from "framer-motion";

export default function DateInput({ onComplete, value = "", label = "Date", duration, error = null }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  
  // Apply the date picker fix when the component mounts
  useEffect(() => {
    applyDatePickerFix();
  }, []);
  
  // Parse initial value on mount and when value prop changes
  useEffect(() => {
    if (value) {
      try {
        // Handle both string dates and object dates with from/to
        if (typeof value === 'object' && value.from) {
          setSelectedDate(new Date(value.from));
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
        onComplete({
          from: dateStr,
          to: calculateEndDate(date, duration)
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
  const calculateEndDate = (startDate, durationDays) => {
    const endDate = new Date(startDate);
    // Use the provided duration prop if available, otherwise default to 7 days
    const daysToAdd = durationDays ? parseInt(durationDays, 10) : 7;
    endDate.setDate(startDate.getDate() + daysToAdd - 1); // Subtract 1 to include the start day in the count
    return endDate.toISOString().split('T')[0];
  };
  
  // Format the selected date for display
  const formatDisplayDate = () => {
    if (!selectedDate) return '';
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return selectedDate.toLocaleDateString(undefined, options);
  };
  
  // Toggle the date picker
  const toggleDatePicker = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <div className="field-component">
      <label className="block">{label}{label.toLowerCase().includes('date') && '*'}</label>
      
      <div className="date-input-container">
        <motion.div 
          className={`date-input ${error ? 'error' : ''}`}
          onClick={toggleDatePicker}
          whileHover={{ boxShadow: "0 0 0 2px rgba(96, 165, 250, 0.3)" }}
        >
          {formatDisplayDate() || `Select ${label.toLowerCase()}`}
        </motion.div>
        
        {isOpen && (
          <div className="date-picker-popup">
            <DatePicker
              selected={selectedDate}
              onChange={handleChange}
              inline
              calendarClassName="date-picker-calendar"
              onClickOutside={() => setIsOpen(false)}
            />
          </div>
        )}
      </div>
      
      {error && <div className="error-message">{error}</div>}
    </div>
  );
} 