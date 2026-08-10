import { createHmac, randomBytes } from 'crypto'
import type { DropshipAdapter, DropshipOrderInput, DropshipOrderResult, DropshipTrackingInfo } from '../types'

/**
 * Apliiq (https://help.apliiq.com/portal/en/kb/help/api) -- private-label,
 * retail-quality apparel print-on-demand, LA-based.
 *
 * Auth, GET /v1/Product, and the POST /v1/Order request schema below were
 * verified against the real API with real credentials before this file was
 * written (200 OK, real product data back).
 *
 * getTracking is built from Apliiq's documented "Get Order Endpoints" article
 * (https://help.apliiq.com/portal/en/kb/articles/get-order):
 *   GET /v1/Order/:OrderId -> array with one order object. Docs describe the
 *   `Carrier` field as "links to carrier tracking URL" (i.e. it's a URL, not
 *   a carrier name like "USPS") -- the actual carrier name only appears
 *   embedded in `Service` (e.g. "USPS First Class Mail"), so carrier is
 *   derived from Service's first word rather than the Carrier field.
 *   NOT smoke-tested against a real shipped order yet (no live order has
 *   reached "Shipped" status) -- field mapping is doc-verified, not
 *   response-verified. Treat the first real tracked order as the actual
 *   verification of this method.
 *
 * parseTrackingWebhook is built from Apliiq's documented "Fulfillment URL
 * Webhook" article (https://help.apliiq.com/portal/en/kb/articles/fulfillment-url),
 * which includes a concrete example payload (reproduced in the docs):
 *   { fulfillment: { order_id, status, tracking_company, tracking_numbers[],
 *     tracking_urls[], line_items[] } }
 * The webhook also sends an `x-apliiq-hmac` header (base64 HMAC-SHA256 of the
 * base64 payload, signed with sharedSecret) to authenticate the request --
 * NOT verified here. The shared /api/webhooks/dropship/[supplierId] route
 * parses the body as JSON before adapters ever see it and doesn't currently
 * pass raw body/headers to parseTrackingWebhook for any adapter, so no
 * adapter's webhook is signature-checked today. That's a pre-existing gap
 * across every adapter, not something specific to Apliiq -- flagged, not
 * fixed here, since closing it means changing the shared route/interface
 * for all suppliers.
 *
 * config shape: { appKey: string, sharedSecret: string }
 *
 * Apliiq's order schema requires numeric id/number/order_number fields;
 * our own order ids are UUIDs, so a stable numeric surrogate is derived
 * from the UUID below rather than requiring a schema change elsewhere.
 *
 * Apliiq's line_items[].sku must already be in Apliiq's own
 * "APQ-########S#A#" format (their product+size+artwork code) -- unlike
 * Printify's separate product/variant ids, Apliiq wants one combined SKU
 * string, so DropshipOrderItem.externalSku is expected to hold that exact
 * string for this adapter (externalVariantId is unused here).
 */

const BASE_URL = 'https://api.apliiq.com'

function numericSurrogate(orderId: string): number {
  let h = 0
  for (let i = 0; i < orderId.length; i++) {
    h = (h * 31 + orderId.charCodeAt(i)) >>> 0
  }
  return h
}

function authHeader(appKey: string, sharedSecret: string, bodyB64: string): string {
  const rts = Math.floor(Date.now() / 1000).toString()
  const state = randomBytes(8).toString('hex')
  const stringToSign = appKey + rts + state + bodyB64
  const sig = createHmac('sha256', sharedSecret).update(stringToSign).digest('base64')
  return `x-apliiq-auth ${rts}:${sig}:${appKey}:${state}`
}

// Maps Apliiq's own status vocabulary onto shop_orders.status's CHECK
// constraint set (paid|processing|shipped|delivered|cancelled|refunded).
// Apliiq's docs only give 3 example order statuses ("In Production",
// "Shipped", "Cancelled", "etc.") -- unmapped/unrecognized strings return
// null so the webhook route's own ORDER_STATUSES guard just skips the
// status column rather than writing something invalid.
function mapOrderStatus(apliiqStatus: string | null | undefined): string | null {
  if (!apliiqStatus) return null
  const s = apliiqStatus.trim().toLowerCase()
  if (s === 'shipped') return 'shipped'
  if (s === 'cancelled' || s === 'canceled') return 'cancelled'
  if (s === 'in production' || s === 'awaiting garment' || s === 'awaiting artwork' || s === 'awaiting supplies') return 'processing'
  return null
}

