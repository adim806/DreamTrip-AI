import React, { useState, useEffect } from "react";

export default function BudgetLevelInput({ onComplete, value = "", label = "Budget Level" }) {
  const [inputValue, setValue] = useState(value);
  
  // Update local state when prop value changes
  useEffect(() => {
    if (value !== inputValue) {
      setValue(value);
    }
  }, [value]);
  
  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    // Call onComplete with each change to update parent form state
    onComplete(newValue);
    console.log(`[BudgetLevelInput] Selected budget level: "${newValue}"`);
  };
  
  // Get budget icon based on selected value
  const getBudgetIcon = () => {
    switch(inputValue) {
      case 'luxury':
        return (
          <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.5 2a4 4 0 00-4 4c0 .92.7 2.25 2.1 3.95A29.2 29.2 0 0010 13.34a29.2 29.2 0 005.4-3.39C17.3 8.25 18 6.92 18 6a4 4 0 00-4-4 3.72 3.72 0 00-3 1.5A3.72 3.72 0 006.5 2z" />
          </svg>
        );
      case 'moderate':
        return (
          <svg className="w-4 h-4 text-blue-400 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
        );
      case 'cheap':
        return (
          <svg className="w-4 h-4 text-green-400 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };
  
  // Get description based on selected value
  const getBudgetDescription = () => {
    switch(inputValue) {
      case 'luxury':
        return "Premium accommodations and experiences";
      case 'moderate':
        return "Comfortable, mid-range options";
      case 'cheap':
        return "Budget-friendly, economical choices";
      default:
        return null;
    }
  };
  
  return (
    <div className="mb-3">
      <label className="block text-blue-300 font-medium mb-1 text-xs uppercase tracking-wide">{label}:</label>
      <div className="relative">
        <select
          value={inputValue}
          onChange={handleChange}
          className="w-full px-3 py-2 appearance-none bg-slate-800/60 border border-blue-500/20 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 h-8"
        >
          <option value="">Select {label}</option>
          <option value="luxury">Luxury</option>
          <option value="moderate">Moderate</option>
          <option value="cheap">Budget/Cheap</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-400">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
      
      {inputValue && (
        <div className="mt-1 flex items-center text-xs">
          {getBudgetIcon()}
          <span className="text-slate-300">{getBudgetDescription()}</span>
        </div>
      )}
    </div>
  );
} 