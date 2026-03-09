'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamAuth } from '../layout'

type Job = {
  id: string
  service_type: string | null
  start_time: string
  hours: number
  pay: number
}

export default function EarningsPage() {
  const { auth, t } = useTeamAuth()
  const router = useRouter()
  const [period, setPeriod] = useState('week')
  const [totalHours, setTotalHours] = useState(0)
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => {
    if (!auth) { router.push('/team/login'); return }
    fetch(`/api/team-portal/earnings?period=${period}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setTotalHours(data.total_hours || 0)
        setTotalEarnings(data.total_earnings || 0)
        setJobs(data.jobs || [])
      })
  }, [auth, period, router])

  if (!auth) return null

  return (
    <div className="pb-20">
      <h1 className="text-xl font-bold text-slate-800 mb-4">{t('Earnings', 'Ganancias')}</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-0.5">
        {[
          { key: 'week', en: 'Week', es: 'Semana' },
          { key: 'month', en: 'Month', es: 'Mes' },
          { key: 'year', en: 'YTD', es: 'Año' },
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 py-2 text-sm rounded-md ${period === p.key ? 'bg-white shadow-sm font-medium' : 'text-slate-400'}`}
          >
            {t(p.en, p.es)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-400">{t('Hours', 'Horas')}</p>
          <p className="text-2xl font-bold text-slate-800">{totalHours.toFixed(1)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-400">{t('Earned', 'Ganado')}</p>
          <p className="text-2xl font-bold text-green-600">${totalEarnings.toFixed(2)}</p>
        </div>
      </div>

      <h2 className="font-semibold text-slate-800 mb-3">{t('Job Breakdown', 'Desglose')}</h2>
      <div className="space-y-2">
        {jobs.map((j) => (
          <div key={j.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{j.service_type || 'Job'}</p>
              <p className="text-xs text-slate-400">{new Date(j.start_time).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-600">${j.pay.toFixed(2)}</p>
              <p className="text-xs text-slate-400">{j.hours.toFixed(1)}hr</p>
            </div>
          </div>
        ))}
        {jobs.length === 0 && <p className="text-sm text-slate-400 text-center py-4">{t('No completed jobs', 'Sin trabajos completados')}</p>}
      </div>
    </div>
  )
}
