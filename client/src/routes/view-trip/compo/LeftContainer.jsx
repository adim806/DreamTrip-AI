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
    { id: "customRoute", label: "מסלול הטיול", icon: "🗺" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return <GeneralInfo trip={trip} />;
      case "hotels":
        return <Hotels trip={trip} />;
      case "restaurants":
      case "attractions":
      case "events":
      case "customRoute":
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height: "100%",
        boxSizing: "border-box",
        background: "blue",
        color: "red",
      }}
    >
      {/* Navigation Tabs */}
      <nav
        className="tabs flex justify-center items-center gap-4 p-4 bg-opacity-90 rounded-lg shadow-md"
        style={{
          background: "blue",
          flexShrink: 0, // Ensure tabs don't shrink
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab flex justify-center items-center px-6 py-3 rounded-lg shadow-lg font-bold text-sm transition-transform duration-300 transform ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white scale-105"
                : "bg-gray-200 hover:scale-105 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              minWidth: "120px",
              height: "60px",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      {/* Content Section */}
      <div
        className="content-container"
        style={{
          flex: 1,
          overflowY: "auto", // Enable vertical scrolling if content overflows

          background: "white",
          borderRadius: "8px",

          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
};

export default LeftContainer;
