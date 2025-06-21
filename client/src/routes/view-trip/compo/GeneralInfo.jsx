import React, { useEffect, useState } from "react";
import axios from "axios";
import mapboxgl from "mapbox-gl";
import { motion } from "framer-motion";
import { TypeAnimation } from "react-type-animation";
import {
  RiInformationLine,
  RiCalendarLine,
  RiMapPinLine,
  RiCloudyLine,
  RiSunLine,
  RiSnowyLine,
  RiDrizzleLine,
} from "react-icons/ri";
import {
  FaUmbrellaBeach,
  FaTree,
  FaMountain,
  FaCity,
  FaLandmark,
  FaWater,
} from "react-icons/fa";
import SavedActivities from "@/components/ui/SavedActivities";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Helper function to determine icon based on location name
const getDestinationIcon = (location = "") => {
  location = location.toLowerCase();
  if (
    location.includes("beach") ||
    location.includes("coast") ||
    location.includes("sea")
  ) {
    return <FaUmbrellaBeach className="text-4xl text-blue-400" />;
  } else if (location.includes("island")) {
    return <FaWater className="text-4xl text-emerald-400" />;
  } else if (
    location.includes("forest") ||
    location.includes("national park") ||
    location.includes("woods")
  ) {
    return <FaTree className="text-4xl text-green-500" />;
  } else if (
    location.includes("mountain") ||
    location.includes("alps") ||
    location.includes("hill")
  ) {
    return <FaMountain className="text-4xl text-stone-500" />;
  } else if (
    location.includes("tropical") ||
    location.includes("hawaii") ||
    location.includes("caribbean")
  ) {
    return <FaWater className="text-4xl text-amber-500" />;
  } else {
    return <FaCity className="text-4xl text-violet-400" />;
  }
};

// Helper to get weather icon based on weather code
const getWeatherIcon = (weatherId) => {
  if (weatherId >= 200 && weatherId < 300) {
    return <RiDrizzleLine className="text-4xl text-gray-400" />; // Thunderstorm
  } else if (weatherId >= 300 && weatherId < 500) {
    return <RiDrizzleLine className="text-4xl text-blue-300" />; // Drizzle
  } else if (weatherId >= 500 && weatherId < 600) {
    return <RiDrizzleLine className="text-4xl text-blue-400" />; // Rain
  } else if (weatherId >= 600 && weatherId < 700) {
    return <RiSnowyLine className="text-4xl text-gray-100" />; // Snow
  } else if (weatherId >= 700 && weatherId < 800) {
    return <RiCloudyLine className="text-4xl text-gray-400" />; // Atmosphere (fog, mist)
  } else if (weatherId === 800) {
    return <RiSunLine className="text-4xl text-yellow-400" />; // Clear
  } else {
    return <RiCloudyLine className="text-4xl text-gray-400" />; // Clouds
  }
};

