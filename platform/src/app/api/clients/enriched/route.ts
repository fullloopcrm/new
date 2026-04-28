import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { getSettings } from '@/lib/settings'

type Stage = 'lead' | 'first' | 'active' | 'vip' | 'risk' | 'lapsed' | 'dns'
type HealthBand = 'vip' | 'healthy' | 'ok' | 'risk' | 'critical'

type EnrichedClient = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  status: string
  source: string | null
  created_at: string
  dns_status: boolean
  health: number
  health_band: HealthBand
  health_factors: {
    frequency: number
    spend: number
    payment: number
    sentiment: number
  }
  stage: Stage
  ltv_actual_cents: number
  ltv_projected_cents: number
  bookings_count: number
  last_booking: {
    date: string
    label: string
    sub: string
    overdue: boolean
  } | null
  recurring: {
    frequency: string
    discount_pct: number
    day: string
    time: string
    status: string
  } | null
  preferred_cleaner: {
    name: string
    jobs_with: number
    total_jobs: number
  } | null
  cohort: string
}

function dayLabel(dow: number | null | undefined): string {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  if (dow == null) return ''
  return labels[dow] || ''
}

function timeLabel(t: string | null | undefined): string {
  if (!t) return ''
  const [hh, mm] = t.split(':').map((x) => parseInt(x, 10))
  if (Number.isNaN(hh)) return t
  const period = hh >= 12 ? 'PM' : 'AM'
  const h12 = hh % 12 || 12
  const minutes = String(mm || 0).padStart(2, '0')
  return `${h12}:${minutes} ${period}`
}

function computeStage(opts: {
  dnsStatus: boolean
  bookingsCount: number
  hasActiveRecurring: boolean
  recurringFrequency: string | null
  ltvCents: number
  daysSinceLast: number | null
  activeThreshold: number
  atRiskThreshold: number
}): Stage {
  if (opts.dnsStatus) return 'dns'
  if (opts.bookingsCount === 0) return 'lead'
  if (opts.bookingsCount === 1) return 'first'
  if (opts.daysSinceLast == null) return 'lapsed'
  if (opts.daysSinceLast > opts.atRiskThreshold) return 'lapsed'
  if (opts.daysSinceLast > opts.activeThreshold) return 'risk'
  if (opts.hasActiveRecurring && opts.recurringFrequency === 'weekly' && opts.ltvCents >= 150_000) return 'vip'
  return 'active'
}

function band(score: number, stage: Stage): HealthBand {
  if (stage === 'vip') return 'vip'
  if (score >= 75) return 'healthy'
  if (score >= 55) return 'ok'
  if (score >= 35) return 'risk'
  return 'critical'
}

function relativeLast(start: string, status: string | null, paymentStatus: string | null): {
  label: string
  sub: string
  overdue: boolean
} {
  const d = new Date(start)
  const now = Date.now()
  const diffMs = d.getTime() - now
  const diffDays = Math.round(diffMs / 86_400_000)
  const fmt = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (diffDays > 0) {
    return { label: fmt, sub: diffDays === 1 ? 'tomorrow' : `in ${diffDays}d`, overdue: false }
  }
  if (diffDays === 0) return { label: fmt, sub: 'today', overdue: false }
  const ago = Math.abs(diffDays)
  if (paymentStatus === 'unpaid' || paymentStatus === 'partial') {
    return { label: fmt, sub: `${ago}d · ${paymentStatus}`, overdue: true }
  }
  if (status === 'completed') return { label: fmt, sub: ago < 2 ? `${Math.max(1, Math.round(Math.abs(diffMs) / 3_600_000))}h ago` : `${ago}d ago`, overdue: false }
  return { label: fmt, sub: `${ago}d ago`, overdue: false }
}

