import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { reverseExpenseFromLedger } from '@/lib/finance/post-expense'
import { journalEntryExists } from '@/lib/ledger'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    for (const k of ['category', 'amount', 'description', 'receipt_url', 'date', 'entity_id']) {
      if (k in body) updates[k] = body[k]
    }
    if (updates.amount !== undefined) updates.amount = Math.round(Number(updates.amount) * 100)

    // An amount/category edit on an expense already posted to the ledger
    // (either at creation as source='expense', or later via bank-match as
    // source='bank_txn' -- see post-expense.ts reverseExpenseFromLedger) would
    // silently drift the books: the posted journal entry stays frozen at the
    // OLD amount/CoA forever, since a correct reverse-then-repost needs a
    // schema decision this route doesn't attempt (migration 061's
    // UNIQUE(tenant_id, source, source_id) allows only one 'expense' entry
    // ever). Block rather than corrupt; delete + recreate reverses cleanly.
    if (updates.amount !== undefined || updates.category !== undefined) {
      const postedAtCreation = await journalEntryExists(tenantId, 'expense', id)
      let postedViaBankMatch = false
      if (!postedAtCreation) {
        const { data: existing } = await supabaseAdmin
          .from('expenses')
          .select('matched_bank_transaction_id')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .maybeSingle()
        const matchedTxnId = existing?.matched_bank_transaction_id as string | undefined
        if (matchedTxnId) postedViaBankMatch = await journalEntryExists(tenantId, 'bank_txn', matchedTxnId)
      }
      if (postedAtCreation || postedViaBankMatch) {
        return NextResponse.json(
          { error: 'This expense has already been posted to the ledger. Editing amount or category would silently drift the books — delete this expense and create a new one instead.' },
          { status: 409 }
        )
      }
    }

    // Caller-supplied FK — verify it belongs to this tenant before update, so a
    // foreign id can't repoint the expense at another tenant's accounting entity.
    if (updates.entity_id) {
      const { data: owned } = await supabaseAdmin
        .from('entities')
        .select('id')
        .eq('id', updates.entity_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!owned) return NextResponse.json({ error: 'Invalid entity_id' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ expense: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params

    // Reverse any already-posted ledger entry BEFORE deleting the expense —
    // unlike an unposted expense (which backfillUnpostedExpenses can catch
    // later), there is no safety net that could ever find and fix a journal
    // entry orphaned by a deleted expense, so a failed reversal must block
    // the delete rather than silently leave a stale entry drifting the P&L.
    const reversal = await reverseExpenseFromLedger({ tenantId, expenseId: id })
    if (!reversal.posted && reversal.reason !== 'no_original_entry' && reversal.reason !== 'already_reversed') {
      return NextResponse.json({ error: `Failed to reverse ledger entry before delete: ${reversal.reason}` }, { status: 500 })
    }

    const { error } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'expense.deleted', entityType: 'expense', entityId: id, details: { ledger_reversed: reversal.posted } })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
