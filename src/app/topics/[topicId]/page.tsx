
//이것만 건들자
// src/app/topics/[topicId]/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'
import type { Paper } from '@/models/paper'
import Sidebar from '@/components/Sidebar'
import { TopBar, Header } from '@/components'
import PaperCard from '@/components/ui/PaperCard'
import EditPaperModal from '@/components/modals/EditPaperModal'
import { PdfUploadModal } from '@/components'
import { ExclamationTriangleIcon, CheckCircleIcon, PlusIcon } from '@heroicons/react/24/outline'
import { FileText, Calendar, Star } from 'lucide-react'
import { SidebarProvider } from '@/context/SidebarContext'


export default function TopicPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const topicId = params.topicId as string

  // Sidebar에 표시할 사용자명
  const [userName, setUserName] = useState<string>('')
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const meta = (user as any).user_metadata as Record<string, any>
        setUserName(meta.name ?? user.email ?? '')
      }
    })
  }, [])

  // 메시지 & 모달 상태
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  // 논문 리스트 상태
  const [papers, setPapers] = useState<Paper[]>([])
  const [papersLoading, setPapersLoading] = useState(true)
  const [favorites, setFavorites] = useState<number[]>([])

  // 수정 중인 논문
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null)

  // 검색 / 뷰모드 / 정렬
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortMode, setSortMode] = useState<'name' | 'created'>('created')

  // 인증 체크
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  // 논문 불러오기
  useEffect(() => {
    const fetchPapers = async () => {
      setPapersLoading(true)
      const { data, error } = await supabase
        .from('paper')
        .select('*')
        .eq('paper_topic_id', topicId)
        .order('paper_created_at', { ascending: false })
      if (error) {
        console.error('논문 목록 불러오기 실패:', error.message)
      } else {
        setPapers(data as Paper[])
      }
      setPapersLoading(false)
    }
    if (user) {
      fetchPapers()
      fetchFavorites()
    }
  }, [user, topicId])

  // 즐겨찾기 불러오기
  const fetchFavorites = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return

    const { data, error: favErr } = await supabase
      .from('paper_favorites')
      .select('fav_paper_id')
      .eq('fav_user_id', user.id)

    if (!favErr && data) setFavorites(data.map(row => row.fav_paper_id))
  }

  // 즐겨찾기 토글
  const toggleFavorite = async (paperId: number) => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return

    const exists = favorites.includes(paperId)
    if (exists) {
      await supabase
        .from('paper_favorites')
        .delete()
        .eq('fav_user_id', user.id)
        .eq('fav_paper_id', paperId)
    } else {
      await supabase.from('paper_favorites').insert({
        fav_user_id: user.id,
        fav_paper_id: paperId,
        fav_created_at: new Date().toISOString(),
      })
    }
    fetchFavorites()
  }

  const refreshPapers = async () => {
    setPapersLoading(true)
    const { data, error } = await supabase
      .from('paper')
      .select('*')
      .eq('paper_topic_id', topicId)
      .order('paper_created_at', { ascending: false })
    if (error) {
      console.error('논문 목록 갱신 실패:', error.message)
    } else {
      setPapers(data as Paper[])
    }
    setPapersLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }
  if (!user) return null

  const handleUploadSuccess = (filePath: string, originalFileName: string) => {
    setMessage({ type: 'success', text: `"${originalFileName}" 업로드 완료!` })
    setTimeout(() => setMessage(null), 3000)
    refreshPapers()
  }
  const handleUploadError = (error: string) => {
    setMessage({ type: 'error', text: error })
    setTimeout(() => setMessage(null), 5000)
  }

  // 검색 필터 및 정렬
  const filteredPapers = papers
    .filter(p => p.paper_title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortMode === 'name') return a.paper_title.localeCompare(b.paper_title)
      return new Date(b.paper_created_at).getTime() - new Date(a.paper_created_at).getTime()
    })

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar userName={userName} />

        <main className="flex-1 bg-gray-50">
          <TopBar />
          <div className="p-6">
            <Header
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              viewMode={viewMode}
              setViewMode={setViewMode}
              onOpenModal={() => setIsUploadModalOpen(true)}
              sortMode={sortMode}
              setSortMode={setSortMode}
              buttonText="PDF 등록"
            />

        {message && (
          <div
            className={`mb-6 p-4 rounded-md flex items-center space-x-3 ${
              message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            } border`}
          >
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            )}
            <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {message.text}
            </p>
          </div>
        )}

        <PdfUploadModal
          topicId={topicId}
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">업로드된 논문 목록</h2>

          {papersLoading ? (
            <div className="text-gray-500">로딩 중...</div>
          ) : filteredPapers.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPapers.map(paper => (
                  <div
                    key={paper.paper_id}
                    className="block hover:opacity-90 cursor-pointer"
                    onClick={e => {
                      const tgt = e.target as HTMLElement
                      if (tgt.closest('button')) return
                      router.push(`/topics/${topicId}/${paper.paper_id}`)
                    }}
                  >
                    <PaperCard
                      title={paper.paper_title}
                      description={paper.paper_abstract}
                      date={paper.paper_created_at.slice(0, 10)}
                      onEdit={() => setEditingPaper(paper)}
                      onDelete={() => {
                        if (confirm('삭제하시겠습니까?')) {
                          supabase
                            .from('paper')
                            .delete()
                            .eq('paper_id', paper.paper_id)
                            .then(refreshPapers)
                        }
                      }}
                      isFavorite={favorites.includes(paper.paper_id)}
                      onToggleFavorite={() => toggleFavorite(paper.paper_id)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-2/3">
                          논문 정보
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
                      {filteredPapers.map(paper => (
                        <tr
                          key={paper.paper_id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 cursor-pointer group"
                          onClick={e => {
                            const tgt = e.target as HTMLElement
                            if (tgt.closest('button') || tgt.closest('a')) return
                            router.push(`/topics/${topicId}/${paper.paper_id}`)
                          }}
                        >
                          <td className="px-6 py-5 w-2/3">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                <FileText className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                  {paper.paper_title}
                                </h3>
                                {paper.paper_abstract && (
                                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                    {paper.paper_abstract}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 w-1/4">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-700 truncate">
                                {paper.paper_created_at.slice(0, 10)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 w-1/12">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleFavorite(paper.paper_id)
                              }}
                              className={`p-2 rounded-lg transition-all duration-200 ${
                                favorites.includes(paper.paper_id)
                                  ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                              }`}
                              aria-label="즐겨찾기 토글"
                            >
                              <Star className="w-4 h-4" fill={favorites.includes(paper.paper_id) ? 'currentColor' : 'none'} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
              아직 업로드된 논문이 없습니다.
            </div>
          )}
        </div>

        {/* 수정 모달 */}
        {editingPaper && (
          <EditPaperModal
            paper={editingPaper}
            onClose={() => setEditingPaper(null)}
            onSave={async updated => {
              await supabase
                .from('paper')
                .update({
                  paper_title: updated.paper_title,
                  paper_abstract: updated.paper_abstract,
                })
                .eq('paper_id', editingPaper.paper_id)
              setEditingPaper(null)
              refreshPapers()
            }}
          />
        )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
