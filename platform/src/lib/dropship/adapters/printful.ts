import type { DropshipAdapter, DropshipOrderInput, DropshipOrderResult, DropshipTrackingInfo } from '../types'

/**
 * Printful (https://developers.printful.com/). Built from what their docs
 * pages actually rendered through fetching -- NOT the full OpenAPI spec
 * (unlike Printify, it wasn't reachable in a usable form). createOrder's
 * request shape is confirmed real. getTracking/parseTrackingWebhook are
 * DELIBERATELY unimplemented (return null) rather than guessed -- the docs
 * confirm webhooks and a package_shipped event exist, but not the exact
 * response/payload field names, and showing a customer/operator wrong
 * tracking data is worse than showing none. Wire those once a real order
 * can be inspected against the live API, or the docs are more reachable.
 *
 * config shape: { apiKey: string, shopId?: string } -- shopId here means
 * Printful's store id, matching the Suppliers form's generic "API key" /
 * "Shop ID" fields. Only needed for an account-level token managing
 * multiple stores (sent as X-PF-Store-Id); a store-level token doesn't
 * need it.
 *
 * NOT smoke-tested against a real Printful account/key.
 */

const BASE_URL = 'https://api.printful.com'

function authHeaders(config: Record<string, unknown>): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey as string}`,
    'Content-Type': 'application/json',
  }
  if (typeof config.shopId === 'string' && config.shopId) headers['X-PF-Store-Id'] = config.shopId
  return headers
}

export const printfulAdapter: DropshipAdapter = {
  key: 'printful',
  label: 'Printful',

  async createOrder(input: DropshipOrderInput, config: Record<string, unknown>): Promise<DropshipOrderResult> {
    const apiKey = config.apiKey as string | undefined
    if (!apiKey) {
      return { externalOrderId: null, status: 'manual', message: 'Printful supplier is missing an API key — add one in Suppliers.' }
    }

    const addr = input.shippingAddress || {}
    const body = {
      recipient: {
        name: input.customerName || 'Customer',
        email: input.customerEmail || undefined,
        phone: input.customerPhone || undefined,
        address1: addr.line1 || '',
        address2: addr.line2 || undefined,
        city: addr.city || '',
        state_code: addr.state || undefined,
        country_code: addr.country || 'US',
        zip: addr.postal_code || '',
      },
      items: input.items.map((i) => ({
        variant_id: i.externalSku ? Number(i.externalSku) : undefined,
        retail_price: (i.priceCents / 100).toFixed(2),
        quantity: i.qty,
      })),
    }

    const res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: authHeaders(config),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { externalOrderId: null, status: 'manual', message: `Printful rejected the order (${res.status}): ${errText.slice(0, 300)}` }
    }

    const data = await res.json().catch(() => null) as { result?: { id?: number | string } } | null
    const orderId = data?.result?.id
    if (orderId === undefined) {
      return { externalOrderId: null, status: 'manual', message: 'Printful accepted the request but returned no order id.' }
    }

    return { externalOrderId: String(orderId), status: 'submitted' }
  },

  async getTracking(): Promise<DropshipTrackingInfo | null> {
    // See file header — response schema unconfirmed, not guessing it.
    return null
  },

  parseTrackingWebhook(): DropshipTrackingInfo | null {
    // See file header — payload schema unconfirmed, not guessing it.
    return null
  },
}
