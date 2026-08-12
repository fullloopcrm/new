/**
 * Single shared "pay the cleaner at checkout" entry point — called from
 * every place a booking can be checked out (team-portal checkout, the admin
 * dashboard's Check Out button), once per team member owed money on that
 * booking (the lead AND any booking_team_members extras — see the two
 * checkout routes' own crew-payout loops). Prefers the Global Payouts (v2
 * Money Management) rail, since that's the active recipient system real
 * recipients are actually onboarded onto; falls back to the older Connect
 * v1 transfer only if a team member still has a stripe_account_id and no
 * Global Payouts recipient. Idempotent via the same team_member_payouts
 * claim table every payout path shares, keyed per (booking, team member) —
 * so calling this for two different people on the same booking, or from two
 * different checkout surfaces for the same person, can never double-pay.
 *
 * Also folds in any tip already recorded against the booking
 * (payments.tip_cents, summed fresh at payout time) instead of hardcoding
 * tipCents to 0 — a tip that lands via the Stripe webhook before this runs
 * would otherwise be silently stranded once the booking reads as "paid".
 */
import Stripe from 'stripe'
import { tenantDb } from '../tenant-db'
import { supabaseAdmin } from '../supabase'
import { decryptSecret } from '../secret-crypto'
import { smsAdmins } from '../admin-contacts'
import { sendTenantTelegram } from '../notify'
import { trackError } from '../error-tracking'
import { cleanerAlreadyPaid, claimCleanerPayout, finalizeCleanerPayout, releaseCleanerPayout, tipCentsForBooking } from './cleaner-payout'
import { claimGlobalPayout, finalizeGlobalPayout, getStorageFinancialAccount, ensureFinancialAccountFunded, createOutboundPayment } from './global-payouts'
import { postPayoutToLedger } from './post-labor'
import { computeCheckoutPricing } from '../checkout-pricing'
import { effectiveCleanerRate } from '../cleaner-pay'
import { isNycMaid } from '../nycmaid/tenant'

const STRIPE_API_VERSION = '2025-04-30.basil' as Stripe.LatestApiVersion

export interface PayCleanerAtCheckoutOpts {
  tenantId: string
  bookingId: string
  teamMemberId: string | null
  teamMemberPayCents: number | null
  teamMember: { stripe_account_id?: string | null; global_payouts_recipient_id?: string | null; name?: string | null } | null
  teamMemberName?: string | null
  clientName?: string | null
  /** True only for booking.team_member_id (the lead) — gates whether this
   *  call updates bookings.team_member_paid, a single-payee-per-booking flag
   *  that predates multi-cleaner support and other systems (the Global
   *  Payouts eligibility batch) still read as "the lead is settled". Extras
   *  must NOT set it — their own settled state lives only in
   *  team_member_payouts, keyed by team_member_id. */
  isLead?: boolean
}

