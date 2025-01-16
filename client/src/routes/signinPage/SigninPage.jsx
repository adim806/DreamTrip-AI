import { SignIn } from '@clerk/clerk-react';
import {
  EffectComposer,
  DepthOfField,
  Bloom,
  Vignette,
} from '@react-three/postprocessing';
import { Sparkles, Environment } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { dark, neobrutalism, shadesOfPurple } from '@clerk/themes'
const SigninPage = () => {
  return (
    <div className="relative w-screen h-screen">
      {/* Canvas for visual effects */}
      <Canvas
        shadows
        className="absolute inset-0 w-full h-full"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <EffectComposer>
          <DepthOfField
            focusDistance={0}
            focalLength={0.02}
            bokehScale={5}
            height={480}
          />
          <Bloom
            intensity={2}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            height={1000}
          />
          <Vignette eskil={false} offset={0.001} darkness={1.0} />
        </EffectComposer>
        <color attach="background" args={['#000']} />
        <ambientLight intensity={2} />
        <spotLight
          position={[0, 25, 0]}
          angle={1.3}
          penumbra={1}
          castShadow
          intensity={2}
          shadow-bias={-0.0001}
        />
        <Environment preset="warehouse" />
        <Sparkles
          noise={0}
          count={1000}
          speed={0.01}
          size={0.6}
          color={'#FFD2BE'}
          opacity={1.6}
          scale={[100, 100, 100]}
        />
        <Sparkles
          noise={0}
          count={800}
          speed={0.02}
          size={1}
          color={'#FFF'}
          opacity={1.6}
          scale={[50, 50, 50]}
        />
      </Canvas>

      {/* SignIn container */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div
          style={{
            transform: 'scale(0.7) translate(650px, -180px)', // Scaling and positioning adjustments
            transformOrigin: 'center',
          }}
        >
          <SignIn
            path="/sign-in"
            signUpUrl="/sign-up"
            forceRedirectUrl="/dashboard"
            appearance={{
              baseTheme: [dark, neobrutalism],
              variables: {
                colorPrimary: '#10b981',
                colorBackground: '#023e7d',
                fontFamily: 'Roboto, sans-serif',
              },
              signIn: {
                baseTheme: [shadesOfPurple],
                variables: { colorPrimary: 'blue' },
              },

            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SigninPage;