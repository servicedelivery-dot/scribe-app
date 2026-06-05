'use client'

import { useState } from 'react'
import { Project, ContentItem, GeneratedContent, OutputFormat } from '@/lib/types'
import {
  Upload, StickyNote, Sparkles, Trash2, Image as ImageIcon,
  BookOpen, FileText, AlignLeft, Loader2
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import VideoOverview from './VideoOverview'
import PublishToLmsButton from './lms/PublishToLmsButton'
import ScribeImport from './ScribeImport'
import { formatDateTime } from '@/lib/format'

const FORMAT_LABELS: Record<OutputFormat, { label: string; icon: React.ReactNode; desc: string }> = {
  course: { label: 'Course', icon: <BookOpen className="w-4 h-4" />, desc: 'Structured modules + lessons' },
  guide: { label: 'Step-by-step guide', icon: <AlignLeft className="w-4 h-4" />, desc: 'Sequential instructions' },
  article: { label: 'KB Article', icon: <FileText className="w-4 h-4" />, desc: 'Knowledge base entry' },
}

interface Props {
  project: Project
  initialItems: ContentItem[]
  initialGenerated: GeneratedContent[]
}

export default function ProjectWorkspace({ project, initialItems, initialGenerated }: Props) {
  const [items, setItems] = useState<ContentItem[]>(initialItems)
  const [generated, setGenerated] = useState<GeneratedContent[]>(initialGenerated)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>('guide')
  const [activeGenerated, setActiveGenerated] = useState<GeneratedContent | null>(initialGenerated[0] || null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragActive(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length) uploadFiles(files)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length) uploadFiles(files)
  }

  async function uploadFiles(files: File[]) {
    setIsUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('projectId', project.id)
        const res = await fetch('/api/content/image', { method: 'POST', body: fd })
        const item = await res.json()
        if (item.id) setItems(prev => [...prev, item])
      }
    } finally {
      setIsUploading(false)
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return
    const res = await fetch('/api/content/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id, content: noteText, orderIndex: items.length }),
    })
    const item = await res.json()
    if (item.id) {
      setItems(prev => [...prev, item])
      setNoteText('')
      setAddingNote(false)
    }
  }

  async function handleDeleteItem(id: string) {
    await fetch('/api/content/note', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleGenerate() {
    if (!items.length) return
    setGenerating(true)
    setGenerateError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, format: selectedFormat }),
      })
      const data = await res.json()
      if (data.error) {
        setGenerateError(data.error)
      } else {
        setGenerated(prev => [data, ...prev])
        setActiveGenerated(data)
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col bg-gray-950">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold text-white truncate">{project.title}</h2>
          {project.description && (
            <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{project.description}</p>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragActive(true) }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleDrop}
          className={`m-4 border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
            isDragActive ? 'border-violet-500 bg-violet-500/10' : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <label className="cursor-pointer block">
            <input type="file" accept="image/*" multiple onChange={handleFileInput} className="hidden" />
            {isUploading ? (
              <div className="flex items-center justify-center gap-2 text-violet-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Uploading...</span>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                <p className="text-gray-500 text-xs">
                  {isDragActive ? 'Drop screenshots here' : 'Drop or click to upload screenshots'}
                </p>
              </>
            )}
          </label>
        </div>

        {/* Scribe import */}
        <div className="px-4 mb-2">
          <ScribeImport
            projectId={project.id}
            onImported={(newItems) => setItems(prev => [...prev, ...(newItems as ContentItem[])])}
            onGenerated={(gen) => {
              setGenerated(prev => [gen, ...prev])
              setActiveGenerated(gen)
            }}
          />
        </div>

        {/* Add note */}
        <div className="px-4 mb-3">
          {addingNote ? (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Write your note..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-violet-500 placeholder-gray-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setAddingNote(false); setNoteText('') }}
                  className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim()}
                  className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Add Note
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingNote(true)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
            >
              <StickyNote className="w-4 h-4" />
              Add Note
            </button>
          )}
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {items.length === 0 && (
            <p className="text-center text-gray-600 text-sm py-6">No content yet</p>
          )}
          {items.map((item, idx) => (
            <div key={item.id} className="group relative bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
              {item.type === 'image' ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.publicUrl!} alt={`Screenshot ${idx + 1}`} className="w-full h-28 object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">Screenshot {idx + 1}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 flex items-start gap-2">
                  <StickyNote className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-300 text-xs line-clamp-4">{item.content}</p>
                </div>
              )}
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="absolute top-2 right-2 w-6 h-6 bg-red-600 rounded-md items-center justify-center hidden group-hover:flex"
              >
                <Trash2 className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>

        {/* Generate */}
        <div className="p-4 border-t border-gray-800 space-y-3">
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(FORMAT_LABELS) as OutputFormat[]).map(fmt => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  selectedFormat === fmt ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {FORMAT_LABELS[fmt].icon}
                <span>{FORMAT_LABELS[fmt].label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
          {generateError && <p className="text-red-400 text-xs">{generateError}</p>}
          <button
            onClick={handleGenerate}
            disabled={generating || items.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate {FORMAT_LABELS[selectedFormat].label}</>
            )}
          </button>
          {items.length > 0 && (
            <VideoOverview projectId={project.id} projectTitle={project.title} />
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex">
        {generated.length > 0 && (
          <div className="w-56 flex-shrink-0 border-r border-gray-800 bg-gray-950 overflow-y-auto">
            <div className="p-3 border-b border-gray-800">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Generated</p>
            </div>
            <div className="p-2 space-y-1">
              {generated.map(gen => (
                <button
                  key={gen.id}
                  onClick={() => setActiveGenerated(gen)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeGenerated?.id === gen.id ? 'bg-violet-600/20 text-violet-300' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    {FORMAT_LABELS[gen.format as OutputFormat]?.icon}
                    <span className="text-xs text-gray-500">{gen.format}</span>
                  </div>
                  <p className="line-clamp-2 text-xs">{gen.title}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-8">
          {activeGenerated ? (
            <article className="max-w-3xl mx-auto prose prose-invert prose-headings:text-white prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-white prose-code:text-violet-300">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {FORMAT_LABELS[activeGenerated.format as OutputFormat]?.icon}
                  <span className="capitalize">{activeGenerated.format}</span>
                  <span>•</span>
                  <span>{formatDateTime(activeGenerated.createdAt)}</span>
                </div>
                {activeGenerated.format === 'course' && (
                  <PublishToLmsButton generatedId={activeGenerated.id} />
                )}
              </div>
              <ReactMarkdown>{activeGenerated.body}</ReactMarkdown>
            </article>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles className="w-12 h-12 text-gray-700 mb-4" />
              <p className="text-gray-500 text-lg font-medium">Ready to generate</p>
              <p className="text-gray-600 text-sm mt-1 max-w-xs">
                Add screenshots and notes on the left, pick a format, then hit Generate
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
