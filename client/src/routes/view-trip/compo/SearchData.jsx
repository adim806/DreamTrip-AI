import React, { useContext, useEffect, useState, useRef } from "react";
import GeneralInfo from "./GeneralInfo";
import PropTypes from "prop-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Hotels from "./Hotels";
import Restaurants from "./Restaurants";
import Attractions from "./Attractions";
import TripPlanner from "./TripPlanner";
import SavedActivities from "@/components/ui/SavedActivities";
import { TripContext } from "@/components/tripcontext/TripProvider";

//import Events from "./Events";
//import CustomRoute from "./CustomRoute";

const SearchData = ({ trip }) => {
  const { activeLayer, setActiveLayer, defaultTab, activeTripChatId } =
    useContext(TripContext);
  const [activeTab, setActiveTab] = useState("generalInfo");
  const contentRef = useRef(null);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [userId, setUserId] = useState(null);

  // עדכון הטאב הפעיל מברירת המחדל
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // גלילה אוטומטית רק כשמתקבלים נתוני טיול חדשים
  useEffect(() => {
    if (contentRef.current && trip) {
      contentRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [trip]);

  // עדכון ה-chatId ו-userId בעת טעינת הקומפוננטה או שינוי ב-activeTripChatId
  useEffect(() => {
    // אם יש chatId פעיל מהקונטקסט, השתמש בו
    if (activeTripChatId) {
      console.log(`SearchData: Using activeTripChatId: ${activeTripChatId}`);
      setCurrentChatId(activeTripChatId);
      localStorage.setItem("chatId", activeTripChatId);
    } else {
      // נסה לקבל chatId מה-URL או מהזיכרון המקומי
      const pathParts = window.location.pathname.split("/");
      const possibleChatId = pathParts[pathParts.length - 1];
      const chatIdFromUrl = possibleChatId.length > 20 ? possibleChatId : null;
      const storedChatId = localStorage.getItem("chatId");

      const chatId = chatIdFromUrl || storedChatId || trip?.chatId;
      if (chatId) {
        console.log(
          `SearchData: Setting chatId from URL/localStorage: ${chatId}`
        );
        setCurrentChatId(chatId);
        localStorage.setItem("chatId", chatId);
      }
    }

    // קבל את ה-userId
    const storedUserId =
      localStorage.getItem("userId") || sessionStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, [activeTripChatId, trip]);

  // לוג שינויים במיקום הטיול
  useEffect(() => {
    if (trip?.vacation_location) {
      console.log(
        `SearchData: Trip destination changed to ${trip.vacation_location} for chat ${currentChatId}`
      );
    }
  }, [trip?.vacation_location, currentChatId]);

  // עדכון הטאב הפעיל על פי ה-URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#hotels") setActiveTab("hotels");
    else if (hash === "#restaurants") setActiveTab("restaurants");
    else if (hash === "#attractions") setActiveTab("attractions");
    else if (hash === "#activities") setActiveTab("activities");
    else if (hash === "#generalInfo") setActiveTab("generalInfo");
    else if (hash === "#tripDetails") setActiveTab("tripDetails");
  }, []);

  // עדכון ה-URL בהתאם לטאב הפעיל
  const handleTabChange = (value) => {
    setActiveTab(value);
    setActiveLayer(value); // עדכון שכבת המפה הפעילה
    window.location.hash = value;
  };

  // Make sure trip object has necessary props
  const enhancedTrip = {
    ...trip,
    userId: trip?.userId || userId,
    chatId: trip?.chatId || currentChatId || activeTripChatId,
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-100">
        {trip?.vacation_location
          ? `Explore ${trip.vacation_location}`
          : "Search and Save Activities"}
      </h1>

      <Tabs defaultValue={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-5 mb-6">
          <TabsTrigger value="generalInfo">🌍 מידע כללי</TabsTrigger>
          <TabsTrigger value="tripDetails">📋 Trip Details</TabsTrigger>
          <TabsTrigger value="hotels">🏨 מלונות</TabsTrigger>
          <TabsTrigger value="restaurants">🍽 מסעדות</TabsTrigger>
          <TabsTrigger value="attractions">🎡 אטרקציות</TabsTrigger>
        </TabsList>

        <div
          ref={contentRef}
          className="mt-2 overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(59, 130, 246, 0.2) rgba(59, 130, 246, 0.1)",
          }}
        >
          <TabsContent value="generalInfo">
            <GeneralInfo trip={enhancedTrip} />
          </TabsContent>

          <TabsContent value="tripDetails">
            <TripPlanner trip={enhancedTrip} />
          </TabsContent>

          <TabsContent value="hotels">
            <Hotels trip={enhancedTrip} />
          </TabsContent>

          <TabsContent value="restaurants">
            <Restaurants trip={enhancedTrip} />
          </TabsContent>

          <TabsContent value="attractions">
            <Attractions trip={enhancedTrip} />
          </TabsContent>
        </div>
      </Tabs>

      {/* SavedActivities כרכיב נפרד מחוץ לטאבים */}
      {activeTab === "activities" && (
        <div className="mt-4 p-4">
          <SavedActivities
            userId={userId}
            chatId={currentChatId || activeTripChatId}
          />
        </div>
      )}
    </div>
  );
};

SearchData.propTypes = {
  trip: PropTypes.object,
};

export default SearchData;
