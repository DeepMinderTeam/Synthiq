'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

import { User as SupabaseUser } from '@supabase/supabase-js'
import { User } from '@/models/user'


export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)


  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      // user 테이블에서 사용자 정보 조회 (single() 대신 maybeSingle() 사용)
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle()

      if (error) {
        console.log('user 테이블 조회 실패, 기본 정보 사용:', error.message)
      } else if (!data) {
        console.log('user 테이블에 해당 사용자가 없음, 기본 정보 사용')
      }

      // 데이터가 있으면 사용하고, 없으면 기본 정보 사용
      return data || {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name || '사용자',
        created_at: supabaseUser.created_at
      }
    } catch (err) {
      console.error('사용자 프로필 조회 실패:', err)
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name || '사용자',
        created_at: supabaseUser.created_at
      }
    }
  }


  useEffect(() => {
    // 현재 세션 가져오기
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user)
        setUser(userProfile)
      } else {
        setUser(null)
      }

      setLoading(false)
    }

    getSession()

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        if (session?.user) {
          const userProfile = await fetchUserProfile(session.user)
          setUser(userProfile)
        } else {
          setUser(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
} 