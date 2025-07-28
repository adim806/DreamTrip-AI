import { QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SplineSceneBasic } from '../../components/ui/spline-scene-demo';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import './DashboardPage.css';
import { useAuth } from '@clerk/clerk-react';

/**
 * DashboardPage Component
 *
 * This component is the main dashboard where users can create new chats, analyze images, or get coding assistance.
 * It includes an input form to submit queries, which initiates new chats.
 * 
 * ### Key Functionalities:
 * - **Mutation for New Chat Creation**: Creates a new chat with a POST request and navigates to the newly created chat's page.
 * - **Form Submission Handling**: Submits user input and triggers the mutation to create a chat.
 * 
 * ### React Query Usage:
 * - **useQueryClient**: For cache management, allowing the chat list to be refetched upon new chat creation.
 * - **useMutation**: For posting new chat requests to the server, invalidating cache for recent chats to stay updated.
 * 
 * ### Navigation:
 * - Redirects the user to the newly created chat's page after successful chat creation.
 * 
 * @component
 * @returns {JSX.Element} The rendered component for the Dashboard page.
 */

const DashboardPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);
  const { userId } = useAuth();
  const [popularDestinations] = useState([
    { name: "Paris", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=200&auto=format&fit=crop" },
    { name: "Tokyo", image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=200&auto=format&fit=crop" },
    { name: "Santorini", image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=200&auto=format&fit=crop" },
  ]);

  // Create stars for the background
  const [stars] = useState(() => 
    Array.from({ length: 30 }, () => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 2 + 1}px`,
      delay: `${Math.random() * 4}s`
    }))
  );

  const mutation = useMutation({
    mutationFn: async(text) => {
      // Include userId as a query parameter
      return fetch(`${import.meta.env.VITE_API_URL}/api/chats?userId=${userId}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({text}),
      }).then(res => res.json())
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["userChats"] });
      // Set exit animation before navigating
      setIsExiting(true);
      setTimeout(() => {
        navigate(`/dashboard/chats/${id}`);
      }, 600); // Match animation duration
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = e.target.text.value;
    if(!text) return;
    mutation.mutate(text);
  };

  // Set animations
  const pageVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } },
    exit: { opacity: 0, y: 20, transition: { duration: 0.5 } }
  };

  // Common styles
  const glassEffect = "backdrop-filter backdrop-blur-md bg-opacity-30 border border-white/10 shadow-xl";

  return (
    <motion.div 
      className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#031525] via-[#082548] to-[#0a2955]"
      initial="hidden"
      animate={isExiting ? "exit" : "visible"}
      variants={pageVariants}
    >
      {/* Background Glow Effects */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full filter blur-3xl"></div>
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-purple-500/5 rounded-full filter blur-3xl"></div>
      
      {/* Animated constellations */}
      <div className="absolute inset-0 bg-[url('/Stars.jpg')] opacity-20 bg-cover bg-center mix-blend-screen"></div>
      
      {/* Dynamic stars */}
      {stars.map((star, i) => (
        <div 
          key={i}
          className="star"
          style={{ 
            top: star.top, 
            left: star.left, 
            width: star.size, 
            height: star.size,
            animationDelay: star.delay
          }}
        />
      ))}
      
      {/* Flight path animations */}
      <div className="flight-path"></div>
      
      {/* Floating clouds */}
      <div className="cloud cloud-1"></div>
      <div className="cloud cloud-2"></div>
      
      {/* Background Spline Scene Container */}
      <div className="absolute inset-0 w-full h-full">
        <SplineSceneBasic />
      </div>

      {/* Content Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="relative h-full flex flex-col items-center px-8">
          <div className="flex-1 flex flex-col items-center w-full max-w-6xl mx-auto pt-3">
            {/* Logo Section */}
            <motion.div 
              className={`flex items-start ml-[-150px] rounded-2xl px-2 pb-0 ${glassEffect} pointer-events-auto enhanced-glass`}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <img src="logo.png" alt="" className="w-16 h-16 mt-0 filter drop-shadow-lg logo-animate" />
              <h1 className="text-6xl bg-gradient-to-r from-[#217bfe] via-[#6c8dff] to-[#e55571] bg-clip-text text-transparent font-bold drop-shadow-sm mb-0">
                DreamTrip-AI
              </h1>
            </motion.div>
          </div>

          {/* Popular Destinations Section */}
          <motion.div
            className="flex justify-center mt-0 mb-4 w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex gap-4 overflow-x-auto px-2 py-1 max-w-3xl">
              {popularDestinations.map((destination, index) => (
                <motion.div
                  key={destination.name}
                  className="relative flex-shrink-0 w-32 h-20 rounded-xl overflow-hidden pointer-events-auto cursor-pointer group destination-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                  whileHover={{ y: -3, scale: 1.03 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10"></div>
                  <img src={destination.image} alt={destination.name} className="w-full h-full object-cover" />
                  <span className="absolute bottom-2 left-3 text-white text-sm font-medium z-20 group-hover:text-blue-200 transition-colors">
                    {destination.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Travel Tips */}
          <motion.div
            className="w-full max-w-3xl mx-auto mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="flex justify-center gap-3">
              {[
                { icon: "✈️", text: "Flight Planning" },
                { icon: "🏨", text: "Hotel Bookings" },
                { icon: "🍽️", text: "Restaurant Tips" },
                { icon: "🚶", text: "Local Attractions" }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className={`${glassEffect} bg-white/5 rounded-full px-3 py-1 text-sm text-white/80 flex items-center gap-2 travel-icon`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }}
                >
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Input Section */}
          <motion.div 
            className={`mt-auto w-full max-w-2xl ${glassEffect} enhanced-glass bg-white/5 rounded-2xl mb-20 pointer-events-auto border border-white/10`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            whileHover={{ boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 16px rgba(59, 130, 246, 0.15)" }}
          >
            <form className="w-full flex items-center justify-between" onSubmit={handleSubmit}>
              <input 
                type="text" 
                name="text" 
                placeholder="Where do you want to travel to?" 
                className="flex-1 py-4 px-6 bg-transparent border-none outline-none text-white text-lg placeholder-white/40 focus:ring-2 focus:ring-blue-500/30 rounded-l-2xl transition-all travel-input" 
              />
              <motion.button 
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 rounded-full cursor-pointer p-4 m-3 flex items-center justify-center transition-all btn-travel"
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
              >
                <img src="/arrow.png" alt="" className="w-5 h-5 drop-shadow-md" />
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Add subtle animated particles for improved atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.3 + 0.1,
            }}
            animate={{
              y: [0, Math.random() * 100 - 50],
              opacity: [Math.random() * 0.3 + 0.1, 0],
            }}
            transition={{
              repeat: Infinity,
              repeatType: "loop",
              duration: Math.random() * 8 + 4,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>
      
      {/* Footer with subtle branding */}
      <motion.div 
        className="absolute bottom-4 w-full flex justify-center items-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <div className="text-xs text-white/30 text-center">
          AI-powered travel planning • Personalized itineraries • Local insights
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;