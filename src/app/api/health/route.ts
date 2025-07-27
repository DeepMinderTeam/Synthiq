import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_PDF_API_URL || 'http://localhost:8000'
    const response = await fetch(`${apiUrl}/health`)

    if (response.ok) {
      return NextResponse.json({ status: 'healthy', message: 'PDF API 서버가 정상 작동 중입니다.' })
    } else {
      return NextResponse.json(
        { status: 'unhealthy', message: 'PDF API 서버에 연결할 수 없습니다.' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('API 상태 확인 오류:', error)
    return NextResponse.json(
      { status: 'error', message: 'PDF API 서버 상태를 확인할 수 없습니다.' },
      { status: 503 }
    )
  }
} 