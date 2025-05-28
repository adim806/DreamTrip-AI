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
  };
  
  return (
    <div className="mb-3">
      <label className="block text-blue-300 font-medium mb-1">{label}:</label>
      <div className="flex gap-2">
        <select
          value={inputValue}
          onChange={handleChange}
          className="flex-1 px-3 py-2 bg-[#23263a] border border-blue-500/30 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select {label}</option>
          <option value="cheap">Budget/Cheap</option>
          <option value="moderate">Moderate</option>
          <option value="luxury">Luxury</option>
        </select>
      </div>
    </div>
  );
} 