'use client'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import TranslatedNotes from '@/app/site/wash-and-fold-nyc/_components/TranslatedNotes'
import PushPrompt from '@/app/site/wash-and-fold-nyc/_components/PushPrompt'
import SidePanel from '@/app/site/wash-and-fold-nyc/_components/SidePanel'

// Compress image client-side before upload (max 1200px, JPEG quality 0.8)
function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (file.size < 500_000) { resolve(file); return }
    const img = new Image()
    img.onload = () => {
      const MAX = 1200
      let w = img.width, h = img.height
      if (w > MAX || h > MAX) {
        const scale = Math.min(MAX / w, MAX / h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }
      const canvas = document.createElement('canvas')
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

const CleanerJobsMap = dynamic(() => import('@/app/site/wash-and-fold-nyc/_components/CleanerJobsMap'), {
  ssr: false,
  loading: () => <div className="h-[250px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">Loading map...</div>
})

interface Booking {
  id: string
  start_time: string
  end_time: string
  service_type: string
  notes: string | null
  status: string
  check_in_time: string | null
  fifteen_min_alert_time: string | null
  check_out_time: string | null
  cleaner_token: string
  cleaner_pay_rate?: number
  hourly_rate: number | null
  clients: {
    name: string
    phone: string
    address: string
    notes: string | null
  } | null
}

interface AvailableJob {
  id: string
  start_time: string
  end_time: string
  service_type: string
  notes: string | null
  cleaner_pay_rate: number | null
  clients: {
    name: string
    phone: string
    address: string
    notes: string | null
  } | null
}

interface Earnings {
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

interface Schedule {
  [day: string]: { start: string; end: string } | null
}

interface CleanerNotification {
  id: string
  type: string
  title: string
  message: string
  booking_id: string | null
  read: boolean
  created_at: string
}

interface NotificationPreferences {
  job_assignment: { push: boolean; email: boolean; sms: boolean }
  job_reminder: { push: boolean; email: boolean; sms: boolean }
  daily_summary: { push: boolean; email: boolean; sms: boolean }
  job_cancelled: { push: boolean; email: boolean; sms: boolean }
  job_rescheduled: { push: boolean; email: boolean; sms: boolean }
  broadcast: { push: boolean; email: boolean; sms: boolean }
  quiet_start: string
  quiet_end: string
  [key: string]: unknown
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM'
]

export default function TeamDashboardPage() {
  useEffect(() => { document.title = 'My Schedule | The NYC Wash and Fold Service Company' }, []);
  const [cleanerName, setCleanerName] = useState('')
  const [cleanerId, setCleanerId] = useState('')
  const [todayJobs, setTodayJobs] = useState<Booking[]>([])
  const [upcomingJobs, setUpcomingJobs] = useState<Booking[]>([])
  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([])
  const [earnings, setEarnings] = useState<Earnings | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [workingDays, setWorkingDays] = useState<string[]>([])
  const [schedule, setSchedule] = useState<Schedule>({})
  const [unavailableDates, setUnavailableDates] = useState<string[]>([])
  const [newDateOff, setNewDateOff] = useState('')
  const [maxJobsPerDay, setMaxJobsPerDay] = useState<number | null>(null)
  const [savingAvailability, setSavingAvailability] = useState(false)
  const [availabilitySaved, setAvailabilitySaved] = useState(false)
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false)
  const [showMap, setShowMap] = useState(true)
  const [showAvailability, setShowAvailability] = useState(false)
  const [showPhoto, setShowPhoto] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showGuidelines, setShowGuidelines] = useState(false)
  const [guidelinesEn, setGuidelinesEn] = useState('')
  const [guidelinesEs, setGuidelinesEs] = useState('')
  const [guidelinesNew, setGuidelinesNew] = useState(false)
  const [notifications, setNotifications] = useState<CleanerNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [showNotifPrefs, setShowNotifPrefs] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null)
  const [smsConsent, setSmsConsent] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsSaved, setPrefsSaved] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const mapJobs = useMemo(() => [...todayJobs, ...upcomingJobs].map(job => ({
    id: job.id,
    address: job.clients?.address || '',
    clientName: job.clients?.name || 'Unknown',
    time: `${new Date(job.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${new Date(job.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
    status: job.check_out_time ? 'done' as const : job.check_in_time ? 'in_progress' as const : 'upcoming' as const,
  })), [todayJobs, upcomingJobs])

  const loadNotifications = useCallback(async (id: string) => {
    const res = await fetch(`/api/team/notifications?cleaner_id=${id}`)
    if (res.ok) {
      const data = await res.json()
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    }
  }, [])

  const loadPreferences = useCallback(async (id: string) => {
    const res = await fetch(`/api/team/preferences?cleaner_id=${id}`)
    if (res.ok) {
      const data = await res.json()
      setNotifPrefs(data.notification_preferences)
      setSmsConsent(data.sms_consent)
    }
  }, [])

  const loadGuidelines = useCallback(async () => {
    try {
      const res = await fetch('/api/team/guidelines')
      if (res.ok) {
        const data = await res.json()
        setGuidelinesEn(data.en || '')
        setGuidelinesEs(data.es || '')
        // Auto-show if guidelines exist and are newer than last seen
        if (data.en || data.es) {
          const seenAt = localStorage.getItem('guidelines_seen_at')
          const isNew = !seenAt || (data.updated_at && new Date(data.updated_at) > new Date(seenAt))
          if (isNew) {
            setGuidelinesNew(true)
            setShowGuidelines(true)
          }
        }
      }
    } catch {
      // Guidelines fetch failed silently
    }
  }, [])

  useEffect(() => {
    const id = localStorage.getItem('cleaner_id')
    const name = localStorage.getItem('cleaner_name')

    if (!id) {
      router.push('/team')
      return
    }

    setCleanerId(id)
    setCleanerName(name || 'Team Member')
    loadJobs(id)
    loadAvailableJobs()
    loadAvailability(id)
    loadNotifications(id)
    loadPreferences(id)
    loadGuidelines()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll notifications every 60s
  useEffect(() => {
    if (!cleanerId) return
    const interval = setInterval(() => loadNotifications(cleanerId), 60000)
    return () => clearInterval(interval)
  }, [cleanerId, loadNotifications])

  const loadJobs = async (id: string) => {
    const res = await fetch(`/api/team/jobs?cleaner_id=${id}`)
    if (res.ok) {
      const data = await res.json()
      setTodayJobs(data.today)
      setUpcomingJobs(data.upcoming)
      setEarnings(data.earnings)
      setShowMap(data.today.length > 0 || data.upcoming.length > 0)
    }
    setLoading(false)
  }

  const loadAvailableJobs = async () => {
    const res = await fetch('/api/team/available-jobs')
    if (res.ok) {
      setAvailableJobs(await res.json())
    }
  }

  const claimJob = async (jobId: string) => {
    setClaiming(jobId)
    const res = await fetch('/api/team/available-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, cleaner_id: cleanerId })
    })
    const data = await res.json()
    if (res.ok) {
      alert(data.message)
      loadJobs(cleanerId)
      loadAvailableJobs()
    } else {
      alert(data.error)
    }
    setClaiming(null)
  }

  const loadAvailability = async (id: string) => {
    const res = await fetch(`/api/team/availability?cleaner_id=${id}`)
    if (res.ok) {
      const data = await res.json()
      setWorkingDays(data.working_days || [])
      setSchedule(data.schedule || {})
      setUnavailableDates(data.unavailable_dates || [])
      setMaxJobsPerDay(data.max_jobs_per_day || null)
      if (data.photo_url) setPhotoUrl(data.photo_url)
      setAvailabilityLoaded(true)
    }
  }

  const handlePhotoUpload = async (rawFile: File) => {
    setUploadingPhoto(true)
    try {
      const file = await compressImage(rawFile)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('cleaner_id', cleanerId)
      const res = await fetch('/api/cleaners/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setPhotoUrl(data.url)
      } else {
        alert(data.error || 'Failed to upload photo / Error al subir la foto')
      }
    } catch (err) {
      alert('Failed to upload photo: ' + (err instanceof Error ? err.message : 'unknown'))
    }
    setUploadingPhoto(false)
  }

  const saveAvailability = async (overrideDates?: string[]) => {
    if (!availabilityLoaded) return
    setSavingAvailability(true)
    setAvailabilitySaved(false)
    const res = await fetch('/api/team/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cleaner_id: cleanerId,
        working_days: workingDays,
        schedule,
        unavailable_dates: overrideDates ?? unavailableDates,
        max_jobs_per_day: maxJobsPerDay
      })
    })
    if (res.ok) {
      setAvailabilitySaved(true)
      setTimeout(() => setAvailabilitySaved(false), 3000)
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error || 'Error saving / Error al guardar')
    }
    setSavingAvailability(false)
  }

  const toggleDay = (day: string) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter(d => d !== day))
      setSchedule({ ...schedule, [day]: null })
    } else {
      setWorkingDays([...workingDays, day])
      setSchedule({ ...schedule, [day]: { start: '9:00 AM', end: '5:00 PM' } })
    }
  }

  const updateSchedule = (day: string, field: 'start' | 'end', value: string) => {
    const current = schedule[day] || { start: '9:00 AM', end: '5:00 PM' }
    setSchedule({
      ...schedule,
      [day]: {
        start: field === 'start' ? value : current.start,
        end: field === 'end' ? value : current.end
      }
    })
  }

  const addDateOff = () => {
    if (!newDateOff || !availabilityLoaded) return
    const today = new Date().toISOString().split('T')[0]
    if (newDateOff < today) return
    if (!unavailableDates.includes(newDateOff)) {
      const updated = [...unavailableDates, newDateOff].sort()
      setUnavailableDates(updated)
      saveAvailability(updated)
    }
    setNewDateOff('')
  }

  const removeDateOff = (date: string) => {
    const updated = unavailableDates.filter(d => d !== date)
    setUnavailableDates(updated)
    saveAvailability(updated)
  }

  const markAllRead = async () => {
    await fetch('/api/team/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true, cleaner_id: cleanerId })
    })
    setNotifications(notifications.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const savePreferences = async () => {
    setSavingPrefs(true)
    setPrefsSaved(false)
    const res = await fetch('/api/team/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cleaner_id: cleanerId,
        notification_preferences: notifPrefs,
        sms_consent: smsConsent
      })
    })
    if (res.ok) {
      setPrefsSaved(true)
      setTimeout(() => setPrefsSaved(false), 3000)
    } else {
      alert('Error saving / Error al guardar')
    }
    setSavingPrefs(false)
  }

  const togglePref = (type: string, channel: 'push' | 'email' | 'sms') => {
    if (!notifPrefs) return
    const typePref = notifPrefs[type] as { push: boolean; email: boolean; sms: boolean }
    setNotifPrefs({
      ...notifPrefs,
      [type]: { ...typePref, [channel]: !typePref[channel] }
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('cleaner_id')
    localStorage.removeItem('cleaner_name')
    router.push('/team')
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading... / Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1E2A4A] text-white p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-80">The NYC Wash and Fold Service Company</p>
            <h1 className="text-xl font-semibold">{cleanerName}</h1>
          </div>
          <div className="flex items-center gap-3">
            {(guidelinesEn || guidelinesEs) && (
              <button
                onClick={() => { setShowGuidelines(true); setGuidelinesNew(false) }}
                className="relative text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-lg font-medium transition"
              >
                Rules / Reglas
                {guidelinesNew && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-lg">
                    NEW
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => { setShowNotifPanel(true); loadNotifications(cleanerId) }}
              className="relative p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button onClick={handleLogout} className="text-sm opacity-80 hover:opacity-100">
              Log out / Salir
            </button>
          </div>
        </div>
      </div>

      {/* Guidelines Panel */}
      <SidePanel
        open={showGuidelines}
        onClose={() => {
          setShowGuidelines(false)
          localStorage.setItem('guidelines_seen_at', new Date().toISOString())
        }}
        title="Team Guidelines / Reglas del Equipo"
      >
        <div className="space-y-6">
          {guidelinesEn && (
            <div>
              <h3 className="text-sm font-semibold text-[#1E2A4A] mb-2 uppercase tracking-wide">English</h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{guidelinesEn}</div>
            </div>
          )}
          {guidelinesEn && guidelinesEs && (
            <hr className="border-gray-200" />
          )}
          {guidelinesEs && (
            <div>
              <h3 className="text-sm font-semibold text-[#1E2A4A] mb-2 uppercase tracking-wide">Español</h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{guidelinesEs}</div>
            </div>
          )}
        </div>
      </SidePanel>

      {/* Notification Panel */}
      <SidePanel open={showNotifPanel} onClose={() => setShowNotifPanel(false)} title="Notifications / Notificaciones">
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="w-full mb-4 py-2 text-sm text-[#1E2A4A] bg-gray-100 rounded-lg font-medium hover:bg-gray-200"
          >
            Mark all read / Marcar todo leido
          </button>
        )}
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No notifications / Sin notificaciones</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-lg border ${notif.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {notif.type === 'job_assignment' && '📋'}
                        {notif.type === 'job_reminder' && '⏰'}
                        {notif.type === 'daily_summary' && '📊'}
                        {notif.type === 'job_cancelled' && '❌'}
                        {notif.type === 'job_rescheduled' && '📅'}
                        {notif.type === 'broadcast' && '📢'}
                      </span>
                      <p className="text-sm font-semibold text-[#1E2A4A] truncate">{notif.title}</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(notif.created_at)}</p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SidePanel>

      <div className="p-4">
        {/* Push Notifications */}
        {cleanerId && (
          <div className="mb-4">
            <PushPrompt role="cleaner" userId={cleanerId} />
          </div>
        )}

        {/* My Rate */}
        {earnings && (
          <div className="mb-4 bg-[#1E2A4A] text-white rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="text-sm opacity-80">My Rate / Mi Tarifa</p>
              <p className="text-3xl font-bold">${earnings.hourlyRate}<span className="text-lg font-normal">/hr</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">Paid via</p>
              <p className="text-lg font-semibold">Zelle / Apple Pay</p>
              <p className="text-xs opacity-70">hi@washandfoldnyc.com</p>
            </div>
          </div>
        )}

        {/* Today's Potential */}
        {earnings && todayJobs.length > 0 && (
          <div className="mb-4 bg-[#A8F0DC]/20 border border-[#A8F0DC]/30 rounded-xl p-4">
            <p className="text-sm text-[#1E2A4A]/70 font-medium">Today / Hoy</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-bold text-[#1E2A4A]">${earnings.todayPotentialPay.toFixed(0)}</p>
                <p className="text-xs text-[#1E2A4A]">{earnings.todayPotentialHours}hrs scheduled · {todayJobs.length} job{todayJobs.length > 1 ? 's' : ''}</p>
              </div>
              <p className="text-xs text-[#1E2A4A]">Complete all to earn ↑</p>
            </div>
          </div>
        )}

        {/* Earnings Summary */}
        {earnings && (
          <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4">
            <h2 className="text-sm font-medium text-green-800 mb-3">💰 Earnings / Ganancias</h2>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-lg p-3 shadow-sm text-center">
                <p className="text-xs text-gray-500">Week</p>
                <p className="text-xl font-bold text-green-700">${earnings.weeklyPay.toFixed(0)}</p>
                <p className="text-xs text-gray-400">{earnings.weeklyHours}hrs</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm text-center">
                <p className="text-xs text-gray-500">Month</p>
                <p className="text-xl font-bold text-green-700">${earnings.monthlyPay.toFixed(0)}</p>
                <p className="text-xs text-gray-400">{earnings.monthlyHours}hrs</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm text-center">
                <p className="text-xs text-gray-500">Year</p>
                <p className="text-xl font-bold text-green-700">${earnings.yearlyPay.toFixed(0)}</p>
                <p className="text-xs text-gray-400">{earnings.yearlyHours}hrs</p>
              </div>
            </div>
          </div>
        )}

        {/* My Jobs Map */}
        <div className="mb-6">
          <button
            onClick={() => setShowMap(!showMap)}
            className="w-full flex justify-between items-center bg-white border border-gray-200 rounded-xl p-4"
          >
            <span className="font-semibold text-[#1E2A4A]">My Jobs Map / Mapa de Trabajos</span>
            <span className="text-gray-400">{showMap ? '▲' : '▼'}</span>
          </button>

          {showMap && (
            <div className="mt-2 bg-white border border-gray-200 rounded-xl p-3">
              <CleanerJobsMap jobs={mapJobs} />
              <div className="flex items-center gap-4 mt-2 px-1">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-500">Upcoming</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-500">In Progress</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span className="text-xs text-gray-500">Done</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* My Availability */}
        <div className="mb-6">
          <button
            onClick={() => setShowAvailability(!showAvailability)}
            className="w-full flex justify-between items-center bg-white border border-gray-200 rounded-xl p-4"
          >
            <span className="font-semibold text-[#1E2A4A]">My Availability / Mi Disponibilidad</span>
            <span className="text-gray-400">{showAvailability ? '▲' : '▼'}</span>
          </button>

          {showAvailability && (
            <div className="mt-2 bg-white border border-gray-200 rounded-xl p-4 space-y-4">
              {/* Day toggles */}
              <div>
                <p className="text-sm font-medium text-[#1E2A4A] mb-2">Working Days / Días Laborales</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        workingDays.includes(day)
                          ? 'bg-[#1E2A4A] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-day times */}
              {workingDays.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#1E2A4A]">Hours / Horario</p>
                  {DAYS.filter(d => workingDays.includes(d)).map(day => (
                    <div key={day} className="flex items-center gap-2">
                      <span className="w-10 text-sm font-medium text-[#1E2A4A]">{day}</span>
                      <select
                        value={schedule[day]?.start || '9:00 AM'}
                        onChange={(e) => updateSchedule(day, 'start', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-[#1E2A4A] bg-white"
                      >
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="text-gray-400 text-sm">to</span>
                      <select
                        value={schedule[day]?.end || '5:00 PM'}
                        onChange={(e) => updateSchedule(day, 'end', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-[#1E2A4A] bg-white"
                      >
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* Max jobs per day */}
              <div>
                <p className="text-sm font-medium text-[#1E2A4A] mb-2">Max Jobs Per Day / Máx Trabajos Por Día</p>
                <select
                  value={maxJobsPerDay || ''}
                  onChange={(e) => setMaxJobsPerDay(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] bg-white"
                >
                  <option value="">No limit / Sin límite</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>

              {/* Days off */}
              <div>
                <p className="text-sm font-medium text-[#1E2A4A] mb-2">Days Off / Días Libres</p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="date"
                    value={newDateOff}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewDateOff(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]"
                  />
                  <button
                    type="button"
                    onClick={addDateOff}
                    className="px-4 py-2 bg-gray-100 text-[#1E2A4A] rounded-lg font-medium hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
                {unavailableDates.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {unavailableDates.map(date => (
                      <span key={date} className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm">
                        {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        <button onClick={() => removeDateOff(date)} className="ml-1 text-red-400 hover:text-red-600 font-bold">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Save */}
              <button
                onClick={() => saveAvailability()}
                disabled={savingAvailability || !availabilityLoaded}
                className="w-full py-3 bg-[#1E2A4A] text-white font-semibold rounded-lg disabled:opacity-50"
              >
                {savingAvailability ? 'Saving... / Guardando...' : availabilitySaved ? 'Saved! / Guardado!' : 'Save Availability / Guardar Disponibilidad'}
              </button>
            </div>
          )}
        </div>

        {/* My Photo */}
        <div className="mb-6">
          <button
            onClick={() => setShowPhoto(!showPhoto)}
            className="w-full flex justify-between items-center bg-white border border-gray-200 rounded-xl p-4"
          >
            <span className="font-semibold text-[#1E2A4A]">My Photo / Mi Foto</span>
            <span className="text-gray-400">{showPhoto ? '▲' : '▼'}</span>
          </button>

          {showPhoto && (
            <div className="mt-2 bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex flex-col items-center gap-4">
                {photoUrl ? (
                  <img src={photoUrl} alt="My photo" className="w-24 h-24 rounded-full object-cover border-2 border-gray-300" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <span className="text-3xl text-gray-400">📷</span>
                  </div>
                )}
                <p className="text-sm text-gray-500 text-center">
                  {photoUrl ? 'Clients see this photo / Los clientes ven esta foto' : 'Upload a smiling photo / Sube una foto sonriendo'}
                </p>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="px-4 py-2 bg-[#1E2A4A] text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {uploadingPhoto ? 'Uploading... / Subiendo...' : photoUrl ? 'Change Photo / Cambiar Foto' : 'Upload Photo / Subir Foto'}
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handlePhotoUpload(file)
                    e.target.value = ''
                  }}
                  className="hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        <div className="mb-6">
          <button
            onClick={() => setShowNotifPrefs(!showNotifPrefs)}
            className="w-full flex justify-between items-center bg-white border border-gray-200 rounded-xl p-4"
          >
            <span className="font-semibold text-[#1E2A4A]">Notifications / Notificaciones</span>
            <span className="text-gray-400">{showNotifPrefs ? '▲' : '▼'}</span>
          </button>

          {showNotifPrefs && notifPrefs && (
            <div className="mt-2 bg-white border border-gray-200 rounded-xl p-4 space-y-4">
              {/* SMS Consent */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#1E2A4A]">SMS Messages</p>
                  <p className="text-xs text-gray-500">Reply STOP anytime / Responda STOP en cualquier momento</p>
                </div>
                <button
                  onClick={() => setSmsConsent(!smsConsent)}
                  className={`relative w-11 h-6 rounded-full transition ${smsConsent ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${smsConsent ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Per-type toggles */}
              <div>
                <p className="text-sm font-medium text-[#1E2A4A] mb-2">Notification Types / Tipos</p>
                <div className="space-y-2">
                  {[
                    { key: 'job_assignment', label: 'Job Assignment / Asignacion' },
                    { key: 'job_reminder', label: 'Reminders / Recordatorios' },
                    { key: 'daily_summary', label: 'Daily Summary / Resumen' },
                    { key: 'job_cancelled', label: 'Cancelled / Cancelado' },
                    { key: 'job_rescheduled', label: 'Rescheduled / Reprogramado' },
                    { key: 'broadcast', label: 'Urgent Jobs / Urgentes' },
                  ].map(({ key, label }) => {
                    const pref = notifPrefs[key] as { push: boolean; email: boolean; sms: boolean }
                    if (!pref) return null
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <p className="text-xs text-gray-700 flex-1">{label}</p>
                        <div className="flex gap-1">
                          {(['push', 'email', 'sms'] as const).map(ch => (
                            <button
                              key={ch}
                              onClick={() => togglePref(key, ch)}
                              className={`px-2 py-0.5 text-xs rounded font-medium ${
                                pref[ch]
                                  ? 'bg-[#1E2A4A] text-white'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {ch === 'push' ? 'Push' : ch === 'email' ? 'Email' : 'SMS'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Quiet Hours */}
              <div>
                <p className="text-sm font-medium text-[#1E2A4A] mb-1">Quiet Hours / Horas Silenciosas</p>
                <p className="text-xs text-gray-500 mb-2">No push notifications / Email & SMS still delivered</p>
                <div className="flex items-center gap-2">
                  <select
                    value={notifPrefs.quiet_start || '22:00'}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, quiet_start: e.target.value })}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-[#1E2A4A] bg-white"
                  >
                    {Array.from({ length: 24 }, (_, i) => {
                      const h = String(i).padStart(2, '0')
                      return <option key={h} value={`${h}:00`}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}</option>
                    })}
                  </select>
                  <span className="text-gray-400 text-sm">to</span>
                  <select
                    value={notifPrefs.quiet_end || '07:00'}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, quiet_end: e.target.value })}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-[#1E2A4A] bg-white"
                  >
                    {Array.from({ length: 24 }, (_, i) => {
                      const h = String(i).padStart(2, '0')
                      return <option key={h} value={`${h}:00`}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}</option>
                    })}
                  </select>
                </div>
              </div>

              {/* Save */}
              <button
                onClick={savePreferences}
                disabled={savingPrefs}
                className="w-full py-3 bg-[#1E2A4A] text-white font-semibold rounded-lg disabled:opacity-50"
              >
                {savingPrefs ? 'Saving... / Guardando...' : prefsSaved ? 'Saved! / Guardado!' : 'Save / Guardar'}
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-6 flex gap-2">
          <a href="tel:9179706002" className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-center font-medium text-[#1E2A4A]">
            📞 Call Office
          </a>
          <a href="sms:9179706002" className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-center font-medium text-[#1E2A4A]">
            💬 Text Office
          </a>
        </div>

        {/* Available Jobs - Emergency/Same Day */}
        {availableJobs.length > 0 && (
          <div className="mb-6">
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 animate-pulse">
              <h2 className="text-lg font-bold text-red-700 mb-3">🚨 Available Now / Disponible Ahora ({availableJobs.length})</h2>
              <p className="text-sm text-red-600 mb-4">First to claim gets it! / ¡El primero en reclamar lo obtiene!</p>
              <div className="space-y-3">
                {availableJobs.map((job) => (
                  <div key={job.id} className="bg-white rounded-lg p-4 border border-red-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-[#1E2A4A]">{new Date(job.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                        <p className="text-gray-600">{new Date(job.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {new Date(job.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">${job.cleaner_pay_rate || 40}/hr</p>
                        <p className="text-xs text-green-600">Premium Rate!</p>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-1">{job.clients?.name}</p>
                    <p className="text-sm text-gray-500 mb-3">{job.clients?.address}</p>
                    {(job.clients?.notes || job.notes) && (
                      <div className="text-sm text-[#1E2A4A]/70 bg-[#A8F0DC]/20 p-2 rounded mb-3">
                        <TranslatedNotes text={[job.clients?.notes, job.notes].filter(Boolean).join('\n\n')} label="Notes / Notas" />
                      </div>
                    )}
                    <button
                      onClick={() => claimJob(job.id)}
                      disabled={claiming === job.id}
                      className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {claiming === job.id ? 'Claiming... / Reclamando...' : '🙋 CLAIM THIS JOB / RECLAMAR'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Today's Jobs */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#1E2A4A] mb-3">Today / Hoy ({todayJobs.length})</h2>
          {todayJobs.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-gray-500 border border-gray-200">
              No jobs scheduled for today / No hay trabajos para hoy
            </div>
          ) : (
            <div className="space-y-3">
              {todayJobs.map((job) => (
                <JobCard key={job.id} job={job} onUpdate={() => loadJobs(cleanerId)} />
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Jobs */}
        <div>
          <h2 className="text-lg font-semibold text-[#1E2A4A] mb-3">Upcoming / Próximos</h2>
          {upcomingJobs.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-gray-500 border border-gray-200">
              No upcoming jobs / No hay trabajos próximos
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingJobs.map((job) => (
                <JobCard key={job.id} job={job} onUpdate={() => loadJobs(cleanerId)} showDate />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function JobCard({ job, onUpdate, showDate }: { job: Booking; onUpdate: () => void; showDate?: boolean }) {
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [alertsSent, setAlertsSent] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)
  const [runningLate, setRunningLate] = useState(false)
  const [lateSent, setLateSent] = useState(false)
  const [lateEta, setLateEta] = useState('15')

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const getLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  const handleCheckIn = async () => {
    setCheckingIn(true)
    const location = await getLocation()
    await fetch(`/api/team/${job.cleaner_token}/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location })
    })
    onUpdate()
    setCheckingIn(false)
  }

  const handleCheckOut = async () => {
    setCheckingOut(true)
    const location = await getLocation()
    await fetch(`/api/team/${job.cleaner_token}/check-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location })
    })
    onUpdate()
    setCheckingOut(false)
  }

  const isCheckedIn = !!job.check_in_time
  const isCheckedOut = !!job.check_out_time

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex justify-between items-start">
          <div>
            {showDate && <p className="text-sm text-gray-500 mb-1">{formatDate(job.start_time)}</p>}
            <p className="font-semibold text-[#1E2A4A]">{formatTime(job.start_time)} - {formatTime(job.end_time)}</p>
            <p className="text-gray-600">{job.clients?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {isCheckedOut ? (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Done / Listo</span>
            ) : isCheckedIn ? (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">In Progress / En Progreso</span>
            ) : (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">Upcoming / Próximo</span>
            )}
            <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Address / Dirección</p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(job.clients?.address || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1E2A4A] underline"
              >
                {job.clients?.address || 'N/A'}
              </a>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone / Teléfono</p>
              <a href={`tel:${job.clients?.phone}`} className="text-[#1E2A4A] underline">
                {job.clients?.phone || 'N/A'}
              </a>
            </div>
            <div>
              <p className="text-sm text-gray-500">Service / Servicio</p>
              <p className="text-[#1E2A4A]">{job.service_type}</p>
            </div>
            {/* Notes - combined client + admin */}
            {(() => {
              const allNotes = [job.clients?.notes, job.notes].filter(Boolean).join('\n\n')
              return (
                <div className={`p-4 rounded-xl border-2 ${allNotes ? 'bg-[#A8F0DC]/20 border-[#A8F0DC]/30' : 'bg-gray-50 border-gray-200'}`}>
                  {allNotes ? (
                    <TranslatedNotes text={allNotes} label="Notes / Notas" />
                  ) : (
                    <>
                      <p className="text-sm font-semibold mb-1 text-[#1E2A4A]">Notes / Notas</p>
                      <p className="text-base text-gray-400 italic">No notes / Sin notas</p>
                    </>
                  )}
                </div>
              )
            })()}

            {/* Status */}
            {isCheckedIn && (
              <p className="text-green-600 text-sm">✓ Checked in at / Entrada a las {formatTime(job.check_in_time!)}</p>
            )}
            {isCheckedOut && (
              <p className="text-green-600 text-sm">✓ Checked out at / Salida a las {formatTime(job.check_out_time!)}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(job.clients?.address || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 bg-gray-100 text-[#1E2A4A] text-center font-medium rounded-lg text-sm"
              >
                📍 Navigate
              </a>
              <a
                href={`tel:${job.clients?.phone}`}
                className="flex-1 py-2 bg-gray-100 text-[#1E2A4A] text-center font-medium rounded-lg text-sm"
              >
                📞 Call
              </a>
              <a
                href={`sms:${job.clients?.phone}`}
                className="flex-1 py-2 bg-gray-100 text-[#1E2A4A] text-center font-medium rounded-lg text-sm"
              >
                💬 Text
              </a>
            </div>

            {/* Running Late + Check In/Out */}
            {!isCheckedIn && !isCheckedOut && (
              <div className="space-y-2">
                {!lateSent && !runningLate && (
                  <button onClick={() => setRunningLate(true)} className="w-full py-2.5 border-2 border-yellow-400 bg-yellow-50 text-yellow-800 font-semibold rounded-lg">
                    Running Late / Voy Tarde
                  </button>
                )}
                {runningLate && !lateSent && (
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-yellow-800">How many minutes? / ¿Cuántos minutos?</p>
                    <div className="flex gap-2">
                      {['10', '15', '20', '30'].map(m => (
                        <button key={m} onClick={() => setLateEta(m)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${lateEta === m ? 'bg-yellow-500 text-white' : 'bg-white border border-yellow-300 text-yellow-800'}`}>{m}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setRunningLate(false)} className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm">Cancel</button>
                      <button onClick={async () => {
                        const cleanerId = localStorage.getItem('cleaner_id')
                        await fetch('/api/team/running-late', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: job.id, cleanerId, eta: parseInt(lateEta) }) })
                        setLateSent(true)
                        setRunningLate(false)
                      }} className="flex-1 py-2 bg-yellow-500 text-white rounded-lg text-sm font-bold">Send / Enviar</button>
                    </div>
                  </div>
                )}
                {lateSent && (
                  <div className="w-full py-2.5 bg-yellow-100 text-yellow-700 font-medium rounded-lg text-center text-sm">
                    ✓ Client & admin notified / Cliente y admin notificados
                  </div>
                )}
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  {checkingIn ? 'Checking In... / Registrando...' : 'Check In / Registrar Entrada'}
                </button>
              </div>
            )}
            {isCheckedIn && !isCheckedOut && (
              <>
                {alertsSent.has(job.id) ? (
                  <div className="w-full py-3 bg-green-100 text-green-700 font-bold rounded-lg text-center">
                    ✓ Text & notification sent / Texto y aviso enviados
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/team/15min-alert', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ bookingId: job.id }),
                        })
                        if (!res.ok) throw new Error('Failed')
                        setAlertsSent(prev => new Set(prev).add(job.id))
                      } catch {
                        alert('Error sending / Error al enviar')
                      }
                    }}
                    className="w-full py-3 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600"
                  >
                    30-Min Heads Up / Aviso de 30 Min
                  </button>
                )}
                <button
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                  className="w-full py-3 bg-red-600 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  {checkingOut ? 'Checking Out... / Registrando...' : 'Check Out / Registrar Salida'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
