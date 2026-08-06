/**
 * Automates the one remaining manual step in wiring a tenant's own Stripe
 * account for auto-payment: registering the webhook endpoint on THEIR
 * account and capturing its signing secret into tenants.stripe_webhook_secret.
 *
 * Everything else already "just works" off tenants.stripe_api_key alone —
 * the 30-min heads-up SMS creates its own per-booking adjustable-amount
 * Payment Link on demand (src/app/api/team-portal/30min-alert/route.ts,
 * createPaymentLink({ adjustableAmount: true })), which stamps
 * metadata.tenant_id itself, so it never depended on a pre-created link.
 * But every tenant's own Stripe account generates its own unique webhook
 * signing secret when an endpoint is created there — Stripe never re-shows
 * a secret after creation, so it has to be captured at creation time and
 * stored, or every checkout/refund/dispute event from that tenant's account
 * fails signature verification and silently never gets recorded (the exact
 * gap found + fixed for FloridaMade 2026-08-06, see
 * src/app/api/webhooks/stripe/route.ts peekEventTenantId()).
 *
 * Idempotent: safe to call repeatedly (e.g., a "Provision Stripe" button
 * that can be re-clicked without creating duplicate endpoints).
 */
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptSecret, encryptSecret } from '@/lib/secret-crypto'
import { candidateStripeWebhookUrls } from '@/lib/onboarding-verify'

const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'checkout.session.completed',
  'charge.refunded',
  'charge.dispute.created',
  'payment_intent.payment_failed',
  'account.updated',
]

export interface ProvisionStripeWebhookResult {
  ok: boolean
  status: 'already_configured' | 'created' | 'recreated' | 'skipped_no_key' | 'error'
  detail: string
  url?: string
}

interface TenantRow {
  id: string
  domain: string | null
  stripe_api_key: string | null
  stripe_webhook_secret: string | null
}

/** The URL a NEW endpoint should be registered at for this tenant. */
function targetWebhookUrl(appUrl: string, domain: string | null): string {
  const d = domain?.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
  // Real tenant endpoints observed in the wild use their own branded domain
  // (thefloridamaid.com, www.thenycmaid.com) — match that convention rather
  // than the platform's own default, which no live tenant actually uses.
  return d ? `https://${d}/api/webhooks/stripe` : `${appUrl}/api/webhooks/stripe`
}

export async function provisionStripeWebhookSecret(
  tenantId: string,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://homeservicesbusinesscrm.com',
): Promise<ProvisionStripeWebhookResult> {
  const { data: tenant, error: fetchErr } = await supabaseAdmin
    .from('tenants')
    .select('id, domain, stripe_api_key, stripe_webhook_secret')
    .eq('id', tenantId)
    .maybeSingle()

  if (fetchErr) return { ok: false, status: 'error', detail: `tenant lookup failed: ${fetchErr.message}` }
  if (!tenant) return { ok: false, status: 'error', detail: 'tenant not found' }
  const t = tenant as TenantRow
  if (!t.stripe_api_key) return { ok: false, status: 'skipped_no_key', detail: 'no stripe_api_key set on this tenant' }

  const apiKey = decryptSecret(t.stripe_api_key)
  let stripe: Stripe
  try {
    stripe = new Stripe(apiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
  } catch (e) {
    return { ok: false, status: 'error', detail: `invalid Stripe key: ${e instanceof Error ? e.message : 'unknown'}` }
  }

  const candidates = candidateStripeWebhookUrls(appUrl, t.domain)

  let endpoints: Stripe.WebhookEndpoint[]
  try {
    endpoints = (await stripe.webhookEndpoints.list({ limit: 100 })).data
  } catch (e) {
    return { ok: false, status: 'error', detail: `Stripe webhook list failed: ${e instanceof Error ? e.message : 'unknown'}` }
  }

  const existingMatch = endpoints.find(e => candidates.includes(e.url) && e.status === 'enabled')

  // A matching enabled endpoint already exists AND we already have a secret
  // for it — the common re-run case (button clicked twice). Nothing to do;
  // we can't verify the stored secret actually matches this exact endpoint
  // without a live event, but re-creating on every click would spam Stripe
  // with dead endpoints for no benefit.
  if (existingMatch && t.stripe_webhook_secret) {
    return { ok: true, status: 'already_configured', detail: `Webhook already enabled at ${existingMatch.url}`, url: existingMatch.url }
  }

  const url = targetWebhookUrl(appUrl, t.domain)

  // A matching endpoint exists but we have no stored secret for it (the
  // FloridaMade case pre-fix: someone created it by hand, never captured
  // the secret). Stripe never re-shows a secret after creation, so the only
  // way to get a capturable one is to delete and recreate.
  if (existingMatch) {
    try {
      await stripe.webhookEndpoints.del(existingMatch.id)
    } catch (e) {
      return { ok: false, status: 'error', detail: `failed to remove stale endpoint before recreating: ${e instanceof Error ? e.message : 'unknown'}` }
    }
  }

  let created: Stripe.WebhookEndpoint
  try {
    created = await stripe.webhookEndpoints.create({ url, enabled_events: WEBHOOK_EVENTS })
  } catch (e) {
    return { ok: false, status: 'error', detail: `Stripe webhook create failed: ${e instanceof Error ? e.message : 'unknown'}` }
  }

  if (!created.secret) {
    return { ok: false, status: 'error', detail: 'Stripe did not return a signing secret on creation' }
  }

  const { error: saveErr } = await supabaseAdmin
    .from('tenants')
    .update({ stripe_webhook_secret: encryptSecret(created.secret) })
    .eq('id', tenantId)

  if (saveErr) return { ok: false, status: 'error', detail: `webhook created but saving the secret failed: ${saveErr.message}` }

  return {
    ok: true,
    status: existingMatch ? 'recreated' : 'created',
    detail: `Webhook ${existingMatch ? 're-created' : 'created'} at ${url}, secret captured and stored`,
    url,
  }
}
