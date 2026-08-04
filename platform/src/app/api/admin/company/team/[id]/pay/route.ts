/**
 * Pay a Full Loop team member — a real Stripe Connect transfer, under the
 * platform's own STRIPE_SECRET_KEY, to their connected Express account.
 * Transfer happens FIRST; the ledger expense row is only written on confirmed
 * success, so a failed transfer never gets recorded as money that moved
 * (same "don't mark paid without funds sent" principle as
 * referral-commissions' payout, simplified here since this is a single
 * admin-triggered action, not a concurrent webhook race).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await ctx.params
  const payload = await req.json().catch(() => null) as { amount_cents?: number; description?: string } | null
  const amountCents = payload?.amount_cents

  if (!Number.isInteger(amountCents) || (amountCents as number) <= 0) {
    return NextResponse.json({ error: 'amount_cents must be a positive integer' }, { status: 400 })
  }

  const { data: member } = await supabaseAdmin
    .from('platform_team_members')
    .select('id, name, stripe_account_id, hr_status')
    .eq('id', id)
    .single()

  if (!member) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
  if (!member.stripe_account_id) return NextResponse.json({ error: 'Payouts not connected for this person' }, { status: 400 })
  if (member.hr_status !== 'active') return NextResponse.json({ error: `Cannot pay — status is ${member.hr_status}` }, { status: 400 })

  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })
  const stripe = new Stripe(apiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })

  const idempotencyKey = `platform-payroll:${id}:${Date.now()}`
  let transfer: Stripe.Transfer
  try {
    transfer = await stripe.transfers.create({
      amount: amountCents as number,
      currency: 'usd',
      destination: member.stripe_account_id,
      description: payload?.description?.trim() || `Payroll — ${member.name}`,
      metadata: { platform_team_member_id: id },
    }, { idempotencyKey })
  } catch (e) {
    console.error('[company-team-pay] transfer failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Transfer failed' }, { status: 502 })
  }

  const { data: ledgerEntry, error: ledgerError } = await supabaseAdmin
    .from('platform_finance_transactions')
    .insert({
      type: 'expense',
      category: 'contractor_payroll',
      amount_cents: amountCents,
      occurred_on: new Date().toISOString().slice(0, 10),
      description: payload?.description?.trim() || `Payroll — ${member.name}`,
      source: 'stripe_transfer',
    })
    .select()
    .single()

  if (ledgerError) {
    // The transfer already succeeded — money moved. Surface this loudly:
    // the ledger entry failing to write is a bookkeeping gap, not a payment
    // failure, and must not look like nothing happened.
    console.error(`[company-team-pay] transfer ${transfer.id} succeeded but ledger insert failed:`, ledgerError)
    return NextResponse.json({
      warning: 'Payment sent successfully, but failed to log it in the ledger — record it manually.',
      transfer_id: transfer.id,
      error: ledgerError.message,
    }, { status: 207 })
  }

  return NextResponse.json({ transfer_id: transfer.id, ledger_entry: ledgerEntry })
}
