'use client'

import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { ChevronLeft, Clock, Tag, Calendar, Pin } from 'lucide-react'

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
  updatedAt: Date | string
}

export default function ArticleViewer({ article, isAdmin }: { article: Article; isAdmin: boolean }) {
  return (
    <div className="p-5 sm:p-8 max-w-3xl">
      <Link href="/lms/articles"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors hover:opacity-80"
        style={{ color: '#4e6680' }}>
        <ChevronLeft className="w-4 h-4" /> Back to Knowledge Base
      </Link>

      {!article.published && isAdmin && (
        <div className="mb-4 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
          Draft — only admins can see this article
        </div>
      )}

      <div className="rounded-2xl p-6 sm:p-8" style={{ background: '#0a1628', border: '1px solid #152035' }}>
        <div className="mb-6">
          <span className="text-5xl block mb-4">{article.emoji}</span>
          <h1 className="text-2xl font-bold mb-3" style={{ color: '#f1f5f9' }}>
            {article.pinned && <Pin className="inline w-4 h-4 mr-2 text-yellow-500" />}
            {article.title}
          </h1>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-md font-medium" style={{ background: '#132035', color: '#4e6680' }}>
              {article.category}
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#334155' }}>
              <Clock className="w-3 h-3" /> {article.estimatedReadMins} min read
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#334155' }}>
              <Calendar className="w-3 h-3" /> {new Date(article.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-xs" style={{ color: '#283d5e' }}>by {article.authorName}</span>
          </div>
          {(article.tags || []).length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {article.tags.map(t => (
                <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{ background: '#132035', color: '#4e6680' }}>
                  <Tag className="w-2.5 h-2.5" />{t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div
          className="prose prose-sm max-w-none"
          style={{
            '--tw-prose-body': '#94a3b8',
            '--tw-prose-headings': '#e2e8f0',
            '--tw-prose-bold': '#f1f5f9',
            '--tw-prose-links': '#00A3E0',
            '--tw-prose-code': '#7dd3fc',
            '--tw-prose-pre-bg': '#132035',
            '--tw-prose-th-borders': '#1e3a6e',
            '--tw-prose-td-borders': '#152035',
          } as React.CSSProperties}
        >
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
