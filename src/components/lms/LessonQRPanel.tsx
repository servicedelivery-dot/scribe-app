'use client'

import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { RefreshCw, Trash2, Copy, Check, QrCode } from 'lucide-react'

interface Screenshot {
  id: string
  imageUrl: string
  context: string
  createdAt: string
}

interface Props {
  lessonId: string
  lessonTitle: string
}

export default function LessonQRPanel({ lessonId, lessonTitle }: Props) {
  const [uploadUrl, setUploadUrl] = useState('')
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setUploadUrl(`${window.location.origin}/lms/upload/${lessonId}`)
  }, [lessonId])

  const fetchScreenshots = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/lms/lessons/${lessonId}/screenshots`)
      if (res.ok) setScreenshots(await res.json())
    } finally {
      setLoading(false)
    }
  }, [lessonId])

  useEffect(() => {
    fetchScreenshots()
  }, [fetchScreenshots])

  async function deleteScreenshot(screenshotId: string) {
    await fetch(`/api/lms/lessons/${lessonId}/screenshots`, {
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

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* QR Section */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: '#0a1628', border: '1px solid #1e3a6e' }}>
        <div className="flex items-center gap-2 mb-1">
          <QrCode className="w-4 h-4 text-[#00A3E0]" />
          <span className="text-white font-semibold text-sm">Scan to upload screenshots</span>
        </div>
        <p className="text-xs text-gray-500">
          Scan this QR with a phone to open a mobile page where anyone can photograph and upload screenshots directly into this lesson.
        </p>

        {/* QR code */}
        <div className="flex justify-center">
          {uploadUrl ? (
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG
                value={uploadUrl}
                size={180}
                bgColor="#ffffff"
                fgColor="#003CA6"
                level="M"
                includeMargin={false}
              />
            </div>
          ) : (
            <div className="w-[212px] h-[212px] bg-gray-900 rounded-2xl animate-pulse" />
          )}
        </div>

        {/* URL + copy */}
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={uploadUrl}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono focus:outline-none truncate"
          />
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors flex-shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Screenshots list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
            {screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={fetchScreenshots}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading && screenshots.length === 0 ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-32 bg-gray-900 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : screenshots.length === 0 ? (
          <div className="text-center py-10 text-gray-600">
            <QrCode className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No screenshots yet</p>
            <p className="text-xs mt-1">Scan the QR code with a phone to upload the first one</p>
          </div>
        ) : (
          <div className="space-y-4">
            {screenshots.map(s => (
              <div key={s.id} className="rounded-xl overflow-hidden border border-gray-800 bg-gray-900 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imageUrl} alt="Screenshot" className="w-full object-cover max-h-64" />
                <div className="px-3 py-2.5 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {s.context ? (
                      <p className="text-sm text-gray-300">{s.context}</p>
                    ) : (
                      <p className="text-xs text-gray-600 italic">No context added</p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteScreenshot(s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-900/30 rounded-lg transition-all flex-shrink-0"
                  >
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
