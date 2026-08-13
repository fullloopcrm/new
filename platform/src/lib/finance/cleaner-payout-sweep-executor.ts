/**
 * Pays out whatever's left owed to a cleaner on a booking that's already
 * had at least one payout — the case a checkout-time auto-payout and a
 * Stripe-webhook auto-payout both structurally cannot catch: a tip or
 * overpayment that clears AFTER an earlier payout already claimed that
 * booking+cleaner's slot. Companion to payCleanerAtCheckout
 * (checkout-payout.ts), not a replacement — that function pays the FIRST,
 * base-pay installment at checkout; this one is the backstop that catches
 * whatever a later payment adds on top, on whichever rail the cleaner is
 * actually set up for (Global Payouts preferred, Connect v1 fallback —
 * same order checkout-payout.ts uses).
 *
 * sourceRef is deterministic on the exact outstanding amount at claim time
 * (`sweep:${bookingId}:${teamMemberId}:${outstandingCents}`), not a
 * timestamp — two concurrent sweep ticks computing the identical remaining
 * balance collide at the DB's unique index and only one pays; a genuinely
 * different later amount (a second late tip) gets its own claim.
 *
 * Split from cleaner-payout-sweep.ts (which owns candidate discovery + the
 * no-payout-method guardrail) so that orchestration logic can be tested
 * with this file's Stripe-calling internals mocked at the module boundary
 * — the two can't live in one file and still be independently testable,
 * since a same-file function call bypasses vi.mock entirely.
 */
import Stripe from 'stripe'
import { supabaseAdmin } from '../supabase'
import { decryptSecret } from '../secret-crypto'
import { smsAdmins } from '../admin-contacts'
import { sendTenantTelegram } from '../notify'
import { trackError } from '../error-tracking'
import { claimCleanerPayout, finalizeCleanerPayout, releaseCleanerPayout } from './cleaner-payout'
import { claimGlobalPayout, finalizeGlobalPayout, getStorageFinancialAccount, ensureFinancialAccountFunded, createOutboundPayment } from './global-payouts'
import { postPayoutToLedger } from './post-labor'
import type { CleanerOutstanding } from './cleaner-outstanding'

const STRIPE_API_VERSION = '2025-04-30.basil' as Stripe.LatestApiVersion

export type SweepResult = 'paid' | 'no_payout_method' | 'failed' | 'not_claimed' | 'no_stripe_key'

