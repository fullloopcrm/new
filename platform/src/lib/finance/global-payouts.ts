/**
 * Stripe Global Payouts (v2 Money Management) claim/finalize helpers —
 * the global_payouts counterpart to cleaner-payout.ts's Connect (v1
 * transfers) functions. Shares the same team_member_payouts ledger and the
 * same UNIQUE(tenant_id, booking_id) claim-before-transfer guard, so a
 * booking can only be paid once regardless of which rail pays it.
 */
import Stripe from 'stripe'
import { supabaseAdmin } from '../supabase'
import { sendSMS } from '../sms'
import { sendTenantTelegram } from '../notify'
import { trackError } from '../error-tracking'
import { cleanerAlreadyPaid, releaseCleanerPayout } from './cleaner-payout'
import type { PayoutClaim } from './cleaner-payout'
import type { TeamMemberPayoutGroup } from './global-payouts-eligibility'

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

/**
 * Creates a new Global Payouts recipient (v2 core account) for a team
 * member who doesn't have one yet. Requests both bank and card payout
 * capabilities — matches what real NYCM recipients actually ended up with
 * this session (some added a bank account, Jeff added a card).
 */
export async function createRecipientAccount(
  apiKey: string,
  opts: { email: string | null; displayName: string; teamMemberId: string; tenantId: string },
): Promise<{ id: string }> {
  const result = await v2Post(
    apiKey,
    '/v2/core/accounts',
    {
      contact_email: opts.email || undefined,
      display_name: opts.displayName,
      identity: { country: 'us', entity_type: 'individual' },
      configuration: {
        recipient: {
          capabilities: {
            bank_accounts: { local: { requested: true } },
            cards: { requested: true },
          },
        },
      },
      metadata: { team_member_id: opts.teamMemberId, tenant_id: opts.tenantId },
    },
    `gp-recipient:${opts.tenantId}:${opts.teamMemberId}`,
  )
  return { id: result.id as string }
}

/**
 * Generates a Stripe-hosted onboarding link for a recipient. A recipient
 * that has ALREADY submitted info at least once rejects the "onboarding"
 * link type outright ("account has already been onboarded" — confirmed
 * live against a real NYCM recipient, 08-04); this tries onboarding first
 * and falls back to the "update" link type on that specific error, so
 * callers don't have to track onboarding state themselves. Every link
 * expires in 10 minutes and works once — generate on demand, don't cache.
 */
