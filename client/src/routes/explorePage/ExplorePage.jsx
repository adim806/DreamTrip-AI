import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  RiPlaneLine,
  RiHotelLine,
  RiCarLine,
  RiMapPinLine,
  RiGlobalLine,
  RiCompass3Line,
  RiRestaurantLine,
  RiShoppingBagLine,
  RiSuitcaseLine,
  RiSearchLine,
  RiExternalLinkLine,
  RiFilterLine,
  RiArrowRightSLine,
  RiMoneyDollarCircleLine,
  RiCalendarLine,
  RiRoadMapLine,
  RiEarthLine,
  RiGuideLine,
  RiCoupon3Line,
  RiVisaLine,
  RiBuilding2Line,
  RiStore2Line,
  RiMapLine,
  RiFlightTakeoffLine,
  RiFlightLandLine,
  RiCompassDiscoverLine,
  RiHome4Line
} from "react-icons/ri";

/**
 * ExplorePage Component
 *
 * A page that provides useful external links for travel planning, booking flights,
 * hotels, and other travel-related services.
 */
const ExplorePage = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Categories for filtering
  const categories = [
    { id: "all", name: "הכל", icon: <RiGlobalLine /> },
    { id: "flights", name: "טיסות", icon: <RiPlaneLine /> },
    { id: "hotels", name: "מלונות", icon: <RiHotelLine /> },
    { id: "cars", name: "רכב", icon: <RiCarLine /> },
    { id: "attractions", name: "אטרקציות", icon: <RiMapPinLine /> },
    { id: "restaurants", name: "מסעדות", icon: <RiRestaurantLine /> },
    { id: "shopping", name: "קניות", icon: <RiShoppingBagLine /> },
    { id: "planning", name: "תכנון", icon: <RiSuitcaseLine /> },
    { id: "insurance", name: "ביטוח", icon: <RiVisaLine /> },
  ];

  // Resource links with custom icons and background images
  const resources = [
    // טיסות
    {
      id: 1,
      name: "Skyscanner",
      description: "השוואת מחירי טיסות מחברות תעופה רבות",
      url: "https://www.skyscanner.co.il",
      category: "flights",
      icon: <RiFlightTakeoffLine size={24} />,
      color: "#0770e3",
      bgImage: "url('https://images.unsplash.com/photo-1569154941061-e231b4725ef1?q=80&w=500')",
      popular: true
    },
    {
      id: 2,
      name: "Kayak",
      description: "חיפוש טיסות, מלונות ורכבים להשכרה",
      url: "https://www.kayak.co.il",
      category: "flights",
      icon: <RiPlaneLine size={24} />,
      color: "#FF690F",
      bgImage: "url('https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?q=80&w=500')"
    },
    {
      id: 3,
      name: "Expedia",
      description: "הזמנת טיסות, מלונות וחבילות נופש",
      url: "https://www.expedia.com",
      category: "flights",
      icon: <RiFlightLandLine size={24} />,
      color: "#00355F",
      bgImage: "url('https://images.unsplash.com/photo-1544642899-f0d6e5f6ed6f?q=80&w=500')"
    },
    {
      id: 4,
      name: "EL AL",
      description: "חברת התעופה הלאומית של ישראל",
      url: "https://www.elal.com",
      category: "flights",
      icon: <RiPlaneLine size={24} />,
      color: "#0038B8",
      bgImage: "url('https://images.unsplash.com/photo-1542296332-2e4473faf563?q=80&w=500')"
    },

    // מלונות
    {
      id: 5,
      name: "Booking.com",
      description: "הזמנת מלונות, דירות ואירוח ברחבי העולם",
      url: "https://www.booking.com",
      category: "hotels",
      icon: <RiHome4Line size={24} />,
      color: "#003580",
      bgImage: "url('https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=500')",
      popular: true
    },
    {
      id: 6,
      name: "Airbnb",
      description: "השכרת דירות, בתים וחדרים מקומיים",
      url: "https://www.airbnb.com",
      category: "hotels",
      icon: <RiHotelLine size={24} />,
      color: "#FF385C",
      bgImage: "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=500')",
      popular: true
    },
    {
      id: 7,
      name: "Hotels.com",
      description: "הזמנת מלונות והשוואת מחירים",
      url: "https://www.hotels.com",
      category: "hotels",
      icon: <RiHotelLine size={24} />,
      color: "#D32F2F",
      bgImage: "url('https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=500')"
    },
    {
      id: 8,
      name: "Agoda",
      description: "מלונות במחירים מוזלים במיוחד באסיה",
      url: "https://www.agoda.com",
      category: "hotels",
      icon: <RiHotelLine size={24} />,
      color: "#5392F9",
      bgImage: "url('https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=500')"
    },

    // השכרת רכב
    {
      id: 9,
      name: "Hertz",
      description: "השכרת רכב בינלאומית",
      url: "https://www.hertz.com",
      category: "cars",
      icon: <RiCarLine size={24} />,
      color: "#FFAD00",
      bgImage: "url('https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?q=80&w=500')"
    },
    {
      id: 10,
      name: "Avis",
      description: "השכרת רכב ברחבי העולם",
      url: "https://www.avis.com",
      category: "cars",
      icon: <RiCarLine size={24} />,
      color: "#D52B1E",
      bgImage: "url('https://images.unsplash.com/photo-1551830820-330a71b99659?q=80&w=500')"
    },
    {
      id: 11,
      name: "RentalCars",
      description: "השוואת מחירי השכרת רכב",
      url: "https://www.rentalcars.com",
      category: "cars",
      icon: <RiCarLine size={24} />,
      color: "#0071c2",
      bgImage: "url('https://images.unsplash.com/photo-1603811478698-0b1d6256f79a?q=80&w=500')",
      popular: true
    },

    // אטרקציות
    {
      id: 12,
      name: "GetYourGuide",
      description: "הזמנת סיורים ואטרקציות בכל העולם",
      url: "https://www.getyourguide.com",
      category: "attractions",
      icon: <RiGuideLine size={24} />,
      color: "#FF5757",
      bgImage: "url('https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=500')",
      popular: true
    },
    {
      id: 13,
      name: "Viator",
      description: "סיורים, פעילויות וחוויות בכל יעד",
      url: "https://www.viator.com",
      category: "attractions",
      icon: <RiMapPinLine size={24} />,
      color: "#2A2A2A",
      bgImage: "url('https://images.unsplash.com/photo-1504609813442-a9924e2e4786?q=80&w=500')"
    },
    {
      id: 14,
      name: "TripAdvisor",
      description: "ביקורות והמלצות על אטרקציות ומסעדות",
      url: "https://www.tripadvisor.com",
      category: "attractions",
      icon: <RiCompassDiscoverLine size={24} />,
      color: "#34E0A1",
      bgImage: "url('https://images.unsplash.com/photo-1522509585149-c9cd39d1ff08?q=80&w=500')",
      popular: true
    },

    // מסעדות
    {
      id: 15,
      name: "OpenTable",
      description: "הזמנת מקומות במסעדות ברחבי העולם",
      url: "https://www.opentable.com",
      category: "restaurants",
      icon: <RiRestaurantLine size={24} />,
      color: "#DA3743",
      bgImage: "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=500')"
    },
    {
      id: 16,
      name: "TheFork",
      description: "הזמנת מסעדות באירופה",
      url: "https://www.thefork.com",
      category: "restaurants",
      icon: <RiRestaurantLine size={24} />,
      color: "#6FCF97",
      bgImage: "url('https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=500')"
    },

    // קניות
    {
      id: 17,
      name: "Amazon",
      description: "קניית ציוד לטיולים",
      url: "https://www.amazon.com",
      category: "shopping",
      icon: <RiStore2Line size={24} />,
      color: "#FF9900",
      bgImage: "url('https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=500')"
    },
    {
      id: 18,
      name: "AliExpress",
      description: "מוצרים במחירים נמוכים לטיולים",
      url: "https://www.aliexpress.com",
      category: "shopping",
      icon: <RiShoppingBagLine size={24} />,
      color: "#E62E04",
      bgImage: "url('https://images.unsplash.com/photo-1607083206968-13611e3d76db?q=80&w=500')"
    },

    // תכנון טיולים
    {
      id: 19,
      name: "Rome2Rio",
      description: "תכנון נסיעות ותחבורה מדלת לדלת",
      url: "https://www.rome2rio.com",
      category: "planning",
      icon: <RiRoadMapLine size={24} />,
      color: "#D40E14",
      bgImage: "url('https://images.unsplash.com/photo-1526772662000-3f88f10405ff?q=80&w=500')",
      popular: true
    },
    {
      id: 20,
      name: "Waze",
      description: "ניווט בזמן אמת",
      url: "https://www.waze.com",
      category: "planning",
      icon: <RiMapLine size={24} />,
      color: "#33CCFF",
      bgImage: "url('https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=500')"
    },
    {
      id: 21,
      name: "Google Maps",
      description: "מפות ותכנון מסלולים",
      url: "https://maps.google.com",
      category: "planning",
      icon: <RiMapPinLine size={24} />,
      color: "#4285F4",
      bgImage: "url('https://images.unsplash.com/photo-1566288623394-377af472d81b?q=80&w=500')"
    },
    {
      id: 22,
      name: "XE Currency",
      description: "המרת מטבע בזמן אמת",
      url: "https://www.xe.com",
      category: "planning",
      icon: <RiMoneyDollarCircleLine size={24} />,
      color: "#0896D8",
      bgImage: "url('https://images.unsplash.com/photo-1618044733300-9472054094ee?q=80&w=500')"
    },
    
    // ביטוח נסיעות
    {
      id: 23,
      name: "PassportCard",
      description: "ביטוח נסיעות לחו\"ל עם כרטיס תשלומים",
      url: "https://passportcard.co.il/",
      category: "insurance",
      icon: <RiVisaLine size={24} />,
      color: "#E01F26",
      bgImage: "url('https://images.unsplash.com/photo-1565073624497-7e3662477494?q=80&w=500')",
      popular: true
    },
    {
      id: 24,
      name: "AIG Travel",
      description: "ביטוח נסיעות לחו\"ל",
      url: "https://www.aig.co.il/travel",
      category: "insurance",
      icon: <RiVisaLine size={24} />,
      color: "#0095D9",
      bgImage: "url('https://images.unsplash.com/photo-1579621970795-87facc2f976d?q=80&w=500')"
    },
    
    // הנחות ודילים
    {
      id: 25,
      name: "Secret Flying",
      description: "דילים וטיסות במחירים מוזלים",
      url: "https://www.secretflying.com/",
      category: "flights",
      icon: <RiCoupon3Line size={24} />,
      color: "#FF6B6B",
      bgImage: "url('https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=500')"
    },
  ];

  // Filter resources based on active category and search term
  const filteredResources = resources.filter((resource) => {
    const matchesCategory = activeCategory === "all" || resource.category === activeCategory;
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group resources by category for display
  const groupedResources = {};
  
  if (activeCategory === "all") {
    // Group by category when showing all
    categories.slice(1).forEach(category => {
      const categoryResources = filteredResources.filter(resource => resource.category === category.id);
      if (categoryResources.length > 0) {
        groupedResources[category.id] = {
          name: category.name,
          icon: category.icon,
          resources: categoryResources
        };
      }
    });
  } else {
    // Just use the filtered resources when a specific category is selected
    const categoryInfo = categories.find(cat => cat.id === activeCategory);
    if (filteredResources.length > 0) {
      groupedResources[activeCategory] = {
        name: categoryInfo.name,
        icon: categoryInfo.icon,
        resources: filteredResources
      };
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
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

  return (
    <div 
      className="explore-page min-h-screen pb-16"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1470')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-teal-900/80 to-gray-900/90 backdrop-blur-sm z-0"></div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="w-full bg-white/10 backdrop-blur-md shadow-lg border-b border-white/10">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <RiCompass3Line className="text-teal-400" size={40} />
              <span className="bg-gradient-to-r from-teal-400 to-blue-400 text-transparent bg-clip-text">
                Explore
              </span>
            </h1>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="container mx-auto px-4 py-6 sticky top-0 z-20 bg-gray-900/70 backdrop-blur-lg shadow-lg border-b border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Category Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap
                    ${activeCategory === category.id 
                      ? "bg-gradient-to-r from-teal-500 to-blue-500 text-white font-medium shadow-lg" 
                      : "bg-white/10 text-gray-200 hover:bg-white/20 backdrop-blur-sm border border-white/10"}`}
                >
                  <span className={activeCategory === category.id ? "text-white" : "text-teal-400"}>
                    {category.icon}
                  </span>
                  {category.name}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-auto">
              <input
                type="text"
                placeholder="חיפוש..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-full py-2.5 px-5 pl-12 text-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 w-full min-w-[250px]"
              />
              <RiSearchLine className="absolute left-4 top-3 text-teal-400" />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-4 top-2.5 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Resources List */}
        <div className="container mx-auto px-4 py-8">
          {Object.keys(groupedResources).length > 0 ? (
            Object.entries(groupedResources).map(([categoryId, category]) => (
              <motion.div
                key={categoryId}
                className="mb-14"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
              >
                <div className="flex items-center gap-3 mb-6 pl-2">
                  <div className="bg-gradient-to-r from-teal-500 to-blue-500 p-3 rounded-xl text-white shadow-lg">
                    {category.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-white">{category.name}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {category.resources.map((resource) => (
                    <motion.a
                      key={resource.id}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variants={itemVariants}
                      className="group relative overflow-hidden h-[220px] rounded-2xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                    >
                      {/* Background Image with Gradient Overlay */}
                      <div 
                        className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
                        style={{ 
                          backgroundImage: resource.bgImage,
                        }}
                      />
                      
                      {/* Gradient Overlay */}
                      <div 
                        className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-80"
                        style={{ 
                          background: `linear-gradient(to top, ${resource.color || "#000000"}dd, transparent)`,
                        }}
                      />
                      
                      {/* Content */}
                      <div className="relative h-full flex flex-col justify-end p-6 text-white">
                        {/* Icon */}
                        <div 
                          className="absolute top-5 right-5 w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-10"
                          style={{
                            backgroundColor: `${resource.color}bb`,
                            boxShadow: `0 10px 15px -3px ${resource.color}66`
                          }}
                        >
                          {resource.icon}
                        </div>
                        
                        {/* Title */}
                        <h3 className="text-2xl font-bold mb-1 flex items-center">
                          {resource.name}
                          {resource.popular && (
                            <span className="ml-2 bg-yellow-400 text-gray-900 text-xs px-2 py-1 rounded-full">
                              פופולרי
                            </span>
                          )}
                        </h3>
                        
                        {/* Description */}
                        <p className="text-sm text-gray-100 mb-3 opacity-90">
                          {resource.description}
                        </p>
                        
                        {/* Visit button */}
                        <div className="flex items-center gap-1 text-sm font-medium">
                          פתח אתר
                          <RiExternalLinkLine className="opacity-70 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-white/10 backdrop-blur-md rounded-xl shadow-lg mt-8 border border-white/10">
              <RiFilterLine size={56} className="text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">לא נמצאו תוצאות</h3>
              <p className="text-gray-300">נסה לשנות את החיפוש או לבחור קטגוריה אחרת</p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setActiveCategory("all");
                }}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white rounded-lg transition-colors shadow-lg"
              >
                נקה סינון
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorePage; 