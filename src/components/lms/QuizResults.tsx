'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Loader2, BarChart2 } from 'lucide-react'

interface QuestionBreakdown {
  question: string
  options: string[]
  correctIndex: number
  userAnswer: number
  correct: boolean
  explanation: string | null
}

interface Attempt {
  id: string
  userId: string
  name: string
  email: string
  lessonId: string | null
  isEndOfCourse: boolean
  score: number
  passed: boolean
  attemptedAt: string
  breakdown: QuestionBreakdown[]
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function QuizResults({ courseId }: { courseId: string }) {
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'end' | 'lesson'>('all')

  useEffect(() => {
    fetch(`/api/lms/quizzes/attempts?courseId=${courseId}`)
      .then(r => r.json())
      .then(data => { setAttempts(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [courseId])

  const filtered = attempts.filter(a =>
    filter === 'all' ? true : filter === 'end' ? a.isEndOfCourse : !a.isEndOfCourse
  )

  const passRate = attempts.length > 0
    ? Math.round((attempts.filter(a => a.passed).length / attempts.length) * 100)
    : 0
  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
    : 0

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading results...
    </div>
  )

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2 className="w-5 h-5 text-violet-400" />
        <h3 className="text-white font-semibold">Quiz Results</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{attempts.length} attempts</span>
      </div>

      {/* Summary */}
      {attempts.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total attempts', val: attempts.length },
            { label: 'Pass rate', val: `${passRate}%`, color: passRate >= 70 ? '#10b981' : '#f59e0b' },
            { label: 'Avg score', val: `${avgScore}%`, color: avgScore >= 70 ? '#10b981' : '#f59e0b' },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: '#091525', border: '1px solid #1e3a6e' }}>
              <div className="text-xl font-bold" style={{ color: color ?? '#fff' }}>{val}</div>
              <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1">
        {([['all', 'All'], ['end', '🎓 Final Assessment'], ['lesson', '📖 Lesson Quizzes']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{ background: filter === v ? '#7c3aed' : '#1e293b', color: filter === v ? '#fff' : '#64748b' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Attempts list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: '#334155' }}>
          No quiz attempts yet.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <div key={a.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e3a6e' }}>
              {/* Row header */}
              <button
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 text-sm text-left transition-colors hover:bg-gray-800/30"
                style={{ background: '#091525' }}
              >
                {/* Expand icon */}
                {expanded === a.id
                  ? <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-500" />
                  : <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-500" />}

                {/* User */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{a.name}</p>
                  <p className="text-xs truncate" style={{ color: '#475569' }}>
                    {a.isEndOfCourse ? '🎓 Final Assessment' : '📖 Lesson Quiz'} · {timeAgo(a.attemptedAt)}
                  </p>
                </div>

                {/* Score */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-bold" style={{ color: a.passed ? '#10b981' : '#ef4444' }}>{Math.round(a.score)}%</div>
                    <div className="text-xs" style={{ color: '#475569' }}>{a.breakdown.filter(b => b.correct).length}/{a.breakdown.length} correct</div>
                  </div>
                  <div className="px-2 py-1 rounded-full text-xs font-semibold"
                    style={a.passed
                      ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' }
                      : { background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    {a.passed ? 'PASS' : 'FAIL'}
                  </div>
                </div>
              </button>

              {/* Expanded: per-question breakdown */}
              {expanded === a.id && (
                <div className="px-4 pb-4 space-y-3" style={{ background: '#080f1e', borderTop: '1px solid #1e3a6e' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide pt-3" style={{ color: '#475569' }}>Answer Breakdown</p>
                  {a.breakdown.length === 0 ? (
                    <p className="text-xs" style={{ color: '#334155' }}>No question data available.</p>
                  ) : a.breakdown.map((b, i) => (
                    <div key={i} className="rounded-xl p-3 space-y-2" style={{ background: '#091525', border: `1px solid ${b.correct ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                      <div className="flex items-start gap-2">
                        {b.correct
                          ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                        <p className="text-white text-sm font-medium">{i + 1}. {b.question}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-6">
                        {b.options.map((opt, oi) => {
                          const isCorrect = oi === b.correctIndex
                          const isUser = oi === b.userAnswer
                          let bg = 'transparent'
                          let borderColor = '#1e3a6e'
                          let color = '#64748b'
                          if (isCorrect) { bg = 'rgba(16,185,129,0.1)'; borderColor = 'rgba(16,185,129,0.4)'; color = '#86efac' }
                          if (isUser && !isCorrect) { bg = 'rgba(239,68,68,0.1)'; borderColor = 'rgba(239,68,68,0.4)'; color = '#fca5a5' }
                          return (
                            <div key={oi} className="rounded-lg px-2 py-1.5 text-xs flex items-center gap-1.5"
                              style={{ background: bg, border: `1px solid ${borderColor}`, color }}>
                              {isCorrect && '✓ '}
                              {isUser && !isCorrect && '✗ '}
                              {opt}
                            </div>
                          )
                        })}
                      </div>
                      {b.explanation && (
                        <p className="text-xs ml-6" style={{ color: '#475569' }}>💡 {b.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
