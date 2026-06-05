'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

const EMOJIS = ['📚', '🎓', '💡', '🚀', '⚡', '🌟', '🔧', '📊', '🎯', '🧠']

export default function NewCourseButton() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('📚')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/lms/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, emoji }),
    })
    const course = await res.json()
    if (course.id) {
      router.push(`/lms/manage/${course.id}`)
      router.refresh()
    }
    setLoading(false)
    setOpen(false)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors">
        <Plus className="w-4 h-4" /> New Course
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">New Course</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Emoji</label>
                <div className="flex gap-2 flex-wrap">
                  {EMOJIS.map(e => (
                    <button key={e} type="button" onClick={() => setEmoji(e)}
                      className={`text-2xl p-1.5 rounded-lg transition-colors ${emoji === e ? 'bg-violet-600' : 'hover:bg-gray-800'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <input type="text" placeholder="Course title" value={title} onChange={e => setTitle(e.target.value)} required autoFocus
                className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-violet-500 placeholder-gray-500" />
              <textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={2}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-violet-500 placeholder-gray-500 resize-none" />
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={loading || !title.trim()} className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
