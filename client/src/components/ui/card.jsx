import { forwardRef } from 'react'

/**
 * Card Component
 * 
 * A flexible card component that can be used as a container for content.
 * 
 * @component
 */
const Card = forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`rounded-lg border border-neutral-200 bg-white text-neutral-950 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 ${className}`}
      {...props}
    />
  )
})

Card.displayName = "Card"

export { Card } 