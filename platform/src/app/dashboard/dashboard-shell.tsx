'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import ToastProvider from './toast-provider'
import AutoPageSettings from './auto-page-settings'
import SelenaBar from './selena-bar'

type SidebarCounts = {
  clients: number
  bookings: number
  leads: number
  notifications: number
  connect: number
}

type Notif = {
  id: string
  tone: 'warn' | 'good' | 'info'
  text: string
  time: string
  seen?: boolean
}

// 6-section nav locked in platform/docs/design/tokens.md.
// Each top-level item maps to its primary destination. Sub-items use the
// `sb-sub` / `sb-letter` pattern from the mockup — A/B/C lettered children
// rendered immediately below the parent.
type Sub = { letter: string; label: string; href: string }
const navMain: Array<{
  num: string
  label: string
  href: string
  countKey?: keyof SidebarCounts
  fold: string
  subs: Sub[]
}> = [
  { num: '00', label: 'The Loop', href: '/dashboard', fold: 'loop', subs: [] },
  { num: '01', label: 'Sales', href: '/dashboard/sales', countKey: 'leads', fold: 'sales', subs: [
    { letter: 'A', label: 'Leads', href: '/dashboard/leads' },
    { letter: 'B', label: 'Pipeline', href: '/dashboard/sales' },
  ]},
  { num: '02', label: 'Schedule', href: '/dashboard/bookings', countKey: 'bookings', fold: 'schedule', subs: [
    { letter: 'A', label: 'Bookings', href: '/dashboard/bookings' },
    { letter: 'B', label: 'Calendar', href: '/dashboard/calendar' },
    { letter: 'C', label: 'Recurring', href: '/dashboard/schedules' },
  ]},
  { num: '03', label: 'Clients', href: '/dashboard/clients', countKey: 'clients', fold: 'clients', subs: [
    { letter: 'A', label: 'All Clients', href: '/dashboard/clients' },
    { letter: 'B', label: 'SMS Inbox', href: '/dashboard/sms' },
  ]},
  { num: '04', label: 'Team', href: '/dashboard/team', fold: 'team', subs: [
    { letter: 'A', label: 'Members', href: '/dashboard/team' },
  ]},
  { num: '05', label: 'Finance', href: '/dashboard/finance', fold: 'finance', subs: [
    { letter: 'A', label: 'Overview', href: '/dashboard/finance' },
    { letter: 'B', label: 'Transactions', href: '/dashboard/finance/transactions' },
    { letter: 'C', label: 'Receipts', href: '/dashboard/finance/receipts' },
  ]},
  { num: '06', label: 'Marketing', href: '/dashboard/campaigns', fold: 'marketing', subs: [
    { letter: 'A', label: 'Campaigns', href: '/dashboard/campaigns' },
    { letter: 'B', label: 'Reviews', href: '/dashboard/reviews' },
    { letter: 'C', label: 'Referrals', href: '/dashboard/referrals' },
    { letter: 'D', label: 'Social', href: '/dashboard/social' },
    { letter: 'E', label: 'Google', href: '/dashboard/google' },
    { letter: 'F', label: 'Websites', href: '/dashboard/websites' },
    { letter: 'G', label: 'Analytics', href: '/dashboard/analytics' },
    { letter: 'H', label: 'Map', href: '/dashboard/map' },
  ]},
]

// Routes that conceptually fold under each top-level section. Used to
// determine the active highlight when a user is on a sub-page.
const foldMap: Record<string, string[]> = {
  loop: ['/dashboard'],
  sales: ['/dashboard/sales', '/dashboard/leads'],
  schedule: ['/dashboard/bookings', '/dashboard/calendar', '/dashboard/schedules'],
  clients: ['/dashboard/clients', '/dashboard/sms'],
  team: ['/dashboard/team'],
  finance: ['/dashboard/finance'],
  marketing: [
    '/dashboard/campaigns', '/dashboard/reviews', '/dashboard/referrals',
    '/dashboard/social', '/dashboard/google', '/dashboard/websites',
    '/dashboard/analytics', '/dashboard/map',
  ],
}

const navPlatform = [
  { label: 'Settings', href: '/dashboard/settings' },
  { label: 'Selena', href: '/dashboard/selena' },
  { label: 'Notifications', href: '/dashboard/notifications' },
  { label: 'Activity', href: '/dashboard/activity' },
  { label: 'Docs', href: '/dashboard/docs' },
  { label: 'Connect', href: '/dashboard/connect' },
  { label: 'Feedback', href: '/dashboard/feedback' },
]

function activeFold(pathname: string): string | null {
  // Exact match first (so /dashboard wins over /dashboard/* prefixes)
  if (pathname === '/dashboard') return 'loop'
  for (const [fold, hrefs] of Object.entries(foldMap)) {
    if (hrefs.some((h) => h !== '/dashboard' && pathname.startsWith(h))) return fold
  }
  return null
}