export async function createRecipientOnboardingLink(
  apiKey: string,
  opts: { accountId: string; returnUrl: string; refreshUrl: string },
): Promise<{ url: string; expiresAt: string }> {
  const attempt = async (type: 'account_onboarding' | 'account_update') => v2Post(
    apiKey,
    '/v2/core/account_links',
    {
      account: opts.accountId,
      use_case: {
        type,
        [type]: { configurations: ['recipient'], return_url: opts.returnUrl, refresh_url: opts.refreshUrl },
      },
    },
    `gp-link:${opts.accountId}:${Date.now()}`,
  )

  try {
    const result = await attempt('account_onboarding')
    return { url: result.url as string, expiresAt: result.expires_at as string }
  } catch (err) {
    if (err instanceof Error && err.message.includes('already been onboarded')) {
      const result = await attempt('account_update')
      return { url: result.url as string, expiresAt: result.expires_at as string }
    }
    throw err
  }
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

export interface ExecuteResult {
  paid: { bookingId: string; teamMemberName: string; amountCents: number }[]
  skipped: { bookingId: string; teamMemberName: string; reason: string }[]
}

/**
 * Pays every item across a set of already-guardrail-cleared team-member
 * groups (one booking at a time, same claim-before-transfer guard as
 * everything else here), then sends one grouped SMS per person listing the
 * clients/jobs paid + total tip — not an itemized per-job breakdown, per
 * Jeff's "don't give them something to nitpick" call.
 *
 * Shared by both the main run (for groups under threshold) and the
 * held-group execution path (after an admin's SMS "GO" — see
 * global-payouts-guardrails.ts), so a held payout pays out exactly the same
 * way a normal one does once approved.
 */
export interface TenantNotifyConfig {
  telnyxApiKey: string | null
  telnyxPhone: string | null
  smsFromNumber: string | null
  telegramBotToken: string | null
  telegramChatId: string | null
}

export async function executeGroups(
  tenantId: string,
  stripe: Stripe,
  apiKey: string,
  financialAccountId: string,
  groups: TeamMemberPayoutGroup[],
  tenantSms: TenantNotifyConfig,
): Promise<ExecuteResult> {
  const paid: ExecuteResult['paid'] = []
  const skipped: ExecuteResult['skipped'] = []

  for (const group of groups) {
    let groupTipCents = 0
    let groupTotalCents = 0
    const clientNames: string[] = []

    for (const item of group.items) {
      if (await cleanerAlreadyPaid(tenantId, item.bookingId, group.teamMemberId)) continue

      const claim = await claimGlobalPayout({
        tenantId,
        bookingId: item.bookingId,
        teamMemberId: group.teamMemberId,
        amountCents: item.amountCents,
        tipCents: item.tipCents,
      })
      if (!claim.claimed || !claim.payoutId) {
        skipped.push({ bookingId: item.bookingId, teamMemberName: group.name, reason: 'already claimed by another run' })
        continue
      }

      try {
        const outbound = await createOutboundPayment(apiKey, {
          financialAccountId,
          recipientId: group.recipientId,
          amountCents: item.amountCents + item.tipCents,
          description: `Cleaner pay — booking ${item.bookingId}`,
          idempotencyKey: `gp-payout:${item.bookingId}:${group.teamMemberId}`,
        })
        await finalizeGlobalPayout({
          tenantId,
          payoutId: claim.payoutId,
          amountCents: item.amountCents,
          tipCents: item.tipCents,
          stripeOutboundPaymentId: outbound.id,
        })
        // Extras never had bookings.team_member_id pointing at them, so only
        // flip team_member_paid when this item is the lead — an extra's
        // completion is tracked purely via the team_member_payouts row.
        if (item.role === 'lead') {
          await supabaseAdmin
            .from('bookings')
            .update({ team_member_paid: true, team_member_paid_at: new Date().toISOString() })
            .eq('id', item.bookingId)
            .eq('tenant_id', tenantId)
        }
        paid.push({ bookingId: item.bookingId, teamMemberName: group.name, amountCents: item.amountCents + item.tipCents })
        groupTipCents += item.tipCents
        groupTotalCents += item.amountCents + item.tipCents
        clientNames.push(item.clientName)
      } catch (err) {
        // Best-effort cleanup: release the claim so it doesn't stay stuck
        // blocking this payout forever. If the release itself fails, that
        // failure used to be swallowed silently with no trace — track it so
        // a stuck claim is discoverable instead of invisible.
        await releaseCleanerPayout(tenantId, claim.payoutId).catch((releaseErr) => {
          trackError(releaseErr, {
            source: 'finance/global-payouts:release-after-failure',
            tenantId,
            severity: 'high',
            extra: `payoutId=${claim.payoutId}; bookingId=${item.bookingId}; originalError=${err instanceof Error ? err.message : String(err)}`,
          }).catch(() => {})
        })
        skipped.push({ bookingId: item.bookingId, teamMemberName: group.name, reason: err instanceof Error ? err.message : 'unknown error' })
      }
    }

    if (clientNames.length > 0 && group.phone && group.smsConsent !== false && tenantSms.telnyxApiKey && tenantSms.telnyxPhone) {
      const isEs = group.preferredLanguage === 'es'
      const jobsList = clientNames.join(isEs ? ' y ' : ' and ')
      const total = (groupTotalCents / 100).toFixed(2)
      const tipLine = groupTipCents > 0 ? (isEs ? ` (incluye $${(groupTipCents / 100).toFixed(2)} de propina)` : ` (includes $${(groupTipCents / 100).toFixed(2)} tip)`) : ''
      const body = isEs
        ? `Pago enviado: $${total}${tipLine} por ${jobsList}. Debería llegar pronto.`
        : `Payment sent: $${total}${tipLine} for ${jobsList}. Should arrive shortly.`
      sendSMS({
        to: group.phone,
        body,
        telnyxApiKey: tenantSms.telnyxApiKey,
        telnyxPhone: tenantSms.smsFromNumber || tenantSms.telnyxPhone,
      }).catch(err => console.error('[global-payouts] payout SMS failed:', err))
    }

    // Admin-side confirmation, separate from the cleaner's own SMS above —
    // global (every tenant, gated only by that tenant having Telegram
    // configured), per payment/run, not itemized per booking.
    if (clientNames.length > 0) {
      const total = (groupTotalCents / 100).toFixed(2)
      const tipLine = groupTipCents > 0 ? ` (includes $${(groupTipCents / 100).toFixed(2)} tip)` : ''
      sendTenantTelegram(
        tenantId,
        { telegram_bot_token: tenantSms.telegramBotToken, telegram_chat_id: tenantSms.telegramChatId },
        `✅ Paid ${group.name} $${total}${tipLine} for ${clientNames.join(', ')} (Global Payouts).`,
      ).catch(err => console.error('[global-payouts] payout Telegram notify failed:', err))
    }
  }

  return { paid, skipped }
}
