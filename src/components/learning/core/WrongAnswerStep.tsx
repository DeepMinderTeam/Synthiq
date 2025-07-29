'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { WrongAnswerNote, WrongAnswerStudySession } from '@/models/wrong_answer_notes'

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
  const [wrongAnswerNotes, setWrongAnswerNotes] = useState<WrongAnswerNoteWithSessions[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [isStudying, setIsStudying] = useState(false)
  const [studyResult, setStudyResult] = useState<boolean | null>(null)
  const [feedback, setFeedback] = useState('')

  const fetchWrongAnswerNotes = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      console.log('오답노트 조회 시작 - paperId:', paperId)
      
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

      console.log('오답노트 조회 결과:', { data, error })

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
      {/* 진행률 표시 */}
      <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-gray-600">학습 진행률</div>
          <div className="text-sm text-gray-500">
            {currentNoteIndex + 1} / {totalNotes}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentNoteIndex + 1) / totalNotes) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* 현재 문제 */}
      <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {currentNoteIndex + 1}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white font-medium shadow-sm">
                틀린 횟수: {currentNote.note_mistake_count}회
              </span>
              {currentNote.test_attempt_items?.paper_test_items?.test_item_category && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium shadow-sm">
                  {getCategoryDisplayName(currentNote.test_attempt_items.paper_test_items.test_item_category)}
                </span>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-500">
            마지막 틀린 날짜: {formatDate(currentNote.note_last_wrong_date)}
          </div>
        </div>

        {/* 문제 */}
        <div className="text-gray-800 text-base font-medium leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
          {currentNote.test_attempt_items?.paper_test_items?.test_item_question || '문제를 불러올 수 없습니다.'}
        </div>

        {/* 답변 입력 */}
        {studyResult === null && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-600 mb-2">답을 입력하세요:</label>
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="답을 입력하세요..."
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 bg-white shadow-sm"
              rows={3}
            />
          </div>
        )}

        {/* 결과 표시 */}
        {studyResult !== null && (
          <div className={`p-4 rounded-lg border mb-4 ${
            studyResult 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                studyResult ? 'bg-green-500' : 'bg-red-500'
              }`}>
                <span className="text-white text-xs font-bold">
                  {studyResult ? '✓' : '✗'}
                </span>
              </div>
              <span className={`font-semibold ${
                studyResult ? 'text-green-800' : 'text-red-800'
              }`}>
                {studyResult ? '정답입니다!' : '틀렸습니다.'}
              </span>
            </div>
            {!studyResult && feedback && (
              <div className="text-gray-700">{feedback}</div>
            )}
          </div>
        )}

        {/* 정답 표시 */}
        {studyResult !== null && (
          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm mb-4">
            <div className="text-sm font-semibold text-gray-600 mb-2">정답</div>
            <div className="text-base font-medium text-green-600">
              {currentNote.test_attempt_items?.paper_test_items?.test_item_answer || '정답을 불러올 수 없습니다.'}
            </div>
            {currentNote.test_attempt_items?.paper_test_items?.test_item_explanation && (
              <div className="mt-2 text-sm text-gray-600">
                {currentNote.test_attempt_items.paper_test_items.test_item_explanation}
              </div>
            )}
          </div>
        )}

        {/* 근거 찾기 버튼 */}
        {currentNote.test_attempt_items?.attempt_item_evidence && onShowEvidenceInPaper && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">🔍</span>
                </div>
                <span className="font-semibold text-blue-800">근거 찾기</span>
              </div>
              <button
                onClick={() => {
                  console.log('근거보기 버튼 클릭됨')
                  console.log('currentNote:', currentNote)
                  console.log('onShowEvidenceInPaper:', onShowEvidenceInPaper)
                  console.log('isTranslationActive:', isTranslationActive)
                  
                  if (currentNote.test_attempt_items?.attempt_item_evidence_content_id && currentNote.test_attempt_items?.attempt_item_evidence) {
                    console.log('근거 정보:', {
                      contentId: currentNote.test_attempt_items.attempt_item_evidence_content_id,
                      evidence: currentNote.test_attempt_items.attempt_item_evidence,
                      startIndex: currentNote.test_attempt_items.attempt_item_evidence_start_index || 0,
                      endIndex: currentNote.test_attempt_items.attempt_item_evidence_end_index || 0
                    })
                    
                    onShowEvidenceInPaper(currentNote.test_attempt_items.attempt_item_evidence_content_id, {
                      evidence: currentNote.test_attempt_items.attempt_item_evidence,
                      startIndex: currentNote.test_attempt_items.attempt_item_evidence_start_index || 0,
                      endIndex: currentNote.test_attempt_items.attempt_item_evidence_end_index || 0
                    })
                  } else {
                    console.log('근거 정보가 없습니다')
                  }
                }}
                disabled={!isTranslationActive}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isTranslationActive
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isTranslationActive ? '🔍 근거 보기' : '번역 필요'}
              </button>
            </div>
          </div>
        )}

        {/* 버튼들 */}
        {studyResult === null && (
          <div className="flex space-x-4">
            <button
              onClick={() => handleStudySession(true)}
              disabled={isStudying || !userAnswer.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
            >
              정답 확인
            </button>
            <button
              onClick={() => handleStudySession(false)}
              disabled={isStudying || !userAnswer.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
            >
              틀렸어요
            </button>
          </div>
        )}
      </div>

      {/* 오답노트 목록 */}
      <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
        <h3 className="font-semibold mb-4 text-gray-800 flex items-center">
          <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center mr-2">
            <span className="text-white font-bold text-xs">📝</span>
          </div>
          전체 오답노트 ({totalNotes}개)
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {wrongAnswerNotes.map((note, index) => (
            <div
              key={note.note_id}
              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                index === currentNoteIndex
                  ? 'border-blue-400 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
              }`}
              onClick={() => setCurrentNoteIndex(index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                                         <span className="text-sm font-medium text-gray-800">
                       {index + 1}. {note.test_attempt_items?.paper_test_items?.test_item_question?.substring(0, 50) || '문제를 불러올 수 없습니다.'}...
                     </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                      {note.note_mistake_count}회 틀림
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    마지막: {formatDate(note.note_last_wrong_date)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 