'use client'

import { useEffect, useState, useCallback } from 'react'

interface Tenant {
  id: string
  name: string
}

interface Booking {
  id: string
  start_time: string
  end_time: string
  service_type: string
  price: number
  status: string
  client_id: string
  team_member_id: string | null
  tenant_id: string
  clients: { id: string; name: string; phone: string } | null
  team_members: { id: string; name: string } | null
  tenants: { id: string; name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500',
  confirmed: 'bg-teal-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-400',
  pending: 'bg-gray-400',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function AdminCalendarPage() {
  useEffect(() => { document.title = 'Calendar | FullLoop Admin' }, [])

  const [bookings, setBookings] = useState<Booking[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTenant, setSelectedTenant] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())

  useEffect(() => { loadTenants() }, [])
  useEffect(() => { loadBookings() }, [viewMonth, viewYear])

  const loadBookings = async () => {
    setLoading(true)
    try {
      const from = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`
      const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate()
      const to = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${lastDay}`
      const res = await fetch(`/api/admin/calendar?from=${from}&to=${to}`)
      if (res.ok) setBookings(await res.json())
    } catch (err) { console.error('Failed to load calendar:', err) }
    setLoading(false)
  }

  const loadTenants = async () => {
    try {
      const res = await fetch('/api/admin/businesses')
      if (res.ok) setTenants(await res.json())
    } catch (err) { console.error('Failed to load tenants:', err) }
  }

  const filteredBookings = selectedTenant
    ? bookings.filter(b => b.tenant_id === selectedTenant)
    : bookings

  // Build calendar grid
  const buildCalendarDays = useCallback(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

    const days: { date: string; dayNum: number; isCurrentMonth: boolean }[] = []

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      const m = viewMonth === 0 ? 12 : viewMonth
      const y = viewMonth === 0 ? viewYear - 1 : viewYear
      days.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, dayNum: d, isCurrentMonth: false })
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        dayNum: d,
        isCurrentMonth: true
      })
    }

    // Next month padding
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 1 : viewMonth + 2
      const y = viewMonth === 11 ? viewYear + 1 : viewYear
      days.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, dayNum: d, isCurrentMonth: false })
    }

    return days
  }, [viewMonth, viewYear])

  const getBookingsForDate = (dateStr: string) => {
    return filteredBookings.filter(b => b.start_time.startsWith(dateStr))
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const goToToday = () => {
    setViewMonth(today.getMonth())
    setViewYear(today.getFullYear())
  }

  const formatTime = (timeStr: string) => {
    const [, t] = timeStr.split('T')
    const [h, m] = (t || '00:00').split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hr = h % 12 || 12
    return m > 0 ? `${hr}:${String(m).padStart(2, '0')} ${ampm}` : `${hr} ${ampm}`
  }

  const formatMoney = (cents: number) => '$' + (cents / 100).toFixed(2)

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const calendarDays = buildCalendarDays()

  const selectedDayBookings = selectedDate ? getBookingsForDate(selectedDate) : []

  return (
    <main className="p-3 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">CALENDAR</h2>
          <p className="text-2xl font-bold text-slate-900">{MONTHS[viewMonth]} {viewYear}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-slate-900 bg-white shadow-sm focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 outline-none transition-all"
          >
            <option value="">All Tenants</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl shadow-sm">
            <button onClick={prevMonth} className="px-3 py-2.5 text-slate-900 hover:bg-gray-50 rounded-l-xl transition-colors font-medium">&larr;</button>
            <button onClick={goToToday} className="px-3 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors">Today</button>
            <button onClick={nextMonth} className="px-3 py-2.5 text-slate-900 hover:bg-gray-50 rounded-r-xl transition-colors font-medium">&rarr;</button>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
            <span className="capitalize">{status.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin mb-3"></div>
          <p className="text-sm">Loading calendar...</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar Grid */}
          <div className="flex-1">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-gray-100">
                {DAYS.map(day => (
                  <div key={day} className="px-2 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 text-center">
                    {day}
                  </div>
                ))}
              </div>

              {/* Day Cells */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  const dayBookings = getBookingsForDate(day.date)
                  const isToday = day.date === todayStr
                  const isSelected = day.date === selectedDate
                  const hasBookings = dayBookings.length > 0

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(isSelected ? null : day.date)}
                      className={`min-h-[80px] md:min-h-[100px] p-1.5 border-b border-r border-gray-100 cursor-pointer transition-colors
                        ${!day.isCurrentMonth ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50/80'}
                        ${isSelected ? 'ring-2 ring-inset ring-teal-600 bg-teal-50/30' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                          ${isToday ? 'bg-teal-600 text-white' : day.isCurrentMonth ? 'text-slate-900' : 'text-gray-300'}
                        `}>
                          {day.dayNum}
                        </span>
                        {hasBookings && (
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-full border border-teal-200">
                            {dayBookings.length}
                          </span>
                        )}
                      </div>
                      {/* Colored dots for bookings */}
                      {hasBookings && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {dayBookings.slice(0, 6).map(b => (
                            <span
                              key={b.id}
                              className={`w-2 h-2 rounded-full ${STATUS_COLORS[b.status] || 'bg-gray-400'}`}
                              title={`${b.clients?.name || 'Client'} - ${b.service_type}`}
                            ></span>
                          ))}
                          {dayBookings.length > 6 && (
                            <span className="text-[9px] text-gray-400 font-medium">+{dayBookings.length - 6}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Day Detail Panel */}
          <div className="lg:w-[360px]">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm sticky top-6">
              {selectedDate ? (
                <>
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {selectedDayBookings.length} booking{selectedDayBookings.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100">
                    {selectedDayBookings.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-400 text-sm">
                        No bookings on this day
                      </div>
                    ) : (
                      selectedDayBookings
                        .sort((a, b) => a.start_time.localeCompare(b.start_time))
                        .map(booking => (
                          <div key={booking.id} className="px-4 py-3 hover:bg-gray-50/80 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[booking.status] || 'bg-gray-400'}`}></span>
                                  <p className="text-sm font-semibold text-slate-900 truncate">{booking.clients?.name || 'Unknown'}</p>
                                </div>
                                <p className="text-xs text-gray-500 ml-4">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
                                <p className="text-xs text-gray-400 ml-4 mt-0.5">{booking.service_type}</p>
                                {booking.team_members?.name && (
                                  <p className="text-xs text-gray-400 ml-4 mt-0.5">Team: {booking.team_members.name}</p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-semibold text-slate-900">{formatMoney(booking.price)}</p>
                                <span className="text-[10px] font-medium text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-full border border-teal-200">
                                  {booking.tenants?.name || 'Unknown'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </>
              ) : (
                <div className="px-4 py-12 text-center">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-sm text-gray-400">Click a day to view bookings</p>
                </div>
              )}
            </div>

            {/* Month Summary */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm mt-4 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Month Summary</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Total</p>
                  <p className="text-lg font-bold text-slate-900">{filteredBookings.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-500 mb-0.5">Revenue</p>
                  <p className="text-lg font-bold text-green-700">
                    {formatMoney(filteredBookings.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.price, 0))}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-500 mb-0.5">Scheduled</p>
                  <p className="text-lg font-bold text-blue-700">{filteredBookings.filter(b => b.status === 'scheduled').length}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-red-400 mb-0.5">Cancelled</p>
                  <p className="text-lg font-bold text-red-700">{filteredBookings.filter(b => b.status === 'cancelled').length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
