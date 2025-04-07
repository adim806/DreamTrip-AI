"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

/**
 * NavBar Component with tubelight effect
 * @param {Object[]} items - Array of navigation items
 * @param {string} items[].name - Name of the navigation item
 * @param {string} items[].url - URL of the navigation item
 * @param {Component} items[].icon - Icon component for the navigation item
 * @param {string} className - Additional CSS classes
 * @param {function} onTabChange - Callback when active tab changes
 */
export function NavBar({ items, className, onTabChange }) {
  const [activeTab, setActiveTab] = useState(items[0]?.name)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleTabChange = (item) => {
    setActiveTab(item.name)
    if (onTabChange) {
      onTabChange(item)
    }
  }

  return (
    <div
      className={cn(
        "z-10",
        className,
      )}
    >
      <div className="flex items-center justify-center bg-gray-900/90 backdrop-blur-lg py-1 px-2 rounded-full shadow-lg">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name

          return (
            <button
              key={item.name}
              onClick={() => handleTabChange(item)}
              className={cn(
                "relative cursor-pointer text-xs font-medium px-3 py-1 rounded-full transition-colors mx-1",
                "text-gray-400 hover:text-gray-200",
                isActive && "text-white font-semibold"
              )}
            >
              <span className="hidden md:flex items-center">
                {Icon && <Icon className={cn(
                  "w-3.5 h-3.5 mr-1 transition-all",
                  isActive && "text-blue-400"
                )} />}
                {item.name}
              </span>
              <span className="md:hidden">
                {Icon && <Icon className={cn(
                  "w-4 h-4 transition-all",
                  isActive && "text-blue-400"
                )} />}
              </span>
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 w-full bg-gray-800 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-t-full">
                    <div className="absolute w-10 h-5 bg-blue-500/30 rounded-full blur-md -top-2 -left-1" />
                    <div className="absolute w-4 h-3 bg-blue-400/40 rounded-full blur-sm -top-1 left-2" />
                  </div>
                </motion.div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
} 