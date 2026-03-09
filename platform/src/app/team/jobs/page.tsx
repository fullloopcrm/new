'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamAuth } from '../layout'

type Job = {
  id: string
  service_type: string | null
  start_time: string
  end_time: string | null
  clients: { name: string; address: string | null } | null
}

export default function OpenJobsPage() {
  const { auth, t } = useTeamAuth()
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => {
    if (!auth) { router.push('/team/login'); return }
    // Fetch available (unassigned) jobs
    fetch('/api/team-portal/jobs?available=true', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs || []))
      .catch(() => {})
  }, [auth, router])

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
      <h1 className="text-xl font-bold text-gray-900 mb-1">{t('Available Jobs', 'Trabajos Disponibles')}</h1>
      <p className="text-sm text-gray-500 mb-6">{t('Claim an open job', 'Reclama un trabajo abierto')}</p>

      {jobs.length === 0 && (
        <p className="text-center py-12 text-gray-400">{t('No open jobs right now', 'Sin trabajos abiertos')}</p>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="mb-3">
              <p className="font-semibold text-gray-900">{job.service_type || 'Service'}</p>
              <p className="text-sm text-gray-500">{new Date(job.start_time).toLocaleString()}</p>
              {job.clients?.address && <p className="text-sm text-gray-400">{job.clients.address}</p>}
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
