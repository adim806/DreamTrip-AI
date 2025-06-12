import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/clerk-react";
import {
  RiMapPinLine,
  RiCalendarLine,
  RiTimeLine,
  RiPlaneLine,
} from "react-icons/ri";
import { useNavigate } from "react-router-dom";

const MyTripsPage = () => {
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userId, isLoaded, isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();

  // פונקציה להצגת תאריכים בפורמט קריא
  const formatDate = (dateString) => {
    if (!dateString) return "לא צוין";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      return date.toLocaleDateString("he-IL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  // טעינת היומנים מהשרת
  useEffect(() => {
    const fetchItineraries = async () => {
      try {
        setLoading(true);

        // בנייה של כותרות ההרשאה
        const headers = { "Content-Type": "application/json" };
        if (isSignedIn) {
          const token = await getToken();
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/itineraries?userId=${userId}`,
          {
            credentials: "include",
            headers,
          }
        );

        if (!response.ok) {
          throw new Error(`שגיאה בטעינת יומני המסע: ${response.status}`);
        }

        const data = await response.json();

        console.log("נטענו יומני מסע:", data);
        setItineraries(data);
      } catch (err) {
        console.error("שגיאה בטעינת יומני המסע:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded && (isSignedIn || import.meta.env.DEV)) {
      fetchItineraries();
    }
  }, [userId, isLoaded, isSignedIn, getToken]);

  // פונקציה לניווט לצ'אט שממנו נוצר היומן
  const navigateToChat = (chatId) => {
    if (chatId) {
      navigate(`/chat/${chatId}`);
    }
  };

  // אנימציה לכניסת הכרטיסים
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
      },
    },
  };

  // רכיב שמציג יום אחד מיומן מסע
  const TripDayPreview = ({ day }) => {
    if (!day) return null;

    return (
      <div className="trip-day-preview border-t border-gray-700/50 pt-2 mt-2">
        <h4 className="text-sm font-medium text-blue-300">
          יום {day.dayNumber}: {day.title}
        </h4>
        <div className="text-xs text-gray-300 mt-1">
          {day.activities?.morning?.[0] && (
            <div className="activity flex items-center gap-1 py-0.5">
              <span className="text-blue-300 text-lg">☀️</span>
              <span className="truncate">
                {day.activities.morning[0].replace(
                  /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                  ""
                )}
              </span>
            </div>
          )}
          {day.activities?.lunch?.[0] && (
            <div className="activity flex items-center gap-1 py-0.5">
              <span className="text-blue-300 text-lg">🍽️</span>
              <span className="truncate">
                {day.activities.lunch[0].replace(
                  /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                  ""
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center">
          <div className="animate-spin text-blue-500 mb-2">
            <RiPlaneLine size={40} />
          </div>
          <p className="text-blue-300">טוען את יומני המסע שלך...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6 bg-red-900/20 rounded-lg border border-red-800/30">
          <h3 className="text-red-300 text-xl mb-2">שגיאה בטעינת יומני המסע</h3>
          <p className="text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-trips-page flex flex-col h-full overflow-y-auto bg-[#171923] text-white p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-right">יומני המסע שלי</h1>
        <p className="text-gray-400 text-right">
          כל יומני הטיול שיצרת עם DreamTrip AI
        </p>
      </header>

      {itineraries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] bg-blue-900/10 rounded-2xl border border-blue-500/20 p-8">
          <RiMapPinLine size={64} className="text-blue-400 mb-4" />
          <h2 className="text-2xl text-blue-300 font-medium mb-2">
            עדיין אין לך יומני מסע
          </h2>
          <p className="text-gray-300 mb-6 text-center">
            התחל שיחה חדשה עם DreamTrip AI כדי ליצור את יומן המסע הראשון שלך
          </p>
          <button
            onClick={() => navigate("/chat/new")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg
                      transition-all flex items-center gap-2"
          >
            <RiPlaneLine size={18} />
            יצירת יומן מסע חדש
          </button>
        </div>
      ) : (
        <motion.div
          className="itineraries-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {itineraries.map((item) => (
            <motion.div
              key={item._id}
              className="itinerary-card rounded-xl overflow-hidden bg-[#1E2132] border border-blue-500/20 
                         hover:border-blue-500/40 hover:shadow-lg transition-all duration-300 flex flex-col"
              variants={itemVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <div className="card-header bg-gradient-to-r from-blue-900/40 to-purple-900/40 p-4 border-b border-blue-500/20">
                <h3 className="text-xl font-bold text-white mb-1 text-right">
                  {item.metadata?.destination || "יומן מסע"}
                </h3>
                <div className="flex flex-wrap gap-2 justify-end">
                  {item.metadata?.duration && (
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full flex items-center">
                      <RiTimeLine className="ml-1" /> {item.metadata.duration}{" "}
                      ימים
                    </span>
                  )}
                  {item.metadata?.dates?.from && (
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full flex items-center">
                      <RiCalendarLine className="ml-1" />{" "}
                      {formatDate(item.metadata.dates.from)}
                    </span>
                  )}
                </div>
              </div>

              <div className="card-content p-4 flex-grow">
                {item.structuredItinerary?.days?.[0] && (
                  <TripDayPreview day={item.structuredItinerary.days[0]} />
                )}

                {item.structuredItinerary?.additionalInfo?.tips?.[0] && (
                  <div className="tip-preview mt-3 text-xs text-gray-300">
                    <span className="text-blue-300 font-medium">טיפ: </span>
                    {item.structuredItinerary.additionalInfo.tips[0].replace(
                      /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                      ""
                    )}
                  </div>
                )}
              </div>

              <div className="card-footer p-4 bg-[#181C29] border-t border-gray-700/50">
                <button
                  onClick={() => navigateToChat(item.chatId)}
                  className="w-full py-2 px-3 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg
                            transition-all flex items-center justify-center gap-2"
                >
                  <RiMapPinLine size={18} />
                  צפייה ביומן המסע המלא
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default MyTripsPage;
