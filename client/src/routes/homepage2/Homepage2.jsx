import "./homepage2.css";
import {
  Environment,
  ScrollControls,
  Scroll,
  Float,
  Stars,
} from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { Earth } from "@/models/Earth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function Homepage2() {
  const navigate = useNavigate();
  const [earthPosition, setEarthPosition] = useState([25, -2, -45]);
  const { viewport } = useThree();
  
  // Adjust Earth position based on viewport size
  useEffect(() => {
    if (viewport.width < 8) {
      // For smaller screens
      setEarthPosition([17, -2, -45]);
    } else {
      // For larger screens
      setEarthPosition([25, -2, -45]);
    }
  }, [viewport.width]);
  
  return (
    <>
      <EffectComposer enabled={true}>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          height={300}
        />
        <ChromaticAberration offset={[0.0002, 0.0002]} />
        <Vignette eskil={false} offset={0.1} darkness={0.6} />
      </EffectComposer>
      
      <color attach="background" args={["#000"]} />
      
      {/* Ambient lighting */}
      <ambientLight intensity={0.45} />
      
      {/* Main lights for the Earth - positioned to highlight clouds */}
      <directionalLight position={[10, 10, 5]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-10, -10, -5]} intensity={0.4} color="#6495ED" />
      <spotLight position={[0, 15, 10]} angle={0.5} penumbra={1} intensity={0.8} color="#ffffff" />
      
      {/* Additional light specifically to illuminate clouds */}
      <pointLight position={[20, 5, -30]} intensity={0.8} color="#ffffff" />
      
      <Environment preset="night" />

      <ScrollControls pages={6.25} damping={0.25}>
        <Scroll>
          {/* Background stars */}
          <Stars 
            radius={100}
            depth={50}
            count={2000}
            factor={4}
            saturation={0}
            fade
            speed={0.2}
          />
          
          {/* Earth with visible cloud layer */}
          <Float
            speed={0.1}
            rotationIntensity={0.02}
            floatIntensity={0.03}
            floatingRange={[0.01, 0.02]}
          >
            <Earth position={earthPosition} scale={0.38} />
          </Float>
        </Scroll>
        
        <Scroll html style={{ width: "100%" }}>
          <Container style={{ height: "100px", position: "relative" }}>
            <Row
              className="text-center align-items-center justify-content-center"
              style={{
                position: "absolute",
                width: "100%",
                height: "100vh",
                padding: "0px 30px 0px",
              }}
            >
              <Col xs={6}>
                <div>
                  <h1 style={{ marginBottom: "0px" }}>
                    Welcome to DreamTrip-AI
                  </h1>        
                  <Button
                    className="cta-btn"
                    onClick={() => navigate("/dashboard")} 
                  >
                    Plan Your Journey
                  </Button>
                </div>
              </Col>
            </Row>
            <Row
              className="text-center align-items-center justify-content-center"
              style={{
                position: "absolute",
                width: "100%",
                height: "100vh",
                padding: "0px 30px 0px",
                top: "100vh",
              }}
            >
              <Col xs={6}>
                <div>
                  <h1 style={{ marginBottom: "0px" }}>
                    Sometimes you can feel
                  </h1>
                </div>
              </Col>
            </Row>
            <Row
              className="text-center align-items-center justify-content-center"
              style={{
                position: "absolute",
                width: "100%",
                height: "100vh",
                padding: "0px 30px 0px",
                top: "200vh",
              }}
            >
              <Col xs={6}>
                <div>
                  <h1 style={{ marginBottom: "0px" }}>Lost</h1>
                  <h1 style={{ marginBottom: "0px" }}>Overwhelmed</h1>
                  <h1 style={{ marginBottom: "0px" }}>Empty inside</h1>
                </div>
              </Col>
            </Row>
            <Row
              className="text-center align-items-center justify-content-center"
              style={{
                position: "absolute",
                width: "100%",
                height: "100vh",
                padding: "0px 30px 0px",
                top: "300vh",
              }}
            >
              <Col xs={6}>
                <div>
                  <h1 style={{ marginBottom: "0px" }}>
                    Drifting through life <br />
                    With no help or guidance
                  </h1>
                </div>
              </Col>
            </Row>

            <Row
              className="text-center align-items-center justify-content-center"
              style={{
                position: "absolute",
                width: "100%",
                height: "100vh",
                padding: "0px 30px 0px",
                top: "400vh",
              }}
            >
              <Col xs={8}>
                <div>
                  <h1 style={{ marginBottom: "0px" }}>
                    But there is hope...
                    <br /> and people who can help
                  </h1>
                </div>
              </Col>
            </Row>

            <Row
              className="text-center align-items-center justify-content-center"
              style={{
                position: "absolute",
                width: "100%",
                height: "100vh",
                padding: "0px 30px 0px",
                top: "500vh",
              }}
            >
              <Col xs={6}>
                <div>
                  <h1 style={{ marginBottom: "0px" }}>
                    Its time to get
                    <br /> the support you need
                  </h1>
                  <h2 style={{ marginBottom: "30px", marginTop: "-20px" }}>
                    To get your life back
                  </h2>
                  
                  <Button variant="outline-light" size="lg">
                    Get help now
                  </Button>{" "}
                </div>
              </Col>
            </Row>
          </Container>
        </Scroll>
      </ScrollControls>
    </>
  );
}

export default Homepage2;
