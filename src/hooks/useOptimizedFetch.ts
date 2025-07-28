import { useState, useEffect, useRef } from 'react'

interface CacheItem<T> {
  data: T
  timestamp: number
  expiresAt: number
}

class FetchCache {
  private cache = new Map<string, CacheItem<any>>()
  private readonly defaultTTL = 5 * 60 * 1000 // 5분

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  clear(): void {
    this.cache.clear()
  }

  delete(key: string): void {
    this.cache.delete(key)
  }
}

const globalCache = new FetchCache()

export function useOptimizedFetch<T>(
  url: string,
  options?: RequestInit,
  ttl?: number
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      // 캐시 확인
      const cachedData = globalCache.get<T>(url)
      if (cachedData) {
        setData(cachedData)
        setLoading(false)
        return
      }

      // 이전 요청 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // 새로운 AbortController 생성
      abortControllerRef.current = new AbortController()

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(url, {
          ...options,
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        
        // 캐시에 저장
        globalCache.set(url, result, ttl)
        
        setData(result)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return // 요청이 취소된 경우 에러 처리하지 않음
        }
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // 클린업 함수
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [url, ttl, options])

  const refetch = async () => {
    globalCache.delete(url)
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(url, options)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      globalCache.set(url, result, ttl)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refetch }
}

export { globalCache } 