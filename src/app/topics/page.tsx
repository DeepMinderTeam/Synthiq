'use client'

import React, { useEffect, useState } from 'react'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { supabase } from '@/lib/supabaseClient'
import type { Topic } from '@/models/topics'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import TopicCard from '@/components/ui/TopicCard'
import EditTopicModal from '@/components/modals/EditTopicModal'

export default function TopicsPage() {
  useAuthRedirect()

  const [userName, setUserName] = useState<string>('')
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showAddForm, setShowAddForm] = useState<boolean>(false)
  const [newTopicName, setNewTopicName] = useState<string>('')
  const [newTopicDesc, setNewTopicDesc] = useState<string>('')
  const [addLoading, setAddLoading] = useState<boolean>(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)

  useEffect(() => {
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
    .eq('topic_user_id', user.id) // ✅ 나의 토픽만!
    .order('topic_created_at', { ascending: false })

  if (error) {
    console.error('fetchTopics error', error)
  } else if (data) {
    setTopics(data as Topic[])
  }

  setLoading(false)
}

  const handleAddTopic = async (e?: React.FormEvent) => {
    e?.preventDefault()
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
      topic_user_id: user.id,
      topic_name: newTopicName,
      topic_description: newTopicDesc,
      // topic_last_visited_at: null,
    } as Topic)

    setAddLoading(false)

    if (error) {
      setAddError('토픽 추가 실패: ' + error.message)
    } else {
      setNewTopicName('')
      setNewTopicDesc('')
      setShowAddForm(false)
      fetchTopics()
    }
  }

  const handleDeleteTopic = async (topicId: number) => {
    const ok = confirm('정말 삭제하시겠어요?')
    if (!ok) return

    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('topic_id', topicId)

    if (error) {
      alert('삭제 실패: ' + error.message)
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
      alert('수정 실패: ' + error.message)
    } else {
      setEditingTopic(null)
      fetchTopics()
    }
  }

  const filteredTopics = topics.filter((t) =>
    t.topic_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={userName} />

      <main className="flex-1 bg-gray-50 p-6">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onToggleAddForm={() => setShowAddForm((v) => !v)}
        />

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
                description={topic.topic_description || ''}
                date={topic.topic_created_at.slice(0, 10)}
                onEdit={() => setEditingTopic(topic)}
                onDelete={() => handleDeleteTopic(topic.topic_id)}
              />
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
                    <td className="px-4 py-3">{topic.topic_name}</td>
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
