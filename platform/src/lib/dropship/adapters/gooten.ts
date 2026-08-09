import type { DropshipAdapter, DropshipOrderInput, DropshipOrderResult, DropshipTrackingInfo } from '../types'

/**
 * Gooten (gooten.com/api-documentation/). createOrder and getTracking are
 * built from confirmed, exact field names in their real docs (submitting-
 * an-order and get-order-by-id pages) -- getTracking especially is fully
 * documented (Items[].TrackingNumber/TrackingUrl/ShipCarrierName), unlike
 * Printful where that page wasn't reachable in usable form.
 *
 * parseTrackingWebhook is a REASONABLE GUESS, not confirmed: Gooten's own
 * webhook docs say the callback "collects the order data and sends it" but
 * never show an example payload. Assuming it mirrors the Get Order by ID
 * shape (same Items[] structure) since that's the only order-shape Gooten
 * documents anywhere. Verify against a real webhook delivery before trusting
 * this in production -- log the raw payload on first delivery and compare.
 *
 * config shape: { apiKey: string, shopId: string } -- apiKey is Gooten's
 * PartnerBillingKey, shopId is Gooten's RecipeID (both required; Gooten's
 * naming differs from ours, mapped here rather than adding adapter-specific
 * field names to the generic Suppliers form).
 *
 * NOT smoke-tested against a real Gooten account/key.
 */

const BASE_URL = 'https://api.print.io/api/v/5/source/api/orders/'

interface GootenItem {
  Status?: string
  TrackingNumber?: string
  TrackingUrl?: string
  ShipCarrierName?: string
}

interface GootenOrderResponse {
  Id?: string
  Items?: GootenItem[]
}

function firstTracking(items: GootenItem[] | undefined): GootenItem | null {
  return items?.find((i) => i.TrackingNumber) || items?.[0] || null
}

export const gootenAdapter: DropshipAdapter = {
  key: 'gooten',
  label: 'Gooten',

  async createOrder(input: DropshipOrderInput, config: Record<string, unknown>): Promise<DropshipOrderResult> {
    const recipeId = config.shopId as string | undefined
    const partnerBillingKey = config.apiKey as string | undefined
    if (!recipeId || !partnerBillingKey) {
      return { externalOrderId: null, status: 'manual', message: 'Gooten supplier is missing a RecipeID or PartnerBillingKey — add both in Suppliers.' }
    }

    const addr = input.shippingAddress || {}
    const [firstName, ...rest] = (input.customerName || 'Customer').trim().split(/\s+/)
    const body = {
      SourceId: input.orderId,
      ShipToAddress: {
        FirstName: firstName,
        LastName: rest.join(' ') || undefined,
        Line1: addr.line1 || '',
        Line2: addr.line2 || undefined,
        City: addr.city || '',
        State: addr.state || undefined,
        CountryCode: addr.country || 'US',
        PostalCode: addr.postal_code || '',
        Phone: input.customerPhone || undefined,
        Email: input.customerEmail || undefined,
      },
      Items: input.items.map((i) => ({ SKU: i.externalSku, Quantity: i.qty })),
      Payment: { PartnerBillingKey: partnerBillingKey },
    }

    const res = await fetch(`${BASE_URL}?recipeid=${encodeURIComponent(recipeId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { externalOrderId: null, status: 'manual', message: `Gooten rejected the order (${res.status}): ${errText.slice(0, 300)}` }
    }

    const data = await res.json().catch(() => null) as { Id?: string } | null
    if (!data?.Id) {
      return { externalOrderId: null, status: 'manual', message: 'Gooten accepted the request but returned no order id.' }
    }

    return { externalOrderId: data.Id, status: 'submitted' }
  },

  async getTracking(externalOrderId: string, config: Record<string, unknown>): Promise<DropshipTrackingInfo | null> {
    const recipeId = config.shopId as string | undefined
    if (!recipeId) return null

    const res = await fetch(`${BASE_URL}?recipeid=${encodeURIComponent(recipeId)}&Id=${encodeURIComponent(externalOrderId)}`)
    if (!res.ok) return null

    const data = await res.json().catch(() => null) as GootenOrderResponse | null
    if (!data) return null
    const item = firstTracking(data.Items)

    return {
      externalOrderId,
      trackingNumber: item?.TrackingNumber || null,
      carrier: item?.ShipCarrierName || null,
      trackingUrl: item?.TrackingUrl || null,
      status: item?.Status || null,
    }
  },

  parseTrackingWebhook(payload: unknown): DropshipTrackingInfo | null {
    // See file header — this shape is inferred from the Get Order by ID
    // response, not confirmed against a real webhook delivery.
    const p = payload as GootenOrderResponse | null
    if (!p || typeof p !== 'object' || !p.Id) return null
    const item = firstTracking(p.Items)
    if (!item) return null

    return {
      externalOrderId: p.Id,
      trackingNumber: item.TrackingNumber || null,
      carrier: item.ShipCarrierName || null,
      trackingUrl: item.TrackingUrl || null,
      status: item.Status || null,
    }
  },
}
