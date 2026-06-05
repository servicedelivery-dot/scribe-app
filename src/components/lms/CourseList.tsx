'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Users, Eye, Settings, Trash2, Loader2 } from 'lucide-react'

interface Course {
  id: string
  title: string
  emoji: string
  published: boolean
  lessonCount: number
  enrollCount: number
}

export default function CourseList({ courses }: { courses: Course[] }) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/lms/courses/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    setConfirmId(null)
    router.refresh()
  }

  return (
    <>
      <div className="space-y-3">
        {courses.map(course => (
          <div key={course.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-5">
            <div className="text-3xl">{course.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white truncate">{course.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${course.published ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                  {course.published ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{course.lessonCount} lessons</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{course.enrollCount} enrolled</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link href={`/lms/course/${course.id}`} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Preview">
                <Eye className="w-4 h-4" />
              </Link>
              <Link href={`/lms/manage/${course.id}`} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Edit">
                <Settings className="w-4 h-4" />
              </Link>
              <button onClick={() => setConfirmId(course.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {confirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-white font-semibold mb-2">Delete course?</h3>
            <p className="text-gray-400 text-sm mb-5">
              This will permanently delete <span className="text-white font-medium">"{courses.find(c => c.id === confirmId)?.title}"</span> along with all its modules, lessons, and enrollment data.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmId!)} disabled={!!deletingId}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