export async function payCleanerAtCheckout(opts: PayCleanerAtCheckoutOpts): Promise<void> {
  const { tenantId, bookingId, teamMemberId, teamMemberPayCents, teamMember, isLead } = opts
  const teamMemberName = opts.teamMemberName || teamMember?.name || 'the cleaner'
  const clientName = opts.clientName || 'the client'
  if (
    !teamMemberId ||
    !teamMemberPayCents ||
    teamMemberPayCents <= 0 ||
    !(teamMember?.global_payouts_recipient_id || teamMember?.stripe_account_id) ||
    (await cleanerAlreadyPaid(tenantId, bookingId, teamMemberId))
  ) {
    return
  }

  // Tip is booking-level (the client tips the job, not a specific crew
  // member) — split isn't modeled, so it rides entirely on whichever payout
  // fires here. In practice that's the lead: extras race the lead's own
  // claim-before-transfer and lose if the lead already claimed first, which
  // keeps a booking's tip from being paid out twice across two people.
  const tipCents = isLead ? await tipCentsForBooking(tenantId, bookingId) : 0
  const totalCents = teamMemberPayCents + tipCents

  const { data: tenantRow } = await supabaseAdmin
    .from('tenants')
    .select('stripe_api_key, telegram_bot_token, telegram_chat_id')
    .eq('id', tenantId)
    .single()
  const stripeKey = tenantRow?.stripe_api_key ? decryptSecret(tenantRow.stripe_api_key as string) : process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return

  const telegramConfig = { telegram_bot_token: tenantRow?.telegram_bot_token as string | null, telegram_chat_id: tenantRow?.telegram_chat_id as string | null }

  // Confirmation posted to the tenant's own Telegram (per-tenant chat/bot,
  // same mechanism global-payouts' batch run already uses) — Jeff wants a
  // "payment sent" confirmation for every checkout-triggered payout,
  // platform-wide, not just NYC Maid (2026-08-07).
  const notifyPaid = (amountCents: number) => {
    const tipNote = tipCents > 0 ? ` (includes $${(tipCents / 100).toFixed(2)} tip)` : ''
    sendTenantTelegram(
      tenantId, telegramConfig,
      `✅ Paid ${teamMemberName} $${(amountCents / 100).toFixed(2)} for ${clientName}'s job (checkout)${tipNote}.`,
    ).catch((err) => console.error('checkout payout Telegram confirm failed:', err))
  }
  // Failure alert goes to BOTH SMS (reaches a phone with no app open) and
  // the tenant's Telegram (Jeff, 2026-08-07: wants payout errors visible in
  // NYC Maid's Telegram, not just SMS).
  const notifyFailed = (reason: string) => {
    const message = `Cleaner payout FAILED at checkout for booking ${bookingId} (${teamMemberName}) — pay manually. ${reason}`
    smsAdmins(tenantId, message).catch((err) => console.error('checkout payout SMS alert failed:', err))
    sendTenantTelegram(tenantId, telegramConfig, `⚠️ ${message}`).catch((err) => console.error('checkout payout Telegram alert failed:', err))
  }

  if (teamMember?.global_payouts_recipient_id) {
    const claim = await claimGlobalPayout({ tenantId, bookingId, teamMemberId, amountCents: teamMemberPayCents, tipCents })
    if (!claim.claimed || !claim.payoutId) return
    try {
      const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION })
      const financialAccount = await getStorageFinancialAccount(stripeKey)
      if (!financialAccount) throw new Error('No Global Payouts Financial Account configured')
      await ensureFinancialAccountFunded(stripe, stripeKey, financialAccount.id, totalCents, `checkout-topup:${bookingId}:${teamMemberId}`)
      const outbound = await createOutboundPayment(stripeKey, {
        financialAccountId: financialAccount.id,
        recipientId: teamMember.global_payouts_recipient_id,
        amountCents: totalCents,
        description: `Checkout payout for booking ${bookingId}`,
        idempotencyKey: `checkout-gp-payout:${bookingId}:${teamMemberId}`,
      })
      await finalizeGlobalPayout({
        tenantId, payoutId: claim.payoutId, amountCents: teamMemberPayCents, tipCents,
        stripeOutboundPaymentId: outbound.id,
      })
      postPayoutToLedger({ tenantId, payoutId: claim.payoutId }).catch((err) => console.error('checkout payout ledger post failed:', err))
      if (isLead) {
        await tenantDb(tenantId).from('bookings').update({ team_member_paid: true, team_member_paid_at: new Date().toISOString() }).eq('id', bookingId).then(() => {}, () => {})
      }
      notifyPaid(totalCents)
    } catch (payErr) {
      // Best-effort cleanup: release the claim so it doesn't stay stuck
      // blocking this payout forever. If the release itself fails, that
      // failure used to be swallowed silently with no trace — track it so
      // a stuck claim is discoverable instead of invisible.
      await releaseCleanerPayout(tenantId, claim.payoutId).catch((releaseErr) => {
        trackError(releaseErr, {
          source: 'finance/checkout-payout:release-after-global-payout-failure',
          tenantId,
          severity: 'high',
          extra: `bookingId=${bookingId}; teamMemberId=${teamMemberId}; payoutId=${claim.payoutId}; originalError=${payErr instanceof Error ? payErr.message : String(payErr)}`,
        }).catch(() => {})
      })
      console.error('checkout Global Payouts payout failed:', payErr)
      notifyFailed(payErr instanceof Error ? payErr.message : String(payErr))
    }
    return
  }

  if (teamMember?.stripe_account_id) {
    const claim = await claimCleanerPayout({ tenantId, bookingId, teamMemberId, amountCents: teamMemberPayCents, tipCents })
    if (!claim.claimed || !claim.payoutId) return
    try {
      const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION })
      const transfer = await stripe.transfers.create({
        amount: totalCents,
        currency: 'usd',
        destination: teamMember.stripe_account_id,
        description: `Checkout payout for booking ${bookingId}`,
        metadata: { booking_id: bookingId, tenant_id: tenantId, team_member_id: teamMemberId },
      }, { idempotencyKey: `checkout-payout:${bookingId}:${teamMemberId}` })

      let instantPayoutId: string | null = null
      let isInstant = false
      try {
        const payout = await stripe.payouts.create(
          { amount: totalCents, currency: 'usd', method: 'instant' },
          { stripeAccount: teamMember.stripe_account_id, idempotencyKey: `checkout-instant-payout:${bookingId}:${teamMemberId}` },
        )
        instantPayoutId = payout.id
        isInstant = true
      } catch {
        // standard schedule fallback — Stripe will pay on default cadence
      }

      await finalizeCleanerPayout({
        tenantId, payoutId: claim.payoutId, amountCents: teamMemberPayCents, tipCents,
        stripeTransferId: transfer.id, stripePayoutId: instantPayoutId, instant: isInstant,
      })
      postPayoutToLedger({ tenantId, payoutId: claim.payoutId }).catch((err) => console.error('checkout payout ledger post failed:', err))
      if (isLead) {
        await tenantDb(tenantId).from('bookings').update({ team_member_paid: true, team_member_paid_at: new Date().toISOString() }).eq('id', bookingId).then(() => {}, () => {})
      }
      notifyPaid(totalCents)
    } catch (transferErr) {
      // Best-effort cleanup: release the claim so it doesn't stay stuck
      // blocking this payout forever. If the release itself fails, that
      // failure used to be swallowed silently with no trace — track it so
      // a stuck claim is discoverable instead of invisible.
      await releaseCleanerPayout(tenantId, claim.payoutId).catch((releaseErr) => {
        trackError(releaseErr, {
          source: 'finance/checkout-payout:release-after-cleaner-payout-failure',
          tenantId,
          severity: 'high',
          extra: `bookingId=${bookingId}; teamMemberId=${teamMemberId}; payoutId=${claim.payoutId}; originalError=${transferErr instanceof Error ? transferErr.message : String(transferErr)}`,
        }).catch(() => {})
      })
      console.error('checkout cleaner payout failed:', transferErr)
      notifyFailed(transferErr instanceof Error ? transferErr.message : String(transferErr))
    }
  }
}