export async function GET(_request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const settings = await getSettings(tenantId)

    const [clientsResult, bookingsResult, schedulesResult, teamResult] = await Promise.all([
      supabaseAdmin
        .from('clients')
        .select('id, name, email, phone, address, status, source, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('bookings')
        .select('id, client_id, team_member_id, price, start_time, status, payment_status')
        .eq('tenant_id', tenantId)
        .order('start_time', { ascending: false }),
      supabaseAdmin
        .from('recurring_schedules')
        .select('client_id, recurring_type, day_of_week, preferred_time, status')
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled'),
      supabaseAdmin
        .from('team_members')
        .select('id, name')
        .eq('tenant_id', tenantId),
    ])

    const clients = (clientsResult.data || []) as Array<Record<string, unknown>>
    const bookings = (bookingsResult.data || []) as Array<Record<string, unknown>>
    const schedules = (schedulesResult.data || []) as Array<Record<string, unknown>>
    const team = (teamResult.data || []) as Array<{ id: string; name: string }>
    const teamMap = new Map(team.map((t) => [t.id, t.name]))

    type BookingAgg = {
      count: number
      ltvCents: number
      lastDate: string | null
      lastStatus: string | null
      lastPayment: string | null
      cleanerCounts: Map<string, number>
      overdueCount: number
    }
    const byClient = new Map<string, BookingAgg>()
    for (const b of bookings) {
      const cid = b.client_id as string | null
      if (!cid) continue
      const agg = byClient.get(cid) || {
        count: 0,
        ltvCents: 0,
        lastDate: null as string | null,
        lastStatus: null as string | null,
        lastPayment: null as string | null,
        cleanerCounts: new Map<string, number>(),
        overdueCount: 0,
      }
      agg.count += 1
      const price = Number(b.price || 0)
      const paymentStatus = (b.payment_status as string | null) || null
      if (paymentStatus === 'paid') agg.ltvCents += price
      // Schema: payment_status is 'unpaid' | 'paid' | 'partial'. Treat past unpaid as overdue.
      const startDate = b.start_time as string | null
      const isPast = startDate ? new Date(startDate).getTime() < Date.now() : false
      if (isPast && (paymentStatus === 'unpaid' || paymentStatus === 'partial')) agg.overdueCount += 1
      const start = b.start_time as string | null
      if (start && (!agg.lastDate || start > agg.lastDate)) {
        agg.lastDate = start
        agg.lastStatus = (b.status as string | null) || null
        agg.lastPayment = paymentStatus
      }
      const tid = b.team_member_id as string | null
      if (tid) {
        agg.cleanerCounts.set(tid, (agg.cleanerCounts.get(tid) || 0) + 1)
      }
      byClient.set(cid, agg)
    }

    const scheduleByClient = new Map<string, Record<string, unknown>>()
    for (const s of schedules) {
      const cid = s.client_id as string | null
      if (!cid) continue
      if (!scheduleByClient.has(cid)) scheduleByClient.set(cid, s)
    }

    const enriched: EnrichedClient[] = clients.map((c) => {
      const id = c.id as string
      const agg = byClient.get(id) || {
        count: 0,
        ltvCents: 0,
        lastDate: null,
        lastStatus: null,
        lastPayment: null,
        cleanerCounts: new Map(),
        overdueCount: 0,
      }
      const sched = scheduleByClient.get(id)
      const dnsStatus = ((c.status as string) || '') === 'do_not_contact'

      const daysSinceLast = agg.lastDate ? Math.floor((Date.now() - new Date(agg.lastDate).getTime()) / 86_400_000) : null
      const recurringFrequency = ((sched?.recurring_type as string | null) || '').toLowerCase() || null

      const stage = computeStage({
        dnsStatus,
        bookingsCount: agg.count,
        hasActiveRecurring: !!sched && sched.status !== 'paused',
        recurringFrequency,
        ltvCents: agg.ltvCents,
        daysSinceLast,
        activeThreshold: settings.active_client_threshold_days,
        atRiskThreshold: settings.at_risk_threshold_days,
      })

      const freqScore = stage === 'vip'
        ? 100
        : recurringFrequency === 'weekly'
          ? 90
          : recurringFrequency === 'biweekly'
            ? 75
            : recurringFrequency === 'monthly'
              ? 55
              : agg.count >= 4
                ? 50
                : agg.count >= 2
                  ? 35
                  : agg.count >= 1
                    ? 20
                    : 0
      const avgJobCents = agg.count > 0 ? agg.ltvCents / agg.count : 0
      const spendScore = Math.min(100, Math.round((avgJobCents / 30_000) * 100))
      const paymentScore = agg.overdueCount === 0 ? 100 : agg.overdueCount === 1 ? 70 : 40
      const sentimentScore = stage === 'lapsed' || stage === 'risk' ? 55 : 80
      const health = stage === 'dns' ? 0 : Math.round((freqScore + spendScore + paymentScore + sentimentScore) / 4)

      const ltvProjected = (() => {
        if (stage === 'risk' || stage === 'lapsed' || stage === 'dns') return 0
        const avg = avgJobCents || 25_000
        if (recurringFrequency === 'weekly') return Math.round(avg * 52)
        if (recurringFrequency === 'biweekly') return Math.round(avg * 26)
        if (recurringFrequency === 'monthly') return Math.round(avg * 12)
        return Math.round(avg * Math.max(2, agg.count))
      })()

      let preferred: EnrichedClient['preferred_cleaner'] = null
      if (agg.cleanerCounts.size > 0) {
        let topId = ''
        let topCount = 0
        for (const [tid, n] of agg.cleanerCounts) {
          if (n > topCount) {
            topId = tid
            topCount = n
          }
        }
        const name = teamMap.get(topId)
        if (name) preferred = { name, jobs_with: topCount, total_jobs: agg.count }
      }

      const recurring = sched
        ? {
            frequency: (sched.recurring_type as string | null) || 'one-time',
            discount_pct: 0,
            day: dayLabel(sched.day_of_week as number | null),
            time: timeLabel(sched.preferred_time as string | null),
            status: (sched.status as string | null) || 'active',
          }
        : null

      const last = agg.lastDate ? relativeLast(agg.lastDate, agg.lastStatus, agg.lastPayment) : null

      const createdAt = (c.created_at as string) || new Date().toISOString()
      const cohort = createdAt.slice(0, 7)

      return {
        id,
        name: (c.name as string) || '—',
        email: (c.email as string | null) || null,
        phone: (c.phone as string | null) || null,
        address: (c.address as string | null) || null,
        status: (c.status as string) || 'active',
        source: (c.source as string | null) || null,
        created_at: createdAt,
        dns_status: dnsStatus,
        health,
        health_band: band(health, stage),
        health_factors: {
          frequency: freqScore,
          spend: spendScore,
          payment: paymentScore,
          sentiment: sentimentScore,
        },
        stage,
        ltv_actual_cents: agg.ltvCents,
        ltv_projected_cents: ltvProjected,
        bookings_count: agg.count,
        last_booking: last ? { date: agg.lastDate as string, label: last.label, sub: last.sub, overdue: last.overdue } : null,
        recurring,
        preferred_cleaner: preferred,
        cohort,
      }
    })

    const totals = {
      total: enriched.length,
      healthy: enriched.filter((e) => e.health_band === 'healthy' || e.health_band === 'vip').length,
      vip: enriched.filter((e) => e.stage === 'vip').length,
      vip_projected_cents: enriched.filter((e) => e.stage === 'vip').reduce((s, e) => s + e.ltv_projected_cents, 0),
      at_risk: enriched.filter((e) => e.stage === 'risk').length,
      first_time: enriched.filter((e) => e.stage === 'first').length,
      active: enriched.filter((e) => e.stage === 'active').length,
      lapsed: enriched.filter((e) => e.stage === 'lapsed').length,
      dns: enriched.filter((e) => e.stage === 'dns').length,
      avg_health: enriched.length
        ? Math.round(enriched.filter((e) => e.stage !== 'dns').reduce((s, e) => s + e.health, 0) / Math.max(1, enriched.filter((e) => e.stage !== 'dns').length))
        : 0,
      mrr_cents: enriched.reduce((s, e) => {
        if (e.stage === 'dns' || !e.recurring || e.recurring.status === 'paused') return s
        const avgPerJob = e.bookings_count > 0 ? e.ltv_actual_cents / e.bookings_count : 25_000
        if (e.recurring.frequency === 'weekly') return s + avgPerJob * 4
        if (e.recurring.frequency === 'biweekly') return s + avgPerJob * 2
        if (e.recurring.frequency === 'monthly') return s + avgPerJob
        return s
      }, 0),
      recurring: enriched.filter((e) => e.recurring && e.recurring.status !== 'paused').length,
    }

    return NextResponse.json({ clients: enriched, totals })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'Failed to fetch enriched clients' }, { status: 500 })
  }
}
