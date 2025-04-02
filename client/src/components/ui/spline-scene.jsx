'use client'

import { Suspense, lazy } from 'react'
const Spline = lazy(() => import('@splinetool/react-spline'))

/**
 * SplineScene Component
 * 
 * Renders a 3D scene using Spline with a loading fallback.
 * 
 * @param {Object} props - Component props
 * @param {string} props.scene - URL to the Spline scene
 * @param {string} props.className - Optional CSS class name
 * @returns {JSX.Element} The rendered component
 */
export function SplineScene({ scene, className }) {
  return (
    <Suspense 
      fallback={
        <div className="w-full h-full flex items-center justify-center">
          <span className="loader"></span>
        </div>
      }
    >
      <div className="w-full h-full [&>div]:w-full [&>div]:h-full">
        <Spline
          scene={scene}
          className={className}
        />
      </div>
    </Suspense>
  )
} 