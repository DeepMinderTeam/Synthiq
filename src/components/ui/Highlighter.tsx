'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

interface Highlight {
  id: string | number
  text: string
  color: string
  startOffset: number
  endOffset: number
  pageId?: string
  contentId?: string
}

interface HighlighterProps {
  children: React.ReactNode
  contentId?: string
  pageId?: string
  onHighlightChange?: (highlights: Highlight[]) => void
  onDeleteHighlight?: (highlightId: string) => Promise<void>
  initialHighlights?: Highlight[]
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
  contentId,
  pageId,
  onHighlightChange,
  onDeleteHighlight,
  initialHighlights = [],
  className = ''
}: HighlighterProps) {
  const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0])
  const [highlightPosition, setHighlightPosition] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // initialHighlights가 변경될 때 highlights 상태 업데이트 및 DOM에 렌더링
  useEffect(() => {
    console.log('initialHighlights 변경됨:', initialHighlights)
    setHighlights(initialHighlights)
    
    // 기존 하이라이트를 DOM에 렌더링
    if (initialHighlights.length > 0 && containerRef.current) {
      // DOM이 완전히 렌더링된 후 하이라이트 적용
      const timer = setTimeout(() => {
        renderExistingHighlights(initialHighlights)
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [initialHighlights])

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

  // 기존 하이라이트를 DOM에 렌더링하는 함수
  const renderExistingHighlights = useCallback((highlightsToRender: Highlight[]) => {
    if (!containerRef.current) return

    const container = containerRef.current
    const textNodes = getTextNodes(container)
    
    highlightsToRender.forEach(highlight => {
      // 이미 렌더링된 하이라이트는 건너뛰기
      if (container.querySelector(`[data-highlight-id="${highlight.id}"]`)) {
        return
      }

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
          span.setAttribute('data-highlight-id', highlight.id)
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
  }, [])

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
      endOffset,
      pageId,
      contentId
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
  }, [pageId, contentId])

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

      {/* 하이라이트된 텍스트 */}
      <div className="highlight-container">
        {children}
      </div>

      {/* 하이라이트 목록 (개발용) */}
      {highlights.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
            <span>하이라이트 목록 ({highlights.length}개)</span>
            <button
              onClick={saveHighlights}
              className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
              title="하이라이트 저장"
            >
              💾 저장
            </button>
          </div>
          <div className="space-y-1 highlight-list">
            {highlights.map((highlight) => (
              <div key={highlight.id} className="flex items-center justify-between text-xs p-2 hover:bg-gray-100 rounded transition-colors">
                <span className="truncate flex-1">
                  <span className={`inline-block w-3 h-3 rounded mr-2 ${highlight.color}`}></span>
                  {highlight.text.substring(0, 50)}...
                </span>
                <button
                  onClick={() => {
                    if (confirm('이 하이라이트를 제거하시겠습니까?')) {
                      removeHighlight(highlight.id)
                    }
                  }}
                  className="text-red-500 hover:text-red-700 ml-2 p-1 rounded hover:bg-red-50 transition-colors"
                  title="하이라이트 제거"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 