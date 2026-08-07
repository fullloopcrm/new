/**
 * Single shared "pay the cleaner at checkout" entry point — called from
 * every place a booking can be checked out (team-portal checkout, the admin
 * dashboard's Check Out button). Prefers the Global Payouts (v2 Money
 * Management) rail, since that's the active recipient system real
 * recipients are actually onboarded onto; falls back to the older Connect
 * v1 transfer only if a team member still has a stripe_account_id and no
 * Global Payouts recipient. Idempotent via the same team_member_payouts
 * claim table every payout path shares, so calling this from two different
 * checkout surfaces for the same booking can never double-pay.
 */
import Stripe from 'stripe'
import { tenantDb } from '../tenant-db'
import { supabaseAdmin } from '../supabase'
import { decryptSecret } from '../secret-crypto'
import { smsAdmins } from '../admin-contacts'
import { sendTenantTelegram } from '../notify'
import { cleanerAlreadyPaid, claimCleanerPayout, finalizeCleanerPayout, releaseCleanerPayout } from './cleaner-payout'
import { claimGlobalPayout, finalizeGlobalPayout, getStorageFinancialAccount, ensureFinancialAccountFunded, createOutboundPayment } from './global-payouts'
import { postPayoutToLedger } from './post-labor'

const STRIPE_API_VERSION = '2025-04-30.basil' as Stripe.LatestApiVersion

export interface PayCleanerAtCheckoutOpts {
  tenantId: string
  bookingId: string
  teamMemberId: string | null
  teamMemberPayCents: number | null
  teamMember: { stripe_account_id?: string | null; global_payouts_recipient_id?: string | null; name?: string | null } | null
  teamMemberName?: string | null
  clientName?: string | null
}

export async function payCleanerAtCheckout(opts: PayCleanerAtCheckoutOpts): Promise<void> {
  const { tenantId, bookingId, teamMemberId, teamMemberPayCents, teamMember } = opts
  const teamMemberName = opts.teamMemberName || teamMember?.name || 'the cleaner'
  const clientName = opts.clientName || 'the client'
  if (
    !teamMemberId ||
    !teamMemberPayCents ||
    teamMemberPayCents <= 0 ||
    !(teamMember?.global_payouts_recipient_id || teamMember?.stripe_account_id) ||
    (await cleanerAlreadyPaid(tenantId, bookingId))
  ) {
    return
  }

  const { data: tenantRow } = await supabaseAdmin
    .from('tenants')
    .select('stripe_api_key, telegram_bot_token, telegram_chat_id')
    .eq('id', tenantId)
    .single()
  const stripeKey = tenantRow?.stripe_api_key ? decryptSecret(tenantRow.stripe_api_key as string) : process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return

  // Confirmation posted to the tenant's own Telegram (per-tenant chat/bot,
  // same mechanism global-payouts' batch run already uses) — Jeff wants a
  // "payment sent" confirmation for every checkout-triggered payout,
  // platform-wide, not just NYC Maid (2026-08-07).
  const notifyPaid = (amountCents: number) => {
    sendTenantTelegram(
      tenantId,
      { telegram_bot_token: tenantRow?.telegram_bot_token as string | null, telegram_chat_id: tenantRow?.telegram_chat_id as string | null },
      `✅ Paid ${teamMemberName} $${(amountCents / 100).toFixed(2)} for ${clientName}'s job (checkout).`,
    ).catch((err) => console.error('checkout payout Telegram confirm failed:', err))
  }

  if (teamMember?.global_payouts_recipient_id) {
    const claim = await claimGlobalPayout({ tenantId, bookingId, teamMemberId, amountCents: teamMemberPayCents })
    if (!claim.claimed || !claim.payoutId) return
    try {
      const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION })
      const financialAccount = await getStorageFinancialAccount(stripeKey)
      if (!financialAccount) throw new Error('No Global Payouts Financial Account configured')
      await ensureFinancialAccountFunded(stripe, stripeKey, financialAccount.id, teamMemberPayCents, `checkout-topup:${bookingId}`)
      const outbound = await createOutboundPayment(stripeKey, {
        financialAccountId: financialAccount.id,
        recipientId: teamMember.global_payouts_recipient_id,
        amountCents: teamMemberPayCents,
        description: `Checkout payout for booking ${bookingId}`,
        idempotencyKey: `checkout-gp-payout:${bookingId}`,
      })
      await finalizeGlobalPayout({
        tenantId, payoutId: claim.payoutId, amountCents: teamMemberPayCents, tipCents: 0,
        stripeOutboundPaymentId: outbound.id,
      })
      postPayoutToLedger({ tenantId, payoutId: claim.payoutId }).catch((err) => console.error('checkout payout ledger post failed:', err))
      await tenantDb(tenantId).from('bookings').update({ team_member_paid: true, team_member_paid_at: new Date().toISOString() }).eq('id', bookingId).then(() => {}, () => {})
    } catch (payErr) {
      await releaseCleanerPayout(tenantId, claim.payoutId).catch(() => {})
      console.error('checkout Global Payouts payout failed:', payErr)
      smsAdmins(tenantId, `Cleaner payout FAILED at checkout for booking ${bookingId} — pay manually.`).catch(() => {})
    }
    return
  }

  if (teamMember?.stripe_account_id) {
    const claim = await claimCleanerPayout({ tenantId, bookingId, teamMemberId, amountCents: teamMemberPayCents })
    if (!claim.claimed || !claim.payoutId) return
    try {
      const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION })
      const transfer = await stripe.transfers.create({
        amount: teamMemberPayCents,
        currency: 'usd',
        destination: teamMember.stripe_account_id,
        description: `Checkout payout for booking ${bookingId}`,
        metadata: { booking_id: bookingId, tenant_id: tenantId },
      }, { idempotencyKey: `checkout-payout:${bookingId}` })

      let instantPayoutId: string | null = null
      let isInstant = false
      try {
        const payout = await stripe.payouts.create(
          { amount: teamMemberPayCents, currency: 'usd', method: 'instant' },
          { stripeAccount: teamMember.stripe_account_id, idempotencyKey: `checkout-instant-payout:${bookingId}` },
        )
        instantPayoutId = payout.id
        isInstant = true
      } catch {
        // standard schedule fallback — Stripe will pay on default cadence
      }

      await finalizeCleanerPayout({
        tenantId, payoutId: claim.payoutId, amountCents: teamMemberPayCents, tipCents: 0,
        stripeTransferId: transfer.id, stripePayoutId: instantPayoutId, instant: isInstant,
      })
      postPayoutToLedger({ tenantId, payoutId: claim.payoutId }).catch((err) => console.error('checkout payout ledger post failed:', err))
      await tenantDb(tenantId).from('bookings').update({ team_member_paid: true, team_member_paid_at: new Date().toISOString() }).eq('id', bookingId).then(() => {}, () => {})
    } catch (transferErr) {
      await releaseCleanerPayout(tenantId, claim.payoutId).catch(() => {})
      console.error('checkout cleaner payout failed:', transferErr)
      smsAdmins(tenantId, `Cleaner payout FAILED at checkout for booking ${bookingId} — pay manually.`).catch(() => {})
    }
  }
}
