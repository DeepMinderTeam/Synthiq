import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import OpenAI from 'openai'

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})



export async function POST(request: NextRequest) {
  try {
    const { paperId } = await request.json()

    if (!paperId) {
      return NextResponse.json(
        { error: 'paperId가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('논문 정리노트 생성 시작:', paperId)

    // 1. Supabase에서 해당 논문의 모든 문단 가져오기
    const { data: contents, error: contentsError } = await supabase
      .from('paper_contents')
      .select('*')
      .eq('content_paper_id', parseInt(paperId))
      .order('content_index', { ascending: true })

    if (contentsError) {
      console.error('Supabase 문단 조회 오류:', contentsError)
      return NextResponse.json(
        { error: '문단을 가져올 수 없습니다.' },
        { status: 500 }
      )
    }

    if (!contents || contents.length === 0) {
      console.log('Supabase에 문단이 없습니다.')
      return NextResponse.json(
        { error: '정리할 문단이 없습니다.' },
        { status: 400 }
      )
    }

    console.log(`총 ${contents.length}개의 문단을 처리합니다.`)

    // 2. 기존 요약이 있는지 확인하고 삭제
    const { error: deleteSummaryError } = await supabase
      .from('paper_summaries')
      .delete()
      .eq('summary_content_id', contents[0].content_id)

    if (deleteSummaryError) {
      console.error('기존 요약 삭제 오류:', deleteSummaryError)
      return NextResponse.json(
        { error: '기존 요약을 삭제할 수 없습니다.' },
        { status: 500 }
      )
    }

    // 3. 전체 논문을 한번에 처리하여 구조화된 정리노트 생성
    console.log(`전체 ${contents.length}개 페이지를 한번에 처리하여 정리노트 생성`)
    
    const allContentText = contents.map((content: any, idx: number) => 
      `## 페이지 ${idx + 1} (${content.content_type || '내용'})\n${content.content_text}`
    ).join('\n\n')

    const summaryPrompt = `
다음은 논문의 전체 내용입니다. 페이지별로 구성되어 있으며, 논문의 전체적인 흐름과 구조를 파악하여 체계적인 정리노트를 작성해주세요.

# 📚 논문 전체 내용

${allContentText}

위 논문의 전체 내용을 바탕으로 다음 형식의 구조화된 정리노트를 작성해주세요:

# 📖 논문 정리노트

## 🎯 논문 개요
- **제목**: 논문의 제목과 핵심 주제
- **연구 목적**: 이 논문이 해결하려는 문제나 목표
- **주요 기여**: 이 연구의 핵심 기여사항

## 📋 논문 구조 분석
### 1️⃣ 서론 및 배경
- 연구의 배경과 동기
- 관련 연구 현황
- 연구의 필요성

### 2️⃣ 방법론
- 연구 방법과 접근법
- 사용된 기술이나 도구
- 실험 설계

### 3️⃣ 실험 및 결과
- 실험 과정과 설정
- 주요 결과와 발견사항
- 성능 평가

### 4️⃣ 결론 및 향후 연구
- 연구의 의의와 한계
- 향후 연구 방향
- 실제 적용 가능성

## 💡 핵심 개념 정리
- 논문에서 다루는 주요 개념들
- 중요한 용어와 정의
- 핵심 아이디어

## 🔬 기술적 세부사항
- 구현 방법과 알고리즘
- 시스템 아키텍처
- 성능 최적화 기법

## 📊 결과 분석
- 실험 결과의 의미
- 성능 지표 해석
- 비교 분석

## 🚀 실무 적용 가능성
- 실제 적용 사례
- 산업계 활용 방안
- 상용화 가능성

## 📚 참고 자료 및 연관 연구
- 관련 연구들
- 추가 학습 자료
- 확장 연구 주제

각 섹션은 논문의 흐름을 따라 자연스럽게 연결되도록 작성하고, 구체적인 예시와 함께 설명해주세요. 마크다운 형식을 적극 활용하여 가독성을 높여주세요.
`

    const summaryResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 학술 논문을 체계적으로 분석하고 정리하는 전문가입니다. 논문의 전체적인 흐름을 파악하여 구조화된 정리노트를 작성해주세요. 각 섹션이 논리적으로 연결되도록 하고, 핵심 내용을 명확하게 정리해주세요.'
        },
        {
          role: 'user',
          content: summaryPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    })

    const summaryResult = summaryResponse.choices[0]?.message?.content
    if (!summaryResult) {
      throw new Error('OpenAI 요약 응답을 받지 못했습니다.')
    }

    const summaries = [{
      summary_content_id: contents[0].content_id,
      summary_text: summaryResult,
      summary_type: 'AI_전체정리노트'
    }]

    console.log('전체 정리노트 생성 완료')

    // 4. 요약을 Supabase에 저장
    if (summaries.length > 0) {
      const { data: insertedSummaries, error: insertSummaryError } = await supabase
        .from('paper_summaries')
        .insert(summaries)
        .select()

      if (insertSummaryError) {
        console.error('요약 저장 오류:', insertSummaryError)
        return NextResponse.json(
          { error: '요약을 저장할 수 없습니다.' },
          { status: 500 }
        )
      }

      console.log(`${insertedSummaries?.length || 0}개의 요약이 성공적으로 저장되었습니다.`)

      return NextResponse.json({
        success: true,
        summaryCount: insertedSummaries?.length || 0,
        message: '정리노트가 성공적으로 생성되었습니다.'
      })
    } else {
      return NextResponse.json({
        success: false,
        summaryCount: 0,
        message: '생성된 요약이 없습니다.'
      })
    }

  } catch (error) {
    console.error('정리노트 생성 중 오류:', error)
    return NextResponse.json(
      { error: '정리노트 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 