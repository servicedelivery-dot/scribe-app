'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Award, Loader2, RotateCcw } from 'lucide-react'

interface Question { id: string; question: string; options: string[]; correctIndex: number; explanation?: string | null }
interface Props { questions: Question[]; courseId: string; lessonId: string | null; onComplete?: () => void }

interface Result {
  score: number; passed: boolean; correct: number; total: number
  breakdown: { question: string; yourAnswer: number; correctAnswer: number; correct: boolean; explanation?: string | null; options: string[] }[]
  certificate?: { certificateNumber: string; courseTitle: string } | null
}

export default function QuizPlayer({ questions, courseId, lessonId, onComplete }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null))
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const router = useRouter()

  if (!questions.length) return null

  async function submit() {
    if (answers.some(a => a === null)) return
    setSubmitting(true)
    const res = await fetch('/api/lms/quizzes/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, lessonId, answers }),
    })
    const data = await res.json()
    setResult(data)
    setSubmitting(false)
    if (data.passed && onComplete) onComplete()
  }

  function retry() { setAnswers(questions.map(() => null)); setResult(null); setShowBreakdown(false) }

  if (result) {
    return (
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className={`p-4 sm:p-5 ${result.passed ? 'bg-green-900/20 border-b border-green-800/30' : 'bg-red-900/20 border-b border-red-800/30'}`}>
          <div className="flex items-center gap-3 mb-2">
            {result.passed
              ? <CheckCircle className="w-6 h-6 text-green-400" />
              : <XCircle className="w-6 h-6 text-red-400" />}
            <h3 className={`font-bold text-lg ${result.passed ? 'text-green-300' : 'text-red-300'}`}>
              {result.passed ? 'Quiz Passed!' : 'Quiz Failed'}
            </h3>
          </div>
          <p className="text-gray-300 text-sm">{result.correct} / {result.total} correct — {result.score}%</p>
          {!result.passed && <p className="text-gray-500 text-xs mt-1">You need 70% to pass. Try again!</p>}
          {result.certificate && (
            <div className="mt-3 flex items-center gap-2 bg-yellow-900/30 border border-yellow-800/50 px-3 py-2 rounded-lg">
              <Award className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-300 text-sm">Certificate issued: <span className="font-mono">{result.certificate.certificateNumber}</span></span>
            </div>
          )}
        </div>
        <div className="p-4 flex gap-3">
          <button onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors">
            {showBreakdown ? 'Hide' : 'View'} breakdown
          </button>
          {!result.passed && (
            <button onClick={retry} className="flex-1 flex items-center justify-center gap-2 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm transition-colors">
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          )}
        </div>
        {showBreakdown && (
          <div className="border-t border-gray-800 p-4 space-y-4">
            {result.breakdown.map((b, i) => (
              <div key={i} className={`p-3 rounded-lg border ${b.correct ? 'border-green-800/40 bg-green-900/10' : 'border-red-800/40 bg-red-900/10'}`}>
                <p className="text-white text-sm font-medium mb-2">{i + 1}. {b.question}</p>
                <div className="space-y-1">
                  {b.options.map((opt, oi) => (
                    <div key={oi} className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 ${oi === b.correctAnswer ? 'bg-green-900/30 text-green-300' : oi === b.yourAnswer && !b.correct ? 'bg-red-900/30 text-red-300' : 'text-gray-500'}`}>
                      {oi === b.correctAnswer ? '✓' : oi === b.yourAnswer && !b.correct ? '✗' : '○'} {opt}
                    </div>
                  ))}
                </div>
                {b.explanation && <p className="text-gray-400 text-xs mt-2 italic">{b.explanation}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-white font-semibold">Quiz — {questions.length} questions</h3>
        <span className="text-xs text-gray-500">70% to pass</span>
      </div>
      <div className="p-4 sm:p-5 space-y-5">
        {questions.map((q, qi) => (
          <div key={q.id}>
            <p className="text-white text-sm font-medium mb-3">{qi + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <button key={oi} onClick={() => setAnswers(prev => prev.map((a, i) => i === qi ? oi : a))}
                  className={`w-full text-left px-4 py-2.5 min-h-[44px] rounded-xl text-sm transition-colors border ${answers[qi] === oi ? 'border-violet-500 bg-violet-600/20 text-violet-200' : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'}`}>
                  <span className="inline-flex w-5 h-5 rounded-full border border-current items-center justify-center text-xs mr-2 flex-shrink-0">
                    {String.fromCharCode(65 + oi)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button onClick={submit} disabled={submitting || answers.some(a => a === null)}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Quiz'}
        </button>
      </div>
    </div>
  )
}
