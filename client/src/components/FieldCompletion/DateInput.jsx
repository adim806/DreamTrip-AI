import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function DateInput({ value, onComplete, label = "תאריך" }) {
  return (
    <div style={{ margin: "12px 0" }}>
      <label style={{ marginRight: 8, color: '#b3c6ff', fontWeight: 500 }}>{label}:</label>
      <DatePicker
        selected={value ? new Date(value) : null}
        onChange={date => onComplete(date ? date.toISOString().split('T')[0] : "")}
        dateFormat="yyyy-MM-dd"
        placeholderText="בחר תאריך"
        className="date-picker-input dark-datepicker"
        popperPlacement="bottom"
        calendarClassName="dark-datepicker-calendar"
      />
      <style>{`
        .dark-datepicker,
        .dark-datepicker input {
          background: #23263a;
          color: #e0e6ff;
          border: 1px solid #3a4060;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 1rem;
        }
        .dark-datepicker-calendar {
          background: #23263a;
          color: #e0e6ff;
          border: 1px solid #3a4060;
        }
        .dark-datepicker .react-datepicker__day--selected,
        .dark-datepicker .react-datepicker__day--keyboard-selected {
          background: #3b82f6;
          color: #fff;
        }
        .dark-datepicker .react-datepicker__day:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
} 