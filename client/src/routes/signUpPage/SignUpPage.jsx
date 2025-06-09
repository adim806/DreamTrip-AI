import './signUpPage.css'
import { SignUp } from '@clerk/clerk-react'
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
} from '@react-three/postprocessing';
import { Environment, Stars, Float } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { dark, neobrutalism } from '@clerk/themes';
import { Earth } from "@/models/Earth";

const SignUpPage = () => {
  return (
    <div className="relative w-screen h-screen">
      {/* Canvas for visual effects */}
      <Canvas
        shadows
        className="absolute inset-0 w-full h-full"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <EffectComposer>
          <Bloom
            intensity={0.8}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            height={300}
          />
          <ChromaticAberration offset={[0.0002, 0.0002]} />
          <Vignette eskil={false} offset={0.1} darkness={0.6} />
        </EffectComposer>
        <color attach="background" args={['#000']} />
        
        {/* Ambient lighting */}
        <ambientLight intensity={0.45} />
        
        {/* Main lights for the Earth */}
        <directionalLight position={[10, 10, 5]} intensity={1.2} color="#ffffff" />
        <directionalLight position={[-10, -10, -5]} intensity={0.4} color="#6495ED" />
        <spotLight position={[0, 15, 10]} angle={0.5} penumbra={1} intensity={0.8} color="#ffffff" />
        
        {/* Additional light specifically for clouds */}
        <pointLight position={[20, 5, -30]} intensity={0.8} color="#ffffff" />
        
        <Environment preset="night" />

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

        {/* Earth model in the background - positioned on the other side compared to SignIn */}
        <Float
          speed={0.1}
          rotationIntensity={0.02}
          floatIntensity={0.03}
          floatingRange={[0.01, 0.02]}
        >
          <Earth position={[-18, -2, -40]} scale={0.38} />
        </Float>
      </Canvas>

      {/* SignUp container */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="signup-form-container">
          <SignUp 
            path="/sign-up" 
            signInUrl="/sign-in"
            appearance={{
              baseTheme: [dark, neobrutalism],
              variables: {
                colorPrimary: '#10b981',
                colorBackground: '#023e7d',
                fontFamily: 'Roboto, sans-serif',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;