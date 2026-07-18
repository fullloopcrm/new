/**
 * Attach an uploaded receipt to a bank transaction. Optionally categorize
 * and post in one step.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { postJournalEntry, normalizeDescription } from '@/lib/ledger'

export async function POST(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const body = await request.json()
    const txnId = String(body.bank_transaction_id || '')
    const path = String(body.receipt_path || '')
    const extracted = body.extracted || null
    const coaId = body.coa_id ? String(body.coa_id) : null
    if (!txnId || !path) return NextResponse.json({ error: 'bank_transaction_id + receipt_path required' }, { status: 400 })

    // receipt_path is client-supplied and points into the shared 'receipts'
    // storage bucket (tenant-prefixed: tenants/<tenantId>/...). Without this
    // check a caller could attach another tenant's uploaded receipt path to
    // their own transaction — same class of gap as the coa_id check below.
    if (!path.startsWith(`tenants/${tenantId}/`)) {
      return NextResponse.json({ error: 'Invalid receipt_path' }, { status: 400 })
    }

    const { data: txn } = await supabaseAdmin
      .from('bank_transactions')
      .select('id, tenant_id, txn_date, description, amount_cents, status, bank_account_id, bank_accounts(coa_id)')
      .eq('tenant_id', tenantId)
      .eq('id', txnId)
      .single()
    if (!txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    const updates: Record<string, unknown> = {
      receipt_path: path,
      receipt_extracted: extracted,
    }

    // If a coa_id was also passed, post the journal and mark posted.
    if (coaId && txn.status === 'pending') {
      // Confirm coa_id belongs to this tenant — FK alone doesn't scope tenancy.
      const { data: coaRow } = await supabaseAdmin
        .from('chart_of_accounts')
        .select('id')
        .eq('id', coaId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!coaRow) return NextResponse.json({ error: 'Invalid coa_id' }, { status: 400 })

      const bankCoa = (txn.bank_accounts as { coa_id?: string } | null)?.coa_id
      if (!bankCoa) {
        return NextResponse.json({ error: 'Bank account has no CoA link.' }, { status: 400 })
      }
      const amount = Math.abs(txn.amount_cents)
      const isOutflow = txn.amount_cents < 0
      const lines = isOutflow
        ? [{ coa_id: coaId, debit_cents: amount }, { coa_id: bankCoa, credit_cents: amount }]
        : [{ coa_id: bankCoa, debit_cents: amount }, { coa_id: coaId, credit_cents: amount }]

      const entryId = await postJournalEntry({
        tenant_id: tenantId,
        entry_date: txn.txn_date,
        memo: txn.description,
        source: 'bank_txn',
        source_id: txn.id,
        lines,
      })
      // entryId === null means a concurrent request already posted this same
      // transaction — leave its coa_id/status/journal_entry_id alone, only
      // the receipt fields below still need to be saved.
      if (entryId !== null) {
        updates.coa_id = coaId
        updates.status = 'posted'
        updates.journal_entry_id = entryId
      }

      // Bump pattern. idx_categ_patterns_tenant_pattern uniquely constrains
      // (tenant_id, pattern) ONLY -- same class of bug fixed in the sibling
      // PATCH /api/finance/bank-transactions/[id] (662853c5): filtering the
      // existence check on coa_id too means recategorizing an
      // already-learned pattern to a DIFFERENT coa_id (an operator's manual
      // correction, made right here while attaching a receipt) never matches
      // the existing row, falls into the insert branch, and 23505s on the
      // 2-column unique index -- silently, since this call never captured
      // the write's error either. Look up by (tenant_id, pattern) only; same
      // coa_id reaffirms (increment hit_count), a different coa_id corrects
      // it (overwrite coa_id, reset hit_count to 1).
      const pattern = normalizeDescription(txn.description).slice(0, 64)
      if (pattern) {
        const { data: existing } = await supabaseAdmin
          .from('categorization_patterns')
          .select('id, coa_id, hit_count')
          .eq('tenant_id', tenantId)
          .eq('pattern', pattern)
          .maybeSingle()
        const { error: patternErr } = existing
          ? await supabaseAdmin
              .from('categorization_patterns')
              .update(
                existing.coa_id === coaId
                  ? { hit_count: (existing.hit_count || 0) + 1, last_used_at: new Date().toISOString() }
                  : { coa_id: coaId, hit_count: 1, last_used_at: new Date().toISOString() },
              )
              .eq('id', existing.id)
          : await supabaseAdmin.from('categorization_patterns').insert({
              tenant_id: tenantId, pattern, coa_id: coaId, hit_count: 1,
            })
        if (patternErr) console.error('[receipts/attach] failed to update categorization_patterns', patternErr)
      }
    }

    const { error } = await supabaseAdmin
      .from('bank_transactions')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', txnId)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/receipts/attach', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
