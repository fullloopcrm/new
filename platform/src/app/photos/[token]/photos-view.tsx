'use client'

import { useEffect, useState } from 'react'

type Tenant = { name: string; logo_url: string | null; primary_color: string | null }
type Job = { title: string | null; service_address: string | null; status: string; tenant: Tenant }
type Photo = { id: string; url: string; photo_type: 'before' | 'after' | 'progress'; pair_id: string | null; caption: string | null; taken_at: string }

const TYPE_LABEL: Record<string, string> = { before: 'Before', after: 'After', progress: 'Progress' }

function when(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PhotosView({ token }: { token: string }) {
  const [job, setJob] = useState<Job | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selected, setSelected] = useState<Photo | null>(null)

  useEffect(() => {
    fetch(`/api/jobs/public/${token}`).then(r => r.json()).then(d => {
      if (d.error) { setNotFound(true) } else { setJob(d.job); setPhotos(d.photos || []) }
      setLoading(false)
    }).catch(() => { setNotFound(true); setLoading(false) })
  }, [token])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading…</div>
  if (notFound || !job) return <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">This link isn&apos;t valid.</div>

  const selectedPair = selected?.pair_id ? photos.find(p => p.id === selected.pair_id) : null

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          {job.tenant.logo_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={job.tenant.logo_url} alt={job.tenant.name} className="w-10 h-10 rounded object-contain" />
          )}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">{job.tenant.name}</p>
            <h1 className="font-heading text-xl font-bold text-slate-900">{job.title || 'Job photos'}</h1>
            {job.service_address && <p className="text-sm text-slate-500">{job.service_address}</p>}
          </div>
        </div>

        {photos.length === 0
          ? <p className="text-sm text-slate-400">No photos yet.</p>
          : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map(p => (
                <button key={p.id} onClick={() => setSelected(p)} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.caption || 'Job photo'} className="w-full h-full object-cover" />
                  <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded bg-white/90 text-slate-600 font-medium">{TYPE_LABEL[p.photo_type]}</span>
                </button>
              ))}
            </div>
          )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {selectedPair ? (
              <div className="grid grid-cols-2 gap-px bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={(selected.photo_type === 'before' ? selected : selectedPair).url} alt="Before" className="w-full max-h-[50vh] object-contain bg-slate-900" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={(selected.photo_type === 'before' ? selectedPair : selected).url} alt="After" className="w-full max-h-[50vh] object-contain bg-slate-900" />
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={selected.url} alt={selected.caption || 'Job photo'} className="w-full max-h-[70vh] object-contain bg-slate-900" />
            )}
            <div className="p-3">
              {selected.caption && <p className="text-sm text-slate-700 mb-1">{selected.caption}</p>}
              <p className="text-xs text-slate-400">{when(selected.taken_at)}</p>
              <button onClick={() => setSelected(null)} className="mt-2 text-[11px] text-slate-400 hover:underline">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
