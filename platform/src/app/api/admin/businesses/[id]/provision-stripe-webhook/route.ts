/**
 * POST /api/admin/businesses/:id/provision-stripe-webhook
 *
 * Closes the one manual step left in "drop the Stripe key in and it works":
 * registers a webhook endpoint on the tenant's own Stripe account and
 * captures its signing secret into tenants.stripe_webhook_secret. See
 * src/lib/stripe-provision.ts for why this can't be skipped — Stripe never
 * re-shows a secret after creation.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { provisionStripeWebhookSecret } from '@/lib/stripe-provision'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const result = await provisionStripeWebhookSecret(id)

  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
