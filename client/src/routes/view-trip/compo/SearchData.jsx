import React, { useContext, useEffect, useState, useRef } from "react";
import GeneralInfo from "./GeneralInfo";

import { TripContext } from "@/components/tripcontext/TripProvider";

import Hotels from "./Hotels";
import Restaurants from "./Restaurants";
import Attractions from "./Attractions";

//import Events from "./Events";
//import CustomRoute from "./CustomRoute";

const SearchData = ({ trip }) => {
  const { activeLayer, setActiveLayer, defaultTab } = useContext(TripContext);

  const [activeTab, setActiveTab] = useState("generalInfo");
  const contentRef = useRef(null);

  useEffect(() => {
    setActiveTab(defaultTab); // ✅ קביעת הלשונית הראשונה כברירת מחדל
  }, [defaultTab]);

  // גלילה אוטומטית רק כשמתקבלים נתוני טיול חדשים
  useEffect(() => {
    if (contentRef.current && trip) {
      contentRef.current.scrollTo({
        top: contentRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [trip]); // גלילה רק כשמתקבלים נתוני טיול חדשים

  const tabs = [
    { id: "generalInfo", label: "מידע כללי", icon: "🌍" },
    { id: "hotels", label: "מלונות", icon: "🏨" },
    { id: "restaurants", label: "מסעדות", icon: "🍽" },
    { id: "attractions", label: "אטרקציות", icon: "🎡" },
    { id: "events", label: "אירועים מיוחדים", icon: "⭐" },
    { id: "customRoute", label: "מסלול הטיול", icon: "🗺" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "generalInfo":
        return <GeneralInfo trip={trip} />;
      case "hotels":
        return <Hotels trip={trip} />;
      case "restaurants":
        return <Restaurants trip={trip} />;
      case "attractions":
        return <Attractions trip={trip} />;
      case "events":
      case "customRoute":
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Navigation Tabs */}
      <nav className="flex-none p-4 bg-opacity-90 rounded-lg shadow-md bg-gradient-to-t from-cyan-950 to-slate-950">
        <div className="flex justify-center items-center gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab flex justify-center items-center px-6 py-3 rounded-lg shadow-lg font-bold text-sm transition-transform duration-300 transform ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white scale-105"
                  : "bg-gray-200 hover:scale-105 hover:bg-gray-300"
              }`}
              onClick={() => {
                setActiveTab(tab.id);
                setActiveLayer(tab.id);
              }}
              style={{
                minWidth: "120px",
                height: "60px",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content Section */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(59, 130, 246, 0.2) rgba(59, 130, 246, 0.1)",
        }}
      >
        <div className="p-4">
          <div className="bg-white/5 rounded-lg p-4 shadow-lg">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchData;
