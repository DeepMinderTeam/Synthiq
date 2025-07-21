//로그인페이지입니다
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import type { User as UserModel } from '@/models/user'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      // 로그인 성공 시 유저 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // user_metadata에서 name 추출, created_at은 user.created_at
        const userInfo: UserModel = {
          id: user.id,
          email: user.email ?? '',
          name: user.user_metadata?.name ?? '',
          created_at: user.created_at ?? '',
        }
        console.log('로그인 유저 정보:', userInfo)
      }
      router.push('/') // 로그인 성공 시 메인으로 이동
    }
  }

  const goToSignup = () => {
    router.push('/signup')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <form onSubmit={handleLogin} className="flex flex-col gap-4 w-80 p-8 border rounded">
        <h2 className="text-2xl font-bold mb-4">로그인</h2>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="border p-2 rounded"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="border p-2 rounded"
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">로그인</button>
        {error && <p className="text-red-500">{error}</p>}
        <button
          type="button"
          onClick={goToSignup}
          className="mt-2 text-blue-500 underline hover:text-blue-700"
        >
          회원가입이 필요하신가요?
        </button>
      </form>
    </div>
  )
}