'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

interface Highlight {
  id: string | number
  text: string
  color: string
  startOffset: number
  endOffset: number
  contentId?: string
}

interface HighlighterProps {
  children: React.ReactNode
  onHighlightChange?: (highlights: Highlight[]) => void
  onDeleteHighlight?: (highlightId: string) => Promise<void>
  onNavigateToPage?: (contentId: string) => void
  initialHighlights?: Highlight[]
  currentContentId?: string
  className?: string
}

const HIGHLIGHT_COLORS = [
  { name: '노란색', color: 'bg-yellow-200', textColor: 'text-yellow-800' },
  { name: '초록색', color: 'bg-green-200', textColor: 'text-green-800' },
  { name: '파란색', color: 'bg-blue-200', textColor: 'text-blue-800' },
  { name: '주황색', color: 'bg-orange-200', textColor: 'text-orange-800' },
  { name: '보라색', color: 'bg-purple-200', textColor: 'text-purple-800' },
  { name: '분홍색', color: 'bg-pink-200', textColor: 'text-pink-800' },
]

export default function Highlighter({
  children,
  onHighlightChange,
  onDeleteHighlight,
  onNavigateToPage,
  initialHighlights = [],
  currentContentId,
  className = ''
}: HighlighterProps) {
  const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0])
  const [highlightPosition, setHighlightPosition] = useState({ x: 0, y: 0 })
  const [showHighlightPanel, setShowHighlightPanel] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // initialHighlights나 currentContentId가 변경될 때 하이라이트 다시 렌더링
  useEffect(() => {
    console.log('initialHighlights 또는 currentContentId 변경됨:', { initialHighlights, currentContentId })
    setHighlights(initialHighlights)
    
    // 기존 하이라이트를 DOM에 렌더링 (현재 페이지의 하이라이트만)
    if (initialHighlights.length > 0 && containerRef.current) {
      // DOM이 완전히 렌더링된 후 하이라이트 적용
      const timer = setTimeout(() => {
        // 현재 페이지의 하이라이트만 렌더링 (contentId가 없거나 현재 페이지의 contentId와 일치하는 것)
        const currentPageHighlights = initialHighlights.filter(highlight => 
          !highlight.contentId || highlight.contentId === currentContentId
        )
        console.log('현재 페이지 하이라이트 렌더링:', currentPageHighlights)
        renderExistingHighlights(currentPageHighlights)
      }, 300) // 시간을 더 늘려서 DOM 렌더링 완료 대기
      
      return () => clearTimeout(timer)
    }
  }, [initialHighlights, currentContentId])

  // 텍스트 노드를 찾는 헬퍼 함수
  const getTextNodes = useCallback((node: Node): Text[] => {
    const textNodes: Text[] = []
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // 하이라이트 요소 내부의 텍스트는 제외
          if (node.parentElement?.classList.contains('highlight')) {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        }
      }
    )
    
    let currentNode
    while (currentNode = walker.nextNode()) {
      if (currentNode.nodeType === Node.TEXT_NODE && currentNode.textContent?.trim()) {
        textNodes.push(currentNode as Text)
      }
    }
    
    return textNodes
  }, [])

          // 기존 하이라이트를 DOM에서 제거하는 함수
  const clearExistingHighlights = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const existingHighlights = container.querySelectorAll('.highlight')
    
    existingHighlights.forEach(highlightElement => {
      const parent = highlightElement.parentNode
      if (parent) {
        const textNode = document.createTextNode(highlightElement.textContent || '')
        parent.replaceChild(textNode, highlightElement)
      }
    })
  }, [])

  // 기존 하이라이트를 DOM에 렌더링하는 함수
  const renderExistingHighlights = useCallback((highlightsToRender: Highlight[]) => {
    if (!containerRef.current) return

    // 먼저 기존 하이라이트를 모두 제거
    clearExistingHighlights()

    // 하이라이트 제거 후 잠시 대기 후 텍스트 노드 다시 찾기
    setTimeout(() => {
      const container = containerRef.current
      if (!container) return
      
      const textNodes = getTextNodes(container)
      
      highlightsToRender.forEach(highlight => {
        // 텍스트 노드에서 하이라이트 텍스트 찾기
        for (const textNode of textNodes) {
          const text = textNode.textContent || ''
          const index = text.indexOf(highlight.text)
          
          if (index !== -1) {
            // 텍스트를 분할하여 하이라이트 적용
            const beforeText = text.substring(0, index)
            const afterText = text.substring(index + highlight.text.length)
            
            const span = document.createElement('span')
            span.className = `highlight ${highlight.color} cursor-pointer`
            span.setAttribute('data-highlight-id', highlight.id.toString())
            span.textContent = highlight.text
            
            const parent = textNode.parentNode
            if (parent) {
              const fragment = document.createDocumentFragment()
              
              if (beforeText) {
                fragment.appendChild(document.createTextNode(beforeText))
              }
              fragment.appendChild(span)
              if (afterText) {
                fragment.appendChild(document.createTextNode(afterText))
              }
              
              parent.replaceChild(fragment, textNode)
              break
            }
          }
        }
      })
    }, 50)
  }, [clearExistingHighlights])

  // 하이라이트 변경 시 콜백 호출 (자동 저장 비활성화)
  // useEffect(() => {
  //   console.log('하이라이트 상태 변경:', highlights)
  //   onHighlightChange?.(highlights)
  // }, [highlights, onHighlightChange])

  // 하이라이트 저장 함수
  const saveHighlights = useCallback(() => {
    console.log('하이라이트 저장 요청:', highlights)
    onHighlightChange?.(highlights)
  }, [highlights, onHighlightChange])

  // 다른 곳 클릭 시 하이라이트 저장
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // 컬러 피커나 하이라이트 자체를 클릭한 경우는 제외
    if ((e.target as HTMLElement).closest('.highlight-color-picker') || 
        (e.target as HTMLElement).closest('.highlight')) {
      return
    }
    
    // 다른 곳을 클릭하면 하이라이트 저장
    if (highlights.length > 0) {
      saveHighlights()
    }
  }, [highlights, saveHighlights])

  // 텍스트 선택 이벤트 처리
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.toString().trim() === '') {
      setIsSelecting(false)
      setShowColorPicker(false)
      return
    }

    const text = selection.toString().trim()
    if (text.length > 0) {
      setSelectedText(text)
      setIsSelecting(true)
      
      // 선택된 텍스트의 위치 계산
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const containerRect = containerRef.current?.getBoundingClientRect()
      
      if (containerRect) {
        setHighlightPosition({
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top - 40
        })
      }
      
      setShowColorPicker(true)
    }
  }, [])

  // 하이라이트 추가
  const addHighlight = useCallback((text: string, color: string) => {
    const selection = window.getSelection()
    if (!selection) return

    const range = selection.getRangeAt(0)
    
    // 간단한 오프셋 계산 (실제 구현에서는 더 정확한 계산 필요)
    const startOffset = 0 // 임시로 0으로 설정
    const endOffset = text.length // 임시로 텍스트 길이로 설정

    const newHighlight: Highlight = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      color,
      startOffset,
      endOffset
    }

    // 선택된 텍스트를 하이라이트로 감싸기
    const span = document.createElement('span')
    span.className = `highlight ${color} cursor-pointer`
    span.setAttribute('data-highlight-id', newHighlight.id)
    span.textContent = text

    range.deleteContents()
    range.insertNode(span)

    console.log('새 하이라이트 추가:', newHighlight)
    setHighlights(prev => {
      const newHighlights = [...prev, newHighlight]
      console.log('업데이트된 하이라이트 목록:', newHighlights)
      return newHighlights
    })
    setShowColorPicker(false)
    setIsSelecting(false)
    setSelectedText('')
    
    // 선택 해제
    selection.removeAllRanges()
  }, [])

  // 하이라이트 제거
  const removeHighlight = useCallback(async (highlightId: string | number) => {
    try {
      // 데이터베이스에서 하이라이트 삭제
      if (onDeleteHighlight) {
        await onDeleteHighlight(highlightId)
      }

      // DOM에서 하이라이트 제거
      const highlightElement = containerRef.current?.querySelector(`[data-highlight-id="${highlightId.toString()}"]`)
      if (highlightElement && highlightElement.parentNode) {
        const textNode = document.createTextNode(highlightElement.textContent || '')
        highlightElement.parentNode.replaceChild(textNode, highlightElement)
      }

      // 상태에서 하이라이트 제거
      setHighlights(prev => {
        const newHighlights = prev.filter(h => h.id !== highlightId)
        console.log('하이라이트 제거됨:', highlightId, '남은 하이라이트:', newHighlights.length)
        return newHighlights
      })
    } catch (error) {
      console.error('하이라이트 삭제 오류:', error)
      alert('하이라이트 삭제에 실패했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'))
    }
  }, [onDeleteHighlight])

  // 하이라이트 클릭 이벤트
  const handleHighlightClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.classList.contains('highlight')) {
      const highlightId = target.getAttribute('data-highlight-id')
      if (highlightId) {
        // 하이라이트 제거 확인
        if (confirm('이 하이라이트를 제거하시겠습니까?')) {
          removeHighlight(highlightId)
        }
      }
    }
  }, [removeHighlight])

    return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onMouseUp={handleMouseUp}
      onClick={handleContainerClick}
    >
      {/* 하이라이트 컬러 피커 */}
      {showColorPicker && (
        <div 
          className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 highlight-color-picker"
          style={{
            left: `${highlightPosition.x}px`,
            top: `${highlightPosition.y}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="text-xs text-gray-600 mb-2 text-center">형관펜 색상 선택</div>
          <div className="grid grid-cols-3 gap-1">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.color}
                onClick={() => addHighlight(selectedText, color.color)}
                className={`w-8 h-8 rounded border-2 transition-all ${
                  color.color
                } ${
                  selectedColor.color === color.color ? 'border-gray-800' : 'border-gray-300'
                } hover:scale-110`}
                title={color.name}
              />
            ))}
          </div>
          <div className="mt-2 text-center">
            <button
              onClick={() => setShowColorPicker(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
          </div>
        </div>
      )}

            {/* 하이라이트 목록 버튼 */}
      {highlights.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowHighlightPanel(!showHighlightPanel)}
            className="inline-flex items-center px-3 py-2 text-sm bg-gradient-to-r from-blue-50 to-purple-50 text-gray-700 rounded-lg hover:from-blue-100 hover:to-purple-100 transition-all duration-200 shadow-sm border border-blue-200"
            title="하이라이트 목록 보기"
          >
            <span className="mr-2">📝</span>
            하이라이트 목록 ({highlights.length}개)
          </button>
        </div>
      )}

      {/* 하이라이트 사이드 패널 */}
      {showHighlightPanel && highlights.length > 0 && (
        <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <h3 className="text-lg font-semibold text-gray-800">하이라이트 목록</h3>
            <button
              onClick={() => setShowHighlightPanel(false)}
              className="text-gray-600 hover:text-gray-800 text-xl p-1 rounded hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
          
          <div className="p-4 h-full overflow-y-auto">
            <div className="space-y-2">
              {highlights.map((highlight) => (
                <div key={highlight.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-1">
                        <span className={`inline-block w-3 h-3 rounded mr-2 ${highlight.color}`}></span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {highlight.text.length > 80 ? highlight.text.substring(0, 80) + '...' : highlight.text}
                      </p>
                    </div>
                    <button
                                          onClick={() => {
                      if (confirm('이 하이라이트를 제거하시겠습니까?')) {
                        removeHighlight(highlight.id.toString())
                      }
                    }}
                      className="text-red-500 hover:text-red-700 ml-2 p-1 rounded hover:bg-red-50 transition-colors flex-shrink-0"
                      title="하이라이트 제거"
                    >
                      ✕
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      // 현재 페이지에 있는 하이라이트인지 확인
                      const highlightElement = containerRef.current?.querySelector(`[data-highlight-id="${highlight.id.toString()}"]`)
                      if (highlightElement) {
                        // 현재 페이지에 있으면 스크롤
                        highlightElement.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'center' 
                        })
                        // 하이라이트 요소에 잠깐 포커스 효과 추가
                        highlightElement.classList.add('ring-2', 'ring-yellow-400', 'ring-opacity-75')
                        setTimeout(() => {
                          highlightElement.classList.remove('ring-2', 'ring-yellow-400', 'ring-opacity-75')
                        }, 2000)
                      } else if (highlight.contentId && onNavigateToPage) {
                        // 다른 페이지에 있으면 해당 페이지로 이동
                        onNavigateToPage(highlight.contentId)
                      }
                    }}
                    className="mt-2 w-full px-2 py-1 text-xs bg-gradient-to-r from-blue-50 to-purple-50 text-gray-700 rounded hover:from-blue-100 hover:to-purple-100 transition-all duration-200 border border-blue-200"
                  >
                    📍 위치로 이동
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 하이라이트된 텍스트 */}
      <div className="highlight-container">
        {children}
      </div>
    </div>
  )
} 