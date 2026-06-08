'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function CourseEnrollButton({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function enroll() {
    setLoading(true)
    await fetch(`/api/lms/courses/${courseId}/enroll`, { method: 'POST' })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={enroll}
      disabled={loading}
      className="px-6 py-2.5 bg-[#003CA6] hover:bg-[#0048CC] disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      Enroll Now
    </button>
  )
}
