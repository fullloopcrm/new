/**
 * Platform Finance — More tab. Cross-tenant operational rollup that feeds
 * the ledger: vendor spend, inventory value, equipment net book value, and
 * catalog size. Vendor/inventory/catalog data is real (see
 * 2026_07_21_inventory_vendor_catalog_costing.sql), but nothing here posts
 * to the ledger automatically yet — inventory consumption and equipment
 * depreciation are tracked as values, not auto-journaled. That auto-posting
 * is the "plumbing" phase flagged separately from this page rebuild.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { platformArAging } from '@/lib/finance/platform-ar-aging'
import { isTestTenant } from '@/lib/finance/platform-reports'

const PAGE = 1000

async function fetchAll<T>(table: string, columns: string, filter?: (q: any) => any): Promise<T[]> {
  const out: T[] = []
  let offset = 0
  for (;;) {
    let q = supabaseAdmin.from(table).select(columns).range(offset, offset + PAGE - 1)
    if (filter) q = filter(q)
    const { data, error } = await q
    if (error) throw error
    out.push(...((data || []) as T[]))
    if (!data || data.length < PAGE) break
    offset += PAGE
  }
  return out
}

function periodBounds(period: string): { from: string; to: string } {
  const now = new Date()
  const toISODate = (d: Date) => d.toISOString().slice(0, 10)
  let from: Date
  if (period === 'today') from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  else if (period === 'week') {
    from = new Date(now)
    from.setDate(from.getDate() - 7)
  } else if (period === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1)
  else from = new Date(now.getFullYear(), 0, 1)
  return { from: toISODate(from), to: toISODate(now) }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const period = request.nextUrl.searchParams.get('period') || 'month'
  const { from, to } = periodBounds(period)

  try {
    const [expenses, inventoryItems, equipmentRows, tenants, arAging] = await Promise.all([
      fetchAll<{ tenant_id: string; vendor_id: string | null; vendor_name: string | null; amount: number | null }>(
        'expenses',
        'tenant_id, vendor_id, vendor_name, amount',
        (q) => q.gte('date', from).lte('date', to),
      ),
      fetchAll<{ tenant_id: string; quantity_on_hand: string | number; unit_cost_cents: number; reorder_threshold: string | number | null }>(
        'inventory_items',
        'tenant_id, quantity_on_hand, unit_cost_cents, reorder_threshold',
        (q) => q.eq('active', true),
      ),
      fetchAll<{ tenant_id: string; acquisition_cost_cents: number; accumulated_depreciation_cents: number; status: string }>(
        'equipment',
        'tenant_id, acquisition_cost_cents, accumulated_depreciation_cents, status',
        (q) => q.eq('active', true),
      ),
      supabaseAdmin.from('tenants').select('id, name').then((r) => r.data || []),
      platformArAging(),
    ])
    const tenantNames: Record<string, string> = {}
    const testTenantIds = new Set<string>()
    for (const t of tenants) {
      tenantNames[t.id] = t.name
      if (isTestTenant(t.name)) testTenantIds.add(t.id)
    }

    // Vendor spend — group by vendor_id, fall back to free-text vendor_name.
    const vendorSpend = new Map<string, { label: string; amount: number; count: number }>()
    for (const e of expenses) {
      if (testTenantIds.has(e.tenant_id)) continue
      const key = e.vendor_id || (e.vendor_name ? `name:${e.vendor_name}` : null)
      if (!key) continue
      const cur = vendorSpend.get(key) || { label: e.vendor_name || 'Unnamed vendor', amount: 0, count: 0 }
      cur.amount += e.amount || 0
      cur.count += 1
      vendorSpend.set(key, cur)
    }
    const topVendors = Array.from(vendorSpend.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 15)
      .map((v) => ({ vendor: v.label, spend: v.amount / 100, transactionCount: v.count }))

    // Inventory value + low-stock flags, per tenant and platform total.
    let inventoryValueCents = 0
    let lowStockCount = 0
    const inventoryByTenant = new Map<string, number>()
    for (const item of inventoryItems) {
      if (testTenantIds.has(item.tenant_id)) continue
      const qty = Number(item.quantity_on_hand) || 0
      const value = qty * (item.unit_cost_cents || 0)
      inventoryValueCents += value
      inventoryByTenant.set(item.tenant_id, (inventoryByTenant.get(item.tenant_id) || 0) + value)
      const threshold = item.reorder_threshold != null ? Number(item.reorder_threshold) : null
      if (threshold != null && qty <= threshold) lowStockCount += 1
    }

    // Equipment net book value (acquisition cost less accumulated depreciation).
    let equipmentValueCents = 0
    const equipmentByStatus: Record<string, number> = {}
    for (const eq of equipmentRows) {
      if (testTenantIds.has(eq.tenant_id)) continue
      equipmentValueCents += (eq.acquisition_cost_cents || 0) - (eq.accumulated_depreciation_cents || 0)
      equipmentByStatus[eq.status] = (equipmentByStatus[eq.status] || 0) + 1
    }

    // Catalog size (active service types), platform total.
    const { count: catalogCount } = await supabaseAdmin
      .from('service_types') // tenant-scope-ok: /admin/finance is requireAdmin-gated; intentionally cross-tenant.
      .select('id', { count: 'exact', head: true })
      .eq('active', true)

    return NextResponse.json({
      period,
      vendorSpend: {
        total: Array.from(vendorSpend.values()).reduce((s, v) => s + v.amount, 0) / 100,
        vendorCount: vendorSpend.size,
        topVendors,
      },
      inventory: {
        totalValue: inventoryValueCents / 100,
        lowStockCount,
        byTenant: Array.from(inventoryByTenant.entries())
          .map(([tenant_id, cents]) => ({ tenant_id, tenant_name: tenantNames[tenant_id] || tenant_id.slice(0, 8), value: cents / 100 }))
          .sort((a, b) => b.value - a.value),
      },
      equipment: {
        netBookValue: equipmentValueCents / 100,
        byStatus: equipmentByStatus,
      },
      catalog: {
        activeItemCount: catalogCount || 0,
      },
      arAging: {
        total: arAging.total_cents / 100,
        buckets: arAging.buckets.map((b) => ({ label: b.label, count: b.count, amount: b.amount_cents / 100 })),
        byTenant: arAging.byTenant.slice(0, 10).map((t) => ({ tenant_id: t.tenant_id, tenant_name: t.tenant_name, amount: t.total_cents / 100 })),
      },
      note: 'Vendor/inventory/equipment data is real but does not yet auto-post to the ledger — tracked as operational value here, not yet a journaled COGS feed.',
    })
  } catch (err) {
    console.error('GET /api/admin/finance/more', err)
    return NextResponse.json({ error: 'Failed to load operational finance data' }, { status: 500 })
  }
}
