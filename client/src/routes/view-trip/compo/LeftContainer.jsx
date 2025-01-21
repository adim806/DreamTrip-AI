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
        return null;
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
        height: "110%",
        boxSizing: "border-box",
        background: "blue",
        color: "red",
      }}
    >
      <div
        className="trip-details"
        style={{
          height: "100%",
        }}
      >
        <nav
          className="tabs flex justify-center items-center gap-4 p-4 bg-opacity-90 rounded-lg shadow-md"
          style={{
            background: "blue", // Set a white background for better contrast
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab flex justify-center items-center px-6 py-3 rounded-lg shadow-lg font-bold text-sm  text-blue-700 transition-transform duration-300 transform ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white scale-105"
                  : "bg-gray-200 hover:scale-105 hover:bg-gray-300"
              }`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                minWidth: "120px", // Set a minimum width for all buttons
                height: "60px", // Set a fixed height for consistency
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
        <div className="">{renderContent()}</div>
      </div>
    </div>
  );
};

export default LeftContainer;
