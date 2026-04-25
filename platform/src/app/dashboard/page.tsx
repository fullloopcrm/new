import Link from 'next/link'
import { getCurrentTenant } from '@/lib/tenant'

// The Loop — pixel-faithful build of platform/docs/design/the-loop-frame.html.
// Mock numbers for now so the visual lands exactly. Aggregator endpoints
// (one per stat) replace the mocks in a follow-up; the layout/styling does
// not need to change when real data arrives.

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
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '38px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: 'var(--color-loop-ink)', fontFeatureSettings: '"tnum","lnum"' }}>
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
    return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-loop-good)', fontWeight: 500 }}>↗ {t.text}</span>
  }
  if (t.kind === 'warn') {
    return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-loop-warn)', fontWeight: 500 }}>{t.text}</span>
  }
  if (t.kind === 'live') {
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-loop-good)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--color-loop-good)', animation: 'loop-pulse 2s infinite' }} />
        {t.text}
      </span>
    )
  }
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-loop-muted-2)' }}>{t.text}</span>
}

function BarLabel({ children, split }: { children: React.ReactNode; split?: boolean }) {
  return (
    <div
      className="inline-block mb-3"
      style={{
        fontFamily: 'var(--font-mono)',
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

const SALES_STATS: Stat[] = [
  {
    label: 'Revenue · Apr',
    tag: { kind: 'up', text: '+18%' },
    value: <>{dollar}14,364</>,
    sub: <>{strong('70')} jobs · YTD {strong('$37,949')}</>,
  },
  {
    label: 'Outstanding',
    tag: { kind: 'warn', text: '3 due' },
    value: <>{dollar}675</>,
    sub: <>Oldest {strong('17h')} · Mo Reisman</>,
  },
  {
    label: 'Pipeline · 2026',
    tag: { kind: 'plain', text: '362 booked' },
    value: <>{dollar}77K</>,
    sub: <>{strong('$39K')} forward booked</>,
  },
  {
    label: 'New Clients · Apr',
    tag: { kind: 'up', text: '+41%' },
    value: '130',
    sub: <>Roster {strong('444')} · best month</>,
  },
  {
    label: 'Payouts Due',
    tag: { kind: 'warn', text: '2 cleaners' },
    value: <>{dollar}239</>,
    sub: <>Karina {strong('$93')} · Gloria {strong('$146')}</>,
  },
]

const small = (s: React.ReactNode) => (
  <span style={{ fontSize: '22px', color: 'var(--color-loop-muted)', fontWeight: 400 }}>{s}</span>
)

const OPS_STATS: Stat[] = [
  {
    label: "Today's Jobs",
    tag: { kind: 'live', text: '1 active' },
    value: <>1{small(' / 1')}</>,
    sub: <>Maria H. · {strong('2.5h')} in</>,
  },
  {
    label: 'Team On-Duty',
    tag: { kind: 'plain', text: '2/4' },
    value: <>2{small(' working')}</>,
    sub: 'Maria, Gloria · 2 off',
  },
  {
    label: 'Selena · Live',
    tag: { kind: 'live', text: '2 active' },
    value: <>87{small('% conv')}</>,
    sub: 'Cristina A. · Leo G.',
  },
  {
    label: 'This Week',
    tag: { kind: 'plain', text: '11 jobs' },
    value: <>{dollar}2,275</>,
    sub: <>Next: Mon 8a · Coby Berliner</>,
  },
  {
    label: 'At-Risk Clients',
    tag: { kind: 'warn', text: '8' },
    value: '8',
    sub: <>No booking {strong('45+ days')}</>,
  },
]

const LEADS_STATS: Stat[] = [
  { label: 'Today', tag: { kind: 'plain', text: 'organic' }, value: '7', sub: '4 chat · 3 form' },
  { label: 'Week', tag: { kind: 'up', text: '+22%' }, value: '38', sub: 'vs 31 last wk' },
  { label: 'Awaiting You', tag: { kind: 'warn', text: '3' }, value: '3', sub: 'Selena escalated' },
]

const APPS_STATS: Stat[] = [
  { label: 'New', tag: { kind: 'warn', text: '5 unread' }, value: '12', sub: 'last 7 days' },
  { label: 'In Review', tag: { kind: 'plain', text: 'trial' }, value: '3', sub: 'paid trial scheduled' },
  { label: 'Pages Live', tag: { kind: 'plain', text: '281' }, value: '281', sub: 'neighborhood hiring' },
]

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

  return (
    <>
      {/* SALES BAR */}
      <BarLabel>Sales</BarLabel>
      <div className="grid pb-6 mb-6" style={{ gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1px solid var(--color-loop-line)' }}>
        {SALES_STATS.map((s, i) => (
          <StatCell key={i} s={s} />
        ))}
      </div>

      {/* OPERATIONS BAR */}
      <BarLabel>Operations</BarLabel>
      <div className="grid pb-6 mb-6" style={{ gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1px solid var(--color-loop-line)' }}>
        {OPS_STATS.map((s, i) => (
          <StatCell key={i} s={s} />
        ))}
      </div>

      {/* PIPELINE BAR — split into Leads + Applications */}
      <div className="grid pb-7 mb-8" style={{ gridTemplateColumns: '1fr 1px 1fr', gap: '28px', borderBottom: '1px solid var(--color-loop-line)' }}>
        <div className="flex flex-col">
          <BarLabel split>New Leads</BarLabel>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {LEADS_STATS.map((s, i) => (
              <StatCell key={i} s={s} />
            ))}
          </div>
        </div>
        <div style={{ background: 'var(--color-loop-line)', width: '1px' }} />
        <div className="flex flex-col">
          <BarLabel split>Job Applications</BarLabel>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {APPS_STATS.map((s, i) => (
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
              style={{ top: '22px', right: '22px', fontFamily: 'var(--font-mono)', color: 'var(--color-loop-muted)', fontSize: '14px' }}
            >
              →
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--color-loop-muted-2)', letterSpacing: '0.1em', marginBottom: '14px', fontWeight: 500 }}>
              {c.num}
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--color-loop-ink)', marginBottom: '6px' }}>
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
