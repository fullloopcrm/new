/**
 * Match a bank transaction to an invoice / booking / expense.
 * - Inflow -> invoice: inserts a payments row with invoice_id;
 *   DB trigger marks the invoice paid automatically.
 * - Outflow -> expense: links the expense; bank_txn status=matched.
 * - Either way the bank transaction transitions to 'matched' + becomes
 *   unavailable to other matches.
 *
 * Atomic claim: the status transition to 'matched' is guarded by the
 * 'pending' status this request actually read (compare-and-swap), done
 * BEFORE any side effect (payment insert / journal post) -- same pattern as
 * the sibling categorize route (../route.ts). Without this, two concurrent
 * match requests on the same txn (double-click, or two different suggested
 * targets) would both pass a plain read-then-check and each insert a real
 * payments row / post a real journal entry for one bank inflow. If a
 * downstream step fails after the claim (target not found, insert error),
 * the claim is released back to 'pending' so the txn isn't stuck falsely
 * "matched" with nothing actually recorded.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { postJournalEntry } from '@/lib/ledger'
import { sanitizePostgrestValue } from '@/lib/postgrest-safe'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const { id } = await params
  let claimField: 'matched_invoice_id' | 'matched_booking_id' | 'matched_expense_id' | null = null
  let claimed = false

  async function releaseClaim() {
    if (!claimed || !claimField) return
    await supabaseAdmin
      .from('bank_transactions')
      .update({ status: 'pending', [claimField]: null })
      .eq('id', id)
    claimed = false
  }

  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const body = await request.json()
    const targetType = String(body.target_type || '')
    const targetId = String(body.target_id || '')
    if (!targetType || !targetId) return NextResponse.json({ error: 'target_type + target_id required' }, { status: 400 })
    if (!['invoice', 'booking', 'expense'].includes(targetType)) {
      return NextResponse.json({ error: `Unknown target_type: ${targetType}` }, { status: 400 })
    }

    const { data: txn } = await supabaseAdmin
      .from('bank_transactions')
      .select('id, tenant_id, txn_date, description, amount_cents, status, bank_account_id, bank_accounts(coa_id)')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    if (txn.status === 'matched' || txn.status === 'posted') {
      return NextResponse.json({ error: `Already ${txn.status}` }, { status: 400 })
    }

    const isInflow = txn.amount_cents > 0
    if ((targetType === 'invoice' || targetType === 'booking') && !isInflow) {
      return NextResponse.json({ error: `Only inflows can match ${targetType}s` }, { status: 400 })
    }
    if (targetType === 'expense' && isInflow) {
      return NextResponse.json({ error: 'Only outflows can match expenses' }, { status: 400 })
    }

    claimField = targetType === 'invoice' ? 'matched_invoice_id' : targetType === 'booking' ? 'matched_booking_id' : 'matched_expense_id'
    const { data: claim } = await supabaseAdmin
      .from('bank_transactions')
      .update({ status: 'matched', [claimField]: targetId })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()
    if (!claim) {
      return NextResponse.json({ error: 'Already matched' }, { status: 409 })
    }
    claimed = true

    if (targetType === 'invoice') {
      const { data: inv } = await supabaseAdmin
        .from('invoices')
        .select('id, total_cents, amount_paid_cents, status, client_id, booking_id')
        .eq('tenant_id', tenantId)
        .eq('id', targetId)
        .single()
      if (!inv) {
        await releaseClaim()
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }

      // Insert payment; DB trigger updates invoice.amount_paid_cents + status.
      const { error: pErr } = await supabaseAdmin.from('payments').insert({
        tenant_id: tenantId,
        invoice_id: inv.id,
        booking_id: inv.booking_id,
        client_id: inv.client_id,
        amount_cents: txn.amount_cents,
        method: 'bank_match',
        status: 'succeeded',
        received_at: txn.txn_date,
      })
      if (pErr) { await releaseClaim(); throw pErr }
    } else if (targetType === 'booking') {
      const { data: b } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id')
        .eq('tenant_id', tenantId)
        .eq('id', targetId)
        .single()
      if (!b) {
        await releaseClaim()
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }

      // Insert payment tied to booking (no invoice). Bumps booking payment status.
      const { error: pErr } = await supabaseAdmin.from('payments').insert({
        tenant_id: tenantId,
        booking_id: b.id,
        client_id: b.client_id,
        amount_cents: txn.amount_cents,
        method: 'bank_match',
        status: 'succeeded',
        received_at: txn.txn_date,
      })
      if (pErr) { await releaseClaim(); throw pErr }
      await supabaseAdmin
        .from('bookings')
        .update({ payment_status: 'paid', payment_method: 'bank_match', payment_date: txn.txn_date })
        .eq('id', b.id)
        .eq('tenant_id', tenantId)
    } else {
      const { data: ex } = await supabaseAdmin
        .from('expenses')
        .select('id, category, amount')
        .eq('tenant_id', tenantId)
        .eq('id', targetId)
        .single()
      if (!ex) {
        await releaseClaim()
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
      }

      await supabaseAdmin
        .from('expenses')
        .update({ matched_bank_transaction_id: txn.id })
        .eq('id', ex.id)

      // Optionally post a journal entry against bank + an operating-expense CoA,
      // based on the expense's category. Find a matching CoA by subtype or name.
      // The claim above already reserved 'matched'; this second update only
      // upgrades to 'posted' + attaches coa/journal fields -- no other request
      // can race it since the claim already closed the pending window.
      const bankCoa = (txn.bank_accounts as { coa_id?: string } | null)?.coa_id
      if (bankCoa) {
        const safeCategory = sanitizePostgrestValue(ex.category)
        const { data: coaMatch } = await supabaseAdmin
          .from('chart_of_accounts')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('type', 'expense')
          .or(`subtype.eq.${safeCategory},name.ilike.%${safeCategory}%`)
          .limit(1)
          .maybeSingle()
        if (coaMatch) {
          const entryId = await postJournalEntry({
            tenant_id: tenantId,
            entry_date: txn.txn_date,
            memo: `${txn.description} (matched to expense ${ex.id})`,
            source: 'bank_txn',
            source_id: txn.id,
            lines: [
              { coa_id: coaMatch.id, debit_cents: Math.abs(txn.amount_cents) },
              { coa_id: bankCoa, credit_cents: Math.abs(txn.amount_cents) },
            ],
          })
          await supabaseAdmin
            .from('bank_transactions')
            .update({ coa_id: coaMatch.id, journal_entry_id: entryId, status: 'posted' })
            .eq('id', id)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/bank-transactions/[id]/match', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
