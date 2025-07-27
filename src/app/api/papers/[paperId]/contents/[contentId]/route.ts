import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { paperId: string; contentId: string } }
) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_PDF_API_URL || 'http://localhost:8000'
    const response = await fetch(`${apiUrl}/papers/${params.paperId}/contents/${params.contentId}`)

    if (!response.ok) {
      return NextResponse.json(
        { error: `콘텐츠 조회 실패: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('콘텐츠 조회 오류:', error)
    return NextResponse.json(
      { error: '콘텐츠 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 