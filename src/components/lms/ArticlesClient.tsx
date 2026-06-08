'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Pin, Plus, Search, Clock, Tag, Trash2, Eye, EyeOff, Pencil, X, Loader2 } from 'lucide-react'

const CATEGORIES = ['All', 'Compliance', 'Operations', 'Health & Safety', 'Onboarding', 'Procedures', 'General']

interface Article {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  emoji: string
  authorName: string
  published: boolean
  pinned: boolean
  estimatedReadMins: number
  createdAt: Date | string
}

const card = { background: '#0a1628', border: '1px solid #152035' }

export default function ArticlesClient({ articles: initial, isAdmin }: { articles: Article[]; isAdmin: boolean }) {
  const router = useRouter()
  const [articles, setArticles] = useState(initial)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [showEditor, setShowEditor] = useState(false)
  const [editTarget, setEditTarget] = useState<Article | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', content: '', category: 'General', tags: '', emoji: '📄',
    published: false, pinned: false, estimatedReadMins: 3,
  })

  function openNew() {
    setEditTarget(null)
    setForm({ title: '', content: '', category: 'General', tags: '', emoji: '📄', published: false, pinned: false, estimatedReadMins: 3 })
    setShowEditor(true)
  }

  function openEdit(a: Article) {
    setEditTarget(a)
    setForm({
      title: a.title, content: a.content, category: a.category,
      tags: (a.tags || []).join(', '), emoji: a.emoji,
      published: a.published, pinned: a.pinned, estimatedReadMins: a.estimatedReadMins,
    })
    setShowEditor(true)
  }

  async function save() {
    setSaving(true)
    const payload = {
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      estimatedReadMins: Number(form.estimatedReadMins),
    }
    try {
      if (editTarget) {
        const res = await fetch(`/api/lms/articles/${editTarget.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        const updated = await res.json()
        setArticles(prev => prev.map(a => a.id === updated.id ? updated : a))
      } else {
        const res = await fetch('/api/lms/articles', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        const created = await res.json()
        setArticles(prev => [created, ...prev])
      }
      setShowEditor(false)
    } finally {
      setSaving(false)
    }
  }

  async function togglePublish(a: Article) {
    const res = await fetch(`/api/lms/articles/${a.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !a.published }),
    })
    const updated = await res.json()
    setArticles(prev => prev.map(x => x.id === updated.id ? updated : x))
  }

  async function deleteArticle(a: Article) {
    if (!confirm(`Delete "${a.title}"?`)) return
    await fetch(`/api/lms/articles/${a.id}`, { method: 'DELETE' })
    setArticles(prev => prev.filter(x => x.id !== a.id))
  }

  const filtered = articles.filter(a => {
    const matchCat = category === 'All' || a.category === category
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase()) ||
      (a.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  const pinned = filtered.filter(a => a.pinned)
  const rest = filtered.filter(a => !a.pinned)

  return (
    <div className="p-5 sm:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Knowledge Base</h1>
          <p className="text-sm mt-1" style={{ color: '#4e6680' }}>Guides, procedures, and learning articles</p>
        </div>
        {isAdmin && (
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: '#003CA6' }}>
            <Plus className="w-4 h-4" /> New Article
          </button>
        )}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#334155' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search articles…"
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: '#0a1628', border: '1px solid #152035', color: '#e2e8f0' }}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: category === c ? '#003CA6' : '#0a1628',
                color: category === c ? '#fff' : '#4e6680',
                border: `1px solid ${category === c ? '#003CA6' : '#152035'}`,
              }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20" style={{ color: '#334155' }}>
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: '#1e3a6e' }} />
          <p className="font-medium" style={{ color: '#64748b' }}>No articles found</p>
          {isAdmin && <p className="text-sm mt-1">Create your first article with the button above</p>}
        </div>
      )}

      {pinned.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: '#283d5e' }}>
            <Pin className="w-3 h-3" /> Pinned
          </p>
          <div className="space-y-3">
            {pinned.map(a => <ArticleCard key={a.id} article={a} isAdmin={isAdmin} onEdit={openEdit} onDelete={deleteArticle} onTogglePublish={togglePublish} />)}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="space-y-3">
          {rest.map(a => <ArticleCard key={a.id} article={a} isAdmin={isAdmin} onEdit={openEdit} onDelete={deleteArticle} onTogglePublish={togglePublish} />)}
        </div>
      )}

      {/* Editor modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-2xl rounded-2xl flex flex-col max-h-[90vh]" style={{ background: '#0a1628', border: '1px solid #1e3a6e' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#152035' }}>
              <h2 className="font-semibold" style={{ color: '#f1f5f9' }}>{editTarget ? 'Edit Article' : 'New Article'}</h2>
              <button onClick={() => setShowEditor(false)}><X className="w-5 h-5" style={{ color: '#4e6680' }} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex gap-3">
                <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                  className="w-16 text-center rounded-xl py-2 text-xl outline-none"
                  style={{ background: '#132035', border: '1px solid #1e3a6e', color: '#f1f5f9' }} />
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Article title…"
                  className="flex-1 px-4 py-2 rounded-xl text-sm outline-none"
                  style={{ background: '#132035', border: '1px solid #1e3a6e', color: '#f1f5f9' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: '#132035', border: '1px solid #1e3a6e', color: '#f1f5f9' }}>
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" min={1} max={60} value={form.estimatedReadMins}
                  onChange={e => setForm(f => ({ ...f, estimatedReadMins: Number(e.target.value) }))}
                  placeholder="Read mins"
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: '#132035', border: '1px solid #1e3a6e', color: '#f1f5f9' }} />
              </div>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="Tags (comma separated): safety, compliance, drivers…"
                className="w-full px-4 py-2 rounded-xl text-sm outline-none"
                style={{ background: '#132035', border: '1px solid #1e3a6e', color: '#f1f5f9' }} />
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Write your article in Markdown…"
                rows={12}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none font-mono"
                style={{ background: '#132035', border: '1px solid #1e3a6e', color: '#e2e8f0' }} />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} />
                  <span className="text-sm" style={{ color: '#94a3b8' }}>Published</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} />
                  <span className="text-sm" style={{ color: '#94a3b8' }}>Pinned</span>
                </label>
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-3" style={{ borderColor: '#152035' }}>
              <button onClick={() => setShowEditor(false)} className="px-4 py-2 rounded-xl text-sm" style={{ color: '#4e6680' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.title.trim() || !form.content.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#003CA6' }}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving…' : 'Save Article'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ArticleCard({ article, isAdmin, onEdit, onDelete, onTogglePublish }: {
  article: Article
  isAdmin: boolean
  onEdit: (a: Article) => void
  onDelete: (a: Article) => void
  onTogglePublish: (a: Article) => void
}) {
  return (
    <div className="rounded-xl p-4 flex items-start gap-4 transition-all hover:border-[#1e3a6e] group"
      style={{ background: '#0a1628', border: `1px solid ${!article.published && isAdmin ? 'rgba(251,191,36,0.2)' : '#152035'}` }}>
      <span className="text-3xl flex-shrink-0 leading-none mt-0.5">{article.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/lms/articles/${article.id}`}
            className="font-semibold text-sm leading-snug hover:underline"
            style={{ color: '#e2e8f0' }}>
            {article.pinned && <Pin className="inline w-3 h-3 mr-1.5 text-yellow-500" />}
            {article.title}
          </Link>
          {isAdmin && (
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onTogglePublish(article)} title={article.published ? 'Unpublish' : 'Publish'}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                {article.published
                  ? <Eye className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                  : <EyeOff className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />}
              </button>
              <button onClick={() => onEdit(article)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <Pencil className="w-3.5 h-3.5" style={{ color: '#4e6680' }} />
              </button>
              <button onClick={() => onDelete(article)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: '#132035', color: '#4e6680' }}>{article.category}</span>
          <span className="flex items-center gap-1 text-xs" style={{ color: '#334155' }}>
            <Clock className="w-3 h-3" /> {article.estimatedReadMins} min read
          </span>
          <span className="text-xs" style={{ color: '#283d5e' }}>{article.authorName}</span>
          {!article.published && isAdmin && (
            <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>Draft</span>
          )}
          {(article.tags || []).slice(0, 3).map(t => (
            <span key={t} className="flex items-center gap-1 text-xs" style={{ color: '#283d5e' }}>
              <Tag className="w-2.5 h-2.5" />{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
