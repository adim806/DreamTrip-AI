'use client'

import { useRef, useState, useEffect } from 'react'

/**
 * Spotlight Component
 * 
 * Creates an interactive spotlight effect that follows the mouse movement.
 * 
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.fill - Fill color of the spotlight
 * @returns {JSX.Element} The rendered component
 */
export function Spotlight({ className = "", fill = "white" }) {
  const spotlightRef = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)
  const [isMoving, setIsMoving] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!spotlightRef.current) return
      
      const spotlightRect = spotlightRef.current.getBoundingClientRect()
      
      const relativeX = e.clientX - spotlightRect.left
      const relativeY = e.clientY - spotlightRect.top
      
      setPosition({ x: relativeX, y: relativeY })
      setOpacity(0.03)
      setIsMoving(true)
      
      clearTimeout(spotlightRef.current.movingTimeout)
      spotlightRef.current.movingTimeout = setTimeout(() => {
        setIsMoving(false)
        setOpacity(0.02)
      }, 1000)
    }

    const handleMouseLeave = () => {
      setOpacity(0)
    }

    const handleMouseEnter = () => {
      setOpacity(0.02)
    }

    window.addEventListener('mousemove', handleMouseMove)
    spotlightRef.current?.addEventListener('mouseleave', handleMouseLeave)
    spotlightRef.current?.addEventListener('mouseenter', handleMouseEnter)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      spotlightRef.current?.removeEventListener('mouseleave', handleMouseLeave)
      spotlightRef.current?.removeEventListener('mouseenter', handleMouseEnter)
      clearTimeout(spotlightRef.current?.movingTimeout)
    }
  }, [])

  return (
    <div
      ref={spotlightRef}
      className={`pointer-events-none absolute inset-0 z-30 transition-all duration-1500 ease-in-out ${className}`}
      style={{
        background: isMoving
          ? `radial-gradient(450px circle at ${position.x}px ${position.y}px, 
              ${fill}${Math.round(opacity * 100)}%, 
              rgba(255,255,255,0.01) 20%, 
              transparent 40%)`
          : `radial-gradient(450px circle at ${position.x}px ${position.y}px, 
              ${fill}${Math.round(opacity * 100)}%, 
              rgba(255,255,255,0.01) 20%, 
              transparent 40%)`
      }}
    />
  )
} 