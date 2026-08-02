/**
 * POST /api/webhooks/stripe-platform
 *
 * PLATFORM billing webhook (FullLoop's own Stripe account) — separate from the
 * tenant Connect webhook at /api/webhooks/stripe so the two event streams and
 * signing secrets never cross-wire.
 *
 * On a completed proposal checkout, the customer has only started the
 * $2,500/mo recurring subscription ($1 first invoice) — the tenant is NOT
 * created here. The $25k setup fee is a separate bank wire; the tenant is
 * created when an admin confirms that wire landed (see
 * requests/[id]/wire-received). This handler just records the subscription
 * on the lead so wire-received can find it. Idempotent — a re-delivered
 * event is a no-op (same subscription id gets written twice, harmless).
 *
 * Env: STRIPE_PLATFORM_WEBHOOK_SECRET (from the Stripe dashboard endpoint).
 */
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  const secret = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET
  if (!secret) {
    console.error('[stripe-platform] STRIPE_PLATFORM_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const sig = request.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const payload = await request.text()
  const stripe = getStripe()

  let event
  try {
    event = stripe.webhooks.constructEvent(payload, sig, secret)
  } catch (e) {
    console.error('[stripe-platform] signature verify failed:', e)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      metadata?: Record<string, string> | null
      subscription?: string | { id: string } | null
    }
    const meta = session.metadata || {}
    if (meta.kind === 'platform_proposal' && meta.lead_id) {
      const stripeSubscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null

      const { error } = await supabaseAdmin
        .from('partner_requests')
        .update({
          stripe_subscription_id: stripeSubscriptionId,
          subscription_started_at: new Date().toISOString(),
        })
        .eq('id', meta.lead_id)

      if (error) {
        console.error('[stripe-platform] failed to record subscription on lead:', error)
        // Return 500 so Stripe retries — better than silently losing the sub id.
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ received: true })
}
