import CalendarShell from './CalendarShell'

// The dashboard calendar is the multi-view shell (Month / Timeline / Kanban).
// CalendarBoard is still the Month view and is reused directly inside the
// Sales page's Schedule tab; this route renders the full switcher.
export default function CalendarPage() {
  return <CalendarShell />
}
