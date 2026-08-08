/**
 * Operator-side order list for /dashboard/ecommerce's Orders tab. Reads
 * shop_orders/shop_order_items — the record the Stripe webhook creates on
 * checkout.session.completed (see handleShopOrder in
 * /api/webhooks/stripe/route.ts). Session-authed like every other dashboard
 * API (getTenantForRequest), unlike the public /api/shop/checkout route.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'

const STATUSES = ['paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
const FULFILLMENT_FIELDS = ['supplier_name', 'external_order_id', 'tracking_number', 'carrier', 'tracking_url'] as const

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const { data: orders, error } = await tenantDb(tenantId)
      .from('shop_orders')
      .select('id, customer_email, customer_name, shipping_address, subtotal_cents, status, fulfillment_type, supplier_name, external_order_id, tracking_number, carrier, tracking_url, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error

    const orderIds = (orders || []).map((o) => o.id)
    const { data: items } = orderIds.length
      ? await tenantDb(tenantId)
          .from('shop_order_items')
          .select('order_id, name, price_cents, qty, is_digital')
          .in('order_id', orderIds)
      : { data: [] as { order_id: string; name: string; price_cents: number; qty: number; is_digital: boolean }[] }

    const itemsByOrder = new Map<string, typeof items>()
    for (const item of items || []) {
      const list = itemsByOrder.get(item.order_id) || []
      list.push(item)
      itemsByOrder.set(item.order_id, list)
    }

    const result = (orders || []).map((o) => ({ ...o, items: itemsByOrder.get(o.id) || [] }))
    return NextResponse.json({ orders: result })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/shop/orders error:', err)
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const id = body.id as string | undefined
    const status = body.status as string | undefined
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const update: Record<string, string | null> = { updated_at: new Date().toISOString() }

    if (status !== undefined) {
      if (!STATUSES.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      update.status = status
    }

    for (const field of FULFILLMENT_FIELDS) {
      const value = body[field]
      if (value === undefined) continue
      if (value !== null && typeof value !== 'string') return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 })
      update[field] = value === '' ? null : value
    }

    const { data, error } = await tenantDb(tenantId)
      .from('shop_orders')
      .update(update)
      .eq('id', id)
      .select('id, status, supplier_name, external_order_id, tracking_number, carrier, tracking_url')
      .single()
    if (error) throw error
    return NextResponse.json({ order: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/shop/orders error:', err)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