export interface PayExtraCrewAtCheckoutOpts {
  tenantId: string
  bookingId: string
  leadTeamMemberId: string | null
  checkInIso: string
  checkOutIso: string
  hourlyRate: number | null
  discountPercent: number | null
  oneTimeCreditCents: number | null
  recurringType: string | null
  maxHours: number | null
  teamSize: number | null
  clientAddress: string | null
  clientName?: string | null
}

/**
 * Pays every crew member on a multi-cleaner job OTHER than the lead — the
 * lead is paid by the caller's own direct payCleanerAtCheckout({isLead:
 * true}) call, same as always. Each extra gets THEIR OWN rate × the same
 * hours the lead was paid for (Jeff's call, 2026-08-04, ported from the
 * Global Payouts batch system's gatherGlobalPayoutsEligibility — this is the
 * instant-checkout counterpart of that same rule, computed via
 * computeCheckoutPricing instead of backing hours out of the lead's cents,
 * since the real inputs are on hand here).
 *
 * Added 2026-08-07 after a 2-person job paid only the lead (Cinthya) and
 * left the extra (Karina) with $0 — booking_team_members extras never had
 * their own payout wired into the checkout-triggered payment path before.
 */
export async function payExtraCrewAtCheckout(opts: PayExtraCrewAtCheckoutOpts): Promise<void> {
  const { data: extras } = await supabaseAdmin
    .from('booking_team_members')
    .select('team_member_id, team_members(id, name, pay_rate, hourly_rate, stripe_account_id, global_payouts_recipient_id)')
    .eq('tenant_id', opts.tenantId)
    .eq('booking_id', opts.bookingId)
    .eq('is_lead', false)

  for (const extra of extras || []) {
    if (!extra.team_member_id || extra.team_member_id === opts.leadTeamMemberId) continue
    const tm = extra.team_members as unknown as {
      id: string; name: string | null; pay_rate: number | null; hourly_rate: number | null
      stripe_account_id: string | null; global_payouts_recipient_id: string | null
    } | null
    if (!tm) continue

    const baseRate = tm.pay_rate || tm.hourly_rate || 25
    const cleanerRate = isNycMaid(opts.tenantId) ? effectiveCleanerRate(baseRate, opts.clientAddress) : baseRate
    const pricing = computeCheckoutPricing({
      checkInIso: opts.checkInIso,
      checkOutIso: opts.checkOutIso,
      hourlyRate: opts.hourlyRate,
      cleanerHourlyRate: cleanerRate,
      discountPercent: opts.discountPercent,
      oneTimeCreditCents: opts.oneTimeCreditCents,
      recurringType: opts.recurringType,
      maxHours: opts.maxHours,
      teamSize: opts.teamSize,
    })

    await payCleanerAtCheckout({
      tenantId: opts.tenantId,
      bookingId: opts.bookingId,
      teamMemberId: tm.id,
      teamMemberPayCents: pricing.cleanerPayCents,
      teamMember: { stripe_account_id: tm.stripe_account_id, global_payouts_recipient_id: tm.global_payouts_recipient_id, name: tm.name },
      clientName: opts.clientName,
      isLead: false,
    }).catch((err) => console.error(`checkout extra-crew payout failed for ${tm.name}:`, err))
  }
}
