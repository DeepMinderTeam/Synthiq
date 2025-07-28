import { useEffect, useRef } from 'react'

interface PerformanceMetrics {
  renderTime: number
  memoryUsage?: number
  timestamp: number
}

export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>(0)
  const renderCount = useRef<number>(0)

  useEffect(() => {
    renderStartTime.current = performance.now()
    renderCount.current++

    return () => {
      const renderTime = performance.now() - renderStartTime.current
      
      // 개발 환경에서만 성능 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName}:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          renderCount: renderCount.current,
          memoryUsage: (performance as any).memory ? {
            used: `${((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
            total: `${((performance as any).memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`
          } : undefined
        })
      }

      // 성능 경고 (100ms 이상 렌더링 시)
      if (renderTime > 100) {
        console.warn(`[Performance Warning] ${componentName} took ${renderTime.toFixed(2)}ms to render`)
      }
    }
  })

  return {
    renderCount: renderCount.current
  }
}

// 전역 성능 모니터링
export function useGlobalPerformanceMonitor() {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // FPS 모니터링
      let frameCount = 0
      let lastTime = performance.now()
      
      const measureFPS = () => {
        frameCount++
        const currentTime = performance.now()
        
        if (currentTime - lastTime >= 1000) {
          const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
          console.log(`[FPS] Current: ${fps}`)
          
          if (fps < 30) {
            console.warn(`[Performance Warning] Low FPS: ${fps}`)
          }
          
          frameCount = 0
          lastTime = currentTime
        }
        
        requestAnimationFrame(measureFPS)
      }
      
      requestAnimationFrame(measureFPS)
    }
  }, [])
} 