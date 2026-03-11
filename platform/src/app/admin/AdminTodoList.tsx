'use client'

import { useState, useEffect } from 'react'

interface TodoItem {
  id: number
  text: string
  done: boolean
}

interface TodoSection {
  title: string
  items: TodoItem[]
}

const initialSections: TodoSection[] = [
  {
    title: 'Infrastructure',
    items: [
      { id: 1, text: 'Multi-tenant middleware — hostname/subdomain resolution', done: false },
      { id: 2, text: 'Vercel domain API — add/remove custom domains per tenant', done: false },
      { id: 3, text: 'Tenant website template — public-facing site per business', done: false },
    ],
  },
  {
    title: 'Portals',
    items: [
      { id: 4, text: 'Client portal — bookings, invoices, account', done: false },
      { id: 5, text: 'Team portal — schedule, check in/out, GPS', done: false },
    ],
  },
  {
    title: 'Billing & Payments',
    items: [
      { id: 6, text: 'Stripe integration — subscriptions, plan upgrades', done: false },
      { id: 25, text: 'Invoice system — generate, send, track per booking', done: false },
    ],
  },
  {
    title: 'Communications',
    items: [
      { id: 7, text: 'Automated booking reminders — email + SMS', done: false },
      { id: 8, text: 'Email compose UI — send/manage via Resend', done: false },
      { id: 9, text: 'SMS compose UI — send/manage via Telnyx', done: false },
      { id: 10, text: 'Push notifications — web push for updates', done: false },
      { id: 29, text: 'White-label email templates — per-tenant branding', done: false },
    ],
  },
  {
    title: 'Google & Social',
    items: [
      { id: 11, text: 'Google Business OAuth — self-service connect', done: true },
      { id: 12, text: 'Google auto-reply reviews — AI replies', done: true },
      { id: 13, text: 'Google auto-post updates — AI posts', done: true },
      { id: 14, text: 'Social media — FB + IG OAuth, posting, history', done: true },
      { id: 27, text: 'TikTok integration — OAuth + posting', done: false },
    ],
  },
  {
    title: 'Admin Platform',
    items: [
      { id: 15, text: 'Sales page — activate accounts, manage plans', done: true },
      { id: 16, text: 'Billing page — MRR dashboard, plan mgmt', done: true },
      { id: 17, text: 'Sidebar reorganize — System up top, Sales', done: true },
      { id: 18, text: 'Business onboarding — 12-section + partner setup', done: true },
      { id: 19, text: 'Admin API routes — bookings, clients, team, finance', done: true },
      { id: 20, text: 'Components migrated — panels, maps, widgets', done: true },
      { id: 21, text: 'Cron jobs — health, review sync, auto-reply', done: true },
      { id: 22, text: 'Webhook — Resend email tracking', done: true },
      { id: 23, text: 'Admin dashboard pages — UI for each section', done: false },
    ],
  },
  {
    title: 'Features',
    items: [
      { id: 24, text: 'Recurring bookings — repeat appointment engine', done: false },
      { id: 26, text: 'Reporting — tenant-level revenue, bookings, reviews', done: false },
      { id: 28, text: 'Referral program — tracking, payouts, dashboard', done: false },
      { id: 30, text: 'Mobile responsive — all portals + dashboard', done: false },
    ],
  },
  {
    title: 'Portal Parity — Team',
    items: [
      { id: 100, text: 'Use TranslatedNotes in JobCard — component exists, just not imported/used in team page', done: true },
      { id: 101, text: 'Add PushPrompt to team portal — component exists at /components/PushPrompt, just not used', done: true },
      { id: 102, text: 'Available jobs — show notes/instructions with TranslatedNotes on emergency jobs', done: true },
      { id: 103, text: 'Quiet hours — display in 12h AM/PM format (not 24h)', done: true },
      { id: 104, text: 'Notifications — add booking_id field to notification type', done: true },
      { id: 105, text: 'Earnings — single API returning hourly rate, today potential, weekly/monthly/yearly with job counts', done: true },
      { id: 106, text: 'Full-page loading — show "Loading... / Cargando..." before auth resolves', done: true },
      { id: 107, text: 'JobCard — show "No notes / Sin notas" fallback when no notes exist (like nycmaid)', done: true },
      { id: 108, text: 'JobCard expanded — labeled sections: "Address / Dirección", "Phone / Teléfono", "Service / Servicio"', done: true },
      { id: 109, text: 'SidePanel animate-slide-in CSS missing — add keyframes to global CSS', done: true },
      { id: 131, text: 'Available jobs animate-pulse-border CSS missing — add keyframes to global CSS', done: true },
      { id: 132, text: 'SidePanel — port smooth slide animation from nycmaid (translate-x-full → translate-x-0)', done: true },
    ],
  },
  {
    title: 'Portal Parity — Client',
    items: [
      { id: 110, text: 'Add PushPrompt to client portal — component exists, just not imported/used in portal page', done: true },
      { id: 111, text: '"Team Member TBD" fallback — show when no team member assigned', done: true },
      { id: 112, text: 'Booking success — "Thank you and welcome back!" message', done: true },
      { id: 113, text: 'Same-day block — add Call/Text buttons in yellow warning block', done: true },
      { id: 114, text: '"Book here directly" helper text — under empty-state book button', done: true },
      { id: 115, text: 'Client portal not bilingual — add t() helper with EN/ES language toggle like team portal', done: true },
      { id: 116, text: 'Missing "Notes for your cleaner" save button inside booking panel (nycmaid has both inline + global)', done: true },
      { id: 117, text: 'Service step order — nycmaid does Date → Service → Hours → Time; fullloopcrm does Service → Date', done: true },
    ],
  },
  {
    title: 'Portal Parity — Referral',
    items: [
      { id: 120, text: 'Referral signup — SMS consent checkbox with legal text (STOP/HELP, Privacy, T&C)', done: true },
      { id: 121, text: 'Referral signup — form tracking hook (trackStart, trackSuccess, trackAbandon on page leave)', done: true },
      { id: 122, text: 'Referral signup success — SVG checkmark (not emoji), welcome message, spam folder reminder', done: true },
      { id: 123, text: 'Referral dashboard — add thisMonth to link performance stats', done: true },
      { id: 124, text: 'Referral login — add "Questions?" footer with tenant contact email', done: true },
      { id: 125, text: 'Referral signup — payout destination label "We\'ll send your commissions here"', done: true },
      { id: 126, text: 'Referral signup — "Already a referrer? Log in to your dashboard" link at bottom', done: true },
      { id: 127, text: 'Referral signup — form labels (nycmaid has labeled inputs, fullloopcrm uses placeholder-only)', done: true },
      { id: 128, text: 'Referral signup — submit button text "Join Referral Program" (not "Sign Up")', done: true },
      { id: 129, text: 'Referral dashboard — commissions use cents format (commission_amount / 100) vs dollars', done: true },
      { id: 130, text: 'Referral signup — form uses single form object state (nycmaid) vs separate states (fullloopcrm)', done: true },
    ],
  },
  {
    title: 'Systems — Cron Jobs & Automation',
    items: [
      { id: 200, text: 'Reminders cron — day-based (3d + 1d before) client email + SMS', done: true },
      { id: 201, text: 'Reminders cron — 2hr before SMS to client + team member', done: true },
      { id: 202, text: 'Reminders cron — 15-min payment alert to admin before booking ends', done: true },
      { id: 203, text: 'Reminders cron — thank-you email 3 days after first-time client booking', done: true },
      { id: 204, text: 'Reminders cron — unpaid team alerts at 8am (completed 2+ days ago)', done: true },
      { id: 205, text: 'Reminders cron — pending/unassigned booking alerts at 8am + 2pm', done: true },
      { id: 206, text: 'Daily summary — admin email with today jobs + yesterday revenue + week count', done: true },
      { id: 207, text: 'Daily summary — team member 3-day lookahead SMS + email with job details', done: true },
      { id: 208, text: 'Daily summary — recurring expiration check (30-day warning + admin email)', done: true },
      { id: 209, text: 'Confirmation cron — team member hourly resend until YES reply', done: true },
      { id: 210, text: 'Confirmation cron — client day-before confirmation text at 1pm', done: true },
      { id: 211, text: 'Confirmation cron — admin alert after 3+ failed team confirmation attempts', done: true },
      { id: 212, text: 'Availability blocking — API rejects scheduling team on day off (409)', done: true },
      { id: 213, text: 'Availability blocking — supports force override flag', done: true },
    ],
  },
  {
    title: 'Systems — SMS & Webhook',
    items: [
      { id: 220, text: 'Telnyx webhook — STOP/UNSUBSCRIBE/QUIT opt-out handling + TCPA confirm', done: true },
      { id: 221, text: 'Telnyx webhook — START/UNSTOP re-subscribe handling', done: true },
      { id: 222, text: 'Telnyx webhook — YES/CONFIRM reply auto-confirms next booking', done: true },
      { id: 223, text: 'Telnyx webhook — team member YES reply confirms job + notes on booking', done: true },
      { id: 224, text: 'Telnyx webhook — inbound SMS appended to client notes automatically', done: true },
      { id: 225, text: 'Telnyx webhook — delivery status tracking (sent/delivered/failed)', done: true },
      { id: 226, text: 'Urgent job broadcast — SMS + email to all active team members with pay rate', done: true },
      { id: 227, text: 'Batch booking updates — recurring series update with team notification', done: true },
      { id: 228, text: 'SMS conversation tracking — transcript API + chat-bubble UI', done: true },
      { id: 229, text: 'Chatbot AI — Claude-powered inbound SMS auto-reply', done: true },
      { id: 230, text: 'Inbound SMS logged to client notes automatically', done: true },
      { id: 231, text: 'Bilingual SMS templates — Spanish variants for all message types', done: true },
    ],
  },
  {
    title: 'Smart Scheduling',
    items: [
      { id: 240, text: 'Favorite/preferred team member field on client record', done: true },
      { id: 241, text: 'Auto-select preferred team member in calendar panel', done: true },
      { id: 242, text: 'Smart ranking — scored suggestions (preferred, history, workload) with badges', done: true },
      { id: 243, text: 'Conflict prevention — block double-booking same team member', done: true },
      { id: 244, text: 'Day-off calendar UI — team members request days off from portal', done: false },
      { id: 245, text: 'Working days config — per-team-member working day schedule', done: false },
      { id: 246, text: 'Auto-reassign — when team member calls out, suggest replacement', done: false },
      { id: 247, text: 'Client requirements + team skills matching (has_car, spanish, etc.)', done: true },
      { id: 248, text: 'No-match warning — alert when no qualified team member available for client', done: true },
      { id: 249, text: 'Travel time estimation API — geocode + Haversine distance', done: true },
    ],
  },
  {
    title: 'nycmaid Parity — Portals & Hiring',
    items: [
      { id: 260, text: 'Team applications API — public submit + admin review/approve', done: true },
      { id: 261, text: 'Team application form page (/apply/[slug]) with photo upload', done: true },
      { id: 262, text: 'Portal reschedule — client reschedule + notifications to admin/team', done: true },
      { id: 263, text: 'Portal cancellation — client cancel + notifications to admin/team', done: true },
      { id: 264, text: 'Client verification code flow (portal auth has send-code/verify-code)', done: true },
      { id: 265, text: 'Admin applications review page — list/approve/reject', done: true },
    ],
  },
  {
    title: 'nycmaid Parity — Remaining',
    items: [
      { id: 270, text: 'SMS conversation tracking — transcript API + chat-bubble UI component', done: true },
      { id: 271, text: 'Campaign recipient-level delivery tracking', done: true },
      { id: 272, text: 'Chatbot AI — Claude-powered SMS booking assistant (Selena)', done: true },
      { id: 273, text: 'Team notification preferences (push/email/sms per type)', done: true },
      { id: 274, text: 'Admin team page — applications tab with review actions', done: true },
    ],
  },
]

