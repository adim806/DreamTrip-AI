import React from "react";
import { motion } from "framer-motion";

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 py-12 px-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-full h-[50vh] bg-gradient-to-tl from-blue-500/5 to-transparent rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
      </motion.div>

      <div className="container mx-auto max-w-6xl relative">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-16 text-center"
        >
          <div className="inline-block relative mb-6">
            <motion.div 
              className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-blue-500/30 to-primary/30 rounded-full blur-md"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            ></motion.div>
            <div className="relative">
              <img 
                src="/logo.png"
                alt="DreamTrip AI Logo"
                className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-background shadow-xl"
              />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">
            DreamTrip AI
          </h1>
          <p className="text-xl md:text-2xl text-foreground/70 font-light max-w-2xl mx-auto">
            Your AI-powered travel companion that transforms dreams into journeys
          </p>
          <div className="flex justify-center mt-8">
            <motion.div 
              className="h-1 w-16 bg-gradient-to-r from-primary to-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: "4rem" }}
              transition={{ duration: 1, delay: 0.5 }}
            ></motion.div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col gap-8"
          >
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-2xl blur-sm"></div>
              <div className="relative bg-card/80 backdrop-blur-sm border border-primary/10 rounded-xl p-8 shadow-xl">
                <div className="absolute -top-4 -right-4 bg-primary/10 w-20 h-20 rounded-full blur-2xl"></div>
                <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
                  <span className="bg-primary/10 w-10 h-10 flex items-center justify-center rounded-full mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Our Mission
                </h2>
                <p className="text-foreground/80 text-lg leading-relaxed">
                  We aim to make travel planning simple, enjoyable, and personalized. 
                  Our AI-driven platform eliminates the stress and time-consuming research 
                  traditionally associated with planning trips, allowing you to focus on 
                  creating memories that last a lifetime.
                </p>
                <div className="absolute h-40 w-40 bg-blue-500/5 rounded-full blur-3xl -bottom-10 -left-10 z-0"></div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="bg-gradient-to-br from-primary/5 to-blue-500/5 backdrop-blur-sm border border-primary/10 rounded-xl p-8 shadow-lg"
            >
              <h2 className="text-2xl font-bold text-primary mb-6 flex items-center">
                <span className="bg-primary/10 w-10 h-10 flex items-center justify-center rounded-full mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </span>
                Our Team
              </h2>
              <div className="prose prose-lg dark:prose-invert">
                <p className="text-foreground/80 text-lg leading-relaxed">
                  DreamTrip AI is built by a passionate team of travel enthusiasts, 
                  AI specialists, and customer experience experts dedicated to 
                  transforming the travel planning industry.
                </p>
                <p className="text-foreground/80 text-lg leading-relaxed">
                  We combine deep expertise in machine learning, travel industry knowledge,
                  and beautiful design to create an experience that feels both powerful and personal.
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col gap-8"
          >
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-primary/20 rounded-2xl blur-sm"></div>
              <div className="relative bg-card/80 backdrop-blur-sm border border-primary/10 rounded-xl p-8 shadow-xl">
                <div className="absolute -top-4 -left-4 bg-blue-500/10 w-20 h-20 rounded-full blur-2xl"></div>
                <h2 className="text-2xl font-bold text-primary mb-6 flex items-center">
                  <span className="bg-primary/10 w-10 h-10 flex items-center justify-center rounded-full mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                    </svg>
                  </span>
                  What We Offer
                </h2>
                <ul className="space-y-3">
                  {[
                    "AI-generated personalized trip itineraries",
                    "Smart recommendations for attractions and activities",
                    "Interactive travel planning experience",
                    "Seamless trip management and sharing",
                    "Real-time weather and local insights"
                  ].map((item, index) => (
                    <motion.li 
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + (index * 0.1) }}
                      className="flex items-start"
                    >
                      <span className="bg-gradient-to-r from-primary to-blue-500 w-6 h-6 rounded-full flex items-center justify-center text-white mr-3 flex-shrink-0 mt-0.5">✓</span>
                      <span className="text-foreground/80 text-lg">{item}</span>
                    </motion.li>
                  ))}
                </ul>
                <div className="absolute h-40 w-40 bg-primary/5 rounded-full blur-3xl -bottom-10 -right-10 z-0"></div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.7 }}
              className="bg-gradient-to-br from-blue-500/5 to-primary/5 backdrop-blur-sm border border-primary/10 rounded-xl p-8 shadow-lg relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
              <h2 className="text-2xl font-bold text-primary mb-6 flex items-center relative z-10">
                <span className="bg-primary/10 w-10 h-10 flex items-center justify-center rounded-full mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </span>
                Innovative Technology
              </h2>
              <div className="prose prose-lg dark:prose-invert relative z-10">
                <p className="text-foreground/80 text-lg leading-relaxed">
                  Our platform leverages cutting-edge AI and machine learning 
                  algorithms to understand your travel preferences and create 
                  tailored experiences that match your unique style.
                </p>
                <p className="text-foreground/80 text-lg leading-relaxed">
                  With our advanced natural language processing, the more you 
                  interact with DreamTrip AI, the better it gets at suggesting 
                  destinations and activities that you'll love.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* How It Works Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">How It Works</h2>
            <div className="flex justify-center">
              <motion.div 
                className="h-1 w-20 bg-gradient-to-r from-primary to-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "5rem" }}
                transition={{ duration: 1, delay: 1 }}
              ></motion.div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent hidden md:block"></div>
            {[
              {
                step: "1",
                title: "Tell Us Your Preferences",
                description: "Share your travel style, interests, and must-see destinations to help us understand your ideal trip."
              },
              {
                step: "2",
                title: "AI Creates Your Itinerary",
                description: "Our advanced AI generates a custom travel plan optimized for your preferences, schedule, and budget."
              },
              {
                step: "3",
                title: "Refine & Explore",
                description: "Fine-tune your plan with real-time feedback and discover amazing experiences tailored just for you."
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 + (index * 0.2) }}
                className="relative z-10"
              >
                <div className="bg-card/80 backdrop-blur-sm border border-primary/10 rounded-xl p-8 shadow-lg text-center relative h-full">
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gradient-to-b from-primary to-blue-500 w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {item.step}
                  </div>
                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-primary mb-4">{item.title}</h3>
                    <p className="text-foreground/70">{item.description}</p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* Testimonial Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mb-16"
        >
          <div className="bg-gradient-to-br from-primary/5 to-blue-500/5 backdrop-blur-sm border border-primary/10 rounded-xl p-8 md:p-12 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <svg className="w-12 h-12 text-primary/20 mb-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" />
              </svg>
              <p className="text-xl md:text-2xl font-medium text-foreground/90 italic max-w-3xl mb-8">
                "DreamTrip AI completely transformed our vacation planning. We got personalized recommendations 
                that felt like they were made just for us. It saved us hours of research and gave us 
                experiences we would have never discovered on our own."
              </p>
              <div className="flex items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-blue-500 flex items-center justify-center text-white font-bold text-2xl">
                  D
                </div>
                <div className="ml-4 text-left">
                  <h4 className="text-lg font-bold text-primary">David & Sarah</h4>
                  <p className="text-foreground/70">Frequent Travelers</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="text-center pt-8 border-t border-border/20"
        >
          <p className="text-foreground/60 text-sm">
            © {new Date().getFullYear()} DreamTrip AI. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AboutPage; 