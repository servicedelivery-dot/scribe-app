'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, CheckCircle, Loader2, Sparkles } from 'lucide-react'

interface Question { id: string; question: string; options: string[]; correctIndex: number; explanation: string | null; orderIndex: number }

export default function QuizEditor({ courseId, lessonId }: { courseId: string; lessonId: string | null }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newQ, setNewQ] = useState('')
  const [newOpts, setNewOpts] = useState(['', '', '', ''])
  const [newCorrect, setNewCorrect] = useState(0)
  const [newExpl, setNewExpl] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiMsg, setAiMsg] = useState('')
  const [showAiDesc, setShowAiDesc] = useState(false)
  const [aiDescription, setAiDescription] = useState('')

  useEffect(() => {
    const url = lessonId
      ? `/api/lms/quizzes?courseId=${courseId}&lessonId=${lessonId}`
      : `/api/lms/quizzes?courseId=${courseId}`
    fetch(url).then(r => r.json()).then(setQuestions).finally(() => setLoading(false))
  }, [courseId, lessonId])

  async function addQuestion() {
    if (!newQ.trim() || newOpts.some(o => !o.trim())) return
    setSaving(true)
    const res = await fetch('/api/lms/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, lessonId, question: newQ, options: newOpts, correctIndex: newCorrect, explanation: newExpl, orderIndex: questions.length }),
    })
    const q = await res.json()
    setQuestions(prev => [...prev, q])
    setNewQ(''); setNewOpts(['', '', '', '']); setNewCorrect(0); setNewExpl(''); setShowForm(false)
    setSaving(false)
  }

  async function deleteQuestion(id: string) {
    await fetch('/api/lms/quizzes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  async function generateWithAI() {
    if (!lessonId) return // end-of-course uses the course-level auto-generate
    setAiGenerating(true); setAiMsg('')
    const res = await fetch('/api/lms/quizzes/generate-for-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, courseId, description: aiDescription }),
    })
    const data = await res.json()
    setAiGenerating(false)
    if (data.error) {
      setAiMsg(`Error: ${data.error}`)
    } else {
      setQuestions(data.questions)
      setAiMsg(`✓ ${data.generated} questions generated`)
      setShowAiDesc(false)
      setAiDescription('')
    }
  }

  if (loading) return <div className="py-6 text-center text-gray-500 text-sm">Loading...</div>

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-white font-medium text-sm">
          {lessonId ? 'Lesson Quiz' : 'End-of-Course Assessment'} — {questions.length} questions
        </h3>
        <div className="flex items-center gap-1.5">
          {lessonId && (
            <button
              onClick={() => setShowAiDesc(s => !s)}
              disabled={aiGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
              style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.4)' }}
            >
              {aiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              AI Generate
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Question
          </button>
        </div>
      </div>

      {/* AI Generate panel */}
      {lessonId && showAiDesc && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.3)' }}>
          <p className="text-xs font-semibold" style={{ color: '#a78bfa' }}>🤖 AI Quiz Generator</p>
          <p className="text-xs" style={{ color: '#64748b' }}>
            For Scribe / PDF / video lessons, add a brief description so AI knows what to test. For text lessons, it reads the content automatically.
          </p>
          <textarea
            value={aiDescription}
            onChange={e => setAiDescription(e.target.value)}
            rows={2}
            placeholder="e.g. This lesson covers the ABC doorstep acceptance process — bag inspection, DCS linking, conditional acceptance..."
            className="w-full bg-gray-900 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowAiDesc(false)} className="text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800">Cancel</button>
            <button onClick={generateWithAI} disabled={aiGenerating}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white disabled:opacity-50 transition-colors"
              style={{ background: '#7c3aed' }}>
              {aiGenerating ? <><Loader2 className="w-3 h-3 animate-spin" />Generating...</> : <><Sparkles className="w-3 h-3" />Generate 5 Questions</>}
            </button>
          </div>
          {aiMsg && <p className="text-xs" style={{ color: aiMsg.startsWith('Error') ? '#f87171' : '#86efac' }}>{aiMsg}</p>}
        </div>
      )}

      {showForm && (
        <div className="bg-gray-800 rounded-xl p-4 space-y-3 border border-gray-700">
          <textarea value={newQ} onChange={e => setNewQ(e.target.value)} rows={2} placeholder="Question..."
            className="w-full bg-gray-900 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none" />
          <div className="space-y-2">
            {newOpts.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button onClick={() => setNewCorrect(i)}
                  className={`w-6 h-6 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${newCorrect === i ? 'bg-green-500 border-green-500' : 'border-gray-600 hover:border-green-500'}`}>
                  {newCorrect === i && <CheckCircle className="w-4 h-4 text-white fill-white" />}
                </button>
                <input value={opt} onChange={e => setNewOpts(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  className="flex-1 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500" />
              </div>
            ))}
          </div>
          <input value={newExpl} onChange={e => setNewExpl(e.target.value)} placeholder="Explanation (optional)"
            className="w-full bg-gray-900 text-gray-400 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500" />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={addQuestion} disabled={saving || !newQ.trim() || newOpts.some(o => !o.trim())}
              className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
            </button>
          </div>
        </div>
      )}

      {questions.length === 0 && !showForm && (
        <p className="text-gray-600 text-sm text-center py-4">No questions yet. Add one to create a quiz.</p>
      )}

      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-start justify-between mb-2">
              <p className="text-white text-sm font-medium">{i + 1}. {q.question}</p>
              <button onClick={() => deleteQuestion(q.id)} className="text-gray-600 hover:text-red-400 transition-colors ml-2 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {q.options.map((opt, oi) => (
                <div key={oi} className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${oi === q.correctIndex ? 'text-green-400' : 'text-gray-500'}`}>
                  {oi === q.correctIndex ? '✓' : '○'} {opt}
                </div>
              ))}
            </div>
            {q.explanation && <p className="text-gray-500 text-xs mt-2 italic">{q.explanation}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
