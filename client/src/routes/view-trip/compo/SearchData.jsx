import React, { useContext, useEffect, useState, useRef } from "react";
import GeneralInfo from "./GeneralInfo";
import PropTypes from "prop-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Hotels from "./Hotels";
import Restaurants from "./Restaurants";
import Attractions from "./Attractions";
import TripPlanner from "./TripPlanner";
import TripPlannerResult from "./TripPlannerResult";
import SavedActivities from "@/components/ui/SavedActivities";
import { TripContext } from "@/components/tripcontext/TripProvider";
import { MAP_EVENTS, displayRouteOnMap, clearRoutesFromMap, resetMap } from "@/utils/map/MapEventService";
import { getCoordinates } from "@/utils/map/ExternalDataAdapter";

//import Events from "./Events";
//import CustomRoute from "./CustomRoute";

const SearchData = ({ trip }) => {
  const { activeLayer, setActiveLayer, defaultTab, activeTripChatId } = useContext(TripContext);
  const [activeTab, setActiveTab] = useState(defaultTab || "generalInfo");
  const contentRef = useRef(null);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [tripPlanDetails, setTripPlanDetails] = useState(null);
  const [displayedRoutes, setDisplayedRoutes] = useState([]);
  const [itineraryData, setItineraryData] = useState(null);

  // עדכון הטאב הפעיל מברירת המחדל
  useEffect(() => {
    setActiveTab(defaultTab);
    
    // קביעת הטאב הפעיל מה-URL אם קיים
    const hash = window.location.hash.replace("#", "");
    if (hash && ["general", "hotels", "restaurants", "attractions", "planner", "itinerary"].includes(hash)) {
      setActiveTab(hash);
      setActiveLayer(hash);
    }
  }, [defaultTab, setActiveLayer]);

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
    if (activeTripChatId) {
      setCurrentChatId(activeTripChatId);
    } else if (trip && trip.chatId) {
      setCurrentChatId(trip.chatId);
    }

    if (trip && trip.userId) {
      setUserId(trip.userId);
    } else {
      const storedUserId = localStorage.getItem("userId");
      if (storedUserId) {
        setUserId(storedUserId);
      }
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

  // Check for stored trip plan when component mounts or chatId changes
  useEffect(() => {
    if (currentChatId) {
      // Import dynamically to avoid circular dependencies
      import('@/utils/services/tripPlanService').then(module => {
        const tripPlanService = module.default;
        const storedPlan = tripPlanService.getStoredPlan(currentChatId);
        
        if (storedPlan && storedPlan.plan) {
          console.log(`SearchData: Found stored trip plan for chat ${currentChatId}`);
          setGeneratedPlan(storedPlan.plan);
          setTripPlanDetails(storedPlan.tripDetails);
        } else {
          console.log(`SearchData: No stored trip plan found for chat ${currentChatId}`);
        }
      });
    }
  }, [currentChatId]);

  // Handle tab change
  const handleTabChange = (value) => {
    // Set active tab and update hash
    setActiveTab(value);
    window.location.hash = value;
    
    // Special handling for Trip Details tab (עריכת היומן)
    if (value === 'tripDetails') {
      console.log("Switching to Trip Details tab - using direct map access");
      
      // Reset active layer immediately to prevent new markers
      setActiveLayer('');
      
      // DIRECT MAP ACCESS: Get the Mapbox map instance and forcefully clear it
      try {
        // Find the map container and map instance
        const mapboxContainer = document.querySelector('.mapboxgl-map');
        if (mapboxContainer && window.mapboxgl) {
          // Get all markers and forcefully remove them
          const mapMarkers = document.querySelectorAll('.mapboxgl-marker');
          console.log(`Found ${mapMarkers.length} markers to remove directly`);
          mapMarkers.forEach(marker => marker.remove());
          
          // Get all popups and remove them
          const mapPopups = document.querySelectorAll('.mapboxgl-popup');
          mapPopups.forEach(popup => popup.remove());
          
          // Also remove any custom overlays
          const overlays = document.querySelectorAll('.map-overlay, .map-legend');
          overlays.forEach(overlay => overlay.remove());
          
          // Create a destructive global cleanup function
          window.__forceCleanMap = () => {
            const allMapElements = document.querySelectorAll('.mapboxgl-marker, .mapboxgl-popup, .map-overlay, .map-legend');
            allMapElements.forEach(el => el.remove());
            console.log(`Forced removal of ${allMapElements.length} map elements`);
          };
          
          // Execute multiple cleanup attempts with increasing delays
          [0, 100, 300, 500].forEach(delay => {
            setTimeout(() => window.__forceCleanMap(), delay);
          });
        }
      } catch (error) {
        console.error("Error directly accessing map:", error);
      }
      
      // Also use the standard event-based method as backup
      window.dispatchEvent(new CustomEvent(MAP_EVENTS.RESET_MAP));
      window.dispatchEvent(new CustomEvent(MAP_EVENTS.CLEAR_MAP));
      window.dispatchEvent(new CustomEvent(MAP_EVENTS.CLEAR_ROUTES));
      
      // Tell ViewMap it's a forced cleanup
      window.dispatchEvent(new CustomEvent('tabChange', {
        detail: { tab: 'tripDetails-forced-cleanup' }
      }));
      
      // AGGRESSIVE APPROACH: Create a recurring interval to keep removing markers
      // This ensures any asynchronously added markers are also removed
      const cleanupInterval = setInterval(() => {
        if (activeTab === 'tripDetails') {
          const mapMarkers = document.querySelectorAll('.mapboxgl-marker');
          if (mapMarkers.length > 0) {
            console.log(`Interval cleanup: removing ${mapMarkers.length} markers`);
            mapMarkers.forEach(marker => marker.remove());
          }
        } else {
          // Stop interval if we're no longer on tripDetails tab
          clearInterval(cleanupInterval);
        }
      }, 200);
      
      // Safety: clear interval after 5 seconds no matter what
      setTimeout(() => clearInterval(cleanupInterval), 5000);
      
      // ULTIMA RATIO: If all else fails, create a transparent div over the map area to hide markers
      // Create element for hiding markers
      const markerBlocker = document.createElement('div');
      markerBlocker.id = 'marker-blocker';
      markerBlocker.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: transparent;
        z-index: 1000;
        pointer-events: none;
      `;
      
      // Add the blocker to the map container
      const mapContainer = document.querySelector('.map-container');
      if (mapContainer && !document.getElementById('marker-blocker')) {
        mapContainer.appendChild(markerBlocker);
        
        // Remove it after 3 seconds
        setTimeout(() => {
          if (document.getElementById('marker-blocker')) {
            document.getElementById('marker-blocker').remove();
          }
        }, 3000);
      }
    } 
    else {
      // Remove marker blocker if it exists
      if (document.getElementById('marker-blocker')) {
        document.getElementById('marker-blocker').remove();
      }
      
      // For other tabs, clear existing markers first
      window.dispatchEvent(new CustomEvent(MAP_EVENTS.CLEAR_MAP));
      window.dispatchEvent(new CustomEvent(MAP_EVENTS.RESET_MAP));
      
      // Update the active layer to trigger displaying the correct markers
      setActiveLayer(value);
      
      // Dispatch tab change event
      window.dispatchEvent(new CustomEvent('tabChange', {
        detail: { tab: value }
      }));
      
      // If switching to the itinerary tab and we have a generated plan
      if (value === 'itinerary' && generatedPlan) {
        // Add a delay before creating routes
        setTimeout(() => {
          createRoutesFromItinerary(itineraryData);
        }, 300);
      }
    }
  };

  // Make sure trip object has necessary props
  const enhancedTrip = {
    ...trip,
    userId: trip?.userId || userId,
    chatId: trip?.chatId || currentChatId || activeTripChatId,
  };

  // Handler to close trip plan result
  const handleCloseTripPlan = () => {
    // Don't reset the plan, just switch tabs
    setActiveTab('tripDetails');
  };
  
  // Listen for trip plan generation events
  useEffect(() => {
    const handleTripPlanGenerated = (event) => {
      console.log("SearchData: Received tripPlanGenerated event", event.detail);
      const { plan, itineraryData } = event.detail;
      
      // Store the itinerary data for later use
      setItineraryData(itineraryData);
      
      // Set the generated plan
      setGeneratedPlan(plan);
      
      // Switch to the itinerary tab
      setActiveTab("itinerary");
      
      // Dispatch a tabChange event
      window.dispatchEvent(new CustomEvent('tabChange', {
        detail: {
          tab: 'itinerary'
        }
      }));
      
      // Create routes for all days after a short delay
      setTimeout(() => {
        createRoutesFromItinerary(itineraryData);
      }, 500);
    };
    
    document.addEventListener('tripPlanGenerated', handleTripPlanGenerated);
    
    return () => {
      document.removeEventListener('tripPlanGenerated', handleTripPlanGenerated);
    };
  }, []);

  // Function to create routes from the itinerary data for all days
  const createRoutesFromItinerary = async (itineraryData) => {
    if (!itineraryData || Object.keys(itineraryData).length === 0) return;
    
    console.log("Creating routes from itinerary data for all days", itineraryData);
    
    try {
      // First reset the map to clear any existing routes and markers
      resetMap();
      
      // Show loading indicator
      const loadingToast = document.createElement('div');
      loadingToast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center';
      loadingToast.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Creating routes for all days...</span>
      `;
      document.body.appendChild(loadingToast);
      
      // Define colors for each day's route
      const routeColors = [
        "#4f46e5", // indigo
        "#ef4444", // red
        "#10b981", // green
        "#f59e0b", // amber
        "#8b5cf6", // violet
        "#ec4899", // pink
        "#06b6d4", // cyan
        "#84cc16", // lime
      ];
      
      // Process each day in the itinerary
      const days = Object.keys(itineraryData);
      
      // Create a legend for the routes
      const legend = document.createElement('div');
      legend.className = 'fixed bottom-4 right-4 bg-gray-800/90 text-white px-4 py-3 rounded-md shadow-lg z-50 border border-gray-700';
      legend.innerHTML = `
        <div class="text-sm font-medium mb-2">Trip Routes</div>
        <div class="flex flex-col space-y-1 text-xs">
          ${days.map((day, index) => `
            <div class="flex items-center">
              <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${routeColors[index % routeColors.length]}"></div>
              <span>Day ${index + 1}</span>
            </div>
          `).join('')}
        </div>
      `;
      
      // Track all markers to be displayed
      const allDayActivities = {
        hotels: [],
        restaurants: [],
        attractions: []
      };
      
      // Process each day sequentially with Promise.all
      await Promise.all(days.map(async (day, dayIndex) => {
        const dayNumber = dayIndex + 1;
        const dayColor = routeColors[dayIndex % routeColors.length];
        
        // Get all activities for this day
        const routeLocations = [];
        
        // Track activities by type for this day
        const dayActivities = {
          hotels: [],
          restaurants: [],
          attractions: []
        };
        
        // Collect all activities for this day in order of time slots
        const timeSlots = ["morning", "afternoon", "evening"];
        
        timeSlots.forEach((timeOfDay) => {
          const activitiesInTimeSlot = itineraryData[day][timeOfDay] || [];
          
          activitiesInTimeSlot.forEach((activity) => {
            // Create a clean activity object with all necessary data
            const cleanActivity = {
              name: activity.name,
              address: activity.address,
              type: activity.type || "attraction",
              timeOfDay: timeOfDay,
              // Include any coordinates if already available
              ...(activity.lat && activity.lng ? { lat: activity.lat, lng: activity.lng } : {})
            };
            
            // Add to the appropriate category for markers
            if (activity.type === "hotel") {
              dayActivities.hotels.push(cleanActivity);
              allDayActivities.hotels.push({
                ...cleanActivity,
                dayNumber
              });
            } else if (activity.type === "restaurant") {
              dayActivities.restaurants.push(cleanActivity);
              allDayActivities.restaurants.push({
                ...cleanActivity,
                dayNumber
              });
            } else {
              dayActivities.attractions.push(cleanActivity);
              allDayActivities.attractions.push({
                ...cleanActivity,
                dayNumber
              });
            }
            
            // Add to route locations array for creating the route path
            if (activity.address || activity.name) {
              routeLocations.push(cleanActivity);
            }
          });
        });
        
        // Display markers for this day's activities
        window.dispatchEvent(
          new CustomEvent(MAP_EVENTS.DISPLAY_ITINERARY_LOCATIONS, {
            detail: {
              data: dayActivities,
              destination: trip?.vacation_location || "",
              dayNumber: dayNumber,
            },
          })
        );
        
        if (routeLocations.length >= 2) {
          console.log(`Creating route for Day ${dayNumber} with ${routeLocations.length} locations`);
          
          // Get coordinates for each location
          const locationsWithCoords = await Promise.all(
            routeLocations.map(async (location, index) => {
              try {
                // Skip geocoding if we already have coordinates
                if (typeof location.lat === 'number' && typeof location.lng === 'number') {
                  console.log(`Location ${index + 1} (${location.name}) already has coordinates: [${location.lng}, ${location.lat}]`);
                  return location;
                }
                
                // Try to get coordinates using address first, then fall back to name
                const searchTerm = location.address || location.name;
                if (!searchTerm) {
                  console.warn(`Location ${index + 1} has no address or name to geocode`);
                  return null;
                }
                
                // Add destination context to improve geocoding accuracy
                const searchWithContext = trip?.vacation_location 
                  ? `${searchTerm}, ${trip.vacation_location}` 
                  : searchTerm;
                
                console.log(`Geocoding location ${index + 1}: "${searchWithContext}"`);
                const coords = await getCoordinates(searchWithContext);
                
                if (coords) {
                  console.log(`✓ Found coordinates for "${location.name}": [${coords.lng}, ${coords.lat}]`);
                  return { ...location, ...coords };
                } else {
                  console.warn(`✗ Failed to get coordinates for "${location.name}"`);
                  return null;
                }
              } catch (error) {
                console.error(`Error geocoding location ${index + 1} (${location.name}):`, error);
                return null;
              }
            })
          );
          
          // Filter out locations without coordinates
          const validLocations = locationsWithCoords.filter(loc => loc !== null);
          
          if (validLocations.length >= 2) {
            // Display the route with enhanced options
            displayRouteOnMap(validLocations, {
              lineColor: dayColor,
              lineWidth: 4,
              lineOpacity: 0.7,
              fitBounds: false, // We'll fit bounds after all routes are created
              routeType: "walking",
              addWaypoints: true,
              showDirectionArrows: true,
              pathStyle: "curved",
              animate: true,
              routeId: `day-${dayNumber}-route` // Add unique ID for each day's route
            });
            
            console.log(`Created route with ${validLocations.length} locations for Day ${dayNumber}`);
          } else {
            console.warn(`Not enough valid coordinates to create a route for Day ${dayNumber}`);
          }
        }
      }));
      
      // After all routes are created, fit the map bounds to show everything
      window.dispatchEvent(
        new CustomEvent(MAP_EVENTS.FIT_BOUNDS, {
          detail: {
            padding: 50
          }
        })
      );
      
      // Remove loading indicator
      document.body.removeChild(loadingToast);
      
      // Add the legend to the document
      document.body.appendChild(legend);
      
      // Add an event listener to remove the legend when the tab changes
      const removeLegend = () => {
        if (document.body.contains(legend)) {
          document.body.removeChild(legend);
        }
      };
      
      window.addEventListener('tabChange', removeLegend, { once: true });
      
    } catch (error) {
      console.error("Error creating routes from itinerary:", error);
      
      // Show error message
      const errorToast = document.createElement('div');
      errorToast.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center';
      errorToast.innerHTML = `
        <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>Error creating routes: ${error.message || 'Unknown error'}</span>
      `;
      document.body.appendChild(errorToast);
      
      // Remove error message after 5 seconds
      setTimeout(() => {
        if (document.body.contains(errorToast)) {
          document.body.removeChild(errorToast);
        }
      }, 5000);
    }
  };
  
  // Function to create a route from a generated plan
  const createRouteFromPlan = (plan) => {
    if (!plan || !plan.days) return;
    
    console.log("Creating route from trip plan", plan);
    
    // Get all locations from the current active day or first day
    const dayToShow = plan.days[0]; // Default to first day
    
    if (!dayToShow || !dayToShow.sections) return;
    
    const routeLocations = [];
    
    // Extract locations from all sections
    dayToShow.sections.forEach(section => {
      // Get activities
      if (section.activities && section.activities.length) {
        section.activities.forEach(activity => {
          if (activity.location || activity.name) {
            routeLocations.push({
              name: activity.name || activity.title,
              address: activity.location || activity.address,
              type: activity.type || "attraction",
              timeOfDay: section.timeOfDay
            });
          }
        });
      }
      
      // Get restaurants
      if (section.restaurant) {
        if (section.restaurant.location || section.restaurant.name) {
          routeLocations.push({
            name: section.restaurant.name,
            address: section.restaurant.location || section.restaurant.address,
            type: "restaurant",
            timeOfDay: section.timeOfDay
          });
        }
      }
    });
    
    // If we have enough locations, create a route
    if (routeLocations.length >= 2) {
      console.log(`Creating route with ${routeLocations.length} locations from plan`);
      
      // We need to get coordinates for each location
      const getCoordinatesForRoute = async () => {
        try {
          // Get coordinates for each location
          const locationsWithCoords = await Promise.all(
            routeLocations.map(async (location) => {
              // Use the address to get coordinates
              const coords = await getCoordinates(location.address || location.name);
              if (coords) {
                return { ...location, ...coords };
              }
              return null;
            })
          );
          
          // Filter out locations without coordinates
          const validLocations = locationsWithCoords.filter(loc => loc !== null);
          
          if (validLocations.length >= 2) {
            // Display the route
            displayRouteOnMap(validLocations, {
              lineColor: "#4f46e5", // Indigo color for the route
              lineWidth: 4,
              lineOpacity: 0.7,
              fitBounds: true
            });
            
            console.log(`Created route with ${validLocations.length} locations from plan`);
          } else {
            console.warn(`Not enough valid coordinates to create a route from plan`);
          }
        } catch (error) {
          console.error("Error creating route from plan:", error);
        }
      };
      
      // Execute the async function
      getCoordinatesForRoute();
    }
  };
  
  // Create route when tab changes to itinerary
  useEffect(() => {
    if (activeTab === 'itinerary' && generatedPlan) {
      // When switching to the itinerary tab, create a route from the plan
      console.log('Tab changed to itinerary, creating route');
      // createRouteFromPlan(generatedPlan);
    }
  }, [activeTab, generatedPlan]);

  return (
    <div className="h-full flex flex-col overflow-auto">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-100">
        {trip?.vacation_location
          ? `Explore ${trip.vacation_location}`
          : "Search and Save Activities"}
      </h1>

      <Tabs defaultValue={activeTab} onValueChange={handleTabChange} value={activeTab}>
        <TabsList className="grid grid-cols-6 mb-6">
          <TabsTrigger value="generalInfo">🌍 מידע כללי</TabsTrigger>
          <TabsTrigger value="tripDetails">📋 עריכת היומן</TabsTrigger>
          <TabsTrigger value="hotels">🏨 מלונות</TabsTrigger>
          <TabsTrigger value="restaurants">🍽 מסעדות</TabsTrigger>
          <TabsTrigger value="attractions">🎡 אטרקציות</TabsTrigger>
          <TabsTrigger value="itinerary" className={generatedPlan ? "text-blue-300 font-medium" : ""}>
            🗺️ המסלול
          </TabsTrigger>
        </TabsList>

        <div
          className="mt-2 overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(59, 130, 246, 0.2) rgba(59, 130, 246, 0.1)",
            height: "calc(100vh - 180px)",
            maxHeight: "calc(100vh - 180px)",
            paddingRight: "8px",
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
          
          <TabsContent value="itinerary">
            {generatedPlan ? (
              <>
                <TripPlannerResult
                  plan={generatedPlan}
                  tripDetails={tripPlanDetails || {
                    destination: trip?.vacation_location || "Your Trip",
                    chatId: currentChatId
                  }}
                  onClose={handleCloseTripPlan}
                />
                {displayedRoutes.length > 0 && (
                  <div className="bg-blue-900/30 p-3 rounded-lg mt-4 mb-2">
                    <h4 className="font-medium text-blue-200 mb-2">Routes on Map:</h4>
                    <div className="flex flex-wrap gap-2">
                      {displayedRoutes.map(route => (
                        <div 
                          key={route.dayNumber} 
                          className="flex items-center bg-blue-800/30 px-2 py-1 rounded-md"
                        >
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: route.color }}
                          ></div>
                          <span className="text-sm text-blue-100">
                            Day {route.dayNumber} ({route.locationCount} locations)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-10">
                <div className="bg-blue-900/30 p-6 rounded-xl text-center max-w-lg">
                  <div className="text-4xl mb-4">🗺️</div>
                  <h3 className="text-xl font-semibold text-blue-200 mb-3">אין מסלול מותאם אישית</h3>
                  <p className="text-gray-300 mb-4">
                    לחץ על כפתור &quot;Generate Trip Plan&quot; בלשונית &quot;Trip Details&quot; כדי ליצור מסלול טיול מותאם אישית על סמך הפעילויות שבחרת.
                  </p>
                  <button 
                    onClick={() => setActiveTab('tripDetails')} 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    עבור ללשונית Trip Details
                  </button>
                </div>
              </div>
            )}
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
