'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamAuth } from '../layout'
import LoopCamRecorder from '@/components/LoopCamRecorder'

type ActiveJob = {
  id: string
  service_type: string | null
  start_time: string
  check_in_time: string | null
  check_out_time: string | null
  status: string
  clients: { name: string } | null
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function LoopCamPage() {
  const { auth, authLoaded, t } = useTeamAuth()
  const router = useRouter()
  const [jobs, setJobs] = useState<ActiveJob[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  const fetchJobs = useCallback(() => {
    if (!auth) return
    fetch('/api/team-portal/jobs', { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [auth])

  useEffect(() => {
    // authLoaded gates the redirect: auth is null both while the layout's
    // localStorage read is pending AND when truly logged out.
    if (!authLoaded) return
    if (!auth) { router.push('/team/login'); return }
    fetchJobs()
  }, [auth, authLoaded, router, fetchJobs])

  if (!auth) return null

  // A LoopCam session only makes sense for a job that's currently underway —
  // checked in, not yet checked out.
  const activeJobs = jobs.filter((j) => j.check_in_time && !j.check_out_time)
  const selectedJob = activeJobs.find((j) => j.id === selectedJobId) || null

  if (selectedJob) {
    return (
      <div className="pb-24">
        <button onClick={() => setSelectedJobId(null)} className="text-sm text-slate-400 mb-4">
          {t('← Back', '← Volver')}
        </button>
        <h1 className="text-xl font-bold text-slate-800 mb-1">{t('LoopCam', 'LoopCam')}</h1>
        <p className="text-sm text-slate-400 mb-4">
          {selectedJob.clients?.name || t('Client', 'Cliente')} &middot; {formatTime(selectedJob.start_time)}
        </p>
        <LoopCamRecorder
          bookingId={selectedJob.id}
          token={auth.token}
          t={t}
          onComplete={() => setSelectedJobId(null)}
        />
      </div>
    )
  }

  return (
    <div className="pb-24">
      <h1 className="text-xl font-bold text-slate-800 mb-1">{t('LoopCam', 'LoopCam')}</h1>
      <p className="text-sm text-slate-400 mb-6">
        {t('Record a video walkthrough for a job in progress', 'Graba un video para un trabajo en curso')}
      </p>

      {loading ? (
        <p className="text-slate-400 text-center py-12">{t('Loading...', 'Cargando...')}</p>
      ) : activeJobs.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
          <p className="text-lg text-slate-400 mb-1">{t('No job in progress', 'Sin trabajo en curso')}</p>
          <p className="text-sm text-slate-300">
            {t('Check in to a job to record a LoopCam session', 'Regístrate a un trabajo para grabar una sesión LoopCam')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeJobs.map((job) => (
            <button
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
              className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-slate-800 text-sm">{job.clients?.name || t('Client', 'Cliente')}</p>
                <p className="text-xs text-slate-400">
                  {formatTime(job.start_time)}{job.service_type ? ` · ${job.service_type}` : ''}
                </p>
              </div>
              <span className="text-red-600 text-xs font-semibold">🎥 {t('Record', 'Grabar')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
