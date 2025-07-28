import React, { useState, useEffect } from "react";

export default function CityInput({ onComplete, value = "", label = "City" }) {
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
  };
  
  return (
    <div className="mb-3">
      <label className="block text-blue-300 font-medium mb-1 text-xs uppercase tracking-wide">{label}:</label>
      <div className="relative">
        <input
          value={inputValue}
          onChange={handleChange}
          placeholder={`Enter ${label}`}
          className="w-full px-3 py-2 appearance-none bg-slate-800/60 border border-blue-500/20 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 h-8"
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-400">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
} 