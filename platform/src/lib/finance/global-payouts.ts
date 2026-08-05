/**
 * Stripe Global Payouts (v2 Money Management) claim/finalize helpers —
 * the global_payouts counterpart to cleaner-payout.ts's Connect (v1
 * transfers) functions. Shares the same team_member_payouts ledger and the
 * same UNIQUE(tenant_id, booking_id) claim-before-transfer guard, so a
 * booking can only be paid once regardless of which rail pays it.
 */
import Stripe from 'stripe'
import { supabaseAdmin } from '../supabase'
import type { PayoutClaim } from './cleaner-payout'

const GLOBAL_PAYOUTS_API_VERSION = '2026-07-29.preview'

export async function claimGlobalPayout(opts: {
  tenantId: string
  bookingId: string
  teamMemberId: string
  amountCents: number
  tipCents?: number
}): Promise<PayoutClaim> {
  const { data, error } = await supabaseAdmin
    .from('team_member_payouts')
    .insert({
      tenant_id: opts.tenantId,
      booking_id: opts.bookingId,
      team_member_id: opts.teamMemberId,
      amount_cents: opts.amountCents,
      tip_cents: opts.tipCents ?? 0,
      status: 'pending',
      rail: 'global_payouts',
    })
    .select('id')
    .single()
  if (error || !data) return { claimed: false }
  return { claimed: true, payoutId: data.id as string }
}

export async function finalizeGlobalPayout(opts: {
  tenantId: string
  payoutId: string
  amountCents: number
  tipCents: number
  stripeOutboundPaymentId: string
}): Promise<void> {
  await supabaseAdmin
    .from('team_member_payouts')
    .update({
      amount_cents: opts.amountCents,
      tip_cents: opts.tipCents,
      stripe_outbound_payment_id: opts.stripeOutboundPaymentId,
      status: 'transferred',
      paid_at: new Date().toISOString(),
    })
    .eq('tenant_id', opts.tenantId)
    .eq('id', opts.payoutId)
}

interface FinancialAccount {
  id: string
  balance: { available: Record<string, { value: number }> }
}

/**
 * Money-Management v2 endpoints require the preview header and aren't covered
 * by the `stripe` npm package yet, so these hit the REST API directly. Takes
 * the raw decrypted API key rather than a Stripe client instance — reaching
 * into the SDK's private fields to recover the key it was constructed with
 * is fragile and not a supported use of the library.
 */
async function v2Get(apiKey: string, path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.stripe.com${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Stripe-Version': GLOBAL_PAYOUTS_API_VERSION,
    },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`[global-payouts] GET ${path} failed: ${JSON.stringify(json)}`)
  return json
}

async function v2Post(apiKey: string, path: string, body: Record<string, unknown>, idempotencyKey: string): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Stripe-Version': GLOBAL_PAYOUTS_API_VERSION,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`[global-payouts] POST ${path} failed: ${JSON.stringify(json)}`)
  return json
}

export async function getStorageFinancialAccount(apiKey: string): Promise<FinancialAccount | null> {
  const list = await v2Get(apiKey, '/v2/money_management/financial_accounts') as { data: FinancialAccount[] }
  return list.data?.find(fa => (fa as unknown as { type: string }).type === 'storage') || null
}

/**
 * Top up the Financial Account from the platform's regular Stripe payments
 * balance so a payout run never has to surface "insufficient funds" as long
 * as the platform balance itself has enough SETTLED money. Stripe enforces
 * one hard rule no code can route around: only AVAILABLE balance (not
 * pending/unsettled) can be pulled — see feedback in the 08-04 session.
 * Returns the amount actually topped up, in cents (may be less than
 * requested, or 0, if the platform's available balance is short).
 */
export async function ensureFinancialAccountFunded(
  stripe: Stripe,
  apiKey: string,
  financialAccountId: string,
  neededCents: number,
  idempotencyKey: string,
): Promise<{ toppedUpCents: number; stripeTopUpId: string | null }> {
  const fa = await v2Get(apiKey, '/v2/money_management/financial_accounts') as { data: FinancialAccount[] }
  const account = fa.data?.find(a => a.id === financialAccountId)
  const currentAvailableCents = account?.balance?.available?.usd?.value ?? 0
  const shortfallCents = neededCents - currentAvailableCents
  if (shortfallCents <= 0) return { toppedUpCents: 0, stripeTopUpId: null }

  const platformBalance = await stripe.balance.retrieve()
  const platformAvailableCents = platformBalance.available.find(b => b.currency === 'usd')?.amount ?? 0
  const topUpCents = Math.min(shortfallCents, platformAvailableCents)
  if (topUpCents <= 0) return { toppedUpCents: 0, stripeTopUpId: null }

  const payout = await stripe.payouts.create(
    { amount: topUpCents, currency: 'usd', method: 'standard', payout_method: financialAccountId } as unknown as Stripe.PayoutCreateParams,
    { idempotencyKey },
  )
  return { toppedUpCents: topUpCents, stripeTopUpId: payout.id }
}

export async function createOutboundPayment(
  apiKey: string,
  opts: { financialAccountId: string; recipientId: string; amountCents: number; description: string; idempotencyKey: string },
): Promise<{ id: string; status: string }> {
  const result = await v2Post(
    apiKey,
    '/v2/money_management/outbound_payments',
    {
      from: { financial_account: opts.financialAccountId, currency: 'usd' },
      to: { recipient: opts.recipientId },
      amount: { value: opts.amountCents, currency: 'usd' },
      description: opts.description,
    },
    opts.idempotencyKey,
  )
  return { id: result.id as string, status: result.status as string }
}
