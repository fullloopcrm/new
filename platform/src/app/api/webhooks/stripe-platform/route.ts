/**
 * POST /api/webhooks/stripe-platform
 *
 * PLATFORM billing webhook (FullLoop's own Stripe account) — separate from the
 * tenant Connect webhook at /api/webhooks/stripe so the two event streams and
 * signing secrets never cross-wire.
 *
 * On a completed proposal checkout, create the tenant (status 'new') via the
 * shared createTenantFromLead path. Idempotent — a re-delivered event is a no-op.
 *
 * Env: STRIPE_PLATFORM_WEBHOOK_SECRET (from the Stripe dashboard endpoint).
 */
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createTenantFromLead } from '@/lib/create-tenant-from-lead'
import { activateTenant } from '@/lib/activate-tenant'

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
      const result = await createTenantFromLead(meta.lead_id, { status: 'new', stripeSubscriptionId })
      if (!result.ok) {
        console.error('[stripe-platform] tenant create failed:', result.error)
        // Return 500 so Stripe retries — better than silently dropping a paid sale.
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      // Paid → drive the tenant to live automatically (seeds team + review dest,
      // domains, runs the gate, flips 'active' when ready). Idempotent and
      // best-effort: an activation failure must NOT fail the webhook — the paid
      // tenant already exists and an admin can re-run activation from the board.
      if (result.tenant && !result.alreadyConverted) {
        try {
          await activateTenant(result.tenant.id)
        } catch (e) {
          console.error('[stripe-platform] auto-activate failed:', e)
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
