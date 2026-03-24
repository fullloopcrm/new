'use client'

import { useEffect, useState, ReactNode, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useTeamAuth } from './layout'
import TranslatedNotes from '@/components/TranslatedNotes'
import PushPrompt from '@/components/PushPrompt'

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
  hourly_rate: number | null
  clients: {
    name: string
    phone: string | null
    address: string | null
    special_instructions: string | null
  } | null
}

type AvailableJob = {
  id: string
  service_type: string | null
  start_time: string
  end_time: string | null
  pay_rate: number | null
  notes: string | null
  clients: { name: string; phone: string | null; address: string | null; special_instructions: string | null } | null
}

type EarningsSummary = {
  period: string
  total_hours: number
  total_earnings: number
}

type Notification = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  booking_id: string | null
  created_at: string
}

type DaySchedule = { start: string; end: string }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (file.size < 500 * 1024) { resolve(file); return }
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxDim = 1200
      let w = img.width, h = img.height
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim }
        else { w = Math.round(w * maxDim / h); h = maxDim }
      }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob((blob) => {
        resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file)
      }, 'image/jpeg', 0.8)
    }
    img.onerror = () => resolve(file)
    img.src = URL.createObjectURL(file)
  })
}

const NOTIF_ICONS: Record<string, string> = {
  job_assignment: '📋', job_reminder: '⏰', daily_summary: '📊',
  job_cancelled: '❌', job_rescheduled: '📅', broadcast: '📢',
}

const TIME_OPTIONS: string[] = []
for (let h = 6; h <= 21; h++) {
  for (const m of ['00', '30']) {
    if (h === 21 && m === '30') continue
    const hr = h > 12 ? h - 12 : h === 0 ? 12 : h
    const ap = h >= 12 ? 'PM' : 'AM'
    TIME_OPTIONS.push(`${hr}:${m} ${ap}`)
  }
}

const DAYS = [
  { en: 'Mon', es: 'Lun', full_en: 'Monday', full_es: 'Lunes' },
  { en: 'Tue', es: 'Mar', full_en: 'Tuesday', full_es: 'Martes' },
  { en: 'Wed', es: 'Mié', full_en: 'Wednesday', full_es: 'Miércoles' },
  { en: 'Thu', es: 'Jue', full_en: 'Thursday', full_es: 'Jueves' },
  { en: 'Fri', es: 'Vie', full_en: 'Friday', full_es: 'Viernes' },
  { en: 'Sat', es: 'Sáb', full_en: 'Saturday', full_es: 'Sábado' },
  { en: 'Sun', es: 'Dom', full_en: 'Sunday', full_es: 'Domingo' },
]

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------

