import Link from 'next/link'
import { getCurrentTenant } from '@/lib/tenant'
import { supabaseAdmin } from '@/lib/supabase'

// The Loop — pixel-faithful build of platform/docs/design/the-loop-frame.html.
// Stats are real, tenant-scoped aggregates (empty tenants render 0). No mock
// data. Unsourced stats (payouts table, Selena conv %, pages-live) are omitted
// rather than fabricated.

type StatTag =
  | { kind: 'plain'; text: string }
  | { kind: 'up'; text: string }
  | { kind: 'warn'; text: string }
  | { kind: 'live'; text: string }

type Stat = {
  label: string
  tag?: StatTag
  value: React.ReactNode
  sub?: React.ReactNode
  href?: string
}

function StatCell({ s }: { s: Stat }) {
  const inner = (
    <div className="px-7 first:pl-0 last:pr-0 last:border-r-0 cursor-pointer" style={{ borderRight: '1px solid var(--color-loop-line)' }}>
      <div className="flex items-center justify-between mb-3" style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--color-loop-muted)', fontWeight: 600, lineHeight: 1.3 }}>
        <span>{s.label}</span>
        {s.tag && <Tag t={s.tag} />}
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: '38px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: 'var(--color-loop-ink)', fontFeatureSettings: '"tnum","lnum"' }}>
        {s.value}
      </div>
      {s.sub && (
        <div className="mt-2" style={{ fontSize: '11.5px', color: 'var(--color-loop-muted)', lineHeight: 1.4 }}>
          {s.sub}
        </div>
      )}
    </div>
  )
  return s.href ? <Link href={s.href}>{inner}</Link> : inner
}

function Tag({ t }: { t: StatTag }) {
  if (t.kind === 'up') {
    return <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--color-loop-good)', fontWeight: 500 }}>↗ {t.text}</span>
  }
  if (t.kind === 'warn') {
    return <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--color-loop-warn)', fontWeight: 500 }}>{t.text}</span>
  }
  if (t.kind === 'live') {
    return (
      <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--color-loop-good)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--color-loop-good)', animation: 'loop-pulse 2s infinite' }} />
        {t.text}
      </span>
    )
  }
  return <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--color-loop-muted-2)' }}>{t.text}</span>
}

function BarLabel({ children, split }: { children: React.ReactNode; split?: boolean }) {
  return (
    <div
      className="inline-block mb-3"
      style={{
        fontFamily: 'var(--mono)',
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        color: 'var(--color-loop-ink)',
        fontWeight: 600,
        paddingBottom: split ? 0 : '6px',
        borderBottom: split ? 'none' : '1px solid var(--color-loop-ink)',
        minWidth: '100px',
      }}
    >
      {children}
      {split && (
        <span style={{ display: 'block', width: '80px', height: '1px', background: 'var(--color-loop-ink)', marginTop: '4px' }} />
      )}
    </div>
  )
}

const dollar = (
  <span style={{ fontSize: '19px', color: 'var(--color-loop-muted)', fontWeight: 400, verticalAlign: 'top', marginRight: '1px' }}>$</span>
)
const strong = (s: React.ReactNode) => (
  <strong style={{ color: 'var(--color-loop-ink)', fontWeight: 500 }}>{s}</strong>
)

const small = (s: React.ReactNode) => (
  <span style={{ fontSize: '22px', color: 'var(--color-loop-muted)', fontWeight: 400 }}>{s}</span>
)

const money = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

