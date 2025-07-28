'use client'

import React, { useState, useEffect, useRef } from 'react'

interface LazyLoaderProps {
  children: React.ReactNode
  threshold?: number
  placeholder?: React.ReactNode
  height?: string | number
}

export function LazyLoader({
  children,
  threshold = 0.1,
  placeholder,
  height = 'auto'
}: LazyLoaderProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        threshold,
        rootMargin: '50px'
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  useEffect(() => {
    if (isVisible) {
      // 약간의 지연을 두어 부드러운 로딩 효과
      const timer = setTimeout(() => {
        setHasLoaded(true)
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [isVisible])

  return (
    <div ref={ref} style={{ height }}>
      {!hasLoaded && placeholder && (
        <div className="animate-pulse">
          {placeholder}
        </div>
      )}
      {hasLoaded && children}
    </div>
  )
}

// 스켈레톤 로더 컴포넌트
export function SkeletonLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-200 rounded animate-pulse ${className}`}>
      <div className="h-4 bg-gray-300 rounded mb-2"></div>
      <div className="h-4 bg-gray-300 rounded mb-2 w-3/4"></div>
      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
    </div>
  )
} 