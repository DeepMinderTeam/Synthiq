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
import { TopBar, Header } from '@/components'
import { SidebarProvider } from '@/context/SidebarContext'
import TopicCard from '@/components/ui/TopicCard'
import EditTopicModal from '@/components/modals/EditTopicModal'
import AddTopicModal from '@/components/modals/AddTopicModal'
import { Calendar, Star } from 'lucide-react'

export default function TopicsPage() {
  useAuthRedirect()
  const router = useRouter()

  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [topics, setTopics] = useState<Topic[]>([])
  const [favorites, setFavorites] = useState<number[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortMode, setSortMode] = useState<'name' | 'created'>('created')
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [addLoading, setAddLoading] = useState<boolean>(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)


  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const meta = (user as any).user_metadata as Record<string, any>
        setUserName(meta.name ?? user.email ?? '')
        setUserEmail(user.email ?? '')
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
      return new Date(b.topic_created_at).getTime() - new Date(a.topic_created_at).getTime()
    })

  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <Sidebar userName={userName} userEmail={userEmail} />
        <main className="flex-1 bg-gray-50 overflow-y-auto">
          <TopBar />
          <div className="p-6">
            <Header
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              viewMode={viewMode}
              setViewMode={setViewMode}
              onOpenModal={() => setShowAddModal(true)}
              sortMode={sortMode}
              setSortMode={setSortMode}
            />

          {loading ? (
            <div>로딩 중...</div>
          ) : filtered.length === 0 ? (
            <div>검색 결과가 없습니다.</div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(topic => (
                <TopicCard
                  key={topic.topic_id}
                  topicId={topic.topic_id.toString()}
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
                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-2/3">
                        토픽 정보
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/4">
                        생성일
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/12">
                        즐겨찾기
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filtered.map((topic, index) => (
                      <tr
                        key={topic.topic_id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 cursor-pointer group"
                        onClick={() => router.push(`/topics/${topic.topic_id}`)}
                      >
                        <td className="px-6 py-5 w-2/3">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                              <span className="text-white font-bold text-lg">
                                {topic.topic_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                {topic.topic_name}
                              </h3>
                              {topic.topic_description && (
                                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                  {topic.topic_description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5 w-1/4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate">
                              {topic.topic_created_at.slice(0, 10)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 w-1/12">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(topic.topic_id)
                            }}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                              favorites.includes(topic.topic_id)
                                ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                            }`}
                            aria-label="즐겨찾기 토글"
                          >
                            <Star className="w-4 h-4" fill={favorites.includes(topic.topic_id) ? 'currentColor' : 'none'} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
