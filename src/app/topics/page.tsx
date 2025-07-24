'use client'

import React, { useEffect, useState } from 'react'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { supabase } from '@/lib/supabaseClient'
import LogoutButton from '@/components/LogoutButton'
import type { Topic } from '@/models/topics'
import { Grid as GridIcon, List as ListIcon } from 'lucide-react'
import TopicCard from '@/components/TopicCard'

export default function TopicsPage() {
  useAuthRedirect()

  const [userName, setUserName] = useState<string>('')
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const [newTopicDesc, setNewTopicDesc] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    // 로그인된 유저 메타데이터에서 이름 읽기
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const meta = user.user_metadata as Record<string, any>
        setUserName(meta.name ?? user.email ?? '')
      }
    })
    fetchTopics()
  }, [])

  const fetchTopics = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('topics')
      .select('*')
      .order('topic_created_at', { ascending: false })
    if (data) setTopics(data)
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
    const { error } = await supabase
      .from('topics')
      .insert({ topic_name: newTopicName, topic_description: newTopicDesc })
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

  const handleEdit = (id: number) => console.log('edit', id)
  const handleDelete = async (id: number) => {
    await supabase.from('topics').delete().eq('topic_id', id)
    fetchTopics()
  }

  const filteredTopics = topics.filter((t) =>
    t.topic_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex min-h-screen">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r p-6 flex flex-col">
        <div className="flex items-center mb-8">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <span className="ml-3 font-semibold">{userName || 'Guest'}</span>
        </div>
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2">최근 본 목록</h2>
          <div className="h-20 bg-gray-100 rounded" />
        </div>
        <div>
          <h2 className="text-sm font-semibold mb-2">즐겨찾기</h2>
          <div className="h-20 bg-gray-100 rounded" />
        </div>
        <div className="mt-auto">
          <LogoutButton />
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 bg-gray-50 p-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold bg-white px-4 py-2 rounded">로고 DeepMinder</h1>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="검색어를 입력하세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border p-2 rounded w-64"
            />
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              토픽 추가하기
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
            >
              <GridIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
            >
              <ListIcon className="w-5 h-5" />
            </button>
            <LogoutButton />
          </div>
        </div>

        {/* ADD FORM */}
        {showAddForm && (
          <form
            onSubmit={handleAddTopic}
            className="mb-6 bg-white p-4 rounded shadow grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="flex flex-col">
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
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1">설명</label>
              <input
                type="text"
                value={newTopicDesc}
                onChange={(e) => setNewTopicDesc(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={addLoading}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                {addLoading ? '추가 중...' : '추가'}
              </button>
            </div>
            {addError && <div className="col-span-2 text-red-500">{addError}</div>}
          </form>
        )}

        {/* TOPIC LIST */}
        {loading ? (
          <div>로딩 중...</div>
        ) : filteredTopics.length === 0 ? (
          <div>검색 결과가 없습니다.</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTopics.map((topic) => (
              <TopicCard
                key={topic.topic_id}
                title={topic.topic_name}
                description={topic.topic_description}
                date={topic.topic_created_at?.slice(0, 10) ?? ''}
                onEdit={() => handleEdit(topic.topic_id)}
                onDelete={() => handleDelete(topic.topic_id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTopics.map((topic) => (
              <TopicCard
                key={topic.topic_id}
                title={topic.topic_name}
                description={topic.topic_description}
                date={topic.topic_created_at?.slice(0, 10) ?? ''}
                onEdit={() => handleEdit(topic.topic_id)}
                onDelete={() => handleDelete(topic.topic_id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
