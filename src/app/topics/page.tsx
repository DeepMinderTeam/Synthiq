//전체 주제 리스트 페이지입니다. 메인 대시보드 생각하시면 좋을 것 같습니다.
//전체 학습 주제 리스트 (ex: AI, 로봇, 네트워크 등)
//ex) 웹서버구축, 웹프로그래밍, 컴퓨터 구조 ....
//ex) 주체 추가하기(폴더 추가하기)
'use client'

import LogoutButton from '@/components/LogoutButton'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Topic } from '@/models/topics'
import Link from 'next/link'

export default function TopicsPage() {
  useAuthRedirect()
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const [newTopicDesc, setNewTopicDesc] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    fetchTopics()
  }, [])

  const fetchTopics = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('topics')
        .select('*')
        .eq('topic_user_id', user.id)
        .order('topic_created_at', { ascending: false })
      if (data) setTopics(data)
    }
    setLoading(false)
  }

  const handleAddTopic = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setAddError(null)
    if (!newTopicName.trim()) {
      setAddError('토픽명을 입력하세요.')
      return
    }
    setAddLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setAddError('로그인이 필요합니다.')
      setAddLoading(false)
      return
    }
    const { error } = await supabase.from('topics').insert({
      topic_name: newTopicName,
      topic_description: newTopicDesc,
      topic_user_id: user.id
    })
    setAddLoading(false)
    if (error) {
      setAddError('토픽 추가 실패: ' + error.message)
    } else {
      setShowAddForm(false)
      setNewTopicName('')
      setNewTopicDesc('')
      fetchTopics()
    }
  }

  // ✅ 토픽 수정
  const handleEdit = async (topic: Topic) => {
    const newName = prompt('새로운 토픽명을 입력하세요', topic.topic_name)
    if (!newName || newName.trim() === '') return
    const newDesc = prompt('새로운 설명을 입력하세요', topic.topic_description || '') || ''
    const { error } = await supabase
      .from('topics')
      .update({
        topic_name: newName,
        topic_description: newDesc
      })
      .eq('topic_id', topic.topic_id)
    if (error) {
      alert('수정 실패: ' + error.message)
    } else {
      fetchTopics()
    }
  }

  // ✅ 토픽 삭제
  const handleDelete = async (topic_id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('topic_id', topic_id)
    if (error) {
      alert('삭제 실패: ' + error.message)
    } else {
      fetchTopics()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between px-8 py-4 border-b bg-white">
        <div className="text-2xl font-bold">로고 DeepMinder</div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 font-semibold"
          >
            토픽 추가하기
          </button>
          <LogoutButton />
        </div>
      </header>
      <div className="px-8 py-4">
        <div className="text-xl font-semibold mb-4">검색창</div>
        {showAddForm && (
          <form
            onSubmit={handleAddTopic}
            className="mb-6 flex flex-col md:flex-row gap-2 items-start md:items-end bg-white p-4 rounded shadow w-full max-w-2xl"
          >
            <div className="flex flex-col w-full md:w-1/3">
              <label className="text-sm font-semibold mb-1">
                토픽명<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTopicName}
                onChange={e => setNewTopicName(e.target.value)}
                className="border p-2 rounded w-full"
                required
              />
            </div>
            <div className="flex flex-col w-full md:w-2/3">
              <label className="text-sm font-semibold mb-1">설명</label>
              <input
                type="text"
                value={newTopicDesc}
                onChange={e => setNewTopicDesc(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <button
              type="submit"
              disabled={addLoading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 font-semibold mt-4 md:mt-0"
            >
              {addLoading ? '추가 중...' : '추가'}
            </button>
            {addError && (
              <div className="text-red-500 ml-2 mt-2 md:mt-0">{addError}</div>
            )}
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {loading ? (
            <div>로딩 중...</div>
          ) : topics.length === 0 ? (
            <div>등록된 토픽이 없습니다.</div>
          ) : (
            topics.map(topic => (
              <div
                key={topic.topic_id}
                className="bg-white rounded shadow p-4 flex flex-col gap-2 hover:shadow-lg transition-shadow"
              >
                <Link href={`/topics/${topic.topic_id}`} className="flex-1">
                  <div className="text-lg font-bold">{topic.topic_name}</div>
                  <div className="text-gray-600 text-sm">{topic.topic_description}</div>
                  <div className="text-xs text-gray-400 mt-auto">
                    생성일: {topic.topic_created_at?.slice(0, 10)}
                  </div>
                </Link>
                {/* ✅ 수정/삭제 버튼 */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleEdit(topic)}
                    className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(topic.topic_id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
