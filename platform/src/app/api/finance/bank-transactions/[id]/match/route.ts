/**
 * Match a bank transaction to an invoice / booking / expense.
 * - Inflow → invoice: inserts a payments row with invoice_id;
 *   DB trigger marks the invoice paid automatically.
 * - Outflow → expense: links the expense; bank_txn status=matched.
 * - Either way the bank transaction transitions to 'matched' + becomes
 *   unavailable to other matches.
 *
 * Idempotent at the bank_txn level (re-matching same target is a no-op).
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { sanitizePostgrestValue } from '@/lib/postgrest-safe'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { postJournalEntry } from '@/lib/ledger'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json()
    const targetType = String(body.target_type || '')
    const targetId = String(body.target_id || '')
    if (!targetType || !targetId) return NextResponse.json({ error: 'target_type + target_id required' }, { status: 400 })

    const { data: txn } = await tenantDb(tenantId)
      .from('bank_transactions')
      .select('id, tenant_id, txn_date, description, amount_cents, status, bank_account_id, bank_accounts(coa_id)')
      .eq('id', id)
      .single()
    if (!txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    if (txn.status === 'matched' || txn.status === 'posted') {
      return NextResponse.json({ error: `Already ${txn.status}` }, { status: 400 })
    }

    const isInflow = txn.amount_cents > 0
    const updates: Record<string, unknown> = {}

    if (targetType === 'invoice') {
      if (!isInflow) return NextResponse.json({ error: 'Only inflows can match invoices' }, { status: 400 })

      const { data: inv } = await tenantDb(tenantId)
        .from('invoices')
        .select('id, total_cents, amount_paid_cents, status, client_id, booking_id')
        .eq('id', targetId)
        .single()
      if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

      // Duplicate-match guard: the txn.status check above is read-then-write
      // with no re-check on the way out -- a double-tapped Match button, or
      // two staff matching the same bank row before either commits, both pass
      // it and land two payments rows for one bank inflow. Same money-race
      // class as record-payment/confirm-match. A bank_txn represents ONE
      // inflow event (unlike invoices, which legitimately take multiple
      // distinct payments over time), so a STATIC reference_id keyed on the
      // bank_txn id is safe here -- this txn should never match twice.
      const referenceId = `bank-txn-match-${txn.id}`
      const { data: existingPayment } = await tenantDb(tenantId)
        .from('payments')
        .select('id')
        .eq('reference_id', referenceId)
        .maybeSingle()
      if (existingPayment) return NextResponse.json({ ok: true, deduped: true })

      // Insert payment; DB trigger updates invoice.amount_paid_cents + status.
      const { error: pErr } = await tenantDb(tenantId).from('payments').insert({
        invoice_id: inv.id,
        booking_id: inv.booking_id,
        client_id: inv.client_id,
        amount_cents: txn.amount_cents,
        method: 'bank_match',
        status: 'succeeded',
        received_at: txn.txn_date,
        reference_id: referenceId,
      })
      // Layer-2 backstop: a truly concurrent re-match slipped past the
      // layer-1 SELECT above and hit migration 065_unique_payments_reference's
      // partial unique index on payments(tenant_id, booking_id, reference_id)
      // instead. CAVEAT: invoices with a NULL booking_id (no linked booking)
      // get layer-1 protection only -- same gap already flagged/accepted in
      // record-payment's fix; a plain UNIQUE index never matches two NULLs.
      if (pErr?.code === '23505') return NextResponse.json({ ok: true, deduped: true })
      if (pErr) throw pErr

      updates.matched_invoice_id = inv.id
      updates.status = 'matched'
    } else if (targetType === 'booking') {
      if (!isInflow) return NextResponse.json({ error: 'Only inflows match bookings' }, { status: 400 })

      const { data: b } = await tenantDb(tenantId)
        .from('bookings')
        .select('id, client_id')
        .eq('id', targetId)
        .single()
      if (!b) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

      // Same duplicate-match guard as the invoice branch above. booking_id is
      // always non-null here, so migration 065's unique index gives this
      // branch full DB-backstop coverage (no NULL-booking_id caveat).
      const referenceId = `bank-txn-match-${txn.id}`
      const { data: existingPayment } = await tenantDb(tenantId)
        .from('payments')
        .select('id')
        .eq('reference_id', referenceId)
        .maybeSingle()
      if (existingPayment) return NextResponse.json({ ok: true, deduped: true })

      // Insert payment tied to booking (no invoice). Bumps booking payment status.
      const { error: pErr } = await tenantDb(tenantId).from('payments').insert({
        booking_id: b.id,
        client_id: b.client_id,
        amount_cents: txn.amount_cents,
        method: 'bank_match',
        status: 'succeeded',
        received_at: txn.txn_date,
        reference_id: referenceId,
      })
      if (pErr?.code === '23505') return NextResponse.json({ ok: true, deduped: true })
      if (pErr) throw pErr

      await tenantDb(tenantId)
        .from('bookings')
        .update({ payment_status: 'paid', payment_method: 'bank_match', payment_date: txn.txn_date })
        .eq('id', b.id)

      updates.matched_booking_id = b.id
      updates.status = 'matched'
    } else if (targetType === 'expense') {
      if (isInflow) return NextResponse.json({ error: 'Only outflows match expenses' }, { status: 400 })

      const { data: ex } = await tenantDb(tenantId)
        .from('expenses')
        .select('id, category, amount')
        .eq('id', targetId)
        .single()
      if (!ex) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })

      await tenantDb(tenantId)
        .from('expenses')
        .update({ matched_bank_transaction_id: txn.id })
        .eq('id', ex.id)

      // Optionally post a journal entry against bank + an operating-expense CoA,
      // based on the expense's category. Find a matching CoA by subtype or name.
      const bankCoa = (txn.bank_accounts as { coa_id?: string } | null)?.coa_id
      if (bankCoa) {
        const cat = sanitizePostgrestValue(ex.category)
        const { data: coaMatch } = await tenantDb(tenantId)
          .from('chart_of_accounts')
          .select('id')
          .eq('type', 'expense')
          .or(`subtype.eq.${cat},name.ilike.%${cat}%`)
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
          updates.coa_id = coaMatch.id
          updates.journal_entry_id = entryId
          updates.status = 'posted'
        }
      }
      updates.matched_expense_id = ex.id
      if (!updates.status) updates.status = 'matched'
    } else {
      return NextResponse.json({ error: `Unknown target_type: ${targetType}` }, { status: 400 })
    }

    const { error } = await tenantDb(tenantId)
      .from('bank_transactions')
      .update(updates)
      .eq('id', id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/bank-transactions/[id]/match', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
