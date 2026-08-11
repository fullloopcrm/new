/**
 * Core dispatch logic shared by the operator-triggered dispatch route
 * (POST /api/shop/orders/[id]/dispatch) and the auto-dispatch-on-payment
 * path in the Stripe webhook (only fires when the tenant opted in via
 * the ecommerce settings panel's "Auto-dispatch to supplier on payment"
 * toggle — most dropshippers want a review step before a real order goes
 * out to a paid supplier, so this defaults off).
 */
import { tenantDb } from '@/lib/tenant-db'
import { getAdapter, decryptSupplierConfig } from '@/lib/dropship/registry'
import type { DropshipOrderInput } from '@/lib/dropship/types'

type VariantSkuMap = Record<string, { externalSku?: string | null; externalVariantId?: string | null }>

export async function dispatchShopOrder(tenantId: string, orderId: string) {
  const db = tenantDb(tenantId)

  const { data: order, error: orderError } = await db
    .from('shop_orders')
    .select('id, customer_name, customer_email, customer_phone, shipping_address, dropship_supplier_id')
    .eq('id', orderId)
    .single()
  if (orderError) throw orderError
  if (!order) throw new Error('Order not found')

  const { data: items, error: itemsError } = await db
    .from('shop_order_items')
    .select('name, qty, price_cents, service_type_id, color, size')
    .eq('order_id', orderId)
  if (itemsError) throw itemsError

  const serviceTypeIds = [...new Set((items || []).map((i) => i.service_type_id).filter(Boolean))] as string[]
  const { data: products } = serviceTypeIds.length
    ? await db
        .from('service_types')
        .select('id, dropship_supplier_id, dropship_external_sku, dropship_external_variant_id, dropship_variant_skus')
        .in('id', serviceTypeIds)
    : {
        data: [] as {
          id: string
          dropship_supplier_id: string | null
          dropship_external_sku: string | null
          dropship_external_variant_id: string | null
          dropship_variant_skus: VariantSkuMap | null
        }[],
      }
  const productById = new Map((products || []).map((p) => [p.id, p]))

  function resolveSku(item: { service_type_id: string | null; color: string | null; size: string | null }) {
    const product = item.service_type_id ? productById.get(item.service_type_id) : undefined
    if (!product) return { externalSku: null, externalVariantId: null }
    if (item.color || item.size) {
      const key = `${item.color || ''}|${item.size || ''}`
      const variant = product.dropship_variant_skus?.[key]
      if (variant?.externalSku) {
        return { externalSku: variant.externalSku, externalVariantId: variant.externalVariantId || null }
      }
    }
    return { externalSku: product.dropship_external_sku, externalVariantId: product.dropship_external_variant_id }
  }

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
      config = decryptSupplierConfig(supplier.config as Record<string, unknown>)
    }
  }

  const input: DropshipOrderInput = {
    orderId: order.id,
    items: (items || []).map((i) => ({
      ...resolveSku(i),
      name: i.name,
      qty: i.qty,
      priceCents: i.price_cents,
    })),
    shippingAddress: (order.shipping_address as Record<string, string | null>) || null,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
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
    .eq('id', orderId)
    .select('id, status, supplier_name, external_order_id, tracking_number, carrier, tracking_url, dropship_supplier_id')
    .single()
  if (updateError) throw updateError

  return { order: updated, dispatch: result }
}
