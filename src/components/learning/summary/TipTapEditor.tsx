'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import CodeBlock from '@tiptap/extension-code-block'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { useEffect, useRef } from 'react'

interface TipTapEditorProps {
  content: string
  onUpdate: (content: string) => void
  onBlur?: (content: string) => void
}

export default function TipTapEditor({ content, onUpdate, onBlur }: TipTapEditorProps) {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const isInitializedRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '여기에 정리노트를 작성하세요...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Highlight,
      CodeBlock,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      // 로컬에만 즉시 저장 (서버 저장은 blur 시에만)
      const html = editor.getHTML()
      onUpdate(html)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
    },
    immediatelyRender: false, // SSR 문제 해결
  })

  // 초기 로드 시에만 content 설정 (에디터가 생성된 직후 한 번만)
  useEffect(() => {
    if (editor && !isInitializedRef.current) {
      // 에디터가 비어있을 때만 초기 content 설정
      const currentContent = editor.getHTML()
      if ((currentContent === '<p></p>' || currentContent === '') && content !== '') {
        editor.commands.setContent(content)
      }
      isInitializedRef.current = true
    }
  }, [editor, content])

  // blur 이벤트 핸들러 추가
  useEffect(() => {
    if (editor && onBlur) {
      const handleBlur = () => {
        // 에디터에서 포커스를 잃을 때 서버에 저장
        const html = editor.getHTML()
        onBlur(html)
      }

      editor.on('blur', handleBlur)
      
      return () => {
        editor.off('blur', handleBlur)
      }
    }
  }, [editor, onBlur])

  const addLink = () => {
    const url = window.prompt('URL을 입력하세요:')
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run()
    }
  }

  const removeLink = () => {
    editor?.chain().focus().unsetLink().run()
  }

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">에디터 로딩 중...</div>
      </div>
    )
  }

  return (
    <>
      {/* 툴바 */}
      <div className="border-b border-gray-200 pb-2 mb-4">
        <div className="overflow-x-auto">
          <div className="flex gap-1 items-center justify-start min-w-max">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              title="굵게"
            >
              <strong className="text-sm">B</strong>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              title="기울임"
            >
              <em className="text-sm">I</em>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 ${editor.isActive('underline') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              title="밑줄"
            >
              <u className="text-sm">U</u>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 ${editor.isActive('highlight') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              title="하이라이트"
            >
              <span className="bg-yellow-200 px-1 text-xs">H</span>
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              title="제목 1"
            >
              <span className="text-xs font-semibold">H1</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              title="제목 2"
            >
              <span className="text-xs font-semibold">H2</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              title="제목 3"
            >
              <span className="text-xs font-semibold">H3</span>
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              title="글머리 기호 목록"
            >
              <span className="text-sm">•</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 ${editor.isActive('orderedList') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              title="번호 매기기 목록"
            >
              <span className="text-sm">1.</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 ${editor.isActive('taskList') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              title="할 일 목록"
            >
              <span className="text-sm">☐</span>
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 ${editor.isActive('codeBlock') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              title="코드 블록"
            >
              <span className="text-xs font-mono">{'</>'}</span>
            </button>
            <button
              onClick={addLink}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 ${editor.isActive('link') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              title="링크 추가"
            >
              <span className="text-sm">🔗</span>
            </button>
            {editor.isActive('link') && (
              <button
                onClick={removeLink}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-red-600"
                title="링크 제거"
              >
                <span className="text-sm">✕</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* TipTap 에디터 */}
      <div 
        className="prose prose-sm max-w-none text-gray-700 bg-white p-4 rounded border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all"
        style={{ minHeight: '297mm', maxHeight: '297mm', overflowY: 'auto' }}
      >
        <EditorContent 
          editor={editor} 
          className="min-h-full"
        />
      </div>
    </>
  )
} 