export async function sweepCleanerOutstanding(opts: {
  tenantId: string
  bookingId: string
  cleaner: CleanerOutstanding
  clientName?: string | null
}): Promise<SweepResult> {
  const { tenantId, bookingId, cleaner } = opts
  const clientName = opts.clientName || 'a client'
  const outstandingCents = cleaner.outstandingCents
  if (outstandingCents <= 0) return 'paid'

  if (!cleaner.globalPayoutsRecipientId && !cleaner.stripeAccountId) return 'no_payout_method'

  const { data: tenantRow } = await supabaseAdmin
    .from('tenants')
    .select('stripe_api_key, telegram_bot_token, telegram_chat_id')
    .eq('id', tenantId)
    .single()
  const stripeKey = tenantRow?.stripe_api_key ? decryptSecret(tenantRow.stripe_api_key as string) : process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return 'no_stripe_key'

  const telegramConfig = { telegram_bot_token: tenantRow?.telegram_bot_token as string | null, telegram_chat_id: tenantRow?.telegram_chat_id as string | null }
  const sourceRef = `sweep:${bookingId}:${cleaner.cleanerId}:${outstandingCents}`

  const notifyPaid = () => {
    sendTenantTelegram(
      tenantId, telegramConfig,
      `✅ Swept $${(outstandingCents / 100).toFixed(2)} still owed to ${cleaner.name} for ${clientName}'s job (a tip or balance that cleared after the original payout).`,
    ).catch((err) => console.error('sweep payout Telegram confirm failed:', err))
  }
  const notifyFailed = (reason: string) => {
    const message = `Cleaner payout sweep FAILED for booking ${bookingId} (${cleaner.name}, $${(outstandingCents / 100).toFixed(2)} owed) — pay manually. ${reason}`
    smsAdmins(tenantId, message).catch((err) => console.error('sweep payout SMS alert failed:', err))
    sendTenantTelegram(tenantId, telegramConfig, `⚠️ ${message}`).catch((err) => console.error('sweep payout Telegram alert failed:', err))
  }

  if (cleaner.globalPayoutsRecipientId) {
    const claim = await claimGlobalPayout({ tenantId, bookingId, teamMemberId: cleaner.cleanerId, amountCents: outstandingCents, tipCents: 0, sourceRef })
    if (!claim.claimed || !claim.payoutId) return 'not_claimed'
    try {
      const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION })
      const financialAccount = await getStorageFinancialAccount(stripeKey)
      if (!financialAccount) throw new Error('No Global Payouts Financial Account configured')
      await ensureFinancialAccountFunded(stripe, stripeKey, financialAccount.id, outstandingCents, `sweep-topup:${bookingId}:${cleaner.cleanerId}:${outstandingCents}`)
      const outbound = await createOutboundPayment(stripeKey, {
        financialAccountId: financialAccount.id,
        recipientId: cleaner.globalPayoutsRecipientId,
        amountCents: outstandingCents,
        description: `Outstanding balance sweep for booking ${bookingId}`,
        idempotencyKey: `sweep-gp-payout:${bookingId}:${cleaner.cleanerId}:${outstandingCents}`,
      })
      await finalizeGlobalPayout({ tenantId, payoutId: claim.payoutId, amountCents: outstandingCents, tipCents: 0, stripeOutboundPaymentId: outbound.id })
      postPayoutToLedger({ tenantId, payoutId: claim.payoutId }).catch((err) => console.error('sweep payout ledger post failed:', err))
      notifyPaid()
      return 'paid'
    } catch (payErr) {
      await releaseCleanerPayout(tenantId, claim.payoutId).catch((releaseErr) => {
        trackError(releaseErr, {
          source: 'finance/cleaner-payout-sweep:release-after-global-payout-failure',
          tenantId, severity: 'high',
          extra: `bookingId=${bookingId}; teamMemberId=${cleaner.cleanerId}; payoutId=${claim.payoutId}; originalError=${payErr instanceof Error ? payErr.message : String(payErr)}`,
        }).catch(() => {})
      })
      notifyFailed(payErr instanceof Error ? payErr.message : String(payErr))
      return 'failed'
    }
  }

  const claim = await claimCleanerPayout({ tenantId, bookingId, teamMemberId: cleaner.cleanerId, amountCents: outstandingCents, tipCents: 0, sourceRef })
  if (!claim.claimed || !claim.payoutId) return 'not_claimed'
  try {
    const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION })
    const transfer = await stripe.transfers.create({
      amount: outstandingCents,
      currency: 'usd',
      destination: cleaner.stripeAccountId as string,
      description: `Outstanding balance sweep for booking ${bookingId}`,
      metadata: { booking_id: bookingId, tenant_id: tenantId, team_member_id: cleaner.cleanerId },
    }, { idempotencyKey: `sweep-payout:${bookingId}:${cleaner.cleanerId}:${outstandingCents}` })

    let instantPayoutId: string | null = null
    let isInstant = false
    try {
      const payout = await stripe.payouts.create(
        { amount: outstandingCents, currency: 'usd', method: 'instant' },
        { stripeAccount: cleaner.stripeAccountId as string, idempotencyKey: `sweep-instant-payout:${bookingId}:${cleaner.cleanerId}:${outstandingCents}` },
      )
      instantPayoutId = payout.id
      isInstant = true
    } catch {
      // standard schedule fallback — Stripe will pay on default cadence
    }

    await finalizeCleanerPayout({ tenantId, payoutId: claim.payoutId, amountCents: outstandingCents, tipCents: 0, stripeTransferId: transfer.id, stripePayoutId: instantPayoutId, instant: isInstant })
    postPayoutToLedger({ tenantId, payoutId: claim.payoutId }).catch((err) => console.error('sweep payout ledger post failed:', err))
    notifyPaid()
    return 'paid'
  } catch (transferErr) {
    await releaseCleanerPayout(tenantId, claim.payoutId).catch((releaseErr) => {
      trackError(releaseErr, {
        source: 'finance/cleaner-payout-sweep:release-after-cleaner-payout-failure',
        tenantId, severity: 'high',
        extra: `bookingId=${bookingId}; teamMemberId=${cleaner.cleanerId}; payoutId=${claim.payoutId}; originalError=${transferErr instanceof Error ? transferErr.message : String(transferErr)}`,
      }).catch(() => {})
    })
    notifyFailed(transferErr instanceof Error ? transferErr.message : String(transferErr))
    return 'failed'
  }
}
