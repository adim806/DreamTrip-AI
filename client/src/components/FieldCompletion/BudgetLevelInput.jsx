import React, { useState } from "react";
export default function BudgetLevelInput({ onComplete }) {
  const [value, setValue] = useState("");
  return (
    <div style={{ margin: "8px 0" }}>
      <label style={{ marginRight: 8 }}>רמת תקציב:</label>
      <select
        value={value}
        onChange={e => setValue(e.target.value)}
        style={{ padding: 4, borderRadius: 4, border: "1px solid #ccc" }}
      >
        <option value="">בחר</option>
        <option value="cheap">זול</option>
        <option value="moderate">בינוני</option>
        <option value="luxury">יוקרתי</option>
      </select>
      <button
        onClick={() => onComplete(value)}
        disabled={!value}
        style={{ marginLeft: 8 }}
      >
        שלח
      </button>
    </div>
  );
} 