function CollapsibleSection({ title, badge, defaultOpen = false, children }: {
  title: string; badge?: number; defaultOpen?: boolean; children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left">
        <span className="font-semibold text-slate-800 flex items-center gap-2">
          {title}
          {badge !== undefined && badge > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{badge > 9 ? '9+' : badge}</span>
          )}
        </span>
        <span className="text-slate-400">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Job Card (expandable, like nycmaid)
// ---------------------------------------------------------------------------

function JobCard({ job, t, showDate, onCheckIn, onCheckOut, onHeadsUp, checkingIn, checkingOut, sendingHeadsUp }: {
  job: Job; t: (en: string, es: string) => string; showDate?: boolean
  onCheckIn: (id: string) => void; onCheckOut: (id: string) => void; onHeadsUp: (job: Job) => void
  checkingIn: string | null; checkingOut: string | null; sendingHeadsUp: string | null
}) {
  const [expanded, setExpanded] = useState(false)

  const statusBadge = (s: string) => {
    if (s === 'completed' || s === 'paid') return { cls: 'bg-green-50 text-green-700', label: t('Done', 'Listo') }
    if (s === 'in_progress') return { cls: 'bg-blue-50 text-blue-700', label: t('In Progress', 'En Progreso') }
    if (s === 'cancelled') return { cls: 'bg-red-50 text-red-700', label: t('Cancelled', 'Cancelado') }
    return { cls: 'bg-gray-100 text-gray-600', label: t('Upcoming', 'Próximo') }
  }

  const badge = statusBadge(job.status)
  const canCheckIn = (job.status === 'scheduled' || job.status === 'confirmed') && !job.check_in_time
  const canCheckOut = job.status === 'in_progress' && !job.check_out_time

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Collapsed header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex-1 min-w-0">
          {showDate && (
            <p className="text-xs text-slate-400 mb-0.5">
              {new Date(job.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          )}
          <p className="font-semibold text-slate-800 text-sm">
            {formatTime(job.start_time)}
            {job.end_time && ` — ${formatTime(job.end_time)}`}
          </p>
          <p className="text-xs text-slate-400 truncate">{job.clients?.name || t('Client', 'Cliente')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${badge.cls}`}>{badge.label}</span>
          <span className="text-slate-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Details */}
          <div className="text-sm space-y-2">
            <div>
              <p className="text-xs text-slate-400">{t('Address / Dirección', 'Dirección')}</p>
              {job.clients?.address ? (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(job.clients.address)}`} target="_blank" rel="noopener" className="text-blue-600 underline">
                  {job.clients.address}
                </a>
              ) : <p className="text-slate-400">N/A</p>}
            </div>
            <div>
              <p className="text-xs text-slate-400">{t('Phone / Teléfono', 'Teléfono')}</p>
              {job.clients?.phone ? (
                <a href={`tel:${job.clients.phone}`} className="text-slate-700 underline">{job.clients.phone}</a>
              ) : <p className="text-slate-400">N/A</p>}
            </div>
            {job.service_type && (
              <div>
                <p className="text-xs text-slate-400">{t('Service / Servicio', 'Servicio')}</p>
                <p className="text-slate-700">{job.service_type}</p>
              </div>
            )}
            {/* Notes — combined with TranslatedNotes */}
            {(() => {
              const allNotes = [job.clients?.special_instructions].filter(Boolean).join('\n\n')
              return (
                <div className={`p-3 rounded-xl border-2 ${allNotes ? 'bg-teal-50/50 border-teal-200/50' : 'bg-gray-50 border-gray-200'}`}>
                  {allNotes ? (
                    <TranslatedNotes text={allNotes} label={t('Notes / Notas', 'Notas')} />
                  ) : (
                    <>
                      <p className="text-sm font-semibold mb-1 text-slate-800">{t('Notes / Notas', 'Notas')}</p>
                      <p className="text-sm text-slate-400 italic">{t('No notes / Sin notas', 'Sin notas')}</p>
                    </>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Check-in/out status */}
          {job.check_in_time && (
            <p className="text-xs text-green-600">✓ {t('Checked in at', 'Entrada a las')} {formatTime(job.check_in_time)}</p>
          )}
          {job.check_out_time && (
            <p className="text-xs text-green-600">✓ {t('Checked out at', 'Salida a las')} {formatTime(job.check_out_time)}</p>
          )}

          {/* Quick actions */}
          <div className="flex gap-2">
            {job.clients?.address && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(job.clients.address)}`} target="_blank" rel="noopener"
                className="flex-1 bg-gray-100 text-gray-700 text-center py-2 rounded-lg text-xs font-medium">
                📍 {t('Navigate', 'Navegar')}
              </a>
            )}
            {job.clients?.phone && (
              <>
                <a href={`tel:${job.clients.phone}`} className="flex-1 bg-green-50 text-green-700 text-center py-2 rounded-lg text-xs font-medium">
                  📞 {t('Call', 'Llamar')}
                </a>
                <a href={`sms:${job.clients.phone}`} className="flex-1 bg-blue-50 text-blue-700 text-center py-2 rounded-lg text-xs font-medium">
                  💬 {t('Text', 'Texto')}
                </a>
              </>
            )}
          </div>

          {/* Check-in / Check-out buttons */}
          {canCheckIn && (
            <button onClick={() => onCheckIn(job.id)} disabled={checkingIn === job.id}
              className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {checkingIn === job.id ? t('Checking In...', 'Registrando...') : t('Check In', 'Registrar Entrada')}
            </button>
          )}
          {/* 15-Min Heads Up — after check-in, before check-out */}
          {job.check_in_time && !job.check_out_time && (
            <button onClick={() => onHeadsUp(job)} disabled={sendingHeadsUp === job.id}
              className="w-full bg-yellow-500 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {sendingHeadsUp === job.id ? t('Sending...', 'Enviando...') : t('15-Min Heads Up', 'Aviso de 15 Min')}
            </button>
          )}
          {canCheckOut && (
            <button onClick={() => onCheckOut(job.id)} disabled={checkingOut === job.id}
              className="w-full bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {checkingOut === job.id ? t('Checking Out...', 'Registrando...') : t('Check Out', 'Registrar Salida')}
            </button>
          )}

          {/* Completed state */}
          {(job.status === 'completed' || job.status === 'paid') && (
            <div className="text-center py-2">
              <p className="text-green-600 font-medium text-sm">✅ {t('Job Complete!', '¡Trabajo Completado!')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Side Panel
// ---------------------------------------------------------------------------

function SidePanel({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true))
    else setVisible(false)
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[10000]" onClick={onClose}>
      <div className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} />
      <div
        className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl flex flex-col transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Leaflet Map (dynamic import for SSR safety)
// ---------------------------------------------------------------------------

const JobsMap = dynamic(() => import('./jobs-map'), { ssr: false })

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function TeamHomePage() {
  const { auth, t } = useTeamAuth()
  const router = useRouter()

  // Data state
  const [todayJobs, setTodayJobs] = useState<Job[]>([])
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([])
  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([])
  const [earningsWeek, setEarningsWeek] = useState<EarningsSummary | null>(null)
  const [earningsMonth, setEarningsMonth] = useState<EarningsSummary | null>(null)
  const [earningsYear, setEarningsYear] = useState<EarningsSummary | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Availability state
  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>({})
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [newBlock, setNewBlock] = useState('')
  const [availSaving, setAvailSaving] = useState(false)
  const [availSaved, setAvailSaved] = useState(false)

  // Photo state
  const [photoUploading, setPhotoUploading] = useState(false)

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState<Record<string, Record<string, boolean>>>({
    job_assignment: { push: true, email: true, sms: true },
    job_reminder: { push: true, email: true, sms: true },
    daily_summary: { push: true, email: true, sms: true },
    job_cancelled: { push: true, email: true, sms: true },
    job_rescheduled: { push: true, email: true, sms: true },
    broadcast: { push: true, email: true, sms: true },
  })
  const [quietStart, setQuietStart] = useState('22:00')
  const [quietEnd, setQuietEnd] = useState('07:00')
  const [smsConsent, setSmsConsent] = useState(true)
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsSaved, setPrefsSaved] = useState(false)

  // UI state
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [showGuidelines, setShowGuidelines] = useState(false)
  const [guidelines, setGuidelines] = useState<{ en: string; es: string } | null>(null)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [claimingJob, setClaimingJob] = useState<string | null>(null)
  const [sendingHeadsUp, setSendingHeadsUp] = useState<string | null>(null)

  const payRate = auth?.member?.pay_rate || 0
  const tenantPhone = auth?.tenant?.phone || ''

  // ---- Fetch all data ----
  const fetchData = useCallback(() => {
    if (!auth) return
    const headers = { Authorization: `Bearer ${auth.token}` }

    // Today's jobs
    fetch('/api/team-portal/jobs', { headers })
      .then((r) => r.json())
      .then((data) => setTodayJobs(data.jobs || []))
      .catch(() => {})

    // Upcoming jobs (next 14 days)
    fetch('/api/team-portal/jobs?upcoming=true', { headers })
      .then((r) => r.json())
      .then((data) => setUpcomingJobs(data.jobs || []))
      .catch(() => {})

    // Available jobs
    fetch('/api/team-portal/jobs?available=true', { headers })
      .then((r) => r.json())
      .then((data) => setAvailableJobs(data.jobs || []))
      .catch(() => {})

    // Earnings
    fetch('/api/team-portal/earnings?period=week', { headers }).then((r) => r.json()).then(setEarningsWeek).catch(() => {})
    fetch('/api/team-portal/earnings?period=month', { headers }).then((r) => r.json()).then(setEarningsMonth).catch(() => {})
    fetch('/api/team-portal/earnings?period=year', { headers }).then((r) => r.json()).then(setEarningsYear).catch(() => {})

    // Notifications
    fetch('/api/team-portal/notifications', { headers })
      .then((r) => r.json())
      .then((data) => {
        const notifs = data.notifications || []
        setNotifications(notifs)
        setUnreadCount(notifs.filter((n: Notification) => !n.read).length)
      })
      .catch(() => {})

    // Availability
    fetch('/api/team-portal/availability', { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.availability) {
          setWorkingDays(data.availability.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
          setSchedule(data.availability.schedule || {})
          setBlockedDates(data.availability.blocked_dates || [])
        }
      })
      .catch(() => {})

    // Guidelines
    fetch('/api/team-portal/guidelines', { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.sections) {
          // Convert sections format to en/es strings
          const en = data.sections.map((s: { title_en: string; content_en: string }) => `${s.title_en}\n${s.content_en}`).join('\n\n')
          const es = data.sections.map((s: { title_es: string; content_es: string }) => `${s.title_es}\n${s.content_es}`).join('\n\n')
          setGuidelines({ en, es })
          // Auto-show if guidelines exist and are newer than last seen
          if (en || es) {
            const seenAt = localStorage.getItem('guidelines_seen_at')
            if (!seenAt || (data.updated_at && new Date(data.updated_at) > new Date(seenAt))) {
              setShowGuidelines(true)
            }
          }
        }
      })
      .catch(() => {})

    // Notification preferences
    fetch('/api/team-portal/preferences', { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.notification_preferences) {
          const prefs = data.notification_preferences
          if (prefs.quiet_start) setQuietStart(prefs.quiet_start)
          if (prefs.quiet_end) setQuietEnd(prefs.quiet_end)
          const { quiet_start, quiet_end, ...rest } = prefs
          void quiet_start; void quiet_end
          if (Object.keys(rest).length > 0) setNotifPrefs(rest)
        }
        if (data.sms_consent !== undefined) setSmsConsent(data.sms_consent)
      })
      .catch(() => {})
  }, [auth])

  useEffect(() => {
    if (!auth) { router.push('/team/login'); return }
    fetchData()
    // Poll notifications every 60 seconds
    const interval = setInterval(() => {
      if (!auth) return
      fetch('/api/team-portal/notifications', { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          const notifs = data.notifications || []
          setNotifications(notifs)
          setUnreadCount(notifs.filter((n: Notification) => !n.read).length)
        })
        .catch(() => {})
    }, 60000)
    return () => clearInterval(interval)
  }, [auth, router, fetchData])

  // ---- Today's stats ----
  const todayStats = useMemo(() => {
    let totalHours = 0
    for (const job of todayJobs) {
      if (job.start_time && job.end_time) {
        totalHours += (new Date(job.end_time).getTime() - new Date(job.start_time).getTime()) / 3600000
      }
    }
    return {
      hours: Math.round(totalHours * 10) / 10,
      earnings: Math.round(totalHours * payRate * 100) / 100,
      count: todayJobs.length,
    }
  }, [todayJobs, payRate])

  // ---- Handlers ----
  async function handleCheckIn(jobId: string) {
    if (!auth) return
    setCheckingIn(jobId)
    let lat: number | undefined, lng: number | undefined
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      )
      lat = pos.coords.latitude; lng = pos.coords.longitude
    } catch { /* continue without GPS */ }

    const res = await fetch('/api/team-portal/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ booking_id: jobId, lat, lng }),
    })
    if (res.ok) fetchData()
    setCheckingIn(null)
  }

  async function handleCheckOut(jobId: string) {
    if (!auth) return
    setCheckingOut(jobId)
    let lat: number | undefined, lng: number | undefined
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      )
      lat = pos.coords.latitude; lng = pos.coords.longitude
    } catch { /* continue without GPS */ }

    const res = await fetch('/api/team-portal/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ booking_id: jobId, lat, lng }),
    })
    if (res.ok) fetchData()
    setCheckingOut(null)
  }

  async function handleHeadsUp(job: Job) {
    if (!auth) return
    const checkIn = new Date(job.check_in_time!)
    const now = new Date()
    const hoursWorked = ((now.getTime() - checkIn.getTime()) / 3600000)
    const rate = job.hourly_rate || payRate || 0
    const estimated = Math.round(hoursWorked * rate)

    const msg = t(
      `Send 15-minute heads up to ${job.clients?.name || 'client'}?\n\nTime worked: ${hoursWorked.toFixed(1)} hrs\nEstimated amount: $${estimated}`,
      `Enviar aviso de 15 minutos a ${job.clients?.name || 'cliente'}?\n\nTiempo trabajado: ${hoursWorked.toFixed(1)} hrs\nMonto estimado: $${estimated}`
    )
    if (!confirm(msg)) return

    setSendingHeadsUp(job.id)
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({
          type: '15min_warning',
          booking_id: job.id,
          message: `15-min heads up for ${job.clients?.name || 'client'} — ${hoursWorked.toFixed(1)} hrs, ~$${estimated}`,
        }),
      })
      if (res.ok) {
        alert(t('Heads up sent!', 'Aviso enviado!'))
      } else {
        alert(t('Failed to send', 'Error al enviar'))
      }
    } catch {
      alert(t('Failed to send', 'Error al enviar'))
    }
    setSendingHeadsUp(null)
  }

  async function claimJob(jobId: string) {
    if (!auth) return
    setClaimingJob(jobId)
    const res = await fetch('/api/team-portal/jobs/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ booking_id: jobId }),
    })
    const data = await res.json()
    if (res.ok) {
      alert(data.message || t('Job claimed!', '¡Trabajo reclamado!'))
      setAvailableJobs((prev) => prev.filter((j) => j.id !== jobId))
      fetchData()
    } else {
      alert(data.error || t('Failed to claim job', 'Error al reclamar'))
    }
    setClaimingJob(null)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!auth || !e.target.files?.[0]) return
    setPhotoUploading(true)
    try {
      const compressed = await compressImage(e.target.files[0])
      const formData = new FormData()
      formData.append('file', compressed)
      formData.append('folder', 'avatars')
      const res = await fetch('/api/uploads', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        await fetch(`/api/team/${auth.member.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar_url: data.url }),
        })
        const updated = { ...auth, member: { ...auth.member, avatar_url: data.url } }
        localStorage.setItem('team_auth', JSON.stringify(updated))
        window.location.reload()
      }
    } catch { /* silently fail */ }
    setPhotoUploading(false)
    e.target.value = ''
  }

  async function markAllNotificationsRead() {
    if (!auth) return
    await fetch('/api/team-portal/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ mark_all_read: true }),
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  function toggleWorkingDay(day: string) {
    setWorkingDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])
  }

  function updateSchedule(day: string, field: 'start' | 'end', value: string) {
    setSchedule((prev) => ({ ...prev, [day]: { ...(prev[day] || { start: '9:00 AM', end: '5:00 PM' }), [field]: value } }))
  }

  async function saveAvailability() {
    if (!auth) return
    setAvailSaving(true)
    await fetch('/api/team-portal/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ availability: { working_days: workingDays, schedule, blocked_dates: blockedDates } }),
    })
    setAvailSaving(false); setAvailSaved(true)
    setTimeout(() => setAvailSaved(false), 3000)
  }

  function toggleNotifPref(type: string, channel: string) {
    setNotifPrefs((prev) => ({
      ...prev,
      [type]: { ...prev[type], [channel]: !prev[type]?.[channel] },
    }))
  }

  async function savePreferences() {
    if (!auth) return
    setPrefsSaving(true)
    await fetch('/api/team-portal/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({
        notification_preferences: { ...notifPrefs, quiet_start: quietStart, quiet_end: quietEnd },
        sms_consent: smsConsent,
      }),
    })
    setPrefsSaving(false); setPrefsSaved(true)
    setTimeout(() => setPrefsSaved(false), 3000)
  }

  if (!auth) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-slate-400">{t('Loading... / Cargando...', 'Cargando...')}</p>
    </div>
  )

  const allJobs = [...todayJobs, ...upcomingJobs]

  return (
    <div className="pb-24 space-y-4">
      {/* PushPrompt */}
      <PushPrompt role="team_member" userId={auth.member.id} />

      {/* ================ 1. RATE CARD ================ */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium opacity-90">{t('My Rate', 'Mi Tarifa')}</p>
            <p className="text-3xl font-bold mt-1">${payRate}/hr</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium opacity-90">{t('Paid via', 'Pago por')}</p>
            <p className="text-sm mt-1 opacity-90">Zelle / Apple Pay</p>
          </div>
        </div>
      </div>

      {/* ================ 2. TODAY'S POTENTIAL EARNINGS ================ */}
      {todayStats.count > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-sm font-medium text-green-800">{t('Today', 'Hoy')}</p>
          <p className="text-3xl font-bold text-green-700 mt-1">${todayStats.earnings.toFixed(0)}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-green-600">
              {todayStats.hours}hrs {t('scheduled', 'programadas')} &middot; {todayStats.count} {t('jobs', 'trabajos')}
            </p>
            <p className="text-xs text-green-500">{t('Complete all to earn', 'Completa todo para ganar')} &uarr;</p>
          </div>
        </div>
      )}

      {/* ================ 3. EARNINGS SUMMARY ================ */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="font-semibold text-green-900 mb-3">{t('Earnings', 'Ganancias')}</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t('Week', 'Semana'), data: earningsWeek },
            { label: t('Month', 'Mes'), data: earningsMonth },
            { label: t('Year', 'Año'), data: earningsYear },
          ].map((item) => (
            <div key={item.label} className="bg-white border border-green-200 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-400 font-medium">{item.label}</p>
              <p className="text-xl font-bold text-green-600 mt-1">${item.data?.total_earnings?.toFixed(0) || '0'}</p>
              <p className="text-xs text-slate-400 mt-0.5">{item.data?.total_hours?.toFixed(1) || '0'}hrs</p>
            </div>
          ))}
        </div>
      </div>

      {/* ================ 4. AVAILABLE JOBS (Emergency) ================ */}
      {availableJobs.length > 0 && (
        <div className="border-2 border-red-400 rounded-xl overflow-hidden animate-pulse-border">
          <div className="bg-red-50 p-4">
            <p className="font-bold text-red-800 text-sm">
              🚨 {t('Available Now', 'Disponible Ahora')} ({availableJobs.length})
            </p>
            <p className="text-xs text-red-600">{t('First to claim gets it!', '¡El primero en reclamar lo obtiene!')}</p>
          </div>
          <div className="divide-y divide-red-100">
            {availableJobs.map((job) => (
              <div key={job.id} className="p-4 bg-white">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {new Date(job.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      {' '}{formatTime(job.start_time)}
                      {job.end_time && ` — ${formatTime(job.end_time)}`}
                    </p>
                    <p className="text-xs text-slate-400">{job.clients?.name}</p>
                  </div>
                  {job.pay_rate && (
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-green-600">${job.pay_rate}/hr</p>
                      <p className="text-xs text-green-600">{t('Premium Rate!', '¡Tarifa Premium!')}</p>
                    </div>
                  )}
                </div>
                {job.clients?.address && (
                  <p className="text-sm text-slate-500 mb-2">{job.clients.address}</p>
                )}
                {(job.clients?.special_instructions || job.notes) && (
                  <div className="text-sm bg-teal-50/50 border border-teal-200/50 p-2 rounded mb-3">
                    <TranslatedNotes text={[job.clients?.special_instructions, job.notes].filter(Boolean).join('\n\n')} label={t('Notes / Notas', 'Notas')} />
                  </div>
                )}
                <button onClick={() => claimJob(job.id)} disabled={claimingJob === job.id}
                  className="w-full bg-red-600 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">
                  {claimingJob === job.id
                    ? t('Claiming...', 'Reclamando...')
                    : t('🙋 CLAIM THIS JOB', '🙋 RECLAMAR TRABAJO')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================ 5. MY JOBS MAP ================ */}
      <CollapsibleSection title={t('My Jobs Map', 'Mapa de Trabajos')}>
        <JobsMap jobs={allJobs} />
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> {t('Upcoming', 'Próximo')}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> {t('In Progress', 'En Progreso')}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> {t('Done', 'Completado')}</span>
        </div>
      </CollapsibleSection>

      {/* ================ 6. MY AVAILABILITY (Inline) ================ */}
      <CollapsibleSection title={t('My Availability', 'Mi Disponibilidad')}>
        {/* Working Days */}
        <p className="text-xs text-slate-400 font-medium mb-2">{t('Working Days', 'Días de Trabajo')}</p>
        <div className="flex gap-1.5 mb-4">
          {DAYS.map((day) => (
            <button key={day.en} onClick={() => toggleWorkingDay(day.en)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                workingDays.includes(day.en) ? 'bg-slate-800 text-white' : 'bg-gray-100 text-slate-400'
              }`}>
              {t(day.en, day.es)}
            </button>
          ))}
        </div>

        {/* Hours per day */}
        {workingDays.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs text-slate-400 font-medium">{t('Hours', 'Horario')}</p>
            {DAYS.filter((d) => workingDays.includes(d.en)).map((day) => (
              <div key={day.en} className="flex items-center gap-2">
                <span className="text-xs text-slate-600 w-8">{t(day.en, day.es)}</span>
                <select value={schedule[day.en]?.start || '9:00 AM'} onChange={(e) => updateSchedule(day.en, 'start', e.target.value)}
                  className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs">
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <span className="text-xs text-slate-400">—</span>
                <select value={schedule[day.en]?.end || '5:00 PM'} onChange={(e) => updateSchedule(day.en, 'end', e.target.value)}
                  className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs">
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Blocked dates */}
        <p className="text-xs text-slate-400 font-medium mb-2">{t('Days Off', 'Días Libres')}</p>
        <div className="flex gap-2 mb-2">
          <input type="date" value={newBlock} onChange={(e) => setNewBlock(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs" />
          <button onClick={() => { if (newBlock && !blockedDates.includes(newBlock)) { setBlockedDates((p) => [...p, newBlock].sort()); setNewBlock('') } }}
            className="bg-slate-800 text-white px-3 py-1.5 rounded text-xs">{t('Add', 'Agregar')}</button>
        </div>
        {blockedDates.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {blockedDates.map((d) => (
              <span key={d} className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                {new Date(d + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                <button onClick={() => setBlockedDates((p) => p.filter((x) => x !== d))} className="text-red-400 hover:text-red-600">✕</button>
              </span>
            ))}
          </div>
        )}

        <button onClick={saveAvailability} disabled={availSaving}
          className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
          {availSaving ? t('Saving...', 'Guardando...') : availSaved ? t('Saved!', '¡Guardado!') : t('Save Availability', 'Guardar Disponibilidad')}
        </button>
      </CollapsibleSection>

      {/* ================ 7. MY PHOTO ================ */}
      <CollapsibleSection title={t('My Photo', 'Mi Foto')}>
        <div className="flex items-center gap-4">
          {auth.member.avatar_url ? (
            <img src={auth.member.avatar_url} alt={auth.member.name} className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
          ) : (
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-2xl text-slate-400">📷</div>
          )}
          <div>
            <p className="text-xs text-slate-400 mb-2">
              {auth.member.avatar_url ? t('Clients see this photo', 'Los clientes ven esta foto') : t('Upload a smiling photo', 'Sube una foto sonriendo')}
            </p>
            <label className="inline-block bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg cursor-pointer">
              {photoUploading ? t('Uploading...', 'Subiendo...') : auth.member.avatar_url ? t('Change Photo', 'Cambiar Foto') : t('Upload Photo', 'Subir Foto')}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={handlePhotoUpload} className="hidden" disabled={photoUploading} />
            </label>
          </div>
        </div>
      </CollapsibleSection>

      {/* ================ 8. NOTIFICATION PREFERENCES ================ */}
      <CollapsibleSection title={t('Notification Preferences', 'Preferencias de Notificaciones')}>
        {/* SMS Consent */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-slate-800">{t('SMS Messages', 'Mensajes SMS')}</p>
            <p className="text-xs text-slate-400">{t('Reply STOP anytime', 'Responda STOP en cualquier momento')}</p>
          </div>
          <button onClick={() => setSmsConsent(!smsConsent)}
            className={`w-12 h-6 rounded-full transition-colors ${smsConsent ? 'bg-green-500' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${smsConsent ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Per-type preferences */}
        <div className="space-y-3 mb-4">
          {[
            { key: 'job_assignment', en: 'Job Assignment', es: 'Asignación' },
            { key: 'job_reminder', en: 'Reminders', es: 'Recordatorios' },
            { key: 'daily_summary', en: 'Daily Summary', es: 'Resumen' },
            { key: 'job_cancelled', en: 'Cancelled', es: 'Cancelado' },
            { key: 'job_rescheduled', en: 'Rescheduled', es: 'Reprogramado' },
            { key: 'broadcast', en: 'Urgent Jobs', es: 'Urgentes' },
          ].map((type) => (
            <div key={type.key} className="flex items-center justify-between">
              <p className="text-xs text-slate-600">{t(type.en, type.es)}</p>
              <div className="flex gap-1">
                {['push', 'email', 'sms'].map((ch) => (
                  <button key={ch} onClick={() => toggleNotifPref(type.key, ch)}
                    className={`px-2 py-1 rounded text-[10px] font-medium ${
                      notifPrefs[type.key]?.[ch] ? 'bg-slate-800 text-white' : 'bg-gray-100 text-slate-400'
                    }`}>
                    {ch.charAt(0).toUpperCase() + ch.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quiet hours */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-xs font-medium text-slate-600 mb-1">{t('Quiet Hours', 'Horas Silenciosas')}</p>
          <p className="text-[10px] text-slate-400 mb-2">{t('No push notifications / Email & SMS still delivered', 'Sin notificaciones push / Email y SMS aún se entregan')}</p>
          <div className="flex items-center gap-2">
            <select value={quietStart} onChange={(e) => setQuietStart(e.target.value)} className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs">
              {Array.from({ length: 24 }, (_, i) => {
                const val = `${String(i).padStart(2, '0')}:00`
                const label = i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`
                return <option key={val} value={val}>{label}</option>
              })}
            </select>
            <span className="text-xs text-slate-400">—</span>
            <select value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs">
              {Array.from({ length: 24 }, (_, i) => {
                const val = `${String(i).padStart(2, '0')}:00`
                const label = i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`
                return <option key={val} value={val}>{label}</option>
              })}
            </select>
          </div>
        </div>

        <button onClick={savePreferences} disabled={prefsSaving}
          className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
          {prefsSaving ? t('Saving...', 'Guardando...') : prefsSaved ? t('Saved!', '¡Guardado!') : t('Save', 'Guardar')}
        </button>
      </CollapsibleSection>

      {/* ================ 9. CALL / TEXT OFFICE ================ */}
      {tenantPhone && (
        <div className="grid grid-cols-2 gap-3">
          <a href={`tel:${tenantPhone}`} className="flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl py-4 text-sm font-semibold text-slate-800 active:bg-gray-50">
            📞 {t('Call Office', 'Llamar Oficina')}
          </a>
          <a href={`sms:${tenantPhone}`} className="flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl py-4 text-sm font-semibold text-slate-800 active:bg-gray-50">
            💬 {t('Text Office', 'Texto Oficina')}
          </a>
        </div>
      )}

      {/* ================ 10. TODAY'S JOBS ================ */}
      <div>
        <h2 className="font-bold text-slate-800 text-lg mb-1">
          {t("Today's Jobs", 'Trabajos de Hoy')}{' '}
          <span className="text-sm font-normal text-slate-400">({todayJobs.length})</span>
        </h2>
        <p className="text-sm text-slate-400 mb-3">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>

        {todayJobs.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
            <p className="text-lg text-slate-400 mb-1">{t('No jobs today', 'Sin trabajos hoy')}</p>
            <p className="text-sm text-slate-300">{t('Enjoy your day off!', '¡Disfruta tu día libre!')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayJobs.map((job) => (
              <JobCard key={job.id} job={job} t={t} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} onHeadsUp={handleHeadsUp} checkingIn={checkingIn} checkingOut={checkingOut} sendingHeadsUp={sendingHeadsUp} />
            ))}
          </div>
        )}
      </div>

      {/* ================ 11. UPCOMING JOBS ================ */}
      {upcomingJobs.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-800 text-lg mb-3">
            {t('Upcoming', 'Próximos')}{' '}
            <span className="text-sm font-normal text-slate-400">({upcomingJobs.length})</span>
          </h2>
          <div className="space-y-2">
            {upcomingJobs.map((job) => (
              <JobCard key={job.id} job={job} t={t} showDate onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} onHeadsUp={handleHeadsUp} checkingIn={checkingIn} checkingOut={checkingOut} sendingHeadsUp={sendingHeadsUp} />
            ))}
          </div>
        </div>
      )}

      {/* ================ SIDE PANELS ================ */}

      {/* Notifications Panel */}
      <SidePanel open={showNotifPanel} onClose={() => setShowNotifPanel(false)} title={t('Notifications', 'Notificaciones')}>
        {unreadCount > 0 && (
          <button onClick={markAllNotificationsRead} className="text-xs text-blue-600 font-medium mb-4 block">
            {t('Mark all read', 'Marcar todo leído')}
          </button>
        )}
        {notifications.length === 0 ? (
          <p className="text-center text-slate-400 py-8">{t('No notifications', 'Sin notificaciones')}</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className={`p-3 rounded-xl border text-sm ${n.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-start gap-2">
                  <span className="text-lg shrink-0">{NOTIF_ICONS[n.type] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${n.read ? 'text-slate-600' : 'text-slate-800'}`}>{n.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-slate-300 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </SidePanel>

      {/* Guidelines Panel */}
      <SidePanel open={showGuidelines} onClose={() => { setShowGuidelines(false); localStorage.setItem('guidelines_seen_at', new Date().toISOString()) }} title={t('Team Guidelines', 'Reglas del Equipo')}>
        {guidelines ? (
          <div className="space-y-4">
            {guidelines.en && (
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">English</h3>
                <div className="text-sm text-slate-600 whitespace-pre-line">{guidelines.en}</div>
              </div>
            )}
            {guidelines.es && (
              <>
                <hr className="border-gray-200" />
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">Español</h3>
                  <div className="text-sm text-slate-600 whitespace-pre-line">{guidelines.es}</div>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8">{t('No guidelines set', 'Sin reglas establecidas')}</p>
        )}
      </SidePanel>
    </div>
  )
}
