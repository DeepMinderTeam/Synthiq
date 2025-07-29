'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { WrongAnswerNote, WrongAnswerStudySession } from '@/models/wrong_answer_notes'
import { useAuth } from '@/hooks/useAuth'

interface WrongAnswerStepProps {
  paperId: string
  onShowEvidenceInPaper?: (contentId: number, highlightInfo?: { evidence: string; startIndex: number; endIndex: number }) => void
  isTranslationActive?: boolean
}

interface WrongAnswerNoteWithSessions extends WrongAnswerNote {
  study_sessions?: WrongAnswerStudySession[]
  test_attempt_items?: {
    attempt_item_id: number
    attempt_item_quiz_id: number
    attempt_user_answer?: string
    attempt_is_correct?: boolean
    attempt_item_evidence?: string
    attempt_item_evidence_content_id?: number
    attempt_item_evidence_start_index?: number
    attempt_item_evidence_end_index?: number
    paper_test_items?: {
      test_item_question: string
      test_item_answer: string
      test_item_explanation?: string
      test_item_type: string
      test_item_category?: string
      test_item_quiz_id: number
    }
  }
}

export default function WrongAnswerStep({ paperId, onShowEvidenceInPaper, isTranslationActive = false }: WrongAnswerStepProps) {
  const { user } = useAuth()
  const [wrongAnswerNotes, setWrongAnswerNotes] = useState<WrongAnswerNoteWithSessions[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [isStudying, setIsStudying] = useState(false)
  const [studyResult, setStudyResult] = useState<boolean | null>(null)
  const [feedback, setFeedback] = useState('')
  const [learningAnalysis, setLearningAnalysis] = useState<any>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [summaryAnalysis, setSummaryAnalysis] = useState<any>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [hasExistingAnalysis, setHasExistingAnalysis] = useState(false)

  const fetchWrongAnswerNotes = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      // 먼저 기본적인 오답노트 조회
      const { data: basicData, error: basicError } = await supabase
        .from('wrong_answer_notes')
        .select('*')
        .order('note_last_wrong_date', { ascending: false })
      
      if (basicError) {
        console.error('기본 오답노트 조회 오류:', basicError)
        setError('오답노트를 불러오는 중 오류가 발생했습니다.')
        return
      }

      if (!basicData || basicData.length === 0) {
        setWrongAnswerNotes([])
        return
      }

      // 현재 사용자의 모든 오답노트를 가져옴
      const { data, error } = await supabase
        .from('wrong_answer_notes')
        .select(`
          *,
          study_sessions:wrong_answer_study_sessions(*),
          test_attempt_items!inner(
            attempt_item_id,
            attempt_item_quiz_id,
            attempt_user_answer,
            attempt_is_correct,
            attempt_item_evidence,
            attempt_item_evidence_content_id,
            attempt_item_evidence_start_index,
            attempt_item_evidence_end_index
          )
        `)
        .order('note_last_wrong_date', { ascending: false })



      if (error) {
        console.error('오답노트 조회 오류:', error)
        setError('오답노트를 불러오는 중 오류가 발생했습니다.')
      } else {
        // attempt_item_id들을 수집
        const attemptItemIds = (data || [])
          .map(note => note.test_attempt_items?.attempt_item_id)
          .filter(id => id !== undefined) as number[]

        if (attemptItemIds.length === 0) {
          setWrongAnswerNotes([])
          return
        }

        // test_attempt_items에서 추가 정보를 가져옴
        const { data: attemptItemData, error: attemptItemError } = await supabase
          .from('test_attempt_items')
          .select('*')
          .in('attempt_item_id', attemptItemIds)

        if (attemptItemError) {
          console.error('시도 아이템 조회 오류:', attemptItemError)
          setWrongAnswerNotes([])
          return
        }

        // 해당 논문의 content_id를 가져옴
        const { data: contentData, error: contentError } = await supabase
          .from('paper_contents')
          .select('content_id')
          .eq('content_paper_id', paperId)

        if (contentError) {
          console.error('콘텐츠 조회 오류:', contentError)
          setWrongAnswerNotes([])
          return
        }

        const contentIds = contentData?.map(c => c.content_id) || []
        
        // 해당 content_id의 퀴즈 정보들을 가져옴
        const { data: quizData, error: quizError } = await supabase
          .from('paper_quizzes')
          .select('*')
          .in('quiz_content_id', contentIds)

        if (quizError) {
          console.error('퀴즈 조회 오류:', quizError)
          setWrongAnswerNotes([])
          return
        }

        const quizIds = quizData?.map(q => q.quiz_id) || []
        
        // 데이터를 조합하고 필터링
        const enrichedNotes = (data || []).map(note => {
          const attemptItem = attemptItemData?.find(item => 
            item.attempt_item_id === note.test_attempt_items?.attempt_item_id
          )
          
          const quiz = quizData?.find(q => q.quiz_id === attemptItem?.attempt_item_quiz_id)
          
          if (attemptItem && quiz && quizIds.includes(attemptItem.attempt_item_quiz_id)) {
            return {
              ...note,
              test_attempt_items: {
                ...note.test_attempt_items,
                ...attemptItem,
                paper_test_items: {
                  test_item_question: quiz.quiz_question,
                  test_item_answer: quiz.quiz_answer,
                  test_item_explanation: quiz.quiz_explanation,
                  test_item_type: quiz.quiz_type || 'subjective',
                  test_item_category: quiz.quiz_category,
                  test_item_quiz_id: quiz.quiz_id
                }
              }
            }
          }
          return null
        }).filter(note => note !== null)

        setWrongAnswerNotes(enrichedNotes)
      }
    } catch (err) {
      console.error('오답노트 조회 오류:', err)
      setError('오답노트를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [paperId])

  useEffect(() => {
    fetchWrongAnswerNotes()
  }, [fetchWrongAnswerNotes])

  const handleStudySession = async (result: boolean) => {
    if (!wrongAnswerNotes[currentNoteIndex]) return

    try {
      setIsStudying(true)
      const note = wrongAnswerNotes[currentNoteIndex]

      // AI 피드백 생성 (틀렸을 때만)
      let aiFeedback = ''
      if (!result) {
        const response = await fetch('/api/grade-quiz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quizId: note.test_attempt_items?.attempt_item_quiz_id || 0,
            userAnswer: userAnswer,
            correctAnswer: note.test_attempt_items?.paper_test_items?.test_item_answer || '',
            questionType: note.test_attempt_items?.paper_test_items?.test_item_type || 'subjective',
            questionText: note.test_attempt_items?.paper_test_items?.test_item_question || ''
          }),
        })

        if (response.ok) {
          const gradingResult = await response.json()
          aiFeedback = gradingResult.feedback || '틀렸습니다. 정답을 다시 확인해보세요.'
        }
      }

      // 학습 세션 저장
      const { error: sessionError } = await supabase
        .from('wrong_answer_study_sessions')
        .insert({
          session_note_id: note.note_id,
          session_result: result,
          session_answer: userAnswer,
          session_feedback: aiFeedback
        })

      if (sessionError) {
        console.error('학습 세션 저장 오류:', sessionError)
      }

      setStudyResult(result)
      setFeedback(aiFeedback)

      // 3초 후 다음 문제로 이동
      setTimeout(() => {
        setCurrentNoteIndex(prev => Math.min(prev + 1, wrongAnswerNotes.length - 1))
        setUserAnswer('')
        setStudyResult(null)
        setFeedback('')
        setIsStudying(false)
      }, 3000)

    } catch (err) {
      console.error('학습 세션 오류:', err)
      setError('학습 중 오류가 발생했습니다.')
    }
  }

  const getCategoryDisplayName = (categoryId: string): string => {
    const categoryMap: Record<string, string> = {
      'definition': '개념 이해',
      'mechanism': '원리 및 구조',
      'application': '예시 및 응용',
      'comparison': '비교 및 분류',
      'problem_solving': '문제 해결',
      'motivation': '연구 동기',
      'related_work': '관련 연구',
      'method': '방법론/기술',
      'experiment': '실험 및 결과',
      'limitation': '한계 및 향후 연구',
      'summary': '요약',
      'critical_thinking': '비판적 사고'
    }
    
    return categoryMap[categoryId] || categoryId || '일반 학습'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 기존 분석 불러오기
  const fetchExistingAnalysis = useCallback(async () => {
    if (!user || !paperId) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('세션 확인:', { session: !!session, token: !!session?.access_token })
      
      if (!session?.access_token) {
        console.error('액세스 토큰이 없습니다')
        return
      }

      // 기존 학습 분석 조회
      const learningResponse = await fetch(`/api/learning-analysis?paperId=${paperId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      console.log('학습 분석 응답:', { status: learningResponse.status, ok: learningResponse.ok })

      if (learningResponse.ok) {
        const learningResult = await learningResponse.json()
        console.log('학습 분석 결과:', learningResult)
        if (learningResult.analysis) {
          setLearningAnalysis(learningResult.analysis)
          setHasExistingAnalysis(true)
        }
      } else {
        const errorText = await learningResponse.text()
        console.error('학습 분석 조회 실패:', errorText)
      }

      // 기존 요약 분석 조회
      const summaryResponse = await fetch(`/api/summary-analysis?paperId=${paperId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      console.log('요약 분석 응답:', { status: summaryResponse.status, ok: summaryResponse.ok })

      if (summaryResponse.ok) {
        const summaryResult = await summaryResponse.json()
        console.log('요약 분석 결과:', summaryResult)
        if (summaryResult.analysis) {
          setSummaryAnalysis(summaryResult.analysis)
        }
      } else {
        const errorText = await summaryResponse.text()
        console.error('요약 분석 조회 실패:', errorText)
      }
    } catch (err) {
      console.error('기존 분석 조회 오류:', err)
    }
  }, [user, paperId])

  // 학습 분석 생성
  const generateLearningAnalysis = useCallback(async () => {
    if (wrongAnswerNotes.length === 0 || !user) return

    try {
      setAnalysisLoading(true)
      // 틀린 문제들의 정보를 수집
      const wrongQuestions = wrongAnswerNotes.map(note => ({
        question: note.test_attempt_items?.paper_test_items?.test_item_question || '',
        answer: note.test_attempt_items?.paper_test_items?.test_item_answer || '',
        explanation: note.test_attempt_items?.paper_test_items?.test_item_explanation || '',
        category: note.test_attempt_items?.paper_test_items?.test_item_category || '',
        evidence: note.test_attempt_items?.attempt_item_evidence || '',
        mistakeCount: note.note_mistake_count
      }))

      // 현재 세션에서 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      
      // GPT API를 사용하여 학습 분석 생성
      const response = await fetch('/api/learning-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({
          wrongQuestions,
          paperTitle: paperId, // paperId 전달
          totalWrongCount: wrongAnswerNotes.length
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setLearningAnalysis(result.analysis)
        setHasExistingAnalysis(true)
      } else {
        const errorText = await response.text()
        console.error('학습 분석 생성 실패:', errorText)
      }
    } catch (err) {
      console.error('학습 분석 오류:', err)
    } finally {
      setAnalysisLoading(false)
    }
  }, [wrongAnswerNotes, user, paperId])

  // 간단한 요약 분석 생성
  const generateSummaryAnalysis = useCallback(async () => {
    if (wrongAnswerNotes.length === 0 || !user) return

    try {
      setSummaryLoading(true)
      // 틀린 문제들의 정보를 수집
      const wrongQuestions = wrongAnswerNotes.map(note => ({
        question: note.test_attempt_items?.paper_test_items?.test_item_question || '',
        answer: note.test_attempt_items?.paper_test_items?.test_item_answer || '',
        category: note.test_attempt_items?.paper_test_items?.test_item_category || '',
        mistakeCount: note.note_mistake_count
      }))

      // 현재 세션에서 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      
      // GPT API를 사용하여 간단한 요약 분석 생성
      const response = await fetch('/api/summary-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({
          wrongQuestions,
          paperId: paperId,
          totalWrongCount: wrongAnswerNotes.length
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setSummaryAnalysis(result.analysis)
      } else {
        const errorText = await response.text()
        console.error('요약 분석 생성 실패:', errorText)
      }
    } catch (err) {
      console.error('요약 분석 오류:', err)
    } finally {
      setSummaryLoading(false)
    }
  }, [wrongAnswerNotes, user, paperId])

  // 오답노트 로드 후 기존 분석 불러오기
  useEffect(() => {
    if (wrongAnswerNotes.length > 0 && user) {
      fetchExistingAnalysis()
    }
  }, [wrongAnswerNotes, user, fetchExistingAnalysis])



  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">오답노트를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">오류: {error}</div>
        <button
          onClick={fetchWrongAnswerNotes}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (wrongAnswerNotes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-500 text-2xl">📝</span>
        </div>
        <div className="text-gray-600 mb-2">아직 오답노트가 없습니다</div>
        <div className="text-gray-400 text-sm">퀴즈를 풀고 틀린 문제가 있으면 여기에 자동으로 추가됩니다</div>
      </div>
    )
  }

  const currentNote = wrongAnswerNotes[currentNoteIndex]
  const totalNotes = wrongAnswerNotes.length

  return (
    <div className="h-full overflow-y-auto space-y-4">
      {/* AI 학습 분석 버튼 */}
      {!hasExistingAnalysis && !analysisLoading && (
        <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">🤖</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">AI 학습 분석</h3>
            <p className="text-gray-600 mb-4">틀린 문제들을 분석하여 개인화된 학습 가이드를 생성합니다</p>
            <button
              onClick={() => {
                generateLearningAnalysis()
                generateSummaryAnalysis()
              }}
              disabled={analysisLoading || summaryLoading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
            >
              {analysisLoading || summaryLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  분석 생성 중...
                </div>
              ) : (
                '🤖 AI 학습 분석 생성'
              )}
            </button>
          </div>
        </div>
      )}

      {/* 학습 분석 섹션 */}
      {learningAnalysis && (
        <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">학습 분석 & 가이드</h3>
            </div>
            <button
              onClick={() => {
                setLearningAnalysis(null)
                setSummaryAnalysis(null)
                setHasExistingAnalysis(false)
              }}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              새로 생성
            </button>
          </div>
          
          {/* 요약 */}
          <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 p-4 rounded-lg border border-blue-100 shadow-sm mb-4">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center text-base">
              <span className="mr-2 text-lg">📋</span>학습 상황 요약
            </h4>
            <p className="text-gray-700 leading-relaxed text-sm">{learningAnalysis?.analysis_summary || '분석 데이터를 불러오는 중...'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* 약점 영역 */}
            <div className="bg-gradient-to-br from-red-50/60 to-pink-50/60 p-4 rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-red-800 mb-2 flex items-center text-base">
                <span className="mr-2 text-lg">⚠️</span>개선이 필요한 영역
              </h4>
              <ul className="space-y-1">
                {learningAnalysis?.analysis_weak_areas?.map((area: string, index: number) => (
                  <li key={index} className="text-gray-700 flex items-start text-sm">
                    <span className="text-red-500 mr-2">•</span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>

            {/* 핵심 개념 */}
            <div className="bg-gradient-to-br from-green-50/60 to-emerald-50/60 p-4 rounded-lg border border-green-100 shadow-sm hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-green-800 mb-2 flex items-center text-base">
                <span className="mr-2 text-lg">🎯</span>기억해야 할 핵심 개념
              </h4>
              <ul className="space-y-1">
                {learningAnalysis?.analysis_key_concepts?.map((concept: string, index: number) => (
                  <li key={index} className="text-gray-700 flex items-start text-sm">
                    <span className="text-green-500 mr-2">•</span>
                    {concept}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 학습 권장사항 */}
          <div className="bg-gradient-to-br from-blue-50/60 to-cyan-50/60 p-4 rounded-lg border border-blue-100 shadow-sm mb-4">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center text-base">
              <span className="mr-2 text-lg">💡</span>학습 권장사항
            </h4>
            <ul className="space-y-2">
              {learningAnalysis?.analysis_study_recommendations?.map((rec: string, index: number) => (
                <li key={index} className="text-gray-700 flex items-start text-sm">
                  <span className="text-blue-500 mr-2">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {/* 개선 계획 */}
          <div className="bg-gradient-to-r from-yellow-50/60 to-orange-50/60 p-4 rounded-lg border border-yellow-100 shadow-sm mb-4">
            <h4 className="font-semibold text-yellow-800 mb-2 flex items-center text-base">
              <span className="mr-2 text-lg">📈</span>개선 계획
            </h4>
            <p className="text-gray-700 leading-relaxed text-sm">{learningAnalysis?.analysis_improvement_plan || '개선 계획을 생성하는 중...'}</p>
          </div>

          {/* 격려 메시지 */}
          <div className="bg-gradient-to-r from-green-50/60 to-emerald-50/60 p-4 rounded-lg border border-green-100 shadow-sm">
            <h4 className="font-semibold text-green-800 mb-2 flex items-center text-base">
              <span className="mr-2 text-lg">🌟</span>격려 메시지
            </h4>
            <p className="text-gray-700 leading-relaxed text-sm italic">{learningAnalysis?.analysis_motivation_message || '격려 메시지를 생성하는 중...'}</p>
          </div>
        </div>
      )}

      {/* 분석 로딩 중 */}
      {analysisLoading && (
        <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
            <span className="text-gray-600">학습 분석을 생성하는 중...</span>
          </div>
        </div>
      )}

      {/* 근거 모음 섹션 */}
      <div className="bg-white p-6 rounded-xl border border-indigo-200 shadow-sm">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">🔍</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-800">틀린 문제 근거 모음</h3>
        </div>
        
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {wrongAnswerNotes.map((note, index) => (
            <div key={note.note_id} className={`p-4 rounded-lg border transition-colors ${
              index % 4 === 0 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' :
              index % 4 === 1 ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200' :
              index % 4 === 2 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' :
              'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-gray-800">
                      {index + 1}. {note.test_attempt_items?.paper_test_items?.test_item_question?.substring(0, 60) || '문제를 불러올 수 없습니다.'}...
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                      {note.note_mistake_count}회 틀림
                    </span>
                  </div>
                  
                  {note.test_attempt_items?.attempt_item_evidence && (
                    <div className="text-sm text-gray-600 bg-white/70 p-3 rounded border-l-4 border-indigo-400">
                      <div className="font-medium text-indigo-700 mb-1">📖 근거:</div>
                      <div className="text-gray-700 leading-relaxed">
                        {note.test_attempt_items.attempt_item_evidence.length > 100 
                          ? note.test_attempt_items.attempt_item_evidence.substring(0, 100) + '...'
                          : note.test_attempt_items.attempt_item_evidence
                        }
                      </div>
                    </div>
                  )}
                </div>
                
                {note.test_attempt_items?.attempt_item_evidence_content_id && onShowEvidenceInPaper && (
                  <button
                    onClick={() => {
                      if (note.test_attempt_items?.attempt_item_evidence_content_id && note.test_attempt_items?.attempt_item_evidence) {
                        onShowEvidenceInPaper(note.test_attempt_items.attempt_item_evidence_content_id, {
                          evidence: note.test_attempt_items.attempt_item_evidence,
                          startIndex: note.test_attempt_items.attempt_item_evidence_start_index || 0,
                          endIndex: note.test_attempt_items.attempt_item_evidence_end_index || 0
                        })
                      }
                    }}
                    disabled={!isTranslationActive}
                    className={`ml-3 px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-200 ${
                      isTranslationActive
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-sm hover:shadow-md'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isTranslationActive ? '📍 위치 보기' : '번역 필요'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 간단한 문제 요약 */}
      <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              📝
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-gray-800">틀린 문제 요약</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white font-medium shadow-sm">
                총 {totalNotes}개
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3">📊 틀린 문제 분포</h4>
            <div className="space-y-3">
              {(() => {
                const categoryData = Object.entries(wrongAnswerNotes.reduce((acc, note) => {
                  const category = note.test_attempt_items?.paper_test_items?.test_item_category || '기타'
                  acc[category] = (acc[category] || 0) + 1
                  return acc
                }, {} as Record<string, number>))
                
                const maxCount = Math.max(...categoryData.map(([, count]) => count))
                
                return categoryData.map(([category, count]) => {
                  const percentage = (count / maxCount) * 100
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 font-medium">{getCategoryDisplayName(category)}</span>
                        <span className="text-sm font-bold text-red-600">{count}개</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-2">🎯 학습 우선순위</h4>
            {summaryLoading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                <span className="text-sm text-gray-600">분석 중...</span>
              </div>
            ) : summaryAnalysis ? (
              <div className="text-sm text-gray-700 font-medium">
                {summaryAnalysis?.summary_learning_priority}
              </div>
            ) : (
              <div className="text-sm text-gray-600">분석 준비 중...</div>
            )}
          </div>
        </div>

        {/* 기억해야 할 핵심 포인트 */}
        {summaryAnalysis && (
          <div className="mt-4 bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
              <span className="mr-2">🧠</span>기억해야 할 핵심 포인트
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <h5 className="text-sm font-medium text-yellow-700 mb-2">📌 핵심 개념</h5>
                <ul className="space-y-1">
                  {summaryAnalysis?.summary_key_points?.slice(0, Math.ceil((summaryAnalysis?.summary_key_points?.length || 0) / 2)).map((point: string, index: number) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-medium text-yellow-700 mb-2">⚠️ 주요 실수 패턴</h5>
                <ul className="space-y-1">
                  {summaryAnalysis?.summary_mistake_patterns?.map((pattern: string, index: number) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      {pattern}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {summaryAnalysis?.summary_quick_tip && (
              <div className="mt-3 p-3 bg-white/70 rounded border-l-4 border-yellow-400">
                <div className="text-sm font-medium text-yellow-800 mb-1">💡 빠른 팁</div>
                <div className="text-sm text-gray-700">{summaryAnalysis?.summary_quick_tip}</div>
              </div>
            )}
          </div>
        )}
      </div>


    </div>
  )
} 