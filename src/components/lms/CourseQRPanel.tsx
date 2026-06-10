'use client'

import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { RefreshCw, Trash2, Copy, Check, QrCode, Sparkles, Loader2, RotateCcw } from 'lucide-react'

interface Screenshot {
  id: string
  imageUrl: string
  context: string
  createdAt: string
}

interface Props {
  courseId: string
  courseTitle: string
  onLessonsGenerated?: () => void
}

export default function CourseQRPanel({ courseId, courseTitle, onLessonsGenerated }: Props) {
  const [uploadUrl, setUploadUrl] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  const fetchToken = useCallback(async () => {
    const res = await fetch(`/api/lms/courses/${courseId}/upload-token`)
    if (res.ok) {
      const data = await res.json()
      setToken(data.token)
      setUploadUrl(`${window.location.origin}/upload/course/${courseId}?t=${data.token}`)
    }
  }, [courseId])

  const fetchScreenshots = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/lms/courses/${courseId}/screenshots`)
      if (res.ok) setScreenshots(await res.json())
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    fetchToken()
    fetchScreenshots()
  }, [fetchToken, fetchScreenshots])

  async function regenerateToken() {
    setRegenerating(true)
    const res = await fetch(`/api/lms/courses/${courseId}/upload-token`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setToken(data.token)
      setUploadUrl(`${window.location.origin}/upload/course/${courseId}?t=${data.token}`)
    }
    setRegenerating(false)
  }

  async function deleteScreenshot(screenshotId: string) {
    await fetch(`/api/lms/courses/${courseId}/screenshots`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screenshotId }),
    })
    setScreenshots(prev => prev.filter(s => s.id !== screenshotId))
  }

  async function copyLink() {
    await navigator.clipboard.writeText(uploadUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function generateLessons() {
    if (screenshots.length === 0) return
    setGenerating(true)
    setGenMsg('')
    try {
      const res = await fetch(`/api/lms/courses/${courseId}/generate-from-screenshots`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setGenMsg(`Error: ${data.error}`)
      } else {
        setGenMsg(`✓ ${data.created} lesson${data.created !== 1 ? 's' : ''} created`)
        onLessonsGenerated?.()
      }
    } catch {
      setGenMsg('Error: generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* QR Section */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: '#0a1628', border: '1px solid #1e3a6e' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4" style={{ color: '#00A3E0' }} />
            <span className="text-white font-semibold text-sm">Scan to add content</span>
          </div>
          <button
            onClick={regenerateToken}
            disabled={regenerating}
            title="Regenerate link — invalidates the old QR"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
            style={{ color: '#475569', background: '#0d1f38' }}
          >
            <RotateCcw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
            New link
          </button>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
          Share with anyone who has course materials. They scan, photograph notes or screens, add context — AI builds the lessons.
          <br />
          <span style={{ color: '#334155' }}>Token-secured: only scans with the correct link are accepted.</span>
        </p>

        {/* QR code */}
        <div className="flex justify-center">
          {uploadUrl ? (
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG value={uploadUrl} size={180} bgColor="#ffffff" fgColor="#003CA6" level="M" includeMargin={false} />
            </div>
          ) : (
            <div className="w-[212px] h-[212px] rounded-2xl animate-pulse" style={{ background: '#0d1f38' }} />
          )}
        </div>

        {/* URL + copy */}
        <div className="flex items-center gap-2">
          <input readOnly value={uploadUrl}
            className="flex-1 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none truncate"
            style={{ background: '#060e1c', border: '1px solid #1e3a6e', color: '#64748b' }} />
          <button onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors flex-shrink-0"
            style={{ background: '#1e3a6e', color: '#93c5fd' }}>
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Generate from photos */}
      {screenshots.length > 0 && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d1f38', border: '1px solid #1e3a6e' }}>
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            <span className="text-white font-medium">{screenshots.length} photo{screenshots.length !== 1 ? 's' : ''}</span> ready — AI will generate lessons from these.
          </p>
          <button onClick={generateLessons} disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            style={{ background: '#003CA6' }}>
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating lessons...</>
              : <><Sparkles className="w-4 h-4" /> Generate Lessons from Photos</>}
          </button>
          {genMsg && (
            <p className="text-xs text-center" style={{ color: genMsg.startsWith('Error') ? '#f87171' : '#86efac' }}>{genMsg}</p>
          )}
        </div>
      )}

      {/* Screenshots list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
            {screenshots.length} photo{screenshots.length !== 1 ? 's' : ''}
          </span>
          <button onClick={fetchScreenshots} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {loading && screenshots.length === 0 ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: '#0d1f38' }} />)}</div>
        ) : screenshots.length === 0 ? (
          <div className="text-center py-10" style={{ color: '#334155' }}>
            <QrCode className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No photos yet</p>
            <p className="text-xs mt-1">Scan the QR above with a phone to start</p>
          </div>
        ) : (
          <div className="space-y-4">
            {screenshots.map(s => (
              <div key={s.id} className="rounded-xl overflow-hidden group" style={{ border: '1px solid #1e3a6e', background: '#0d1f38' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imageUrl} alt="" className="w-full object-cover max-h-64" />
                <div className="px-3 py-2.5 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {s.context ? <p className="text-sm text-gray-300">{s.context}</p> : <p className="text-xs italic" style={{ color: '#475569' }}>No context</p>}
                    <p className="text-xs mt-1" style={{ color: '#475569' }}>
                      {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button onClick={() => deleteScreenshot(s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-900/30 rounded-lg transition-all flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
