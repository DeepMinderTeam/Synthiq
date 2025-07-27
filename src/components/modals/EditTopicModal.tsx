'use client'

import React, { useState, useEffect } from 'react'
import { Topic } from '@/models/topics'

interface EditTopicModalProps {
  topic: Topic
  onClose: () => void
  onSave: (updated: { topic_name: string; topic_description: string }) => void
}

export default function EditTopicModal({ topic, onClose, onSave }: EditTopicModalProps) {
  const [name, setName] = useState(topic.topic_name)
  const [desc, setDesc] = useState(topic.topic_description || '')

  useEffect(() => {
    setName(topic.topic_name)
    setDesc(topic.topic_description || '')
  }, [topic])

  const handleSave = () => {
    onSave({
      topic_name: name,
      topic_description: desc,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-4">토픽 수정</h2>
        <label className="text-sm font-semibold">토픽명</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded mb-3"
        />
        <label className="text-sm font-semibold">설명</label>
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
            취소
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded">
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
