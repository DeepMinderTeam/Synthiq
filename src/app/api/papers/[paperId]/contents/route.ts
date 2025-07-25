import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { paperId: string } }
) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_PDF_API_URL || 'http://localhost:8000'
    console.log(`외부 API 호출: ${apiUrl}/papers/${params.paperId}/contents`)
    
    const response = await fetch(`${apiUrl}/papers/${params.paperId}/contents`)

    console.log(`외부 API 응답 상태: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      return NextResponse.json(
        { error: `논문 콘텐츠 조회 실패: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const result = await response.json()
    console.log(`외부 API 응답: contents_count = ${result.contents_count}`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('논문 콘텐츠 조회 오류:', error)
    return NextResponse.json(
      { error: '논문 콘텐츠 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { paperId: string } }
) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_PDF_API_URL || 'http://localhost:8000'
    const response = await fetch(`${apiUrl}/papers/${params.paperId}/contents`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `논문 콘텐츠 삭제 실패: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true, message: '논문 콘텐츠가 삭제되었습니다.' })
  } catch (error) {
    console.error('논문 콘텐츠 삭제 오류:', error)
    return NextResponse.json(
      { error: '논문 콘텐츠 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 