'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, FileText, Globe, Code, File, BookOpen,
  Link, Check, X, Loader2, ChevronDown, AlertCircle, Download
} from 'lucide-react'

const ap = { bg: '#0d1b2e', border: '#1e3a6e', blue: '#003CA6', cyan: '#00A3E0', dark: '#080f1e' }

interface Course { id: string; title: string; emoji: string }
interface Module { id: string; title: string; courseId: string }

type ImportType = 'text' | 'markdown' | 'html' | 'pdf' | 'docx' | 'scribe' | 'embed' | 'url' | 'video'

const IMPORT_TYPES: { id: ImportType; label: string; icon: React.ReactNode; desc: string; accept?: string }[] = [
  { id: 'text',     label: 'Plain Text',     icon: <FileText className="w-5 h-5" />, desc: 'Paste plain text or notes' },
  { id: 'markdown', label: 'Markdown',       icon: <FileText className="w-5 h-5" />, desc: 'Paste markdown content' },
  { id: 'html',     label: 'HTML',           icon: <Code className="w-5 h-5" />,     desc: 'Paste or upload HTML content' },
  { id: 'pdf',      label: 'PDF',            icon: <File className="w-5 h-5" />,     desc: 'Upload a PDF file', accept: '.pdf' },
  { id: 'docx',     label: 'Word Doc',       icon: <File className="w-5 h-5" />,     desc: 'Upload .docx — text extracted automatically', accept: '.docx,.doc' },
  { id: 'video',    label: 'Video',          icon: <Globe className="w-5 h-5" />,    desc: 'Upload MP4/WebM or paste a video URL — watch progress tracked' },
  { id: 'scribe',   label: 'Scribe',         icon: <BookOpen className="w-5 h-5" />, desc: 'Paste Scribe embed iframes or URLs' },
  { id: 'embed',    label: 'Embed / iFrame', icon: <Globe className="w-5 h-5" />,   desc: 'Any iframe embed code' },
  { id: 'url',      label: 'URL / Link',     icon: <Link className="w-5 h-5" />,     desc: 'Link to external resource' },
]

