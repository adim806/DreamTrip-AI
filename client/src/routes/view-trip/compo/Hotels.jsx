import React from "react";

const Hotels = ({ trip }) => {
  if (!trip?.hotels || trip?.hotels.length === 0) {
    return <p>לא נמצאו מלונות מתאימים.</p>;
  }

  return (
    <div>
      {trip?.hotels.map((hotel, index) => (
        <div key={index} className="card">
          <img src={hotel?.image} alt={hotel?.name} />
          <h3>{hotel?.name}</h3>
          <p>דירוג: {hotel?.rating}⭐</p>
          <p>מחיר ללילה: {hotel?.price}</p>
        </div>
      ))}
    </div>
  );
};

export default Hotels;
