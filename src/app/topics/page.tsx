'use client'

import React, { useEffect, useState } from 'react'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { supabase } from '@/lib/supabaseClient'
import type { Topic } from '@/models/topics'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import { SidebarProvider } from '@/context/SidebarContext'
import TopicCard from '@/components/ui/TopicCard'
import EditTopicModal from '@/components/modals/EditTopicModal'
import AddTopicModal from '@/components/modals/AddTopicModal'

export default function TopicsPage() {
  useAuthRedirect()

  const [userName, setUserName] = useState<string>('')
  const [topics, setTopics] = useState<Topic[]>([])
  const [favorites, setFavorites] = useState<number[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortMode, setSortMode] = useState<'name' | 'created' | 'visited'>('created')
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [addLoading, setAddLoading] = useState<boolean>(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const meta = user.user_metadata as Record<string, any>
        setUserName(meta.name ?? user.email ?? '')
      }
    }
    loadUser()
    fetchTopics()
    fetchFavorites()
  }, [])

  const fetchTopics = async () => {
    setLoading(true)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return setLoading(false)

    const { data, error: topicsErr } = await supabase
      .from('topics')
      .select('*')
      .eq('topic_user_id', user.id)

    if (!topicsErr && data) setTopics(data)
    setLoading(false)
  }

  const fetchFavorites = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return

    const { data, error: favErr } = await supabase
      .from('topic_favorites')
      .select('fav_topic_id')
      .eq('fav_user_id', user.id)

    if (!favErr && data) setFavorites(data.map(row => row.fav_topic_id))
  }

  const toggleFavorite = async (topicId: number) => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return

    const exists = favorites.includes(topicId)
    if (exists) {
      await supabase
        .from('topic_favorites')
        .delete()
        .eq('fav_user_id', user.id)
        .eq('fav_topic_id', topicId)
    } else {
      await supabase.from('topic_favorites').insert({
        fav_user_id: user.id,
        fav_topic_id: topicId,
        fav_created_at: new Date().toISOString(),
      })
    }
    fetchFavorites()
  }

  const handleAddTopic = async (topic: { name: string; description: string }) => {
    setAddError(null)
    setAddLoading(true)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      setAddError('유저 정보를 불러오지 못했습니다.')
      return setAddLoading(false)
    }
    const { error: addErr } = await supabase.from('topics').insert({
      topic_user_id: user.id,
      topic_name: topic.name,
      topic_description: topic.description,
    } as Topic)
    setAddLoading(false)
    if (addErr) {
      setAddError('토픽 추가 실패: ' + addErr.message)
    } else {
      setShowAddModal(false)
      fetchTopics()
    }
  }

  const handleDeleteTopic = async (id: number) => {
    if (!confirm('정말 삭제하시겠어요?')) return
    const { error } = await supabase.from('topics').delete().eq('topic_id', id)
    if (!error) fetchTopics()
  }

  const handleSaveEdit = async (updated: { topic_name: string; topic_description: string }) => {
    if (!editingTopic) return
    const { error } = await supabase
      .from('topics')
      .update(updated)
      .eq('topic_id', editingTopic.topic_id)
    if (!error) {
      setEditingTopic(null)
      fetchTopics()
    }
  }

  const filtered = topics
    .filter(t => t.topic_name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortMode === 'name') return a.topic_name.localeCompare(b.topic_name)
      if (sortMode === 'visited') {
        const aTime = a.topic_last_visited_at ? new Date(a.topic_last_visited_at).getTime() : 0
        const bTime = b.topic_last_visited_at ? new Date(b.topic_last_visited_at).getTime() : 0
        return bTime - aTime
      }
      return new Date(b.topic_created_at).getTime() - new Date(a.topic_created_at).getTime()
    })

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar userName={userName} />
        <main className="flex-1 bg-gray-50 p-6">
          <Header
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onOpenModal={() => setShowAddModal(true)}
          />

          <div className="flex justify-end mb-4">
            <select
              className="px-3 py-2 border rounded"
              value={sortMode}
              onChange={e => setSortMode(e.target.value as any)}
            >
              <option value="created">최신순</option>
              <option value="name">이름순</option>
              <option value="visited">최근 방문</option>
            </select>
          </div>

          {loading ? (
            <div>로딩 중...</div>
          ) : filtered.length === 0 ? (
            <div>검색 결과가 없습니다.</div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(topic => (
                <TopicCard
                  key={topic.topic_id}
                  title={topic.topic_name}
                  description={topic.topic_description || ''}
                  date={topic.topic_created_at.slice(0, 10)}
                  onEdit={() => setEditingTopic(topic)}
                  onDelete={() => handleDeleteTopic(topic.topic_id)}
                  isFavorite={favorites.includes(topic.topic_id)}
                  onToggleFavorite={() => toggleFavorite(topic.topic_id)}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded shadow">
              <table className="min-w-full table-auto border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-4 py-2 text-left">토픽명</th>
                    <th className="border px-4 py-2 text-left">최종 방문일</th>
                    <th className="border px-4 py-2 text-left">생성일</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(topic => (
                    <tr
                      key={topic.topic_id}
                      className="border border-gray-200 hover:border-blue-500 hover:bg-gray-50 transition cursor-pointer"
                    >
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

          {showAddModal && (
            <AddTopicModal
              onClose={() => setShowAddModal(false)}
              onAdd={handleAddTopic}
              loading={addLoading}
              error={addError}
            />
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
    </SidebarProvider>
  )
}
