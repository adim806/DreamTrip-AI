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
  
  // קביעת צבעי רקע מותאמים לפי היעד או באופן אקראי אם אין יעד
  const getCardGradient = (destination) => {
    // אם אין יעד או היעד הוא "Unknown destination", נבחר גרדיאנט אקראי
    if (!destination || destination === "Unknown destination" || destination === "") {
      const gradients = [
        "from-blue-900/20 to-purple-900/20",
        "from-indigo-900/20 to-pink-900/20",
        "from-purple-900/20 to-blue-900/20",
        "from-teal-900/20 to-indigo-900/20",
        "from-blue-900/20 to-cyan-900/20"
      ];
      return gradients[Math.floor(Math.random() * gradients.length)];
    }
    
    // אחרת, נבחר גרדיאנט לפי האות הראשונה של היעד
    const firstChar = destination.charAt(0).toLowerCase();
    if ("abcde".includes(firstChar)) return "from-blue-900/20 to-purple-900/20";
    if ("fghij".includes(firstChar)) return "from-indigo-900/20 to-pink-900/20";
    if ("klmno".includes(firstChar)) return "from-purple-900/20 to-blue-900/20";
    if ("pqrst".includes(firstChar)) return "from-teal-900/20 to-indigo-900/20";
    return "from-blue-900/20 to-cyan-900/20";
  };
  
  // בחירת תמונת רקע לפי היעד
  const getDestinationImage = (destination) => {
    // מיפוי של יעדים נפוצים לתמונות מתאימות
    const destinationImages = {
      // ערים אירופאיות
      "paris": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop",
      "rome": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop",
      "london": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop",
      "barcelona": "https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=1200&auto=format&fit=crop",
      "amsterdam": "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?q=80&w=1200&auto=format&fit=crop",
      "berlin": "https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?q=80&w=1200&auto=format&fit=crop",
      "prague": "https://images.unsplash.com/photo-1592906209472-a36b1f3782ef?q=80&w=1200&auto=format&fit=crop",
      "vienna": "https://images.unsplash.com/photo-1516550893885-985c994344a2?q=80&w=1200&auto=format&fit=crop",
      
      // ערים בארה"ב
      "new york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1200&auto=format&fit=crop",
      "los angeles": "https://images.unsplash.com/photo-1580655653885-65763b2597d0?q=80&w=1200&auto=format&fit=crop",
      "san francisco": "https://images.unsplash.com/photo-1521464302861-ce943915d1c3?q=80&w=1200&auto=format&fit=crop",
      "las vegas": "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?q=80&w=1200&auto=format&fit=crop",
      "miami": "https://images.unsplash.com/photo-1535498730771-e735b998cd64?q=80&w=1200&auto=format&fit=crop",
      
      // יעדים באסיה
      "tokyo": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1200&auto=format&fit=crop",
      "bangkok": "https://images.unsplash.com/photo-1563492065599-3520f775eeed?q=80&w=1200&auto=format&fit=crop",
      "singapore": "https://images.unsplash.com/photo-1565967511849-76a60a516170?q=80&w=1200&auto=format&fit=crop",
      "hong kong": "https://images.unsplash.com/photo-1506970845246-18f21d533b20?q=80&w=1200&auto=format&fit=crop",
      "seoul": "https://images.unsplash.com/photo-1538485399081-7c9f2d4b5bc1?q=80&w=1200&auto=format&fit=crop",
      
      // יעדים במזרח התיכון
      "dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop",
      "istanbul": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1200&auto=format&fit=crop",
      "tel aviv": "https://images.unsplash.com/photo-1544971587-b842c27f8e14?q=80&w=1200&auto=format&fit=crop",
      "jerusalem": "https://images.unsplash.com/photo-1529106492281-b02200cec7ec?q=80&w=1200&auto=format&fit=crop",
      "eilat": "https://images.unsplash.com/photo-1559628233-100c798642d4?q=80&w=1200&auto=format&fit=crop",
      
      // מדינות ואזורים
      "italy": "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1200&auto=format&fit=crop",
      "france": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop",
      "spain": "https://images.unsplash.com/photo-1543783207-ec64e4d95325?q=80&w=1200&auto=format&fit=crop",
      "greece": "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1200&auto=format&fit=crop",
      "japan": "https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=1200&auto=format&fit=crop",
      "thailand": "https://images.unsplash.com/photo-1528181304800-259b08848526?q=80&w=1200&auto=format&fit=crop",
      "israel": "https://images.unsplash.com/photo-1544971587-b842c27f8e14?q=80&w=1200&auto=format&fit=crop",
      "usa": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=1200&auto=format&fit=crop",
      "uk": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop",
      
      // סוגי טיולים
      "beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
      "mountains": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop",
      "hiking": "https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=1200&auto=format&fit=crop",
      "safari": "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1200&auto=format&fit=crop",
      "ski": "https://images.unsplash.com/photo-1551524559-8af4e6624178?q=80&w=1200&auto=format&fit=crop"
    };
    
    // תמונות ברירת מחדל לפי יבשת/אזור
    const defaultImages = {
      europe: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1200&auto=format&fit=crop",
      asia: "https://images.unsplash.com/photo-1535139262971-c51845709a48?q=80&w=1200&auto=format&fit=crop",
      americas: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=1200&auto=format&fit=crop",
      middleEast: "https://images.unsplash.com/photo-1549140600-78c9b8275e0d?q=80&w=1200&auto=format&fit=crop",
      africa: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=1200&auto=format&fit=crop",
      australia: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=1200&auto=format&fit=crop",
      generic: "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=1200&auto=format&fit=crop"
    };
    
    if (!destination) return defaultImages.generic;
    
    // חיפוש התאמה מדויקת או חלקית
    const lowerDest = destination.toLowerCase();
    
    // בדיקה להתאמה מדויקת
    for (const [key, url] of Object.entries(destinationImages)) {
      if (lowerDest === key) {
        return url;
      }
    }
    
    // בדיקה להתאמה חלקית
    for (const [key, url] of Object.entries(destinationImages)) {
      if (lowerDest.includes(key) || key.includes(lowerDest)) {
        return url;
      }
    }
    
    // זיהוי אזור/יבשת
    const europeanCountries = ["france", "italy", "spain", "germany", "uk", "england", "greece", "switzerland", "netherlands", "belgium", "portugal", "austria", "denmark", "sweden", "norway", "finland", "poland", "hungary", "czech"];
    const asianCountries = ["japan", "china", "thailand", "vietnam", "india", "korea", "singapore", "malaysia", "indonesia", "philippines", "taiwan"];
    const middleEastCountries = ["israel", "jordan", "egypt", "dubai", "uae", "emirates", "qatar", "saudi", "turkey", "lebanon"];
    const americasCountries = ["usa", "united states", "canada", "mexico", "brazil", "argentina", "peru", "colombia", "chile"];
    const africanCountries = ["morocco", "kenya", "tanzania", "south africa", "ethiopia", "ghana", "nigeria"];
    const australiaCountries = ["australia", "new zealand"];
    
    // בדיקה לאיזה אזור שייך היעד
    if (europeanCountries.some(country => lowerDest.includes(country))) {
      return defaultImages.europe;
    } else if (asianCountries.some(country => lowerDest.includes(country))) {
      return defaultImages.asia;
    } else if (middleEastCountries.some(country => lowerDest.includes(country))) {
      return defaultImages.middleEast;
    } else if (americasCountries.some(country => lowerDest.includes(country))) {
      return defaultImages.americas;
    } else if (africanCountries.some(country => lowerDest.includes(country))) {
      return defaultImages.africa;
    } else if (australiaCountries.some(country => lowerDest.includes(country))) {
      return defaultImages.australia;
    }
    
    // אם לא נמצאה התאמה, החזר תמונה גנרית
    return defaultImages.generic;
  };

  // טעינת היומנים מהשרת
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("טוען יומני מסע ומסלולים שמורים...");

        // טעינת מסלולים שמורים
        const savedTripsData = await tripPlanService.getMyTrips();
        console.log("נטענו מסלולים:", savedTripsData);

        // Separate itineraries and saved trips
        const itinerariesData = savedTripsData.filter(trip => trip.type === 'itinerary');
        const savedTrips = savedTripsData.filter(trip => trip.type !== 'itinerary');

        setItineraries(itinerariesData || []);
        setSavedTrips(savedTrips || []);
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
      
      // עדכון היעד ומשך הטיול אם חסרים
      if (!tripData.destination || tripData.destination === "Unknown destination" || tripData.destination === "") {
        if (tripData.metadata?.destination && tripData.metadata.destination !== "Unknown destination" && tripData.metadata.destination !== "") {
          tripData.destination = tripData.metadata.destination;
        }
        else if (tripData.structuredPlan?.destination && tripData.structuredPlan.destination !== "Unknown destination" && tripData.structuredPlan.destination !== "") {
          tripData.destination = tripData.structuredPlan.destination;
        }
      }
      
      if (!tripData.duration || tripData.duration === "Unknown duration" || tripData.duration.includes("Unknown")) {
        if (tripData.metadata?.duration && !tripData.metadata.duration.includes("Unknown")) {
          tripData.duration = tripData.metadata.duration;
        }
        else if (tripData.structuredPlan?.days?.length > 0) {
          tripData.duration = `${tripData.structuredPlan.days.length} ימים`;
        }
      }
      
      console.log("Viewing trip with data:", {
        id: tripData.id,
        destination: tripData.destination,
        duration: tripData.duration
      });
      
      setSelectedTrip(tripData);
    } catch (error) {
      console.error("שגיאה בטעינת מסלול שמור:", error);
    } finally {
      setLoading(false);
    }
  };

  // פונקציה לצפייה ביומן מסע
  const viewItinerary = async (itinerary) => {
    try {
      setLoading(true);
      // כאן אנחנו משתמשים בנתונים שכבר קיימים ברשימה
      // אם יש צורך בפרטים נוספים, אפשר לבקש אותם מהשרת
      
      // עיבוד הנתונים כדי שיתאימו לפורמט של מסלול שמור
      const processedItinerary = {
        ...itinerary,
        isItinerary: true,
        destination: itinerary.destination || itinerary.metadata?.destination || "יומן מסע",
        duration: itinerary.duration || itinerary.metadata?.duration || "טיול מתוכנן",
        plan: itinerary.content || itinerary.plan || "",
        structuredPlan: itinerary.structuredItinerary || itinerary.structuredPlan || {}
      };
      
      console.log("Viewing itinerary:", processedItinerary);
      
      setSelectedTrip(processedItinerary);
    } catch (error) {
      console.error("שגיאה בטעינת יומן מסע:", error);
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
  
  // Listen for tripPlanGenerated events to refresh the trips list
  useEffect(() => {
    const handleTripPlanGenerated = (event) => {
      console.log("MyTripsPage: Detected new trip plan generation", event.detail);
      
      // Show a notification that the trip was added
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center transition-opacity duration-500';
      notification.style.opacity = '0';
      notification.innerHTML = `
        <div class="mr-3 bg-white/20 rounded-full p-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <div>
          <p class="font-bold">מסלול טיול נוסף!</p>
          <p class="text-sm">המסלול נוסף לרשימת הטיולים שלך</p>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Fade in animation
      setTimeout(() => {
        notification.style.opacity = '1';
      }, 10);
      
      // Fade out notification
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 500);
      }, 3000);
      
      // Refresh the trips list
      const fetchNewTrips = async () => {
        try {
          // Fetch only the saved trips since that's what was updated
          const savedTripsData = await tripPlanService.getMyTrips();
          setSavedTrips(savedTripsData || []);
          console.log("Updated saved trips after new trip plan was generated");
          
          // If we have a tripId, show the newly created trip
          if (event.detail?.savedTripId) {
            viewSavedTrip(event.detail.savedTripId);
          }
        } catch (err) {
          console.error("Error refreshing trips after plan generation:", err);
        }
      };
      
      // Wait a moment to make sure the server has processed the save
      setTimeout(fetchNewTrips, 1000);
    };
    
    // Add event listener
    document.addEventListener('tripPlanGenerated', handleTripPlanGenerated);
    
    // Clean up
    return () => {
      document.removeEventListener('tripPlanGenerated', handleTripPlanGenerated);
    };
  }, []);

  // סינון המסלולים לפי טאב פעיל וחיפוש
  const filteredTrips = () => {
    let filtered;

    if (activeTab === "all") {
      filtered = [...savedTrips, ...itineraries];
    } else if (activeTab === "saved") {
      filtered = [...savedTrips];
    } else {
      filtered = [...itineraries];
    }

    // לפני החיפוש, נוודא שיש לכל טיול יעד תקין
    filtered = filtered.map(trip => {
      // אם אין יעד או היעד הוא "Unknown destination", ננסה למצוא יעד מתאים
      if (!trip.destination || trip.destination === "Unknown destination" || trip.destination === "") {
        // בדוק אם יש יעד במטא-דאטה
        if (trip.metadata?.destination && trip.metadata.destination !== "Unknown destination" && trip.metadata.destination !== "") {
          trip.destination = trip.metadata.destination;
        }
        // בדוק אם יש יעד בתוכנית המובנית
        else if (trip.structuredPlan?.destination && trip.structuredPlan.destination !== "Unknown destination" && trip.structuredPlan.destination !== "") {
          trip.destination = trip.structuredPlan.destination;
        }
        else if (trip.structuredItinerary?.destination && trip.structuredItinerary.destination !== "Unknown destination" && trip.structuredItinerary.destination !== "") {
          trip.destination = trip.structuredItinerary.destination;
        }
      }
      
      // וודא שיש משך טיול
      if (!trip.duration || trip.duration === "Unknown duration" || trip.duration.includes("Unknown")) {
        if (trip.metadata?.duration && !trip.metadata.duration.includes("Unknown")) {
          trip.duration = trip.metadata.duration;
        }
        else if (trip.structuredPlan?.days?.length > 0) {
          trip.duration = `${trip.structuredPlan.days.length} ימים`;
        }
        else if (trip.structuredItinerary?.days?.length > 0) {
          trip.duration = `${trip.structuredItinerary.days.length} ימים`;
        }
      }
      
      return trip;
    });

    // סינון לפי מונח החיפוש
    if (searchTerm) {
      filtered = filtered.filter(trip => {
        const destination = trip.destination || "";
        const duration = trip.duration || "";
        const description = trip.preview?.description || trip.plan || trip.content || "";
        
        return (
          destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
          duration.toLowerCase().includes(searchTerm.toLowerCase()) ||
          description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
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
    // Make sure the plan content is available
    const planContent = selectedTrip.plan || selectedTrip.content || "";
    
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
                {selectedTrip.destination || "המסלול שלי"}
              </span>
            </h1>
            <div className="flex items-center text-gray-400 flex-wrap gap-2">
              <div className="bg-blue-500/10 px-3 py-1 rounded-full flex items-center gap-1">
                <RiTimeLine className="text-blue-400" />
                <span>
                  {selectedTrip.duration || "טיול מתוכנן"}
                </span>
              </div>
              <div className="bg-indigo-500/10 px-3 py-1 rounded-full flex items-center gap-1">
                <RiCalendarLine className="text-indigo-400" />
                <span>נשמר ב-{formatDate(selectedTrip.createdAt)}</span>
              </div>
              {selectedTrip.activityCounts?.total > 0 && (
                <div className="bg-green-500/10 px-3 py-1 rounded-full flex items-center gap-1">
                  <RiMapPinLine className="text-green-400" />
                  <span>{selectedTrip.activityCounts.total} פעילויות</span>
                </div>
              )}
              {/* Add badge for itinerary type */}
              {selectedTrip.isItinerary && (
                <div className="bg-purple-500/10 px-3 py-1 rounded-full flex items-center gap-1">
                  <RiRoadMapLine className="text-purple-400" />
                  <span>יומן מסע</span>
                </div>
              )}
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
              <h2 className="text-2xl font-bold text-blue-200 mb-2">
                {selectedTrip.isItinerary ? "יומן מסע" : "מסלול טיול"}
              </h2>
              <p className="text-gray-300">
                {selectedTrip.structuredPlan?.summary || selectedTrip.structuredItinerary?.summary || selectedTrip.description || selectedTrip.content || "מסלול טיול מותאם אישית עבורך"}
              </p>
              
              {/* Highlights section */}
              {(selectedTrip.structuredPlan?.highlights || selectedTrip.structuredItinerary?.highlights) && (
                <div className="highlights-section mt-4">
                  <h3 className="text-lg font-medium text-blue-300 mb-2 flex items-center gap-1.5">
                    <span className="text-yellow-400">✨</span> דגשים עיקריים
                  </h3>
                  <div className="highlights-list flex flex-wrap gap-2">
                    {(selectedTrip.structuredPlan?.highlights || selectedTrip.structuredItinerary?.highlights || []).map((highlight, index) => (
                      <div key={index} className="highlight-tag bg-blue-900/30 border border-blue-500/30 px-3 py-1.5 rounded-lg text-sm text-blue-200">
                        {highlight}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Use structured plan if available */}
            {(selectedTrip.structuredPlan?.days || selectedTrip.structuredItinerary?.days) && 
              (selectedTrip.structuredPlan?.days?.length > 0 || selectedTrip.structuredItinerary?.days?.length > 0) ? (
              <div className="structured-itinerary">
                {(selectedTrip.structuredPlan?.days || selectedTrip.structuredItinerary?.days || []).map((day, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="day-section mb-10 bg-gradient-to-br from-blue-900/5 to-indigo-900/5 rounded-xl p-6 border border-blue-500/10"
                  >
                    <h3 className="text-xl font-bold text-blue-300 flex items-center gap-2 mb-4 pb-3 border-b border-blue-500/20">
                      <RiCalendarLine className="text-blue-400" />
                      {day.title || `יום ${day.dayNumber}`}
                    </h3>
                    
                    {/* Morning activities */}
                    {day.activities?.morning && day.activities.morning.length > 0 && (
                      <div className="time-section mb-6">
                        <h4 className="text-lg font-medium text-yellow-300 mb-3 flex items-center gap-1.5 bg-gradient-to-r from-yellow-900/10 to-transparent p-2 rounded-lg">
                          <span>☀️</span> בוקר
                        </h4>
                        <div className="activities-list space-y-3 pr-4">
                          {day.activities.morning.map((activity, actIndex) => (
                            <div 
                              key={actIndex}
                              className="activity-item flex items-start p-3 hover:bg-blue-500/10 rounded-md transition-colors border border-blue-500/10"
                            >
                              <div className="activity-icon mr-3 bg-yellow-500/20 p-2 rounded-full">
                                {activity.includes("מלון") || activity.includes("לינה") ? (
                                  <RiHotelLine className="text-yellow-400" />
                                ) : activity.includes("מסעדת") || activity.includes("ארוחת") ? (
                                  <RiRestaurantLine className="text-yellow-400" />
                                ) : (
                                  <RiMapPinLine className="text-yellow-400" />
                                )}
                              </div>
                              <div className="activity-content">
                                <p className="text-gray-300">{activity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Afternoon activities */}
                    {day.activities?.afternoon && day.activities.afternoon.length > 0 && (
                      <div className="time-section mb-6">
                        <h4 className="text-lg font-medium text-blue-300 mb-3 flex items-center gap-1.5 bg-gradient-to-r from-blue-900/10 to-transparent p-2 rounded-lg">
                          <span>🌞</span> צהריים
                        </h4>
                        <div className="activities-list space-y-3 pr-4">
                          {day.activities.afternoon.map((activity, actIndex) => (
                            <div 
                              key={actIndex}
                              className="activity-item flex items-start p-3 hover:bg-blue-500/10 rounded-md transition-colors border border-blue-500/10"
                            >
                              <div className="activity-icon mr-3 bg-blue-500/20 p-2 rounded-full">
                                {activity.includes("מלון") || activity.includes("לינה") ? (
                                  <RiHotelLine className="text-blue-400" />
                                ) : activity.includes("מסעדת") || activity.includes("ארוחת") ? (
                                  <RiRestaurantLine className="text-blue-400" />
                                ) : (
                                  <RiMapPinLine className="text-blue-400" />
                                )}
                              </div>
                              <div className="activity-content">
                                <p className="text-gray-300">{activity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Evening activities */}
                    {day.activities?.evening && day.activities.evening.length > 0 && (
                      <div className="time-section mb-6">
                        <h4 className="text-lg font-medium text-purple-300 mb-3 flex items-center gap-1.5 bg-gradient-to-r from-purple-900/10 to-transparent p-2 rounded-lg">
                          <span>🌙</span> ערב
                        </h4>
                        <div className="activities-list space-y-3 pr-4">
                          {day.activities.evening.map((activity, actIndex) => (
                            <div 
                              key={actIndex}
                              className="activity-item flex items-start p-3 hover:bg-purple-500/10 rounded-md transition-colors border border-purple-500/10"
                            >
                              <div className="activity-icon mr-3 bg-purple-500/20 p-2 rounded-full">
                                {activity.includes("מלון") || activity.includes("לינה") ? (
                                  <RiHotelLine className="text-purple-400" />
                                ) : activity.includes("מסעדת") || activity.includes("ארוחת") ? (
                                  <RiRestaurantLine className="text-purple-400" />
                                ) : (
                                  <RiMapPinLine className="text-purple-400" />
                                )}
                              </div>
                              <div className="activity-content">
                                <p className="text-gray-300">{activity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Lunch activities */}
                    {day.activities?.lunch && day.activities.lunch.length > 0 && (
                      <div className="time-section mb-6">
                        <h4 className="text-lg font-medium text-red-300 mb-3 flex items-center gap-1.5 bg-gradient-to-r from-red-900/10 to-transparent p-2 rounded-lg">
                          <RiRestaurantLine className="text-red-400" /> ארוחת צהריים
                        </h4>
                        <div className="activities-list space-y-3 pr-4">
                          {day.activities.lunch.map((activity, actIndex) => (
                            <div 
                              key={actIndex}
                              className="activity-item flex items-start p-3 hover:bg-red-500/10 rounded-md transition-colors border border-red-500/10"
                            >
                              <div className="activity-icon mr-3 bg-red-500/20 p-2 rounded-full">
                                <RiRestaurantLine className="text-red-400" />
                              </div>
                              <div className="activity-content">
                                <p className="text-gray-300">{activity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Dinner activities */}
                    {day.activities?.dinner && day.activities.dinner.length > 0 && (
                      <div className="time-section mb-6">
                        <h4 className="text-lg font-medium text-orange-300 mb-3 flex items-center gap-1.5 bg-gradient-to-r from-orange-900/10 to-transparent p-2 rounded-lg">
                          <RiRestaurantLine className="text-orange-400" /> ארוחת ערב
                        </h4>
                        <div className="activities-list space-y-3 pr-4">
                          {day.activities.dinner.map((activity, actIndex) => (
                            <div 
                              key={actIndex}
                              className="activity-item flex items-start p-3 hover:bg-orange-500/10 rounded-md transition-colors border border-orange-500/10"
                            >
                              <div className="activity-icon mr-3 bg-orange-500/20 p-2 rounded-full">
                                <RiRestaurantLine className="text-orange-400" />
                              </div>
                              <div className="activity-content">
                                <p className="text-gray-300">{activity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {/* Tips section */}
                {(selectedTrip.structuredPlan?.additionalInfo?.tips || selectedTrip.structuredItinerary?.additionalInfo?.tips) && 
                  (selectedTrip.structuredPlan?.additionalInfo?.tips?.length > 0 || selectedTrip.structuredItinerary?.additionalInfo?.tips?.length > 0) && (
                  <div className="tips-section mt-8 bg-blue-900/20 p-6 rounded-xl border border-blue-500/30">
                    <h3 className="text-xl font-bold text-blue-300 flex items-center gap-2 mb-4 pb-3 border-b border-blue-500/20">
                      <span className="text-blue-300">💡</span> טיפים והמלצות
                    </h3>
                    <ul className="tips-list space-y-3">
                      {(selectedTrip.structuredPlan?.additionalInfo?.tips || selectedTrip.structuredItinerary?.additionalInfo?.tips || []).map((tip, index) => (
                        <li key={index} className="tip-item flex items-start bg-blue-900/10 p-3 rounded-lg border-r-4 border-blue-500">
                          <span className="mr-3 text-blue-400 text-lg">💡</span>
                          <p className="text-gray-300">{tip}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              // Fallback to markdown content if no structured plan
              <div className="markdown-content prose prose-invert max-w-none prose-headings:text-blue-300 prose-p:text-gray-300 prose-strong:text-blue-200 prose-li:text-gray-300">
                {(planContent || "טרם נוצר תוכן מפורט").split('\n').map((line, i) => {
                  // הדגשת כותרות ראשיות (יעד, תקציר)
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

                  // כותרות של ימים
                  if (line.match(/^##\s+יום \d+/) || line.match(/^##\s+Day \d+/) || 
                      (line.startsWith('## ') && (line.includes('יום') || line.includes('Day')))) {
                    return (
                      <motion.h2
                        key={i}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.01 }}
                        className="text-xl font-bold text-blue-300 mt-8 mb-3 flex items-center gap-2 border-t border-blue-500/20 pt-6"
                      >
                        <RiCalendarLine className="text-blue-400" />
                        {line.replace('## ', '')}
                      </motion.h2>
                    );
                  }
                  
                  // כותרות משניות אחרות
                  if (line.startsWith('## ')) {
                    return (
                      <motion.h2
                        key={i}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.01 }}
                        className="text-xl font-bold text-blue-300 mt-5 mb-3 flex items-center gap-2"
                      >
                        <RiSuitcaseLine className="text-blue-400" />
                        {line.replace('## ', '')}
                      </motion.h2>
                    );
                  }

                  // כותרות משניות (בוקר, צהריים, ערב)
                  if (line.startsWith('### ')) {
                    const timeOfDay = line.toLowerCase();
                    let icon = <RiMapPinLine className="text-blue-400" />;
                    let colorClass = "text-blue-300";
                    
                    if (timeOfDay.includes('בוקר') || timeOfDay.includes('morning')) {
                      icon = <span className="text-yellow-300 text-xl">☀️</span>;
                      colorClass = "text-yellow-300";
                    } else if (timeOfDay.includes('צהריים') || timeOfDay.includes('afternoon')) {
                      icon = <span className="text-blue-300 text-xl">🌞</span>;
                      colorClass = "text-blue-300";
                    } else if (timeOfDay.includes('ערב') || timeOfDay.includes('evening')) {
                      icon = <span className="text-purple-300 text-xl">🌙</span>;
                      colorClass = "text-purple-300";
                    } else if (timeOfDay.includes('ארוחת') || timeOfDay.includes('lunch') || timeOfDay.includes('dinner')) {
                      icon = <RiRestaurantLine className="text-red-400" />;
                      colorClass = "text-red-300";
                    }
                    
                    return (
                      <motion.h3
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.01 }}
                        className={`text-lg font-bold ${colorClass} mt-5 mb-2 flex items-center gap-2 bg-gradient-to-r from-blue-900/10 to-transparent p-2 rounded-lg`}
                      >
                        {icon}
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
                        className="flex items-start my-2 px-3 py-2 hover:bg-blue-500/10 rounded-md transition-colors border border-blue-500/10"
                      >
                        {icon}
                        <p className="text-gray-300">{cleanText}</p>
                      </motion.div>
                    );
                  }

                  // הדגשת טיפים
                  if (line.includes("טיפ:") || line.includes("Tip:")) {
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.01 }}
                        className="bg-blue-900/20 p-3 rounded-lg my-3 border-r-4 border-blue-500"
                      >
                        <p className="text-blue-200 flex items-center gap-2">
                          <span className="text-blue-300">💡</span>
                          {line}
                        </p>
                      </motion.div>
                    );
                  }

                  // פסקאות רגילות
                  if (line.trim() === '') {
                    return <div key={i} className="h-4"></div>;
                  }

                  // הדגשת מידע חשוב
                  if (line.includes("**")) {
                    return (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.01 }}
                        className="text-gray-300 my-2"
                        dangerouslySetInnerHTML={{
                          __html: line.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-blue-200">$1</span>')
                        }}
                      />
                    );
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
            )}
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
                    <p className="text-base text-white">
                      {selectedTrip.destination || "יעד לא צוין"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RiCalendarLine className="text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-300">משך הטיול</p>
                    <p className="text-base text-white">
                      {selectedTrip.duration || "לא צוין"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RiTimeLine className="text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-300">תאריך שמירה</p>
                    <p className="text-base text-white">{formatDate(selectedTrip.createdAt)}</p>
                  </div>
                </div>
                {(selectedTrip.dates?.from && selectedTrip.dates?.to) && (
                  <div className="flex items-start gap-2">
                    <RiCalendarLine className="text-green-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-300">תאריכי הטיול</p>
                      <p className="text-base text-white">{formatDate(selectedTrip.dates.from)} - {formatDate(selectedTrip.dates.to)}</p>
                    </div>
                  </div>
                )}
                {/* Show chat ID if this is an itinerary */}
                {selectedTrip.chatId && (
                  <div className="flex items-start gap-2">
                    <RiRoadMapLine className="text-purple-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-300">מזהה שיחה</p>
                      <p className="text-base text-white">{selectedTrip.chatId}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Activity counts */}
            {selectedTrip.activityCounts && selectedTrip.activityCounts.total > 0 && (
              <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl p-4 border border-blue-500/20">
                <h3 className="text-lg font-medium text-blue-300 mb-3 flex items-center gap-1.5">
                  <RiMapPinLine className="text-blue-400" /> פעילויות בטיול
                </h3>
                <div className="activities-stats grid grid-cols-2 gap-3">
                  <div className="stat-item p-2 bg-blue-900/20 rounded-lg border border-blue-500/20">
                    <p className="text-sm text-gray-300">סה"כ פעילויות</p>
                    <p className="text-xl font-bold text-white">{selectedTrip.activityCounts.total}</p>
                  </div>
                  {selectedTrip.activityCounts.attractions > 0 && (
                    <div className="stat-item p-2 bg-green-900/20 rounded-lg border border-green-500/20">
                      <p className="text-sm text-gray-300">אטרקציות</p>
                      <p className="text-xl font-bold text-green-300">{selectedTrip.activityCounts.attractions}</p>
                    </div>
                  )}
                  {selectedTrip.activityCounts.restaurants > 0 && (
                    <div className="stat-item p-2 bg-red-900/20 rounded-lg border border-red-500/20">
                      <p className="text-sm text-gray-300">מסעדות</p>
                      <p className="text-xl font-bold text-red-300">{selectedTrip.activityCounts.restaurants}</p>
                    </div>
                  )}
                  {selectedTrip.activityCounts.hotels > 0 && (
                    <div className="stat-item p-2 bg-purple-900/20 rounded-lg border border-purple-500/20">
                      <p className="text-sm text-gray-300">מקומות לינה</p>
                      <p className="text-xl font-bold text-purple-300">{selectedTrip.activityCounts.hotels}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

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
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-3 flex items-center gap-3">
              <span className="bg-blue-500/20 p-3 rounded-xl">
                <RiSuitcaseLine className="text-blue-400" size={28} />
              </span>
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text">
                יומני המסע שלי
              </span>
            </h1>
            <p className="text-gray-400 text-lg">
              כל יומני הטיול והמסלולים שיצרת עם DreamTrip AI
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/chat/new")}
            className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl
                      transition-all flex items-center gap-2 shadow-md self-start md:self-end"
          >
            <RiPlaneLine size={20} />
            יצירת טיול חדש
          </motion.button>
        </div>

        {!hasNoContent && (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-8 bg-blue-900/10 p-4 rounded-xl border border-blue-500/20">
            <div className="flex items-center gap-1 rounded-lg bg-blue-900/20 p-1 border border-blue-500/30">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 text-sm rounded-md transition-all ${activeTab === "all" ? "bg-blue-600 text-white font-medium shadow-md" : "text-gray-300 hover:bg-blue-500/10"}`}
              >
                הכל
              </button>
              <button
                onClick={() => setActiveTab("saved")}
                className={`px-4 py-2 text-sm rounded-md transition-all ${activeTab === "saved" ? "bg-blue-600 text-white font-medium shadow-md" : "text-gray-300 hover:bg-blue-500/10"}`}
              >
                מסלולים שמורים
              </button>
              <button
                onClick={() => setActiveTab("itineraries")}
                className={`px-4 py-2 text-sm rounded-md transition-all ${activeTab === "itineraries" ? "bg-blue-600 text-white font-medium shadow-md" : "text-gray-300 hover:bg-blue-500/10"}`}
              >
                יומני מסע
              </button>
            </div>

            <div className="relative w-full md:w-auto">
              <input
                type="text"
                placeholder="חיפוש..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-blue-900/20 border border-blue-500/30 rounded-lg py-2 px-4 pl-10 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:outline-none w-full min-w-[250px]"
              />
              <RiSearchLine className="absolute left-3 top-2.5 text-gray-400" />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              )}
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
            className="relative"
          >
            <div className="absolute -top-6 -right-6 w-16 h-16 bg-blue-500/20 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-indigo-500/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="relative z-10 bg-blue-500/10 p-6 rounded-full">
              <RiMapPinLine size={100} className="text-blue-400" />
            </div>
          </motion.div>
          <h2 className="text-3xl text-blue-300 font-medium mt-8 mb-4 text-center">
            עדיין אין לך יומני מסע
          </h2>
          <p className="text-gray-300 mb-8 text-center max-w-lg">
            התחל שיחה חדשה עם DreamTrip AI כדי ליצור את יומן המסע הראשון שלך.
            <br />תוכל לתכנן טיול מושלם ולשמור אותו כאן לצפייה בכל עת.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/chat/new")}
            className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl
                      transition-all flex items-center gap-3 shadow-lg"
          >
            <RiPlaneLine size={24} />
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
              className="trips-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredTrips().map((trip) => {
                // For itineraries
                if (trip.isItinerary || trip.type === "itinerary") {
                  // שימוש בפונקציה שכבר יצרנו לבחירת תמונה לפי יעד
                  const itineraryDestination = trip.destination || trip.metadata?.destination || "יומן מסע";
                  const itineraryImage = trip.preview?.image || getDestinationImage(itineraryDestination);
                  
                  return (
                    <motion.div
                      key={trip._id || trip.id}
                      className="itinerary-card rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col h-[360px]"
                      variants={itemVariants}
                      whileHover={{ y: -8, transition: { duration: 0.2 } }}
                    >
                      {/* Card image header with overlay */}
                      <div className="card-image-container relative h-40 overflow-hidden">
                        <img 
                          src={itineraryImage} 
                          alt={itineraryDestination}
                          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/70 to-indigo-900/40 opacity-70"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          <h3 className="text-2xl font-bold text-white mb-1 truncate flex items-center gap-2">
                            <span className="bg-blue-500/50 p-1.5 rounded-full backdrop-blur-sm">
                              <RiRoadMapLine className="text-white" size={18} />
                            </span>
                            {itineraryDestination}
                          </h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(trip.duration || trip.metadata?.duration) && (
                              <span className="text-xs bg-blue-500/50 backdrop-blur-sm text-white px-2 py-1 rounded-full flex items-center">
                                <RiTimeLine className="mr-1" /> {trip.duration || trip.metadata?.duration}
                              </span>
                            )}
                            {(trip.metadata?.dates?.from || trip.dates?.from) && (
                              <span className="text-xs bg-purple-500/50 backdrop-blur-sm text-white px-2 py-1 rounded-full flex items-center">
                                <RiCalendarLine className="mr-1" />{" "}
                                {formatDate(trip.metadata?.dates?.from || trip.dates?.from)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="card-content p-5 flex-grow overflow-hidden bg-gradient-to-br from-blue-900/20 to-indigo-900/20">
                        {trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0] ? (
                          <div className="trip-day-preview">
                            <h4 className="text-sm font-medium text-blue-300 flex items-center gap-1.5 mb-3">
                              <span className="bg-blue-500/30 px-2 py-1 rounded text-xs">יום {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0]).dayNumber || 1}</span>
                              {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0]).title && (
                                <span className="truncate">{(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0]).title}</span>
                              )}
                            </h4>
                            <div className="text-sm text-gray-300 space-y-2">
                              {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0])?.activities?.morning?.[0] && (
                                <div className="activity flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                                  <span className="text-yellow-300 text-lg flex-shrink-0">☀️</span>
                                  <span className="truncate">
                                    {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0]).activities.morning[0].replace(
                                      /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                                      ""
                                    )}
                                  </span>
                                </div>
                              )}
                              {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0])?.activities?.lunch?.[0] && (
                                <div className="activity flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                                  <span className="text-blue-300 text-lg flex-shrink-0">🍽️</span>
                                  <span className="truncate">
                                    {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0]).activities.lunch[0].replace(
                                      /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                                      ""
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="preview-content">
                            {trip.preview?.description ? (
                              <div className="preview text-sm text-gray-300 bg-white/5 p-4 rounded-lg">
                                <p className="line-clamp-5">{trip.preview.description}</p>
                              </div>
                            ) : trip.content || trip.plan ? (
                              <div className="preview text-sm text-gray-300 bg-white/5 p-4 rounded-lg">
                                <p className="line-clamp-5">
                                  {(trip.content || trip.plan).split('\n').filter(line => !line.startsWith('#') && line.trim() !== '')[0] || "לחץ לצפייה ביומן המסע המלא"}
                                </p>
                              </div>
                            ) : (
                              <div className="default-activities flex flex-col items-center justify-center gap-3 mt-3 p-5 bg-white/5 rounded-lg text-center">
                                <div className="flex justify-center gap-3">
                                  <span className="activity-icon p-2 bg-blue-500/20 rounded-full">
                                    <RiSuitcaseLine className="text-blue-400" size={20} />
                                  </span>
                                  <span className="activity-icon p-2 bg-purple-500/20 rounded-full">
                                    <RiMapPinLine className="text-purple-400" size={20} />
                                  </span>
                                </div>
                                <p className="text-blue-300 font-medium mt-2">יומן מסע מפורט</p>
                              </div>
                            )}
                          </div>
                        )}

                        {(trip.structuredItinerary?.additionalInfo?.tips?.[0] || trip.structuredPlan?.additionalInfo?.tips?.[0]) && (
                          <div className="tip-preview mt-3 text-sm text-gray-300 bg-blue-500/10 p-3 rounded-lg">
                            <span className="text-blue-300 font-medium block mb-1">💡 טיפ: </span>
                            {(trip.structuredItinerary?.additionalInfo?.tips?.[0] || trip.structuredPlan?.additionalInfo?.tips?.[0]).replace(
                              /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                              ""
                            )}
                          </div>
                        )}
                      </div>

                      <div className="card-footer p-4 bg-[#181C29]/80 border-t border-indigo-500/30">
                        <button
                          onClick={() => viewItinerary(trip)}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-md py-2.5 transition-all flex items-center justify-center gap-1.5"
                        >
                          <RiEyeLine size={20} />
                          צפה ביומן המסע
                        </button>
                      </div>
                    </motion.div>
                  );
                }
                // For saved trips
                else {
                  // קביעת צבעי רקע מותאמים לפי היעד או באופן אקראי אם אין יעד
                  const displayDestination = trip.destination || "יעד הטיול שלי";
                      
                  const cardGradient = getCardGradient(displayDestination);
                  const headerGradient = "from-indigo-800/50 to-purple-800/50";
                  
                  // קביעת תמונת רקע לפי היעד
                  const cardImage = trip.preview?.image || getDestinationImage(displayDestination);
                  
                  return (
                    <motion.div
                      key={trip.id}
                      className={`saved-trip-card rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer h-[360px]`}
                      variants={itemVariants}
                      whileHover={{ y: -8, transition: { duration: 0.2 } }}
                      onClick={() => viewSavedTrip(trip.id)}
                    >
                      {/* Card image header with overlay */}
                      <div className="card-image-container relative h-40 overflow-hidden">
                        <img 
                          src={cardImage} 
                          alt={displayDestination}
                          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                        />
                        <div className={`absolute inset-0 bg-gradient-to-t ${headerGradient} opacity-60`}></div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          <h3 className="text-2xl font-bold truncate flex items-center gap-2">
                            <span className="bg-indigo-500/50 p-1.5 rounded-full backdrop-blur-sm">
                              <RiMapPinLine className="text-white" size={18} />
                            </span>
                            {displayDestination}
                          </h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs bg-blue-500/50 backdrop-blur-sm text-white px-2 py-1 rounded-full flex items-center">
                              <RiTimeLine className="mr-1" /> 
                              {trip.duration && !trip.duration.includes("Unknown") 
                                ? trip.duration 
                                : trip.structuredPlan?.days?.length > 0 
                                  ? `${trip.structuredPlan.days.length} ימים` 
                                  : trip.metadata?.duration && !trip.metadata.duration.includes("Unknown")
                                    ? trip.metadata.duration
                                    : "טיול מתוכנן"} 
                            </span>
                            <span className="text-xs bg-indigo-500/50 backdrop-blur-sm text-white px-2 py-1 rounded-full flex items-center">
                              <RiCalendarLine className="mr-1" /> {formatDate(trip.createdAt)}
                            </span>
                            {trip.activityCounts?.total > 0 && (
                              <span className="text-xs bg-green-500/50 backdrop-blur-sm text-white px-2 py-1 rounded-full flex items-center">
                                <RiMapPinLine className="mr-1" /> {trip.activityCounts.total} פעילויות
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={`card-content p-5 flex-grow overflow-hidden bg-gradient-to-br ${cardGradient} border-t border-blue-500/20`}>
                        {/* If we have structured plan days, show the first day */}
                        {trip.structuredPlan?.days && trip.structuredPlan.days.length > 0 ? (
                          <div className="trip-day-preview">
                            <h4 className="text-sm font-medium text-blue-300 flex items-center gap-1.5 mb-3">
                              <span className="bg-blue-500/30 px-2 py-1 rounded text-xs">יום {trip.structuredPlan.days[0].dayNumber}</span>
                              {trip.structuredPlan.days[0].title && <span className="truncate">{trip.structuredPlan.days[0].title}</span>}
                            </h4>
                            <div className="text-sm text-gray-300 mt-1.5 space-y-2">
                              {trip.structuredPlan.days[0].activities?.morning?.[0] && (
                                <div className="activity flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                                  <span className="text-yellow-300 text-lg flex-shrink-0">☀️</span>
                                  <span className="truncate">
                                    {trip.structuredPlan.days[0].activities.morning[0].replace(
                                      /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                                      ""
                                    )}
                                  </span>
                                </div>
                              )}
                              {trip.structuredPlan.days[0].activities?.afternoon?.[0] && (
                                <div className="activity flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                                  <span className="text-blue-300 text-lg flex-shrink-0">🌞</span>
                                  <span className="truncate">
                                    {trip.structuredPlan.days[0].activities.afternoon[0].replace(
                                      /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                                      ""
                                    )}
                                  </span>
                                </div>
                              )}
                              {trip.structuredPlan.days[0].activities?.evening?.[0] && (
                                <div className="activity flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                                  <span className="text-purple-300 text-lg flex-shrink-0">🌙</span>
                                  <span className="truncate">
                                    {trip.structuredPlan.days[0].activities.evening[0].replace(
                                      /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                                      ""
                                    )}
                                  </span>
                                </div>
                              )}
                              
                              {/* אם אין פעילויות, מציג אייקונים ברירת מחדל */}
                              {!trip.structuredPlan.days[0].activities?.morning?.[0] && 
                               !trip.structuredPlan.days[0].activities?.afternoon?.[0] && 
                               !trip.structuredPlan.days[0].activities?.evening?.[0] && (
                                <div className="default-activities flex items-center justify-center gap-3 mt-3 p-3 bg-white/5 rounded-lg">
                                  <span className="activity-icon p-2 bg-yellow-500/20 rounded-full">
                                    <RiSuitcaseLine className="text-yellow-400" size={20} />
                                  </span>
                                  <span className="activity-icon p-2 bg-blue-500/20 rounded-full">
                                    <RiMapPinLine className="text-blue-400" size={20} />
                                  </span>
                                  <span className="activity-icon p-2 bg-purple-500/20 rounded-full">
                                    <RiRestaurantLine className="text-purple-400" size={20} />
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : trip.preview?.description ? (
                          <div className="preview text-sm text-gray-300 bg-white/5 p-4 rounded-lg">
                            <p className="line-clamp-5">{trip.preview.description}</p>
                          </div>
                        ) : (
                          <div className="preview text-sm text-gray-300 bg-white/5 p-4 rounded-lg">
                            {trip.plan ? (
                              <p className="line-clamp-5">
                                {trip.plan.split('\n').filter(line => !line.startsWith('#') && line.trim() !== '')[0] || "לחץ לצפייה במסלול המלא"}
                              </p>
                            ) : (
                              <div className="text-center py-3">
                                <div className="flex justify-center gap-3 mb-3">
                                  <span className="text-blue-300 text-2xl">✈️</span>
                                  <span className="text-yellow-300 text-2xl">🌍</span>
                                  <span className="text-green-300 text-2xl">🏞️</span>
                                </div>
                                <p className="text-blue-300 font-medium">לחץ לצפייה במסלול הטיול</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Show highlights if available */}
                        {trip.structuredPlan?.highlights && trip.structuredPlan.highlights.length > 0 && (
                          <div className="highlights mt-3 flex flex-wrap gap-2">
                            {trip.structuredPlan.highlights.slice(0, 2).map((highlight, idx) => (
                              <div key={idx} className="highlight-item text-xs bg-indigo-900/30 px-3 py-1.5 rounded-lg text-indigo-300 inline-block">
                                ✨ {highlight.substring(0, 25)}{highlight.length > 25 ? '...' : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="card-footer p-4 bg-[#181C29]/80 border-t border-indigo-500/30 flex justify-between items-center">
                        <button
                          onClick={(e) => deleteSavedTrip(trip.id, e)}
                          className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-red-900/20 transition-colors"
                          title="מחק מסלול"
                        >
                          <RiDeleteBinLine size={20} />
                        </button>

                        <button
                          onClick={() => viewSavedTrip(trip.id)}
                          className="flex items-center text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
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
                  onClick={() => { setSearchTerm(""); setActiveTab("all"); }}
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
