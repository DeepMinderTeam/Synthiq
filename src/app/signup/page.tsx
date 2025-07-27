'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showResend, setShowResend] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      console.log('회원가입 시도:', { email, name })
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/login`
        },
      })

      console.log('회원가입 응답:', { data, error })

      if (error) {
        console.error('회원가입 오류:', error)
        setError(error.message)
      } else {
        console.log('회원가입 성공:', data)
        
        if (data.user && !data.user.email_confirmed_at) {
          setSuccess(true)
          setError(null)
          setShowResend(true)
          // 이메일 확인 안내 메시지
          setTimeout(() => {
            alert('이메일 확인 링크를 발송했습니다. 이메일을 확인해주세요.')
          }, 1000)
        } else {
          setSuccess(true)
          setTimeout(() => router.push('/login'), 1500)
        }
      }
    } catch (err) {
      console.error('예상치 못한 오류:', err)
      setError('회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      })

      if (error) {
        console.error('이메일 재발송 오류:', error)
        setError('이메일 재발송에 실패했습니다: ' + error.message)
      } else {
        setSuccess(true)
        setError(null)
        alert('이메일 확인 링크를 다시 발송했습니다.')
      }
    } catch (err) {
      console.error('이메일 재발송 중 오류:', err)
      setError('이메일 재발송 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <form onSubmit={handleSignup} className="flex flex-col gap-4 w-80 p-8 border rounded">
        <h2 className="text-2xl font-bold mb-4">회원가입</h2>
        <input
          type="text"
          placeholder="이름"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="border p-2 rounded"
          disabled={loading}
        />
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="border p-2 rounded"
          disabled={loading}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="border p-2 rounded"
          disabled={loading}
        />
        <button 
          type="submit" 
          className={`text-white p-2 rounded ${loading ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}
          disabled={loading}
        >
          {loading ? '처리 중...' : '회원가입'}
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">회원가입 성공! 이메일을 확인해주세요.</p>}
        
        {showResend && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800 text-sm mb-2">이메일을 받지 못하셨나요?</p>
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={loading}
              className="text-blue-600 text-sm underline hover:text-blue-800"
            >
              이메일 재발송
            </button>
          </div>
        )}
      </form>
    </div>
  )
}