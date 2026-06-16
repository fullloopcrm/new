// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

interface ScheduleIssue {
  id: string
  type: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  booking_id: string | null
  date: string | null
  status: string
  created_at: string
}

const MapComponent = dynamic(() => import('@/app/site/wash-and-fold-nyc/_components/DashboardMap'), { 
  ssr: false,
  loading: () => <div className="h-[250px] md:h-[400px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">Loading map...</div>
})

interface Booking {
  id: string
  start_time: string
  end_time: string
  service_type: string
  status: string
  price: number
  payment_status: string
  clients: { name: string; address: string } | null
  cleaners: { name: string } | null
}

interface MapJob {
  id: string
  start_time: string
  status: string
  service_type: string
  cleaner_id: string | null
  clients: { name: string; address: string } | null
  cleaners: { name: string } | null
}

interface Cleaner {
  id: string
  name: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [todayJobs, setTodayJobs] = useState<Booking[]>([])
  const [upcomingJobs, setUpcomingJobs] = useState<Booking[]>([])
  const [allJobs, setAllJobs] = useState<Booking[]>([])
  const [stats, setStats] = useState({ scheduled: 0, completed: 0, pending_payment: 0 })
  const [clients, setClients] = useState({ total: 0, newThisMonth: 0 })
  const [mapJobs, setMapJobs] = useState<{ today: MapJob[], week: MapJob[], month: MapJob[] }>({ today: [], week: [], month: [] })
  const [mapView, setMapView] = useState<'today' | 'week' | 'month'>('month')
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all')
  const [cleanerFilter, setCleanerFilter] = useState<string>('all')
  const [cleanersList, setCleanersList] = useState<Cleaner[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduleIssues, setScheduleIssues] = useState<ScheduleIssue[]>([])

  const loadIssues = async () => {
    const res = await fetch('/api/admin/schedule-issues')
    if (res.ok) setScheduleIssues(await res.json())
  }

