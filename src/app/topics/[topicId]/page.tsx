// 해당 주제의 논문 리스트 (ex: "AI 관련 논문")
// 논문 추가하기
'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import PdfUploadModal from '@/components/PdfUploadModal'

interface Paper {
  paper_id: number
  paper_title: string
  paper_abstract: string
  paper_created_at: string
}

export default function TopicDetailPage() {
  const params = useParams()
  const topicId = params.topicId as string
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchPapers = async () => {
    setLoading(true)
    const topicNumericId = Number(topicId)
    const { data, error } = await supabase
      .from('paper')
      .select('*')
      .eq('paper_topic_id', topicNumericId)
      .order('paper_created_at', { ascending: false })

    if (error) {
      console.error('논문 불러오기 실패:', error.message)
    } else {
      setPapers(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (topicId) {
      fetchPapers()
    }
  }, [topicId])

  // ✅ 논문 삭제
  const handleDelete = async (paper_id: number) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/papers?id=${paper_id}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      if (result.success) {
        setPapers(prev => prev.filter(p => p.paper_id !== paper_id))
      } else {
        alert('삭제 실패: ' + (result.error || ''))
      }
    } catch (err) {
      console.error(err)
      alert('삭제 중 오류 발생')
    }
  }

  // ✅ 논문 수정
  const handleEdit = async (paper_id: number) => {
    const paper = papers.find(p => p.paper_id === paper_id)
    if (!paper) return

    const newTitle = prompt('새 논문 제목을 입력하세요', paper.paper_title)
    if (!newTitle || newTitle.trim() === '') return

    const newAbstract = prompt('새 논문 설명을 입력하세요', paper.paper_abstract)
    if (newAbstract === null) return

    try {
      const res = await fetch('/api/papers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_id,
          paper_title: newTitle,
          paper_abstract: newAbstract,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setPapers(prev =>
          prev.map(p =>
            p.paper_id === paper_id
              ? { ...p, paper_title: newTitle, paper_abstract: newAbstract }
              : p
          )
        )
      } else {
        alert('수정 실패: ' + (result.error || ''))
      }
    } catch (err) {
      console.error(err)
      alert('수정 중 오류 발생')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-8 py-4 border-b bg-white">
        <div className="text-2xl font-bold">로고 DeepMinder</div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 font-semibold"
          >
            논문 추가하기
          </button>
        </div>
      </header>

      {/* 검색창 */}
      <div className="px-8 py-4">
        <div className="text-xl font-semibold mb-4">검색창</div>

        {/* 논문 리스트 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {loading ? (
            <div>로딩 중...</div>
          ) : papers.length === 0 ? (
            <div>등록된 논문이 없습니다.</div>
          ) : (
            papers.map((paper) => (
              <div
                key={paper.paper_id}
                className="bg-white rounded shadow p-4 flex flex-col gap-2 hover:shadow-lg transition-shadow"
              >
                <div className="text-lg font-bold">{paper.paper_title}</div>
                <div className="text-sm text-gray-600">{paper.paper_abstract}</div>
                <div className="text-xs text-gray-400 mt-auto">
                  생성일: {paper.paper_created_at?.slice(0, 10)}
                </div>

                {/* ✅ 수정/삭제 버튼 */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleEdit(paper.paper_id)}
                    className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(paper.paper_id)}
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

      <PdfUploadModal
        topicId={topicId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadSuccess={() => {
          setIsModalOpen(false)
          fetchPapers()
        }}
        onUploadError={(err) => alert(err)}
      />
    </div>
  )
}
