import "./homepage2.css";
import {
  Environment,
  Sparkles,
  ScrollControls,
  Scroll,
  Float,
} from "@react-three/drei";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  EffectComposer,
  DepthOfField,
  Bloom,
  Vignette,
} from "@react-three/postprocessing";
//import { Butterfly } from "@/models/Butterfly";
import { Butterfly2 } from "@/models/Butterfly2";
import { useNavigate } from "react-router-dom";

function Homepage2() {
  const navigate = useNavigate(); // הגדרת הניווט
  return (
    <>
      <EffectComposer>
        <DepthOfField
          focusDistance={0}
          focalLength={1.5}
          bokehScale={3}
          height={1200}
        />
        <Bloom
          intensity={2}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          height={1000}
        />
        <Vignette eskil={false} offset={0.001} darkness={0.8} />
      </EffectComposer>
      
      <color attach="background" args={["#000"]} />
      <ambientLight intensity={4} />
      <spotLight
        position={[0, 25, 0]}
        angle={1.3}
        penumbra={1}
        castShadow
        intensity={5}
        shadow-bias={-0.0001}
      />
      <Environment preset="warehouse" />

      <ScrollControls pages={6.25} damping={0.25}>
        <Scroll>
          {/* top */}

          <Float
            speed={1} // Animation speed, defaults to 1
            rotationIntensity={2} // XYZ rotation intensity, defaults to 1
            floatIntensity={0.2} // Up/down float intensity, works like a multiplier with floatingRange,defaults to 1
            floatingRange={[1, 1]} // Range of y-axis values the object will float within, defaults to [-0.1,0.1]
          >

            <Butterfly2
              rotation-x={Math.PI * 0.05}
              scale={1}
              position={[0, -3, 0]}
            />
            <Butterfly2 scale={2.5} position={[-10, 3, -6]} />
            <Butterfly2 scale={2.7} position={[10, -1, -10]} />

          </Float>
          {/* top */}

          {/* middle */}
          <Float
            speed={1} // Animation speed, defaults to 1
            rotationIntensity={1} // XYZ rotation intensity, defaults to 1
            floatIntensity={0.2} // Up/down float intensity, works like a multiplier with floatingRange,defaults to 1
            floatingRange={[1, 1]} // Range of y-axis values the object will float within, defaults to [-0.1,0.1]
          >
            <Butterfly2 scale={1.3} position={[-3, -10, 3]} />
            <Butterfly2 scale={2} position={[12, -15, -10]} />

          </Float>
          {/* middle */}

          {/* middle */}
          <Float
            speed={1} // Animation speed, defaults to 1
            rotationIntensity={2} // XYZ rotation intensity, defaults to 1
            floatIntensity={0.2} // Up/down float intensity, works like a multiplier with floatingRange,defaults to 1
            floatingRange={[1, 1]} // Range of y-axis values the object will float within, defaults to [-0.1,0.1]
          >

            <Butterfly2 scale={0.9} position={[-3, -19.5, 2]} />
            <Butterfly2 scale={0.9} position={[8, -23, -10]} />
            <Butterfly2 scale={1} position={[4, -24, 2]} />

          </Float>

          <Sparkles
            noise={0}
            count={1000}
            speed={0.01}
            size={4}
            color={"#FFD2BE"}
            opacity={0.1}
            scale={[30, 100, 30]}
          ></Sparkles>
          <Sparkles
            noise={0}
            count={150}
            speed={0.5}
            size={10 }
            color={"#FFF"}
            opacity={2}
            scale={[30, 100, 10]}
          ></Sparkles>
            <Butterfly2 scale={8} position={[0, -20, -10]} />
            <Butterfly2 scale={1.3} position={[-4, -24, 2]} />
            <Butterfly2 scale={0.8} position={[-4, -37, 2]} />
            <Butterfly2 scale={0.6} position={[2.5, -35, 2]} />
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
