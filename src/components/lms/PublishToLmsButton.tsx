'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Loader2 } from 'lucide-react'

export default function PublishToLmsButton({ generatedId }: { generatedId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [courseId, setCourseId] = useState<string | null>(null)
  const router = useRouter()

  async function publish() {
    setLoading(true)
    const res = await fetch('/api/lms/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generatedId, emoji: '📚' }),
    })
    const data = await res.json()
    if (data.courseId) {
      setCourseId(data.courseId)
      setDone(true)
    }
    setLoading(false)
  }

  if (done && courseId) {
    return (
      <a href={`/lms/manage/${courseId}`} className="flex items-center justify-center gap-2 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm transition-colors">
        <GraduationCap className="w-4 h-4" /> View in LMS →
      </a>
    )
  }

  return (
    <button
      onClick={publish}
      disabled={loading}
      className="flex items-center justify-center gap-2 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-violet-500/50 text-gray-300 hover:text-violet-300 rounded-lg text-sm transition-colors"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
      Publish to LMS
    </button>
  )
}
