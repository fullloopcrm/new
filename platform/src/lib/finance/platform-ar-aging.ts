/**
 * Cross-tenant AR aging — same bucket logic as /api/finance/ar-aging
 * (unpaid invoices + unpaid completed bookings, bucketed by days past due),
 * rolled up per tenant and platform-wide instead of scoped to one tenant.
 * Row-level detail (client names, invoice numbers) isn't needed at this
 * altitude, so this returns bucket totals only.
 */
import { supabaseAdmin } from '../supabase'
import { isTestTenant } from './platform-reports'

const BUCKETS = [
  { label: 'Current', minDays: 0, maxDays: 30 },
  { label: '31-60', minDays: 31, maxDays: 60 },
  { label: '61-90', minDays: 61, maxDays: 90 },
  { label: '90+', minDays: 91, maxDays: Infinity },
]

export interface ArAgingBucket {
  label: string
  count: number
  amount_cents: number
}

export interface PlatformArAging {
  total_cents: number
  buckets: ArAgingBucket[]
  byTenant: { tenant_id: string; tenant_name: string; total_cents: number }[]
}

function bucketFor(daysPast: number): string {
  return BUCKETS.find((b) => daysPast >= b.minDays && daysPast <= b.maxDays)?.label || 'Current'
}

export async function platformArAging(opts: { includeTest?: boolean } = {}): Promise<PlatformArAging> {
  const today = new Date()

  const [{ data: invoices }, { data: bookings }, { data: tenants }] = await Promise.all([
    supabaseAdmin
      .from('invoices')
      .select('tenant_id, total_cents, amount_paid_cents, due_date')
      .not('status', 'in', '(paid,void,refunded,draft)'),
    supabaseAdmin
      .from('bookings')
      .select('tenant_id, price, start_time, payment_status')
      .eq('status', 'completed')
      .not('payment_status', 'in', '(paid,refunded)')
      .is('route_id', null),
    supabaseAdmin.from('tenants').select('id, name'),
  ])
  const tenantNames: Record<string, string> = {}
  const testTenantIds = new Set<string>()
  for (const t of tenants || []) {
    tenantNames[t.id] = t.name
    if (isTestTenant(t.name)) testTenantIds.add(t.id)
  }
  const excludeTenant = (tenantId: string) => !opts.includeTest && testTenantIds.has(tenantId)

  interface Row {
    tenant_id: string
    balance_cents: number
    bucket: string
  }
  const rows: Row[] = []

  for (const inv of invoices || []) {
    if (excludeTenant(inv.tenant_id)) continue
    const balance = (inv.total_cents || 0) - (inv.amount_paid_cents || 0)
    if (balance <= 0) continue
    const dueDate = inv.due_date ? new Date(inv.due_date as string) : null
    const daysPast = dueDate ? Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000)) : 0
    rows.push({ tenant_id: inv.tenant_id, balance_cents: balance, bucket: bucketFor(daysPast) })
  }

  for (const b of bookings || []) {
    if (excludeTenant(b.tenant_id)) continue
    const priceCents = Math.round(Number(b.price || 0))
    if (priceCents <= 0) continue
    const daysPast = b.start_time ? Math.max(0, Math.floor((today.getTime() - new Date(b.start_time as string).getTime()) / 86400000)) : 0
    rows.push({ tenant_id: b.tenant_id, balance_cents: priceCents, bucket: bucketFor(daysPast) })
  }

  const buckets: ArAgingBucket[] = BUCKETS.map((b) => {
    const items = rows.filter((r) => r.bucket === b.label)
    return { label: b.label, count: items.length, amount_cents: items.reduce((s, r) => s + r.balance_cents, 0) }
  })

  const byTenantMap = new Map<string, number>()
  for (const r of rows) byTenantMap.set(r.tenant_id, (byTenantMap.get(r.tenant_id) || 0) + r.balance_cents)
  const byTenant = Array.from(byTenantMap.entries())
    .map(([tenant_id, total_cents]) => ({ tenant_id, tenant_name: tenantNames[tenant_id] || tenant_id.slice(0, 8), total_cents }))
    .sort((a, b) => b.total_cents - a.total_cents)

  return {
    total_cents: rows.reduce((s, r) => s + r.balance_cents, 0),
    buckets,
    byTenant,
  }
}
