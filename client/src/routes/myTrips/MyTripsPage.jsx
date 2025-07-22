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
  const [showRawContent, setShowRawContent] = useState(false);
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
      "budapest": "https://images.unsplash.com/photo-1551867633-194f125bddfa?q=80&w=1200&auto=format&fit=crop",
      "athens": "https://images.unsplash.com/photo-1558435508-f040c5f83a47?q=80&w=1200&auto=format&fit=crop",
      "madrid": "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?q=80&w=1200&auto=format&fit=crop",
      "lisbon": "https://images.unsplash.com/photo-1558370781-d6196949e317?q=80&w=1200&auto=format&fit=crop",
      "florence": "https://images.unsplash.com/photo-1543429257-3eb0b65d9e38?q=80&w=1200&auto=format&fit=crop",
      "venice": "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?q=80&w=1200&auto=format&fit=crop",
      "santorini": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1200&auto=format&fit=crop",
      "zurich": "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?q=80&w=1200&auto=format&fit=crop",
      "munich": "https://images.unsplash.com/photo-1595867818082-083862f3d630?q=80&w=1200&auto=format&fit=crop",
      "copenhagen": "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?q=80&w=1200&auto=format&fit=crop",
      "stockholm": "https://images.unsplash.com/photo-1588653818221-2651ec1a6423?q=80&w=1200&auto=format&fit=crop",
      "oslo": "https://images.unsplash.com/photo-1608304908553-88a225f9a8c6?q=80&w=1200&auto=format&fit=crop",
      
      // ערים באסיה
      "tokyo": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1200&auto=format&fit=crop",
      "kyoto": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop",
      "osaka": "https://images.unsplash.com/photo-1590559899731-a382839e5549?q=80&w=1200&auto=format&fit=crop",
      "seoul": "https://images.unsplash.com/photo-1538485399081-7c9f2d4b5bc1?q=80&w=1200&auto=format&fit=crop",
      "busan": "https://images.unsplash.com/photo-1617541086271-4d43983398e3?q=80&w=1200&auto=format&fit=crop",
      "bangkok": "https://images.unsplash.com/photo-1563492065599-3520f775eeed?q=80&w=1200&auto=format&fit=crop",
      "singapore": "https://images.unsplash.com/photo-1565967511849-76a60a516170?q=80&w=1200&auto=format&fit=crop",
      "hong kong": "https://images.unsplash.com/photo-1506970845246-18f21d533b20?q=80&w=1200&auto=format&fit=crop",
      "beijing": "https://images.unsplash.com/photo-1599571234909-29ed5d1321d6?q=80&w=1200&auto=format&fit=crop",
      "shanghai": "https://images.unsplash.com/photo-1538428494232-9c0d8a3ab403?q=80&w=1200&auto=format&fit=crop",
      "taipei": "https://images.unsplash.com/photo-1598935898639-81daa59cf7c8?q=80&w=1200&auto=format&fit=crop",
      "hanoi": "https://images.unsplash.com/photo-1583417319070-4a69db38a482?q=80&w=1200&auto=format&fit=crop",
      "ho chi minh": "https://images.unsplash.com/photo-1583417319070-4a69db38a482?q=80&w=1200&auto=format&fit=crop",
      "kuala lumpur": "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?q=80&w=1200&auto=format&fit=crop",
      "bali": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop",
      
      // ערים בארה"ב
      "new york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1200&auto=format&fit=crop",
      "los angeles": "https://images.unsplash.com/photo-1580655653885-65763b2597d0?q=80&w=1200&auto=format&fit=crop",
      "san francisco": "https://images.unsplash.com/photo-1521464302861-ce943915d1c3?q=80&w=1200&auto=format&fit=crop",
      "las vegas": "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?q=80&w=1200&auto=format&fit=crop",
      "miami": "https://images.unsplash.com/photo-1535498730771-e735b998cd64?q=80&w=1200&auto=format&fit=crop",
      "chicago": "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?q=80&w=1200&auto=format&fit=crop",
      "boston": "https://images.unsplash.com/photo-1501979376754-f817c5eb9be2?q=80&w=1200&auto=format&fit=crop",
      "seattle": "https://images.unsplash.com/photo-1538097304804-2a1b932466a9?q=80&w=1200&auto=format&fit=crop",
      "washington dc": "https://images.unsplash.com/photo-1617581629397-0c2b8c08e92d?q=80&w=1200&auto=format&fit=crop",
      "new orleans": "https://images.unsplash.com/photo-1571893544028-06b07bf5a404?q=80&w=1200&auto=format&fit=crop",
      "austin": "https://images.unsplash.com/photo-1530089711124-9ca31fb9e863?q=80&w=1200&auto=format&fit=crop",
      "nashville": "https://images.unsplash.com/photo-1545419913-775e3e82c7db?q=80&w=1200&auto=format&fit=crop",
      
      // יעדים במזרח התיכון
      "dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop",
      "istanbul": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1200&auto=format&fit=crop",
      "tel aviv": "https://images.unsplash.com/photo-1544971587-b842c27f8e14?q=80&w=1200&auto=format&fit=crop",
      "jerusalem": "https://images.unsplash.com/photo-1529106492281-b02200cec7ec?q=80&w=1200&auto=format&fit=crop",
      "eilat": "https://images.unsplash.com/photo-1559628233-100c798642d4?q=80&w=1200&auto=format&fit=crop",
      "amman": "https://images.unsplash.com/photo-1534571688991-2d4c8d3c3568?q=80&w=1200&auto=format&fit=crop",
      "cairo": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?q=80&w=1200&auto=format&fit=crop",
      "abu dhabi": "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=1200&auto=format&fit=crop",
      "doha": "https://images.unsplash.com/photo-1562693315-95c5714f67ef?q=80&w=1200&auto=format&fit=crop",
      
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
      "germany": "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1200&auto=format&fit=crop",
      "switzerland": "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=1200&auto=format&fit=crop",
      "austria": "https://images.unsplash.com/photo-1609880132805-8c3cfdcfa244?q=80&w=1200&auto=format&fit=crop",
      "netherlands": "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?q=80&w=1200&auto=format&fit=crop",
      "portugal": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?q=80&w=1200&auto=format&fit=crop",
      "czech republic": "https://images.unsplash.com/photo-1592906209472-a36b1f3782ef?q=80&w=1200&auto=format&fit=crop",
      "hungary": "https://images.unsplash.com/photo-1551867633-194f125bddfa?q=80&w=1200&auto=format&fit=crop",
      "korea": "https://images.unsplash.com/photo-1538485399081-7c9f2d4b5bc1?q=80&w=1200&auto=format&fit=crop",
      "china": "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?q=80&w=1200&auto=format&fit=crop",
      "vietnam": "https://images.unsplash.com/photo-1583417319070-4a69db38a482?q=80&w=1200&auto=format&fit=crop",
      "malaysia": "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?q=80&w=1200&auto=format&fit=crop",
      "indonesia": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop",
      "australia": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=1200&auto=format&fit=crop",
      "new zealand": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200&auto=format&fit=crop",
      "canada": "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?q=80&w=1200&auto=format&fit=crop",
      "mexico": "https://images.unsplash.com/photo-1518638150340-f706e86654de?q=80&w=1200&auto=format&fit=crop",
      
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
      
      console.log("Raw trip data:", tripData);
      
      // עדכון היעד ומשך הטיול אם חסרים
      if (!tripData.destination || tripData.destination === "Unknown destination" || tripData.destination === "") {
        if (tripData.metadata?.destination && tripData.metadata.destination !== "Unknown destination" && tripData.metadata.destination !== "") {
          tripData.destination = tripData.metadata.destination;
        }
        else if (tripData.structuredPlan?.destination && tripData.structuredPlan.destination !== "Unknown destination" && tripData.structuredPlan.destination !== "") {
          tripData.destination = tripData.structuredPlan.destination;
        }
        else if (tripData.tripDetails?.destination && tripData.tripDetails.destination !== "Unknown destination" && tripData.tripDetails.destination !== "") {
          tripData.destination = tripData.tripDetails.destination;
        }
        else if (tripData.rawContent || tripData.content) {
          // Try to extract destination from content
          const content = tripData.rawContent || tripData.content;
          const destinationMatch = content.match(/(?:יעד|destination):\s*([^\n]+)/i);
          if (destinationMatch) {
            tripData.destination = destinationMatch[1].trim();
          } else {
            // Look for destination in first lines
            const lines = content.split('\n').slice(0, 10);
            const destinationLine = lines.find(line => 
              line.match(/(?:יעד|destination|מיקום|location):\s*(.+)/i) || 
              line.match(/טיול ב(.+)/i) ||
              line.match(/טיול ל(.+)/i) ||
              line.match(/Trip to (.+)/i)
            );
            
            if (destinationLine) {
              const destMatch = destinationLine.match(/(?:יעד|destination|מיקום|location):\s*(.+)/i) || 
                                destinationLine.match(/טיול ב(.+)/i) ||
                                destinationLine.match(/טיול ל(.+)/i) ||
                                destinationLine.match(/Trip to (.+)/i);
              
              if (destMatch) {
                tripData.destination = destMatch[1].trim();
              }
            }
          }
        }
      }
      
      // Clean up the destination name for display
      if (tripData.destination) {
        tripData.destination = getCleanDestinationName(tripData.destination);
      }
      
      if (!tripData.duration || tripData.duration === "Unknown duration" || tripData.duration.includes("Unknown")) {
        if (tripData.metadata?.duration && !tripData.metadata.duration.includes("Unknown")) {
          tripData.duration = tripData.metadata.duration;
        }
        else if (tripData.structuredPlan?.days?.length > 0) {
          tripData.duration = `${tripData.structuredPlan.days.length} ימים`;
        }
      }

      
      // בדיקה אם יש תוכן כלשהו
      const hasContent = tripData.rawContent || tripData.plan || tripData.content;
      
      // אם אין תוכן כלל, ננסה ליצור אותו מהמבנה המובנה
      if (!hasContent && tripData.structuredPlan && tripData.structuredPlan.days && tripData.structuredPlan.days.length > 0) {
        console.log("No content found, creating from structured plan");
        tripData.rawContent = createContentFromStructuredPlan(tripData.structuredPlan);
      }
      
      // עיבוד ה-rawContent אם קיים
      if (tripData.rawContent) {
        console.log("Raw content found:", tripData.rawContent.substring(0, 200) + "...");
        
        // המרת ה-rawContent למבנה מסודר
        tripData.processedContent = processRawContent(tripData.rawContent);
        console.log("Processed content:", tripData.processedContent.substring(0, 200) + "...");
        
        // אם אין תוכן מובנה, ננסה ליצור אותו מה-rawContent
        if (!tripData.structuredPlan || !tripData.structuredPlan.days || tripData.structuredPlan.days.length === 0) {
          tripData.structuredPlan = extractStructuredPlanFromRawContent(tripData.rawContent);
          console.log("Created structured plan:", tripData.structuredPlan);
        }
      } else {
        console.log("No raw content found in trip data");
        
        // אם אין rawContent, ננסה להשתמש ב-plan או content
        if (tripData.plan) {
          console.log("Using plan as raw content");
          tripData.rawContent = tripData.plan;
          tripData.processedContent = processRawContent(tripData.plan);
        } else if (tripData.content) {
          console.log("Using content as raw content");
          tripData.rawContent = tripData.content;
          tripData.processedContent = processRawContent(tripData.content);
        }
      }
      
      console.log("Viewing trip with data:", {
        id: tripData.id,
        destination: tripData.destination,
        duration: tripData.duration,
        hasRawContent: !!tripData.rawContent,
        hasProcessedContent: !!tripData.processedContent,
        hasStructuredPlan: !!(tripData.structuredPlan && tripData.structuredPlan.days),
        contentType: tripData.processedContent ? "processed" : tripData.rawContent ? "raw" : tripData.plan ? "plan" : tripData.content ? "content" : "none"
      });
      
      setSelectedTrip(tripData);
    } catch (error) {
      console.error("שגיאה בטעינת מסלול שמור:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // פונקציה ליצירת תוכן טקסטואלי ממבנה מובנה
  const createContentFromStructuredPlan = (structuredPlan) => {
    if (!structuredPlan || !structuredPlan.days || structuredPlan.days.length === 0) {
      return null;
    }
    
    let content = [];
    
    // כותרת ראשית
    content.push(`# יומן מסע${structuredPlan.destination ? ` - ${structuredPlan.destination}` : ''}`);
    content.push('');
    
    // מידע כללי
    if (structuredPlan.destination) {
      content.push(`**יעד:** ${structuredPlan.destination}`);
    }
    
    if (structuredPlan.duration) {
      content.push(`**משך:** ${structuredPlan.duration}`);
    }
    
    if (structuredPlan.summary) {
      content.push('');
      content.push(structuredPlan.summary);
    }
    
    content.push('');
    
    // הוספת הימים
    structuredPlan.days.forEach(day => {
      content.push(`## ${day.title || `יום ${day.dayNumber}`}`);
      content.push('');
      
      // בוקר
      if (day.activities?.morning && day.activities.morning.length > 0) {
        content.push('### בוקר');
        day.activities.morning.forEach(activity => {
          content.push(`- ${activity}`);
        });
        content.push('');
      }
      
      // צהריים
      if (day.activities?.lunch && day.activities.lunch.length > 0) {
        content.push('### ארוחת צהריים');
        day.activities.lunch.forEach(activity => {
          content.push(`- ${activity}`);
        });
        content.push('');
      }
      
      // אחר הצהריים
      if (day.activities?.afternoon && day.activities.afternoon.length > 0) {
        content.push('### צהריים');
        day.activities.afternoon.forEach(activity => {
          content.push(`- ${activity}`);
        });
        content.push('');
      }
      
      // ערב
      if (day.activities?.evening && day.activities.evening.length > 0) {
        content.push('### ערב');
        day.activities.evening.forEach(activity => {
          content.push(`- ${activity}`);
        });
        content.push('');
      }
      
      // ארוחת ערב
      if (day.activities?.dinner && day.activities.dinner.length > 0) {
        content.push('### ארוחת ערב');
        day.activities.dinner.forEach(activity => {
          content.push(`- ${activity}`);
        });
        content.push('');
      }
    });
    
    // טיפים
    if (structuredPlan.additionalInfo?.tips && structuredPlan.additionalInfo.tips.length > 0) {
      content.push('## טיפים והמלצות');
      content.push('');
      structuredPlan.additionalInfo.tips.forEach(tip => {
        content.push(`💡 טיפ: ${tip}`);
        content.push('');
      });
    }
    
    return content.join('\n');
  };

  // פונקציה לעיבוד ה-rawContent
  const processRawContent = (rawContent) => {
    if (!rawContent) return null;
    
    // נסה לזהות את הפורמט של ה-rawContent
    const isStructuredFormat = rawContent.includes("**Destination:**") || 
                              rawContent.includes("**Dates:**") || 
                              rawContent.includes("**Budget Level:**") ||
                              rawContent.includes("## Morning") || 
                              rawContent.includes("## Afternoon") || 
                              rawContent.includes("## Evening") ||
                              rawContent.includes("## בוקר") || 
                              rawContent.includes("## צהריים") || 
                              rawContent.includes("## ערב");
    
    if (isStructuredFormat) {
      // אם זה בפורמט מובנה, נשאיר את זה כמו שהוא כדי שהפארסר שלנו יטפל בזה
      return rawContent;
    }
    
    // אם זה לא בפורמט מובנה, ננסה לארגן את זה בצורה טובה יותר
    const lines = rawContent.split('\n');
    let formattedContent = [];
    let currentDay = null;
    let dayCounter = 0;
    
    // חיפוש יעד וזמן
    let destination = "";
    let duration = "";
    
    // חיפוש כותרת ראשית
    const titleLine = lines.find(line => 
      line.includes("טיול") || 
      line.includes("מסלול") || 
      line.includes("יומן מסע") ||
      line.includes("Trip to") ||
      line.includes("Itinerary") ||
      line.includes("Travel") ||
      line.match(/[A-Za-z\s]+ Vacation/i) ||
      line.match(/[A-Za-z\s]+ Tour/i) ||
      line.match(/[A-Za-z\s]+ Journey/i)
    );
    
    // חיפוש יעד
    const destinationLine = lines.find(line => 
      line.match(/יעד:?\s*(.+)/i) || 
      line.match(/destination:?\s*(.+)/i) ||
      line.match(/מיקום:?\s*(.+)/i) ||
      line.match(/location:?\s*(.+)/i) ||
      line.match(/טיול ב(.+)/i) ||
      line.match(/טיול ל(.+)/i) ||
      line.match(/Trip to (.+)/i)
    );
    
    if (destinationLine) {
      const destMatch = destinationLine.match(/(?:יעד|destination|מיקום|location):?\s*(.+)/i) || 
                        destinationLine.match(/טיול ב(.+)/i) ||
                        destinationLine.match(/טיול ל(.+)/i) ||
                        destinationLine.match(/Trip to (.+)/i);
      
      if (destMatch) {
        destination = destMatch[1].trim();
      }
    }
    
    // חיפוש משך
    const durationLine = lines.find(line => 
      line.match(/(?:משך|duration|אורך|length):?\s*(.+)/i) ||
      line.match(/(\d+)\s+(?:ימים|days)/i) ||
      line.match(/טיול (?:בן|של) (\d+) (?:ימים|days)/i)
    );
    
    if (durationLine) {
      const durMatch = durationLine.match(/(?:משך|duration|אורך|length):?\s*(.+)/i) ||
                       durationLine.match(/(\d+)\s+(?:ימים|days)/i) ||
                       durationLine.match(/טיול (?:בן|של) (\d+) (?:ימים|days)/i);
      
      if (durMatch) {
        duration = durMatch[1].trim();
      }
    }
    
    // יצירת כותרת ראשית
    if (titleLine) {
      let title = titleLine.trim();
      
      // אם יש לנו יעד ומשך, ננסה להוסיף אותם לכותרת
      if (destination && !title.includes(destination)) {
        title = `${title} - ${destination}`;
      }
      
      if (duration && !title.includes(duration)) {
        title = `${title} (${duration})`;
      }
      
      formattedContent.push(`# ${title}`);
    } else {
      // אם אין כותרת, ננסה ליצור אחת
      let title = "יומן מסע";
      
      if (destination) {
        title = `יומן מסע - ${destination}`;
      }
      
      if (duration) {
        title = `${title} (${duration})`;
      }
      
      formattedContent.push(`# ${title}`);
    }
    
    // הוספת מידע על היעד והמשך אם הם לא נכללו בכותרת
    if (destination && !formattedContent[0].includes(destination)) {
      formattedContent.push(`**יעד:** ${destination}`);
    }
    
    if (duration && !formattedContent[0].includes(duration)) {
      formattedContent.push(`**משך:** ${duration}`);
    }
    
    formattedContent.push(''); // שורה ריקה לאחר הכותרת
    
    // עיבוד השורות
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // דילוג על שורות ריקות ושורות שכבר עיבדנו (כותרת, יעד, משך)
      if (!line || 
          line === titleLine || 
          line === destinationLine || 
          line === durationLine) {
        continue;
      }
      
      // זיהוי יום חדש
      const dayMatch = line.match(/(?:יום|day)\s+(\d+)/i);
      if (dayMatch || 
          line.startsWith("יום:") || 
          line.startsWith("Day:") ||
          line.match(/^יום\s+[א-ת]'?$/i) || // יום א', יום ב' וכו'
          line.match(/^Day\s+\d+:?/i)) {
        dayCounter++;
        currentDay = line;
        formattedContent.push(`\n## ${currentDay}`);
        continue;
      }
      
      // זיהוי חלקי היום
      if (line.match(/בוקר/i) || line.match(/morning/i)) {
        formattedContent.push(`\n### בוקר`);
        continue;
      }
      
      if (line.match(/צהריים/i) || line.match(/afternoon/i)) {
        formattedContent.push(`\n### צהריים`);
        continue;
      }
      
      if (line.match(/ערב/i) || line.match(/evening/i)) {
        formattedContent.push(`\n### ערב`);
        continue;
      }
      
      if (line.match(/ארוחת צהריים/i) || line.match(/lunch/i)) {
        formattedContent.push(`\n### ארוחת צהריים`);
        continue;
      }
      
      if (line.match(/ארוחת ערב/i) || line.match(/dinner/i)) {
        formattedContent.push(`\n### ארוחת ערב`);
        continue;
      }
      
      // זיהוי פעילויות
      if (line.match(/^[*-]/) || 
          (i > 0 && lines[i-1].match(/בוקר|צהריים|ערב|morning|afternoon|evening|lunch|dinner/i)) ||
          line.match(/^\d+[\.\)]/) || // רשימה ממוספרת
          line.match(/^[A-Za-z\u0590-\u05FF][\.\)]/) // רשימה עם אותיות
         ) {
        // בדיקה אם זו פעילות או אטרקציה
        if (line.includes("אטרקציה") || 
            line.includes("ביקור") || 
            line.includes("סיור") || 
            line.includes("visit") || 
            line.includes("tour") || 
            line.includes("attraction") ||
            line.includes("מוזיאון") ||
            line.includes("museum") ||
            line.includes("גן") ||
            line.includes("park") ||
            line.includes("אתר") ||
            line.includes("site")) {
          
          // אם זה כבר מתחיל עם סימון רשימה, נשאיר כמו שהוא
          if (line.match(/^[*-]/)) {
            formattedContent.push(line);
          } else {
            formattedContent.push(`- ${line}`);
          }
        }
        // בדיקה אם זו מסעדה או ארוחה
        else if (line.includes("מסעדה") || 
                line.includes("ארוחה") || 
                line.includes("restaurant") || 
                line.includes("meal") || 
                line.includes("lunch") || 
                line.includes("dinner") ||
                line.includes("food") ||
                line.includes("אוכל")) {
          
          if (line.match(/^[*-]/)) {
            formattedContent.push(line);
          } else {
            formattedContent.push(`- ${line}`);
          }
        }
        // בדיקה אם זה מלון או לינה
        else if (line.includes("מלון") || 
                line.includes("לינה") || 
                line.includes("hotel") || 
                line.includes("accommodation") || 
                line.includes("stay") ||
                line.includes("lodge") ||
                line.includes("hostel") ||
                line.includes("אכסניה") ||
                line.includes("צימר")) {
          
          if (line.match(/^[*-]/)) {
            formattedContent.push(line);
          } else {
            formattedContent.push(`- ${line}`);
          }
        }
        // אחרת, זו סתם פעילות
        else if (!line.match(/^[*-]/)) {
          formattedContent.push(`- ${line}`);
        } else {
          formattedContent.push(line);
        }
        continue;
      }
      
      // זיהוי טיפים
      if (line.includes("טיפ") || 
          line.includes("המלצה") || 
          line.includes("tip") || 
          line.includes("recommendation") ||
          line.includes("הערה") ||
          line.includes("note") ||
          line.includes("חשוב לדעת") ||
          line.includes("important to know")) {
        
        if (line.includes("💡") || line.includes("טיפ:") || line.includes("Tip:")) {
          formattedContent.push(line);
        } else {
          formattedContent.push(`💡 טיפ: ${line}`);
        }
        continue;
      }
      
      // שורות רגילות
      formattedContent.push(line);
    }
    
    // אם לא זיהינו ימים, ננסה ליצור מבנה של ימים
    if (dayCounter === 0) {
      const content = formattedContent.join('\n');
      const newContent = [];
      
      // הוספת הכותרת הראשית
      if (content.startsWith('# ')) {
        const titleLines = content.split('\n').filter(line => line.startsWith('# ') || line.startsWith('**יעד') || line.startsWith('**משך'));
        titleLines.forEach(line => newContent.push(line));
      } else {
        newContent.push("# יומן מסע");
      }
      
      newContent.push(''); // שורה ריקה
      
      // חלוקה לפסקאות
      const paragraphs = content.split('\n\n')
        .filter(p => p.trim() && !p.startsWith('# ') && !p.startsWith('**יעד') && !p.startsWith('**משך'));
      
      // אם יש יותר מפסקה אחת, נניח שכל פסקה היא יום
      if (paragraphs.length > 1) {
        paragraphs.forEach((paragraph, index) => {
          newContent.push(`\n## יום ${index + 1}`);
          newContent.push(paragraph);
        });
      } else if (paragraphs.length === 1) {
        // אם יש רק פסקה אחת, ננסה לחלק אותה לימים לפי שורות
        const lines = paragraphs[0].split('\n').filter(line => line.trim());
        
        if (lines.length >= 3) {
          // חלוקה לשלושה ימים
          const daySize = Math.ceil(lines.length / 3);
          
          for (let i = 0; i < 3; i++) {
            const dayLines = lines.slice(i * daySize, (i + 1) * daySize);
            if (dayLines.length > 0) {
              newContent.push(`\n## יום ${i + 1}`);
              newContent.push(dayLines.join('\n'));
            }
          }
        } else {
          // אם אין מספיק שורות, פשוט נציג את הכל כיום אחד
          newContent.push(`\n## יום 1`);
          newContent.push(paragraphs[0]);
        }
      }
      
      return newContent.join('\n');
    }
    
    return formattedContent.join('\n');
  };
  
  // פונקציה ליצירת מבנה מסודר מה-rawContent
  const extractStructuredPlanFromRawContent = (rawContent) => {
    if (!rawContent) return null;
    
    const structuredPlan = {
      days: []
    };
    
    const lines = rawContent.split('\n');
    let currentDay = null;
    let currentSection = null;
    let currentDayNumber = 0;
    
    // חיפוש יעד וזמן
    const destinationMatch = rawContent.match(/(?:יעד|destination):\s*([^\n]+)/i);
    if (destinationMatch) {
      structuredPlan.destination = destinationMatch[1].trim();
    }
    
    const durationMatch = rawContent.match(/(?:משך|duration):\s*([^\n]+)/i);
    if (durationMatch) {
      structuredPlan.duration = durationMatch[1].trim();
    }
    
    // עיבוד השורות
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // דילוג על שורות ריקות
      if (!line) continue;
      
      // זיהוי יום חדש
      const dayMatch = line.match(/(?:יום|day)\s+(\d+)/i);
      if (dayMatch || line.startsWith("יום:") || line.startsWith("Day:")) {
        currentDayNumber++;
        currentDay = {
          dayNumber: currentDayNumber,
          title: line,
          activities: {
            morning: [],
            afternoon: [],
            evening: [],
            lunch: [],
            dinner: []
          }
        };
        structuredPlan.days.push(currentDay);
        currentSection = null;
        continue;
      }
      
      // אם אין יום נוכחי, נדלג
      if (!currentDay) continue;
      
      // זיהוי חלקי היום
      if (line.match(/בוקר/i) || line.match(/morning/i)) {
        currentSection = "morning";
        continue;
      }
      
      if (line.match(/צהריים/i) || line.match(/afternoon/i)) {
        currentSection = "afternoon";
        continue;
      }
      
      if (line.match(/ערב/i) || line.match(/evening/i)) {
        currentSection = "evening";
        continue;
      }
      
      if (line.match(/ארוחת צהריים/i) || line.match(/lunch/i)) {
        currentSection = "lunch";
        continue;
      }
      
      if (line.match(/ארוחת ערב/i) || line.match(/dinner/i)) {
        currentSection = "dinner";
        continue;
      }
      
      // אם יש סעיף נוכחי והשורה מתחילה ב- * או - או שהיא לא ריקה, נוסיף אותה לפעילויות
      if (currentSection && line) {
        const cleanLine = line.replace(/^[*-]\s*/, '');
        if (cleanLine) {
          currentDay.activities[currentSection].push(cleanLine);
        }
      }
    }
    
    // אם לא זיהינו ימים, ננסה ליצור מבנה של יום אחד
    if (structuredPlan.days.length === 0) {
      const activities = [];
      
      // חיפוש פעילויות
      const activityMatches = rawContent.match(/[*-]\s*([^\n]+)/g);
      if (activityMatches) {
        activityMatches.forEach(match => {
          activities.push(match.replace(/^[*-]\s*/, ''));
        });
      }
      
      // יצירת יום אחד עם כל הפעילויות
      structuredPlan.days.push({
        dayNumber: 1,
        title: "יום 1",
        activities: {
          morning: activities.slice(0, Math.ceil(activities.length / 3)),
          afternoon: activities.slice(Math.ceil(activities.length / 3), Math.ceil(activities.length * 2 / 3)),
          evening: activities.slice(Math.ceil(activities.length * 2 / 3))
        }
      });
    }
    
    return structuredPlan;
  };

  // פונקציה לצפייה ביומן מסע
  const viewItinerary = async (itinerary) => {
    try {
      setLoading(true);
      // כאן אנחנו משתמשים בנתונים שכבר קיימים ברשימה
      // אם יש צורך בפרטים נוספים, אפשר לבקש אותם מהשרת
      
      console.log("Raw itinerary data:", itinerary);
      
      // Ensure we have the best available destination
      const itineraryDestination = itinerary.destination || 
                                  itinerary.metadata?.destination || 
                                  itinerary.structuredContent?.destination ||
                                  itinerary.structuredItinerary?.destination;
      
      // עיבוד הנתונים כדי שיתאימו לפורמט של מסלול שמור
      const processedItinerary = {
        ...itinerary,
        isItinerary: true,
        destination: getCleanDestinationName(itineraryDestination) || "יומן מסע",
        duration: itinerary.duration || itinerary.metadata?.duration || "טיול מתוכנן",
        plan: itinerary.content || itinerary.plan || "",
        structuredPlan: itinerary.structuredItinerary || itinerary.structuredPlan || {}
      };
      
      // Try to extract destination from content if still missing
      if (!processedItinerary.destination || processedItinerary.destination === "יומן מסע") {
        const content = itinerary.rawContent || itinerary.content || itinerary.plan;
        if (content) {
          const destinationMatch = content.match(/(?:יעד|destination):\s*([^\n]+)/i);
          if (destinationMatch) {
            const extractedDestination = destinationMatch[1].trim();
            processedItinerary.destination = getCleanDestinationName(extractedDestination) || "יומן מסע";
          }
        }
      }
      
      // בדיקה אם יש תוכן כלשהו
      const hasContent = itinerary.rawContent || itinerary.content || itinerary.plan;
      
      // אם אין תוכן כלל, ננסה ליצור אותו מהמבנה המובנה
      if (!hasContent && 
          (itinerary.structuredItinerary || itinerary.structuredPlan) && 
          ((itinerary.structuredItinerary?.days && itinerary.structuredItinerary.days.length > 0) || 
           (itinerary.structuredPlan?.days && itinerary.structuredPlan.days.length > 0))) {
        console.log("No content found in itinerary, creating from structured plan");
        processedItinerary.rawContent = createContentFromStructuredPlan(
          itinerary.structuredItinerary || itinerary.structuredPlan
        );
      }
      
      // עיבוד ה-rawContent אם קיים
      if (itinerary.rawContent) {
        console.log("Raw content found in itinerary:", itinerary.rawContent.substring(0, 200) + "...");
        
        // המרת ה-rawContent למבנה מסודר
        processedItinerary.processedContent = processRawContent(itinerary.rawContent);
        console.log("Processed content for itinerary:", processedItinerary.processedContent.substring(0, 200) + "...");
        
        // אם אין תוכן מובנה, ננסה ליצור אותו מה-rawContent
        if (!processedItinerary.structuredPlan || !processedItinerary.structuredPlan.days || processedItinerary.structuredPlan.days.length === 0) {
          processedItinerary.structuredPlan = extractStructuredPlanFromRawContent(itinerary.rawContent);
          console.log("Created structured plan for itinerary:", processedItinerary.structuredPlan);
        }
      } else {
        console.log("No raw content found in itinerary");
        
        // אם אין rawContent, ננסה להשתמש ב-plan או content
        if (itinerary.content) {
          console.log("Using content as raw content for itinerary");
          processedItinerary.rawContent = itinerary.content;
          processedItinerary.processedContent = processRawContent(itinerary.content);
        } else if (itinerary.plan) {
          console.log("Using plan as raw content for itinerary");
          processedItinerary.rawContent = itinerary.plan;
          processedItinerary.processedContent = processRawContent(itinerary.plan);
        } else if (processedItinerary.rawContent) {
          // אם יצרנו rawContent מהמבנה המובנה
          console.log("Using created raw content for itinerary");
          processedItinerary.processedContent = processRawContent(processedItinerary.rawContent);
        }
      }
      
      console.log("Viewing itinerary:", {
        id: processedItinerary._id || processedItinerary.id,
        destination: processedItinerary.destination,
        duration: processedItinerary.duration,
        hasRawContent: !!processedItinerary.rawContent,
        hasProcessedContent: !!processedItinerary.processedContent,
        hasStructuredPlan: !!(processedItinerary.structuredPlan && processedItinerary.structuredPlan.days),
        contentType: processedItinerary.processedContent ? "processed" : processedItinerary.rawContent ? "raw" : processedItinerary.plan ? "plan" : processedItinerary.content ? "content" : "none"
      });
      
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
        else if (trip.structuredContent?.destination && trip.structuredContent.destination !== "Unknown destination" && trip.structuredContent.destination !== "") {
          trip.destination = trip.structuredContent.destination;
        }
        else if (trip.structuredItinerary?.destination && trip.structuredItinerary.destination !== "Unknown destination" && trip.structuredItinerary.destination !== "") {
          trip.destination = trip.structuredItinerary.destination;
        }
        // Extract from rawContent or content if other options fail
        else if (trip.rawContent || trip.content) {
          const content = trip.rawContent || trip.content;
          const destinationMatch = content.match(/(?:יעד|destination):\s*([^\n]+)/i);
          if (destinationMatch) {
            trip.destination = destinationMatch[1].trim();
          }
        }
      }
      
      // Clean up the destination
      if (trip.destination) {
        trip.destination = getCleanDestinationName(trip.destination);
      } else {
        trip.destination = "יעד הטיול";
      }
      
      // וודא שיש משך טיול
      if (!trip.duration || trip.duration === "Unknown duration" || trip.duration.includes("Unknown")) {
        if (trip.metadata?.duration && !trip.metadata.duration.includes("Unknown")) {
          trip.duration = trip.metadata.duration;
        }
        else if (trip.structuredPlan?.days?.length > 0) {
          trip.duration = `${trip.structuredPlan.days.length} ימים`;
        }
        else if (trip.structuredContent?.days?.length > 0) {
          trip.duration = `${trip.structuredContent.days.length} ימים`;
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

  // Add a helper function to extract clean destination names
  const getCleanDestinationName = (rawDestination) => {
    if (!rawDestination) return "";
    
    // If it looks like a JSON object or contains HTML/markdown formatting, extract just the text
    if (rawDestination.includes('{') || rawDestination.includes('<') || 
        rawDestination.includes('**') || rawDestination.includes('#')) {
      try {
        // Try to parse if it's JSON
        if (rawDestination.includes('{')) {
          try {
            const parsed = JSON.parse(rawDestination);
            if (parsed.destination) return parsed.destination;
            if (parsed.name) return parsed.name;
            if (parsed.city) return parsed.city;
          } catch (e) {
            // Not valid JSON, continue with other cleaning methods
          }
        }
        
        // Remove markdown formatting
        let cleaned = rawDestination
          .replace(/\*\*/g, '')  // Remove bold markers
          .replace(/\*/g, '')    // Remove italic markers
          .replace(/\#\s+/g, '') // Remove headings
          .replace(/\<[^>]*\>/g, ''); // Remove HTML tags
          
        // If it still contains structured data indicators after cleaning
        if (cleaned.includes('{') || cleaned.includes('[') || 
            cleaned.includes('destination:') || cleaned.includes('name:')) {
          // Extract just the first word that looks like a place name
          const placeMatch = cleaned.match(/([A-Za-z\u0590-\u05FF]+(?:\s+[A-Za-z\u0590-\u05FF]+){0,2})/);
          if (placeMatch) {
            return placeMatch[1];
          }
        }
        
        // If destination is too long, truncate it
        if (cleaned.length > 30) {
          return cleaned.substring(0, 30) + "...";
        }
        
        return cleaned;
      } catch (e) {
        console.log("Error cleaning destination:", e);
        return rawDestination.substring(0, 30); // Return truncated version as fallback
      }
    }
    
    // It's already a clean string
    return rawDestination;
  };

  // אם נבחר מסלול שמור להצגה
  if (selectedTrip) {
    // Make sure the plan content is available
    const planContent = selectedTrip.processedContent || selectedTrip.plan || selectedTrip.content || selectedTrip.rawContent || "";
    
    console.log("Content type used for display:", 
      selectedTrip.processedContent ? "processedContent" : 
      selectedTrip.plan ? "plan" : 
      selectedTrip.content ? "content" : 
      selectedTrip.rawContent ? "rawContent" : "empty string");
    
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
            {/* תצוגת ה-rawContent */}
            <div className="raw-content-view bg-gray-900/50 p-6 rounded-lg mb-4 overflow-auto text-base">
              <h3 className="text-xl font-bold text-blue-300 mb-4 flex items-center gap-2">
                <RiRoadMapLine className="text-blue-400" />
                {selectedTrip.destination || "יומן מסע"}
              </h3>
              <pre className="whitespace-pre-wrap text-gray-300 font-mono">
                {selectedTrip.rawContent || selectedTrip.plan || selectedTrip.content || "אין תוכן זמין"}
              </pre>
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
                className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl
                      transition-all flex items-center gap-2 shadow-md self-start md:self-end"
              >
                <RiPlaneLine size={20} />
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
            className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl
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
                className={`px-4 py-2 text-sm rounded-md transition-all ${activeTab === "all" ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-md" : "text-gray-300 hover:bg-blue-500/10"}`}
              >
                הכל
              </button>
              <button
                onClick={() => setActiveTab("saved")}
                className={`px-4 py-2 text-sm rounded-md transition-all ${activeTab === "saved" ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-md" : "text-gray-300 hover:bg-blue-500/10"}`}
              >
                מסלולים שמורים
              </button>
              <button
                onClick={() => setActiveTab("itineraries")}
                className={`px-4 py-2 text-sm rounded-md transition-all ${activeTab === "itineraries" ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-md" : "text-gray-300 hover:bg-blue-500/10"}`}
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
            className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl
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
                  // Get destination from the proper hierarchy of locations
                  let itineraryDestination = trip.destination || 
                                            trip.metadata?.destination || 
                                            trip.structuredContent?.destination ||
                                            trip.structuredItinerary?.destination;
                  
                  // Clean the destination name to ensure it's a proper display value                          
                  itineraryDestination = getCleanDestinationName(itineraryDestination) || "יומן מסע";
                  
                  const itineraryImage = trip.preview?.image || getDestinationImage(itineraryDestination);
                  
                  return (
                    <motion.div
                      key={trip._id || trip.id}
                      className="itinerary-card rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer h-[360px] border border-indigo-500/20"
                      variants={itemVariants}
                      whileHover={{ y: -8, transition: { duration: 0.2 } }}
                      onClick={() => viewItinerary(trip)}
                    >
                      {/* Card image header with standardized overlay */}
                      <div className="card-image-container relative h-44 overflow-hidden">
                        <img 
                          src={itineraryImage} 
                          alt={itineraryDestination}
                          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                        />
                        {/* Standardized gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-900/60 to-transparent"></div>
                        
                        {/* Trip type badge - standardized position */}
                        <div className="absolute top-3 right-3">
                          <div className="bg-blue-600/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1.5 shadow-lg">
                            <RiRoadMapLine size={12} />
                            <span>יומן מסע</span>
                          </div>
                        </div>
                      </div>

                      {/* Card title section - standardized across all cards */}
                      <div className="card-title-section bg-gradient-to-r from-blue-900/90 to-indigo-900/90  border-b border-blue-500/30">
                        <h3 className="text-xl font-bold text-white">
                          {itineraryDestination}
                        </h3>
                        
                        {/* Info badges row - standardized styling */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(trip.duration || trip.metadata?.duration) && (
                            <span className="text-xs bg-blue-500/50 text-white px-2.5 py-0.5 rounded-full flex items-center">
                              <RiTimeLine className="mr-1" size={12} /> 
                              {trip.duration || trip.metadata?.duration}
                            </span>
                          )}
                          {(trip.metadata?.dates?.from || trip.dates?.from) && (
                            <span className="text-xs bg-indigo-500/50 text-white px-2.5 py-0.5 rounded-full flex items-center">
                              <RiCalendarLine className="mr-1" size={12} />{" "}
                              {formatDate(trip.metadata?.dates?.from || trip.dates?.from)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="card-content p-3 flex-grow overflow-hidden bg-gradient-to-br from-blue-900/20 to-indigo-900/20">
                        {trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0] ? (
                          <div className="trip-day-preview">
                            <h4 className="text-sm font-medium text-blue-300 flex items-center gap-1.5 mb-2">
                              <span className="bg-blue-500/30 px-2 py-0.5 rounded text-xs">יום {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0]).dayNumber || 1}</span>
                              {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0]).title && (
                                <span className="truncate">{(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0]).title}</span>
                              )}
                            </h4>
                            <div className="text-xs text-gray-300 space-y-1.5">
                              {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0])?.activities?.morning?.[0] && (
                                <div className="activity flex items-center gap-2 p-1.5 bg-white/5 rounded-lg">
                                  <span className="text-yellow-300 text-base flex-shrink-0">☀️</span>
                                  <span className="truncate">
                                    {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0]).activities.morning[0].replace(
                                      /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                                      ""
                                    )}
                                  </span>
                                </div>
                              )}
                              {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0])?.activities?.lunch?.[0] && (
                                <div className="activity flex items-center gap-2 p-1.5 bg-white/5 rounded-lg">
                                  <span className="text-blue-300 text-base flex-shrink-0">🍽️</span>
                                  <span className="truncate">
                                    {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0]).activities.lunch[0].replace(
                                      /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                                      ""
                                    )}
                                  </span>
                                </div>
                              )}
                              {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0])?.activities?.afternoon?.[0] && (
                                <div className="activity flex items-center gap-2 p-1.5 bg-white/5 rounded-lg">
                                  <span className="text-blue-300 text-base flex-shrink-0">🌞</span>
                                  <span className="truncate">
                                    {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0]).activities.afternoon[0].replace(
                                      /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                                      ""
                                    )}
                                  </span>
                                </div>
                              )}
                              {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0])?.activities?.evening?.[0] && (
                                <div className="activity flex items-center gap-2 p-1.5 bg-white/5 rounded-lg">
                                  <span className="text-purple-300 text-base flex-shrink-0">🌙</span>
                                  <span className="truncate">
                                    {(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0]).activities.evening[0].replace(
                                      /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                                      ""
                                    )}
                                  </span>
                                </div>
                              )}
                              
                              {/* אם אין פעילויות, מציג אייקונים ברירת מחדל */}
                              {!(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0])?.activities?.morning?.[0] && 
                               !(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0])?.activities?.afternoon?.[0] && 
                               !(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0])?.activities?.evening?.[0] && 
                               !(trip.structuredItinerary?.days?.[0] || trip.structuredPlan?.days?.[0])?.activities?.lunch?.[0] && (
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
                        ) : (
                          <div className="preview-content">
                            {trip.preview?.description ? (
                              <div className="preview text-sm text-gray-300 bg-white/5 p-3 rounded-lg">
                                <p className="line-clamp-4">{trip.preview.description}</p>
                              </div>
                            ) : trip.content || trip.plan ? (
                              <div className="preview text-sm text-gray-300 bg-white/5 p-3 rounded-lg">
                                <p className="line-clamp-4">
                                  {(trip.content || trip.plan).split('\n').filter(line => !line.startsWith('#') && line.trim() !== '')[0] || "לחץ לצפייה ביומן המסע המלא"}
                                </p>
                              </div>
                            ) : (
                              <div className="text-center py-3">
                                <div className="flex justify-center gap-3 mb-2">
                                  <span className="text-blue-300 text-2xl">✈️</span>
                                  <span className="text-yellow-300 text-2xl">🌍</span>
                                  <span className="text-green-300 text-2xl">🏞️</span>
                                </div>
                                <p className="text-blue-300 font-medium text-sm">לחץ לצפייה ביומן המסע המלא</p>
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

                      <div className="card-footer p-3 bg-[#181C29]/80 border-t border-indigo-500/30 flex justify-between items-center">
                        <div></div> {/* Empty for alignment */}
                        <button
                          onClick={() => viewItinerary(trip)}
                          className="flex items-center text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <RiEyeLine className="mr-1" size={14} />
                          צפה במסלול
                        </button>
                      </div>
                    </motion.div>
                  );
                }
                // For saved trips
                else {
                  // Get destination from the proper hierarchy of locations
                  let displayDestination = trip.destination || 
                                            trip.metadata?.destination || 
                                            trip.structuredPlan?.destination || 
                                            trip.tripDetails?.destination;
                      
                  // Clean the destination name to ensure it's a proper display value
                  displayDestination = getCleanDestinationName(displayDestination) || "יעד הטיול";
                      
                  const cardGradient = getCardGradient(displayDestination);
                  // Set background image by destination
                  const cardImage = trip.preview?.image || getDestinationImage(displayDestination);
                  
                  return (
                    <motion.div
                      key={trip.id}
                      className={`saved-trip-card rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer h-[360px] border border-indigo-500/20`}
                      variants={itemVariants}
                      whileHover={{ y: -8, transition: { duration: 0.2 } }}
                      onClick={() => viewSavedTrip(trip.id)}
                    >
                      {/* Card image header with standardized overlay */}
                      <div className="card-image-container relative h-44 overflow-hidden">
                        <img 
                          src={cardImage} 
                          alt={displayDestination}
                          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                        />
                        {/* Standardized gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-900/60 to-transparent"></div>
                        
                        {/* Trip type badge - standardized position */}
                        <div className="absolute top-3 right-3">
                          <div className="bg-purple-600/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1.5 shadow-lg">
                            <RiMapPinLine size={12} />
                            <span>מסלול שמור</span>
                          </div>
                        </div>
                      </div>

                      {/* Card title section - standardized across all cards */}
                      <div className="card-title-section bg-gradient-to-r from-blue-900/90 to-indigo-900/90 p-3 border-b border-blue-500/30">
                        <h3 className="text-xl font-bold text-white">
                          {displayDestination}
                        </h3>
                        
                        {/* Info badges row - standardized styling */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs bg-blue-500/50 text-white px-2.5 py-0.5 rounded-full flex items-center">
                            <RiTimeLine className="mr-1" size={12} /> 
                            {trip.duration && !trip.duration.includes("Unknown") 
                              ? trip.duration 
                              : trip.structuredPlan?.days?.length > 0 
                                ? `${trip.structuredPlan.days.length} ימים` 
                                : trip.metadata?.duration && !trip.metadata.duration.includes("Unknown")
                                  ? trip.metadata.duration
                                  : "טיול מתוכנן"} 
                          </span>
                          <span className="text-xs bg-indigo-500/50 text-white px-2.5 py-0.5 rounded-full flex items-center">
                            <RiCalendarLine className="mr-1" size={12} /> 
                            {formatDate(trip.createdAt)}
                          </span>
                          {trip.activityCounts?.total > 0 && (
                            <span className="text-xs bg-green-500/50 text-white px-2.5 py-0.5 rounded-full flex items-center">
                              <RiMapPinLine className="mr-1" size={12} /> 
                              {trip.activityCounts.total} פעילויות
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={`card-content p-3 flex-grow overflow-hidden bg-gradient-to-br ${cardGradient}`}>
                        {/* If we have structured plan days, show the first day */}
                        {trip.structuredPlan?.days && trip.structuredPlan.days.length > 0 ? (
                          <div className="trip-day-preview">
                            <h4 className="text-sm font-medium text-blue-300 flex items-center gap-1.5 mb-2">
                              <span className="bg-blue-500/30 px-2 py-0.5 rounded text-xs">יום {trip.structuredPlan.days[0].dayNumber}</span>
                              {trip.structuredPlan.days[0].title && <span className="truncate">{trip.structuredPlan.days[0].title}</span>}
                            </h4>
                            <div className="text-xs text-gray-300 space-y-1.5">
                              {trip.structuredPlan.days[0].activities?.morning?.[0] && (
                                <div className="activity flex items-center gap-2 p-1.5 bg-white/5 rounded-lg">
                                  <span className="text-yellow-300 text-base flex-shrink-0">☀️</span>
                                  <span className="truncate">
                                    {trip.structuredPlan.days[0].activities.morning[0].replace(
                                      /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                                      ""
                                    )}
                                  </span>
                                </div>
                              )}
                              {trip.structuredPlan.days[0].activities?.afternoon?.[0] && (
                                <div className="activity flex items-center gap-2 p-1.5 bg-white/5 rounded-lg">
                                  <span className="text-blue-300 text-base flex-shrink-0">🌞</span>
                                  <span className="truncate">
                                    {trip.structuredPlan.days[0].activities.afternoon[0].replace(
                                      /^[^a-zA-Z0-9\u0590-\u05FF]+/,
                                      ""
                                    )}
                                  </span>
                                </div>
                              )}
                              {trip.structuredPlan.days[0].activities?.evening?.[0] && (
                                <div className="activity flex items-center gap-2 p-1.5 bg-white/5 rounded-lg">
                                  <span className="text-purple-300 text-base flex-shrink-0">🌙</span>
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
                          <div className="preview text-sm text-gray-300 bg-white/5 p-3 rounded-lg">
                            <p className="line-clamp-4">{trip.preview.description}</p>
                          </div>
                        ) : (
                          <div className="preview text-sm text-gray-300 bg-white/5 p-3 rounded-lg">
                            {trip.plan ? (
                              <p className="line-clamp-4">
                                {trip.plan.split('\n').filter(line => !line.startsWith('#') && line.trim() !== '')[0] || "לחץ לצפייה במסלול המלא"}
                              </p>
                            ) : trip.rawContent ? (
                              <p className="line-clamp-4">
                                {trip.rawContent.split('\n').filter(line => line.trim() !== '')[0] || "לחץ לצפייה במסלול המלא"}
                              </p>
                            ) : (
                              <div className="text-center py-2">
                                <div className="flex justify-center gap-3 mb-2">
                                  <span className="text-blue-300 text-2xl">✈️</span>
                                  <span className="text-yellow-300 text-2xl">🌍</span>
                                  <span className="text-green-300 text-2xl">🏞️</span>
                                </div>
                                <p className="text-blue-300 font-medium text-sm">לחץ לצפייה במסלול הטיול</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Show highlights if available */}
                        {trip.structuredPlan?.highlights && trip.structuredPlan.highlights.length > 0 && (
                          <div className="highlights mt-2 flex flex-wrap gap-2">
                            {trip.structuredPlan.highlights.slice(0, 2).map((highlight, idx) => (
                              <div key={idx} className="highlight-item text-xs bg-indigo-900/30 px-2 py-1 rounded-lg text-indigo-300 inline-block">
                                ✨ {highlight.substring(0, 25)}{highlight.length > 25 ? '...' : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="card-footer p-3 bg-[#181C29]/80 border-t border-indigo-500/30 flex justify-between items-center">
                        <button
                          onClick={(e) => deleteSavedTrip(trip.id, e)}
                          className="text-red-400 hover:text-red-300 p-1.5 rounded-full hover:bg-red-900/20 transition-colors"
                          title="מחק מסלול"
                        >
                          <RiDeleteBinLine size={16} />
                        </button>

                        <button
                          onClick={() => viewSavedTrip(trip.id)}
                          className="flex items-center text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <RiEyeLine className="mr-1" size={14} />
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
                  className="mt-4 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-colors text-sm"
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

