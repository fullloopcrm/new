'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamAuth } from '../layout'

type Job = {
  id: string
  service_type: string | null
  start_time: string
  end_time: string | null
  // Open-pool jobs are masked: only a coarse area, no client name/address/phone.
  area: string | null
}

export default function OpenJobsPage() {
  const { auth, authLoaded, t } = useTeamAuth()
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => {
    // authLoaded gates this: auth is null both while the layout's localStorage
    // read is still pending AND when truly logged out -- redirecting on the
    // former bounces an already-authenticated cleaner back to the PIN screen
    // on every fresh page load, before localStorage is ever read.
    if (!authLoaded) return
    if (!auth) { router.push('/team/login'); return }
    // Fetch available (unassigned) jobs
    fetch('/api/team-portal/jobs?available=true', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs || []))
      .catch(() => {})
  }, [auth, authLoaded, router])

  async function claimJob(jobId: string) {
    if (!auth) return
    const res = await fetch('/api/team-portal/jobs/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ booking_id: jobId }),
    })
    if (res.ok) {
      setJobs((prev) => prev.filter((j) => j.id !== jobId))
    }
  }

  if (!auth) return null

  return (
    <div className="pb-20">
      <h1 className="text-xl font-bold text-slate-800 mb-1">{t('Available Jobs', 'Trabajos Disponibles')}</h1>
      <p className="text-sm text-slate-400 mb-6">{t('Claim an open job', 'Reclama un trabajo abierto')}</p>

      {jobs.length === 0 && (
        <p className="text-center py-12 text-slate-400">{t('No open jobs right now', 'Sin trabajos abiertos')}</p>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="mb-3">
              <p className="font-semibold text-slate-800">{job.service_type || 'Service'}</p>
              <p className="text-sm text-slate-400">{new Date(job.start_time).toLocaleString()}</p>
              {job.area && <p className="text-sm text-slate-400">📍 {job.area}</p>}
            </div>
            <button
              onClick={() => claimJob(job.id)}
              className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium"
            >
              {t('Claim This Job', 'Reclamar Trabajo')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
