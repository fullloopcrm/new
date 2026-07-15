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
    if (targetType === 'invoice' && !isInflow) {
      return NextResponse.json({ error: 'Only inflows can match invoices' }, { status: 400 })
    }
    if (targetType === 'booking' && !isInflow) {
      return NextResponse.json({ error: 'Only inflows match bookings' }, { status: 400 })
    }
    if (targetType === 'expense' && isInflow) {
      return NextResponse.json({ error: 'Only outflows match expenses' }, { status: 400 })
    }
    if (!['invoice', 'booking', 'expense'].includes(targetType)) {
      return NextResponse.json({ error: `Unknown target_type: ${targetType}` }, { status: 400 })
    }

    // Atomic claim: only a txn NOT already matched/posted can proceed past
    // this point. Two concurrent match requests for the same bank_txn id
    // (e.g. a double-click, or two operators matching it to different
    // targets at once) used to both pass the plain status check above and
    // both insert a payment row before either write landed — the loser now
    // gets null back and backs off instead of double-crediting revenue.
    const originalStatus = txn.status as string
    const { data: claimed } = await tenantDb(tenantId)
      .from('bank_transactions')
      .update({ status: 'matched' })
      .eq('id', id)
      .neq('status', 'matched')
      .neq('status', 'posted')
      .select('id')
      .maybeSingle()
    if (!claimed) return NextResponse.json({ error: 'Already matched' }, { status: 400 })

    // Reverts the claim on a target-resolution failure (bad target_id) so the
    // txn isn't left stuck in 'matched' with no matched_*_id — this is a
    // client input error, not the race the claim above guards against.
    const revertClaim = () =>
      tenantDb(tenantId).from('bank_transactions').update({ status: originalStatus }).eq('id', id)

    const updates: Record<string, unknown> = {}

    if (targetType === 'invoice') {
      const { data: inv } = await tenantDb(tenantId)
        .from('invoices')
        .select('id, total_cents, amount_paid_cents, status, client_id, booking_id')
        .eq('id', targetId)
        .single()
      if (!inv) {
        await revertClaim()
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }

      // Insert payment; DB trigger updates invoice.amount_paid_cents + status.
      const { error: pErr } = await tenantDb(tenantId).from('payments').insert({
        invoice_id: inv.id,
        booking_id: inv.booking_id,
        client_id: inv.client_id,
        amount_cents: txn.amount_cents,
        method: 'bank_match',
        status: 'succeeded',
        received_at: txn.txn_date,
      })
      if (pErr) throw pErr

      updates.matched_invoice_id = inv.id
      updates.status = 'matched'
    } else if (targetType === 'booking') {
      const { data: b } = await tenantDb(tenantId)
        .from('bookings')
        .select('id, client_id')
        .eq('id', targetId)
        .single()
      if (!b) {
        await revertClaim()
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }

      // Insert payment tied to booking (no invoice). Bumps booking payment status.
      await tenantDb(tenantId).from('payments').insert({
        booking_id: b.id,
        client_id: b.client_id,
        amount_cents: txn.amount_cents,
        method: 'bank_match',
        status: 'succeeded',
        received_at: txn.txn_date,
      })
      await tenantDb(tenantId)
        .from('bookings')
        .update({ payment_status: 'paid', payment_method: 'bank_match', payment_date: txn.txn_date })
        .eq('id', b.id)

      updates.matched_booking_id = b.id
      updates.status = 'matched'
    } else if (targetType === 'expense') {
      const { data: ex } = await tenantDb(tenantId)
        .from('expenses')
        .select('id, category, amount')
        .eq('id', targetId)
        .single()
      if (!ex) {
        await revertClaim()
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
      }

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
