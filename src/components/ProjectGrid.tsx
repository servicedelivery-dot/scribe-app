'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderOpen, Trash2, X, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/format'

interface Project {
  id: string
  title: string
  description: string | null
  updatedAt: Date
}

export default function ProjectGrid({ projects }: { projects: Project[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    setConfirmId(null)
    router.refresh()
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => (
          <div key={project.id} className="relative group">
            <Link
              href={`/dashboard/project/${project.id}`}
              className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-violet-500/50 transition-colors"
            >
              <div className="w-10 h-10 bg-violet-600/20 rounded-lg flex items-center justify-center mb-3">
                <FolderOpen className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors pr-8">
                {project.title}
              </h3>
              {project.description && (
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{project.description}</p>
              )}
              <p className="text-gray-600 text-xs mt-3">{formatDate(project.updatedAt)}</p>
            </Link>

            {/* Delete button — appears on hover */}
            <button
              onClick={(e) => { e.preventDefault(); setConfirmId(project.id) }}
              className="absolute top-3 right-3 w-7 h-7 bg-gray-800 hover:bg-red-600/80 text-gray-500 hover:text-white rounded-lg items-center justify-center hidden group-hover:flex transition-colors"
              title="Delete project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-white font-semibold mb-2">Delete project?</h3>
            <p className="text-gray-400 text-sm mb-5">
              This will permanently delete <span className="text-white font-medium">"{projects.find(p => p.id === confirmId)?.title}"</span> and all its screenshots, notes, and generated content.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmId)}
                disabled={!!deletingId}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
