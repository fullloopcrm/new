// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'

const T = ({ headers, rows }: { headers: string[], rows: string[][] }) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden mb-6 overflow-x-auto">
    <table className="w-full text-sm min-w-[500px]">
      <thead><tr className="bg-gray-50 text-left text-gray-600">{headers.map((h, i) => <th key={i} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-gray-100">{rows.map((row, i) => <tr key={i} className="hover:bg-gray-50">{row.map((c, j) => <td key={j} className={`px-4 py-3 ${j === 0 ? 'font-mono text-xs text-[#1E2A4A]' : 'text-gray-700'}`}>{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
)

const Badge = ({ color, children }: { color: string, children: React.ReactNode }) => {
  const colors: Record<string, string> = {
    blue: 'bg-[#A8F0DC]/20 text-[#1E2A4A] border-[#A8F0DC]/30',
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  }
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${colors[color] || colors.gray}`}>{children}</span>
}

const Card = ({ title, children, accent }: { title: string, children: React.ReactNode, accent?: string }) => (
  <div className={`rounded-lg p-4 mb-4 border ${accent === 'blue' ? 'bg-[#A8F0DC]/20 border-[#A8F0DC]/30' : accent === 'green' ? 'bg-green-50 border-green-200' : accent === 'yellow' ? 'bg-yellow-50 border-yellow-200' : accent === 'red' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
    {title && <h3 className="font-semibold text-[#1E2A4A] mb-2">{title}</h3>}
    <div className="text-sm text-gray-700 space-y-1">{children}</div>
  </div>
)

export default function DocsPage() {
  useEffect(() => { document.title = 'Documentation | The NYC Wash and Fold Service Company' }, [])
  const [s, setS] = useState('overview')

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'platform-map', label: 'Platform Map' },
    { id: 'stack', label: 'Tech Stack' },
    { id: 'files', label: 'File Structure' },
    { id: 'database', label: 'Database (19)' },
    { id: 'pages', label: 'Pages (25)' },
    { id: 'api', label: 'API Routes (60+)' },
    { id: 'components', label: 'Components (13)' },
    { id: 'lib', label: 'Libraries (16)' },
    { id: 'security', label: 'Security' },
    { id: 'selena', label: 'Selena AI Chatbot' },
    { id: 'sms', label: 'SMS System' },
    { id: 'dashboard', label: 'Dashboard Features' },
    { id: 'bookings', label: 'Booking System' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'clients', label: 'Client Management' },
    { id: 'team', label: 'Team Management' },
    { id: 'referrals', label: 'Referrals' },
    { id: 'leads', label: 'Lead Tracking' },
    { id: 'finance', label: 'Finance' },
    { id: 'portals', label: 'User Portals' },
    { id: 'emails', label: 'Email System' },
    { id: 'cron', label: 'Cron Jobs' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'settings', label: 'Settings' },
    { id: 'env', label: 'Env Variables' },
    { id: 'deployment', label: 'Deployment' },
    { id: 'troubleshooting', label: 'Troubleshooting' },
  ]

  return (
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 p-3 md:p-6">
        {/* Mobile: horizontal scrollable nav bar; Desktop: vertical sidebar */}
        <div className="lg:w-52 lg:shrink-0">
          <nav className="flex lg:flex-col gap-1.5 lg:gap-0.5 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto lg:sticky lg:top-6 lg:max-h-[calc(100vh-4rem)] pb-2 lg:pb-0">
            {sections.map((sec) => (
              <button key={sec.id} onClick={() => setS(sec.id)} className={`whitespace-nowrap lg:whitespace-normal block w-auto lg:w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex-shrink-0 ${s === sec.id ? 'bg-[#1E2A4A] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{sec.label}</button>
            ))}
          </nav>
        </div>

        <main className="flex-1 min-w-0 max-w-4xl">

        {s === 'overview' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-2">The NYC Wash and Fold Service Company Platform</h1>
            <p className="text-gray-500 mb-6">Complete cleaning service management system</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Card title="" accent="blue">
                <p><strong>Live:</strong> <a href="https://www.washandfoldnyc.com" className="underline py-1.5 inline-block">washandfoldnyc.com</a></p>
                <p><strong>GitHub:</strong> <a href="https://github.com/washandfoldnyc" className="underline py-1.5 inline-block">washandfoldnyc/nycmaid</a></p>
              </Card>
              <Card title="" accent="blue">
                <p><strong>Vercel:</strong> <a href="https://vercel.com/jeff-tuckers-projects/nycmaid" className="underline py-1.5 inline-block">jeff-tuckers-projects/nycmaid</a></p>
                <p><strong>Supabase:</strong> <a href="https://supabase.com/dashboard/project/ioppmvchszymwswtwsze" className="underline py-1.5 inline-block">ioppmvchszymwswtwsze</a></p>
              </Card>
            </div>

            <h2 className="text-xl font-semibold text-[#1E2A4A] mt-8 mb-4">Platform Capabilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge color="blue">Admin</Badge>
                  <span className="text-gray-700 text-sm">Full dashboard with bookings, clients, team, calendar, leads, referrals, finance, settings</span>
                </div>
                <div className="flex items-start gap-3">
                  <Badge color="green">Clients</Badge>
                  <span className="text-gray-700 text-sm">Book services, view appointments, reschedule (recurring only, 7-day notice), notes, DNS blocking</span>
                </div>
                <div className="flex items-start gap-3">
                  <Badge color="purple">Team</Badge>
                  <span className="text-gray-700 text-sm">PIN login, daily jobs, GPS check-in/out, earnings tracking, bilingual</span>
                </div>
                <div className="flex items-start gap-3">
                  <Badge color="yellow">Referrers</Badge>
                  <span className="text-gray-700 text-sm">10% commission tracking, dashboard, Zelle/Apple Cash payouts</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge color="gray">Analytics</Badge>
                  <span className="text-gray-700 text-sm">Client LTV, churn rate, retention, at-risk detection, lifecycle</span>
                </div>
                <div className="flex items-start gap-3">
                  <Badge color="gray">Leads</Badge>
                  <span className="text-gray-700 text-sm">99 EMD domains, revenue attribution, traffic sources, domain health</span>
                </div>
                <div className="flex items-start gap-3">
                  <Badge color="gray">Selena AI</Badge>
                  <span className="text-gray-700 text-sm">SMS chatbot for lead qualification + existing client support via Telnyx</span>
                </div>
                <div className="flex items-start gap-3">
                  <Badge color="gray">Automation</Badge>
                  <span className="text-gray-700 text-sm">Email/SMS reminders (7/3/1 day, 2hr), pending booking reminders, daily summaries, backups</span>
                </div>
                <div className="flex items-start gap-3">
                  <Badge color="gray">Finance</Badge>
                  <span className="text-gray-700 text-sm">Revenue tracking, expenses, bank statements, payment reconciliation</span>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-[#1E2A4A] mt-8 mb-4">Key URLs</h2>
            <T headers={['URL', 'Purpose', 'Access']} rows={[
              ['/', 'Home page', 'Public'],
              ['/login', 'Admin login', 'Public'],
              ['/admin', 'Admin dashboard (11 sub-pages)', 'Admin'],
              ['/book', 'Client portal entry', 'Public'],
              ['/book/new', 'New booking flow (3 steps)', 'Public'],
              ['/book/collect', 'Client info collection (mobile)', 'Public'],
              ['/book/dashboard', 'Client appointment management', 'Client'],
              ['/apply', 'Team member application', 'Public'],
              ['/team', 'Team login (PIN)', 'Public'],
              ['/team/dashboard', 'Daily jobs, check-in/out, earnings', 'Team'],
              ['/referral', 'Referrer dashboard', 'Referrer'],
              ['/referral/signup', 'Referrer signup form', 'Public'],
            ]} />
          </div>
        )}

        {s === 'platform-map' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-2">Platform Map</h1>
            <p className="text-gray-500 mb-6">Complete map of all pages, communications, automations, and integrations</p>

            <h2 className="text-xl font-semibold text-[#1E2A4A] mt-8 mb-4">All Pages & Portals</h2>

            <h3 className="text-lg font-semibold text-[#1E2A4A] mt-6 mb-3">Public Pages</h3>
            <T headers={['Route', 'What it does']} rows={[
              ['/', 'Redirects to /login'],
              ['/login', 'Admin password login'],
              ['/apply', 'Cleaner job application (bilingual EN/ES)'],
              ['/feedback', 'Anonymous feedback form'],
            ]} />

            <h3 className="text-lg font-semibold text-[#1E2A4A] mt-6 mb-3">Client Portal</h3>
            <T headers={['Route', 'What it does']} rows={[
              ['/book', 'Client login (phone + email verification)'],
              ['/book/new', 'New booking wizard (3 steps: info → service → date/confirm)'],
              ['/book/collect', 'Collect client info form'],
              ['/book/dashboard', 'Client views/manages their bookings'],
              ['/book/reschedule/[id]', 'Reschedule an existing booking'],
            ]} />

            <h3 className="text-lg font-semibold text-[#1E2A4A] mt-6 mb-3">Team Portal</h3>
            <T headers={['Route', 'What it does']} rows={[
              ['/team', 'Cleaner PIN login'],
              ['/team/[token]', 'Job details via unique token link'],
              ['/team/dashboard', 'Cleaner dashboard (jobs, check-in/out, earnings)'],
            ]} />

            <h3 className="text-lg font-semibold text-[#1E2A4A] mt-6 mb-3">Referral Portal</h3>
            <T headers={['Route', 'What it does']} rows={[
              ['/referral', 'Referrer dashboard (earnings, commissions, link stats)'],
              ['/referral/signup', 'Join referral program'],
            ]} />

            <h3 className="text-lg font-semibold text-[#1E2A4A] mt-6 mb-3">Admin Dashboard (11 pages)</h3>
            <T headers={['Route', 'What it does']} rows={[
              ['/admin', 'Main dashboard (revenue, stats, map view)'],
              ['/admin/bookings', 'Manage all bookings'],
              ['/admin/calendar', 'Calendar view (month/week/day)'],
              ['/admin/clients', 'Client CRM + lifecycle analytics'],
              ['/admin/cleaners', 'Cleaner roster + applications'],
              ['/admin/leads', 'Lead management + EMD tracking'],
              ['/admin/referrals', 'Referral program management'],
              ['/admin/finance', 'Revenue, expenses, payroll, statements'],
              ['/admin/settings', 'Admin settings + tools'],
              ['/admin/websites', 'Multi-site / EMD domain management'],
              ['/admin/docs', 'This documentation'],
            ]} />

            <h2 className="text-xl font-semibold text-[#1E2A4A] mt-10 mb-4">All Communications — 21 Email Templates</h2>

            <h3 className="text-lg font-semibold text-[#1E2A4A] mt-6 mb-3">Client Emails</h3>
            <T headers={['Email', 'Sent To', 'Trigger']} rows={[
              ['Booking Confirmed', 'Client', 'Booking created as "scheduled" or pending→scheduled'],
              ['Reminder (7d, 3d, 1d, 2hr)', 'Client', 'Hourly cron job'],
              ['Cancellation', 'Client', 'Booking cancelled'],
              ['Thank You + 10% Off', 'Client', '3 days after first completed booking (cron)'],
              ['Rescheduled', 'Client', 'Client reschedules via portal'],
              ['Verification Code', 'Client', 'Login code request'],
            ]} />

            <h3 className="text-lg font-semibold text-[#1E2A4A] mt-6 mb-3">Cleaner Emails (Bilingual EN/ES)</h3>
            <T headers={['Email', 'Sent To', 'Trigger']} rows={[
              ['New Job Assigned', 'Cleaner', 'Booking created/assigned'],
              ["Tomorrow's Schedule", 'All active cleaners', 'Midnight cron job'],
              ['Job Cancelled', 'Cleaner', 'Booking cancelled'],
              ['Job Rescheduled', 'Cleaner', 'Booking rescheduled'],
              ['Welcome + PIN', 'Cleaner', 'Manual send from admin'],
            ]} />

            <h3 className="text-lg font-semibold text-[#1E2A4A] mt-6 mb-3">Referrer Emails</h3>
            <T headers={['Email', 'Sent To', 'Trigger']} rows={[
              ['Welcome + Code', 'Referrer', 'Referrer signs up'],
              ['Commission Earned', 'Referrer', "Referred client's booking completed"],
              ['New Signup Notification', 'Referrer', 'Someone books using their code'],
            ]} />

            <h3 className="text-lg font-semibold text-[#1E2A4A] mt-6 mb-3">Admin Emails</h3>
            <T headers={['Email', 'Sent To', 'Trigger']} rows={[
              ['New Booking Request', 'Admin', 'Client submits booking'],
              ['New Client Added', 'Admin', 'Client created (manual or form)'],
              ['New Referrer Signup', 'Admin', 'Referrer joins'],
              ['Pending Bookings Alert', 'Admin', 'Unassigned bookings (8am/2pm cron)'],
              ['Client Rescheduled', 'Admin', 'Client reschedules'],
              ['Daily Backup', 'Admin', '5am cron (with CSV attachments)'],
            ]} />

            <Card title="Universal" accent="blue">
              <p><strong>"Feedback?"</strong> link appears at the top of every email template, linking to /feedback</p>
            </Card>

            <h2 className="text-xl font-semibold text-[#1E2A4A] mt-10 mb-4">Automations — Cron Jobs</h2>
            <T headers={['Job', 'Schedule', 'What it does']} rows={[
              ['Reminders', 'Every hour', 'Client reminders (7d/3d/1d/2hr before), thank-you emails (3 days after first booking), pending booking alerts to admin (8am/2pm)'],
              ['Daily Summary', 'Midnight', "Tomorrow's schedule to each cleaner, recurring booking expiration checks (30-day warning)"],
              ['Backup', '5am', 'CSV export of all clients + bookings (6 months), emailed as attachments'],
            ]} />

            <h2 className="text-xl font-semibold text-[#1E2A4A] mt-10 mb-4">Dashboard Notifications (20 types)</h2>
            <T headers={['Type', 'Title', 'Trigger']} rows={[
              ['new_booking', 'New booking from {name}', 'Client submits booking'],
              ['new_client', 'New client added/collected', 'Client created'],
              ['check_in', 'Job Started / GPS Mismatch', 'Cleaner checks in'],
              ['job_complete', 'Job Done: {client}', 'Cleaner checks out'],
              ['check_out', 'Job Completed', 'Admin marks completed'],
              ['payment_received', 'Payment Received', 'Admin logs payment'],
              ['booking_cancelled', 'Booking Cancelled', 'Booking cancelled'],
              ['reschedule', 'Booking rescheduled', 'Client reschedules'],
              ['job_broadcast', 'Job Broadcast Sent', 'Emergency broadcast'],
              ['job_claimed', 'Emergency Job Claimed', 'Cleaner claims job'],
              ['new_referrer', 'New referrer: {code}', 'Referrer signs up'],
              ['referral_commission', 'Referral Commission Created', 'Commission earned'],
              ['referral_lead', 'New Referrer Lead', 'Unmatched referrer name'],
              ['cleaner_application', 'New Cleaner Application', 'Application submitted'],
              ['pending_reminder', 'Pending Bookings', 'Cron finds unassigned bookings'],
              ['recurring_expiring', 'Recurring Booking Ending Soon', '30-day expiry warning'],
              ['feedback', 'Feedback from {source}', 'User submits feedback'],
              ['hot_lead', 'Book click / Call click', 'Website engagement tracking'],
            ]} />

            <h2 className="text-xl font-semibold text-[#1E2A4A] mt-10 mb-4">All SMS Templates</h2>

            <h3 className="text-lg font-semibold text-[#1E2A4A] mt-6 mb-3">Client SMS</h3>
            <T headers={['SMS', 'Sent To', 'Trigger']} rows={[
              ['Booking Confirmation', 'Client', 'Booking approved (pending → scheduled)'],
              ['Reminder (1d, 2hr)', 'Client', 'Cron job — day before and 2 hours before'],
              ['Cancellation', 'Client', 'Booking cancelled'],
              ['Reschedule', 'Client', 'Booking rescheduled'],
              ['Thank You + 10% Off', 'Client', '3 days after first completed booking'],
              ['Verification Code', 'Client', 'Login code request'],
            ]} />

            <h3 className="text-lg font-semibold text-[#1E2A4A] mt-6 mb-3">Cleaner SMS (Bilingual EN/ES)</h3>
            <T headers={['SMS', 'Sent To', 'Trigger']} rows={[
              ['Job Assignment', 'Cleaner', 'Booking created/assigned'],
              ['Daily Summary', 'All active cleaners', 'Midnight cron job'],
              ['Job Cancelled', 'Cleaner', 'Booking cancelled'],
              ['Job Rescheduled', 'Cleaner', 'Booking rescheduled'],
              ['Urgent Broadcast', 'All cleaners', 'Emergency job broadcast (with pay rate)'],
            ]} />

            <h3 className="text-lg font-semibold text-[#1E2A4A] mt-6 mb-3">Admin SMS</h3>
            <T headers={['SMS', 'Sent To', 'Trigger']} rows={[
              ['New Client Alert', 'Admin', 'Client created via /book/collect'],
              ['New Booking Alert', 'Admin', 'Client submits booking'],
              ['New Application', 'Admin', 'Cleaner application submitted'],
              ['New Referrer', 'Admin', 'Referrer signs up'],
            ]} />

            <Card title="TCPA Compliance" accent="blue">
              <p>All system-initiated SMS include <strong>"Reply STOP to opt out"</strong> notice. STOP/UNSUBSCRIBE/CANCEL/QUIT commands automatically revoke sms_consent.</p>
            </Card>

            <h2 className="text-xl font-semibold text-[#1E2A4A] mt-10 mb-4">External Integrations</h2>
            <T headers={['Service', 'Purpose', 'Used In']} rows={[
              ['Resend', 'Email delivery (hi@washandfoldnyc.com)', 'All emails — 21+ templates'],
              ['Telnyx', 'SMS delivery + inbound webhook', 'Selena chatbot, booking confirmations, reminders, broadcasts'],
              ['Supabase', 'Database (PostgreSQL) — 19 tables', 'Everything'],
              ['Radar.io', 'GPS verification + address autocomplete', 'Check-in/check-out, address forms'],
              ['Web Push (VAPID)', 'Browser push notifications', 'Admin, cleaner, and client real-time alerts'],
              ['Google Maps', 'Map links in emails', 'Cleaner assignment/reschedule emails'],
              ['Vercel', 'Hosting + cron jobs', 'Deployment + 4 scheduled jobs'],
            ]} />

            <h2 className="text-xl font-semibold text-[#1E2A4A] mt-10 mb-4">Payment Flow</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Client pays</strong> — Zelle (hi@washandfoldnyc.com) or Apple Pay (collected by cleaner on-site)</li>
              <li><strong>Cleaner pay</strong> — actual_hours × cleaner.hourly_rate (stored in cents)</li>
              <li><strong>Referrer commissions</strong> — 10% of booking price, paid weekly via Zelle/Apple Cash</li>
              <li><strong>All money stored in cents</strong> — divide by 100 for display</li>
            </ul>

            <h2 className="text-xl font-semibold text-[#1E2A4A] mt-10 mb-4">Feedback System</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Portals</strong> — "Feedback?" button on all client, team, and referral portal pages</li>
              <li><strong>Emails</strong> — "Feedback?" link at the top of every email</li>
              <li><strong>Standalone page</strong> — /feedback for direct access</li>
              <li><strong>Anonymous</strong> — No personal info collected or attached</li>
              <li><strong>Delivery</strong> — Emailed to hi@washandfoldnyc.com + creates dashboard notification</li>
            </ul>
          </div>
        )}

        {s === 'stack' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Tech Stack</h1>
            <T headers={['Component', 'Technology', 'Version', 'Purpose']} rows={[
              ['Framework', 'Next.js', '16.1.6', 'React framework with App Router + API routes'],
              ['UI', 'React', '19', 'Component library'],
              ['Language', 'TypeScript', '5.x', 'Type-safe JavaScript'],
              ['Database', 'Supabase', 'PostgreSQL', 'Data storage and querying'],
              ['Styling', 'Tailwind CSS', '4.x', 'Utility-first CSS'],
              ['Hosting', 'Vercel', '-', 'Deployment, cron jobs, edge network'],
              ['Email', 'Resend', '-', 'Transactional email delivery'],
              ['SMS', 'Telnyx', '-', 'SMS delivery, inbound webhook, Selena chatbot'],
              ['Push', 'web-push (VAPID)', '-', 'Browser push notifications'],
              ['Maps', 'Leaflet + react-leaflet', '-', 'Interactive job and domain maps'],
              ['Calendar', 'FullCalendar', '-', 'Day/week/month calendar views'],
              ['Address', 'Radar.io', '-', 'Address autocomplete API'],
            ]} />
          </div>
        )}

        {s === 'files' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">File Structure</h1>
            <pre className="bg-gray-900 text-gray-300 p-4 rounded-lg text-sm overflow-x-auto mb-6">
{`src/
├── app/
│   ├── page.tsx                    # Home page
│   ├── login/page.tsx              # Admin login
│   ├── apply/page.tsx              # Team application form
│   ├── feedback/page.tsx           # Anonymous feedback form
│   ├── admin/                      # Admin dashboard (11 pages)
│   │   ├── page.tsx                # Revenue stats, today's jobs, map
│   │   ├── bookings/page.tsx       # Booking CRUD + recurring + emergency
│   │   ├── calendar/page.tsx       # FullCalendar with drag-drop
│   │   ├── cleaners/page.tsx       # Team management + priority ordering
│   │   ├── clients/page.tsx        # Client management + lifecycle analytics
│   │   ├── finance/page.tsx        # Revenue, expenses, bank statements
│   │   ├── websites/page.tsx       # 99 EMD domain portfolio
│   │   ├── leads/page.tsx          # Lead tracking & attribution
│   │   ├── referrals/page.tsx      # Referral program management
│   │   ├── settings/page.tsx       # General, Emails, Services, Tools
│   │   └── docs/page.tsx           # This documentation
│   ├── book/                       # Client portal (5 pages)
│   │   ├── page.tsx                # Client login (email + code)
│   │   ├── new/page.tsx            # 3-step booking flow
│   │   ├── collect/page.tsx        # Mobile client info collection
│   │   ├── dashboard/page.tsx      # Client appointments
│   │   └── reschedule/[id]/page.tsx
│   ├── team/                       # Team portal (3 pages)
│   │   ├── page.tsx                # PIN login (bilingual)
│   │   ├── dashboard/page.tsx      # Daily jobs + check-in/out + earnings
│   │   └── [token]/page.tsx        # Token-based job access
│   ├── referral/                   # Referrer portal (2 pages)
│   │   ├── page.tsx                # Referrer dashboard
│   │   └── signup/page.tsx         # Referrer signup
│   └── api/                        # 60+ API routes
│       ├── auth/                   # Admin auth (login, logout)
│       ├── bookings/               # Booking CRUD + broadcast
│       ├── clients/                # Client CRUD + activity + transcript
│       ├── cleaners/               # Team CRUD + priority + upload
│       ├── referrers/              # Referrer CRUD + analytics
│       ├── client/                 # Client portal APIs (11)
│       ├── team/                   # Team portal APIs (7)
│       ├── finance/                # Finance APIs (7)
│       ├── cron/                   # Scheduled jobs (4)
│       ├── webhook/                # Telnyx SMS webhook
│       ├── push/                   # Push notification subscriptions
│       └── ...
├── components/                     # 13 reusable components
└── lib/                            # 16 utility modules`}
            </pre>
          </div>
        )}

        {s === 'database' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Database Schema (19 Tables)</h1>
            <Card title="" accent="yellow">
              <p><strong>Supabase:</strong> <a href="https://supabase.com/dashboard/project/ioppmvchszymwswtwsze" className="underline">Open Dashboard</a></p>
              <p>RLS is disabled on all tables — API protection handled at route level</p>
            </Card>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">cleaners</h2>
            <p className="text-gray-500 text-sm mb-2">Team members who perform cleaning services</p>
            <T headers={['Column', 'Type', 'Notes']} rows={[['id', 'uuid', 'Primary key'], ['name', 'text', 'Full name'], ['email', 'text', 'For daily job summary emails'], ['phone', 'text', 'Contact number'], ['address', 'text', 'Home address'], ['pin', 'text', '4-6 digit login PIN'], ['hourly_rate', 'decimal', 'Pay rate per hour'], ['priority', 'integer', 'Display order (1=first)'], ['working_days', 'text[]', 'Array of day names'], ['schedule', 'jsonb', 'Hours per day'], ['sms_consent', 'boolean', 'SMS opt-in (default true, STOP revokes)'], ['active', 'boolean', 'true = active']]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">clients</h2>
            <p className="text-gray-500 text-sm mb-2">Customers who book cleaning services</p>
            <T headers={['Column', 'Type', 'Notes']} rows={[['id', 'uuid', 'Primary key'], ['name', 'text', 'Full name'], ['email', 'text', 'For confirmations & reminders'], ['phone', 'text', 'For verification & contact'], ['address', 'text', 'Service address'], ['notes', 'text', 'Special instructions'], ['referrer_id', 'uuid', 'FK → referrers.id (nullable)'], ['do_not_service', 'boolean', 'DNS flag — blocks client from booking (default false)'], ['sms_consent', 'boolean', 'SMS opt-in (default true, STOP revokes)'], ['created_at', 'timestamp', 'When client was added']]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">bookings</h2>
            <p className="text-gray-500 text-sm mb-2">Scheduled cleaning appointments</p>
            <T headers={['Column', 'Type', 'Notes']} rows={[['id', 'uuid', 'Primary key'], ['client_id', 'uuid', 'FK → clients.id'], ['cleaner_id', 'uuid', 'FK → cleaners.id'], ['start_time', 'timestamp', 'Appointment start'], ['end_time', 'timestamp', 'Appointment end'], ['service_type', 'text', 'Standard, Deep, Move In/Out, Post Construction, Emergency'], ['price', 'integer', 'Price in cents (15000 = $150)'], ['hourly_rate', 'integer', '$49, $75, or $100'], ['status', 'text', 'pending, scheduled, in_progress, completed, cancelled'], ['payment_status', 'text', 'pending or paid'], ['payment_method', 'text', 'zelle or apple_pay'], ['recurring_type', 'text', 'weekly, biweekly, monthly (nullable)'], ['recurring_group_id', 'uuid', 'Links recurring series'], ['cleaner_token', 'text', 'Unique token for team portal (24h)'], ['check_in_time', 'timestamp', 'When cleaner arrived (GPS or admin)'], ['check_out_time', 'timestamp', 'When cleaner finished (GPS or admin)'], ['check_in_location', 'jsonb', 'GPS coords at check-in'], ['check_out_location', 'jsonb', 'GPS coords at check-out'], ['actual_hours', 'decimal', 'Calculated hours worked (rounded to half-hour)'], ['cleaner_pay', 'integer', 'Cleaner payment in cents (actual_hours × $25 × 100)'], ['referrer_id', 'uuid', 'FK → referrers.id (nullable)'], ['ref_code', 'text', 'Referral code used at booking'], ['notes', 'text', 'Special instructions']]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">referrers</h2>
            <p className="text-gray-500 text-sm mb-2">People who refer clients for 10% commission</p>
            <T headers={['Column', 'Type', 'Notes']} rows={[['id', 'uuid', 'Primary key'], ['name', 'text', 'Full name'], ['email', 'text', 'UNIQUE — for login'], ['phone', 'text', 'Contact number'], ['ref_code', 'text', 'UNIQUE — e.g., JOHN123'], ['total_earned', 'integer', 'Total commissions (cents)'], ['total_paid', 'integer', 'Total paid out (cents)'], ['preferred_payout', 'text', 'zelle or apple_cash'], ['zelle_info', 'text', 'Zelle email/phone'], ['active', 'boolean', 'Default true']]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">referral_commissions</h2>
            <p className="text-gray-500 text-sm mb-2">Commission records for each completed booking</p>
            <T headers={['Column', 'Type', 'Notes']} rows={[['id', 'uuid', 'Primary key'], ['booking_id', 'uuid', 'FK → bookings.id'], ['referrer_id', 'uuid', 'FK → referrers.id'], ['gross_amount', 'integer', 'Booking price (cents)'], ['commission_amount', 'integer', '10% commission (cents)'], ['status', 'text', 'pending or paid'], ['paid_via', 'text', 'zelle or apple_cash'], ['paid_at', 'timestamp', 'When paid out']]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">SMS & Chatbot Tables</h2>
            <T headers={['Table', 'Purpose']} rows={[
              ['sms_conversations', 'Selena chatbot state machine — one active conversation per phone (state, collected info, booking link)'],
              ['sms_conversation_messages', 'Full transcript of prospect chatbot conversations (inbound/outbound per conversation_id)'],
              ['client_sms_messages', 'SMS transcript for existing clients (inbound/outbound per client_id, up to 200 shown in admin)'],
              ['sms_logs', 'Delivery tracking — telnyx_message_id, status (sent/delivered/failed), sms_type, recipient'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Other Tables</h2>
            <T headers={['Table', 'Purpose']} rows={[
              ['cleaner_applications', 'Job applications from /apply form'],
              ['lead_clicks', 'Visitor activity from 99 EMD domains'],
              ['domain_notes', 'Notes and status per domain'],
              ['email_logs', 'Tracks sent emails (prevents duplicates)'],
              ['verification_codes', 'SMS codes for client login'],
              ['notifications', 'Dashboard notification bell items'],
              ['push_subscriptions', 'Web push subscriptions (role: admin/cleaner/client, endpoint, keys)'],
              ['settings', 'Platform configuration key-values'],
              ['expenses', 'Business expense records'],
              ['bank_statements', 'Uploaded bank statement metadata'],
            ]} />
          </div>
        )}

        {s === 'pages' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Pages (25 Total)</h1>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Public (4)</h2>
            <T headers={['File', 'Route', 'Purpose']} rows={[
              ['app/page.tsx', '/', 'Home/landing page'],
              ['app/login/page.tsx', '/login', 'Admin login form'],
              ['app/apply/page.tsx', '/apply', 'Team member application (bilingual EN/ES)'],
              ['app/feedback/page.tsx', '/feedback', 'Anonymous feedback form (linked from emails + portals)'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Admin Dashboard (11)</h2>
            <T headers={['File', 'Route', 'Purpose']} rows={[
              ['admin/page.tsx', '/admin', 'Revenue stats, today\'s jobs, interactive map'],
              ['admin/bookings/page.tsx', '/admin/bookings', 'Booking CRUD, recurring, emergency broadcast'],
              ['admin/calendar/page.tsx', '/admin/calendar', 'FullCalendar with drag-to-move/resize'],
              ['admin/clients/page.tsx', '/admin/clients', 'Client management + lifecycle analytics'],
              ['admin/cleaners/page.tsx', '/admin/cleaners', 'Team members, priority ordering, applications'],
              ['admin/finance/page.tsx', '/admin/finance', 'Revenue, expenses, bank statements, CSV export'],
              ['admin/websites/page.tsx', '/admin/websites', '99 EMD domain portfolio + map'],
              ['admin/leads/page.tsx', '/admin/leads', 'Lead tracking, attribution, live feed'],
              ['admin/referrals/page.tsx', '/admin/referrals', 'Referral analytics, payouts, management'],
              ['admin/settings/page.tsx', '/admin/settings', '4 tabs: General, Emails, Services, Tools'],
              ['admin/docs/page.tsx', '/admin/docs', 'This documentation'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Client Portal (5)</h2>
            <T headers={['File', 'Route', 'Purpose']} rows={[
              ['book/page.tsx', '/book', 'Client login (email + verification code)'],
              ['book/new/page.tsx', '/book/new', '3-step booking flow with availability check'],
              ['book/collect/page.tsx', '/book/collect', 'Mobile client info collection form'],
              ['book/dashboard/page.tsx', '/book/dashboard', 'Client appointment management'],
              ['book/reschedule/[id]/page.tsx', '/book/reschedule/:id', 'Self-service reschedule'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Team Portal (3)</h2>
            <T headers={['File', 'Route', 'Purpose']} rows={[
              ['team/page.tsx', '/team', 'PIN login (bilingual English/Spanish)'],
              ['team/dashboard/page.tsx', '/team/dashboard', 'Daily jobs, GPS check-in/out, earnings tracker'],
              ['team/[token]/page.tsx', '/team/:token', 'Token-based single booking access (24h expiry)'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Referrer Portal (2)</h2>
            <T headers={['File', 'Route', 'Purpose']} rows={[
              ['referral/page.tsx', '/referral', 'Referrer dashboard (login by email)'],
              ['referral/signup/page.tsx', '/referral/signup', 'Referrer signup form'],
            ]} />
          </div>
        )}

        {s === 'api' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">API Routes (60+)</h1>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Authentication (2)</h2>
            <T headers={['Endpoint', 'Method', 'Purpose']} rows={[
              ['/api/auth/login', 'POST', 'Admin login (rate-limited, 5 attempts / 5 min)'],
              ['/api/auth/logout', 'POST', 'Admin logout (clear cookie)'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Admin CRUD (11) — Protected</h2>
            <T headers={['Endpoint', 'Methods', 'Purpose']} rows={[
              ['/api/bookings', 'GET, POST', 'List all / Create new (sends emails + SMS)'],
              ['/api/bookings/[id]', 'GET, PUT, DELETE', 'Read / Update (auto-emails+SMS on pending→scheduled) / Cancel (soft) / Hard delete'],
              ['/api/bookings/broadcast', 'POST', 'Send emergency job to all cleaners (email + SMS + push)'],
              ['/api/clients', 'GET, POST', 'List all (with stats) / Create new'],
              ['/api/clients/[id]', 'GET, PUT, DELETE', 'Read / Update / Delete'],
              ['/api/clients/[id]/activity', 'GET', 'Full activity timeline (bookings, check-in/out GPS, payments)'],
              ['/api/clients/[id]/transcript', 'GET', 'SMS message transcript (up to 200 messages)'],
              ['/api/cleaners', 'GET, POST', 'List all / Create new (sends welcome email)'],
              ['/api/cleaners/[id]', 'PUT, DELETE', 'Update / Archive'],
              ['/api/cleaners/priority', 'PUT', 'Update team member display order'],
              ['/api/cleaners/upload', 'POST', 'Upload cleaner photo to Supabase Storage'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Client Portal (12)</h2>
            <T headers={['Endpoint', 'Method', 'Purpose']} rows={[
              ['/api/client/check', 'POST', 'Check if email exists'],
              ['/api/client/send-code', 'POST', 'Send SMS verification code'],
              ['/api/client/verify-code', 'POST', 'Verify SMS code (returns do_not_service flag)'],
              ['/api/client/login', 'POST', 'Client login (email + code)'],
              ['/api/client/availability', 'GET', 'Get available time slots'],
              ['/api/client/book', 'POST', 'Submit booking (captures ref_code, blocks DNS clients)'],
              ['/api/client/collect', 'POST', 'Create client from info form'],
              ['/api/client/bookings', 'GET', 'Get client\'s bookings (returns do_not_service flag)'],
              ['/api/client/booking/[id]', 'GET', 'Get single booking details'],
              ['/api/client/reschedule/[id]', 'PUT', 'Reschedule a booking (enforces 7-day rule for recurring, blocks one-time)'],
              ['/api/client/notes', 'GET, PUT', 'Read / Save client notes for booking instructions'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Team Portal (7)</h2>
            <T headers={['Endpoint', 'Method', 'Purpose']} rows={[
              ['/api/team/login', 'POST', 'Team login (4-6 digit PIN)'],
              ['/api/team/jobs', 'GET', 'Get logged-in cleaner\'s jobs + earnings (weekly/monthly/yearly)'],
              ['/api/team/available-jobs', 'GET, POST', 'List claimable jobs / Claim a job (first-come-first-served)'],
              ['/api/team/availability', 'GET, PUT', 'Get / Update cleaner schedule + days off'],
              ['/api/team/[token]', 'GET', 'Token-based job access (24h expiry)'],
              ['/api/team/[token]/check-in', 'POST', 'Record job start + GPS location + distance verification'],
              ['/api/team/[token]/check-out', 'POST', 'Record job end + GPS + calculate pay + create referral commission'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Finance (7)</h2>
            <T headers={['Endpoint', 'Method', 'Purpose']} rows={[
              ['/api/finance/summary', 'GET', 'Revenue, expenses, profit summary'],
              ['/api/finance/pending', 'GET', 'Pending payments list'],
              ['/api/finance/mark-paid', 'PUT', 'Mark booking as paid'],
              ['/api/finance/expenses', 'GET, POST', 'Expense management'],
              ['/api/finance/statements', 'GET, POST', 'Bank statement records'],
              ['/api/finance/upload', 'POST', 'Upload statement file to Supabase storage'],
              ['/api/finance/backfill', 'POST', 'Backfill historical financial data'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Referral Program (4)</h2>
            <T headers={['Endpoint', 'Methods', 'Purpose']} rows={[
              ['/api/referrers', 'GET, POST, PUT', 'Referrer CRUD (public lookup by code/email)'],
              ['/api/referral-commissions', 'GET, POST, PUT', 'Commission management + mark paid'],
              ['/api/referrers/analytics', 'GET', 'Referrer performance analytics'],
              ['/api/client-analytics', 'GET', 'LTV, churn, retention, at-risk stats'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Lead Tracking (4)</h2>
            <T headers={['Endpoint', 'Method', 'Purpose']} rows={[
              ['/api/track', 'POST', 'Tracking pixel — public (visits, CTAs, scroll, time)'],
              ['/api/leads', 'GET', 'Lead analytics by domain (protected)'],
              ['/api/attribution', 'GET, POST', 'Revenue attribution (zip → neighborhood → domain)'],
              ['/api/domain-notes', 'GET, PUT', 'Notes per domain'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Cron Jobs (4) — CRON_SECRET</h2>
            <T headers={['Endpoint', 'Schedule', 'Purpose']} rows={[
              ['/api/cron/reminders', 'Every hour', '7/3/1-day and 2-hour reminders (email+SMS+push) + thank-you emails + pending booking alerts (8am/2pm ET)'],
              ['/api/cron/daily-summary', 'Midnight UTC', 'Email + SMS cleaners tomorrow\'s jobs + recurring booking expiry warnings'],
              ['/api/cron/backup', '5am UTC', 'CSV backup emailed to admin (clients + 6 months of bookings)'],
              ['/api/cron/health-check', 'Periodic', 'Checks Supabase connectivity, error spikes, critical env vars — alerts admin'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Webhooks & Push (2)</h2>
            <T headers={['Endpoint', 'Method', 'Purpose']} rows={[
              ['/api/webhook/telnyx', 'POST', 'Inbound SMS handler — routes to Selena chatbot (new) or existing client handler, delivery status updates, STOP/START consent'],
              ['/api/push/subscribe', 'POST, DELETE', 'Web push subscription management (admin/cleaner/client roles)'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Other (10)</h2>
            <T headers={['Endpoint', 'Method', 'Purpose']} rows={[
              ['/api/dashboard', 'GET', 'Dashboard stats (protected)'],
              ['/api/notifications', 'GET, POST, PUT', 'Notification list + create + mark read (with push)'],
              ['/api/cleaner-applications', 'GET, POST, PUT, DELETE', 'Team applications management (with admin SMS/email alerts)'],
              ['/api/feedback', 'POST', 'Anonymous feedback submission (rate-limited, emails admin)'],
              ['/api/errors', 'POST', 'Client-side error reporting (filters transient errors)'],
              ['/api/send-booking-emails', 'POST', 'Send confirmation/assignment emails'],
              ['/api/test-emails', 'POST', 'Send all 15+ test templates to admin (13 email types, 300ms delay)'],
              ['/api/settings', 'GET, PUT', 'Platform settings (cached 60s)'],
              ['/api/track', 'POST, PATCH, GET', 'Lead tracking pixel — CORS-enabled for cross-domain EMD tracking'],
              ['/api/domain-notes', 'GET, POST', 'Notes per domain'],
            ]} />
          </div>
        )}

        {s === 'components' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Components (13)</h1>
            <T headers={['Component', 'File', 'Purpose']} rows={[
              ['DashboardHeader', 'DashboardHeader.tsx', 'Main nav with all dashboard links + notification bell + mobile hamburger menu'],
              ['AdminHeader', 'AdminHeader.tsx', 'Alternative header component'],
              ['NotificationBell', 'NotificationBell.tsx', 'Bell icon with unread count + dropdown (20+ notification types)'],
              ['DashboardMap', 'DashboardMap.tsx', 'Leaflet map for today\'s jobs (cleaner/status/time filter)'],
              ['WebsitesMap', 'WebsitesMap.tsx', 'Leaflet map for 99 EMD domain locations (region color-coded)'],
              ['AddressAutocomplete', 'AddressAutocomplete.tsx', 'Radar.io powered address input with suggestions'],
              ['RecurringOptions', 'RecurringOptions.tsx', 'Recurring booking frequency selector + date preview generator'],
              ['SidePanel', 'SidePanel.tsx', 'Sliding side panel with backdrop, click-outside-to-close, sticky header'],
              ['ClientActivityFeed', 'ClientActivityFeed.tsx', 'Timeline view of client activity (bookings, GPS check-in/out, payments)'],
              ['ClientTranscript', 'ClientTranscript.tsx', 'Chat-bubble SMS transcript viewer (inbound/outbound, grouped by date)'],
              ['FeedbackWidget', 'FeedbackWidget.tsx', 'Floating anonymous feedback modal (embedded in client portal layout)'],
              ['PushPrompt', 'PushPrompt.tsx', 'Web push notification enrollment (admin/cleaner/client, iOS PWA detection)'],
              ['TranslatedNotes', 'TranslatedNotes.tsx', 'Displays cleaning notes with auto-generated Spanish translation (~80 word dictionary)'],
            ]} />
          </div>
        )}

        {s === 'lib' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Library Files (16)</h1>
            <T headers={['File', 'Purpose', 'Key Exports']} rows={[
              ['supabase.ts', 'Supabase client (lazy-init admin via Proxy)', 'supabase, supabaseAdmin'],
              ['auth.ts', 'Auth utilities (HMAC-SHA256 sessions)', 'protectAdminAPI, protectCronAPI, protectClientAPI, isAdminAuthenticated'],
              ['email.ts', 'Resend email sending (3 retries, backoff)', 'sendEmail'],
              ['email-templates.ts', 'HTML email templates (15+)', 'clientConfirmationEmail, clientReminderEmail, cleanerDailySummaryEmail, cleanerWelcomeEmail, referralCommissionEmail, ...'],
              ['sms.ts', 'Telnyx SMS sending (3 retries, backoff)', 'sendSMS (consent check, delivery logging)'],
              ['sms-chatbot.ts', 'Selena AI chatbot (state machine + agentic tool loop)', 'handleChatbotMessage'],
              ['sms-templates.ts', 'SMS templates (client/cleaner/admin, bilingual, TCPA)', 'smsTemplates (confirmation, reminder, cancellation, broadcast, ...)'],
              ['push.ts', 'Web Push via VAPID protocol', 'sendPushToAll, sendPushToCleaner, sendPushToClient, sendPushToAllCleaners'],
              ['notify.ts', 'Unified notification dispatch (DB + push)', 'notify (inserts notification + sends push)'],
              ['format.ts', 'Formatting utilities', 'formatPhone, formatName, formatEmail, formatAddress'],
              ['tokens.ts', 'Cryptographic token generation', 'generateToken, isTokenValid'],
              ['attribution.ts', 'Revenue attribution (zip → neighborhood → domain)', 'attributeByAddress, autoAttributeBooking'],
              ['geo.ts', 'Geocoding + distance (Radar API)', 'geocodeAddress, calculateDistance, MAX_DISTANCE_MILES'],
              ['settings.ts', 'Business config with DB persistence + 60s cache', 'getSettings, clearSettingsCache'],
              ['error-tracking.ts', 'Error logging + email alerts (rate-limited)', 'trackError (logs to notifications + alerts admin)'],
              ['validate-email.ts', 'Email validation + typo detection', 'validateEmail (TLD typos, domain typos, suggestions)'],
            ]} />
          </div>
        )}

        {s === 'security' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Security</h1>
            <Card title="" accent="green">
              <p className="font-semibold">All admin APIs are protected (as of Feb 2026)</p>
            </Card>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Authentication Layers</h2>
            <T headers={['Layer', 'Method', 'Protects']} rows={[
              ['Proxy (middleware)', 'Cookie check', '/admin/* pages'],
              ['protectAdminAPI()', 'Cookie check', 'All admin API routes'],
              ['protectCronAPI()', 'CRON_SECRET header', '/api/cron/* routes'],
              ['Team tokens', 'Time-limited UUID (24h)', 'Cleaner check-in/out'],
              ['Client auth', 'SMS verification code', 'Client portal actions'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">API Protection Status</h2>
            <T headers={['Route', 'Status', 'Access']} rows={[
              ['/api/bookings', 'Protected', 'Admin only'],
              ['/api/clients', 'Protected', 'Admin only'],
              ['/api/cleaners', 'Protected', 'Admin only'],
              ['/api/dashboard', 'Protected', 'Admin only'],
              ['/api/leads', 'Protected', 'Admin only'],
              ['/api/notifications', 'Protected', 'Admin only'],
              ['/api/client-analytics', 'Protected', 'Admin only'],
              ['/api/finance/*', 'Protected', 'Admin only'],
              ['/api/referrers (list)', 'Protected', 'Admin only'],
              ['/api/referrers?code=X', 'Public', 'Referrer portal lookup'],
              ['/api/client/collect', 'Public', 'Client info form submission'],
              ['/api/cron/*', 'Protected', 'CRON_SECRET required'],
              ['/api/track', 'Public', 'Tracking pixel (intentional)'],
              ['/api/webhook/telnyx', 'Public', 'Telnyx SMS webhook (inbound messages)'],
              ['/api/push/subscribe', 'Mixed', 'Role-based (admin requires auth, cleaner/client require IDs)'],
              ['/api/feedback', 'Public', 'Anonymous feedback (rate-limited, 3 per 10 min)'],
              ['/api/errors', 'Public', 'Client-side error reporting (filters transient errors)'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Login Security</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Rate limiting:</strong> 5 attempts per 5 minutes per IP</li>
              <li><strong>Cookies:</strong> httpOnly, secure, sameSite strict, 24h expiry</li>
              <li><strong>Password:</strong> Stored in ADMIN_PASSWORD env var (not in DB)</li>
            </ul>
          </div>
        )}

        {s === 'selena' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Selena AI Chatbot</h1>
            <Card title="" accent="blue">
              <p><strong>Character:</strong> Selena, 47, from Queens. Married to Carlos. Grammy energy but hip. 20+ years cleaning. Bilingual — naturally drops Spanglish.</p>
              <p><strong>Architecture:</strong> Deterministic state machine — no LLM, no inference costs, no hallucination. Every response is hand-written.</p>
              <p><strong>Phone:</strong> +1 (888) 316-4019 via Telnyx</p>
            </Card>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Two Conversation Paths</h2>
            <T headers={['Path', 'Who', 'How It Works']} rows={[
              ['New Prospects', 'Unknown phone numbers', '7-state sales funnel — collects location, service type, bedrooms, bathrooms, pricing choice, then sends booking form link'],
              ['Existing Clients', 'Phone matches active client', 'Regex-based intent matching — schedule check, reschedule, cancel, book again, complaint, thanks, and more'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">New Prospect Flow (State Machine)</h2>
            <T headers={['State', 'Selena Asks', 'What She Collects']} rows={[
              ['welcome', '"What part of the city are you in?"', 'Initial greeting'],
              ['ask_location', '"What service do you need? 1-Regular 2-Deep 3-Move 4-Emergency"', 'Neighborhood/area'],
              ['ask_service', '"How many bedrooms?"', 'Service type (17 aliases mapped)'],
              ['ask_bedrooms', '"How many bathrooms?"', 'Bedroom count (0=studio)'],
              ['ask_bathrooms', '"A) $59/hr you supply or B) $75/hr we bring everything"', 'Bathroom count'],
              ['ask_pricing', 'Introduces herself as Selena, sends booking form URL', 'Pricing choice (A or B)'],
              ['form_sent', 'Conversation complete', 'Booking form: washandfoldnyc.com/book/collect?src=sms-chatbot&convo_id={id}'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Existing Client Intents</h2>
            <T headers={['Intent', 'Example Input', 'What Selena Does']} rows={[
              ['Schedule check', '"when is my next clean"', 'Shows date, time, service type, cleaner name'],
              ['Reschedule', '"can I change my time"', 'Acknowledges current booking, asks for new preference'],
              ['Cancel', '"cancel my booking"', 'First-time/one-time: no cancel or reschedule. Recurring: 7 days notice to reschedule, cancel only if discontinuing'],
              ['Book again', '"I need another cleaning"', 'Checks for conflicts, invites scheduling'],
              ['Who\'s coming', '"who is my cleaner"', 'Shows assigned cleaner name + reassurance'],
              ['Last bill', '"how much did I pay"', 'Shows date, service type, price'],
              ['Complaint', '"I\'m unhappy"', 'Immediately escalates to phone call (does NOT handle via text)'],
              ['Thanks/praise', '"great job today"', 'Warm acknowledgment, promises to tell the team'],
              ['Spanish input', '"Hola necesito limpieza"', 'Full Spanish response with offer to help'],
              ['Bot question', '"are you a bot"', '"Ha yes I\'m real! I\'m Selena, I run things here..."'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Knowledge Base (12 Topics)</h2>
            <T headers={['Topic', 'Key Info']} rows={[
              ['Pricing', '$59/hr (client supplies), $75/hr (company supplies), $100/hr emergency, 2hr minimum'],
              ['Services', 'Regular, deep, move in/out, post-construction, Airbnb turnovers, same-day emergency'],
              ['Supplies', '$59 = your own, $75 = full eco-friendly kit'],
              ['Insurance', 'Licensed, bonded, insured, background-checked'],
              ['Cancellation', 'First-time/one-time: no cancel or reschedule. Recurring: 7 days notice to reschedule, cancel only if discontinuing service'],
              ['Payment', 'Zelle or Apple Pay, 15 min before end of service'],
              ['Area', 'Manhattan only'],
              ['About', 'Since 2018, 15,000+ cleanings, 4.9 stars, 98% retention'],
              ['Satisfaction', '24-hour guarantee, handled personally'],
              ['Eco-friendly', 'All eco-friendly, professional grade'],
              ['Emergency', '$100/hr, suggests calling for faster service'],
              ['Deep clean', 'Inside oven, behind fridge, baseboards, ceiling fans, cabinets, ~3 hours'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Smart Features</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Stale conversation timeout</strong> — Conversations expire after 4 hours of inactivity</li>
              <li><strong>Knowledge at any state</strong> — Questions answered mid-flow without breaking the state machine (appends a flow nudge to guide back)</li>
              <li><strong>Day-aware greetings</strong> — Happy Friday, Happy Monday, Happy weekend, or morning/afternoon/evening</li>
              <li><strong>Returning client detection</strong> — Checks inbound message count to know if first-time texter vs. returning</li>
              <li><strong>Cleaner name personalization</strong> — Pulls assigned cleaner name for existing client responses</li>
              <li><strong>Start over command</strong> — "start over" or "reset" expires current conversation and restarts</li>
              <li><strong>Booking context</strong> — Fetches upcoming + last completed booking for existing clients in parallel</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Limitations</h2>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-6">
              <li>No actual booking creation — sends form link, booking completed via web form</li>
              <li>No actual rescheduling/cancellation execution — acknowledges intent, directs to action</li>
              <li>No payment processing — only describes payment methods</li>
              <li>No image/media handling — text only</li>
              <li>No live agent handoff — complaints directed to call office number</li>
            </ul>
          </div>
        )}

        {s === 'sms' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">SMS System</h1>
            <Card title="" accent="blue">
              <p><strong>Provider:</strong> Telnyx</p>
              <p><strong>From:</strong> +1 (888) 316-4019 (TELNYX_FROM_NUMBER)</p>
              <p><strong>Consent model:</strong> Opt-out (default true). Chatbot messages skip consent check.</p>
            </Card>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">SMS Delivery (sms.ts)</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Retry logic</strong> — 3 attempts with exponential backoff (1s, 2s, 4s delays)</li>
              <li><strong>Validation errors</strong> (400/422) are NOT retried</li>
              <li><strong>Phone normalization</strong> — Handles 10-digit, 11-digit (leading 1), international → E.164</li>
              <li><strong>Delivery logging</strong> — Every SMS logged to sms_logs with telnyx_message_id and status</li>
              <li><strong>Consent check</strong> — Checks sms_consent before sending (skipConsent for chatbot messages)</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Telnyx Webhook (/api/webhook/telnyx)</h2>
            <T headers={['Event', 'Action']} rows={[
              ['message.sent / message.delivered', 'Updates sms_logs status'],
              ['message.failed', 'Updates sms_logs status to "failed"'],
              ['Inbound STOP/UNSUBSCRIBE/CANCEL/QUIT', 'Revokes sms_consent on clients + cleaners, expires active chatbot conversation'],
              ['Inbound START/UNSTOP', 'Re-enables sms_consent on clients + cleaners'],
              ['Inbound from existing client', 'Logs to client_sms_messages, routes to Selena (existing client handler), sends response, notifies admin'],
              ['Inbound from unknown number', 'Routes to Selena chatbot (new prospect flow), fallback: notifies admin if error'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">SMS Templates (sms-templates.ts)</h2>
            <p className="text-gray-700 mb-4">All system-initiated SMS (not chatbot) include TCPA-compliant "Reply STOP to opt out" notice.</p>
            <T headers={['Category', 'Templates']} rows={[
              ['Client', 'Confirmation, reminder (standard + 2-hour), cancellation, reschedule, thank-you + 10% off, verification code'],
              ['Cleaner (bilingual EN/ES)', 'Job assignment, daily summary, job cancelled, job rescheduled, urgent broadcast (with pay rate)'],
              ['Admin', 'New client alert, new booking alert, new cleaner application, new referrer'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Transcript Viewer</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Component:</strong> ClientTranscript.tsx — chat-bubble style viewer in admin client detail panel</li>
              <li><strong>Outbound:</strong> Black background, white text, right-aligned</li>
              <li><strong>Inbound:</strong> Gray background, black text, left-aligned</li>
              <li><strong>Grouped by date</strong> with date headers, shows last 6 by default with "Show all" expand</li>
              <li><strong>Data source:</strong> /api/clients/[id]/transcript (up to 200 messages from client_sms_messages table)</li>
            </ul>
          </div>
        )}

        {s === 'dashboard' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Dashboard Home Features</h1>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Revenue Analytics</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Today/Week/Month collected</strong> — Completed + paid jobs</li>
              <li><strong>Amount owed</strong> — Completed but unpaid jobs</li>
              <li><strong>2026 annual revenue</strong> — Actual vs projected breakdown</li>
              <li><strong>10-month forecast</strong> — Monthly scheduled revenue</li>
              <li><strong>Click-through modals</strong> — View job details for any metric</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Overview Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card title="Scheduled Jobs" accent="blue"><p>Upcoming bookings</p></Card>
              <Card title="Completed" accent="green"><p>Last 30 days</p></Card>
              <Card title="Total Clients" accent="gray"><p>All time</p></Card>
              <Card title="New Clients" accent="purple"><p>This month</p></Card>
            </div>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Job Feeds</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Today's jobs</strong> — Current day schedule</li>
              <li><strong>Upcoming jobs</strong> — Next 14 days</li>
              <li><strong>Job details</strong> — Client name, service type, cleaner, status</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Interactive Job Map</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Real-time map view of all job locations</li>
              <li>Filter by cleaner, status, time range</li>
              <li>Color-coded by team member</li>
              <li>Click marker for job details + quick actions</li>
            </ul>
          </div>
        )}

        {s === 'bookings' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Booking System</h1>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Booking Creation</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Client search</strong> — Auto-complete existing clients</li>
              <li><strong>New client inline</strong> — Create client during booking</li>
              <li><strong>Hourly rates</strong> — $59/hr, $75/hr, $100/hr</li>
              <li><strong>Duration</strong> — 1-8 hours in 30-min increments</li>
              <li><strong>Service types</strong> — Standard, Deep, Move In/Out, Post Construction, Emergency</li>
              <li><strong>10% discount</strong> — One-click discount toggle</li>
              <li><strong>Recurring setup</strong> — Weekly, biweekly, monthly, custom intervals</li>
              <li><strong>Emergency broadcast</strong> — Send to all cleaners, first to claim gets it</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Pending Booking Approval</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Public bookings</strong> — All bookings from /book/new are created as "pending"</li>
              <li><strong>Red pending section</strong> — Pending bookings shown at top of bookings page with red styling</li>
              <li><strong>Approval flow</strong> — Admin assigns cleaner → sets status to "scheduled" → auto-sends emails</li>
              <li><strong>Auto-emails on approval</strong> — Client gets confirmation email, cleaner gets assignment email (bilingual)</li>
              <li><strong>Admin notification</strong> — Admin receives email when new booking request is submitted</li>
              <li><strong>Pending reminders</strong> — Cron sends admin reminders at 8am and 2pm ET for unresolved pending bookings</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Booking Edit Panel</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Client info</strong> — Address, phone with Call/Text buttons</li>
              <li><strong>DNS warning</strong> — Red banner if client is flagged Do Not Service</li>
              <li><strong>Status management</strong> — Pending, scheduled, completed, cancelled</li>
              <li><strong>Payment tracking</strong> — Pending/paid, Zelle/Apple Pay</li>
              <li><strong>Cleaner assignment</strong> — Change with dropdown</li>
              <li><strong>Team link</strong> — Copy token URL for cleaner</li>
              <li><strong>Admin check-in</strong> — Blue button to check in on behalf of cleaner (no GPS)</li>
              <li><strong>Admin check-out</strong> — Green button to check out on behalf of cleaner (calculates hours, price, pay)</li>
              <li><strong>Check-in/out display</strong> — Shows timestamps for completed bookings</li>
              <li><strong>Resend email</strong> — Re-send confirmation to client</li>
              <li><strong>Recurring options</strong> — Update single or all future</li>
              <li><strong>Cancellation</strong> — Single or entire series, hard delete for cancelled bookings</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Recurring Bookings</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Weekly, biweekly, monthly frequencies</li>
              <li>End options: never, after X occurrences, on specific date</li>
              <li>Preview of all generated dates</li>
              <li>Bulk update/cancel all future</li>
              <li>Time shift applied to entire series</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Booking Statuses</h2>
            <T headers={['Status', 'Color', 'Description']} rows={[
              ['Pending', 'Red', 'New request from client — awaiting admin approval'],
              ['Scheduled', 'Blue', 'Confirmed by admin — cleaner assigned, emails sent'],
              ['In Progress', 'Yellow', 'Cleaner has checked in'],
              ['Completed', 'Green', 'Cleaner has checked out — hours and pay calculated'],
              ['Cancelled', 'Gray', 'Cancelled by admin — cancellation emails sent'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Check-In / Check-Out</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Cleaner GPS check-in</strong> — Records location via Radar.io when cleaner starts job</li>
              <li><strong>Cleaner GPS check-out</strong> — Records location, calculates hours (rounded up to nearest half-hour), sets cleaner pay ($25/hr × actual_hours)</li>
              <li><strong>Admin check-in</strong> — Blue button in edit panel for remote check-in (no GPS)</li>
              <li><strong>Admin check-out</strong> — Green button in edit panel, auto-calculates hours, price, and cleaner pay</li>
              <li><strong>Half-hour rounding</strong> — Math.ceil(hours × 2) / 2 — always rounds up</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Search & Filter</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Full-text search (client name, phone, address, cleaner)</li>
              <li>Filter by status (including pending), service type, cleaner, date range</li>
              <li>Sort by date, client, cleaner, price</li>
            </ul>
          </div>
        )}

        {s === 'calendar' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Calendar</h1>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">FullCalendar Features</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Views</strong> — Month, week, day switching</li>
              <li><strong>Color-coded</strong> — Each team member has unique color</li>
              <li><strong>Drag-to-move</strong> — Reschedule by dragging events</li>
              <li><strong>Drag-to-resize</strong> — Adjust duration (auto-updates price)</li>
              <li><strong>Click-to-edit</strong> — Open booking edit modal</li>
              <li><strong>Compact view</strong> — Events show time + client first name only</li>
              <li><strong>Current month only</strong> — No extra days from adjacent months</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Filtering</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Filter by team member (dropdown)</li>
              <li>Status checkboxes: pending, scheduled, completed, cancelled</li>
              <li>Pending events shown in red</li>
              <li>Color legend showing team member assignments</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Quick Stats</h2>
            <p className="text-gray-700 mb-4">Inline counts at bottom: X scheduled, Y completed, Z total (filtered by selected cleaner)</p>
          </div>
        )}

        {s === 'clients' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Client Management</h1>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">8 Analytics Cards</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Card title="Total" accent="gray"><p>All clients</p></Card>
              <Card title="New" accent="blue"><p>0 bookings yet</p></Card>
              <Card title="Active" accent="green"><p>Booked in 45 days</p></Card>
              <Card title="At-Risk" accent="yellow"><p>45-90 days ago</p></Card>
              <Card title="Churned" accent="red"><p>90+ days inactive</p></Card>
              <Card title="Referred" accent="purple"><p>From referral program</p></Card>
              <Card title="Total Revenue" accent="gray"><p>Sum of completed</p></Card>
              <Card title="Avg LTV" accent="gray"><p>Lifetime value</p></Card>
            </div>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Client List View</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Sort options</strong> — Newest, name A-Z, last booking, total spent, booking count</li>
              <li><strong>Search</strong> — Name, email, phone, or address</li>
              <li><strong>Filter by status</strong> — Quick buttons for each status</li>
              <li><strong>Client row shows</strong> — Status badge, name, address, contact, dates, spending, referrer</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Client Edit Panel</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Stats bar</strong> — Bookings count, total spent, last booking date</li>
              <li><strong>Quick actions</strong> — Call, Text, Email buttons</li>
              <li><strong>Address autocomplete</strong> — Radar.io powered</li>
              <li><strong>Referrer linking</strong> — Assign/change referrer</li>
              <li><strong>Quick book</strong> — "+ Book for [Client]" link opens booking modal (hidden if DNS)</li>
              <li><strong>DNS toggle</strong> — Red toggle to flag client as Do Not Service</li>
              <li><strong>SMS Transcript</strong> — Chat-bubble viewer of all SMS conversations (ClientTranscript component)</li>
              <li><strong>Activity Feed</strong> — Timeline of bookings, check-in/out (with GPS verification), payments (ClientActivityFeed component)</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Do Not Service (DNS)</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Admin toggle</strong> — Red switch in client edit panel to flag/unflag</li>
              <li><strong>DNS badge</strong> — Red "DNS" badge appears next to client name in table</li>
              <li><strong>DNS filter</strong> — Quick filter button in stats bar (only shows if DNS clients exist)</li>
              <li><strong>Booking blocked</strong> — DNS clients cannot book from public forms or client portal</li>
              <li><strong>API enforcement</strong> — /api/client/book returns 403 for DNS clients</li>
              <li><strong>Portal message</strong> — Client portal shows "Account Restricted" with cancellation policy violation message</li>
              <li><strong>Booking panel warnings</strong> — Red banners in admin create/edit booking if client is DNS</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Client Status Definitions</h2>
            <T headers={['Status', 'Color', 'Definition']} rows={[
              ['New', 'Blue', 'No completed bookings yet'],
              ['Active', 'Green', 'Booked within last 45 days'],
              ['At-Risk', 'Yellow', '45-90 days since last booking'],
              ['Churned', 'Red', '90+ days inactive'],
              ['DNS', 'Red', 'Do Not Service — blocked from booking'],
            ]} />
          </div>
        )}

        {s === 'team' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Team Management</h1>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Team Member Features</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Drag-and-drop ordering</strong> — Reorder team members by priority</li>
              <li><strong>PIN generation</strong> — 4-6 digit auto-generated PINs</li>
              <li><strong>Hourly rate</strong> — Individual pay rate per cleaner</li>
              <li><strong>Schedule setup</strong> — Working days + hours per day</li>
              <li><strong>Active/inactive</strong> — Archive without deleting</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Applications Tab</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Pending count badge</strong> — Shows new applications</li>
              <li><strong>Application details</strong> — Name, phone, email, experience, availability, notes</li>
              <li><strong>Approve & Add</strong> — Creates team member + sends welcome email</li>
              <li><strong>Reject / Delete</strong> — Manage application status</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Team Portal</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Bilingual</strong> — Full English/Spanish interface (TranslatedNotes component for cleaning instructions)</li>
              <li><strong>PIN login</strong> — No password needed</li>
              <li><strong>Daily jobs</strong> — Today's assigned work with expandable details</li>
              <li><strong>GPS check-in/out</strong> — Location recorded + distance verification from client address</li>
              <li><strong>Earnings tracker</strong> — Weekly, monthly, yearly with hours and pay breakdowns</li>
              <li><strong>Emergency jobs</strong> — Claim available broadcasts (first-come-first-served)</li>
              <li><strong>Availability management</strong> — Working days, per-day hours, days off date picker</li>
              <li><strong>Photo management</strong> — Upload/change profile photo</li>
              <li><strong>Push notifications</strong> — PushPrompt component for real-time job alerts</li>
              <li><strong>Save to home screen</strong> — PWA-style instructions (iPhone + Android)</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Welcome Email</h2>
            <p className="text-gray-700 mb-4">New team members receive comprehensive bilingual email with:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-6">
              <li>Portal URL and PIN</li>
              <li>How to save to phone home screen</li>
              <li>Check-in/out importance for pay calculation</li>
              <li>Half-hour rounding rules</li>
              <li>Email notification overview</li>
            </ul>
          </div>
        )}

        {s === 'referrals' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Referral Program</h1>
            <Card title="" accent="green">
              <p><strong>Commission Rate:</strong> 10% of completed service</p>
              <p><strong>Payout Methods:</strong> Zelle or Apple Cash (manual)</p>
            </Card>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">How It Works</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700 mb-6">
              <li>Referrer signs up at <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">/referral/signup</code></li>
              <li>Gets unique ref code and link: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">washandfoldnyc.com/book?ref=CODE</code></li>
              <li>Client books using the referral link</li>
              <li>Client is tagged with referrer_id</li>
              <li>When cleaner checks out → commission auto-created</li>
              <li>Referrer gets email notification</li>
              <li>Admin marks as paid in <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">/admin/referrals</code></li>
            </ol>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Admin Dashboard — 3 Tabs</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Analytics</strong> — KPIs, 14-day click chart, top referrers leaderboard, recent activity</li>
              <li><strong>Payouts</strong> — Pending queue, mark paid (Zelle / Apple), payment history</li>
              <li><strong>Referrers</strong> — All referrers table, codes, earnings, copy link</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Referrer Portal</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Login by email or ref code</li>
              <li>View referral link and copy button</li>
              <li>Track clicks, conversions, earnings</li>
              <li>See commission history</li>
              <li>Payout preference management</li>
            </ul>
          </div>
        )}

        {s === 'leads' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Lead Tracking</h1>
            <p className="text-gray-700 mb-4">View at <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">/admin/leads</code></p>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">99 EMD Domains</h2>
            <p className="text-gray-700 mb-4">Each NYC neighborhood has an Exact Match Domain pointing to a landing page with tracking.</p>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">What Gets Tracked</h2>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-6">
              <li>Page visits (with referrer source, device type)</li>
              <li>CTA clicks — call, text, book, directions</li>
              <li>Scroll depth and time on page</li>
              <li>First/last touch attribution</li>
              <li>Lead ID for deterministic tracking</li>
              <li>Referral code capture</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Dashboard Features</h2>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-6">
              <li><strong>KPI Row</strong> — Today visits, this week, this month, annual, total visits, total calls, total texts, conversion rate</li>
              <li><strong>Traffic Sources</strong> — Top 20 referrers in 2-column layout (Google, Bing, ChatGPT, Claude, DuckDuckGo, etc.) with percentage bars</li>
              <li><strong>Domain Health</strong> — Revenue-generating, Converting, Traffic-only, No traffic status cards</li>
              <li><strong>Live Feed</strong> — Last 25 events (excludes direct traffic, shows real referrer visits + CTAs)</li>
              <li><strong>Domain Drill-Down</strong> — Detailed stats + AI recommendations per domain + editable notes</li>
              <li><strong>Date Ranges</strong> — Today, 7d, 14d, 30d, 90d</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Revenue Attribution</h2>
            <ol className="list-decimal pl-6 space-y-1 text-gray-700 mb-6">
              <li>Extract zip code from client address</li>
              <li>Match zip to neighborhood</li>
              <li>Match neighborhood to EMD domain</li>
              <li>Attribute revenue to that domain</li>
            </ol>
          </div>
        )}

        {s === 'finance' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Finance</h1>
            <p className="text-gray-700 mb-4">View at <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">/admin/finance</code></p>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Revenue Tracking</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Summary view</strong> — Total revenue, expenses, profit by period</li>
              <li><strong>Pending payments</strong> — Completed jobs not yet paid</li>
              <li><strong>Mark as paid</strong> — Quick payment recording</li>
              <li><strong>Payment methods</strong> — Track Zelle vs Apple Pay</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Expense Management</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Add expenses</strong> — Amount, category, date, description</li>
              <li><strong>Receipt upload</strong> — Attach receipts to expenses</li>
              <li><strong>Category tracking</strong> — Supplies, equipment, transport, etc.</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Bank Statements</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Upload statements</strong> — PDF/CSV to Supabase storage</li>
              <li><strong>Reconciliation</strong> — Match payments to bookings</li>
              <li><strong>History</strong> — View all uploaded statements</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Export</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>CSV export</strong> — Download financial data</li>
              <li><strong>Date range selection</strong> — Custom period exports</li>
              <li><strong>1099 preparation</strong> — Contractor payment reports</li>
            </ul>
          </div>
        )}

        {s === 'portals' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">User Portals</h1>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Admin Dashboard</h2>
            <Card title="" accent="gray">
              <p><strong>URL:</strong> /admin</p>
              <p><strong>Login:</strong> /login (password from ADMIN_PASSWORD env var)</p>
              <p><strong>Features:</strong> 11 sub-pages — overview, bookings, calendar, clients, team, finance, websites, leads, referrals, settings, docs</p>
            </Card>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Client Portal</h2>
            <Card title="" accent="gray">
              <p><strong>URL:</strong> /book</p>
              <p><strong>Login:</strong> Email → SMS verification code</p>
              <p><strong>Features:</strong> 3-step booking flow, view appointments, self-service reschedule, referral code support, notes in booking flow</p>
              <p><strong>DNS blocking:</strong> Flagged clients see "Account Restricted" message and cannot book or reschedule</p>
              <p><strong>Cancellation policy:</strong> Shown on all booking forms — one-time non-cancellable, recurring 7 days notice</p>
              <p><strong>Reschedule rules:</strong> One-time bookings cannot reschedule. Recurring clients need 7+ days notice</p>
            </Card>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Client Info Collection</h2>
            <Card title="" accent="gray">
              <p><strong>URL:</strong> /book/collect</p>
              <p><strong>No login required</strong> — send to clients while on the phone</p>
              <p><strong>Collects:</strong> Name, email, phone, address, apt/unit, referral info</p>
              <p><strong>Chatbot integration:</strong> When ?convo_id= is present (from Selena chatbot), shows "Almost done!" banner, creates pending booking from chatbot data, migrates transcript to client</p>
              <p><strong>On submit:</strong> Creates client, checks for duplicate phone, auto-links referrer, sends admin email + SMS</p>
            </Card>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Team Portal</h2>
            <Card title="" accent="gray">
              <p><strong>URL:</strong> /team</p>
              <p><strong>Login:</strong> 4-6 digit PIN</p>
              <p><strong>Features:</strong> Daily jobs, GPS check-in/out, earnings tracker, emergency job claiming, Google Maps navigation</p>
              <p><strong>Bilingual:</strong> Full English/Spanish interface</p>
              <p><strong>Token access:</strong> /team/[token] for direct job links (24h expiry)</p>
            </Card>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Referrer Portal</h2>
            <Card title="" accent="gray">
              <p><strong>Signup:</strong> /referral/signup</p>
              <p><strong>Dashboard:</strong> /referral (login by email or ref code)</p>
              <p><strong>Features:</strong> View earnings, copy referral link, analytics, commission history, payout preferences</p>
            </Card>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Team Application</h2>
            <Card title="" accent="gray">
              <p><strong>URL:</strong> /apply</p>
              <p><strong>Bilingual:</strong> Full English/Spanish form</p>
              <p><strong>Collects:</strong> Name, phone, email, address, experience, availability, notes</p>
              <p><strong>On submit:</strong> Creates application, admin reviews in Team page</p>
            </Card>
          </div>
        )}

        {s === 'emails' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Email System</h1>
            <Card title="" accent="gray">
              <p><strong>Email Provider:</strong> Resend (from: hi@washandfoldnyc.com)</p>
              <p><strong>SMS Provider:</strong> Telnyx (from: +18883164019) — see SMS System section for full details</p>
              <p><strong>Push Provider:</strong> Web Push via VAPID protocol</p>
              <p><strong>Email Templates:</strong> 15+ HTML templates in email-templates.ts (Outlook/MSO compatible)</p>
            </Card>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Email Types (18+)</h2>
            <T headers={['Email', 'To', 'When']} rows={[
              ['Booking Confirmation', 'Client', 'When admin approves pending → scheduled (includes cleaner name, prep tips, payment info, supplies, tipping, cancellation policy, portal link)'],
              ['Cleaner Assignment', 'Cleaner', 'When admin approves pending → scheduled (bilingual EN/ES)'],
              ['Client Reschedule', 'Client', 'When client reschedules from portal'],
              ['Admin Reschedule', 'Admin', 'When client reschedules (notification)'],
              ['Cleaner Reschedule', 'Cleaner', 'When booking is rescheduled (bilingual EN/ES)'],
              ['7-Day Reminder', 'Client', '7 days before appointment'],
              ['3-Day Reminder', 'Client', '3 days before appointment'],
              ['1-Day Reminder', 'Client', 'Evening before appointment'],
              ['2-Hour Reminder', 'Client', '2 hours before service'],
              ['Pending Reminders', 'Admin', '8am and 2pm ET — unresolved pending bookings summary'],
              ['Daily Job Summary', 'Cleaner', '7pm EST daily'],
              ['Cancellation (Client)', 'Client', 'On booking cancellation'],
              ['Cancellation (Cleaner)', 'Cleaner', 'On booking cancellation (bilingual EN/ES)'],
              ['Commission Notification', 'Referrer', 'On checkout (commission created)'],
              ['Welcome Email', 'Cleaner', 'When new team member added (includes PIN + full guide, bilingual)'],
              ['Referrer Welcome', 'Referrer', 'When referrer signs up'],
              ['Referral Signup Notify', 'Referrer', 'When someone books using their code'],
              ['New Booking Request', 'Admin', 'When client submits public booking form'],
              ['Backup Report', 'Admin', 'Midnight EST daily (CSV attachment)'],
              ['New Client Alert', 'Admin', 'When client submits /book/collect form'],
              ['Resend Confirmation', 'Client', 'Manual resend from booking edit'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Email Features</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Deduplication</strong> — email_logs table prevents duplicate sends</li>
              <li><strong>Responsive design</strong> — Mobile-friendly HTML templates</li>
              <li><strong>Bilingual</strong> — Cleaner emails include both English and Spanish</li>
              <li><strong>Conditional content</strong> — Reminder emails show "Need to reschedule?" for recurring clients, "Questions?" for one-time</li>
              <li><strong>Auto-triggered</strong> — Confirmation and assignment emails sent automatically when pending → scheduled</li>
              <li><strong>Test all emails</strong> — Settings → Tools → Send Test Emails</li>
              <li><strong>Resend button</strong> — Re-send confirmation from booking edit modal</li>
            </ul>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Confirmation Email Details</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Welcome message</strong> — Personalized greeting with assigned cleaner name</li>
              <li><strong>Appointment details</strong> — Date, time, address, service type, cleaner, price</li>
              <li><strong>Payment reminder</strong> — Zelle (hi@washandfoldnyc.com) / Apple Pay 15 minutes before service</li>
              <li><strong>Prep tips</strong> — What to do before the cleaner arrives</li>
              <li><strong>Supplies note</strong> — Clients must provide cleaning supplies</li>
              <li><strong>Tipping policy</strong> — Encouraged but not required</li>
              <li><strong>Cancellation policy</strong> — One-time non-cancellable, recurring 7 days notice</li>
              <li><strong>Portal link</strong> — Link to client booking portal</li>
            </ul>
          </div>
        )}

        {s === 'cron' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Cron Jobs</h1>
            <Card title="" accent="yellow">
              <p><strong>All cron routes require CRON_SECRET header</strong></p>
            </Card>

            <T headers={['Job', 'Cron', 'NYC Time', 'What It Does']} rows={[
              ['/api/cron/reminders', '0 * * * *', 'Every hour', '7/3/1-day reminders (email+SMS+push), 2-hour reminders, thank-you emails (3d post-first booking), pending booking alerts (8am/2pm), unpaid cleaner alerts'],
              ['/api/cron/daily-summary', '0 0 * * *', '7pm EST', 'Email + SMS each cleaner tomorrow\'s jobs, check recurring booking expiry (30-day warning)'],
              ['/api/cron/backup', '0 5 * * *', 'Midnight EST', 'CSV backup emailed to admin (clients + 6 months bookings)'],
              ['/api/cron/health-check', '*/15 * * * *', 'Every 15 min', 'Supabase connectivity, error spike detection (5+ errors/hr), critical env var check'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">vercel.json</h2>
            <pre className="bg-gray-900 text-gray-300 p-4 rounded-lg text-sm overflow-x-auto mb-6">
{`{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "0 * * * *" },
    { "path": "/api/cron/daily-summary", "schedule": "0 0 * * *" },
    { "path": "/api/cron/backup", "schedule": "0 5 * * *" },
    { "path": "/api/cron/health-check", "schedule": "*/15 * * * *" }
  ]
}`}
            </pre>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Manual Triggers</h2>
            <p className="text-gray-700 mb-4">All cron jobs can be manually triggered from Settings → Tools:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-6">
              <li>Run Daily Summary Now</li>
              <li>Run Reminders Now</li>
              <li>Run Backup Now</li>
            </ul>
          </div>
        )}

        {s === 'notifications' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Notification System</h1>
            <p className="text-gray-700 mb-4">Bell icon in DashboardHeader with unread count badge. Click to see dropdown with mark-as-read.</p>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">20+ Notification Types</h2>
            <T headers={['Type', 'Color', 'Trigger']} rows={[
              ['new_booking', 'Blue', 'New booking created'],
              ['booking_cancelled', 'Red', 'Booking cancelled'],
              ['booking_completed / job_complete', 'Green', 'Cleaner checked out'],
              ['booking_rescheduled / reschedule', 'Blue', 'Client rescheduled'],
              ['check_in', 'Green', 'Cleaner checked in (GPS or admin) — includes distance verification'],
              ['check_out', 'Green', 'Job completed (GPS or admin)'],
              ['payment_received', 'Green', 'Payment marked paid'],
              ['pending_reminder', 'Yellow', 'Unresolved pending bookings reminder (8am/2pm cron)'],
              ['referral_lead', 'Purple', 'Referrer not in system — needs signup link'],
              ['new_client', 'Blue', 'New client registered or submitted /book/collect'],
              ['new_referrer', 'Purple', 'New referrer signed up'],
              ['referral_commission', 'Yellow', 'Commission auto-created at checkout'],
              ['hot_lead', 'Orange', 'Book/call/text click from EMD domain'],
              ['cleaner_application', 'Purple', 'New team member application'],
              ['job_broadcast', 'Orange', 'Emergency job broadcast sent to all cleaners'],
              ['job_claimed', 'Green', 'Emergency job claimed by cleaner'],
              ['recurring_expiring', 'Yellow', 'Recurring booking ending within 30 days'],
              ['sms_reply', 'Blue', 'Inbound SMS from existing client (admin notification)'],
              ['feedback', 'Gray', 'User submitted anonymous feedback'],
              ['error', 'Red', 'System error (tracked by error-tracking.ts)'],
              ['system', 'Gray', 'System alerts and health check issues'],
            ]} />
          </div>
        )}

        {s === 'settings' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Settings</h1>
            <p className="text-gray-700 mb-4">Route: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">/admin/settings</code></p>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">6 Tabs</h2>
            <T headers={['Tab', 'Contents']} rows={[
              ['Business', 'Business name, phone, email, website, admin notification email, from address'],
              ['Services & Pricing', 'Service types (Standard, Deep, Move In/Out, Post Construction), rates ($49/$59/$75/$100), payment methods (Cash, Zelle, Venmo, Apple Pay, Check)'],
              ['Scheduling', 'Business hours (start/end), booking buffer (minutes), default duration, minimum days ahead, same-day toggle'],
              ['Referrals & Policies', 'Commission rate (10%), attribution window (48hr), active client threshold (45d), at-risk (90d), reschedule notice (7d recurring, no reschedule one-time)'],
              ['Notifications', 'Reminder days (7/3/1), hours-before (2hr), daily summary toggle, email template preview, "Send All Test Emails" button'],
              ['Tools', 'Manual triggers: Daily Summary, Reminders, Backup, Test Emails. System info: Environment, Platform, Database, Email Provider'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Tools Section Features</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Run Daily Summary</strong> — Manually send tomorrow's jobs to all cleaners</li>
              <li><strong>Run Reminders</strong> — Manually trigger reminder check</li>
              <li><strong>Run Backup</strong> — Manually send CSV backup to admin</li>
              <li><strong>Send All Test Emails</strong> — Sends all 15+ email templates to admin for preview</li>
            </ul>
          </div>
        )}

        {s === 'env' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Environment Variables</h1>
            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Core</h2>
            <T headers={['Variable', 'Required', 'Purpose']} rows={[
              ['NEXT_PUBLIC_SUPABASE_URL', 'Yes', 'Supabase project URL'],
              ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Yes', 'Supabase public anon key'],
              ['SUPABASE_SERVICE_ROLE_KEY', 'Yes', 'Supabase admin access (bypasses RLS)'],
              ['RESEND_API_KEY', 'Yes', 'Resend email API key'],
              ['ADMIN_PASSWORD', 'Yes', 'Admin login password (used for HMAC session signing)'],
              ['CRON_SECRET', 'Yes', 'Protects cron endpoints (Bearer token)'],
              ['ADMIN_EMAIL', 'Yes', 'Email for backups, test emails, error alerts'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">SMS (Telnyx)</h2>
            <T headers={['Variable', 'Required', 'Purpose']} rows={[
              ['TELNYX_API_KEY', 'Yes', 'Telnyx API key for sending SMS'],
              ['TELNYX_FROM_NUMBER', 'Optional', 'SMS sender number (default: +18883164019)'],
              ['ADMIN_PHONE', 'Optional', 'Admin phone for SMS alerts (new bookings, new clients, etc.)'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Push Notifications (VAPID)</h2>
            <T headers={['Variable', 'Required', 'Purpose']} rows={[
              ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'Yes', 'VAPID public key for push subscription'],
              ['VAPID_PRIVATE_KEY', 'Yes', 'VAPID private key for sending push'],
              ['VAPID_EMAIL', 'Optional', 'Contact email for VAPID (mailto:)'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Other</h2>
            <T headers={['Variable', 'Required', 'Purpose']} rows={[
              ['RADAR_API_KEY', 'Optional', 'Radar.io geocoding + address autocomplete (server-side)'],
              ['NEXT_PUBLIC_RADAR_API_KEY', 'Optional', 'Radar.io address autocomplete (client-side)'],
            ]} />
          </div>
        )}

        {s === 'deployment' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Deployment</h1>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Deploy Process</h2>
            <pre className="bg-gray-900 text-gray-300 p-4 rounded-lg text-sm overflow-x-auto mb-6">
{`# 1. Build locally
npm run build

# 2. Commit and deploy
git add . && git commit -m "changes"
vercel --prod

# 3. Push to GitHub
git push origin main`}
            </pre>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Links</h2>
            <T headers={['Service', 'URL']} rows={[
              ['Live Site', 'www.washandfoldnyc.com'],
              ['Vercel', 'vercel.com/jeff-tuckers-projects/nycmaid'],
              ['GitHub', 'github.com/washandfoldnyc'],
              ['Supabase', 'supabase.com/dashboard/project/ioppmvchszymwswtwsze'],
            ]} />

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Important Notes</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Next.js 16</strong> uses <code className="bg-gray-100 px-1 rounded">middleware.ts</code> for auth + security headers (HMAC-SHA256 session verification, CSP, HSTS, X-Frame-Options)</li>
              <li><strong>Cron jobs</strong> configured in vercel.json</li>
              <li><strong>Environment variables</strong> set in Vercel dashboard</li>
            </ul>
          </div>
        )}

        {s === 'troubleshooting' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1E2A4A] mb-6">Troubleshooting</h1>

            <div className="space-y-4 mb-6">
              <Card title="Emails Going to Spam" accent="red">
                <p>New domain reputation. DKIM/SPF/DMARC verified. Improves naturally over 1-2 weeks.</p>
              </Card>
              <Card title="401 Unauthorized on API" accent="red">
                <p>Not logged in. Go to /login and authenticate.</p>
              </Card>
              <Card title="Cron Jobs Not Running" accent="red">
                <p>CRON_SECRET not set or doesn't match in Vercel env vars.</p>
              </Card>
              <Card title="Commission Not Created" accent="red">
                <p>Client doesn't have referrer_id. Ensure client was linked to referrer when booking.</p>
              </Card>
              <Card title="Referrer Portal Not Loading" accent="red">
                <p>Invalid ref code or email. Check referrer exists and is active in database.</p>
              </Card>
              <Card title="Team Member Can't Login" accent="red">
                <p>Check PIN is correct (4-6 digits). Verify cleaner is marked as active.</p>
              </Card>
              <Card title="Calendar Events Not Showing" accent="red">
                <p>Check status filter checkboxes. "Scheduled" should be checked for upcoming jobs.</p>
              </Card>
              <Card title="SMS Not Sending" accent="red">
                <p>Check TELNYX_API_KEY env var. Verify sms_consent is true for recipient. Check sms_logs table for delivery status. Telnyx webhook must be configured to POST to /api/webhook/telnyx.</p>
              </Card>
              <Card title="Selena Chatbot Not Responding" accent="red">
                <p>Check Telnyx webhook URL is correct. Verify sms_conversations table exists. Check Vercel function logs for errors. Conversations expire after 4 hours — user may need to text again.</p>
              </Card>
              <Card title="Push Notifications Not Working" accent="red">
                <p>Check VAPID keys are set. iOS requires Add to Home Screen (standalone PWA mode). Verify push_subscriptions table has entries. Check browser notification permissions.</p>
              </Card>
            </div>

            <h2 className="text-lg font-semibold text-[#1E2A4A] mt-8 mb-3">Debug Commands</h2>
            <pre className="bg-gray-900 text-gray-300 p-4 rounded-lg text-sm overflow-x-auto mb-6">
{`# Check Vercel logs
vercel logs --follow

# Test API (need auth cookie)
curl -b "admin_authenticated=true" https://www.washandfoldnyc.com/api/dashboard

# Check build
npm run build 2>&1 | head -50

# Read docs as JSON
curl https://www.washandfoldnyc.com/api/docs | jq .`}
            </pre>
          </div>
        )}

        </main>
      </div>
  )
}
