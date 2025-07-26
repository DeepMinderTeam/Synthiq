// 논문 퀴즈 단계를 표시하는 컴포넌트
// Supabase에서 실제 논문 퀴즈 정보를 가져와서 표시
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { PaperQuiz } from '@/models/paper_quizzes'

interface QuizStepProps {
  paperId: string
}

export default function QuizStep({ paperId }: QuizStepProps) {
  const [quizzes, setQuizzes] = useState<PaperQuiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true)
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
          setError(error.message)
        } else {
          setQuizzes(data || [])
        }
      } catch (err) {
        setError('퀴즈 정보를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (paperId) {
      fetchQuizzes()
    }
  }, [paperId])

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
        <h2 className="text-xl font-bold">논문 퀴즈</h2>
        <div className="text-red-500">오류: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">논문 퀴즈</h2>
      <div className="space-y-4">
        {quizzes.length > 0 ? (
          quizzes.map((quiz, index) => (
            <div key={quiz.quiz_id} className="p-4 bg-blue-50 rounded">
              <div className="font-semibold mb-2">퀴즈 {index + 1}</div>
              <div className="space-y-3">
                <div className="text-gray-800">
                  {quiz.quiz_question}
                </div>
                {quiz.quiz_choices && (
                  <div className="space-y-2">
                    {Array.isArray(quiz.quiz_choices) ? (
                      quiz.quiz_choices.map((choice, choiceIndex) => (
                        <div key={choiceIndex} className="flex items-center space-x-2">
                          <input type="radio" name={`quiz-${quiz.quiz_id}`} id={`choice-${quiz.quiz_id}-${choiceIndex}`} />
                          <label htmlFor={`choice-${quiz.quiz_id}-${choiceIndex}`} className="text-gray-700">
                            {choice}
                          </label>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500">선택지 형식 오류</div>
                    )}
                  </div>
                )}
                {quiz.quiz_explanation && (
                  <div className="mt-3 p-2 bg-yellow-50 rounded text-sm text-gray-700">
                    <strong>해설:</strong> {quiz.quiz_explanation}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-gray-500">퀴즈가 없습니다.</div>
        )}
      </div>
    </div>
  )
} 