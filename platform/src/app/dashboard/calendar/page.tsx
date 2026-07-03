import CalendarBoard from './CalendarBoard'

// Calendar extracted into a reusable CalendarBoard so it can be mirrored inside
// the Sales page's Schedule tab. This route renders it standalone.
export default function CalendarPage() {
  return <CalendarBoard />
}
