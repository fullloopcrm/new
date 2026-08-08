import { NextResponse } from 'next/server'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { supabaseAdmin } from '@/lib/supabase'
import { ledgerProfitAndLoss } from '@/lib/finance/ledger-reports'

/**
 * Public, anonymous read backing the "/case-study/the-nyc-maid" marketing page
 * and its homepage teasers (CaseStudyTeaser, ProofStats). Same header-based
 * tenant resolution as /api/reviews' public path — no auth required, since
 * these numbers are already displayed unauthenticated on the marketing site.
 * Cached hourly at the fetch layer (see src/lib/caseStudyStats.ts).
 */

const TZ = 'America/New_York'
const CLEANER_PAYOUT_SAMPLE = 20
// Deltas above this are pre-automation batch payout runs, not the current
// per-job instant payout — excluded so the median reflects today's system.
const CLEANER_PAYOUT_MAX_SANE_SECONDS = 3600

function ymdInTz(date: Date, tz: string): string {
  return date.toLocaleDateString('en-CA', { timeZone: tz })
}

function addMonthsYMD(ymd: string, months: number): string {
  const [y, m] = ymd.slice(0, 7).split('-').map(Number)
  const total = y * 12 + (m - 1) + months
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}-01`
}

function daysInMonthYMD(monthStartYMD: string): number {
  const [y, m] = monthStartYMD.slice(0, 7).split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function bucketRevenue(cents: number): string {
  const dollars = Math.max(0, cents) / 100
  const lo = Math.floor(dollars / 10000) * 10000
  const hi = lo + 10000
  const fmt = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`)
  return `${fmt(lo)}–${fmt(hi)}`
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

export async function GET() {
  const tenant = await getTenantFromHeaders()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not resolved' }, { status: 404 })
  }
  const tenantId = tenant.id as string

  const now = new Date()
  const todayYMD = ymdInTz(now, TZ)
  const monthStartYMD = `${todayYMD.slice(0, 7)}-01`
  const nextMonthStartYMD = addMonthsYMD(monthStartYMD, 1)
  const prevMonthStartYMD = addMonthsYMD(monthStartYMD, -1)
  const yearStartYMD = `${todayYMD.slice(0, 4)}-01-01`
  const daysLeftInMonth = daysInMonthYMD(monthStartYMD) - Number(todayYMD.slice(8, 10))

  const [
    clientsRes,
    bookingsCompletedRes,
    teamRes,
    conversationsRes,
    reviewsRes,
    lastMonthCompletedRes,
    thisMonthBookedRes,
    pricedRes,
    payoutRes,
    ytdPnl,
  ] = await Promise.all([
    supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'completed').eq('payment_status', 'paid'),
    supabaseAdmin.from('team_members').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
    supabaseAdmin.from('sms_conversations').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabaseAdmin.from('reviews').select('rating').eq('tenant_id', tenantId).eq('status', 'approved').not('text', 'is', null),
    supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .eq('payment_status', 'paid')
      .gte('start_time', prevMonthStartYMD)
      .lt('start_time', monthStartYMD),
    supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .gte('start_time', monthStartYMD)
      .lt('start_time', nextMonthStartYMD),
    supabaseAdmin
      .from('bookings')
      .select('price')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .eq('payment_status', 'paid')
      .not('price', 'is', null)
      .limit(2000),
    supabaseAdmin
      .from('bookings')
      .select('check_out_time, team_member_paid_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .eq('team_member_paid', true)
      .not('check_out_time', 'is', null)
      .not('team_member_paid_at', 'is', null)
      .order('check_out_time', { ascending: false })
      .limit(CLEANER_PAYOUT_SAMPLE),
    ledgerProfitAndLoss(tenantId, yearStartYMD, todayYMD).catch(() => null),
  ])

  const rated = (reviewsRes.data || [])
    .map((r) => r.rating as number)
    .filter((n): n is number => typeof n === 'number' && n > 0)
  const avgRating = rated.length > 0 ? Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10 : null

  const prices = (pricedRes.data || [])
    .map((p) => Number(p.price))
    .filter((n) => Number.isFinite(n) && n > 0)
  const avgTicketCents = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null
  const avgTicketPrice = avgTicketCents != null ? `$${Math.round(avgTicketCents / 100)}` : null

  const payoutDeltas = (payoutRes.data || [])
    .map((r) => {
      const co = new Date(r.check_out_time as string).getTime()
      const pa = new Date(r.team_member_paid_at as string).getTime()
      return Math.round((pa - co) / 1000)
    })
    .filter((sec) => sec >= 0 && sec <= CLEANER_PAYOUT_MAX_SANE_SECONDS)
  const cleanerPayoutMedianSeconds = median(payoutDeltas)

  const revenueRangeYtd = ytdPnl ? bucketRevenue(ytdPnl.revenue_cents) : '$100k–$110k'

  return NextResponse.json(
    {
      clients: clientsRes.count || 0,
      bookingsCompleted: bookingsCompletedRes.count || 0,
      teamSize: teamRes.count || 0,
      conversations: conversationsRes.count || 0,
      reviews: rated.length,
      avgRating,
      revenueRangeYtd,
      avgTicketPrice,
      lastMonthCompleted: lastMonthCompletedRes.count || 0,
      thisMonthBooked: thisMonthBookedRes.count || 0,
      daysLeftInMonth,
      cleanerPayoutMedianSeconds,
      generatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=600' } },
  )
}