const GeneralInfo = ({ trip }) => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [imageGallery, setImageGallery] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Get userId and chatId from multiple sources if not in trip
  const userId =
    trip?.userId ||
    localStorage.getItem("userId") ||
    sessionStorage.getItem("userId");
  const chatId = trip?.chatId || localStorage.getItem("chatId");

  const fetchCoordinates = async (locationName) => {
    try {
      const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        locationName
      )}.json?access_token=${mapboxgl.accessToken}`;
      const response = await axios.get(geocodingUrl);
      const { features } = response.data;
      return features?.[0]?.center || null;
    } catch (error) {
      console.error("Error fetching coordinates:", error);
      return null;
    }
  };

  const fetchDestinationInfo = async (coordinates) => {
    try {
      const wikipediaUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${trip?.vacation_location}`;
      const response = await axios.get(wikipediaUrl);
      return response.data;
    } catch (error) {
      console.error("Error fetching destination information:", error);
      return null;
    }
  };

  // Fetch real weather data from OpenWeather API
  const fetchWeather = async (coordinates) => {
    if (!coordinates) return null;

    // Get the API key from environment variable, or use a fallback for development
    const apiKey =
      import.meta.env.VITE_OPENWEATHER_API_KEY ||
      "1234567890abcdef1234567890abcdef";

    try {
      const [lon, lat] = coordinates;
      const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      const response = await axios.get(weatherUrl);

      // Extract current weather and forecast
      const currentWeather = response.data.list[0];
      const forecasts = [
        response.data.list[0], // Now
        response.data.list[8], // +24h (next day)
        response.data.list[16], // +48h (day after tomorrow)
      ];

      return {
        current: {
          temp: Math.round(currentWeather.main.temp),
          feels_like: Math.round(currentWeather.main.feels_like),
          description: currentWeather.weather[0].description,
          weatherId: currentWeather.weather[0].id,
          windSpeed: currentWeather.wind.speed,
          humidity: currentWeather.main.humidity,
        },
        forecast: forecasts.map((forecast) => ({
          date: new Date(forecast.dt * 1000),
          temp: Math.round(forecast.main.temp),
          weatherId: forecast.weather[0].id,
          description: forecast.weather[0].description,
        })),
      };
    } catch (error) {
      console.error("Error fetching weather:", error);
      // Fallback to mock data if API call fails
      return {
        current: {
          temp: Math.floor(15 + Math.random() * 20),
          weatherId: 800,
          description: "Clear sky",
        },
        forecast: [
          {
            date: new Date(),
            temp: Math.floor(15 + Math.random() * 20),
            weatherId: 800,
            description: "Clear sky",
          },
          {
            date: new Date(Date.now() + 86400000),
            temp: Math.floor(15 + Math.random() * 20),
            weatherId: 801,
            description: "Few clouds",
          },
          {
            date: new Date(Date.now() + 172800000),
            temp: Math.floor(15 + Math.random() * 20),
            weatherId: 802,
            description: "Scattered clouds",
          },
        ],
      };
    }
  };

  // Fetch images from Unsplash via their API
  const fetchAdditionalImages = async (location) => {
    try {
      // Use Pixabay API for more reliable image loading
      const baseImageURL = `https://pixabay.com/api/?key=35616753-b8ecfc14482a997fa5818f926&q=${encodeURIComponent(
        location
      )}&image_type=photo&orientation=horizontal&per_page=4`;
      const response = await axios.get(baseImageURL);

      if (response.data.hits && response.data.hits.length > 0) {
        return response.data.hits.map((hit) => hit.largeImageURL);
      }

      // Fallback to direct URLs if Pixabay fails or returns no results
      return [
        `https://images.pexels.com/photos/442580/pexels-photo-442580.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1`,
        `https://images.pexels.com/photos/538168/pexels-photo-538168.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1`,
        `https://images.pexels.com/photos/2450296/pexels-photo-2450296.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1`,
        `https://images.pexels.com/photos/5322398/pexels-photo-5322398.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1`,
      ];
    } catch (error) {
      console.error("Error fetching additional images:", error);
      console.error("bro");

      return [
        `https://images.pexels.com/photos/442580/pexels-photo-442580.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1`,
        `https://images.pexels.com/photos/538168/pexels-photo-538168.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1`,
        `https://images.pexels.com/photos/2450296/pexels-photo-2450296.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1`,
        `https://images.pexels.com/photos/5322398/pexels-photo-5322398.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1`,
      ];
    }
  };

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        setLoading(true);
        const coordinates = await fetchCoordinates(trip?.vacation_location);
        if (!coordinates) {
          console.error("Coordinates not found");
          setLoading(false);
          return;
        }

        const destinationInfo = await fetchDestinationInfo(coordinates);
        setInfo(destinationInfo);

        // Fetch additional data in parallel
        const [additionalImages, weatherData] = await Promise.all([
          fetchAdditionalImages(trip?.vacation_location),
          fetchWeather(coordinates),
        ]);

        setImageGallery(additionalImages);
        setWeather(weatherData);
      } catch (error) {
        console.error("Error fetching general info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [trip?.vacation_location]);

  // Separate useEffect for image rotation to prevent unnecessary re-runs
  useEffect(() => {
    if (imageGallery.length <= 1) return;

    const imageRotation = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % imageGallery.length);
    }, 5000);

    return () => clearInterval(imageRotation);
  }, [imageGallery.length]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="relative h-16 w-16">
          <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-blue-300 animate-pulse">
          Discovering {trip?.vacation_location}...
        </p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="text-center bg-red-900/20 p-6 rounded-xl">
        <RiInformationLine className="text-4xl text-red-400 mx-auto mb-3" />
        <p className="text-xl font-medium text-red-400">
          Information Not Found
        </p>
        <p className="text-gray-400">
          We couldnt find information about this destination.
        </p>
      </div>
    );
  }

  const mainImage = info?.thumbnail?.source
    ? `${info.thumbnail.source.replace(/\/\d+px-/, "/800px-")}`
    : "/placeholder.jpg";

  // Date formatting for weather forecast
  const formatDay = (date) => {
    return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
  };

  // Destination matches for animation
  const destinationTypes = [
    "beautiful city",
    "historic landmark",
    "natural wonder",
    "iconic destination",
    "unforgettable experience",
  ];

  return (
    <div className="destination-info">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-blue-900 mb-6"
      >
        <div
          className="absolute inset-0 z-0 opacity-40 bg-center bg-cover bg-no-repeat"
          style={{ backgroundImage: `url(${mainImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent z-10"></div>

        <div className="relative z-20 p-6 md:p-8 flex flex-col items-center text-center">
          <div className="mb-3">
            {getDestinationIcon(trip?.vacation_location)}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-2 text-white tracking-tight">
            {trip?.vacation_location}
          </h1>

          <div className="h-1 w-24 bg-blue-500 rounded-full mb-4"></div>

          <div className="mb-6 text-lg font-light text-blue-100">
            <TypeAnimation
              sequence={[
                `Your ${destinationTypes[0]} adventure awaits`,
                2000,
                `Your ${destinationTypes[1]} adventure awaits`,
                2000,
                `Your ${destinationTypes[2]} adventure awaits`,
                2000,
                `Your ${destinationTypes[3]} adventure awaits`,
                2000,
                `Your ${destinationTypes[4]} adventure awaits`,
                2000,
              ]}
              repeat={Infinity}
              speed={50}
              deletionSpeed={65}
              style={{ fontSize: "1em" }}
            />
          </div>

          {trip?.duration && (
            <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-4 flex items-center">
              <RiCalendarLine className="mr-2 text-yellow-300" />
              <span className="text-gray-200">{trip.duration} days</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Description Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md p-6 rounded-xl shadow-xl"
          >
            <h2 className="text-xl font-semibold text-blue-300 mb-3">
              About {trip?.vacation_location}
            </h2>
            <p className="text-gray-300 leading-relaxed">{info?.extract}</p>

            <a
              href={info.content_urls?.desktop?.page}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors group"
            >
              Read more on Wikipedia
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </a>
          </motion.div>

          {/* Images Gallery */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 backdrop-blur-md p-6 rounded-xl shadow-xl overflow-hidden"
          >
            <h2 className="text-xl font-semibold text-blue-300 mb-4">
              Gallery
            </h2>

            {/* Main Image */}
            <div className="relative aspect-video overflow-hidden rounded-lg mb-3 bg-gray-800 min-h-[300px]">
              {imageGallery.length > 0 ? (
                <motion.div
                  key={activeImageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  className="w-full h-full"
                >
                  <img
                    src={imageGallery[activeImageIndex]}
                    alt={`${trip?.vacation_location} - Image ${
                      activeImageIndex + 1
                    }`}
                    className="w-full h-full object-cover"
                    loading="eager"
                    onError={(e) => {
                      console.log("Image failed to load:", e.target.src);
                      // Try with a different fallback
                      if (!e.target.src.includes("pexels")) {
                        e.target.src = mainImage;
                      } else {
                        // Use a placeholder if even the main image fails
                        e.target.src =
                          "https://placehold.co/800x400/1f2937/e2e8f0?text=Image+Unavailable";
                      }
                    }}
                  />
                </motion.div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={mainImage}
                    alt={trip?.vacation_location}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://placehold.co/800x400/1f2937/e2e8f0?text=Image+Unavailable";
                    }}
                  />
                </div>
              )}

              {/* Image Navigation Dots */}
              {imageGallery.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
                  {imageGallery.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`w-3 h-3 rounded-full ${
                        activeImageIndex === index ? "bg-white" : "bg-white/50"
                      }`}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {imageGallery.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {imageGallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`block rounded-md overflow-hidden border-2 transition-all h-16 ${
                      activeImageIndex === idx
                        ? "border-blue-500 ring-2 ring-blue-300/50"
                        : "border-transparent opacity-70"
                    }`}
                    aria-label={`Select image ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://placehold.co/200x200/1f2937/e2e8f0?text=Image";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Weather Card */}
          {weather && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white/10 backdrop-blur-md p-6 rounded-xl shadow-xl"
            >
              <h2 className="text-xl font-semibold text-blue-300 mb-4">
                Weather
              </h2>

              <div className="flex items-center justify-center mb-6">
                {getWeatherIcon(weather.current.weatherId)}
                <div className="ml-3">
                  <div className="text-3xl font-bold text-white">
                    {weather.current.temp}°C
                  </div>
                  <div className="text-gray-400 capitalize">
                    {weather.current.description}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {weather.forecast.map((day, idx) => (
                  <div
                    key={idx}
                    className="text-center p-2 bg-white/5 rounded-lg"
                  >
                    <div className="text-gray-400 text-xs mb-1">
                      {idx === 0 ? "Today" : formatDay(day.date)}
                    </div>
                    <div className="flex justify-center">
                      {getWeatherIcon(day.weatherId)}
                    </div>
                    <div className="font-medium text-white mt-1">
                      {day.temp}°C
                    </div>
                  </div>
                ))}
              </div>

              {weather.current.humidity && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="bg-white/5 p-2 rounded-lg text-center">
                    <div className="text-xs text-gray-400">Humidity</div>
                    <div className="text-white">
                      {weather.current.humidity}%
                    </div>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg text-center">
                    <div className="text-xs text-gray-400">Wind</div>
                    <div className="text-white">
                      {weather.current.windSpeed} m/s
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Location Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white/10 backdrop-blur-md p-6 rounded-xl shadow-xl"
          >
            <h2 className="text-xl font-semibold text-blue-300 mb-4">
              Location
            </h2>

            <div className="aspect-square rounded-lg overflow-hidden mb-4 relative bg-gray-800">
              <RiMapPinLine className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500 text-3xl z-10 animate-bounce" />

              {/* Use an iframe with Google Maps instead of a static image */}
              <iframe
                title="Location Map"
                width="100%"
                height="100%"
                frameBorder="0"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=${
                  import.meta.env.VITE_GOOGLE_PLACE_API_KEY
                }&q=${encodeURIComponent(trip?.vacation_location)}&zoom=10`}
                allowFullScreen
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.parentElement.innerHTML += `<div class="absolute inset-0 flex items-center justify-center text-gray-400">Map unavailable</div>`;
                }}
              />

              {/* Static fallback if iframe is blocked or fails */}
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(
                  trip?.vacation_location
                )}&zoom=10&size=400x400&key=${
                  import.meta.env.VITE_GOOGLE_PLACE_API_KEY
                }`}
                alt="Map"
                className="absolute inset-0 w-full h-full object-cover opacity-0"
                style={{ display: "none" }}
                onLoad={(e) => {
                  const iframe = e.target.previousElementSibling;
                  if (
                    iframe &&
                    iframe.tagName === "IFRAME" &&
                    !iframe.offsetHeight
                  ) {
                    iframe.style.display = "none";
                    e.target.style.display = "block";
                    e.target.style.opacity = "1";
                  }
                }}
                onError={() => {}} // Silent fail, iframe is primary
              />
            </div>

            <div className="flex space-x-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  trip?.vacation_location
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 bg-blue-600/70 hover:bg-blue-500/70 transition-colors rounded-lg text-white font-medium text-center"
              >
                Google Maps
              </a>
              <a
                href={`https://www.waze.com/ul?q=${encodeURIComponent(
                  trip?.vacation_location
                )}&navigate=yes`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 bg-green-600/70 hover:bg-green-500/70 transition-colors rounded-lg text-white font-medium text-center"
              >
                Waze
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default GeneralInfo;
