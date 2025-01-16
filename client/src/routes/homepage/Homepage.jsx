import { Parallax, ParallaxLayer } from "@react-spring/parallax";
import { useSpring, animated } from "react-spring";
import { useInView } from "react-intersection-observer";
import "./homepage.css";
import Footer from "@/components/footer/Footer";

const AnimatedTitle = ({ children }) => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.5 });
  const animation = useSpring({
    opacity: inView ? 1 : 0,
    transform: inView ? "translateY(0)" : "translateY(50px)",
  });

  return (
    <animated.h1
      style={animation}
      ref={ref}
      className="main-title animated-title"
    >
      {children}
    </animated.h1>
  );
};

const AnimatedSubtitle = ({ children }) => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.5 });
  const animation = useSpring({
    opacity: inView ? 1 : 0,
    transform: inView ? "translateY(0)" : "translateY(30px)",
  });

  return (
    <animated.p
      style={animation}
      ref={ref}
      className="subtitle animated-subtitle"
    >
      {children}
    </animated.p>
  );
};

const AnimatedFeature = ({ icon, title, description }) => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.5 });
  const animation = useSpring({
    opacity: inView ? 1 : 0,
    transform: inView ? "scale(1)" : "scale(0.8)",
  });

  return (
    <animated.div ref={ref} style={animation} className="feature-item">
      <img src={icon} alt={title} className="feature-icon" />
      <h3>{title}</h3>
      <p>{description}</p>
    </animated.div>
  );
};

const Homepage = () => {
  return (
    <Parallax pages={4}>
      {/* Page 1: First Background */}
      <ParallaxLayer
        offset={0}
        speed={0.5}
        factor={2}
        style={{
          backgroundImage: "url(/A11.png)",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          height: "100vh",
          width: "100vw",
        }}
      >
        <div className="content-layer">
          <AnimatedTitle>Welcome to DreamTrip-AI</AnimatedTitle>
          <AnimatedSubtitle>
            Your personalized travel assistant
          </AnimatedSubtitle>
          <animated.button className="cta-btn">Plan Your Journey</animated.button>
        </div>
        <div className="layer-fade"></div>
      </ParallaxLayer>


      

      {/* Page 2: About Section */}
      <ParallaxLayer
        offset={3}
        speed={0.5}
        factor={1}
        style={{
          backgroundImage: "url(/D1.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          height: "100vh",
          width: "100vw",
        }}
      >
        <div className="about-section">
          <AnimatedTitle>About DreamTrip-AI</AnimatedTitle>
          <AnimatedSubtitle>
            DreamTrip-AI helps you explore destinations effortlessly with AI-driven personalized itineraries tailored to your needs.
          </AnimatedSubtitle>
          <div className="features">
            <AnimatedFeature
              icon="/personalization.png"
              title="Personalized Trips"
              description="Tailored experiences crafted just for you."
            />
            <AnimatedFeature
              icon="/environmentalism.png"
              title="Eco-Friendly Travel"
              description="Sustainability at the core of every journey."
            />
            <AnimatedFeature
              icon="/real-time.png"
              title="Real-Time Updates"
              description="Stay informed with live suggestions."
            />
            <AnimatedFeature
              icon="/cyber-security.png"
              title="Secure Bookings"
              description="Book with confidence and ease."
            />
          </div>
          
        </div>
        
      </ParallaxLayer>
      
    </Parallax>
    
  );
};

export default Homepage;
