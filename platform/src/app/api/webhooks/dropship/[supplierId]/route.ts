/**
 * Inbound webhook target for a dropship supplier to push tracking/status
 * updates back. Public route (no session — the supplier calls this
 * directly), scoped per-supplier by the UUID in the URL rather than a
 * shared per-provider endpoint, so each supplier's own webhook secret (if
 * its adapter needs one) lives in that supplier's own config.
 *
 * The dashboard shows each supplier's URL as
 * /api/webhooks/dropship/{supplier.id} — give that to the provider when
 * setting up their webhook.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdapter, decryptSupplierConfig } from '@/lib/dropship/registry'

type Params = { params: Promise<{ supplierId: string }> }

// Matches shop_orders.status's CHECK constraint (20260806150000_shop_orders.sql).
// An adapter's parseTrackingWebhook can return any status string a supplier
// sends; only map it onto our own status column when it's one of ours.
const ORDER_STATUSES = new Set(['paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])

export async function POST(request: Request, { params }: Params) {
  try {
    const { supplierId } = await params
    const { data: supplier, error: supplierError } = await supabaseAdmin
      .from('dropship_suppliers')
      .select('id, tenant_id, adapter_key, config')
      .eq('id', supplierId)
      .single()
    if (supplierError || !supplier) return NextResponse.json({ error: 'Unknown supplier' }, { status: 404 })

    const rawBody = await request.text()
    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const adapter = getAdapter(supplier.adapter_key)
    const config = decryptSupplierConfig(supplier.config as Record<string, unknown>)
    if (adapter.verifyWebhookSignature && !adapter.verifyWebhookSignature(rawBody, request.headers, config)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    const tracking = adapter.parseTrackingWebhook(payload, config)
    if (!tracking) return NextResponse.json({ ok: true, ignored: true })

    if (!tracking.externalOrderId) return NextResponse.json({ error: 'Adapter could not identify the order for this webhook' }, { status: 400 })

    const { data: order, error: findError } = await supabaseAdmin
      .from('shop_orders')
      .select('id')
      .eq('tenant_id', supplier.tenant_id)
      .eq('external_order_id', tracking.externalOrderId)
      .single()
    if (findError || !order) return NextResponse.json({ error: 'Order not found for this supplier' }, { status: 404 })

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (tracking.trackingNumber) update.tracking_number = tracking.trackingNumber
    if (tracking.carrier) update.carrier = tracking.carrier
    if (tracking.trackingUrl) update.tracking_url = tracking.trackingUrl
    if (tracking.status && ORDER_STATUSES.has(tracking.status)) update.status = tracking.status

    const { error: updateError } = await supabaseAdmin.from('shop_orders').update(update).eq('id', order.id)
    if (updateError) throw updateError

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/webhooks/dropship/[supplierId]', err)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
