import React, { useState } from "react";
import GeneralInfo from "./GeneralInfo";
import Hotels from "./Hotels";
//import Restaurants from "./Restaurants";
//import Attractions from "./Attractions";
//import Events from "./Events";
//import CustomRoute from "./CustomRoute";

const LeftContainer = ({ trip }) => {
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "מידע כללי", icon: "🌍" },
    { id: "hotels", label: "מלונות", icon: "🏨" },
    { id: "restaurants", label: "מסעדות", icon: "🍽" },
    { id: "attractions", label: "אטרקציות", icon: "🎡" },
    { id: "events", label: "אירועים מיוחדים", icon: "⭐" },
    { id: "customRoute", label: "מסלול מותאם אישית", icon: "🗺" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return <GeneralInfo trip={trip} />;
      case "hotels":
        // *{<Hotels trip={trip} }*
        return <Hotels trip={trip} />;
      case "restaurants":
        return null ;
      case "attractions":
        return null;
      case "events":
        return null;
      case "customRoute":
        return null;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        boxSizing: "border-box",
        background: "blue",
        color: "red",
      }}
    >
      <div className="trip-details">
        <nav className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
        <div className="content">{renderContent()}</div>
      </div>
    </div>
  );
};

export default LeftContainer;