  const resolveIssue = async (id: string, status: 'resolved' | 'dismissed') => {
    await fetch('/api/admin/schedule-issues', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setScheduleIssues(prev => prev.filter(i => i.id !== id))
  }
  const [showJobsModal, setShowJobsModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalJobs, setModalJobs] = useState<Booking[]>([])

  // Check auth on mount + auto-refresh every 60s
  useEffect(() => {
    loadDashboardInitial()
    loadIssues()
    const interval = setInterval(() => {
      if (authed) { loadDashboard(); loadIssues() }
    }, 60000)
    return () => clearInterval(interval)
  }, [authed])

  const loadDashboardInitial = () => {
    fetch('/api/dashboard').then(res => {
      if (res.ok) {
        setAuthed(true)
        res.json().then(data => {
          setTodayJobs(data.todayJobs || [])
          setUpcomingJobs(data.upcomingBookings || [])
          setAllJobs(data.allJobs || [])
          setStats(data.stats || { scheduled: 0, completed: 0, pending_payment: 0 })
          setClients(data.clients || { total: 0, newThisMonth: 0 })
          setMapJobs(data.mapJobs || { today: [], week: [], month: [] })
          setCleanersList(data.cleaners || [])
          setLoading(false)
        })
      } else {
        setAuthed(false)
        setLoading(false)
      }
    }).catch(() => {
      setAuthed(false)
      setLoading(false)
    })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (attempts >= 5) {
      setLoginError('Too many attempts. Please wait 5 minutes.')
      return
    }
    setLoginLoading(true)
    setLoginError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password })
    })
    if (res.ok) {
      setAuthed(true)
      setLoading(true)
      window.dispatchEvent(new Event('admin-auth-change'))
      loadDashboard()
    } else {
      setAttempts(prev => prev + 1)
      setLoginError(`Invalid email or PIN. ${5 - attempts - 1} attempts remaining.`)
    }
    setLoginLoading(false)
  }

  const loadDashboard = async () => {
    const res = await fetch('/api/dashboard')
    if (res.ok) {
      const data = await res.json()
      setTodayJobs(data.todayJobs || [])
      setUpcomingJobs(data.upcomingBookings || [])
      setAllJobs(data.allJobs || [])
      setStats(data.stats || { scheduled: 0, completed: 0, pending_payment: 0 })
      setClients(data.clients || { total: 0, newThisMonth: 0 })
      setMapJobs(data.mapJobs || { today: [], week: [], month: [] })
      setCleanersList(data.cleaners || [])
    }
    setLoading(false)
  }

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const formatMoney = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const currentMapJobs = (mapJobs[mapView] || []).filter(job =>
    (statusFilter === 'all' || job.status === statusFilter) &&
    (cleanerFilter === 'all' || job.cleaner_id === cleanerFilter)
  )

  const getStatusCounts = () => {
    const jobs = (mapJobs[mapView] || []).filter(j => cleanerFilter === 'all' || j.cleaner_id === cleanerFilter)
    return {
      all: jobs.length,
      scheduled: jobs.filter(j => j.status === 'scheduled').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length
    }
  }
  const statusCounts = getStatusCounts()

  // Date helpers
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
  const startOfWeek = new Date(startOfDay)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // COLLECTED (completed + paid)
  const getCollected = (start: Date, end: Date) => {
    const jobs = allJobs.filter(j => {
      const d = new Date(j.start_time)
      return d >= start && d <= end && j.status === 'completed' && j.payment_status === 'paid'
    })
    return { jobs, revenue: jobs.reduce((sum, j) => sum + (j.price || 0), 0) }
  }

  const collectedToday = getCollected(startOfDay, endOfDay)
  const collectedWeek = getCollected(startOfWeek, endOfWeek)
  const collectedMonth = getCollected(startOfMonth, endOfMonth)

  // TO COLLECT (completed but unpaid)
  const toCollect = allJobs.filter(j => j.status === 'completed' && j.payment_status === 'pending')
  const toCollectRevenue = toCollect.reduce((sum, j) => sum + (j.price || 0), 0)

  // ANNUAL REVENUE (Jan 1 - Dec 31, completed + paid)
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
  const collectedAnnual = getCollected(startOfYear, endOfYear)

  // PROJECTED: Jan ($6K) + all scheduled 2026 bookings
  const januaryActual = 600000 // $6,000 in cents

  // All 2026 scheduled/completed jobs (Feb-Dec from database)
  const all2026Jobs = allJobs.filter(j => {
    const d = new Date(j.start_time)
    return d >= startOfYear && d <= endOfYear && ['scheduled', 'confirmed', 'completed'].includes(j.status)
  })
  const scheduled2026Total = all2026Jobs.reduce((sum, j) => sum + (j.price || 0), 0)

  // Projected = Jan $6K + all booked jobs (grows as more bookings added)
  const projectedRevenue = januaryActual + scheduled2026Total

  // SCHEDULED (all active jobs — pending, scheduled, confirmed, completed)
  const getScheduled = (start: Date, end: Date) => {
    const jobs = allJobs.filter(j => {
      const d = new Date(j.start_time)
      return d >= start && d < end && ['pending', 'scheduled', 'confirmed', 'completed'].includes(j.status)
    })
    return { jobs, revenue: jobs.reduce((sum, j) => sum + (j.price || 0), 0) }
  }

  const scheduledToday = getScheduled(startOfDay, endOfDay)
  const scheduledWeek = getScheduled(startOfWeek, endOfWeek)
  const scheduledMonth = getScheduled(startOfMonth, endOfMonth)

  // Forecast next 4 months
  const getForecast = () => {
    const months = []
    for (let i = 1; i <= 10; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0, 23, 59, 59)
      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' })
      
      const jobs = allJobs.filter(j => {
        const d = new Date(j.start_time)
        return d >= monthStart && d <= monthEnd && ['scheduled', 'confirmed'].includes(j.status)
      })
      
      months.push({ name: monthName, jobs, revenue: jobs.reduce((sum, j) => sum + (j.price || 0), 0), monthStart, monthEnd })
    }
    return months
  }
  const forecast = getForecast()

  const openJobsModal = (title: string, jobs: Booking[]) => {
    setModalTitle(title)
    setModalJobs(jobs)
    setShowJobsModal(true)
  }

  // Loading state
  if (authed === null) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-400">Loading...</p></div>
  }

  // Login form
  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-[#1E2A4A]">The NYC Wash and Fold Service Company</h1>
              <p className="text-gray-500 mt-1">Admin Portal</p>
            </div>
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] focus:ring-2 focus:ring-[#1E2A4A] outline-none"
                  placeholder="Email address"
                  disabled={attempts >= 5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] focus:ring-2 focus:ring-[#1E2A4A] outline-none"
                  placeholder="Password or PIN"
                  disabled={attempts >= 5}
                />
              </div>
              {loginError && <p className="mt-3 text-red-600 text-sm text-center">{loginError}</p>}
              <button
                type="submit"
                disabled={loginLoading || attempts >= 5}
                className="w-full mt-4 py-3 bg-[#1E2A4A] text-white font-semibold rounded-lg hover:bg-[#1E2A4A]/90 disabled:opacity-50"
              >
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">Owner PIN login still works — leave email blank</p>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <main className="p-3 md:p-6 max-w-7xl mx-auto">

        {/* SCHEDULE ISSUES */}
        {scheduleIssues.length > 0 && (
          <div className="mb-4 md:mb-6">
            <h2 className="text-sm font-semibold text-red-600 mb-2">
              {scheduleIssues.filter(i => i.severity === 'critical').length > 0 ? '🚨' : '⚠️'} SCHEDULE ISSUES ({scheduleIssues.length})
            </h2>
            <div className="space-y-2">
              {scheduleIssues.slice(0, 10).map(issue => (
                <div key={issue.id} className={`flex items-start justify-between gap-3 rounded-xl px-4 py-3 border ${
                  issue.severity === 'critical' ? 'bg-red-50 border-red-200' : issue.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        issue.severity === 'critical' ? 'bg-red-200 text-red-800' : issue.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-200 text-blue-800'
                      }`}>{issue.severity}</span>
                      <span className="text-[10px] text-gray-400">{issue.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-[#1E2A4A] font-medium">{issue.message}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {issue.booking_id && (
                      <button onClick={() => router.push(`/admin/bookings?edit=${issue.booking_id}`)} className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-[#1E2A4A]">View</button>
                    )}
                    <button onClick={() => resolveIssue(issue.id, 'resolved')} className="px-2.5 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Resolve</button>
                    <button onClick={() => resolveIssue(issue.id, 'dismissed')} className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COLLECTED + TO COLLECT ROW */}
        <div className="mb-4 md:mb-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-2 md:mb-3">💰 REVENUE</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-4">
            <button onClick={() => openJobsModal('Today - Collected', collectedToday.jobs)} className="bg-green-50 rounded-xl px-3 md:px-4 py-2 shadow-sm border border-green-100 text-left hover:shadow-md transition">
              <p className="text-green-600 text-xs md:text-sm">Today</p>
              <p className="text-xl md:text-2xl font-bold text-green-700">{formatMoney(collectedToday.revenue)}</p>
            </button>
            <button onClick={() => openJobsModal('This Week - Collected', collectedWeek.jobs)} className="bg-green-50 rounded-xl px-3 md:px-4 py-2 shadow-sm border border-green-100 text-left hover:shadow-md transition">
              <p className="text-green-600 text-xs md:text-sm">Week</p>
              <p className="text-xl md:text-2xl font-bold text-green-700">{formatMoney(collectedWeek.revenue)}</p>
            </button>
            <button onClick={() => openJobsModal('This Month - Collected', collectedMonth.jobs)} className="bg-green-50 rounded-xl px-3 md:px-4 py-2 shadow-sm border border-green-100 text-left hover:shadow-md transition">
              <p className="text-green-600 text-xs md:text-sm">Month</p>
              <p className="text-xl md:text-2xl font-bold text-green-700">{formatMoney(collectedMonth.revenue)}</p>
            </button>
            <button onClick={() => openJobsModal('To Collect', toCollect)} className="bg-yellow-50 rounded-xl px-3 md:px-4 py-2 shadow-sm border border-yellow-200 text-left hover:shadow-md transition">
              <p className="text-yellow-700 text-xs md:text-sm">Owed</p>
              <p className="text-xl md:text-2xl font-bold text-yellow-700">{formatMoney(toCollectRevenue)}</p>
            </button>
            <button onClick={() => openJobsModal(`2026 Annual Revenue`, all2026Jobs)} className="col-span-2 md:col-span-3 bg-emerald-50 rounded-xl px-3 md:px-4 py-2 shadow-sm border border-emerald-200 text-left hover:shadow-md transition">
              <p className="text-emerald-700 text-xs md:text-sm">2026 ({all2026Jobs.length} jobs booked)</p>
              <p className="text-xl md:text-2xl font-bold text-emerald-700">
                {formatMoney(collectedAnnual.revenue)} <span className="text-emerald-400 font-normal">/</span> <span className="text-emerald-500">{formatMoney(projectedRevenue)}</span>
              </p>
            </button>
          </div>
        </div>

        {/* SCHEDULED ROW */}
        <div className="mb-4 md:mb-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-2 md:mb-3">📅 SCHEDULED (Upcoming)</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0">
            <button onClick={() => openJobsModal('Today - Scheduled', scheduledToday.jobs)} className="flex-shrink-0 w-[120px] md:w-auto md:flex-1 bg-[#A8F0DC]/20 rounded-xl p-3 shadow-sm border border-[#A8F0DC]/30 text-left hover:shadow-md transition">
              <p className="text-[#1E2A4A] text-xs">Today</p>
              <p className="text-lg font-bold text-[#1E2A4A]/70">{formatMoney(scheduledToday.revenue)}</p>
              <p className="text-xs text-[#1E2A4A]/70">{scheduledToday.jobs.length} jobs</p>
            </button>
            <button onClick={() => openJobsModal('This Week - Scheduled', scheduledWeek.jobs)} className="flex-shrink-0 w-[120px] md:w-auto md:flex-1 bg-[#A8F0DC]/20 rounded-xl p-3 shadow-sm border border-[#A8F0DC]/30 text-left hover:shadow-md transition">
              <p className="text-[#1E2A4A] text-xs">Week</p>
              <p className="text-lg font-bold text-[#1E2A4A]/70">{formatMoney(scheduledWeek.revenue)}</p>
              <p className="text-xs text-[#1E2A4A]/70">{scheduledWeek.jobs.length} jobs</p>
            </button>
            <button onClick={() => openJobsModal('This Month - Scheduled', scheduledMonth.jobs)} className="flex-shrink-0 w-[120px] md:w-auto md:flex-1 bg-[#A8F0DC]/20 rounded-xl p-3 shadow-sm border border-[#A8F0DC]/30 text-left hover:shadow-md transition">
              <p className="text-[#1E2A4A] text-xs">Month</p>
              <p className="text-lg font-bold text-[#1E2A4A]/70">{formatMoney(scheduledMonth.revenue)}</p>
              <p className="text-xs text-[#1E2A4A]/70">{scheduledMonth.jobs.length} jobs</p>
            </button>
            {forecast.map((m) => (
              <button key={m.name} onClick={() => openJobsModal(`${m.name} - Scheduled`, m.jobs)} className="flex-shrink-0 w-[120px] md:w-auto md:flex-1 bg-indigo-50 rounded-xl p-3 shadow-sm border border-indigo-100 text-left hover:shadow-md transition">
                <p className="text-indigo-600 text-xs">{m.name}</p>
                <p className="text-lg font-bold text-indigo-700">{formatMoney(m.revenue)}</p>
                <p className="text-xs text-indigo-500">{m.jobs.length} jobs</p>
              </button>
            ))}
          </div>
        </div>

        {/* STATS ROW */}
        <div className="mb-4 md:mb-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-2 md:mb-3">📊 OVERVIEW</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <div className="bg-[#A8F0DC]/20 rounded-xl p-3 md:p-4 border border-[#A8F0DC]/30">
              <p className="text-[#1E2A4A] text-xs md:text-sm">Scheduled</p>
              <p className="text-xl md:text-2xl font-bold text-[#1E2A4A]/70">{stats.scheduled}</p>
              <p className="text-xs text-[#1E2A4A]/70">upcoming</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 md:p-4 border border-green-100">
              <p className="text-green-600 text-xs md:text-sm">Completed</p>
              <p className="text-xl md:text-2xl font-bold text-green-700">{stats.completed}</p>
              <p className="text-xs text-green-500">last 30 days</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 md:p-4 border border-purple-100">
              <p className="text-purple-600 text-xs md:text-sm">Total Clients</p>
              <p className="text-xl md:text-2xl font-bold text-purple-700">{clients.total}</p>
              <p className="text-xs text-purple-500">all time</p>
            </div>
            <div className="bg-pink-50 rounded-xl p-3 md:p-4 border border-pink-100">
              <p className="text-pink-600 text-xs md:text-sm">New Clients</p>
              <p className="text-xl md:text-2xl font-bold text-pink-700">{clients.newThisMonth}</p>
              <p className="text-xs text-pink-500">this month</p>
            </div>
          </div>
        </div>

        {/* JOB FEEDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">📋 TODAY'S JOBS</h2>
            <div className="bg-white rounded-xl shadow-sm border">
              {loading ? (
                <p className="p-4 text-gray-500">Loading...</p>
              ) : todayJobs.length === 0 ? (
                <p className="p-4 text-gray-500">No jobs today</p>
              ) : (
                <div className="divide-y">
                  {todayJobs.map((job) => (
                    <a key={job.id} href="/admin/bookings" className="block p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-[#1E2A4A]">{job.clients?.name || 'No client'}</p>
                          <p className="text-sm text-gray-500">{job.service_type} • {job.cleaners?.name || 'Unassigned'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-[#1E2A4A]">{formatTime(job.start_time)}</p>
                          <span className={'text-xs px-2 py-1 rounded-full ' + 
                            (job.status === 'completed' ? 'bg-green-100 text-green-700' : 
                             job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 
                             'bg-blue-100 text-blue-700')}>
                            {job.status === 'in_progress' ? 'In Progress' : job.status}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">📅 UPCOMING (14 Days)</h2>
            <div className="bg-white rounded-xl shadow-sm border">
              {loading ? (
                <p className="p-4 text-gray-500">Loading...</p>
              ) : upcomingJobs.length === 0 ? (
                <p className="p-4 text-gray-500">No upcoming jobs</p>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {upcomingJobs.slice(0, 15).map((job) => (
                    <a key={job.id} href="/admin/bookings" className="block p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-[#1E2A4A]">{job.clients?.name || 'No client'}</p>
                          <p className="text-sm text-gray-500">{job.service_type} • {job.cleaners?.name || 'Unassigned'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-[#1E2A4A]">{formatDate(job.start_time)}</p>
                          <p className="text-sm text-gray-500">{formatTime(job.start_time)}</p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MAP ROW - NOW AT BOTTOM */}
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-gray-500">🗺️ JOB MAP</h2>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={cleanerFilter}
                onChange={(e) => setCleanerFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-100 border-0 rounded-lg text-xs font-medium text-gray-700 focus:ring-2 focus:ring-[#1E2A4A]"
              >
                <option value="all">All Cleaners</option>
                {cleanersList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
                <button onClick={() => setStatusFilter('all')} className={'px-2 md:px-3 py-2 rounded-md text-xs font-medium transition whitespace-nowrap ' + (statusFilter === 'all' ? 'bg-white text-[#1E2A4A] shadow-sm' : 'text-gray-600 hover:text-[#1E2A4A]')}>
                  All ({statusCounts.all})
                </button>
                <button onClick={() => setStatusFilter('scheduled')} className={'px-2 md:px-3 py-2 rounded-md text-xs font-medium transition whitespace-nowrap ' + (statusFilter === 'scheduled' ? 'bg-[#1E2A4A] text-white' : 'text-[#1E2A4A] hover:bg-[#A8F0DC]/20')}>
                  Scheduled ({statusCounts.scheduled})
                </button>
                <button onClick={() => setStatusFilter('completed')} className={'px-2 md:px-3 py-2 rounded-md text-xs font-medium transition whitespace-nowrap ' + (statusFilter === 'completed' ? 'bg-green-500 text-white' : 'text-green-600 hover:bg-green-50')}>
                  Completed ({statusCounts.completed})
                </button>
                <button onClick={() => setStatusFilter('cancelled')} className={'px-2 md:px-3 py-2 rounded-md text-xs font-medium transition whitespace-nowrap ' + (statusFilter === 'cancelled' ? 'bg-red-500 text-white' : 'text-red-600 hover:bg-red-50')}>
                  Cancelled ({statusCounts.cancelled})
                </button>
              </div>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setMapView('today')} className={'px-2 md:px-3 py-2 rounded-md text-xs font-medium transition ' + (mapView === 'today' ? 'bg-white text-[#1E2A4A] shadow-sm' : 'text-gray-600 hover:text-[#1E2A4A]')}>Today</button>
                <button onClick={() => setMapView('week')} className={'px-2 md:px-3 py-2 rounded-md text-xs font-medium transition ' + (mapView === 'week' ? 'bg-white text-[#1E2A4A] shadow-sm' : 'text-gray-600 hover:text-[#1E2A4A]')}>Week</button>
                <button onClick={() => setMapView('month')} className={'px-2 md:px-3 py-2 rounded-md text-xs font-medium transition ' + (mapView === 'month' ? 'bg-white text-[#1E2A4A] shadow-sm' : 'text-gray-600 hover:text-[#1E2A4A]')}>Month</button>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <MapComponent jobs={currentMapJobs} />
          </div>
        </div>

      </main>

      {/* JOBS MODAL */}
      {showJobsModal && (
        <div className="fixed inset-0 bg-[#1E2A4A]/50 flex items-end md:items-center justify-center z-[1000]" onClick={() => setShowJobsModal(false)}>
          <div className="bg-white rounded-t-xl md:rounded-xl p-4 md:p-6 w-full md:max-w-2xl max-h-[85vh] md:max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#1E2A4A]">{modalTitle}</h3>
              <button onClick={() => setShowJobsModal(false)} className="text-gray-400 hover:text-[#1E2A4A] text-2xl">&times;</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {modalJobs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No jobs found</p>
              ) : (
                <div className="divide-y">
                  {modalJobs.map((job) => (
                    <div
                      key={job.id}
                      className="py-3 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition"
                      onClick={() => router.push(`/admin/bookings?edit=${job.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-[#1E2A4A]">{job.clients?.name || 'No client'}</p>
                          <p className="text-sm text-gray-500">{job.service_type} • {job.cleaners?.name || 'Unassigned'}</p>
                          <p className="text-xs text-gray-400">{job.clients?.address}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-[#1E2A4A]">{formatMoney(job.price || 0)}</p>
                          <p className="text-sm text-gray-500">{formatDate(job.start_time)}</p>
                          <span className={'text-xs px-2 py-1 rounded-full ' +
                            (job.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                             job.status === 'completed' ? 'bg-yellow-100 text-yellow-700' :
                             'bg-blue-100 text-blue-700')}>
                            {job.payment_status === 'paid' ? 'paid' : job.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-4 border-t mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">{modalJobs.length} job{modalJobs.length !== 1 ? 's' : ''}</p>
              <p className="font-semibold text-[#1E2A4A]">Total: {formatMoney(modalJobs.reduce((sum, j) => sum + (j.price || 0), 0))}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