// Real per-tenant aggregates. Every number is a tenant-scoped query; an empty
// tenant returns 0 across the board. Returns the four stat rows the page renders.
async function loadDashboardStats(tenantId: string): Promise<{
  sales: Stat[]; ops: Stat[]; leads: Stat[]; apps: Stat[]
}> {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
  const fortyFiveAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)
  const iso = (d: Date) => d.toISOString()
  const sumPrice = (rows: { price: number | null }[] | null) =>
    (rows || []).reduce((s, r) => s + (r.price || 0), 0)
  const t = <T,>(q: T): T => q

  const [
    monthPaid, weekPaid, ytdPaid, outstanding, pipeline,
    newClients, roster, todayLive, teamActive,
    leadsToday, leadsWeek, appsNew, recentBookingClientIds,
  ] = await Promise.all([
    t(supabaseAdmin.from('bookings').select('price').eq('tenant_id', tenantId).eq('status', 'completed').eq('payment_status', 'paid').gte('start_time', iso(startOfMonth)).lte('start_time', iso(endOfMonth))),
    t(supabaseAdmin.from('bookings').select('price').eq('tenant_id', tenantId).eq('status', 'completed').eq('payment_status', 'paid').gte('start_time', iso(startOfWeek)).lt('start_time', iso(endOfWeek))),
    t(supabaseAdmin.from('bookings').select('price').eq('tenant_id', tenantId).eq('status', 'completed').eq('payment_status', 'paid').gte('start_time', iso(startOfYear)).lte('start_time', iso(endOfYear))),
    t(supabaseAdmin.from('bookings').select('price').eq('tenant_id', tenantId).eq('status', 'completed').eq('payment_status', 'pending')),
    t(supabaseAdmin.from('bookings').select('price').eq('tenant_id', tenantId).in('status', ['confirmed', 'scheduled', 'in_progress']).gte('start_time', iso(startOfDay)).lte('start_time', iso(endOfYear))),
    t(supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', iso(startOfMonth))),
    t(supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId)),
    t(supabaseAdmin.from('bookings').select('id, status', { count: 'exact' }).eq('tenant_id', tenantId).gte('start_time', iso(startOfDay)).lt('start_time', iso(endOfDay)).in('status', ['confirmed', 'scheduled', 'in_progress', 'completed'])),
    t(supabaseAdmin.from('team_members').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active')),
    t(supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', iso(startOfDay))),
    t(supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', iso(startOfWeek))),
    t(supabaseAdmin.from('cleaner_applications').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending')),
    t(supabaseAdmin.from('bookings').select('client_id').eq('tenant_id', tenantId).gte('start_time', iso(fortyFiveAgo))),
  ])

  const monthRev = sumPrice(monthPaid.data as { price: number | null }[] | null)
  const monthJobs = (monthPaid.data as unknown[] | null)?.length || 0
  const weekRev = sumPrice(weekPaid.data as { price: number | null }[] | null)
  const weekJobs = (weekPaid.data as unknown[] | null)?.length || 0
  const ytdRev = sumPrice(ytdPaid.data as { price: number | null }[] | null)
  const outRows = outstanding.data as { price: number | null }[] | null
  const outRev = sumPrice(outRows)
  const outCount = outRows?.length || 0
  const pipelineRev = sumPrice(pipeline.data as { price: number | null }[] | null)
  const pipelineCount = (pipeline.data as unknown[] | null)?.length || 0
  const rosterTotal = roster.count || 0
  const todayRows = (todayLive.data as { status: string }[] | null) || []
  const todayActive = todayRows.filter(r => r.status === 'in_progress').length
  const todayTotal = todayLive.count || todayRows.length

  // At-risk: clients with no booking in the last 45 days.
  const activeClientIds = new Set((recentBookingClientIds.data as { client_id: string | null }[] | null || []).map(r => r.client_id).filter(Boolean))
  const atRisk = Math.max(0, rosterTotal - activeClientIds.size)

  const monthLabel = now.toLocaleDateString('en-US', { month: 'short' })

  const sales: Stat[] = [
    { label: `Revenue · ${monthLabel}`, tag: { kind: 'plain', text: `${monthJobs} jobs` }, value: <>{dollar}{money(monthRev)}</>, sub: <>YTD {strong(`$${money(ytdRev)}`)}</> },
    { label: 'Outstanding', tag: outCount ? { kind: 'warn', text: `${outCount} due` } : undefined, value: <>{dollar}{money(outRev)}</>, sub: <>{strong(String(outCount))} unpaid</> },
    { label: 'Pipeline', tag: { kind: 'plain', text: `${pipelineCount} booked` }, value: <>{dollar}{money(pipelineRev)}</>, sub: <>forward booked</> },
    { label: `New Clients · ${monthLabel}`, value: String(newClients.count || 0), sub: <>Roster {strong(String(rosterTotal))}</> },
  ]
  const ops: Stat[] = [
    { label: "Today's Jobs", tag: todayActive ? { kind: 'live', text: `${todayActive} active` } : undefined, value: <>{todayActive}{small(` / ${todayTotal}`)}</> },
    { label: 'Team Active', value: <>{teamActive.count || 0}{small(' members')}</> },
    { label: 'This Week', tag: { kind: 'plain', text: `${weekJobs} jobs` }, value: <>{dollar}{money(weekRev)}</> },
    { label: 'At-Risk Clients', tag: atRisk ? { kind: 'warn', text: String(atRisk) } : undefined, value: String(atRisk), sub: <>No booking {strong('45+ days')}</> },
  ]
  const leads: Stat[] = [
    { label: 'Today', value: String(leadsToday.count || 0) },
    { label: 'Week', value: String(leadsWeek.count || 0) },
  ]
  const apps: Stat[] = [
    { label: 'New', tag: (appsNew.count || 0) ? { kind: 'warn', text: 'pending' } : undefined, value: String(appsNew.count || 0), sub: 'awaiting review' },
  ]
  return { sales, ops, leads, apps }
}

const ACTION_CARDS = [
  { num: '01', title: 'New Client', desc: 'Add a client manually or import', href: '/dashboard/clients?new=1' },
  { num: '02', title: 'New Booking', desc: 'Schedule a job for an existing client', href: '/dashboard/bookings?new=1' },
  { num: '03', title: 'New Lead', desc: 'Log an inbound inquiry', href: '/dashboard/leads?new=1' },
  { num: '04', title: 'New Quote', desc: 'Send a price estimate', href: '/dashboard/sales?new=quote' },
  { num: '05', title: 'Add Team Member', desc: 'Onboard a new cleaner', href: '/dashboard/team?new=1' },
  { num: '06', title: 'Send Campaign', desc: 'Email or SMS blast to clients', href: '/dashboard/campaigns?new=1' },
  { num: '07', title: 'Request Review', desc: 'Send review link to a client', href: '/dashboard/reviews?new=1' },
  { num: '08', title: 'Block Time', desc: 'Mark unavailable on the calendar', href: '/dashboard/calendar?block=1' },
]

export default async function DashboardPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) return null

  const { sales, ops, leads, apps } = await loadDashboardStats(tenant.id)

  return (
    <>
      {/* SALES BAR */}
      <BarLabel>Sales</BarLabel>
      <div className="grid pb-6 mb-6" style={{ gridTemplateColumns: `repeat(${sales.length}, 1fr)`, borderBottom: '1px solid var(--color-loop-line)' }}>
        {sales.map((s, i) => (
          <StatCell key={i} s={s} />
        ))}
      </div>

      {/* OPERATIONS BAR */}
      <BarLabel>Operations</BarLabel>
      <div className="grid pb-6 mb-6" style={{ gridTemplateColumns: `repeat(${ops.length}, 1fr)`, borderBottom: '1px solid var(--color-loop-line)' }}>
        {ops.map((s, i) => (
          <StatCell key={i} s={s} />
        ))}
      </div>

      {/* PIPELINE BAR — split into Leads + Applications */}
      <div className="grid pb-7 mb-8" style={{ gridTemplateColumns: '1fr 1px 1fr', gap: '28px', borderBottom: '1px solid var(--color-loop-line)' }}>
        <div className="flex flex-col">
          <BarLabel split>New Leads</BarLabel>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.max(leads.length, 1)}, 1fr)` }}>
            {leads.map((s, i) => (
              <StatCell key={i} s={s} />
            ))}
          </div>
        </div>
        <div style={{ background: 'var(--color-loop-line)', width: '1px' }} />
        <div className="flex flex-col">
          <BarLabel split>Job Applications</BarLabel>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.max(apps.length, 1)}, 1fr)` }}>
            {apps.map((s, i) => (
              <StatCell key={i} s={s} />
            ))}
          </div>
        </div>
      </div>

      {/* ACTION CARDS */}
      <div className="grid overflow-hidden rounded" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--color-loop-line)', border: '1px solid var(--color-loop-line)' }}>
        {ACTION_CARDS.map((c) => (
          <Link
            key={c.num}
            href={c.href}
            className="relative cursor-pointer transition-colors hover:bg-[#FBFBF8] group"
            style={{ background: 'var(--color-loop-canvas)', padding: '24px 26px', minHeight: '130px', display: 'flex', flexDirection: 'column' }}
          >
            <span
              className="absolute opacity-0 group-hover:opacity-100 transition-all"
              style={{ top: '22px', right: '22px', fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)', fontSize: '14px' }}
            >
              →
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--color-loop-muted-2)', letterSpacing: '0.1em', marginBottom: '14px', fontWeight: 500 }}>
              {c.num}
            </span>
            <div style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--color-loop-ink)', marginBottom: '6px' }}>
              {c.title}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-loop-muted)', lineHeight: 1.4 }}>
              {c.desc}
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
