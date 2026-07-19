import Link from 'next/link'
import { getCurrentTenant } from '@/lib/tenant'
import { supabaseAdmin } from '@/lib/supabase'
import { PIPELINE_STAGES, stageMeta, computeStageTotals } from '@/lib/pipeline'
import ClickableStatGrid, { type ClickableStatTile } from '../../_components/ClickableStatGrid'
import type { BreakdownItem } from '../../_components/BreakdownModal'

// Sales Dashboard — analytics/stats, distinct from the Pipeline kanban at
// /dashboard/sales (Pipeline/Leads/Qualify/Quotes/Sales/Schedule tabs).
// Same server-rendered, tenant-scoped, click-to-breakdown pattern as the
// Home "Loop" dashboard (src/app/dashboard/page.tsx).
export const dynamic = 'force-dynamic'

const V = {
  line: 'var(--color-loop-line)', canvas: 'var(--color-loop-canvas)', ink: 'var(--color-loop-ink)',
  muted: 'var(--color-loop-muted)', muted2: 'var(--color-loop-muted-2)',
  good: 'var(--color-loop-good)', warn: 'var(--color-loop-warn)',
  display: 'var(--display)', mono: 'var(--mono)',
}

const formatMoney = (cents: number) =>
  '$' + Math.round((cents || 0) / 100).toLocaleString('en-US')
const formatDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const inRange = (iso: string | null, a: Date, b: Date) => {
  if (!iso) return false
  const d = new Date(iso)
  return d >= a && d <= b
}
const sum = (rows: Deal[]) => rows.reduce((s, d) => s + (d.value_cents || 0), 0)

const PENDING_QUOTE_STATUSES = ['sent', 'viewed']

type Deal = {
  id: string
  stage: string
  status: string | null
  value_cents: number
  probability: number | null
  source: string | null
  lost_reason: string | null
  created_at: string
  closed_at: string | null
  expected_close_date: string | null
  clients: { name: string | null; address: string | null } | null
}

type Quote = {
  id: string
  quote_number: string | null
  status: string
  total_cents: number | null
  created_at: string
  accepted_at: string | null
  contact_name: string | null
  clients: { name: string | null } | null
}

function dealToItem(d: Deal): BreakdownItem {
  return {
    id: d.id,
    title: d.clients?.name || 'No client',
    subtitle: `${stageMeta(d.stage).label}${d.source ? ' · ' + d.source : ''}`,
    meta: d.stage === 'lost' ? (d.lost_reason || undefined) : undefined,
    amountCents: d.value_cents || 0,
    date: formatDate(d.created_at),
    status: d.stage === 'lost' ? (d.lost_reason || 'lost') : d.stage,
    statusTone: d.stage === 'sold' ? 'good' : d.stage === 'lost' ? 'warn' : 'muted',
    href: '/dashboard/sales?tab=pipeline',
  }
}

function quoteToItem(q: Quote): BreakdownItem {
  return {
    id: q.id,
    title: q.clients?.name || q.contact_name || 'No client',
    subtitle: q.quote_number || undefined,
    amountCents: q.total_cents || 0,
    date: formatDate(q.created_at),
    status: q.status,
    statusTone: q.status === 'accepted' ? 'good' : 'muted',
    href: `/dashboard/sales/quotes/${q.id}`,
  }
}

