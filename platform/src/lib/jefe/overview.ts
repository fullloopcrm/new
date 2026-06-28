// Jefe — the platform GM. Unlike Yinez (one tenant), Jefe oversees EVERYTHING
// across Full Loop: every tenant's revenue, bookings, clients, plus platform-wide
// leads, security events, and escalations.
//
// This module is the cross-tenant data layer. Jefe's agent tools call into it.
// All queries span all tenants; per-tenant rollups let Jefe drill into any one.
import { supabaseAdmin } from '@/lib/supabase'

export interface TenantRollup {
  id: string
  slug: string
  name: string
  agent_name: string
  status: string | null
  revenue_month: number
  bookings_today: number
  clients_total: number
}

export interface PlatformOverview {
  generated_at: string
  totals: {
    tenants_active: number
    revenue_month: number
    bookings_today: number
    clients_total: number
    open_leads: number
    security_events_24h: number
  }
  tenants: TenantRollup[]
}

const monthStart = (now: Date) => new Date(now.getFullYear(), now.getMonth(), 1)
const monthEnd = (now: Date) => new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
const dayStart = (now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate())
const dayEnd = (d: Date) => new Date(d.getTime() + 24 * 60 * 60 * 1000)

const sumPrice = (rows: { price: number | null; tenant_id: string }[]) =>
  rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.tenant_id] = (acc[r.tenant_id] || 0) + (r.price || 0)
    return acc
  }, {})

const countBy = (rows: { tenant_id: string }[]) =>
  rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.tenant_id] = (acc[r.tenant_id] || 0) + 1
    return acc
  }, {})

/**
 * Full-platform snapshot. One pass per concern, grouped in memory by tenant —
 * cheaper than N queries per tenant. `now` is injectable for testing.
 */
export async function getPlatformOverview(now: Date = new Date()): Promise<PlatformOverview> {
  const mStart = monthStart(now).toISOString()
  const mEnd = monthEnd(now).toISOString()
  const dStart = dayStart(now).toISOString()
  const dEnd = dayEnd(dayStart(now)).toISOString()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const [
    tenantsRes, paidRes, todayRes, clientsRes, leadsRes, secRes,
  ] = await Promise.all([
    supabaseAdmin.from('tenants').select('id, slug, name, agent_name, status').neq('status', 'deleted').order('name'),
    supabaseAdmin.from('bookings').select('tenant_id, price').eq('status', 'completed').eq('payment_status', 'paid').gte('start_time', mStart).lte('start_time', mEnd),
    supabaseAdmin.from('bookings').select('tenant_id').gte('start_time', dStart).lt('start_time', dEnd).in('status', ['confirmed', 'scheduled', 'in_progress', 'completed']),
    supabaseAdmin.from('clients').select('tenant_id'),
    supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('security_events').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo),
  ])

  const tenants = (tenantsRes.data || []) as Array<{ id: string; slug: string; name: string; agent_name: string | null; status: string | null }>
  const revByTenant = sumPrice((paidRes.data || []) as { price: number | null; tenant_id: string }[])
  const todayByTenant = countBy((todayRes.data || []) as { tenant_id: string }[])
  const clientsByTenant = countBy((clientsRes.data || []) as { tenant_id: string }[])

  const rollups: TenantRollup[] = tenants.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    agent_name: t.agent_name || 'Jefe',
    status: t.status,
    revenue_month: revByTenant[t.id] || 0,
    bookings_today: todayByTenant[t.id] || 0,
    clients_total: clientsByTenant[t.id] || 0,
  }))

  return {
    generated_at: now.toISOString(),
    totals: {
      tenants_active: tenants.filter((t) => t.status === 'active').length,
      revenue_month: rollups.reduce((s, r) => s + r.revenue_month, 0),
      bookings_today: rollups.reduce((s, r) => s + r.bookings_today, 0),
      clients_total: rollups.reduce((s, r) => s + r.clients_total, 0),
      open_leads: leadsRes.count || 0,
      security_events_24h: secRes.count || 0,
    },
    tenants: rollups,
  }
}
