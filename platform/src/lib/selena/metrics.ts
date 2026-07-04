// Read-only per-tenant Selena metrics — the first piece of the "measurement"
// layer from SELENA-LEARNING-MACHINE-DESIGN.md. No schema, no behavior change:
// it aggregates signals that already exist on sms_conversations.
//
// TENANT WALL: every read is scoped to the passed tenantId. Never call without one.
//
// Honest limits: (1) pulls up to CAP rows per window — very high-volume tenants
// would undercount and need a SQL-side aggregate later; (2) the only quality
// signal today is booking_checklist.rating + outcome. A tenant-generic quality
// SCORE (replacing the nycmaid-hardcoded scoreConversation) is a separate step.

import { supabaseAdmin } from '@/lib/supabase'

const CAP = 2000

export interface TenantMetrics {
  tenantId: string
  windowDays: number
  total: number
  booked: number
  abandoned: number
  active: number
  escalations: number
  conversionRate: number | null // booked / (booked + abandoned)
  avgRating: number | null
  ratingCount: number
  byChannel: { sms: number; web: number; other: number }
  dailyConversion: { date: string; total: number; booked: number }[]
  capped: boolean // true if we hit CAP (numbers are a floor, not exact)
}

interface Row {
  phone: string | null
  created_at: string | null
  completed_at: string | null
  expired: boolean | null
  outcome: string | null
  summary: string | null
  booking_checklist: Record<string, unknown> | null
}

export async function getTenantMetrics(tenantId: string, windowDays = 30): Promise<TenantMetrics> {
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString()

  const { data } = await supabaseAdmin
    .from('sms_conversations')
    .select('phone, created_at, completed_at, expired, outcome, summary, booking_checklist')
    .eq('tenant_id', tenantId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(CAP)

  const rows = (data || []) as Row[]

  let booked = 0
  let abandoned = 0
  let active = 0
  let escalations = 0
  let ratingSum = 0
  let ratingCount = 0
  const byChannel = { sms: 0, web: 0, other: 0 }
  const daily = new Map<string, { total: number; booked: number }>()

  for (const c of rows) {
    const cl = c.booking_checklist || {}
    const status = (cl.status as string) || (c.expired ? 'expired' : 'unknown')
    const isBooked = c.outcome === 'booked' || status === 'confirmed' || status === 'closed'

    if (isBooked) booked++
    else if (c.expired || c.outcome === 'abandoned') abandoned++
    else if (!c.completed_at && !c.expired) active++

    if (c.outcome === 'escalated' || c.summary?.includes('escalat')) escalations++

    const rating = cl.rating
    if (typeof rating === 'number') {
      ratingSum += rating
      ratingCount++
    }

    const channel = (cl.channel as string) || (c.phone?.startsWith('web-') ? 'web' : 'sms')
    if (channel === 'sms') byChannel.sms++
    else if (channel === 'web') byChannel.web++
    else byChannel.other++

    const day = c.created_at?.split('T')[0] || 'unknown'
    const bucket = daily.get(day) || { total: 0, booked: 0 }
    bucket.total++
    if (isBooked) bucket.booked++
    daily.set(day, bucket)
  }

  const decided = booked + abandoned
  const dailyConversion = Array.from(daily.entries())
    .map(([date, v]) => ({ date, total: v.total, booked: v.booked }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    tenantId,
    windowDays,
    total: rows.length,
    booked,
    abandoned,
    active,
    escalations,
    conversionRate: decided > 0 ? booked / decided : null,
    avgRating: ratingCount > 0 ? ratingSum / ratingCount : null,
    ratingCount,
    byChannel,
    dailyConversion,
    capped: rows.length >= CAP,
  }
}
