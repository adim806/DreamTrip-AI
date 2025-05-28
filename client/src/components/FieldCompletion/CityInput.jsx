import React, { useState } from "react";
export default function CityInput({ onComplete }) {
  const [value, setValue] = useState("");
  return (
    <div style={{ margin: "8px 0" }}>
      <label style={{ marginRight: 8 }}>City:</label>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Enter City"
        style={{ padding: 4, borderRadius: 4, border: "1px solid #ccc" }}
      />
      <button
        onClick={() => onComplete(value)}
        disabled={!value}
        style={{ marginLeft: 8 }}
      >
       Send
      </button>
    </div>
  );
} 