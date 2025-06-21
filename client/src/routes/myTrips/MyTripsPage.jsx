import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/clerk-react";
import {
  RiMapPinLine,
  RiCalendarLine,
  RiTimeLine,
  RiPlaneLine,
  RiEyeLine,
  RiDeleteBinLine,
  RiArrowLeftLine,
} from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import tripPlanService from "@/utils/services/tripPlanService";

const MyTripsPage = () => {
  const [savedTrips, setSavedTrips] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
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
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("טוען יומני מסע ומסלולים שמורים...");

        // טעינת יומנים רגילים
        const headers = { "Content-Type": "application/json" };
        if (isSignedIn) {
          const token = await getToken();
          headers.Authorization = `Bearer ${token}`;
        }

        const [itinerariesResponse, savedTripsData] = await Promise.all([
          // טעינת יומנים רגילים
          fetch(
            `${import.meta.env.VITE_API_URL}/api/itineraries?userId=${userId}`,
            {
              credentials: "include",
              headers,
            }
          ).then(res => {
            if (!res.ok) {
              console.error("שגיאה בטעינת יומני מסע:", res.status);
              return { json: async () => [] };
            }
            return res;
          }).then(res => res.json()),
          
          // טעינת מסלולים שמורים
          tripPlanService.getMyTrips()
        ]);

        console.log("נטענו יומני מסע:", itinerariesResponse);
        console.log("נטענו מסלולים שמורים:", savedTripsData);
        
        setItineraries(itinerariesResponse || []);
        setSavedTrips(savedTripsData || []);
      } catch (err) {
        console.error("שגיאה בטעינת נתונים:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded && (isSignedIn || import.meta.env.DEV)) {
      fetchData();
    }
  }, [userId, isLoaded, isSignedIn, getToken]);

  // פונקציה לניווט לצ'אט שממנו נוצר היומן
  const navigateToChat = (chatId) => {
    if (chatId) {
      navigate(`/chat/${chatId}`);
    }
  };

  // פונקציה להצגת מסלול שמור
  const viewSavedTrip = async (tripId) => {
    try {
      setLoading(true);
      const tripData = await tripPlanService.getTripById(tripId);
      setSelectedTrip(tripData);
    } catch (error) {
      console.error("שגיאה בטעינת מסלול שמור:", error);
    } finally {
      setLoading(false);
    }
  };

  // פונקציה למחיקת מסלול שמור
  const deleteSavedTrip = async (tripId, event) => {
    event.stopPropagation();
    
    if (window.confirm("האם אתה בטוח שברצונך למחוק את המסלול השמור?")) {
      try {
        await tripPlanService.deleteFromMyTrips(tripId);
        setSavedTrips(savedTrips.filter(trip => trip.id !== tripId));
        console.log("מסלול נמחק בהצלחה:", tripId);
      } catch (error) {
        console.error("שגיאה במחיקת מסלול:", error);
      }
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

  // אם נבחר מסלול שמור להצגה
  if (selectedTrip) {
    return (
      <div className="saved-trip-view flex flex-col h-full overflow-y-auto bg-[#171923] text-white p-6">
        <header className="mb-6 flex items-center">
          <button 
            onClick={() => setSelectedTrip(null)}
            className="flex items-center text-blue-400 hover:text-blue-300 transition-colors mr-4"
          >
            <RiArrowLeftLine className="mr-1" /> חזרה
          </button>
          <div>
            <h1 className="text-2xl font-bold mb-1">{selectedTrip.destination}</h1>
            <div className="flex items-center text-gray-400">
              <RiTimeLine className="mr-1" /> {selectedTrip.duration}
              <span className="mx-2">•</span>
              <RiCalendarLine className="mr-1" /> נשמר ב-{formatDate(selectedTrip.createdAt)}
            </div>
          </div>
        </header>

        <div className="saved-trip-content bg-[#1E2132] border border-blue-500/20 rounded-xl p-6 overflow-y-auto flex-grow">
          <div className="markdown-content prose prose-invert max-w-none prose-headings:text-blue-300 prose-p:text-gray-300 prose-strong:text-blue-200 prose-li:text-gray-300">
            {selectedTrip.plan.split('\n').map((line, i) => {
              // הדגשת כותרות
              if (line.startsWith('# ')) {
                return <h1 key={i} className="text-2xl font-bold text-blue-300 mt-6 mb-4">{line.replace('# ', '')}</h1>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={i} className="text-xl font-bold text-blue-300 mt-5 mb-3">{line.replace('## ', '')}</h2>;
              }
              if (line.startsWith('### ')) {
                return <h3 key={i} className="text-lg font-bold text-blue-300 mt-4 mb-2">{line.replace('### ', '')}</h3>;
              }
              
              // רשימות
              if (line.match(/^\s*[*-]\s/)) {
                return <div key={i} className="flex items-start my-1">
                  <span className="text-blue-400 mr-2">•</span>
                  <p className="text-gray-300">{line.replace(/^\s*[*-]\s/, '')}</p>
                </div>;
              }
              
              // פסקאות רגילות
              if (line.trim() === '') {
                return <div key={i} className="h-4"></div>;
              }
              
              return <p key={i} className="text-gray-300 my-2">{line}</p>;
            })}
          </div>
        </div>
      </div>
    );
  }

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

  const hasNoContent = itineraries.length === 0 && savedTrips.length === 0;

  return (
    <div className="my-trips-page flex flex-col h-full overflow-y-auto bg-[#171923] text-white p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-right">יומני המסע שלי</h1>
        <p className="text-gray-400 text-right">
          כל יומני הטיול והמסלולים שיצרת עם DreamTrip AI
        </p>
      </header>

      {hasNoContent ? (
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
        <>
          {/* מסלולים שמורים */}
          {savedTrips.length > 0 && (
            <div className="mb-10">
              <h2 className="text-2xl font-bold mb-4 text-right text-blue-300">מסלולים שמורים</h2>
              <motion.div
                className="saved-trips-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {savedTrips.map((trip) => (
                  <motion.div
                    key={trip.id}
                    className="saved-trip-card rounded-xl overflow-hidden bg-gradient-to-br from-blue-900/30 to-purple-900/20 border border-blue-500/30 
                              hover:border-blue-500/50 hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer"
                    variants={itemVariants}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    onClick={() => viewSavedTrip(trip.id)}
                  >
                    <div className="card-header bg-gradient-to-r from-blue-800/50 to-indigo-800/50 p-4 border-b border-blue-500/30">
                      <h3 className="text-xl font-bold text-white mb-1 text-right">
                        {trip.destination}
                      </h3>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-1 rounded-full flex items-center">
                          <RiTimeLine className="ml-1" /> {trip.duration}
                        </span>
                        <span className="text-xs bg-indigo-500/30 text-indigo-200 px-2 py-1 rounded-full flex items-center">
                          <RiCalendarLine className="ml-1" /> {formatDate(trip.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="card-content p-4 flex-grow">
                      <div className="preview text-sm text-gray-300">
                        {trip.plan && (
                          <p className="line-clamp-3 text-right">
                            {trip.plan.split('\n').filter(line => !line.startsWith('#') && line.trim() !== '')[0] || "לחץ לצפייה במסלול המלא"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="card-footer p-3 bg-[#181C29]/80 border-t border-gray-700/50 flex justify-between items-center">
                      <button
                        onClick={(e) => deleteSavedTrip(trip.id, e)}
                        className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-red-900/20 transition-colors"
                        title="מחק מסלול"
                      >
                        <RiDeleteBinLine size={18} />
                      </button>
                      
                      <button
                        className="flex items-center text-xs bg-blue-600/80 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <RiEyeLine className="mr-1" />
                        צפה במסלול
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}

          {/* יומני מסע */}
          {itineraries.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-right text-blue-300">יומני מסע</h2>
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
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-md py-2 transition-colors"
                      >
                        צפה ביומן המסע
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyTripsPage;
