// Supabase 인증을 사용한 로그아웃 버튼 컴포넌트
// 클릭 시 사용자 세션을 종료하고 로그인 페이지로 리다이렉트
'use client'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
    >
      로그아웃
    </button>
  )
} 