const STORAGE_KEY = 'fullloop_admin_todos'

function getAllItems(sections: TodoSection[]): TodoItem[] {
  return sections.flatMap(s => s.items)
}

export default function AdminTodoList() {
  const [sections, setSections] = useState<TodoSection[]>(initialSections)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const savedDone: Record<number, boolean> = JSON.parse(saved)
        setSections(prev => prev.map(s => ({
          ...s,
          items: s.items.map(t => ({
            ...t,
            done: savedDone[t.id] !== undefined ? savedDone[t.id] : t.done,
          })),
        })))
      } catch {}
    }
  }, [])

  function toggle(id: number) {
    setSections(prev => {
      const updated = prev.map(s => ({
        ...s,
        items: s.items.map(t => t.id === id ? { ...t, done: !t.done } : t),
      }))
      const doneMap: Record<number, boolean> = {}
      getAllItems(updated).forEach(t => { doneMap[t.id] = t.done })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doneMap))
      return updated
    })
  }

  const all = getAllItems(sections)
  const doneCount = all.filter(t => t.done).length
  const pct = Math.round((doneCount / all.length) * 100)

  return (
    <div className="mb-4 border border-slate-200 rounded-lg bg-slate-900">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-1 hover:bg-white/5 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-heading font-semibold text-white">Build Progress</h2>
          <span className="text-xs text-white/40 font-mono">{doneCount}/{all.length}</span>
          <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-medium text-teal-400">{pct}%</span>
        </div>
        <span className="text-white/30 text-xs">{collapsed ? 'Show' : 'Hide'}</span>
      </button>

      {!collapsed && (
        <div className="px-3 pb-2 grid grid-cols-1 lg:grid-cols-2 gap-x-4">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="text-sm font-heading font-semibold text-white tracking-wide mt-1.5">{section.title}</p>
              {section.items.map((todo) => (
                <label
                  key={todo.id}
                  className="flex items-center gap-1.5 cursor-pointer group leading-none"
                >
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => toggle(todo.id)}
                    className="w-3 h-3 rounded-sm border-white/20 text-teal-500 focus:ring-teal-500 cursor-pointer shrink-0 bg-transparent"
                  />
                  <span className={`text-xs leading-snug ${todo.done ? 'text-white/25 line-through' : 'text-white/50 group-hover:text-white/70'}`}>
                    <span className="font-mono text-white/20 mr-0.5">{todo.id}.</span>
                    {todo.text}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
