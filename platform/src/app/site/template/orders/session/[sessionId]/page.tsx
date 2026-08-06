import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  return { title: `Your Order | ${config.identity.name}` }
}

function money(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type OrderItem = {
  name: string
  price_cents: number
  qty: number
  is_digital: boolean
  digital_delivery_url: string | null
}

export default async function OrderConfirmationPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const config = await getSiteConfig()
  const tenant = await getTenantFromHeaders()

  const order = tenant
    ? (
        await supabaseAdmin
          .from('shop_orders')
          .select('id, customer_name, subtotal_cents, status, fulfillment_type, shipping_address, created_at')
          .eq('tenant_id', tenant.id)
          .eq('stripe_checkout_session_id', sessionId)
          .maybeSingle()
      ).data
    : null

  const items: OrderItem[] = order
    ? ((
        await supabaseAdmin
          .from('shop_order_items')
          .select('name, price_cents, qty, is_digital, digital_delivery_url')
          .eq('order_id', order.id)
      ).data || [])
    : []

  const firstName = (order?.customer_name || '').split(' ')[0]

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {!order ? (
        // Payment succeeded and Stripe already redirected here, but the
        // webhook that creates the order row hasn't landed yet (or this
        // session doesn't belong to this tenant) — a real purchase should
        // never look broken to the customer while that race resolves.
        <div className="text-center">
          <p className="text-[var(--accent)] text-xs font-semibold tracking-widest uppercase mb-3">Order Received</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl text-[var(--brand)] tracking-wide mb-4">
            Thank you for your order!
          </h1>
          <p className="text-gray-500 max-w-md mx-auto">
            We&apos;re confirming the details now — you&apos;ll get an email (and a text, if you shared your number) shortly with your receipt. This page will also update once it lands.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[var(--accent)] text-xs font-semibold tracking-widest uppercase mb-3">Order Confirmed</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl text-[var(--brand)] tracking-wide mb-3">
            Thank you{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="text-gray-500 mb-10">
            Your order from {config.identity.name} is confirmed. We really appreciate the business.
          </p>

          <div className="border border-gray-200 rounded-2xl bg-white p-6 mb-8">
            <div className="space-y-4 mb-4">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--brand)]">{item.name} × {item.qty}</p>
                    {item.is_digital && item.digital_delivery_url && (
                      <a href={item.digital_delivery_url} className="text-xs text-[var(--accent-hover,var(--accent))] underline">
                        Download now
                      </a>
                    )}
                  </div>
                  <span className="text-sm text-gray-600">{money(item.price_cents * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--brand)]">Total</span>
              <span className="text-lg font-bold text-[var(--brand)]">{money(order.subtotal_cents)}</span>
            </div>
          </div>

          {order.fulfillment_type !== 'digital' && (
            <p className="text-sm text-gray-500 mb-6">
              We&apos;ll follow up with shipping details as soon as your order is on its way.
            </p>
          )}

          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-sm font-semibold text-[var(--brand)] mb-2">Need to change something?</h2>
            <p className="text-sm text-gray-500">
              Reply to your confirmation email
              {config.contact.phone ? <> or text/call us at <a href={`sms:${config.contact.phoneDigits}`} className="text-[var(--brand)] underline">{config.contact.phone}</a></> : null}
              {' '}— we&apos;re glad to help with anything about this order.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
