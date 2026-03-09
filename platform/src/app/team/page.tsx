'use client'

import { useEffect, useState, ReactNode, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useTeamAuth } from './layout'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Job = {
  id: string
  service_type: string | null
  start_time: string
  end_time: string | null
  status: string
  check_in_time: string | null
  check_out_time: string | null
  clients: {
    name: string
    phone: string | null
    address: string | null
    special_instructions: string | null
  } | null
}

type EarningsSummary = {
  period: string
  total_hours: number
  total_earnings: number
}

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <span className="font-semibold text-slate-800">{title}</span>
        <span className="text-slate-400">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Leaflet Map (dynamic import for SSR safety)
// ---------------------------------------------------------------------------

const JobsMap = dynamic(() => import('./jobs-map'), { ssr: false })

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function TeamHomePage() {
  const { auth, t } = useTeamAuth()
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [earningsWeek, setEarningsWeek] = useState<EarningsSummary | null>(null)
  const [earningsMonth, setEarningsMonth] = useState<EarningsSummary | null>(null)
  const [earningsYear, setEarningsYear] = useState<EarningsSummary | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)

  // ---- Fetch all data ----
  useEffect(() => {
    if (!auth) {
      router.push('/team/login')
      return
    }
    const headers = { Authorization: `Bearer ${auth.token}` }

    // Today's jobs
    fetch('/api/team-portal/jobs', { headers })
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs || []))

    // Earnings for all 3 periods in parallel
    fetch('/api/team-portal/earnings?period=week', { headers })
      .then((r) => r.json())
      .then((data) => setEarningsWeek(data))

    fetch('/api/team-portal/earnings?period=month', { headers })
      .then((r) => r.json())
      .then((data) => setEarningsMonth(data))

    fetch('/api/team-portal/earnings?period=year', { headers })
      .then((r) => r.json())
      .then((data) => setEarningsYear(data))
  }, [auth, router])

  // ---- Derived calculations ----
  const payRate = auth?.member?.pay_rate || 0

  const todayStats = useMemo(() => {
    let totalHours = 0
    let jobCount = 0
    for (const job of jobs) {
      if (job.start_time && job.end_time) {
        const hrs =
          (new Date(job.end_time).getTime() - new Date(job.start_time).getTime()) / 3600000
        totalHours += hrs
      }
      jobCount++
    }
    return {
      hours: Math.round(totalHours * 10) / 10,
      earnings: Math.round(totalHours * payRate * 100) / 100,
      count: jobCount,
    }
  }, [jobs, payRate])

  // ---- Status helpers ----
  const statusLabel = (s: string) => {
    const labels: Record<string, [string, string]> = {
      scheduled: ['Scheduled', 'Programado'],
      confirmed: ['Confirmed', 'Confirmado'],
      in_progress: ['In Progress', 'En Progreso'],
      completed: ['Done', 'Completado'],
      paid: ['Paid', 'Pagado'],
      cancelled: ['Cancelled', 'Cancelado'],
    }
    const pair = labels[s] || [s, s]
    return t(pair[0], pair[1])
  }

  const statusBadgeClass = (s: string) => {
    if (s === 'in_progress') return 'bg-yellow-50 text-yellow-700'
    if (s === 'completed' || s === 'paid') return 'bg-green-50 text-green-700'
    if (s === 'cancelled') return 'bg-red-50 text-red-700'
    return 'bg-blue-50 text-blue-700'
  }

  // ---- Photo upload handler ----
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!auth || !e.target.files?.[0]) return
    setPhotoUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', e.target.files[0])
      formData.append('folder', 'avatars')
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        // Update team member avatar via team API
        await fetch(`/api/team/${auth.member.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar_url: data.url }),
        })
        // Update local auth state
        const updated = {
          ...auth,
          member: { ...auth.member, avatar_url: data.url },
        }
        localStorage.setItem('team_auth', JSON.stringify(updated))
        window.location.reload()
      }
    } catch {
      // silently fail
    }
    setPhotoUploading(false)
  }

  if (!auth) return null

  const tenantPhone = auth.tenant?.phone || ''

  return (
    <div className="pb-24 space-y-4">
      {/* ================ 1. RATE CARD ================ */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium opacity-90">
              {t('My Rate', 'Mi Tarifa')}
            </p>
            <p className="text-3xl font-bold mt-1">
              ${payRate}/hr
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium opacity-90">
              {t('Paid via', 'Pago por')}
            </p>
            <p className="text-sm mt-1 opacity-90">Zelle / Apple Pay</p>
            <p className="text-xs mt-0.5 opacity-75">hi@business.com</p>
          </div>
        </div>
      </div>

      {/* ================ 2. TODAY'S POTENTIAL EARNINGS ================ */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-5">
        <p className="text-sm font-medium text-green-800">
          {t('Today', 'Hoy')}
        </p>
        <p className="text-3xl font-bold text-green-700 mt-1">
          ${todayStats.earnings.toFixed(0)}
        </p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-green-600">
            {todayStats.hours}hrs {t('scheduled', 'programadas')} &middot; {todayStats.count}{' '}
            {t('jobs', 'trabajos')}
          </p>
          <p className="text-xs text-green-500">
            {t('Complete all to earn', 'Completa todo para ganar')} &uarr;
          </p>
        </div>
      </div>

      {/* ================ 3. EARNINGS SUMMARY ================ */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="font-semibold text-green-900 mb-3">
          {t('Earnings', 'Ganancias')}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: t('Week', 'Semana'),
              data: earningsWeek,
            },
            {
              label: t('Month', 'Mes'),
              data: earningsMonth,
            },
            {
              label: t('Year', 'Ano'),
              data: earningsYear,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white border border-green-200 rounded-xl p-3 text-center"
            >
              <p className="text-xs text-slate-400 font-medium">{item.label}</p>
              <p className="text-xl font-bold text-green-600 mt-1">
                ${item.data?.total_earnings?.toFixed(0) || '0'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {item.data?.total_hours?.toFixed(1) || '0'}hrs
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ================ 4. MY JOBS MAP ================ */}
      <CollapsibleSection title={t('My Jobs Map', 'Mapa de Trabajos')} defaultOpen={false}>
        <JobsMap jobs={jobs} />
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-teal-600 inline-block" /> {t('Upcoming', 'Proximo')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> {t('In Progress', 'En Progreso')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> {t('Done', 'Completado')}
          </span>
        </div>
      </CollapsibleSection>

      {/* ================ 5. MY AVAILABILITY ================ */}
      <CollapsibleSection
        title={t('My Availability', 'Mi Disponibilidad')}
        defaultOpen={false}
      >
        <p className="text-sm text-slate-400 mb-3">
          {t(
            'Manage your working days and blocked dates.',
            'Administra tus dias de trabajo y fechas bloqueadas.'
          )}
        </p>
        <Link
          href="/team/availability"
          className="inline-block bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          {t('Edit Availability', 'Editar Disponibilidad')}
        </Link>
      </CollapsibleSection>

      {/* ================ 6. MY PHOTO ================ */}
      <CollapsibleSection title={t('My Photo', 'Mi Foto')} defaultOpen={false}>
        <div className="flex items-center gap-4">
          {auth.member.avatar_url ? (
            <img
              src={auth.member.avatar_url}
              alt={auth.member.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl text-slate-400">
              {auth.member.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <label className="inline-block bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg cursor-pointer">
              {photoUploading
                ? t('Uploading...', 'Subiendo...')
                : t('Change Photo', 'Cambiar Foto')}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={photoUploading}
              />
            </label>
            <p className="text-xs text-slate-400 mt-1">
              {t('Max 5MB, JPG/PNG', 'Max 5MB, JPG/PNG')}
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* ================ 7. NOTIFICATIONS ================ */}
      <CollapsibleSection
        title={t('Notifications', 'Notificaciones')}
        defaultOpen={false}
      >
        <p className="text-sm text-slate-400 mb-3">
          {t(
            'Manage your notification preferences.',
            'Administra tus preferencias de notificaciones.'
          )}
        </p>
        <Link
          href="/team/notifications"
          className="inline-block bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          {t('Notification Settings', 'Configuracion de Notificaciones')}
        </Link>
      </CollapsibleSection>

      {/* ================ 8. CALL / TEXT OFFICE ================ */}
      {tenantPhone && (
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`tel:${tenantPhone}`}
            className="flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl py-4 text-sm font-semibold text-slate-800 active:bg-gray-50"
          >
            <span>&#x1F4DE;</span> {t('Call Office', 'Llamar Oficina')}
          </a>
          <a
            href={`sms:${tenantPhone}`}
            className="flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl py-4 text-sm font-semibold text-slate-800 active:bg-gray-50"
          >
            <span>&#x1F4AC;</span> {t('Text Office', 'Texto Oficina')}
          </a>
        </div>
      )}

      {/* ================ 9. TODAY'S JOBS ================ */}
      <div>
        <h2 className="font-bold text-slate-800 text-lg mb-3">
          {t("Today's Jobs", 'Trabajos de Hoy')}{' '}
          <span className="text-sm font-normal text-slate-400">({jobs.length})</span>
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        {jobs.length === 0 && (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
            <p className="text-lg text-slate-400 mb-1">
              {t('No jobs today', 'Sin trabajos hoy')}
            </p>
            <p className="text-sm text-slate-300">
              {t('Enjoy your day off!', 'Disfruta tu dia libre!')}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-800">
                    {job.clients?.name || t('Client', 'Cliente')}
                  </p>
                  <p className="text-sm text-slate-400">
                    {job.service_type}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded font-medium ${statusBadgeClass(
                    job.status
                  )}`}
                >
                  {statusLabel(job.status)}
                </span>
              </div>

              <div className="text-sm text-slate-500 mb-3">
                <p>
                  {new Date(job.start_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {job.end_time &&
                    ` \u2014 ${new Date(job.end_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`}
                </p>
                {job.clients?.address && (
                  <p className="text-slate-400 mt-1">{job.clients.address}</p>
                )}
                {job.clients?.special_instructions && (
                  <p className="text-yellow-600 mt-1 text-xs">
                    {job.clients.special_instructions}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {job.clients?.phone && (
                  <>
                    <a
                      href={`tel:${job.clients.phone}`}
                      className="flex-1 bg-green-50 text-green-700 text-center py-2 rounded-lg text-sm font-medium"
                    >
                      {t('Call', 'Llamar')}
                    </a>
                    <a
                      href={`sms:${job.clients.phone}`}
                      className="flex-1 bg-blue-50 text-blue-700 text-center py-2 rounded-lg text-sm font-medium"
                    >
                      {t('Text', 'Texto')}
                    </a>
                  </>
                )}
                {job.clients?.address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(
                      job.clients.address
                    )}`}
                    target="_blank"
                    rel="noopener"
                    className="flex-1 bg-gray-100 text-gray-700 text-center py-2 rounded-lg text-sm font-medium"
                  >
                    {t('Navigate', 'Navegar')}
                  </a>
                )}

                {(job.status === 'scheduled' || job.status === 'confirmed') &&
                  !job.check_in_time && (
                    <button
                      onClick={() => router.push(`/team/checkin/${job.id}`)}
                      className="flex-1 bg-slate-800 text-white text-center py-2 rounded-lg text-sm font-medium"
                    >
                      {t('Check In', 'Registrar')}
                    </button>
                  )}

                {job.status === 'in_progress' && !job.check_out_time && (
                  <button
                    onClick={() => router.push(`/team/checkout/${job.id}`)}
                    className="flex-1 bg-slate-800 text-white text-center py-2 rounded-lg text-sm font-medium"
                  >
                    {t('Check Out', 'Salida')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
