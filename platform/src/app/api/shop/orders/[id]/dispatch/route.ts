/**
 * Sends an order to its dropship supplier via that supplier's adapter
 * (src/lib/dropship/registry.ts). Operator-triggered (manual button click).
 * Tenants can also opt into auto-dispatch on payment from the ecommerce
 * settings panel — see the same dispatchShopOrder() call in the Stripe
 * webhook (src/app/api/webhooks/stripe/route.ts).
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { dispatchShopOrder } from '@/lib/dropship/dispatch'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const result = await dispatchShopOrder(tenantId, id)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/shop/orders/[id]/dispatch', err)
    return NextResponse.json({ error: 'Failed to dispatch order' }, { status: 500 })
  }
}
