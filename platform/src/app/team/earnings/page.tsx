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

type Earnings = {
  hourlyRate: number
  todayPotentialHours: number
  todayPotentialPay: number
  weeklyHours: number
  weeklyPay: number
  monthlyHours: number
  monthlyPay: number
  yearlyHours: number
  yearlyPay: number
  weekJobsCount: number
  monthJobsCount: number
  yearJobsCount: number
}

export default function EarningsPage() {
  const { auth, t } = useTeamAuth()
  const router = useRouter()
  const [earnings, setEarnings] = useState<Earnings | null>(null)
  const [jobs, setJobs] = useState<Record<string, Job[]>>({ week: [], month: [], year: [] })
  const [period, setPeriod] = useState('week')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) { router.push('/team/login'); return }
    fetch('/api/team-portal/earnings', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.earnings) {
          setEarnings(data.earnings)
          setJobs(data.jobs || { week: [], month: [], year: [] })
        }
      })
      .finally(() => setLoading(false))
  }, [auth, router])

  if (!auth) return null
  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-400">{t('Loading...', 'Cargando...')}</p></div>

  const currentJobs = jobs[period] || []
  const periodStats = earnings ? {
    week: { hours: earnings.weeklyHours, pay: earnings.weeklyPay, count: earnings.weekJobsCount },
    month: { hours: earnings.monthlyHours, pay: earnings.monthlyPay, count: earnings.monthJobsCount },
    year: { hours: earnings.yearlyHours, pay: earnings.yearlyPay, count: earnings.yearJobsCount },
  }[period] : null

  return (
    <div className="pb-20">
      <h1 className="text-xl font-bold text-slate-800 mb-4">{t('Earnings', 'Ganancias')}</h1>

      {/* Rate card + today's potential */}
      {earnings && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">{t('Hourly Rate', 'Tarifa por hora')}</p>
            <p className="text-2xl font-bold text-slate-800">${earnings.hourlyRate}</p>
            <p className="text-xs text-slate-400">{t('/hour', '/hora')}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">{t("Today's Potential", 'Potencial hoy')}</p>
            <p className="text-2xl font-bold text-green-600">${earnings.todayPotentialPay.toFixed(2)}</p>
            <p className="text-xs text-slate-400">{earnings.todayPotentialHours}h {t('scheduled', 'programado')}</p>
          </div>
        </div>
      )}

      {/* Period tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-0.5">
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

      {/* Period summary */}
      {periodStats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400">{t('Hours', 'Horas')}</p>
            <p className="text-xl font-bold text-slate-800">{periodStats.hours.toFixed(1)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400">{t('Earned', 'Ganado')}</p>
            <p className="text-xl font-bold text-green-600">${periodStats.pay.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400">{t('Jobs', 'Trabajos')}</p>
            <p className="text-xl font-bold text-slate-800">{periodStats.count}</p>
          </div>
        </div>
      )}

      <h2 className="font-semibold text-slate-800 mb-3">{t('Job Breakdown', 'Desglose')}</h2>
      <div className="space-y-2">
        {currentJobs.map((j) => (
          <div key={j.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{j.service_type || t('Job', 'Trabajo')}</p>
              <p className="text-xs text-slate-400">{new Date(j.start_time).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-600">${j.pay.toFixed(2)}</p>
              <p className="text-xs text-slate-400">{j.hours.toFixed(1)}hr</p>
            </div>
          </div>
        ))}
        {currentJobs.length === 0 && <p className="text-sm text-slate-400 text-center py-4">{t('No completed jobs', 'Sin trabajos completados')}</p>}
      </div>
    </div>
  )
}
