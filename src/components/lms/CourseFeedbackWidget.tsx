'use client'

import { useState } from 'react'
import { Star, Send, Check } from 'lucide-react'

interface Props {
  courseId: string
  existingRating?: number | null
  existingComment?: string | null
}

export default function CourseFeedbackWidget({ courseId, existingRating, existingComment }: Props) {
  const [rating, setRating] = useState(existingRating ?? 0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState(existingComment ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!rating) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/lms/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, rating, comment: comment.trim() || null }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Could not save rating. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const display = hovered || rating
  const isUpdate = !!existingRating

  return (
    <div className="mt-8 rounded-2xl p-6" style={{ background: '#091525', border: '1px solid #1e3a6e' }}>
      <p className="text-sm font-semibold text-white mb-4">
        {isUpdate ? 'Update your rating' : '🌟 Rate this course'}
      </p>

      {/* Stars */}
      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className="w-8 h-8 transition-colors"
              style={{
                fill: i <= display ? '#f59e0b' : 'transparent',
                color: i <= display ? '#f59e0b' : '#334155',
              }}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm font-medium" style={{ color: '#94a3b8' }}>
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
          </span>
        )}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Leave a comment (optional)..."
        rows={3}
        className="w-full px-3 py-2 text-sm text-white rounded-xl resize-none focus:outline-none mb-3"
        style={{ background: '#0d1b2e', border: '1px solid #1e3a6e' }}
      />

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      <button
        onClick={submit}
        disabled={!rating || saving}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
        style={{ background: saved ? '#059669' : '#003CA6' }}
      >
        {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? 'Saving…' : <><Send className="w-4 h-4" /> {isUpdate ? 'Update Rating' : 'Submit Rating'}</>}
      </button>
    </div>
  )
}
