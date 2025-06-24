import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@clerk/clerk-react";
import {
  RiMapPinLine,
  RiCalendarLine,
  RiTimeLine,
  RiPlaneLine,
  RiEyeLine,
  RiDeleteBinLine,
  RiArrowLeftLine,
  RiSuitcaseLine,
  RiHotelLine,
  RiRestaurantLine,
  RiRoadMapLine,
  RiBookmarkLine,
  RiFilterLine,
  RiSearchLine
} from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import tripPlanService from "@/utils/services/tripPlanService";

const MyTripsPage = () => {
  const [savedTrips, setSavedTrips] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
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

  // סינון המסלולים לפי טאב פעיל וחיפוש
  const filteredTrips = () => {
    let filtered;
    
    if (activeTab === "all") {
      filtered = [...savedTrips, ...itineraries.map(item => ({...item, isItinerary: true}))];
    } else if (activeTab === "saved") {
      filtered = [...savedTrips];
    } else {
      filtered = [...itineraries.map(item => ({...item, isItinerary: true}))];
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return filtered.filter(trip => 
        (trip.destination || trip.metadata?.destination || "").toLowerCase().includes(term) ||
        (trip.plan || "").toLowerCase().includes(term)
      );
    }
    
    return filtered;
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
      <div className="trip-day-preview border-t border-indigo-600/20 pt-3 mt-2">
        <h4 className="text-sm font-medium text-blue-300 flex items-center gap-1.5">
          <span className="bg-blue-500/20 px-1.5 py-0.5 rounded text-xs">יום {day.dayNumber}</span>
          {day.title && <span className="truncate">{day.title}</span>}
        </h4>
        <div className="text-xs text-gray-300 mt-1.5">
          {day.activities?.morning?.[0] && (
            <div className="activity flex items-center gap-1.5 py-0.5">
              <span className="text-blue-300 text-sm">☀️</span>
              <span className="truncate">
                {day.activities.morning[0].replace(
                  /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                  ""
                )}
              </span>
            </div>
          )}
          {day.activities?.lunch?.[0] && (
            <div className="activity flex items-center gap-1.5 py-0.5">
              <span className="text-blue-300 text-sm">🍽️</span>
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
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="saved-trip-view flex flex-col h-full overflow-hidden bg-[#171923] text-white"
      >
        <header className="p-6 pb-0 mb-4 flex items-center">
          <button 
            onClick={() => setSelectedTrip(null)}
            className="flex items-center text-blue-400 hover:text-blue-300 transition-colors mr-4 bg-blue-500/10 hover:bg-blue-500/20 p-2 rounded-full"
          >
            <RiArrowLeftLine size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text">
                {selectedTrip.destination}
              </span>
            </h1>
            <div className="flex items-center text-gray-400 flex-wrap gap-2">
              <div className="bg-blue-500/10 px-3 py-1 rounded-full flex items-center gap-1">
                <RiTimeLine className="text-blue-400" /> 
                <span>{selectedTrip.duration} ימים</span>
              </div>
              <div className="bg-indigo-500/10 px-3 py-1 rounded-full flex items-center gap-1">
                <RiCalendarLine className="text-indigo-400" /> 
                <span>נשמר ב-{formatDate(selectedTrip.createdAt)}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="trip-details-container px-6 flex-grow overflow-hidden flex flex-col md:flex-row gap-6">
          {/* Main content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="trip-content flex-grow overflow-y-auto bg-gradient-to-br from-blue-900/10 to-indigo-900/10 border border-blue-500/20 rounded-xl p-6"
          >
            <div className="itinerary-header mb-6 pb-4 border-b border-blue-500/20">
              <h2 className="text-2xl font-bold text-blue-200 mb-2">מסלול טיול</h2>
              <p className="text-gray-300">{selectedTrip.description || "מסלול טיול מותאם אישית עבורך"}</p>
            </div>
            
            <div className="markdown-content prose prose-invert max-w-none prose-headings:text-blue-300 prose-p:text-gray-300 prose-strong:text-blue-200 prose-li:text-gray-300">
              {selectedTrip.plan.split('\n').map((line, i) => {
                // הדגשת כותרות
                if (line.startsWith('# ')) {
                  return (
                    <motion.h1 
                      key={i} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.01 }}
                      className="text-2xl font-bold text-blue-300 mt-6 mb-4 flex items-center gap-2"
                    >
                      <RiRoadMapLine className="text-blue-400" />
                      {line.replace('# ', '')}
                    </motion.h1>
                  );
                }
                
                if (line.startsWith('## ')) {
                  return (
                    <motion.h2 
                      key={i} 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.01 }}
                      className="text-xl font-bold text-blue-300 mt-5 mb-3 flex items-center gap-2"
                    >
                      {line.includes("יום") ? <RiCalendarLine className="text-blue-400" /> : <RiSuitcaseLine className="text-blue-400" />}
                      {line.replace('## ', '')}
                    </motion.h2>
                  );
                }
                
                if (line.startsWith('### ')) {
                  return (
                    <motion.h3 
                      key={i} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.01 }}
                      className="text-lg font-bold text-blue-300 mt-4 mb-2"
                    >
                      {line.replace('### ', '')}
                    </motion.h3>
                  );
                }
                
                // רשימות - זיהוי אטרקציות/מסעדות/מלונות
                if (line.match(/^\s*[*-]\s/)) {
                  let icon = <span className="text-blue-400 mr-2">•</span>;
                  const cleanText = line.replace(/^\s*[*-]\s/, '');
                  
                  if (cleanText.includes("מלון") || cleanText.includes("לינה") || cleanText.includes("Hotel")) {
                    icon = <RiHotelLine className="text-indigo-400 mr-2" />;
                  } else if (cleanText.includes("מסעדת") || cleanText.includes("ארוחת") || cleanText.includes("מסעדה") || cleanText.includes("Restaurant")) {
                    icon = <RiRestaurantLine className="text-red-400 mr-2" />;
                  } else if (cleanText.includes("אטרקציה") || cleanText.includes("ביקור") || cleanText.includes("סיור") || cleanText.includes("מוזיאון")) {
                    icon = <RiMapPinLine className="text-green-400 mr-2" />;
                  }
                  
                  return (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.01 }}
                      className="flex items-start my-2 px-2 py-1 hover:bg-blue-500/10 rounded-md transition-colors"
                    >
                      {icon}
                      <p className="text-gray-300">{cleanText}</p>
                    </motion.div>
                  );
                }
                
                // פסקאות רגילות
                if (line.trim() === '') {
                  return <div key={i} className="h-4"></div>;
                }
                
                return (
                  <motion.p 
                    key={i} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    className="text-gray-300 my-2"
                  >
                    {line}
                  </motion.p>
                );
              })}
            </div>
          </motion.div>
          
          {/* Sidebar info panel */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="trip-sidebar min-w-[280px] md:max-w-[320px] hidden md:flex flex-col gap-4"
          >
            <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 rounded-xl p-4 border border-blue-500/20">
              <h3 className="text-lg font-medium text-blue-300 mb-3 flex items-center gap-1.5">
                <RiSuitcaseLine className="text-blue-400" /> פרטי הטיול
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <RiMapPinLine className="text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-300">יעד הטיול</p>
                    <p className="text-base text-white">{selectedTrip.destination}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RiCalendarLine className="text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-300">משך הטיול</p>
                    <p className="text-base text-white">{selectedTrip.duration} ימים</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RiTimeLine className="text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-300">תאריך שמירה</p>
                    <p className="text-base text-white">{formatDate(selectedTrip.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {selectedTrip.budget && (
              <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 rounded-xl p-4 border border-blue-500/20">
                <h3 className="text-lg font-medium text-blue-300 mb-3 flex items-center gap-1.5">
                  <RiBookmarkLine className="text-blue-400" /> תקציב
                </h3>
                <p className="text-base text-white">{selectedTrip.budget}</p>
              </div>
            )}
            
            <div className="mt-auto p-4 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 rounded-xl border border-blue-500/20">
              <button
                onClick={() => navigate("/chat/new")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-md py-2.5 transition-colors flex items-center justify-center gap-1.5"
              >
                <RiPlaneLine size={18} />
                יצירת טיול חדש
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
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
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <RiSuitcaseLine className="text-blue-400" />
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text">
            יומני המסע שלי
          </span>
        </h1>
        <p className="text-gray-400">
          כל יומני הטיול והמסלולים שיצרת עם DreamTrip AI
        </p>
        
        {!hasNoContent && (
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
            <div className="flex items-center gap-1 rounded-lg bg-blue-900/10 p-1 border border-blue-500/20">
              <button 
                onClick={() => setActiveTab("all")} 
                className={`px-4 py-2 text-sm rounded-md transition-all ${activeTab === "all" ? "bg-blue-600 text-white font-medium" : "text-gray-300 hover:bg-blue-500/10"}`}
              >
                הכל
              </button>
              <button 
                onClick={() => setActiveTab("saved")} 
                className={`px-4 py-2 text-sm rounded-md transition-all ${activeTab === "saved" ? "bg-blue-600 text-white font-medium" : "text-gray-300 hover:bg-blue-500/10"}`}
              >
                מסלולים שמורים
              </button>
              <button 
                onClick={() => setActiveTab("itineraries")} 
                className={`px-4 py-2 text-sm rounded-md transition-all ${activeTab === "itineraries" ? "bg-blue-600 text-white font-medium" : "text-gray-300 hover:bg-blue-500/10"}`}
              >
                יומני מסע
              </button>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="חיפוש..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-blue-900/10 border border-blue-500/20 rounded-lg py-2 px-4 pl-10 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:outline-none w-full min-w-[250px]"
              />
              <RiSearchLine className="absolute left-3 top-2.5 text-gray-400" />
            </div>
          </div>
        )}
      </header>

      {hasNoContent ? (
        <div className="flex flex-col items-center justify-center h-[50vh] bg-gradient-to-br from-blue-900/10 to-indigo-900/10 rounded-2xl border border-blue-500/20 p-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <RiMapPinLine size={80} className="text-blue-400 mb-6" />
          </motion.div>
          <h2 className="text-2xl text-blue-300 font-medium mb-3">
            עדיין אין לך יומני מסע
          </h2>
          <p className="text-gray-300 mb-6 text-center">
            התחל שיחה חדשה עם DreamTrip AI כדי ליצור את יומן המסע הראשון שלך
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/chat/new")}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg
                      transition-all flex items-center gap-2"
          >
            <RiPlaneLine size={18} />
            יצירת יומן מסע חדש
          </motion.button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab + searchTerm}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="trips-grid-container"
          >
            <motion.div
              className="trips-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredTrips().map((trip) => {
                // For itineraries
                if (trip.isItinerary) {
                  return (
                    <motion.div
                      key={trip._id}
                      className="itinerary-card rounded-xl overflow-hidden bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-500/20 hover:border-blue-500/50 hover:shadow-lg transition-all duration-300 flex flex-col h-[280px]"
                      variants={itemVariants}
                      whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    >
                      <div className="card-header bg-gradient-to-r from-blue-900/40 to-indigo-900/40 p-4 border-b border-blue-500/20">
                        <h3 className="text-xl font-bold text-white mb-1 truncate flex items-center gap-2">
                          <span className="bg-blue-500/30 p-1.5 rounded-full">
                            <RiRoadMapLine className="text-blue-300" size={16} />
                          </span>
                          {trip.metadata?.destination || "יומן מסע"}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {trip.metadata?.duration && (
                            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full flex items-center">
                              <RiTimeLine className="mr-1" /> {trip.metadata.duration}{" "}
                              ימים
                            </span>
                          )}
                          {trip.metadata?.dates?.from && (
                            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full flex items-center">
                              <RiCalendarLine className="mr-1" />{" "}
                              {formatDate(trip.metadata.dates.from)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="card-content p-4 flex-grow overflow-hidden">
                        {trip.structuredItinerary?.days?.[0] && (
                          <TripDayPreview day={trip.structuredItinerary.days[0]} />
                        )}

                        {trip.structuredItinerary?.additionalInfo?.tips?.[0] && (
                          <div className="tip-preview mt-3 text-xs text-gray-300 bg-blue-500/10 p-2 rounded-md">
                            <span className="text-blue-300 font-medium">טיפ: </span>
                            {trip.structuredItinerary.additionalInfo.tips[0].replace(
                              /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                              ""
                            )}
                          </div>
                        )}
                      </div>

                      <div className="card-footer p-3 bg-[#181C29]/80 border-t border-indigo-500/20">
                        <button
                          onClick={() => navigateToChat(trip.chatId)}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-md py-2.5 transition-all flex items-center justify-center gap-1.5"
                        >
                          <RiEyeLine size={18} />
                          צפה ביומן המסע
                        </button>
                      </div>
                    </motion.div>
                  );
                }
                // For saved trips
                else {
                  return (
                    <motion.div
                      key={trip.id}
                      className="saved-trip-card rounded-xl overflow-hidden bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 hover:border-blue-500/50 hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer h-[280px]"
                      variants={itemVariants}
                      whileHover={{ y: -5, transition: { duration: 0.2 } }}
                      onClick={() => viewSavedTrip(trip.id)}
                    >
                      <div className="card-header bg-gradient-to-r from-blue-800/50 to-indigo-800/50 p-4 border-b border-blue-500/30">
                        <h3 className="text-xl font-bold text-white mb-1 truncate flex items-center gap-2">
                          <span className="bg-indigo-500/30 p-1.5 rounded-full">
                            <RiMapPinLine className="text-indigo-300" size={16} />
                          </span>
                          {trip.destination}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-1 rounded-full flex items-center">
                            <RiTimeLine className="mr-1" /> {trip.duration} ימים
                          </span>
                          <span className="text-xs bg-indigo-500/30 text-indigo-200 px-2 py-1 rounded-full flex items-center">
                            <RiCalendarLine className="mr-1" /> {formatDate(trip.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="card-content p-4 flex-grow overflow-hidden">
                        <div className="preview text-sm text-gray-300 bg-gradient-to-br from-indigo-900/10 to-purple-900/10 p-3 rounded-lg border border-indigo-500/10">
                          {trip.plan && (
                            <p className="line-clamp-5">
                              {trip.plan.split('\n').filter(line => !line.startsWith('#') && line.trim() !== '')[0] || "לחץ לצפייה במסלול המלא"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="card-footer p-3 bg-[#181C29]/80 border-t border-indigo-500/30 flex justify-between items-center">
                        <button
                          onClick={(e) => deleteSavedTrip(trip.id, e)}
                          className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-red-900/20 transition-colors"
                          title="מחק מסלול"
                        >
                          <RiDeleteBinLine size={18} />
                        </button>
                        
                        <button
                          onClick={() => viewSavedTrip(trip.id)}
                          className="flex items-center text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <RiEyeLine className="mr-1" />
                          צפה במסלול
                        </button>
                      </div>
                    </motion.div>
                  );
                }
              })}
            </motion.div>
            
            {filteredTrips().length === 0 && (
              <div className="flex flex-col items-center justify-center h-[30vh] mt-6 bg-gradient-to-br from-blue-900/10 to-indigo-900/10 rounded-xl border border-blue-500/20 p-6">
                <RiFilterLine size={40} className="text-blue-400 mb-4" />
                <p className="text-gray-300 text-center">לא נמצאו תוצאות תואמות לחיפוש שלך</p>
                <button 
                  onClick={() => {setSearchTerm(""); setActiveTab("all");}}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  נקה סינון
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default MyTripsPage;
