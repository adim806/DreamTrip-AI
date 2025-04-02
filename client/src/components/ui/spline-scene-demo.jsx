'use client'

import { SplineScene } from "./spline-scene";
import { Card } from "./card";
import { Spotlight } from "./spotlight";
 
/**
 * SplineSceneBasic Component
 * 
 * A demo component that showcases the 3D Spline scene with text content.
 * 
 * @returns {JSX.Element} The rendered component
 */
export function SplineSceneBasic() {
  return (
    <div className="w-full h-full select-none">
      <Card className="w-full h-full bg-transparent border-0 overflow-hidden">
        <div className="relative w-full h-full">
          {/* Dark gradient overlays for depth */}
          <div className="absolute inset-0 bg-gradient-radial from-[#1a2e3b] via-[#1a2e3b]/95 to-[#0f1c24] opacity-90 z-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent z-0" />
          
          {/* Spotlight Effect */}
          <Spotlight
            className="left-0 top-0 md:-left-40 md:-top-40"
            fill="rgba(255, 255, 255) "
          />
          
          {/* Main Content */}
          <div className="absolute inset-0 flex">
            {/* Left content */}
            <div className="flex-1 p-8 z-10 flex flex-col justify-center pointer-events-none">
              <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white/90 to-white/40">
              Where to today?
              </h1>
              <p className="mt-4 text-white/60 max-w-lg font-light tracking-wide">
              Hey there, where would you like to go? I’m here to assist you in planning your experience. Ask me anything travel related.
              </p>
            </div>

            {/* Right content - Spline Scene */}
            <div className="absolute inset-0 z-0">
              <SplineScene 
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Subtle vignette effect */}
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/10 pointer-events-none z-20" />
        </div>
      </Card>
    </div>
  )
} 