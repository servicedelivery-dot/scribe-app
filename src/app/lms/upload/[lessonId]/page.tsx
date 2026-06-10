'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useUploadThing } from '@/lib/uploadthing-react'
import { Camera, Upload, CheckCircle, XCircle, Loader2, ImageIcon, Trash2 } from 'lucide-react'

interface Screenshot {
  id: string
  imageUrl: string
  context: string
  createdAt: string
}

export default function QRUploadPage() {
  const params = useParams()
  const lessonId = params.lessonId as string

  const [lessonTitle, setLessonTitle] = useState<string | null>(null)
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
    fetch(`/api/lms/lessons/${lessonId}/title`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.title && setLessonTitle(d.title))
      .catch(() => {})
  }, [lessonId])

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
      const postRes = await fetch(`/api/lms/lessons/${lessonId}/screenshots`, {
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
    <div className="min-h-screen bg-gray-950 text-white px-4 py-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-12 h-12 bg-[#003CA6] rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Camera className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">Upload Screenshot</h1>
        {lessonTitle && (
          <p className="text-sm text-gray-400 mt-1">for <span className="text-[#00A3E0]">{lessonTitle}</span></p>
        )}
      </div>

      {/* File picker */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-colors cursor-pointer mb-4 overflow-hidden
          ${preview ? 'border-[#003CA6]' : 'border-gray-700 hover:border-gray-500'}`}
        style={{ minHeight: 200 }}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="w-full object-cover rounded-xl" />
            <button
              onClick={e => { e.stopPropagation(); clearFile() }}
              className="absolute top-2 right-2 bg-gray-900/80 rounded-full p-1.5 hover:bg-red-900/80 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <ImageIcon className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">Tap to choose a photo</p>
            <p className="text-xs mt-1 text-gray-600">Camera or gallery</p>
          </div>
        )}
      </div>

      {/* Hidden input — capture=environment opens camera on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />

      {/* Context text */}
      <textarea
        value={context}
        onChange={e => setContext(e.target.value)}
        placeholder="Add context or notes about this screenshot (optional)..."
        rows={3}
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-[#003CA6] mb-4"
      />

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#003CA6] hover:bg-[#0048CC] disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition-colors mb-4"
      >
        {isUploading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
        ) : (
          <><Upload className="w-4 h-4" /> Upload Screenshot</>
        )}
      </button>

      {/* Status messages */}
      {status === 'success' && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/20 border border-green-800/40 rounded-xl px-4 py-3 mb-4">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Screenshot uploaded and synced to the lesson.
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3 mb-4">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg || 'Upload failed. Please try again.'}
        </div>
      )}

      {/* Recent uploads this session */}
      {recentUploads.length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Uploaded this session</p>
          <div className="space-y-3">
            {recentUploads.map(s => (
              <div key={s.id} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imageUrl} alt="Screenshot" className="w-full object-cover max-h-48" />
                {s.context && (
                  <p className="px-3 py-2 text-xs text-gray-400">{s.context}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
