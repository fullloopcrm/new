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
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { postJournalEntry } from '@/lib/ledger'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json()
    const targetType = String(body.target_type || '')
    const targetId = String(body.target_id || '')
    if (!targetType || !targetId) return NextResponse.json({ error: 'target_type + target_id required' }, { status: 400 })

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
    const updates: Record<string, unknown> = {}

    if (targetType === 'invoice') {
      if (!isInflow) return NextResponse.json({ error: 'Only inflows can match invoices' }, { status: 400 })

      const { data: inv } = await supabaseAdmin
        .from('invoices')
        .select('id, total_cents, amount_paid_cents, status, client_id, booking_id')
        .eq('tenant_id', tenantId)
        .eq('id', targetId)
        .single()
      if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

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
      if (pErr) throw pErr

      updates.matched_invoice_id = inv.id
      updates.status = 'matched'
    } else if (targetType === 'booking') {
      if (!isInflow) return NextResponse.json({ error: 'Only inflows match bookings' }, { status: 400 })

      const { data: b } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id')
        .eq('tenant_id', tenantId)
        .eq('id', targetId)
        .single()
      if (!b) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

      // Insert payment tied to booking (no invoice). Bumps booking payment status.
      await supabaseAdmin.from('payments').insert({
        tenant_id: tenantId,
        booking_id: b.id,
        client_id: b.client_id,
        amount_cents: txn.amount_cents,
        method: 'bank_match',
        status: 'succeeded',
        received_at: txn.txn_date,
      })
      await supabaseAdmin
        .from('bookings')
        .update({ payment_status: 'paid', payment_method: 'bank_match', payment_date: txn.txn_date })
        .eq('id', b.id)
        .eq('tenant_id', tenantId)

      updates.matched_booking_id = b.id
      updates.status = 'matched'
    } else if (targetType === 'expense') {
      if (isInflow) return NextResponse.json({ error: 'Only outflows match expenses' }, { status: 400 })

      const { data: ex } = await supabaseAdmin
        .from('expenses')
        .select('id, category, amount')
        .eq('tenant_id', tenantId)
        .eq('id', targetId)
        .single()
      if (!ex) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })

      await supabaseAdmin
        .from('expenses')
        .update({ matched_bank_transaction_id: txn.id })
        .eq('id', ex.id)

      // Optionally post a journal entry against bank + an operating-expense CoA,
      // based on the expense's category. Find a matching CoA by subtype or name.
      const bankCoa = (txn.bank_accounts as { coa_id?: string } | null)?.coa_id
      if (bankCoa) {
        const { data: coaMatch } = await supabaseAdmin
          .from('chart_of_accounts')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('type', 'expense')
          .or(`subtype.eq.${ex.category},name.ilike.%${ex.category}%`)
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

    const { error } = await supabaseAdmin
      .from('bank_transactions')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/bank-transactions/[id]/match', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
