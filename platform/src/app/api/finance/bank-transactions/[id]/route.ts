/**
 * Categorize a single bank transaction. Assigning coa_id posts a journal
 * entry against the bank's coa and the chosen coa.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { postJournalEntry, normalizeDescription } from '@/lib/ledger'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json()

    const { data: txn } = await supabaseAdmin
      .from('bank_transactions')
      .select('*, bank_accounts(coa_id)')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!txn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (body.status === 'ignored') {
      await supabaseAdmin
        .from('bank_transactions')
        .update({ status: 'ignored' })
        .eq('id', id)
      return NextResponse.json({ ok: true })
    }

    if (!body.coa_id) return NextResponse.json({ error: 'coa_id required' }, { status: 400 })

    // Confirm coa_id belongs to this tenant — the FK alone doesn't scope tenancy.
    const { data: coaRow } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('id')
      .eq('id', body.coa_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!coaRow) return NextResponse.json({ error: 'Invalid coa_id' }, { status: 400 })

    const bankCoa = (txn.bank_accounts as { coa_id?: string } | null)?.coa_id
    if (!bankCoa) {
      return NextResponse.json({ error: 'Bank account has no Chart-of-Accounts link. Set one in bank settings.' }, { status: 400 })
    }

    const amount = Math.abs(txn.amount_cents)
    const isOutflow = txn.amount_cents < 0
    // Outflow: debit category, credit bank.  Inflow: debit bank, credit category.
    const lines = isOutflow
      ? [{ coa_id: body.coa_id, debit_cents: amount }, { coa_id: bankCoa, credit_cents: amount }]
      : [{ coa_id: bankCoa, debit_cents: amount }, { coa_id: body.coa_id, credit_cents: amount }]

    const entryId = await postJournalEntry({
      tenant_id: tenantId,
      entity_id: txn.entity_id || null,
      entry_date: txn.txn_date,
      memo: body.memo || txn.description,
      source: 'bank_txn',
      source_id: txn.id,
      lines,
    })
    if (entryId === null) {
      // Already posted by a concurrent request for this same transaction —
      // do not overwrite its real journal_entry_id with null.
      return NextResponse.json({ ok: true, already_posted: true })
    }

    await supabaseAdmin
      .from('bank_transactions')
      .update({
        coa_id: body.coa_id,
        memo: body.memo || null,
        status: 'posted',
        journal_entry_id: entryId,
      })
      .eq('id', id)

    // Update learning pattern. idx_categ_patterns_tenant_pattern uniquely
    // constrains (tenant_id, pattern) ONLY -- one row per pattern, coa_id is
    // mutable on that row (categorize-ai.ts's cascading lookup keys on
    // `pattern` alone and trusts whatever coa_id is on that single row as the
    // current best category). The lookup here used to also filter on
    // `coa_id`, so re-categorizing an already-learned pattern to a DIFFERENT
    // category never matched the existing row and fell into the insert
    // branch, which then hit the 2-column unique index and 23505'd -- an
    // error this call never even captured, let alone checked, so the
    // correction silently vanished and the AI kept suggesting the old wrong
    // category forever. Look up by (tenant_id, pattern) only now: same coa_id
    // reaffirms (increment hit_count), a different coa_id is a correction
    // (overwrite coa_id, reset hit_count to 1 -- the old count measured
    // confidence in the old mapping, not this one).
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
              existing.coa_id === body.coa_id
                ? { hit_count: (existing.hit_count || 0) + 1, last_used_at: new Date().toISOString() }
                : { coa_id: body.coa_id, hit_count: 1, last_used_at: new Date().toISOString() },
            )
            .eq('id', existing.id)
        : await supabaseAdmin.from('categorization_patterns').insert({
            tenant_id: tenantId,
            pattern,
            coa_id: body.coa_id,
            hit_count: 1,
          })
      if (patternErr) console.error('[bank-transactions] failed to update categorization_patterns', patternErr)
    }

    return NextResponse.json({ ok: true, journal_entry_id: entryId })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/finance/bank-transactions/[id]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
