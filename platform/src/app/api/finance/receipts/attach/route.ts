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

    const { data: txn } = await supabaseAdmin
      .from('bank_transactions')
      .select('id, tenant_id, txn_date, description, amount_cents, status, bank_account_id, entity_id, bank_accounts(coa_id)')
      .eq('tenant_id', tenantId)
      .eq('id', txnId)
      .single()
    if (!txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    // If no coa_id was passed, this call only attaches the receipt file —
    // no claim needed, plain update.
    if (!coaId) {
      const { error } = await supabaseAdmin
        .from('bank_transactions')
        .update({ receipt_path: path, receipt_extracted: extracted })
        .eq('tenant_id', tenantId)
        .eq('id', txnId)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

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

    // Atomic claim: guard the status transition with the 'pending' status this
    // request actually read (compare-and-swap) before posting the journal
    // entry, so a double-submit (double-click, retry) can't post the same
    // txn's journal entry twice or overwrite the winner's journal_entry_id
    // with a null loser write. Same pattern as the sibling categorize route
    // (../[id]/route.ts) and accept-suggestions.
    const { data: claim } = await supabaseAdmin
      .from('bank_transactions')
      .update({ receipt_path: path, receipt_extracted: extracted, coa_id: coaId, status: 'posted' })
      .eq('tenant_id', tenantId)
      .eq('id', txnId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()
    if (!claim) {
      // Already posted by another request — still attach the receipt file,
      // just without re-posting or re-claiming.
      const { error } = await supabaseAdmin
        .from('bank_transactions')
        .update({ receipt_path: path, receipt_extracted: extracted })
        .eq('tenant_id', tenantId)
        .eq('id', txnId)
      if (error) throw error
      return NextResponse.json({ ok: true, already_processed: true })
    }

    const amount = Math.abs(txn.amount_cents)
    const isOutflow = txn.amount_cents < 0
    const lines = isOutflow
      ? [{ coa_id: coaId, debit_cents: amount }, { coa_id: bankCoa, credit_cents: amount }]
      : [{ coa_id: bankCoa, debit_cents: amount }, { coa_id: coaId, credit_cents: amount }]

    let entryId: string | null
    try {
      entryId = await postJournalEntry({
        tenant_id: tenantId,
        entity_id: (txn.entity_id as string) || null,
        entry_date: txn.txn_date,
        memo: txn.description,
        source: 'bank_txn',
        source_id: txn.id,
        lines,
      })
    } catch (postErr) {
      // Release the claim -- leaving the row 'posted' with no
      // journal_entry_id would hide it from every future retry (this route,
      // the categorize route, and accept-suggestions all only claim
      // status='pending'), while the ledger silently drops this amount.
      await supabaseAdmin
        .from('bank_transactions')
        .update({ coa_id: null, status: 'pending' })
        .eq('id', txnId)
        .eq('status', 'posted')
      throw postErr
    }

    const { error } = await supabaseAdmin
      .from('bank_transactions')
      .update({ journal_entry_id: entryId })
      .eq('id', txnId)
    if (error) throw error

    // Bump pattern. Looked up by (tenant_id, pattern) only -- that matches
    // the actual unique index (idx_categ_patterns_tenant_pattern), not
    // (tenant_id, pattern, coa_id). Filtering by coa_id here used to hide an
    // existing row whenever this description was previously learned under a
    // *different* category, so a routine re-categorization fell through to
    // the insert branch and hit a 23505 there -- silently, since that
    // insert's result was never checked, so the conflict never surfaced as
    // an error. Net effect: hit_count quietly stopped incrementing (and the
    // row was never corrected) the first time any recurring vendor got
    // recategorized to a new account.
    const pattern = normalizeDescription(txn.description).slice(0, 64)
    if (pattern) {
      const { data: existing } = await supabaseAdmin
        .from('categorization_patterns')
        .select('id, hit_count')
        .eq('tenant_id', tenantId)
        .eq('pattern', pattern)
        .maybeSingle()
      if (existing) {
        await supabaseAdmin
          .from('categorization_patterns')
          .update({ hit_count: (existing.hit_count || 0) + 1, last_used_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        const { error: insertErr } = await supabaseAdmin.from('categorization_patterns').insert({
          tenant_id: tenantId, pattern, coa_id: coaId, hit_count: 1,
        })
        // 23505 = a concurrent request for the same brand-new pattern won
        // the race between our SELECT and our INSERT. Bump the winner's row
        // instead of dropping this hit silently (same house idiom as
        // sales-contacts.ts / clients/import / finance/bank-import).
        if (insertErr?.code === '23505') {
          const { data: winner } = await supabaseAdmin
            .from('categorization_patterns')
            .select('id, hit_count')
            .eq('tenant_id', tenantId)
            .eq('pattern', pattern)
            .maybeSingle()
          if (winner) {
            await supabaseAdmin
              .from('categorization_patterns')
              .update({ hit_count: (winner.hit_count || 0) + 1, last_used_at: new Date().toISOString() })
              .eq('id', winner.id)
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/receipts/attach', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
