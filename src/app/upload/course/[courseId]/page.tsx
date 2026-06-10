'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useUploadThing } from '@/lib/uploadthing-react'
import { Camera, Upload, CheckCircle, XCircle, Loader2, ImageIcon, Trash2, Plus, ShieldAlert } from 'lucide-react'

interface Screenshot {
  id: string
  imageUrl: string
  context: string
  createdAt: string
}

export default function CourseQRUploadPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const courseId = params.courseId as string
  const token = searchParams.get('t')

  const [courseTitle, setCourseTitle] = useState<string | null>(null)
  const [courseEmoji, setCourseEmoji] = useState('📚')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [context, setContext] = useState('')
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [recentUploads, setRecentUploads] = useState<Screenshot[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { startUpload, isUploading } = useUploadThing('lessonScreenshotUploader', {
    onUploadError: (err) => {
      setStatus('error')
      setErrorMsg(err.message)
    },
  })

  useEffect(() => {
    if (!courseId) return
    fetch(`/api/lms/courses/${courseId}/title`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.title) { setCourseTitle(d.title); setCourseEmoji(d.emoji ?? '📚') } })
      .catch(() => {})
  }, [courseId])

  // No token = invalid link
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#080f1a' }}>
        <ShieldAlert className="w-12 h-12 mb-4" style={{ color: '#f87171' }} />
        <h1 className="text-xl font-bold text-white mb-2">Invalid link</h1>
        <p className="text-sm" style={{ color: '#64748b' }}>This QR code link is missing its security token. Please scan a fresh QR code from the course editor.</p>
      </div>
    )
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    setStatus('idle')
    setErrorMsg('')
  }

  function clearFile() {
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUpload() {
    if (!selectedFile) return
    setStatus('uploading')
    setErrorMsg('')

    try {
      const res = await startUpload([selectedFile])
      if (!res || !res[0]?.url) throw new Error('Upload failed')

      const postRes = await fetch(`/api/lms/courses/${courseId}/screenshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: res[0].url, context, token }),
      })

      if (postRes.status === 403) throw new Error('Invalid or expired QR link — please scan a new QR code.')
      if (!postRes.ok) throw new Error('Failed to save screenshot')

      const saved: Screenshot = await postRes.json()
      setRecentUploads(prev => [saved, ...prev])
      setStatus('success')
      clearFile()
      setContext('')
    } catch (err: unknown) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="min-h-screen text-white px-4 py-8 max-w-lg mx-auto" style={{ background: '#080f1a' }}>

      {/* Header */}
      <div className="mb-6 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl">
          {courseEmoji}
        </div>
        <h1 className="text-2xl font-bold text-white">Add Content</h1>
        {courseTitle ? (
          <p className="text-sm font-medium mt-1" style={{ color: '#00A3E0' }}>{courseTitle}</p>
        ) : (
          <p className="text-sm mt-1" style={{ color: '#334155' }}>Loading...</p>
        )}
        <p className="text-xs mt-2 leading-relaxed" style={{ color: '#475569' }}>
          Photograph notes, screens, or documents. Add context. AI turns them into lessons.
        </p>
      </div>

      {/* File picker */}
      <div
        onClick={() => !preview && fileInputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-colors mb-4 overflow-hidden
          ${preview ? 'border-[#003CA6] cursor-default' : 'cursor-pointer'}`}
        style={{ minHeight: 200, borderColor: preview ? '#003CA6' : '#1e3a6e' }}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="w-full object-cover rounded-xl" />
            <button onClick={e => { e.stopPropagation(); clearFile() }}
              className="absolute top-2 right-2 rounded-full p-1.5"
              style={{ background: 'rgba(9,21,37,0.85)' }}>
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-14" style={{ color: '#475569' }}>
            <ImageIcon className="w-10 h-10 mb-3 opacity-60" />
            <p className="text-sm font-medium">Tap to take or pick a photo</p>
            <p className="text-xs mt-1" style={{ color: '#334155' }}>Camera or gallery</p>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      {/* Context notes */}
      <textarea
        value={context}
        onChange={e => setContext(e.target.value)}
        placeholder="Describe what this shows or what lesson it should become..."
        rows={3}
        className="w-full rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none mb-4"
        style={{ background: '#0d1f38', border: '1px solid #1e3a6e' }}
      />

      <button onClick={handleUpload} disabled={!selectedFile || isUploading}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-sm transition-colors mb-3 disabled:opacity-40"
        style={{ background: '#003CA6' }}>
        {isUploading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
          : <><Upload className="w-4 h-4" /> Add to Course</>}
      </button>

      {status === 'success' && (
        <>
          <div className="flex items-center gap-2 text-green-400 text-sm rounded-xl px-4 py-3 mb-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Added — AI will use this to build lessons.
          </div>
          <button onClick={() => { fileInputRef.current?.click(); setStatus('idle') }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium mb-4 transition-colors"
            style={{ background: '#0d1f38', border: '1px solid #1e3a6e', color: '#00A3E0' }}>
            <Plus className="w-4 h-4" /> Add another photo
          </button>
        </>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-400 text-sm rounded-xl px-4 py-3 mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg || 'Upload failed. Please try again.'}
        </div>
      )}

      {recentUploads.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>
            Added this session ({recentUploads.length})
          </p>
          <div className="space-y-3">
            {recentUploads.map(s => (
              <div key={s.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e3a6e', background: '#0d1f38' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imageUrl} alt="" className="w-full object-cover max-h-48" />
                {s.context && <p className="px-3 py-2 text-xs text-gray-400">{s.context}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