function splitName(name: string | null): { firstName: string; lastName: string } {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: 'Customer', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

export const apliiqAdapter: DropshipAdapter = {
  key: 'apliiq',
  label: 'Apliiq',

  async createOrder(input: DropshipOrderInput, config: Record<string, unknown>): Promise<DropshipOrderResult> {
    const appKey = config.appKey as string | undefined
    const sharedSecret = config.sharedSecret as string | undefined
    if (!appKey || !sharedSecret) {
      return { externalOrderId: null, status: 'manual', message: 'Apliiq supplier is missing an app key or shared secret — add both in Suppliers.' }
    }

    const { firstName, lastName } = splitName(input.customerName)
    const addr = input.shippingAddress || {}
    const orderNum = numericSurrogate(input.orderId)

    const body = {
      id: orderNum,
      number: orderNum,
      name: input.orderId,
      order_number: orderNum,
      line_items: input.items.map((i) => ({
        id: i.externalSku || '',
        title: i.name,
        quantity: i.qty,
        price: (i.priceCents / 100).toFixed(2),
        sku: i.externalSku || '',
      })),
      shipping_address: {
        first_name: firstName,
        last_name: lastName,
        address1: addr.line1 || '',
        address2: addr.line2 || undefined,
        phone: input.customerPhone || undefined,
        city: addr.city || '',
        zip: addr.postal_code || '',
        province: addr.state || '',
        province_code: addr.state || '',
        country: addr.country || 'US',
        country_code: addr.country || 'US',
      },
    }

    const bodyJson = JSON.stringify(body)
    const bodyB64 = Buffer.from(bodyJson).toString('base64')

    const res = await fetch(`${BASE_URL}/v1/Order`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(appKey, sharedSecret, bodyB64),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: bodyJson,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { externalOrderId: null, status: 'manual', message: `Apliiq rejected the order (${res.status}): ${errText.slice(0, 300)}` }
    }

    const data = await res.json().catch(() => null) as { id?: number } | null
    if (data?.id == null) {
      return { externalOrderId: null, status: 'manual', message: 'Apliiq accepted the request but returned no order id.' }
    }

    return { externalOrderId: String(data.id), status: 'submitted' }
  },

  async getTracking(externalOrderId: string, config: Record<string, unknown>): Promise<DropshipTrackingInfo | null> {
    const appKey = config.appKey as string | undefined
    const sharedSecret = config.sharedSecret as string | undefined
    if (!appKey || !sharedSecret) return null

    const res = await fetch(`${BASE_URL}/v1/Order/${externalOrderId}`, {
      headers: { Authorization: authHeader(appKey, sharedSecret, ''), Accept: 'application/json' },
    })
    if (!res.ok) return null

    type ApliiqOrder = {
      OrderId?: number
      Status?: string
      SN?: { Carrier?: string; Service?: string; TrackingNumber?: string }[]
    }
    const data = await res.json().catch(() => null) as ApliiqOrder[] | null
    const order = data?.[0]
    if (!order) return null
    const shipment = order.SN?.[0]
    // Apliiq's `Carrier` field is a tracking URL per their docs, not a name --
    // the carrier name only shows up as the first word of `Service` (e.g.
    // "USPS First Class Mail" -> "USPS").
    const carrierName = shipment?.Service?.trim().split(/\s+/)[0] || null

    return {
      externalOrderId: order.OrderId != null ? String(order.OrderId) : externalOrderId,
      trackingNumber: shipment?.TrackingNumber || null,
      carrier: carrierName,
      trackingUrl: shipment?.Carrier || null,
      status: mapOrderStatus(order.Status),
    }
  },

  parseTrackingWebhook(payload: unknown): DropshipTrackingInfo | null {
    type ApliiqWebhook = {
      fulfillment?: {
        order_id?: string
        status?: string
        tracking_company?: string
        tracking_numbers?: string[]
        tracking_urls?: string[]
      }
    }
    const p = payload as ApliiqWebhook | null
    const f = p?.fulfillment
    if (!f) return null
    const externalOrderId = f.order_id || null
    if (!externalOrderId) return null

    return {
      externalOrderId,
      trackingNumber: f.tracking_numbers?.[0] || null,
      carrier: f.tracking_company || null,
      trackingUrl: f.tracking_urls?.[0] || null,
      // This webhook only fires for shipment notices (Apliiq's docs: "receive
      // tracking information when Apliiq ships your order"), and the one
      // documented example payload shows status: "success" -- so a success
      // fulfillment on this specific webhook means the order shipped. Anything
      // else is left unmapped rather than guessed.
      status: f.status?.trim().toLowerCase() === 'success' ? 'shipped' : null,
    }
  },
}