export default async function SalesDashboardPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) return null

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 86400000)
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 86400000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  const endOfQuarter = new Date(startOfQuarter.getFullYear(), startOfQuarter.getMonth() + 3, 0, 23, 59, 59)
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
  const monthShort = now.toLocaleDateString('en-US', { month: 'short' })
  const yearStr = String(now.getFullYear())

  const [dealsRes, quotesRes] = await Promise.all([
    supabaseAdmin.from('deals')
      .select('id,stage,status,value_cents,probability,source,lost_reason,created_at,closed_at,expected_close_date,clients(name,address)')
      .eq('tenant_id', tenant.id)
      .limit(3000),
    supabaseAdmin.from('quotes')
      .select('id,quote_number,status,total_cents,created_at,accepted_at,contact_name,clients(name)')
      .eq('tenant_id', tenant.id)
      .limit(3000),
  ])
  const deals = (dealsRes.data || []) as unknown as Deal[]
  const quotes = (quotesRes.data || []) as unknown as Quote[]

  // LEADS — unworked deals sitting at stage 'new' (matches the Home stats line's definition).
  const leadsAll = deals.filter(d => d.stage === 'new')
  const leadsWeek = leadsAll.filter(d => inRange(d.created_at, startOfWeek, endOfWeek))
  const leadsToday = leadsAll.filter(d => inRange(d.created_at, startOfDay, endOfDay))
  const leadsLadder: ClickableStatTile[] = [
    { key: 'total', label: 'Total Leads', value: String(leadsAll.length), modalTitle: 'Leads · Unworked', items: leadsAll.map(dealToItem) },
    { key: 'week', label: 'Leads · Week', value: String(leadsWeek.length), modalTitle: 'Leads · This Week', items: leadsWeek.map(dealToItem) },
    { key: 'today', label: 'Leads · Today', value: String(leadsToday.length), modalTitle: 'Leads · Today', items: leadsToday.map(dealToItem) },
  ]

  // PROPOSALS — quotes pending decision vs accepted, by day/week/month.
  const pendingQuotes = quotes.filter(q => PENDING_QUOTE_STATUSES.includes(q.status))
  const approvedQuotes = quotes.filter(q => q.status === 'accepted')
  const proposalsLadder: ClickableStatTile[] = [
    { key: 'pend-day', label: 'Pending · Day', value: String(pendingQuotes.filter(q => inRange(q.created_at, startOfDay, endOfDay)).length), modalTitle: 'Pending Proposals · Today', items: pendingQuotes.filter(q => inRange(q.created_at, startOfDay, endOfDay)).map(quoteToItem) },
    { key: 'pend-week', label: 'Pending · Week', value: String(pendingQuotes.filter(q => inRange(q.created_at, startOfWeek, endOfWeek)).length), modalTitle: 'Pending Proposals · This Week', items: pendingQuotes.filter(q => inRange(q.created_at, startOfWeek, endOfWeek)).map(quoteToItem) },
    { key: 'pend-month', label: 'Pending · Month', value: String(pendingQuotes.filter(q => inRange(q.created_at, startOfMonth, endOfMonth)).length), modalTitle: 'Pending Proposals · This Month', items: pendingQuotes.filter(q => inRange(q.created_at, startOfMonth, endOfMonth)).map(quoteToItem) },
    { key: 'appr-day', label: 'Approved · Day', value: String(approvedQuotes.filter(q => inRange(q.accepted_at, startOfDay, endOfDay)).length), modalTitle: 'Approved Proposals · Today', items: approvedQuotes.filter(q => inRange(q.accepted_at, startOfDay, endOfDay)).map(quoteToItem) },
    { key: 'appr-week', label: 'Approved · Week', value: String(approvedQuotes.filter(q => inRange(q.accepted_at, startOfWeek, endOfWeek)).length), modalTitle: 'Approved Proposals · This Week', items: approvedQuotes.filter(q => inRange(q.accepted_at, startOfWeek, endOfWeek)).map(quoteToItem) },
    { key: 'appr-month', label: 'Approved · Month', value: String(approvedQuotes.filter(q => inRange(q.accepted_at, startOfMonth, endOfMonth)).length), modalTitle: 'Approved Proposals · This Month', items: approvedQuotes.filter(q => inRange(q.accepted_at, startOfMonth, endOfMonth)).map(quoteToItem) },
  ]

  // CLOSE RATE — sold vs lost, by closed_at (set when a deal moves to sold/lost).
  const closedIn = (a: Date, b: Date) => deals.filter(d => (d.stage === 'sold' || d.stage === 'lost') && inRange(d.closed_at, a, b))
  const closeRate = (rows: Deal[]) => {
    const won = rows.filter(d => d.stage === 'sold').length
    const lost = rows.length - won
    return { pct: rows.length > 0 ? Math.round((won / rows.length) * 100) : 0, won, lost }
  }
  const allClosed = deals.filter(d => d.stage === 'sold' || d.stage === 'lost')
  const crMonth = closeRate(closedIn(startOfMonth, endOfMonth))
  const crQuarter = closeRate(closedIn(startOfQuarter, endOfQuarter))
  const crYear = closeRate(closedIn(startOfYear, endOfYear))
  const crAll = closeRate(allClosed)
  const closeRateTiles: ClickableStatTile[] = [
    { key: 'month', label: `Close Rate · ${monthShort}`, value: `${crMonth.pct}%`, sub: `${crMonth.won}W / ${crMonth.lost}L`, modalTitle: `Closed Deals · ${monthShort}`, items: closedIn(startOfMonth, endOfMonth).map(dealToItem) },
    { key: 'quarter', label: 'Close Rate · Quarter', value: `${crQuarter.pct}%`, sub: `${crQuarter.won}W / ${crQuarter.lost}L`, modalTitle: 'Closed Deals · This Quarter', items: closedIn(startOfQuarter, endOfQuarter).map(dealToItem) },
    { key: 'ytd', label: 'Close Rate · YTD', value: `${crYear.pct}%`, sub: `${crYear.won}W / ${crYear.lost}L`, modalTitle: `Closed Deals · ${yearStr} YTD`, items: closedIn(startOfYear, endOfYear).map(dealToItem) },
    { key: 'all', label: 'Close Rate · All-Time', value: `${crAll.pct}%`, sub: `${crAll.won}W / ${crAll.lost}L`, modalTitle: 'All Closed Deals', items: allClosed.map(dealToItem) },
  ]

  // REVENUE BY STAGE — current pipeline value sitting in each stage (computeStageTotals is the
  // same helper the Forecast tab math uses; reused here instead of re-deriving stage totals).
  const stageTotals = computeStageTotals(deals.map(d => ({ ...d, status: d.status || 'active' })))
  const stageTiles: ClickableStatTile[] = PIPELINE_STAGES.map(s => {
    const t = stageTotals.get(s.value) || { count: 0, totalCents: 0, weightedCents: 0 }
    const stageDeals = deals.filter(d => d.stage === s.value)
    return {
      key: s.value,
      label: s.label,
      value: formatMoney(t.totalCents),
      sub: `${t.count} deal${t.count === 1 ? '' : 's'}`,
      modalTitle: `${s.label} · Pipeline`,
      items: stageDeals.map(dealToItem),
    }
  })

  // TREND — leads created + $ sold per month, this calendar year.
  const monthsByYear: ClickableStatTile[] = Array.from({ length: 12 }, (_, monthIdx) => {
    const mStart = new Date(now.getFullYear(), monthIdx, 1)
    const mEnd = new Date(now.getFullYear(), monthIdx + 1, 0, 23, 59, 59)
    const monthLeads = deals.filter(d => inRange(d.created_at, mStart, mEnd))
    const monthSold = deals.filter(d => d.stage === 'sold' && inRange(d.closed_at, mStart, mEnd))
    const isCurrent = monthIdx === now.getMonth()
    const isFuture = monthIdx > now.getMonth()
    const label = mStart.toLocaleDateString('en-US', { month: 'short' })
    return {
      key: label,
      label,
      labelColor: isCurrent ? V.ink : undefined,
      value: String(monthLeads.length),
      valueColor: monthLeads.length === 0 ? V.muted2 : undefined,
      sub: monthSold.length > 0 ? formatMoney(sum(monthSold)) : '—',
      background: isCurrent ? '#FBFBF6' : (isFuture ? 'transparent' : undefined),
      modalTitle: `${label} ${yearStr} · New Leads`,
      items: monthLeads.map(dealToItem),
    }
  })

  const Bar = ({ children }: { children: React.ReactNode }) => (
    <div className="inline-block mb-3" style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.ink, fontWeight: 600, paddingBottom: '6px', borderBottom: `1px solid ${V.ink}`, minWidth: '100px' }}>
      {children}
    </div>
  )

  return (
    <>
      <Link href="/dashboard/sales" className="text-xs mb-4 inline-block" style={{ color: V.muted }}>← Sales Pipeline</Link>
      <h1 className="mb-6" style={{ fontFamily: V.display, fontSize: '24px', fontWeight: 500, color: V.ink }}>Sales Dashboard</h1>

      <Bar>Leads</Bar>
      <ClickableStatGrid tiles={leadsLadder} columns={3} tokens={V} valueFontSize={26} />

      <Bar>Proposals</Bar>
      <ClickableStatGrid tiles={proposalsLadder} columns={6} tokens={V} valueFontSize={22} />

      <Bar>Close Rate</Bar>
      <ClickableStatGrid tiles={closeRateTiles} columns={4} tokens={V} valueFontSize={28} />

      <Bar>Revenue by Stage</Bar>
      <ClickableStatGrid tiles={stageTiles} columns={6} tokens={V} valueFontSize={22} />

      <Bar>{`Leads · ${yearStr} by Month`}</Bar>
      <ClickableStatGrid tiles={monthsByYear} columns={12} tokens={V} padding="px-3 py-4" valueFontSize={22} labelLetterSpacing="0.14em" />

      <Bar>Top Performers</Bar>
      <div className="mb-8 px-5 py-4" style={{ background: V.canvas, border: `1px solid ${V.line}`, color: V.muted, fontSize: '13px' }}>
        Deals have an <code>owner_id</code> column, but no UI currently assigns a sales rep to a deal
        or quote — every deal is effectively unowned today. A per-rep leaderboard would need a
        rep-assignment picker added to the deal card first; showing one now would mean fabricating
        attribution the data doesn&apos;t have.
      </div>
    </>
  )
}
