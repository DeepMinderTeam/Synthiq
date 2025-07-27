//전체 주제 리스트 페이지입니다. 메인 대시보드 생각하시면 좋을 것 같습니다.
//전체 학습 주제 리스트 (ex: AI, 로봇, 네트워크 등)
//ex) 웹서버구축, 웹프로그래밍, 컴퓨터 구조 ....
//ex) 주체 추가하기(폴더 추가하기)
'use client'

import React, { useEffect, useState } from 'react'
//import LogoutButton from '@/components/LogoutButton'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { supabase } from '@/lib/supabaseClient'
import type { Topic } from '@/models/topics'
import TopicCard from '@/components/ui/TopicCard'
import EditTopicModal from '@/components/modals/EditTopicModal'
import { useRouter } from 'next/navigation'

export default function TopicsPage() {
  useAuthRedirect()
  const router = useRouter()

  // — 상태 정의
  const [userName, setUserName] = useState<string>('')
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [showAddForm, setShowAddForm] = useState<boolean>(false)
  const [newTopicName, setNewTopicName] = useState<string>('')
  const [newTopicDesc, setNewTopicDesc] = useState<string>('')
  const [addLoading, setAddLoading] = useState<boolean>(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)

  // 검색어 & 뷰 모드
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // topics 필터링
  const filteredTopics = topics.filter(topic =>
    topic.topic_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 최초 로딩 시 사용자명 + 토픽 목록 가져오기
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const meta = (user as any).user_metadata as Record<string, any>
        setUserName(meta.name ?? user.email ?? '')
      }
    })
    fetchTopics()
  }, [])

  // — 토픽 목록 조회
  const fetchTopics = async () => {
    setLoading(true)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('유저 정보 조회 실패:', userError)
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('topic_user_id', user.id)
      .order('topic_created_at', { ascending: false })
    if (error) {
      console.error('fetchTopics error:', error)
    } else if (data) {
      setTopics(data as Topic[])
    }
    setLoading(false)
  }

  // — 토픽 추가
  const handleAddTopic = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setAddError(null)
    if (!newTopicName.trim()) {
      setAddError('토픽명을 입력하세요.')
      return
    }
    setAddLoading(true)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setAddError('유저 정보를 불러올 수 없습니다.')
      setAddLoading(false)
      return
    }
    const { error } = await supabase
      .from('topics')
      .insert({
        topic_name: newTopicName,
        topic_description: newTopicDesc,
        topic_user_id: user.id,
      } as Partial<Topic>)
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

  // — 토픽 삭제
  const handleDeleteTopic = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return
    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('topic_id', id)
    if (error) {
      alert('삭제 실패: ' + error.message)
    } else {
      fetchTopics()
    }
  }

  // — 토픽 수정 저장
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
      alert('수정 실패: ' + error.message)
    } else {
      setEditingTopic(null)
      fetchTopics()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 바 */}
      <header className="flex items-center justify-between px-8 py-4 border-b bg-white">
        <div className="text-2xl font-bold">로고 DeepMinder</div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 font-semibold"
          >
            토픽 추가하기
          </button>
          {/* <LogoutButton /> */}
        </div>
      </header>

      <main className="px-8 py-4">
        {/* 검색창 + 뷰 모드 토글 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <label htmlFor="search" className="text-xl font-semibold">검색</label>
            <input
              id="search"
              type="text"
              placeholder="토픽명으로 검색"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="border p-2 rounded"
            />
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 ${viewMode === 'grid' ? 'font-bold' : ''}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 ${viewMode === 'list' ? 'font-bold' : ''}`}
            >
              List
            </button>
          </div>
        </div>

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
            {addError && <div className="text-red-500 ml-2 mt-2 md:mt-0">{addError}</div>}
          </form>
        )}

        {/* 토픽 리스트 */}
        {loading ? (
          <div>로딩 중...</div>
        ) : filteredTopics.length === 0 ? (
          <div>검색 결과가 없습니다.</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTopics.map(topic => (
              <div
                key={topic.topic_id}
                className="block hover:opacity-90 cursor-pointer"
                onClick={e => {
                  const tgt = e.target as HTMLElement
                  if (tgt.closest('button')) return
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
                {filteredTopics.map(topic => (
                  <tr key={topic.topic_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-blue-600 underline">
                      <a
                        href="#"
                        onClick={e => {
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
                    <td className="px-4 py-3">{topic.topic_created_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 편집 모달 */}
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
