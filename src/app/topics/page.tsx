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
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import TopicCard from '@/components/ui/TopicCard'
import EditTopicModal from '@/components/modals/EditTopicModal'
import { useRouter } from 'next/navigation'   // ✅ Link 대신 useRouter

export default function TopicsPage() {
  useAuthRedirect()
  const router = useRouter()

  const [userName, setUserName] = useState<string>('')
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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('유저 정보를 가져오는 데 실패했습니다:', userError)
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('topic_user_id', user.id)
      .order('topic_created_at', { ascending: false })
    if (error) {
      console.error('fetchTopics error', error)
    } else if (data) {
      setTopics(data as Topic[])
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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      setAddError('유저 정보를 불러오지 못했습니다.')
      setAddLoading(false)
      return
    }
    const { error } = await supabase.from('topics').insert({
      topic_name: newTopicName,
      topic_description: newTopicDesc,
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
    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('topic_id', topicId)
    if (error) {
      alert('수정 실패: ' + error.message)
    } else {
      fetchTopics()
    }
  }

  const handleSaveEdit = async (updated: {
    topic_name: string
    topic_description: string
  }) => {
    if (!editingTopic) return
    const { error } = await supabase
      .from('topics')
      .update(updated)
      .eq('topic_id', editingTopic.topic_id)
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

        {loading ? (
          <div>로딩 중...</div>
        ) : filteredTopics.length === 0 ? (
          <div>검색 결과가 없습니다.</div>
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
                  <th className="px-4 py-2 text-left">최종 방문일</th>
                  <th className="px-4 py-2 text-left">생성일</th>
                </tr>
              </thead>
              <tbody>
                {filteredTopics.map((topic) => (
                  <tr key={topic.topic_id} className="border-t">
                    <td className="px-4 py-3 text-blue-600 underline">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          router.push(`/topics/${topic.topic_id}`)
                        }}
                      >
                        {topic.topic_name}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {topic.topic_last_visited_at
                        ? topic.topic_last_visited_at.slice(0, 10)
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {topic.topic_created_at.slice(0, 10)}
                    </td>
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
