import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { createPaymentLink } from '@/lib/stripe'

// Real outstanding balance for a booking: price minus everything actually
// recorded in `payments`. Shared by the payment-reminder and payment-link
// routes so the two never drift on what "outstanding" means.
export async function computeOutstandingCents(tenantId: string, bookingId: string, priceCents: number): Promise<number> {
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('amount_cents')
    .eq('booking_id', bookingId)
    .eq('tenant_id', tenantId)
  const paidCents = (payments || []).reduce((s, p) => s + (p.amount_cents || 0), 0)
  return Math.max(0, (priceCents || 0) - paidCents)
}

// A fresh, single-booking Stripe Payment Link for the booking's current
// outstanding balance (adjustable so the client can still tip/overpay) --
// mirrors the existing 30min-alert pattern rather than the tenant-wide
// static link + caller-editable client_reference_id query param. Returns
// null when the tenant has no Stripe key configured, so callers can fall
// back to the tenant's generic link.
export async function ensureBookingPaymentLink(
  tenant: { id: string; stripe_api_key?: string | null },
  bookingId: string,
  serviceName: string,
  outstandingCents: number
): Promise<string | null> {
  if (!tenant.stripe_api_key) return null
  const link = await createPaymentLink({
    amount: outstandingCents,
    serviceName,
    bookingId,
    tenantId: tenant.id,
    stripeApiKey: tenant.stripe_api_key,
    adjustableAmount: true,
  })
  await tenantDb(tenant.id).from('bookings').update({ payment_link: link.url }).eq('id', bookingId)
  return link.url
}
