'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useUploadThing } from '@/lib/uploadthing-react'
import { Camera, Upload, CheckCircle, XCircle, Loader2, ImageIcon, Trash2, Plus } from 'lucide-react'

interface Screenshot {
  id: string
  imageUrl: string
  context: string
  createdAt: string
}

export default function CourseQRUploadPage() {
  const params = useParams()
  const courseId = params.courseId as string

  const [courseTitle, setCourseTitle] = useState<string | null>(null)
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
    fetch(`/api/lms/courses/${courseId}/title`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.title && setCourseTitle(d.title))
      .catch(() => {})
  }, [courseId])

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

      const imageUrl = res[0].url
      const postRes = await fetch(`/api/lms/courses/${courseId}/screenshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, context }),
      })
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
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: '#003CA6' }}>
          <Camera className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Add Content</h1>
        {courseTitle ? (
          <>
            <p className="text-xs uppercase tracking-wider mt-1" style={{ color: '#475569' }}>Course</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: '#00A3E0' }}>{courseTitle}</p>
          </>
        ) : (
          <p className="text-sm mt-1 text-gray-600">Loading...</p>
        )}
        <p className="text-xs text-gray-600 mt-2">
          Photograph anything you want turned into a lesson — screens, notes, documents, whiteboards. AI will do the rest.
        </p>
      </div>

      {/* File picker */}
      <div
        onClick={() => !preview && fileInputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-colors mb-4 overflow-hidden
          ${preview ? 'border-[#003CA6] cursor-default' : 'border-gray-700 hover:border-gray-500 cursor-pointer'}`}
        style={{ minHeight: 200 }}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="w-full object-cover rounded-xl" />
            <button
              onClick={e => { e.stopPropagation(); clearFile() }}
              className="absolute top-2 right-2 rounded-full p-1.5"
              style={{ background: 'rgba(9,21,37,0.85)' }}
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-gray-500">
            <ImageIcon className="w-10 h-10 mb-3 opacity-60" />
            <p className="text-sm font-medium">Tap to take or pick a photo</p>
            <p className="text-xs mt-1 text-gray-600">Camera or gallery</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      {/* Context / notes */}
      <textarea
        value={context}
        onChange={e => setContext(e.target.value)}
        placeholder="Describe what this photo shows or what lesson it should become (optional)..."
        rows={3}
        className="w-full rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none mb-4"
        style={{ background: '#0d1f38', border: '1px solid #1e3a6e' }}
      />

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-sm transition-colors mb-3 disabled:opacity-40"
        style={{ background: '#003CA6' }}
      >
        {isUploading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
        ) : (
          <><Upload className="w-4 h-4" /> Add to Course</>
        )}
      </button>

      {status === 'success' && (
        <button
          onClick={() => { fileInputRef.current?.click(); setStatus('idle') }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors mb-3"
          style={{ background: '#0d1f38', border: '1px solid #1e3a6e', color: '#00A3E0' }}
        >
          <Plus className="w-4 h-4" /> Add another photo
        </button>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-2 text-green-400 text-sm rounded-xl px-4 py-3 mb-4" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Added to course — AI will use this to build lessons.
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-400 text-sm rounded-xl px-4 py-3 mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg || 'Upload failed. Please try again.'}
        </div>
      )}

      {recentUploads.length > 0 && (
        <div className="mt-6">
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
