import type { DropshipAdapter, DropshipOrderInput, DropshipOrderResult, DropshipTrackingInfo } from '../types'

/**
 * Printify (https://developers.printify.com/). Built from their OpenAPI spec
 * (https://developers.printify.com/openapi.json) -- NOT smoke-tested against
 * a real Printify account/API key, since none exists yet. First real dispatch
 * against a live key should be treated as the actual verification of this
 * file, not this code review.
 *
 * config shape: { apiKey: string, shopId: string }
 */

const BASE_URL = 'https://api.printify.com/v1'

function splitName(name: string | null): { firstName: string; lastName: string } {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: 'Customer', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

function authHeaders(config: Record<string, unknown>): Record<string, string> {
  return {
    Authorization: `Bearer ${config.apiKey as string}`,
    'Content-Type': 'application/json',
    'User-Agent': 'FullLoopCRM-Dropship/1.0',
  }
}

export const printifyAdapter: DropshipAdapter = {
  key: 'printify',
  label: 'Printify',

  async createOrder(input: DropshipOrderInput, config: Record<string, unknown>): Promise<DropshipOrderResult> {
    const shopId = config.shopId as string | undefined
    const apiKey = config.apiKey as string | undefined
    if (!shopId || !apiKey) {
      return { externalOrderId: null, status: 'manual', message: 'Printify supplier is missing an API key or shop ID — add both in Suppliers.' }
    }

    const { firstName, lastName } = splitName(input.customerName)
    const addr = input.shippingAddress || {}

    const body = {
      external_id: input.orderId,
      line_items: input.items.map((i) => ({
        product_id: i.externalSku,
        variant_id: i.externalVariantId ? Number(i.externalVariantId) : undefined,
        quantity: i.qty,
      })),
      send_shipping_notification: false, // we handle our own via the webhook + dashboard, not Printify's customer email
      address_to: {
        first_name: firstName,
        last_name: lastName,
        email: input.customerEmail || '',
        phone: input.customerPhone || '',
        country: addr.country || '',
        region: addr.state || '',
        address1: addr.line1 || '',
        address2: addr.line2 || undefined,
        city: addr.city || '',
        zip: addr.postal_code || '',
      },
    }

    const res = await fetch(`${BASE_URL}/shops/${shopId}/orders.json`, {
      method: 'POST',
      headers: authHeaders(config),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { externalOrderId: null, status: 'manual', message: `Printify rejected the order (${res.status}): ${errText.slice(0, 300)}` }
    }

    const data = await res.json().catch(() => null) as { id?: string } | null
    if (!data?.id) {
      return { externalOrderId: null, status: 'manual', message: 'Printify accepted the request but returned no order id.' }
    }

    return { externalOrderId: data.id, status: 'submitted' }
  },

  async getTracking(externalOrderId: string, config: Record<string, unknown>): Promise<DropshipTrackingInfo | null> {
    const shopId = config.shopId as string | undefined
    if (!shopId || !config.apiKey) return null

    const res = await fetch(`${BASE_URL}/shops/${shopId}/orders/${externalOrderId}.json`, { headers: authHeaders(config) })
    if (!res.ok) return null

    const data = await res.json().catch(() => null) as { status?: string; shipments?: { carrier?: string; number?: string; url?: string }[] } | null
    if (!data) return null
    const shipment = data.shipments?.[0]

    return {
      externalOrderId,
      trackingNumber: shipment?.number || null,
      carrier: shipment?.carrier || null,
      trackingUrl: shipment?.url || null,
      status: data.status || null,
    }
  },

  parseTrackingWebhook(payload: unknown): DropshipTrackingInfo | null {
    const p = payload as { type?: string; resource?: { id?: string; data?: { tracking_number?: string; carrier?: string } } } | null
    if (!p || typeof p !== 'object') return null
    if (p.type !== 'order:shipment:created' && p.type !== 'order:shipment:delivered' && p.type !== 'order:updated') return null
    const externalOrderId = p.resource?.id || null
    if (!externalOrderId) return null

    return {
      externalOrderId,
      trackingNumber: p.resource?.data?.tracking_number || null,
      carrier: p.resource?.data?.carrier || null,
      trackingUrl: null, // Printify's shipment webhook payload doesn't include a URL per the spec — getTracking() has it if needed
      status: p.type === 'order:shipment:delivered' ? 'delivered' : p.type === 'order:shipment:created' ? 'shipped' : null,
    }
  },
}
