// 논문 퀴즈 단계를 표시하는 컴포넌트
// Supabase와 연동하여 실제 데이터베이스에서 퀴즈 정보를 가져와서 표시
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import QuizGenerationModal, { QuizGenerationOptions } from '../quiz/QuizGenerationModal'

interface QuizStepProps {
  paperId: string
  onNavigateToContent?: (contentId: number, highlightInfo?: { evidence: string; startIndex: number; endIndex: number }) => void
  onShowEvidenceInPaper?: (contentId: number, highlightInfo?: { evidence: string; startIndex: number; endIndex: number }) => void
  isTranslationActive?: boolean
}

// 데이터베이스 타입 정의 (ER 다이어그램 기반)
interface PaperQuiz {
  quiz_id: number
  quiz_content_id: number
  quiz_type: string
  quiz_question: string
  quiz_choices: string[]
  quiz_answer: string
  quiz_explanation: string
  quiz_category?: string // 카테고리 정보 (선택적)
  // 근거 관련 필드 추가
  quiz_evidence?: string // 퀴즈 정답의 근거 텍스트
  quiz_evidence_start_index?: number // 근거 텍스트 시작 위치
  quiz_evidence_end_index?: number // 근거 텍스트 끝 위치
}

// 카테고리 ID를 한글명으로 변환하는 함수
const getCategoryDisplayName = (categoryId: string): string => {
  const categoryMap: Record<string, string> = {
    // 일반 학습용
    'definition': '개념 이해',
    'mechanism': '원리 및 구조',
    'application': '예시 및 응용',
    'comparison': '비교 및 분류',
    'problem_solving': '문제 해결',
    
    // 논문 학습용
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

interface PaperTest {
  test_id: number
  test_paper_id: number
  test_title: string
  test_created_at: string
}

interface TestAttempt {
  attempt_id: number
  attempt_user_id: string
  attempt_test_id: number
  test_id?: number // 새로 생성된 테스트를 위한 속성
  attempt_score: number
  attempt_duration_sec: number
  attempt_created_at: string
  test_title?: string // 조인으로 가져올 때 사용
}

interface TestAttemptItem {
  attempt_item_id: number
  attempt_item_attempt_id: number
  attempt_item_quiz_id: number
  attempt_user_answer: string
  attempt_is_correct: boolean
  attempt_score?: number // AI 채점 점수
  attempt_feedback?: string // AI 피드백
  attempt_explanation?: string // AI 상세 해설
  quiz_question?: string // 조인으로 가져올 때 사용
  quiz_answer?: string
  quiz_explanation?: string
  quiz_type?: string
  quiz_category?: string // 카테고리 정보 (선택적)
  // AI 근거 찾기 관련 필드
  attempt_item_evidence?: string // AI가 찾은 근거 텍스트
  attempt_item_evidence_content_id?: number // 근거가 있는 content_id
  attempt_item_evidence_start_index?: number // 근거 텍스트 시작 위치
  attempt_item_evidence_end_index?: number // 근거 텍스트 끝 위치
  // 퀴즈 근거 관련 필드 (퀴즈 생성 시 저장된 근거)
  quiz_evidence?: string // 퀴즈 정답의 근거 텍스트
  quiz_evidence_start_index?: number // 근거 텍스트 시작 위치
  quiz_evidence_end_index?: number // 근거 텍스트 끝 위치
  quiz_content_id?: number // 퀴즈가 속한 content_id
}

// 타이머 커스텀 훅
const useTimer = () => {
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startTimer = () => {
    setSeconds(0)
    setIsRunning(true)
    intervalRef.current = setInterval(() => {
      setSeconds(prev => prev + 1)
    }, 1000)
  }

  const stopTimer = () => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const resetTimer = () => {
    stopTimer()
    setSeconds(0)
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const remainingSeconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return { seconds, isRunning, startTimer, stopTimer, resetTimer, formatTime }
}

export default function QuizStep({ paperId, onNavigateToContent, onShowEvidenceInPaper, isTranslationActive = false }: QuizStepProps) {
  const [quizzes, setQuizzes] = useState<PaperQuiz[]>([])
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([])
  const [currentAttempt, setCurrentAttempt] = useState<TestAttempt | null>(null)
  const [attemptItems, setAttemptItems] = useState<TestAttemptItem[]>([])
  const [userAnswers, setUserAnswers] = useState<{ [quizId: number]: string }>({})
  const [isTakingQuiz, setIsTakingQuiz] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [generatingQuiz, setGeneratingQuiz] = useState(false)
  const [gradingAnswers, setGradingAnswers] = useState(false)

  // 타이머 훅 사용
  const { seconds, isRunning, startTimer, stopTimer, resetTimer, formatTime } = useTimer()

  const fetchQuizzes = useCallback(async () => {
    try {
      // paper_contents를 통해 연결된 퀴즈들을 가져옴
      const { data, error } = await supabase
        .from('paper_quizzes')
        .select(`
          *,
          paper_contents!inner(content_paper_id)
        `)
        .eq('paper_contents.content_paper_id', paperId)
        .order('quiz_id', { ascending: true })

      if (error) {
        console.error('퀴즈 로드 오류:', error)
        setError(error.message)
      } else {
        // quiz_choices를 파싱
        const parsedQuizzes = data?.map(quiz => ({
          ...quiz,
          quiz_choices: Array.isArray(quiz.quiz_choices) ? quiz.quiz_choices : [],
          quiz_evidence: quiz.quiz_evidence || undefined,
          quiz_evidence_start_index: quiz.quiz_evidence_start_index || undefined,
          quiz_evidence_end_index: quiz.quiz_evidence_end_index || undefined
        })) || []
        setQuizzes(parsedQuizzes)
      }
    } catch (err) {
      console.error('퀴즈 로드 오류:', err)
      setError('퀴즈 정보를 불러오는 중 오류가 발생했습니다.')
    }
  }, [paperId])

  const fetchTestAttempts = useCallback(async () => {
    try {
      // 먼저 paper_tests를 가져옴
      const { data: tests, error: testsError } = await supabase
        .from('paper_tests')
        .select('*')
        .eq('test_paper_id', paperId)
        .order('test_created_at', { ascending: false })

      if (testsError) {
        console.error('테스트 정보 로드 오류:', testsError)
        return
      }

      console.log('조회된 테스트들:', tests)

      if (tests && tests.length > 0) {
        // 각 테스트의 응시 기록을 가져옴
        const attemptsPromises = tests.map(test => 
          supabase
            .from('test_attempts')
            .select('*')
            .eq('attempt_test_id', test.test_id)
            .order('attempt_created_at', { ascending: false })
        )

        const attemptsResults = await Promise.all(attemptsPromises)
        const allAttempts: TestAttempt[] = []

        attemptsResults.forEach((result, index) => {
          if (result.data && result.data.length > 0) {
            // 응시 기록이 있는 경우
            const attemptsWithTestTitle = result.data.map(attempt => ({
              ...attempt,
              test_title: tests[index].test_title
            }))
            allAttempts.push(...attemptsWithTestTitle)
          } else {
            // 응시 기록이 없는 경우, 테스트 자체를 표시
            const dummyAttempt: TestAttempt = {
              attempt_id: -tests[index].test_id, // 음수로 구분
              attempt_user_id: '',
              attempt_test_id: tests[index].test_id,
              test_id: tests[index].test_id, // test_id 추가
              attempt_score: 0,
              attempt_duration_sec: 0,
              attempt_created_at: tests[index].test_created_at,
              test_title: tests[index].test_title
            }
            allAttempts.push(dummyAttempt)
          }
        })

        console.log('최종 테스트 목록:', allAttempts)
        setTestAttempts(allAttempts)
      }
    } catch (err) {
      console.error('테스트 시도 로드 오류:', err)
    }
  }, [paperId])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        await Promise.all([
          fetchQuizzes(),
          fetchTestAttempts()
        ])
      } catch (err) {
        setError('데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (paperId) {
      fetchData()
    }
  }, [paperId, fetchQuizzes, fetchTestAttempts])

  const handleGenerateQuiz = async (options: QuizGenerationOptions) => {
    try {
      setGeneratingQuiz(true)
      console.log('퀴즈 생성 요청 시작:', { paperId, options })
      
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paperId, options }),
      })

      const result = await response.json()
      console.log('퀴즈 생성 응답:', { status: response.status, result })

      if (!response.ok) {
        throw new Error(result.error || '퀴즈 생성에 실패했습니다.')
      }

      // 성공 메시지 표시
      alert(`퀴즈 생성 완료! ${result.quizCount}개의 퀴즈가 생성되었습니다.`)

      // 데이터 새로고침
      await Promise.all([fetchQuizzes(), fetchTestAttempts()])
      
      // 새로 생성된 테스트를 바로 표시하기 위해 테스트 목록 새로고침
      console.log('퀴즈 생성 후 데이터 새로고침 완료')
      
    } catch (err) {
      console.error('퀴즈 생성 오류:', err)
      const errorMessage = err instanceof Error ? err.message : '퀴즈 생성 중 오류가 발생했습니다.'
      setError(errorMessage)
      alert(`퀴즈 생성 실패: ${errorMessage}`)
    } finally {
      setGeneratingQuiz(false)
    }
  }

  const createNewTest = async () => {
    setShowModal(true)
  }

  const startQuiz = (attempt: TestAttempt) => {
    setCurrentAttempt(attempt)
    setIsTakingQuiz(true)
    setUserAnswers({})
    startTimer() // 타이머 시작
  }

  const viewAttemptHistory = async (attempt: TestAttempt) => {
    try {
      // 음수 attempt_id는 새로 생성된 테스트 (아직 응시 기록 없음)
      if (attempt.attempt_id < 0) {
        console.log('새로 생성된 테스트 시작:', attempt)
        // 해당 테스트의 퀴즈들을 가져와서 바로 시작
        const { data: testItems, error: testItemsError } = await supabase
          .from('paper_test_items')
          .select(`
            *,
            paper_quizzes(*)
          `)
          .eq('item_test_id', attempt.test_id)

        if (testItemsError) {
          console.error('테스트 아이템 조회 오류:', testItemsError)
          throw testItemsError
        }

        if (testItems && testItems.length > 0) {
          // 퀴즈 정보 추출
          const quizzes = testItems.map(item => item.paper_quizzes).filter(Boolean)
          console.log('새 테스트의 퀴즈들:', quizzes)
          
          // 퀴즈 목록 설정
          setQuizzes(quizzes)
          setCurrentAttempt(attempt)
          setIsTakingQuiz(true)
          setUserAnswers({})
          startTimer() // 타이머 시작
        } else {
          throw new Error('이 테스트에 퀴즈가 없습니다.')
        }
        return
      }

      // 기존 응시 기록이 있는 경우
      const { data, error } = await supabase
        .from('test_attempt_items')
        .select(`
          *,
          paper_quizzes(quiz_question, quiz_answer, quiz_explanation, quiz_type, quiz_category)
        `)
        .eq('attempt_item_attempt_id', attempt.attempt_id)

      if (error) throw error

      const itemsWithQuizInfo = data?.map(item => ({
        ...item,
        quiz_question: item.paper_quizzes?.quiz_question,
        quiz_answer: item.paper_quizzes?.quiz_answer,
        quiz_explanation: item.paper_quizzes?.quiz_explanation,
        quiz_type: item.paper_quizzes?.quiz_type,
        quiz_category: item.paper_quizzes?.quiz_category,
        // 퀴즈 근거 정보 추가
        quiz_evidence: item.paper_quizzes?.quiz_evidence,
        quiz_evidence_start_index: item.paper_quizzes?.quiz_evidence_start_index,
        quiz_evidence_end_index: item.paper_quizzes?.quiz_evidence_end_index,
        quiz_content_id: item.paper_quizzes?.quiz_content_id
      })) || []

      setAttemptItems(itemsWithQuizInfo)
      setCurrentAttempt(attempt)
      setIsTakingQuiz(false)
      resetTimer() // 타이머 리셋
    } catch (err) {
      console.error('응시 기록 로드 오류:', err)
      setError('응시 기록을 불러오는 중 오류가 발생했습니다.')
    }
  }

  const handleAnswerChange = (quizId: number, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [quizId]: answer
    }))
  }

  const gradeSubjectiveAnswer = async (quiz: PaperQuiz, userAnswer: string) => {
    try {
      const response = await fetch('/api/grade-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId: quiz.quiz_id,
          userAnswer,
          correctAnswer: quiz.quiz_answer,
          questionType: quiz.quiz_type,
          questionText: quiz.quiz_question
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '채점에 실패했습니다.')
      }

      return result
    } catch (err) {
      console.error('채점 오류:', err)
      // 채점 실패 시 기본값 반환
      return {
        isCorrect: false,
        score: 0,
        feedback: '채점 중 오류가 발생했습니다.',
        explanation: quiz.quiz_explanation
      }
    }
  }

  // 틀린 문제의 근거를 미리 찾는 함수
  const findEvidenceForWrongAnswer = async (quiz: PaperQuiz): Promise<{
    evidence?: string
    contentId?: number
    startIndex?: number
    endIndex?: number
  }> => {
    try {
      // 번역이 활성화되어 있지 않으면 근거 찾기 건너뛰기
      if (!isTranslationActive) {
        console.log('번역이 비활성화되어 근거 찾기를 건너뜁니다.')
        return {}
      }

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.log('세션이 없어 근거 찾기를 건너뜁니다.')
        return {}
      }

      const contentId = quiz.quiz_content_id || 1

      const response = await fetch('/api/find-answer-evidence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question: quiz.quiz_question,
          answer: quiz.quiz_answer,
          explanation: quiz.quiz_explanation,
          contentId: contentId
        }),
      })

      if (!response.ok) {
        console.log('근거 찾기 API 호출 실패:', response.status)
        return {}
      }

      const result = await response.json()
      
      if (result.evidence) {
        console.log('근거 찾기 성공:', result.evidence.substring(0, 50))
        return {
          evidence: result.evidence,
          contentId: contentId,
          startIndex: result.startIndex,
          endIndex: result.endIndex
        }
      } else {
        console.log('근거를 찾을 수 없습니다.')
        return {}
      }
    } catch (error) {
      console.error('근거 찾기 오류:', error)
      return {}
    }
  }

  const submitQuiz = async () => {
    if (!currentAttempt) return

    try {
      setGradingAnswers(true)
      
      // 타이머 정지 및 시간 기록
      stopTimer()
      const finalDuration = seconds
      console.log('퀴즈 제출 - 소요시간:', finalDuration, '초')

      // 새로 생성된 테스트인 경우 먼저 test_attempts 레코드 생성
      let actualAttemptId = currentAttempt.attempt_id
      if (currentAttempt.attempt_id < 0) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('사용자 정보를 찾을 수 없습니다.')

        const { data: newAttempt, error: createError } = await supabase
          .from('test_attempts')
          .insert({
            attempt_user_id: user.id,
            attempt_test_id: currentAttempt.test_id || currentAttempt.attempt_test_id,
            attempt_score: 0,
            attempt_duration_sec: 0
          })
          .select()
          .single()

        if (createError) throw createError
        actualAttemptId = newAttempt.attempt_id
        console.log('새 테스트 시도 생성:', newAttempt)
      }

      // 각 퀴즈별 채점
      const gradingResults = []
      
      for (const [quizId, userAnswer] of Object.entries(userAnswers)) {
        const quiz = quizzes.find(q => q.quiz_id === parseInt(quizId))
        if (!quiz) continue

        let isCorrect = false
        let score = 0
        let feedback = ''
        let explanation = ''

        if (quiz.quiz_type === 'multiple_choice') {
          // 객관식은 자동 채점
          isCorrect = userAnswer === quiz.quiz_answer
          score = isCorrect ? 100 : 0
          feedback = isCorrect ? '정답입니다!' : '틀렸습니다.'
          explanation = quiz.quiz_explanation || '정답을 확인해보세요.'
        } else {
          // 주관식은 AI 채점
          const gradingResult = await gradeSubjectiveAnswer(quiz, userAnswer)
          isCorrect = gradingResult.isCorrect
          score = gradingResult.score
          feedback = gradingResult.feedback
          explanation = gradingResult.explanation
        }

        // 틀린 문제인 경우 근거를 미리 찾기
        let evidenceData: { evidence?: string; contentId?: number; startIndex?: number; endIndex?: number } = {}
        if (!isCorrect) {
          // 저장된 근거 정보가 있는지 확인
          if (quiz.quiz_evidence && quiz.quiz_evidence.trim()) {
            console.log('저장된 근거 정보 사용:', quiz.quiz_evidence.substring(0, 50))
            evidenceData = {
              evidence: quiz.quiz_evidence,
              contentId: quiz.quiz_content_id,
              startIndex: quiz.quiz_evidence_start_index || null,
              endIndex: quiz.quiz_evidence_end_index || null
            }
          } else {
            // 저장된 근거가 없으면 실시간으로 찾기
            console.log('저장된 근거 없음, 실시간 근거 찾기 시작:', quiz.quiz_question.substring(0, 30))
            evidenceData = await findEvidenceForWrongAnswer(quiz)
          }
          
          // 틀린 문제를 오답노트에 추가 (나중에 attempt_item_id로 추가)
          console.log('오답노트 추가 예정:', quiz.quiz_question.substring(0, 30))
        }

        gradingResults.push({
          attempt_item_attempt_id: actualAttemptId,
          attempt_item_quiz_id: parseInt(quizId),
          attempt_user_answer: userAnswer,
          attempt_is_correct: isCorrect,
          attempt_score: score,
          attempt_feedback: feedback,
          attempt_explanation: explanation,
          // 근거 정보 추가
          attempt_item_evidence: evidenceData.evidence || null,
          attempt_item_evidence_content_id: evidenceData.contentId || null,
          attempt_item_evidence_start_index: evidenceData.startIndex || null,
          attempt_item_evidence_end_index: evidenceData.endIndex || null
        })
      }

      // 응시 아이템들 생성
      const { data: insertedItems, error: itemsError } = await supabase
        .from('test_attempt_items')
        .insert(gradingResults)
        .select()

      if (itemsError) throw itemsError

      // 틀린 문제들을 오답노트에 추가
      if (insertedItems) {
        console.log('삽입된 아이템들:', insertedItems)
        for (const item of insertedItems) {
          if (!item.attempt_is_correct) {
            console.log('틀린 문제 발견, 오답노트에 추가 시도:', item.attempt_item_id)
            try {
              const { data: { session } } = await supabase.auth.getSession()
              if (!session?.access_token) {
                console.error('액세스 토큰이 없습니다.')
                return
              }

              const response = await fetch('/api/wrong-answer-notes', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  attemptItemId: item.attempt_item_id
                }),
              })
              
              if (response.ok) {
                const result = await response.json()
                console.log('오답노트에 성공적으로 추가됨:', result)
              } else {
                const errorText = await response.text()
                console.error('오답노트 추가 실패:', response.status, errorText)
              }
            } catch (err) {
              console.error('오답노트 추가 오류:', err)
            }
          }
        }
      }

      // 총점 계산 (개별 점수 기반)
      const totalScore = Math.round(gradingResults.reduce((sum, result) => sum + (result.attempt_score || 0), 0) / gradingResults.length)

      console.log('퀴즈 제출 - 점수:', totalScore, '소요시간:', finalDuration)

      // 테스트 시도 업데이트
      const { data: updateData, error: updateError } = await supabase
        .from('test_attempts')
        .update({
          attempt_score: totalScore,
          attempt_duration_sec: finalDuration
        })
        .eq('attempt_id', actualAttemptId)
        .select()

      if (updateError) {
        console.error('테스트 시도 업데이트 오류:', updateError)
        throw updateError
      }

      console.log('테스트 시도 업데이트 성공:', updateData)

      // 응시 기록 보기로 전환 (실제 attempt_id 사용)
      const updatedAttempt = { ...currentAttempt, attempt_id: actualAttemptId }
      await viewAttemptHistory(updatedAttempt)
    } catch (err) {
      console.error('퀴즈 제출 오류:', err)
      setError('퀴즈 제출 중 오류가 발생했습니다.')
    } finally {
      setGradingAnswers(false)
    }
  }

  const renderQuizQuestion = (quiz: PaperQuiz, index: number) => {
    return (
      <div key={quiz.quiz_id} className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {index + 1}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium shadow-sm">
                {quiz.quiz_type === 'multiple_choice' ? '객관식' : 
                 quiz.quiz_type === 'ox_quiz' ? 'OX 퀴즈' :
                 quiz.quiz_type === 'short_answer' ? '단답형' : '서술형'}
              </span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium shadow-sm">
                {getCategoryDisplayName(quiz.quiz_category || '')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="text-gray-800 text-base font-medium leading-relaxed bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
            {quiz.quiz_question}
          </div>
          
          {quiz.quiz_type === 'ox_quiz' ? (
            // OX 퀴즈 전용 UI
            <div className="flex justify-center space-x-6">
              <button
                onClick={() => handleAnswerChange(quiz.quiz_id, '참')}
                className={`w-24 h-24 rounded-full border-4 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 ${
                  userAnswers[quiz.quiz_id] === '참'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-600 text-white shadow-green-200'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-green-400 hover:bg-green-50'
                }`}
              >
                O
              </button>
              <button
                onClick={() => handleAnswerChange(quiz.quiz_id, '거짓')}
                className={`w-24 h-24 rounded-full border-4 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 ${
                  userAnswers[quiz.quiz_id] === '거짓'
                    ? 'bg-gradient-to-r from-red-500 to-pink-600 border-red-600 text-white shadow-red-200'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50'
                }`}
              >
                X
              </button>
            </div>
          ) : quiz.quiz_type === 'multiple_choice' ? (
            // 객관식
            <div className="space-y-3">
              {quiz.quiz_choices.map((choice, choiceIndex) => (
                <div key={choiceIndex} className="relative">
                  <input 
                    type="radio" 
                    name={`quiz-${quiz.quiz_id}`} 
                    id={`choice-${quiz.quiz_id}-${choiceIndex}`}
                    value={choice}
                    checked={userAnswers[quiz.quiz_id] === choice}
                    onChange={(e) => handleAnswerChange(quiz.quiz_id, e.target.value)}
                    className="sr-only"
                  />
                  <label 
                    htmlFor={`choice-${quiz.quiz_id}-${choiceIndex}`} 
                    className={`block w-full p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-md ${
                      userAnswers[quiz.quiz_id] === choice
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-blue-600 text-white shadow-lg'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        userAnswers[quiz.quiz_id] === choice
                          ? 'border-white bg-white'
                          : 'border-gray-300'
                      }`}>
                        {userAnswers[quiz.quiz_id] === choice && (
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
                        )}
                      </div>
                      <span className="font-medium">{choice}</span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          ) : (
            // 주관식 (단답형/서술형)
            <div>
              <textarea
                value={userAnswers[quiz.quiz_id] || ''}
                onChange={(e) => handleAnswerChange(quiz.quiz_id, e.target.value)}
                placeholder={quiz.quiz_type === 'short_answer' ? '답을 입력하세요...' : '답변을 자세히 작성하세요...'}
                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                rows={quiz.quiz_type === 'short_answer' ? 3 : 5}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-300 rounded animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-4 bg-gray-300 rounded animate-pulse" 
                 style={{ width: `${(i % 4) * 15 + 45}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-red-500">오류: {error}</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto space-y-4">

      {/* 퀴즈 회차 목록 */}
      {testAttempts.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
          <h3 className="font-semibold mb-6 text-gray-800 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">📝</span>
            </div>
            퀴즈 회차
          </h3>
          <div className="overflow-x-auto">
            <div className="flex space-x-4 pb-4 min-w-max">
              {testAttempts.map((attempt, index) => (
              <button
                key={attempt.attempt_id}
                onClick={() => viewAttemptHistory(attempt)}
                  className={`relative flex-shrink-0 w-40 p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-lg ${
                    currentAttempt?.attempt_id === attempt.attempt_id
                      ? 'border-blue-400 bg-blue-50 shadow-md'
                      : attempt.attempt_id < 0 
                        ? 'border-blue-200 bg-white hover:border-blue-300 hover:bg-blue-50' 
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                  {/* 회차 번호 - 새 퀴즈가 아닐 때만 표시 */}
                  {attempt.attempt_id >= 0 && (
                    <div className="absolute top-2 left-2 w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">
                      {testAttempts.length - index}
                    </div>
                  )}
                  
                  {/* 새 퀴즈 표시 */}
                  {attempt.attempt_id < 0 && (
                    <div className="absolute top-2 left-2">
                      <span className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs px-1.5 py-0.5 rounded-full font-bold shadow-md">
                        NEW
                      </span>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="font-semibold text-sm text-gray-800 line-clamp-2 pt-8">
                  {attempt.test_title}
                </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                  {attempt.attempt_id < 0 ? (
                        <div className="flex items-center text-blue-600 font-medium">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                          새 퀴즈
                        </div>
                  ) : (
                    <>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">점수:</span>
                            <span className={`font-semibold ${
                              attempt.attempt_score >= 80 ? 'text-green-600' :
                              attempt.attempt_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {attempt.attempt_score}점
                            </span>
                          </div>
                      {attempt.attempt_duration_sec > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">시간:</span>
                              <span className="font-mono text-xs text-gray-700">
                                {formatTime(attempt.attempt_duration_sec)}
                              </span>
                            </div>
                      )}
                    </>
                  )}
                </div>
                    
                    <div className="text-xs text-gray-400 pt-1 border-t border-gray-100">
                      {new Date(attempt.attempt_created_at).toLocaleDateString('ko-KR', {
                        year: '2-digit',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Seoul'
                      }).replace(/\. /g, '-').replace(/\./g, '')}
                    </div>
                </div>
              </button>
            ))}
            </div>
          </div>
        </div>
      )}

      {/* 현재 선택된 회차의 퀴즈 또는 기록 */}
      {currentAttempt && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-xl text-gray-800">{currentAttempt.test_title}</h3>
            <div className="flex items-center space-x-6">
              {/* 타이머 표시 */}
              {isTakingQuiz && (
                <div className="flex items-center space-x-3 bg-gradient-to-r from-red-50 to-pink-50 px-4 py-2 rounded-full border border-red-200 shadow-sm">
                  <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-lg font-mono font-bold text-red-600">
                    {formatTime(seconds)}
                  </span>
                </div>
              )}
              {isTakingQuiz && (
                <button
                  onClick={submitQuiz}
                  disabled={gradingAnswers}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold flex items-center space-x-2"
                >
                  {gradingAnswers ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>채점 중...</span>
                    </>
                  ) : (
                    <>
                      <span>📤</span>
                      <span>제출하기</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {isTakingQuiz ? (
            // 퀴즈 풀기 모드
            <div className="space-y-4">
              {quizzes.map((quiz, index) => renderQuizQuestion(quiz, index))}
            </div>
          ) : (
            // 기록 보기 모드
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">📊</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-600">최종 점수</div>
                    <div className={`text-2xl font-bold ${
                      currentAttempt.attempt_score >= 80 ? 'text-green-600' :
                      currentAttempt.attempt_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {currentAttempt.attempt_score}점
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-600">소요 시간</div>
                  <div className="text-lg font-mono font-bold text-blue-600">
                    {formatTime(currentAttempt.attempt_duration_sec)}
                  </div>
                </div>
              </div>
              
              {attemptItems.map((item, index) => (
                <div key={item.attempt_item_id} className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        item.attempt_is_correct 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                          : 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
                      }`}>
                        {item.attempt_is_correct ? '✓' : '✗'}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium shadow-sm">
                          {item.quiz_type === 'multiple_choice' ? '객관식' : 
                           item.quiz_type === 'ox_quiz' ? 'OX 퀴즈' :
                           item.quiz_type === 'short_answer' ? '단답형' : '서술형'}
                        </span>
                        <span className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium shadow-sm">
                          {getCategoryDisplayName(item.quiz_category || '')}
                        </span>
                      </div>
                    </div>
                    {item.attempt_score !== undefined && (
                      <div className={`text-sm font-bold px-3 py-1 rounded-full ${
                        item.attempt_score >= 80 ? 'bg-green-100 text-green-800' :
                        item.attempt_score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.attempt_score}점
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-gray-800 text-base font-medium leading-relaxed bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                      {item.quiz_question}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                        <div className="text-sm font-semibold text-gray-600 mb-2">내 답변</div>
                        <div className={`text-base font-medium ${
                          item.attempt_is_correct ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.quiz_type === 'ox_quiz' ? (
                            <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full border-2 font-bold text-lg ${
                              item.attempt_user_answer === '참' 
                                ? 'bg-green-100 border-green-300 text-green-700' 
                                : 'bg-red-100 border-red-300 text-red-700'
                            }`}>
                              {item.attempt_user_answer === '참' ? 'O' : 'X'}
                            </span>
                          ) : (
                            item.attempt_user_answer
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                        <div className="text-sm font-semibold text-gray-600 mb-2">정답</div>
                        <div className="text-base font-medium text-green-600">
                          {item.quiz_type === 'ox_quiz' ? (
                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full border-2 font-bold text-lg bg-green-100 border-green-300 text-green-700">
                              {item.quiz_answer === '참' ? 'O' : 'X'}
                            </span>
                          ) : (
                            item.quiz_answer
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* AI 피드백 표시 */}
                    {item.attempt_feedback && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">💡</span>
                          </div>
                          <span className="font-semibold text-blue-800">AI 피드백</span>
                        </div>
                        <div className="text-gray-700">{item.attempt_feedback}</div>
                      </div>
                    )}
                    
                    {/* AI 해설 표시 */}
                    {item.attempt_explanation && (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">📚</span>
                          </div>
                          <span className="font-semibold text-yellow-800">상세 해설</span>
                        </div>
                        <div className="text-gray-700">{item.attempt_explanation}</div>
                      </div>
                    )}
                    
                    {/* 틀린 문제의 근거 찾기 버튼 */}
                    {!item.attempt_is_correct && (
                      <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">🔍</span>
                            </div>
                            <span className="font-semibold text-red-800">틀린 문제 근거 찾기</span>
                          </div>
                          <button
                            onClick={async () => {
                              if (!isTranslationActive) {
                                alert('번역이 활성화되어야 근거를 찾을 수 있습니다.')
                                return
                              }

                              try {
                                // 저장된 근거 정보가 있는지 확인
                                if (item.quiz_evidence && item.quiz_evidence.trim()) {
                                  console.log('저장된 근거 정보 사용:', item.quiz_evidence.substring(0, 50))
                                  
                                  if (onShowEvidenceInPaper) {
                                    onShowEvidenceInPaper(item.quiz_content_id || 1, {
                                      evidence: item.quiz_evidence,
                                      startIndex: item.quiz_evidence_start_index || null,
                                      endIndex: item.quiz_evidence_end_index || null
                                    })
                                    console.log('저장된 근거 onShowEvidenceInPaper 호출 완료')
                                  } else {
                                    console.log('저장된 근거 onShowEvidenceInPaper가 정의되지 않음')
                                  }
                                  return
                                }

                                // 저장된 근거가 없으면 실시간으로 찾기
                                const { data: { session } } = await supabase.auth.getSession()
                                
                                if (!session) {
                                  alert('로그인이 필요합니다.')
                                  return
                                }

                                // 퀴즈 정보 찾기
                                const quiz = quizzes.find(q => q.quiz_id === item.attempt_item_quiz_id)
                                if (!quiz) {
                                  console.error('퀴즈 정보를 찾을 수 없습니다:', item.attempt_item_quiz_id)
                                  alert('퀴즈 정보를 찾을 수 없습니다.')
                                  return
                                }

                                // content_id 설정
                                const contentId = item.quiz_content_id || quiz.quiz_content_id || 1

                                // GPT API로 근거 찾기
                                const response = await fetch('/api/find-answer-evidence', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${session.access_token}`,
                                  },
                                  body: JSON.stringify({
                                    question: item.quiz_question || quiz.quiz_question,
                                    answer: item.quiz_answer || quiz.quiz_answer,
                                    explanation: item.quiz_explanation || quiz.quiz_explanation,
                                    contentId: contentId
                                  }),
                                })

                                const result = await response.json()
                                
                                if (!response.ok) {
                                  throw new Error(result.error || '근거 찾기에 실패했습니다.')
                                }

                                if (result.evidence) {
                                  // 근거를 찾았으면 옆 논문에서 표시
                                  console.log('실시간 근거 찾기 성공, 옆 논문에서 표시 시도:', {
                                    contentId,
                                    evidence: result.evidence.substring(0, 50)
                                  })
                                  
                                  if (onShowEvidenceInPaper) {
                                    onShowEvidenceInPaper(contentId, {
                                      evidence: result.evidence,
                                      startIndex: result.startIndex,
                                      endIndex: result.endIndex
                                    })
                                    console.log('실시간 근거 onShowEvidenceInPaper 호출 완료')
                                  } else {
                                    console.log('실시간 근거 onShowEvidenceInPaper가 정의되지 않음')
                                  }
                                } else {
                                  alert('이 문제의 근거를 찾을 수 없습니다.')
                                }
                              } catch (error) {
                                console.error('근거 찾기 오류:', error)
                                alert('근거 찾기에 실패했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'))
                              }
                            }}
                            disabled={!isTranslationActive}
                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                              isTranslationActive
                                ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {isTranslationActive ? '🔍 AI 근거 찾기' : '번역 필요'}
                          </button>
                        </div>
                        <div className="text-sm text-red-700 mt-2">
                          {isTranslationActive 
                            ? 'AI가 이 문제의 정답 근거를 찾아서 하이라이트로 표시해드립니다.'
                            : '번역을 활성화하면 AI가 틀린 문제의 근거를 자동으로 찾아줍니다.'
                          }
                        </div>
                      </div>
                    )}
                    
                    {/* 기존 해설 표시 (AI 해설이 없을 때) */}
                    {!item.attempt_explanation && item.quiz_explanation && (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">📖</span>
                          </div>
                          <span className="font-semibold text-yellow-800">해설</span>
                        </div>
                        <div className="text-gray-700">{item.quiz_explanation}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 퀴즈가 없을 때 */}
      {quizzes.length === 0 && (
        <div className="text-gray-500 text-center py-8">
          이 논문에는 아직 퀴즈가 생성되지 않았습니다.
          <br />
          <span className="text-sm">&ldquo;🤖 AI 퀴즈 생성&rdquo; 버튼을 눌러보세요!</span>
        </div>
      )}

      {/* AI 퀴즈 생성 모달 */}
      <QuizGenerationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onGenerate={handleGenerateQuiz}
        paperId={paperId}
      />
    </div>
  )
} 