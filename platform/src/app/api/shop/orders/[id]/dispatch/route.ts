/**
 * Sends an order to its dropship supplier via that supplier's adapter
 * (src/lib/dropship/registry.ts). With only the 'manual' adapter registered
 * today, this always comes back as a no-op explaining that fulfillment is
 * still hand-entered — the point is the dispatch path itself is real and
 * ready for a provider that isn't manual.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { getAdapter } from '@/lib/dropship/registry'
import type { DropshipOrderInput } from '@/lib/dropship/types'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const db = tenantDb(tenantId)

    const { data: order, error: orderError } = await db
      .from('shop_orders')
      .select('id, customer_name, customer_email, shipping_address, dropship_supplier_id')
      .eq('id', id)
      .single()
    if (orderError) throw orderError
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const { data: items, error: itemsError } = await db
      .from('shop_order_items')
      .select('name, qty, service_type_id')
      .eq('order_id', id)
    if (itemsError) throw itemsError

    const serviceTypeIds = [...new Set((items || []).map((i) => i.service_type_id).filter(Boolean))] as string[]
    const { data: products } = serviceTypeIds.length
      ? await db.from('service_types').select('id, dropship_supplier_id, dropship_external_sku').in('id', serviceTypeIds)
      : { data: [] as { id: string; dropship_supplier_id: string | null; dropship_external_sku: string | null }[] }
    const productById = new Map((products || []).map((p) => [p.id, p]))

    // Prefer the supplier already set on the order; otherwise infer it from
    // the items, when every item that has a supplier agrees on the same one.
    let supplierId = order.dropship_supplier_id as string | null
    if (!supplierId) {
      const itemSupplierIds = [...new Set(
        (items || [])
          .map((i) => (i.service_type_id ? productById.get(i.service_type_id)?.dropship_supplier_id : null))
          .filter(Boolean),
      )]
      if (itemSupplierIds.length === 1) supplierId = itemSupplierIds[0] as string
    }

    let adapterKey = 'manual'
    let config: Record<string, unknown> = {}
    if (supplierId) {
      const { data: supplier } = await db.from('dropship_suppliers').select('adapter_key, config').eq('id', supplierId).single()
      if (supplier) {
        adapterKey = supplier.adapter_key
        config = (supplier.config as Record<string, unknown>) || {}
      }
    }

    const input: DropshipOrderInput = {
      orderId: order.id,
      items: (items || []).map((i) => ({
        externalSku: (i.service_type_id && productById.get(i.service_type_id)?.dropship_external_sku) || null,
        name: i.name,
        qty: i.qty,
      })),
      shippingAddress: (order.shipping_address as Record<string, string | null>) || null,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
    }

    const adapter = getAdapter(adapterKey)
    const result = await adapter.createOrder(input, config)

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (supplierId) update.dropship_supplier_id = supplierId
    if (result.externalOrderId) update.external_order_id = result.externalOrderId
    if (result.status === 'submitted') update.status = 'processing'

    const { data: updated, error: updateError } = await db
      .from('shop_orders')
      .update(update)
      .eq('id', id)
      .select('id, status, supplier_name, external_order_id, tracking_number, carrier, tracking_url, dropship_supplier_id')
      .single()
    if (updateError) throw updateError

    return NextResponse.json({ order: updated, dispatch: result })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/shop/orders/[id]/dispatch', err)
    return NextResponse.json({ error: 'Failed to dispatch order' }, { status: 500 })
  }
}
