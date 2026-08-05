/**
 * Runs a Global Payouts batch: everyone owed money (lead AND multi-cleaner
 * extras — see global-payouts-eligibility.ts) through a Global Payouts
 * recipient gets paid, funded automatically from the platform's available
 * Stripe balance.
 *
 * Guardrails (Jeff, 08-04): a $2,500 total-per-run cap, a $450 per-person
 * hold-for-review threshold, and a 5-minute cooldown between runs. Anything
 * held doesn't move money — it texts an admin, who replies "YES <code>" to
 * approve then "GO <code>" to actually send it (handled in
 * webhooks/telnyx/route.ts). Groups under both thresholds pay immediately.
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { decryptSecret } from '@/lib/secret-crypto'
import { gatherGlobalPayoutsEligibility } from '@/lib/finance/global-payouts-eligibility'
import { getStorageFinancialAccount, ensureFinancialAccountFunded, executeGroups } from '@/lib/finance/global-payouts'
import { RUN_CAP_CENTS, INDIVIDUAL_HOLD_CENTS, checkCooldown, logRun, createHoldAndNotify } from '@/lib/finance/global-payouts-guardrails'

function getStripe(key: string | null | undefined): Stripe {
  const apiKey = key ? decryptSecret(key) : process.env.STRIPE_SECRET_KEY
  if (!apiKey) throw new Error('Stripe not configured')
  return new Stripe(apiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

export async function POST() {
  const { tenant: authTenant, error: authError } = await requirePermission('finance.payroll')
  if (authError) return authError
  const tenantId = authTenant.tenantId

  const cooldown = await checkCooldown(tenantId)
  if (cooldown.onCooldown) {
    return NextResponse.json({ error: `On cooldown — try again in ${cooldown.secondsRemaining}s` }, { status: 429 })
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, stripe_api_key, telnyx_api_key, telnyx_phone, sms_from_number, telegram_bot_token, telegram_chat_id')
    .eq('id', tenantId)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const apiKey = tenant.stripe_api_key ? decryptSecret(tenant.stripe_api_key as string) : process.env.STRIPE_SECRET_KEY
  if (!apiKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })
  const stripe = getStripe(tenant.stripe_api_key as string | null)

  const financialAccount = await getStorageFinancialAccount(apiKey)
  if (!financialAccount) {
    return NextResponse.json({ error: 'No Global Payouts Financial Account found for this Stripe account' }, { status: 400 })
  }

  const groups = await gatherGlobalPayoutsEligibility(tenantId)
  if (groups.length === 0) {
    await logRun({ tenantId, totalCents: 0, paidCount: 0, heldCount: 0 })
    return NextResponse.json({ paid: [], skipped: [], held: [], message: 'Nothing owed to any Global Payouts recipient' })
  }

  const runTotalCents = groups.reduce((s, g) => s + g.totalCents, 0)

  // Run-cap breach: hold EVERYTHING in this run for one combined approval
  // rather than a flood of individual texts — the admin sees one summary.
  if (runTotalCents > RUN_CAP_CENTS) {
    const held: { teamMemberName: string; code: string; amountCents: number }[] = []
    for (const group of groups) {
      const code = await createHoldAndNotify({
        tenantId,
        kind: 'run_cap',
        group,
        reason: `run total $${(runTotalCents / 100).toFixed(2)} exceeds the $${(RUN_CAP_CENTS / 100).toFixed(2)} cap`,
      })
      held.push({ teamMemberName: group.name, code, amountCents: group.totalCents })
    }
    await logRun({ tenantId, totalCents: runTotalCents, paidCount: 0, heldCount: held.length })
    return NextResponse.json({ paid: [], skipped: [], held, message: 'Run total exceeds cap — everything held for approval' })
  }

  // Otherwise, hold only the individuals over the per-person threshold; pay everyone else.
  const toPay = groups.filter(g => g.totalCents <= INDIVIDUAL_HOLD_CENTS)
  const toHold = groups.filter(g => g.totalCents > INDIVIDUAL_HOLD_CENTS)

  const held: { teamMemberName: string; code: string; amountCents: number }[] = []
  for (const group of toHold) {
    const code = await createHoldAndNotify({
      tenantId,
      kind: 'individual',
      group,
      reason: `$${(group.totalCents / 100).toFixed(2)} exceeds the $${(INDIVIDUAL_HOLD_CENTS / 100).toFixed(2)} per-person review threshold`,
    })
    held.push({ teamMemberName: group.name, code, amountCents: group.totalCents })
  }

  const toPayTotalCents = toPay.reduce((s, g) => s + g.totalCents, 0)
  const funding = toPayTotalCents > 0
    ? await ensureFinancialAccountFunded(
        stripe, apiKey, financialAccount.id, toPayTotalCents,
        `gp-topup:${tenantId}:${new Date().toISOString().slice(0, 10)}:${toPayTotalCents}`,
      )
    : { toppedUpCents: 0, stripeTopUpId: null }

  const { paid, skipped } = toPay.length > 0
    ? await executeGroups(tenantId, stripe, apiKey, financialAccount.id, toPay, {
        telnyxApiKey: (tenant.telnyx_api_key as string | null) || null,
        telnyxPhone: (tenant.telnyx_phone as string | null) || null,
        smsFromNumber: (tenant.sms_from_number as string | null) || null,
        telegramBotToken: (tenant.telegram_bot_token as string | null) || null,
        telegramChatId: (tenant.telegram_chat_id as string | null) || null,
      })
    : { paid: [], skipped: [] }

  await logRun({ tenantId, totalCents: runTotalCents, paidCount: paid.length, heldCount: held.length })

  return NextResponse.json({
    financialAccountId: financialAccount.id,
    toppedUpCents: funding.toppedUpCents,
    runTotalCents,
    paid,
    skipped,
    held,
  })
}
