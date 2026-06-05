'use client'

import { useState } from 'react'
import { Megaphone, Pin, Plus, Trash2, X, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/format'

interface Announcement { id: string; title: string; body: string; pinned: boolean; createdAt: string }

export default function AnnouncementsPage({ initialAnnouncements }: { initialAnnouncements: Announcement[] }) {
  const [items, setItems] = useState(initialAnnouncements)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [saving, setSaving] = useState(false)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/lms/announcements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, pinned }),
    })
    const item = await res.json()
    setItems(prev => [{ ...item, createdAt: item.createdAt }, ...prev])
    setTitle(''); setBody(''); setPinned(false); setShowForm(false); setSaving(false)
  }

  async function remove(id: string) {
    await fetch('/api/lms/announcements', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setItems(prev => prev.filter(a => a.id !== id))
  }

  const pinned_items = items.filter(a => a.pinned)
  const regular = items.filter(a => !a.pinned)

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Megaphone className="w-6 h-6 text-violet-400" /> Announcements</h1>
          <p className="text-gray-400 mt-1">Post updates visible to all learners</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {pinned_items.length > 0 && (
        <div className="mb-6 space-y-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide flex items-center gap-1"><Pin className="w-3 h-3" /> Pinned</p>
          {pinned_items.map(a => <AnnouncementCard key={a.id} item={a} onDelete={remove} />)}
        </div>
      )}

      <div className="space-y-3">
        {regular.map(a => <AnnouncementCard key={a.id} item={a} onDelete={remove} />)}
      </div>

      {items.length === 0 && !showForm && (
        <div className="text-center py-20">
          <Megaphone className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No announcements yet</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold">New Announcement</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={create} className="space-y-4">
              <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Title"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-violet-500 placeholder-gray-500" />
              <textarea value={body} onChange={e => setBody(e.target.value)} required rows={4} placeholder="Message..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-violet-500 placeholder-gray-500 resize-none" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="w-4 h-4 accent-violet-500" />
                <span className="text-gray-300 text-sm">Pin this announcement</span>
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function AnnouncementCard({ item, onDelete }: { item: Announcement; onDelete: (id: string) => void }) {
  return (
    <div className={`bg-gray-900 border rounded-xl p-5 ${item.pinned ? 'border-violet-700/50' : 'border-gray-800'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {item.pinned && <Pin className="w-3 h-3 text-violet-400 fill-violet-400" />}
            <h3 className="text-white font-semibold">{item.title}</h3>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed mb-2">{item.body}</p>
          <p className="text-gray-600 text-xs">{formatDate(item.createdAt)}</p>
        </div>
        <button onClick={() => onDelete(item.id)} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