function pageTitleFromPath(pathname: string): string {
  if (pathname === '/dashboard') return 'The Loop'
  const seg = pathname.replace(/^\/dashboard\/?/, '').split('/')[0] || 'The Loop'
  // Capitalize each word, replace dashes with spaces
  return seg
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

const QUOTES = [
  { text: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
  { text: 'Quality is not an act, it is a habit.', author: 'Aristotle' },
  { text: "If you're not embarrassed by the first version of your product, you've launched too late.", author: 'Reid Hoffman' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'Done is better than perfect.', author: 'Sheryl Sandberg' },
]

// Day-of-building counter — counts forward from a fixed start so the same
// number renders for everyone who looks at the dashboard on a given day.
const BUILD_START = new Date('2025-10-01T00:00:00Z').getTime()

function dayOfBuilding(): number {
  const days = Math.floor((Date.now() - BUILD_START) / (24 * 60 * 60 * 1000))
  return Math.max(1, days)
}

function todayQuote(): { text: string; author: string } {
  // Stable per day so it doesn't flicker across requests.
  const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000))
  return QUOTES[dayIndex % QUOTES.length]
}

function topbarMeta(): string {
  const now = new Date()
  const day = now.toLocaleDateString('en-US', { weekday: 'long' })
  const month = now.toLocaleDateString('en-US', { month: 'long' })
  const date = now.getDate()
  const year = now.getFullYear()
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).replace(' ', '')
  // ISO week
  const target = new Date(now.valueOf())
  target.setDate(target.getDate() + 4 - ((target.getDay() + 6) % 7))
  const week = Math.ceil(((target.getTime() - new Date(target.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)
  return `${day} · ${month} ${date}, ${year} · ${time} EST · Week ${week}`
}

function formatBadge(count: number): string {
  if (count > 99) return '99+'
  return String(count)
}

export default function DashboardShell({
  tenantName,
  primaryColor: _primaryColor,
  impersonationBanner,
  isAdminImpersonation,
  children,
}: {
  tenantName: string
  primaryColor: string
  impersonationBanner: React.ReactNode | null
  isAdminImpersonation?: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname() || '/dashboard'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [counts, setCounts] = useState<SidebarCounts | null>(null)
  const [meta, setMeta] = useState(topbarMeta())
  const fold = activeFold(pathname)

  useEffect(() => {
    fetch('/api/sidebar-counts')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setCounts(data)
      })
      .catch(() => {})
  }, [])

  // Tick the topbar minute display.
  useEffect(() => {
    const id = setInterval(() => setMeta(topbarMeta()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Stub notifications: real wiring (security_events / overdue / Selena
  // escalations) lands in a follow-up. For now, derive a small list from
  // sidebar counts so the block isn't empty.
  const notifs: Notif[] = []
  if (counts && counts.notifications > 0) {
    notifs.push({ id: 'n', tone: 'warn', text: `${counts.notifications} unread notification${counts.notifications === 1 ? '' : 's'}`, time: 'now' })
  }
  if (counts && counts.leads > 0) {
    notifs.push({ id: 'l', tone: 'info', text: `${counts.leads} new lead${counts.leads === 1 ? '' : 's'}`, time: 'today' })
  }

  const quote = todayQuote()
  const day = dayOfBuilding()
  const title = pageTitleFromPath(pathname)
  const isLoop = pathname === '/dashboard'

  return (
    <div
      className="loop-scope min-h-screen flex"
      style={{ background: 'var(--color-loop-bg)' }}
    >
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`w-60 fixed inset-y-0 left-0 z-40 flex flex-col transform transition-transform md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ background: 'var(--color-loop-ink)', color: 'var(--color-loop-muted-2)', borderRight: '1px solid #2E2E2E' }}
      >
        {/* Brand */}
        <div className="px-[22px] pt-[22px] pb-1">
          <Link href="/dashboard" className="block" style={{ fontFamily: 'var(--display)', fontSize: '19px', fontWeight: 500, letterSpacing: '-0.015em', color: '#F4F4F1' }}>
            {tenantName || 'Full Loop'}<i style={{ fontStyle: 'italic', color: '#888', fontWeight: 400 }}>/</i>
          </Link>
        </div>
        <div className="px-[22px] pb-4" style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          v2.4 · NYC
        </div>

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto pb-20">
          {/* Notifications */}
          {notifs.length > 0 && (
            <>
              <div className="mx-[22px] mt-[14px] mb-[6px] flex items-baseline justify-between" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#5A5A5A', fontWeight: 600 }}>
                <span>Notifications</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', color: '#888', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '2px' }}>
                  {notifs.length} new
                </span>
              </div>
              {notifs.map((n) => (
                <div key={n.id} className={`px-[22px] py-1.5 flex items-center gap-2 ${n.seen ? 'opacity-50' : ''}`} style={{ fontSize: '12px', color: '#C8C5BC' }}>
                  <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: n.tone === 'warn' ? '#E8A04A' : n.tone === 'good' ? '#4ADE80' : '#6A6A66' }} />
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{n.text}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', color: '#666' }}>{n.time}</span>
                </div>
              ))}
              <Link href="/dashboard/notifications" className="block mx-[22px] mt-1 pb-2 hover:text-white" style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid #2A2A2A' }}>
                Read all activity →
              </Link>
            </>
          )}

          {/* The Loop section */}
          <div className="mx-[22px] mt-[14px] mb-[6px]" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#5A5A5A', fontWeight: 600 }}>
            The Loop
          </div>
          {navMain.map((item) => {
            const isActive = fold === item.fold
            const badge = item.countKey && counts ? counts[item.countKey] : 0
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="px-[22px] py-1.5 flex items-center gap-3 transition-colors group"
                  style={{
                    fontSize: '13.5px',
                    color: isActive ? '#F4F4F1' : '#A8A8A4',
                    borderLeft: `2px solid ${isActive ? '#F4F4F1' : 'transparent'}`,
                    background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: isActive ? '#F4F4F1' : '#5A5A5A', width: '18px', flexShrink: 0 }}>
                    {item.num}
                  </span>
                  <span>{item.label}</span>
                  {badge > 0 && (
                    <span className="ml-auto" style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '2px' }}>
                      {formatBadge(badge)}
                    </span>
                  )}
                </Link>
                {item.subs.map((sub) => {
                  const subActive = pathname === sub.href || pathname.startsWith(sub.href + '/')
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-2.5 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                      style={{
                        padding: '4px 22px 4px 44px',
                        fontSize: '12.5px',
                        color: subActive ? '#C8C5BC' : '#888',
                      }}
                    >
                      <span style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '9.5px',
                        color: subActive ? '#888' : '#555',
                        width: '12px',
                        flexShrink: 0,
                        letterSpacing: '0.04em',
                      }}>
                        {sub.letter}
                      </span>
                      <span>{sub.label}</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}

          {/* Platform section */}
          <div className="mx-[22px] mt-[14px] mb-[6px]" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#5A5A5A', fontWeight: 600 }}>
            Platform
          </div>
          {navPlatform.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="px-[22px] py-1.5 flex items-center gap-3"
                style={{
                  fontSize: '13.5px',
                  color: isActive ? '#F4F4F1' : '#A8A8A4',
                  borderLeft: `2px solid ${isActive ? '#F4F4F1' : 'transparent'}`,
                  background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                }}
              >
                <span style={{ width: '18px', flexShrink: 0 }} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-[22px] pt-[14px] pb-[18px]" style={{ background: 'linear-gradient(to top, #1C1C1C 70%, transparent)' }}>
          <div className="flex items-center gap-2 pt-3" style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: '#888', borderTop: '1px solid #2E2E2E', letterSpacing: '0.04em' }}>
            <span className="w-[6px] h-[6px] rounded-full" style={{ background: '#4ADE80', boxShadow: '0 0 8px rgba(74,222,128,0.4)' }} />
            All systems operational
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            {isAdminImpersonation ? (
              <Link href="/admin" style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ← Back to Admin
              </Link>
            ) : (
              <UserButton afterSignOutUrl="/sign-in" />
            )}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0 overflow-y-auto md:ml-60 pb-32" style={{ background: 'var(--color-loop-bg)' }}>
        {impersonationBanner}
        <div className="px-12 pt-4 pb-24 max-w-[1500px]">
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 mb-4 -ml-2"
            style={{ color: 'var(--color-loop-muted)' }}
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* TOPBAR */}
          <div className="flex items-center justify-end mb-3">
            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--color-loop-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {meta}
            </span>
          </div>

          {/* MASTHEAD */}
          <div className="flex items-start justify-between pb-[22px] mb-8" style={{ borderBottom: '1px solid var(--color-loop-ink)' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--display)', fontSize: '44px', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {title}
                <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--color-loop-muted)' }}>.</em>
              </h1>
              {isLoop && (
                <div className="mt-3 relative pl-4 max-w-[640px]" style={{ fontFamily: 'var(--display)', fontSize: '16px', fontStyle: 'italic', fontWeight: 400, color: 'var(--color-loop-graphite)', letterSpacing: '-0.005em', lineHeight: 1.4 }}>
                  <span className="absolute -left-0.5 -top-1.5" style={{ fontSize: '32px', color: 'var(--color-loop-muted-2)', fontStyle: 'normal', lineHeight: 1 }}>“</span>
                  {quote.text}
                  <span className="ml-2 whitespace-nowrap" style={{ fontFamily: 'var(--mono)', fontStyle: 'normal', fontSize: '10.5px', color: 'var(--color-loop-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    — {quote.author}
                  </span>
                </div>
              )}
            </div>
            {isLoop && (
              <span className="text-right" style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--color-loop-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.6 }}>
                Day {day}<br />of building
              </span>
            )}
          </div>

          <AutoPageSettings />
          {children}
        </div>
      </main>

      {/* Sticky Selena bar (every dashboard page) */}
      <SelenaBar />

      <ToastProvider />
      {/* Tawk widget removed — Selena AI bar replaces it. */}
    </div>
  )
}
