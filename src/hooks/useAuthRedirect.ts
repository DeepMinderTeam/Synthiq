'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export function useAuthRedirect() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session && pathname !== '/login' && pathname !== '/signup') {
        router.replace('/login')
      }
      if (session && (pathname === '/login' || pathname === '/signup')) {
        router.replace('/topics')
      }
    }
    checkAuth()
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkAuth()
    })
    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [router, pathname])
} 