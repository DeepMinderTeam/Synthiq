// 논문 퀴즈 단계를 표시하는 컴포넌트
// Supabase와 연동하여 실제 데이터베이스에서 퀴즈 정보를 가져와서 표시
'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import QuizGenerationModal, { QuizGenerationOptions } from './QuizGenerationModal'

interface QuizStepProps {
  paperId: string
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

export default function QuizStep({ paperId }: QuizStepProps) {
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
  }, [paperId])

  const fetchQuizzes = async () => {
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
          quiz_choices: Array.isArray(quiz.quiz_choices) ? quiz.quiz_choices : []
        })) || []
        setQuizzes(parsedQuizzes)
      }
    } catch (err) {
      console.error('퀴즈 로드 오류:', err)
      setError('퀴즈 정보를 불러오는 중 오류가 발생했습니다.')
    }
  }

  const fetchTestAttempts = async () => {
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
  }

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
          paper_quizzes(quiz_question, quiz_answer, quiz_explanation, quiz_type)
        `)
        .eq('attempt_item_attempt_id', attempt.attempt_id)

      if (error) throw error

      const itemsWithQuizInfo = data?.map(item => ({
        ...item,
        quiz_question: item.paper_quizzes?.quiz_question,
        quiz_answer: item.paper_quizzes?.quiz_answer,
        quiz_explanation: item.paper_quizzes?.quiz_explanation,
        quiz_type: item.paper_quizzes?.quiz_type
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

        gradingResults.push({
          attempt_item_attempt_id: actualAttemptId,
          attempt_item_quiz_id: parseInt(quizId),
          attempt_user_answer: userAnswer,
          attempt_is_correct: isCorrect,
          attempt_score: score,
          attempt_feedback: feedback,
          attempt_explanation: explanation
        })
      }

      // 응시 아이템들 생성
      const { error: itemsError } = await supabase
        .from('test_attempt_items')
        .insert(gradingResults)

      if (itemsError) throw itemsError

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
      <div key={quiz.quiz_id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
        <div className="font-semibold mb-3 text-gray-800">
          퀴즈 {index + 1} 
          <span className="ml-2 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
            {quiz.quiz_type === 'multiple_choice' ? '객관식' : 
             quiz.quiz_type === 'short_answer' ? '단답형' : '서술형'}
          </span>
        </div>
        <div className="space-y-3">
          <div className="text-gray-700 text-sm">
            {quiz.quiz_question}
          </div>
          
          {quiz.quiz_type === 'multiple_choice' ? (
            // 객관식
            <div className="space-y-2">
              {quiz.quiz_choices.map((choice, choiceIndex) => (
                <div key={choiceIndex} className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    name={`quiz-${quiz.quiz_id}`} 
                    id={`choice-${quiz.quiz_id}-${choiceIndex}`}
                    value={choice}
                    checked={userAnswers[quiz.quiz_id] === choice}
                    onChange={(e) => handleAnswerChange(quiz.quiz_id, e.target.value)}
                    className="text-blue-500 focus:ring-blue-500"
                  />
                  <label htmlFor={`choice-${quiz.quiz_id}-${choiceIndex}`} className="text-gray-700 text-sm">
                    {choice}
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={quiz.quiz_type === 'short_answer' ? 2 : 4}
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
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
          <h3 className="font-semibold mb-4 text-gray-800 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            퀴즈 회차
          </h3>
          <div className="overflow-x-auto">
            <div className="flex space-x-2 pb-2 min-w-max">
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
                    <div className="absolute top-1 left-1 w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {testAttempts.length - index}
                    </div>
                  )}
                  
                  {/* 새 퀴즈 표시 */}
                  {attempt.attempt_id < 0 && (
                    <div className="absolute top-1 left-1">
                      <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium text-xs">
                        NEW
                      </span>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="font-semibold text-sm text-gray-800 line-clamp-2 pt-2">
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
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">{currentAttempt.test_title}</h3>
            <div className="flex items-center space-x-4">
              {/* 타이머 표시 */}
              {isTakingQuiz && (
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-lg font-mono text-red-600">
                    {formatTime(seconds)}
                  </span>
                </div>
              )}
              {isTakingQuiz && (
                <button
                  onClick={submitQuiz}
                  disabled={gradingAnswers}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {gradingAnswers ? '채점 중...' : '제출하기'}
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
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-800">
                  최종 점수: {currentAttempt.attempt_score}점
                </span>
                <span className="text-sm text-blue-600">
                  소요 시간: {formatTime(currentAttempt.attempt_duration_sec)}
                </span>
              </div>
              
              {attemptItems.map((item, index) => (
                <div key={item.attempt_item_id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="font-semibold mb-3 text-gray-800">
                    퀴즈 {index + 1}
                    <span className="ml-2 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                      {item.quiz_type === 'multiple_choice' ? '객관식' : 
                       item.quiz_type === 'short_answer' ? '단답형' : '서술형'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="text-gray-700 text-sm">
                      {item.quiz_question}
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">내 답변:</span>
                        <span className={`ml-2 ${item.attempt_is_correct ? 'text-green-600' : 'text-red-600'}`}>
                          {item.attempt_user_answer}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">정답:</span>
                        <span className="ml-2 text-green-600">{item.quiz_answer}</span>
                      </div>
                      {item.attempt_score !== undefined && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-600">점수:</span>
                          <span className="ml-2 text-blue-600">{item.attempt_score}점</span>
                        </div>
                      )}
                    </div>
                    {/* AI 피드백 표시 */}
                    {item.attempt_feedback && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-gray-700 border border-blue-200">
                        <strong className="text-blue-800">피드백:</strong> {item.attempt_feedback}
                      </div>
                    )}
                    {/* AI 해설 표시 */}
                    {item.attempt_explanation && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-gray-700 border border-yellow-200">
                        <strong className="text-yellow-800">상세 해설:</strong> {item.attempt_explanation}
                      </div>
                    )}
                    {/* 기존 해설 표시 (AI 해설이 없을 때) */}
                    {!item.attempt_explanation && item.quiz_explanation && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-gray-700 border border-yellow-200">
                        <strong className="text-yellow-800">해설:</strong> {item.quiz_explanation}
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