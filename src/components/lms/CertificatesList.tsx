'use client'

import { useState } from 'react'
import { Award, Download, Eye, X, Search, Printer } from 'lucide-react'
import { formatDate } from '@/lib/format'
import Image from 'next/image'

interface Cert {
  id: string
  userId: string
  courseId: string
  certificateNumber: string
  recipientName: string
  courseTitle: string
  emoji: string
  issuedAt: string
}

function CertificateView({ cert, onClose }: { cert: Cert; onClose: () => void }) {
  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#cert-print-root) { display: none !important; }
          #cert-print-root { position: fixed; inset: 0; z-index: 99999; }
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 0; }
        }
      `}</style>

      <div id="cert-print-root" className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
        {/* Toolbar */}
        <div className="no-print absolute top-4 right-4 flex items-center gap-2 z-10">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: '#003CA6' }}
          >
            <Download className="w-4 h-4" /> Download / Print PDF
          </button>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white transition-colors" style={{ background: '#1e293b' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate card */}
        <div
          id="certificate"
          className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
          style={{
            maxWidth: 860,
            aspectRatio: '1.414 / 1',
            fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
          }}
        >
          {/* Background image */}
          <div className="absolute inset-0">
            <Image
              src="/bg.png"
              alt="background"
              fill
              className="object-cover"
              priority
            />
            {/* Dark navy overlay for text legibility */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,10,28,0.88) 0%, rgba(0,25,70,0.82) 60%, rgba(0,10,28,0.90) 100%)' }} />
          </div>

          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(90deg, #003CA6, #00A3E0, #003CA6)' }} />

          {/* Corner ornaments */}
          <div className="absolute top-5 left-5 w-16 h-16 rounded-full opacity-20" style={{ border: '2px solid #00A3E0' }} />
          <div className="absolute bottom-5 right-5 w-16 h-16 rounded-full opacity-20" style={{ border: '2px solid #00A3E0' }} />
          <div className="absolute top-5 right-5 w-10 h-10 opacity-15" style={{ border: '2px solid #00A3E0', transform: 'rotate(45deg)' }} />
          <div className="absolute bottom-5 left-5 w-10 h-10 opacity-15" style={{ border: '2px solid #00A3E0', transform: 'rotate(45deg)' }} />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full px-16 py-8 text-center">

            {/* Logo + Academy */}
            <div className="flex items-center gap-3 mb-4">
              <Image src="/logo.png" alt="Airportr" width={110} height={27} className="object-contain" />
              <div className="w-px h-6 opacity-40" style={{ background: '#00A3E0' }} />
              <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: '#00A3E0' }}>Academy</span>
            </div>

            {/* Title */}
            <div
              className="text-xs font-bold tracking-[0.25em] uppercase mb-5 px-6 py-1.5 rounded-full"
              style={{ color: '#00A3E0', border: '1px solid rgba(0,163,224,0.35)', background: 'rgba(0,163,224,0.08)' }}
            >
              Certificate of Completion
            </div>

            {/* This certifies that */}
            <p className="text-sm mb-2" style={{ color: 'rgba(148,163,184,0.9)' }}>This is to certify that</p>

            {/* Recipient name */}
            <h1
              className="font-bold mb-1"
              style={{
                fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)',
                color: '#ffffff',
                textShadow: '0 2px 20px rgba(0,163,224,0.4)',
                letterSpacing: '-0.01em',
                fontFamily: 'Georgia, serif',
              }}
            >
              {cert.recipientName}
            </h1>

            {/* Decorative line under name */}
            <div className="flex items-center gap-3 my-3" style={{ width: 280 }}>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #00A3E0)' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: '#00A3E0' }} />
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #00A3E0, transparent)' }} />
            </div>

            <p className="text-sm mb-2" style={{ color: 'rgba(148,163,184,0.9)' }}>has successfully completed</p>

            {/* Course title */}
            <h2
              className="font-bold mb-1"
              style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
                color: '#00A3E0',
                maxWidth: 560,
              }}
            >
              {cert.emoji} {cert.courseTitle}
            </h2>

            <p className="text-xs mb-6" style={{ color: 'rgba(100,116,139,0.9)' }}>with passing marks on the final assessment</p>

            {/* Footer row */}
            <div className="flex items-end justify-between w-full mt-2 pt-4" style={{ borderTop: '1px solid rgba(0,163,224,0.2)', maxWidth: 560 }}>

              {/* Date */}
              <div className="text-left">
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(100,116,139,0.8)' }}>Date Issued</p>
                <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{formatDate(cert.issuedAt)}</p>
              </div>

              {/* Seal */}
              <div className="flex flex-col items-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-1"
                  style={{
                    background: 'radial-gradient(circle, rgba(0,60,166,0.6), rgba(0,31,92,0.8))',
                    border: '2px solid rgba(0,163,224,0.5)',
                    boxShadow: '0 0 20px rgba(0,163,224,0.3)',
                  }}
                >
                  🏅
                </div>
                <p className="text-xs" style={{ color: 'rgba(100,116,139,0.7)' }}>Verified</p>
              </div>

              {/* Certificate number */}
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(100,116,139,0.8)' }}>Certificate No.</p>
                <p className="text-xs font-mono" style={{ color: 'rgba(148,163,184,0.8)' }}>{cert.certificateNumber}</p>
              </div>
            </div>
          </div>

          {/* Bottom accent bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(90deg, #003CA6, #00A3E0, #003CA6)' }} />
        </div>

        <p className="no-print absolute bottom-4 text-xs" style={{ color: 'rgba(100,116,139,0.6)' }}>
          Click "Download / Print PDF" → Save as PDF in your browser print dialog
        </p>
      </div>
    </>
  )
}

export default function CertificatesList({ certs, isAdmin }: { certs: Cert[]; isAdmin: boolean }) {
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState<Cert | null>(null)

  const filtered = certs.filter(c =>
    c.recipientName.toLowerCase().includes(search.toLowerCase()) ||
    c.courseTitle.toLowerCase().includes(search.toLowerCase()) ||
    c.certificateNumber.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-400" /> Certificates
          </h1>
          <p className="mt-1" style={{ color: '#64748b' }}>
            {isAdmin ? `${certs.length} total certificates issued` : 'Your earned certificates'}
          </p>
        </div>
      </div>

      {certs.length > 0 && (
        <div className="relative mb-5 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search certificates..."
            className="w-full pl-9 pr-3 py-2 text-white text-sm rounded-lg focus:outline-none placeholder-gray-600"
            style={{ background: '#0d1b2e', border: '1px solid #1e3a6e' }}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <Award className="w-12 h-12 mx-auto mb-4" style={{ color: '#1e3a6e' }} />
          <p className="text-lg" style={{ color: '#475569' }}>{certs.length === 0 ? 'No certificates yet' : 'No results'}</p>
          {certs.length === 0 && (
            <p className="text-sm mt-1" style={{ color: '#334155' }}>
              Complete a course and pass the final quiz to earn your first certificate
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(cert => (
            <div
              key={cert.id}
              className="rounded-xl p-5 transition-all group cursor-pointer"
              style={{ background: '#0d1b2e', border: '1px solid #1e3a6e' }}
              onClick={() => setViewing(cert)}
            >
              {/* Mini certificate preview */}
              <div
                className="relative h-28 rounded-lg mb-4 overflow-hidden flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #001228 0%, #001f5c 100%)', border: '1px solid rgba(0,163,224,0.2)' }}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #003CA6, #00A3E0)' }} />
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #003CA6, #00A3E0)' }} />
                <div className="text-center px-3">
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#00A3E0' }}>Certificate</p>
                  <p className="text-white font-bold text-sm line-clamp-1">{cert.recipientName}</p>
                  <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#64748b' }}>{cert.courseTitle}</p>
                </div>
                <div className="absolute top-2 right-2 text-xl">{cert.emoji}</div>
              </div>

              <h3 className="font-semibold text-white text-sm line-clamp-2 mb-1">{cert.courseTitle}</h3>
              {isAdmin && <p className="text-xs mb-1" style={{ color: '#00A3E0' }}>{cert.recipientName}</p>}
              <p className="text-xs mb-3" style={{ color: '#475569' }}>Issued {formatDate(cert.issuedAt)}</p>
              <p className="text-xs font-mono mb-4" style={{ color: '#334155' }}>{cert.certificateNumber}</p>

              <button
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors"
                style={{ background: 'rgba(0,60,166,0.15)', border: '1px solid rgba(0,163,224,0.2)', color: '#94a3b8' }}
              >
                <Eye className="w-4 h-4" /> View & Download
              </button>
            </div>
          ))}
        </div>
      )}

      {viewing && <CertificateView cert={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
