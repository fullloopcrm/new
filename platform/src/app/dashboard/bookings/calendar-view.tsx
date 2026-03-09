'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useRouter } from 'next/navigation'

type Booking = {
  id: string
  service_type: string | null
  start_time: string
  end_time: string | null
  status: string
  clients: { name: string } | null
  team_members: { name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#3b82f6',
  confirmed: '#6366f1',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  paid: '#10b981',
  cancelled: '#ef4444',
  no_show: '#9ca3af',
  pending: '#9ca3af',
}

export default function CalendarView({
  bookings,
  onDateClick
}: {
  bookings: Booking[];
  onDateClick?: (date: string, time: string) => void
}) {
  const router = useRouter()

  const events = bookings.map((b) => ({
    id: b.id,
    title: `${b.clients?.name || 'Client'} — ${b.service_type || 'Service'}`,
    start: b.start_time,
    end: b.end_time || undefined,
    backgroundColor: STATUS_COLORS[b.status] || '#9ca3af',
    borderColor: STATUS_COLORS[b.status] || '#9ca3af',
    extendedProps: { booking: b },
  }))

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={events}
        eventClick={(info) => {
          router.push(`/dashboard/bookings/${info.event.id}`)
        }}
        dateClick={(info) => {
          if (onDateClick) {
            const d = info.date
            const date = d.toISOString().split('T')[0]
            const time = d.toTimeString().slice(0, 5)
            onDateClick(date, time)
          }
        }}
        selectable={true}
        height="auto"
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={false}
        nowIndicator
      />
    </div>
  )
}
