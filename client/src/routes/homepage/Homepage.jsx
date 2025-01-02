import { Parallax, ParallaxLayer } from '@react-spring/parallax';
import './homepage.css';

const Homepage = () => {
  return (
    <Parallax pages={2}>
      {/* עמוד 1: תמונת הרקע הראשונה */}
      <ParallaxLayer
        offset={0}
        speed={0.5}
        factor={1} /* גורם לפיזור רקע מלא */
        style={{
          backgroundImage: 'url(/A11.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          zIndex: 1,
        }}
      >
        <div className="content-layer">
          <h1 className="main-title">Welcome to DreamTrip-AI</h1>
          <p className="subtitle">Your personalized travel assistant</p>
          <button className="cta-btn">Get Started</button>
        </div>
      </ParallaxLayer>

      {/* עמוד 2: ABOUT DreamTrip-AI */}
      <ParallaxLayer
        offset={1}
        speed={0.5}
        factor={1} /* התאמה לתמונת הרקע השנייה */
        style={{
          backgroundImage: 'url(/D1.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          zIndex: 2,
        }}
      >
        <div className="about-section">
          <h2>About DreamTrip-AI</h2>
          <p>
            DreamTrip-AI is your ultimate travel assistant, offering AI-driven personalized itineraries. We help you explore the world effortlessly with features tailored to your preferences, budget, and schedule.
          </p>
          <div className="features">
            <div className="feature-item">
              <img src="/icons/personalized.png" alt="Personalized Trips" />
              <h3>Personalized Itineraries</h3>
              <p>Crafted just for you.</p>
            </div>
            <div className="feature-item">
              <img src="/icons/eco-friendly.png" alt="Eco-Friendly" />
              <h3>Eco-Friendly Travel</h3>
              <p>Focus on sustainability.</p>
            </div>
            <div className="feature-item">
              <img src="/icons/real-time.png" alt="Real-Time Updates" />
              <h3>Real-Time Assistance</h3>
              <p>Stay informed while you travel.</p>
            </div>
          </div>
        </div>
      </ParallaxLayer>
    </Parallax>
  );
};

export default Homepage;
