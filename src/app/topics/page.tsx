//전체 주제 리스트 페이지입니다. 메인 대시보드 생각하시면 좋을 것 같습니다.
//전체 학습 주제 리스트 (ex: AI, 로봇, 네트워크 등)
//ex) 웹서버구축, 웹프로그래밍, 컴퓨터 구조 ....
//ex) 주체 추가하기(폴더 추가하기)
// src/app/topics/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { Topic } from '@/models/topics'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import TopicCard from '@/components/ui/TopicCard'
import EditTopicModal from '@/components/modals/EditTopicModal'
import LogoutButton from '@/components/ui/LogoutButton'

export default function TopicsPage() {
  useAuthRedirect()
  const router = useRouter()

  const [userName, setUserName] = useState<string>('') // Sidebar에 표시할 사용자명
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const meta = (user as any).user_metadata as Record<string, any>
        setUserName(meta.name ?? user.email ?? '')
      }
    })
  }, [])

  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const [newTopicDesc, setNewTopicDesc] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    fetchTopics()
  }, [])

  const fetchTopics = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('topic_user_id', user.id)
      .order('topic_created_at', { ascending: false })
    if (!error && data) setTopics(data as Topic[])
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
      setAddError('유저 정보를 불러오지 못했습니다.')
      setAddLoading(false)
      return
    }
    const { error } = await supabase.from('topics').insert({
      topic_name: newTopicName,
      topic_description: newTopicDesc,
      topic_user_id: user.id,
    } as Topic)
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

  const handleDeleteTopic = async (topicId: number) => {
    const ok = confirm('삭제하시겠습니까?')
    if (!ok) return
    const { error } = await supabase.from('topics').delete().eq('topic_id', topicId)
    if (!error) fetchTopics()
  }

  const handleSaveEdit = async (updated: { topic_name: string; topic_description: string }) => {
    if (!editingTopic) return
    const { error } = await supabase
      .from('topics')
      .update(updated)
      .eq('topic_id', editingTopic.topic_id)
    if (!error) fetchTopics()
  }

  const filteredTopics = topics.filter((topic) =>
    topic.topic_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex min-h-screen">
      {/* 작은페이지처럼 Sidebar 사용 */}
      <Sidebar userName={userName} />

      <main className="flex-1 bg-gray-50 p-6">
        <Header
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
  viewMode={viewMode}
  setViewMode={setViewMode}
  onToggleAddForm={() => setShowAddForm((v) => !v)}
  addButtonLabel="토픽 추가하기" // 👈 이 부분 추가
/>


        {/* 토픽 추가 폼 */}
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
                onChange={(e) => setNewTopicName(e.target.value)}
                className="border p-2 rounded w-full"
                required
              />
            </div>
            <div className="flex flex-col w-full md:w-2/3">
              <label className="text-sm font-semibold mb-1">설명</label>
              <input
                type="text"
                value={newTopicDesc}
                onChange={(e) => setNewTopicDesc(e.target.value)}
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
            {addError && <div className="text-red-500 ml-2 mt-2 md:mt-0">{addError}</div>}
          </form>
        )}

        {/* 토픽 목록 */}
        {loading ? (
          <div className="text-gray-500">로딩 중...</div>
        ) : filteredTopics.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
            검색 결과가 없습니다.
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTopics.map((topic) => (
              <div
                key={topic.topic_id}
                className="block hover:opacity-90 cursor-pointer"
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  if (target.closest('button')) return
                  router.push(`/topics/${topic.topic_id}`)
                }}
              >
                <TopicCard
                  title={topic.topic_name}
                  description={topic.topic_description || ''}
                  date={topic.topic_created_at.slice(0, 10)}
                  onEdit={() => setEditingTopic(topic)}
                  onDelete={() => handleDeleteTopic(topic.topic_id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">토픽명</th>
                  <th className="px-4 py-2 text-left">생성일</th>
                </tr>
              </thead>
              <tbody>
                {filteredTopics.map((topic) => (
                  <tr
                    key={topic.topic_id}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target.closest('button')) return
                      router.push(`/topics/${topic.topic_id}`)
                    }}
                  >
                    <td className="px-4 py-3 text-blue-600 underline">{topic.topic_name}</td>
                    <td className="px-4 py-3">{topic.topic_created_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editingTopic && (
          <EditTopicModal
            topic={editingTopic}
            onClose={() => setEditingTopic(null)}
            onSave={handleSaveEdit}
          />
        )}
      </main>
    </div>
  )
}