export default function ImportLesson({ courses, allModules }: { courses: Course[]; allModules: Module[] }) {
  const router = useRouter()
  const [importType, setImportType] = useState<ImportType>('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [courseId, setCourseId] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  // Scribe fields
  const [slidesUrl, setSlidesUrl] = useState('')
  const [movieUrl, setMovieUrl] = useState('')
  const [scrollUrl, setScrollUrl] = useState('')
  const [generateQuiz, setGenerateQuiz] = useState(true)
  const [quizDescription, setQuizDescription] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const modules = allModules.filter(m => m.courseId === courseId)
  const currentType = IMPORT_TYPES.find(t => t.id === importType)!

  // Auto-detect scribe URLs from iframe HTML
  function autoDetectScribe(html: string) {
    const match = html.match(/src="(https:\/\/scribehow\.com\/embed\/[^"]+)"/)
    if (match) {
      const base = match[1].split('?')[0]
      setSlidesUrl(base)
      setMovieUrl(base + '?as=video')
      setScrollUrl(base + '?as=scrollable')
      const titleMatch = html.match(/scribehow\.com\/embed\/([^_]+)/)
      if (titleMatch && !title) setTitle(decodeURIComponent(titleMatch[1].replace(/_/g, ' ')))
    }
  }

  async function uploadFile(f: File): Promise<string> {
    setUploading(true)
    try {
      // Use UploadThing
      const formData = new FormData()
      formData.append('file', f)
      const res = await fetch('/api/uploadthing', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      return data?.url || data?.[0]?.url || ''
    } catch {
      // Fallback: use UTApi directly via a dedicated endpoint
      const res = await fetch('/api/lms/import/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: f.name, fileType: f.type }),
      })
      const { uploadUrl, fileUrl: url } = await res.json()
      if (uploadUrl) {
        await fetch(uploadUrl, { method: 'PUT', body: f, headers: { 'Content-Type': f.type } })
      }
      return url || ''
    } finally {
      setUploading(false)
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  function handleFileSelect(f: File) {
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
    // Auto-detect type from extension
    if (f.name.endsWith('.pdf')) setImportType('pdf')
    else if (f.name.endsWith('.docx') || f.name.endsWith('.doc')) setImportType('docx')
    else if (f.name.endsWith('.html') || f.name.endsWith('.htm')) setImportType('html')
    else if (f.name.endsWith('.md')) setImportType('markdown')
  }

  async function handleSave() {
    if (!title.trim() || !courseId || !moduleId) {
      setResult({ type: 'err', text: 'Fill in title, course and module' })
      return
    }

    setSaving(true)
    setResult(null)

    let uploadedUrl = fileUrl
    let fileContent = content

    // Upload file if present
    if (file && (importType === 'pdf' || importType === 'docx' || importType === 'video')) {
      uploadedUrl = await uploadFile(file)
    }

    // For HTML files — read content
    if (file && importType === 'html' && !content) {
      fileContent = await file.text()
    }
    if (file && (importType === 'text' || importType === 'markdown') && !content) {
      fileContent = await file.text()
    }

    const body: Record<string, unknown> = {
      type: importType,
      title: title.trim(),
      courseId,
      moduleId,
      content: fileContent,
      fileUrl: uploadedUrl,
      fileName: file?.name || '',
      generateQuiz,
      quizDescription,
    }

    if (importType === 'scribe') {
      body.slidesUrl = slidesUrl
      body.movieUrl = movieUrl
      body.scrollUrl = scrollUrl
    }

    const res = await fetch('/api/lms/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    setSaving(false)

    if (data.error) {
      setResult({ type: 'err', text: data.error })
    } else {
      const quizNote = data.quizGenerated > 0 ? ` + ${data.quizGenerated} quiz questions generated by AI.` : ''
      setResult({ type: 'ok', text: `✓ "${title}" imported as a lesson.${quizNote}` })
      setTitle(''); setContent(''); setFile(null); setFileUrl('')
      setSlidesUrl(''); setMovieUrl(''); setScrollUrl('')
      setQuizDescription('')
      router.refresh()
    }
  }

  const sel = (label: string, value: string, onChange: (v: string) => void, opts: {id:string, label:string}[], placeholder: string) => (
    <div>
      <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 pr-8 text-sm text-white rounded-lg focus:outline-none appearance-none"
          style={{ background: '#091525', border: `1px solid ${ap.border}` }}>
          <option value="">{placeholder}</option>
          {opts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#475569' }} />
      </div>
    </div>
  )

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Upload className="w-6 h-6" style={{ color: ap.cyan }} /> Import Content
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
          Import Scribe guides, PDFs, Word docs, HTML, text, embeds or links as lessons
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Type picker */}
        <div className="lg:col-span-1">
          <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: '#475569' }}>Content Type</p>
          <div className="flex overflow-x-auto gap-1 pb-2 lg:flex-col lg:overflow-visible lg:space-y-0">
            {IMPORT_TYPES.map(t => (
              <button key={t.id} onClick={() => setImportType(t.id)}
                className="flex-shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-all lg:w-full"
                style={{
                  background: importType === t.id ? 'rgba(0,60,166,0.25)' : 'transparent',
                  border: `1px solid ${importType === t.id ? ap.blue : 'transparent'}`,
                  color: importType === t.id ? '#fff' : '#64748b',
                }}>
                <span style={{ color: importType === t.id ? ap.cyan : '#475569' }}>{t.icon}</span>
                <div>
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs" style={{ color: '#475569' }}>{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>
              Lesson Title <span className="text-red-400">*</span>
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. ABC Injection Guide"
              className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none"
              style={{ background: '#091525', border: `1px solid ${ap.border}` }} />
          </div>

          {/* Course + Module pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sel('Course *', courseId, v => { setCourseId(v); setModuleId('') },
              courses.map(c => ({ id: c.id, label: `${c.emoji} ${c.title}` })),
              '— pick a course —')}
            {sel('Module *', moduleId, setModuleId,
              modules.map(m => ({ id: m.id, label: m.title })),
              courseId ? (modules.length ? '— pick a module —' : 'No modules yet') : '— pick course first —')}
          </div>

          {/* Content area — varies by type */}
          {(importType === 'text' || importType === 'markdown') && (
            <div>
              <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>
                {importType === 'markdown' ? 'Markdown Content' : 'Text Content'}
              </label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={10}
                placeholder={importType === 'markdown' ? '## Heading\n\nYour **markdown** content here...' : 'Paste your text content here...'}
                className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none resize-y font-mono"
                style={{ background: '#091525', border: `1px solid ${ap.border}` }} />
              <div className="mt-2">
                <button onClick={() => fileRef.current?.click()}
                  className="text-xs flex items-center gap-1.5 transition-colors hover:opacity-80"
                  style={{ color: ap.cyan }}>
                  <Upload className="w-3.5 h-3.5" /> Or upload a .txt / .md file
                </button>
                <input ref={fileRef} type="file" accept=".txt,.md" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
                {file && <span className="text-xs ml-2" style={{ color: '#64748b' }}>{file.name}</span>}
              </div>
            </div>
          )}

          {importType === 'html' && (
            <div>
              <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>HTML Content</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={10}
                placeholder="<h1>Title</h1><p>Your HTML content...</p>"
                className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none resize-y font-mono"
                style={{ background: '#091525', border: `1px solid ${ap.border}` }} />
              <button onClick={() => fileRef.current?.click()}
                className="text-xs flex items-center gap-1.5 mt-2 transition-colors hover:opacity-80"
                style={{ color: ap.cyan }}>
                <Upload className="w-3.5 h-3.5" /> Or upload an .html file
              </button>
              <input ref={fileRef} type="file" accept=".html,.htm" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { handleFileSelect(f); f.text().then(setContent) } }} />
            </div>
          )}

          {(importType === 'pdf' || importType === 'docx') && (
            <div>
              <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>
                Upload {importType === 'pdf' ? 'PDF' : 'Word Document (.docx)'}
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="rounded-xl p-8 text-center cursor-pointer transition-all"
                style={{ border: `2px dashed ${file ? ap.blue : ap.border}`, background: file ? 'rgba(0,60,166,0.1)' : '#091525' }}>
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <File className="w-8 h-8" style={{ color: ap.cyan }} />
                    <p className="text-white text-sm font-medium">{file.name}</p>
                    <p className="text-xs" style={{ color: '#475569' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    <button onClick={e => { e.stopPropagation(); setFile(null) }}
                      className="text-xs px-2 py-1 rounded" style={{ color: '#ef4444' }}>Remove</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8" style={{ color: '#334155' }} />
                    <p className="text-sm" style={{ color: '#94a3b8' }}>Drop file here or click to browse</p>
                    <p className="text-xs" style={{ color: '#475569' }}>
                      {importType === 'pdf' ? 'PDF up to 32MB' : 'DOCX up to 16MB — text will be extracted automatically'}
                    </p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept={currentType.accept} className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
              </div>
              {importType === 'docx' && (
                <p className="text-xs mt-2" style={{ color: '#475569' }}>
                  Text and formatting will be extracted from the Word document and stored as markdown.
                </p>
              )}
            </div>
          )}

          {importType === 'video' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>Video URL</label>
                <input value={content} onChange={e => setContent(e.target.value)} type="url"
                  placeholder="https://example.com/video.mp4  or  https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none"
                  style={{ background: '#091525', border: `1px solid ${ap.border}` }} />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: ap.border }} />
                <span className="text-xs" style={{ color: '#475569' }}>or upload a file</span>
                <div className="flex-1 h-px" style={{ background: ap.border }} />
              </div>
              <div
                onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="rounded-xl p-6 text-center cursor-pointer transition-all"
                style={{ border: `2px dashed ${file ? ap.blue : ap.border}`, background: file ? 'rgba(0,60,166,0.1)' : '#091525' }}>
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">🎬</span>
                    <p className="text-white text-sm font-medium">{file.name}</p>
                    <p className="text-xs" style={{ color: '#475569' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    <button onClick={e => { e.stopPropagation(); setFile(null) }} className="text-xs px-2 py-1 rounded" style={{ color: '#ef4444' }}>Remove</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">🎬</span>
                    <p className="text-sm" style={{ color: '#94a3b8' }}>Drop MP4 / WebM here or click to browse</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="video/mp4,video/webm,.mp4,.webm" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
              </div>
              <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(0,163,224,0.07)', border: `1px solid rgba(0,163,224,0.2)`, color: '#64748b' }}>
                <span style={{ color: ap.cyan }}>Watch tracking:</span> The player auto-saves each user's position every 5 seconds — admins can see who watched, how far they got, and who finished.
              </div>
            </div>
          )}

          {importType === 'scribe' && (
            <div className="space-y-4">
              <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(0,163,224,0.07)', border: `1px solid rgba(0,163,224,0.2)`, color: '#64748b' }}>
                <span style={{ color: ap.cyan }}>Tip:</span> Paste any Scribe iframe into the Slides field and the Movie + Scroll URLs will auto-fill.
              </div>
              {[
                { label: 'Slides iframe / URL', val: slidesUrl, set: (v: string) => { setSlidesUrl(v); if (v.includes('scribehow')) autoDetectScribe(v) } },
                { label: 'Movie iframe / URL', val: movieUrl, set: setMovieUrl },
                { label: 'Scroll iframe / URL', val: scrollUrl, set: setScrollUrl },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>{label}</label>
                  <textarea value={val} onChange={e => set(e.target.value)} rows={3}
                    placeholder='<iframe src="https://scribehow.com/embed/..." ...></iframe>'
                    className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none resize-none font-mono"
                    style={{ background: '#091525', border: `1px solid ${ap.border}` }} />
                </div>
              ))}
            </div>
          )}

          {importType === 'embed' && (
            <div>
              <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>Embed / iframe Code</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={6}
                placeholder='<iframe src="https://..." width="100%" height="600" allow="fullscreen"></iframe>'
                className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none resize-none font-mono"
                style={{ background: '#091525', border: `1px solid ${ap.border}` }} />
            </div>
          )}

          {importType === 'url' && (
            <div>
              <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>URL</label>
              <input value={content} onChange={e => setContent(e.target.value)} type="url"
                placeholder="https://example.com/guide"
                className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none"
                style={{ background: '#091525', border: `1px solid ${ap.border}` }} />
            </div>
          )}

          {/* AI Quiz Generation */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: '#091525', border: `1px solid ${ap.border}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  🤖 Auto-generate quiz
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                  AI reads the lesson content and creates 5 multiple-choice questions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGenerateQuiz(g => !g)}
                className="relative flex-shrink-0 w-10 h-6 rounded-full transition-colors"
                style={{ background: generateQuiz ? ap.blue : '#1e293b' }}
              >
                <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: generateQuiz ? '1.375rem' : '0.25rem' }} />
              </button>
            </div>

            {generateQuiz && (
              <div>
                <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>
                  Brief description <span style={{ color: '#334155' }}>(optional — helps AI for Scribe / PDF / video)</span>
                </label>
                <textarea
                  value={quizDescription}
                  onChange={e => setQuizDescription(e.target.value)}
                  rows={3}
                  placeholder={
                    importType === 'scribe'
                      ? 'e.g. This guide covers the step-by-step ABC doorstep acceptance process including bag checks, DCS linking and signature capture...'
                      : importType === 'pdf' || importType === 'video'
                        ? 'e.g. What this content covers, key topics learners should be tested on...'
                        : 'Optional extra context for the AI...'
                  }
                  className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none resize-none"
                  style={{ background: '#0d1b2e', border: `1px solid ${ap.border}` }}
                />
                <p className="text-xs mt-1" style={{ color: '#334155' }}>
                  For text/markdown lessons the AI reads the content directly. For Scribe/PDF/video it uses the title + your description.
                </p>
              </div>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className="rounded-xl p-3 text-sm flex items-start gap-2"
              style={{
                background: result.type === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${result.type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: result.type === 'ok' ? '#86efac' : '#fca5a5',
              }}>
              {result.type === 'ok' ? <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              {result.text}
              {result.type === 'ok' && courseId && (
                <a href={`/lms/manage/${courseId}`}
                  className="ml-2 underline text-xs" style={{ color: ap.cyan }}>
                  Open course →
                </a>
              )}
            </div>
          )}

          {/* Save button */}
          <button onClick={handleSave} disabled={saving || uploading || !title || !courseId || !moduleId}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
            style={{ background: ap.blue }}>
            {(saving || uploading)
              ? <><Loader2 className="w-4 h-4 animate-spin" />{uploading ? 'Uploading file...' : generateQuiz ? 'Importing + generating quiz...' : 'Saving lesson...'}</>
              : <><Check className="w-4 h-4" />{generateQuiz ? 'Import + Generate Quiz' : 'Import as Lesson'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
