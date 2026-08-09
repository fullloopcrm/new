/**
 * Provider-agnostic dropship contract. A real integration (Printful, Gooten,
 * a generic vendor API) implements this interface once and registers itself
 * in registry.ts -- no other file in the order/fulfillment path needs to
 * change to add a new provider.
 */

export interface DropshipOrderItem {
  externalSku: string | null
  name: string
  qty: number
}

export interface DropshipOrderInput {
  orderId: string
  items: DropshipOrderItem[]
  shippingAddress: Record<string, string | null> | null
  customerName: string | null
  customerEmail: string | null
}

export interface DropshipOrderResult {
  /** The supplier's own order id, if one was created. Null for a manual/no-op dispatch. */
  externalOrderId: string | null
  status: 'submitted' | 'manual'
  /** Operator-facing explanation, e.g. why nothing was auto-submitted. */
  message?: string
}

export interface DropshipTrackingInfo {
  trackingNumber: string | null
  carrier: string | null
  trackingUrl: string | null
  /** Supplier's own status string, not necessarily one of shop_orders.status's values. */
  status: string | null
}

export interface DropshipAdapter {
  key: string
  label: string
  /** Send an order to the supplier. config is that supplier's dropship_suppliers.config. */
  createOrder(input: DropshipOrderInput, config: Record<string, unknown>): Promise<DropshipOrderResult>
  /** Poll for tracking/status, when a provider supports it. */
  getTracking(externalOrderId: string, config: Record<string, unknown>): Promise<DropshipTrackingInfo | null>
  /** Parse an inbound webhook payload from the supplier into tracking info, or null if it isn't one. */
  parseTrackingWebhook(payload: unknown, config: Record<string, unknown>): DropshipTrackingInfo | null
}
