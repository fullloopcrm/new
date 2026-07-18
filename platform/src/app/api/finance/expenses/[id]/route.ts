import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { pick } from '@/lib/validate'

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
    const fields = pick(body, ['category', 'subcategory', 'amount', 'description', 'receipt_url', 'date', 'vendor_name', 'payment_method', 'tax_deductible', 'entity_id'])

    if (fields.amount) fields.amount = Math.round(Number(fields.amount) * 100)

    // Caller-supplied FK — verify it belongs to this tenant before update, so a
    // foreign id can't repoint the expense at another tenant's accounting entity.
    if (fields.entity_id) {
      const { data: owned } = await supabaseAdmin
        .from('entities')
        .select('id')
        .eq('id', fields.entity_id as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!owned) return NextResponse.json({ error: 'Invalid entity_id' }, { status: 404 })
    }

    // Mirror the DELETE guard: matched_bank_transaction_id is only set by the
    // bank-transaction match route, which posts a real journal entry and is
    // what tax-export/year-end-zip read off this row directly. Without this,
    // any finance.expenses caller could silently rewrite amount/category/date
    // on an already-reconciled expense, diverging the tax record from what
    // was actually matched with no trace and no unmatch endpoint to fix it.
    const { data: reconciled } = await supabaseAdmin
      .from('expenses')
      .select('matched_bank_transaction_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (reconciled?.matched_bank_transaction_id) {
      return NextResponse.json(
        { error: 'This expense is reconciled to a bank transaction and already posted to the ledger — it cannot be edited.' },
        { status: 409 }
      )
    }

    // Atomic claim: re-check matched_bank_transaction_id is still null in the
    // UPDATE's own WHERE clause, closing the race window between the guard
    // read above and this write -- a match landing in that window must not
    // let a stale edit through underneath it.
    const { data, error } = await supabaseAdmin
      .from('expenses')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('matched_bank_transaction_id', null)
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

    // matched_bank_transaction_id is only ever set by the bank-transaction
    // match route (POST /api/finance/bank-transactions/[id]/match), which
    // also posts a real journal entry for the cash outflow. There's no
    // unmatch endpoint, no status/void field on this table, and tax-export
    // + year-end-zip read this table directly (not journal_lines) — so
    // hard-deleting a reconciled expense would silently orphan the bank
    // transaction's matched_expense_id (ON DELETE SET NULL) and drop the
    // vendor/receipt/category record backing an already-posted ledger entry
    // out of tax reporting, with no way to reattach it.
    const { data: existing } = await supabaseAdmin
      .from('expenses')
      .select('id, matched_bank_transaction_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (existing.matched_bank_transaction_id) {
      return NextResponse.json(
        { error: 'This expense is reconciled to a bank transaction and already posted to the ledger — it cannot be deleted.' },
        { status: 409 }
      )
    }

    const { error } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'expense.deleted', entityType: 'expense', entityId: id })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
