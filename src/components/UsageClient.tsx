'use client'

import { BarChart2, Database, Image, FileText, Sparkles, Users, HardDrive, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'

interface Stats {
  projects: number
  contentItems: number
  images: number
  generated: number
  utFiles: number
  utSizeMB: number
}

interface LimitBar {
  label: string
  used: number
  limit: number
  unit: string
  icon: React.ReactNode
  tier: string
  color: string
}

function statusColor(pct: number) {
  if (pct >= 90) return { bar: 'bg-red-500', text: 'text-red-400', icon: <AlertTriangle className="w-4 h-4 text-red-400" /> }
  if (pct >= 70) return { bar: 'bg-yellow-500', text: 'text-yellow-400', icon: <AlertCircle className="w-4 h-4 text-yellow-400" /> }
  return { bar: 'bg-green-500', text: 'text-green-400', icon: <CheckCircle className="w-4 h-4 text-green-400" /> }
}

function LimitCard({ item }: { item: LimitBar }) {
  const pct = Math.min(100, Math.round((item.used / item.limit) * 100))
  const { bar, text, icon } = statusColor(pct)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400">
            {item.icon}
          </div>
          <div>
            <p className="text-white font-medium text-sm">{item.label}</p>
            <p className="text-gray-500 text-xs">{item.tier}</p>
          </div>
        </div>
        {icon}
      </div>

      <div className="mb-2">
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className={`${bar} h-2 rounded-full transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${text}`}>
          {item.used.toLocaleString()} {item.unit}
        </span>
        <span className="text-gray-600 text-xs">
          of {item.limit.toLocaleString()} {item.unit} limit
        </span>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
      <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center text-violet-400 flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-gray-400 text-sm">{label}</p>
        {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function UsageClient({ stats }: { stats: Stats }) {
  const limits: LimitBar[] = [
    {
      label: 'Neon — Storage',
      used: 0.1,
      limit: 512,
      unit: 'MB',
      icon: <Database className="w-4 h-4" />,
      tier: 'Free — 512 MB total',
      color: 'blue',
    },
    {
      label: 'UploadThing — Storage',
      used: stats.utSizeMB,
      limit: 2048,
      unit: 'MB',
      icon: <HardDrive className="w-4 h-4" />,
      tier: 'Free — 2 GB total',
      color: 'purple',
    },
    {
      label: 'UploadThing — Files',
      used: stats.utFiles,
      limit: 1000,
      unit: 'files',
      icon: <Image className="w-4 h-4" />,
      tier: 'Free tier estimate',
      color: 'indigo',
    },
    {
      label: 'Clerk — Monthly Active Users',
      used: 1,
      limit: 10000,
      unit: 'MAU',
      icon: <Users className="w-4 h-4" />,
      tier: 'Free — 10,000 MAU',
      color: 'violet',
    },
    {
      label: 'Gemini — Daily Requests',
      used: stats.generated,
      limit: 1500,
      unit: 'req/day',
      icon: <Sparkles className="w-4 h-4" />,
      tier: 'Free — 1,500 req/day',
      color: 'yellow',
    },
  ]

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 className="w-5 h-5 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Usage & Limits</h1>
        </div>
        <p className="text-gray-400 text-sm">Monitor your free tier usage across all connected services</p>
      </div>

      {/* Your activity */}
      <h2 className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Your Activity</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard icon={<FileText className="w-5 h-5" />} label="Projects" value={stats.projects} />
        <StatCard icon={<Image className="w-5 h-5" />} label="Screenshots" value={stats.images} />
        <StatCard icon={<FileText className="w-5 h-5" />} label="Notes" value={stats.contentItems - stats.images} />
        <StatCard icon={<Sparkles className="w-5 h-5" />} label="Generations" value={stats.generated} sub="AI runs total" />
      </div>

      {/* Service limits */}
      <h2 className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Service Limits</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {limits.map(item => (
          <LimitCard key={item.label} item={item} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-gray-500 mt-2">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-500 rounded-full" /> Good (&lt;70%)</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-yellow-500 rounded-full" /> Watch (70–90%)</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-500 rounded-full" /> Critical (&gt;90%)</div>
      </div>

      <p className="text-gray-700 text-xs mt-4">
        * Neon storage shown as estimate — check exact usage at neon.tech dashboard. Gemini quota resets daily.
      </p>
    </div>
  )
}
