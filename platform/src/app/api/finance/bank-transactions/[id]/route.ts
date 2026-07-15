/**
 * Categorize a single bank transaction. Assigning coa_id posts a journal
 * entry against the bank's coa and the chosen coa.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { postJournalEntry, normalizeDescription } from '@/lib/ledger'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    // tenantDb auto-scopes every query; the update-by-id calls below GAIN a
    // tenant_id filter they previously lacked.
    const db = tenantDb(tenantId)
    const { id } = await params
    const body = await request.json()

    const { data: txn } = await db
      .from('bank_transactions')
      .select('*, bank_accounts(coa_id)')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!txn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (body.status === 'ignored') {
      // Guard the write with the status this request actually read (compare-
      // and-swap) so a double-submit on an already-processed txn is a no-op.
      const { data: claim } = await db
        .from('bank_transactions')
        .update({ status: 'ignored' })
        .eq('id', id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle()
      return NextResponse.json({ ok: true, already_processed: !claim })
    }

    if (!body.coa_id) return NextResponse.json({ error: 'coa_id required' }, { status: 400 })

    // Confirm coa_id belongs to this tenant — the FK alone doesn't scope tenancy.
    const { data: coaRow } = await db
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

    // Atomic claim: guard the status transition with the 'pending' status this
    // request actually read (compare-and-swap) before posting the journal
    // entry, so a double-submit (double-click, retry) can't post it twice.
    const { data: claim } = await db
      .from('bank_transactions')
      .update({ coa_id: body.coa_id, memo: body.memo || null, status: 'posted' })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()
    if (!claim) {
      return NextResponse.json({ ok: true, already_processed: true })
    }

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

    await db
      .from('bank_transactions')
      .update({ journal_entry_id: entryId })
      .eq('id', id)

    // Update learning pattern
    const pattern = normalizeDescription(txn.description).slice(0, 64)
    if (pattern) {
      const { data: existing } = await db
        .from('categorization_patterns')
        .select('id, hit_count')
        .eq('tenant_id', tenantId)
        .eq('pattern', pattern)
        .eq('coa_id', body.coa_id)
        .maybeSingle()
      if (existing) {
        await db
          .from('categorization_patterns')
          .update({ hit_count: (existing.hit_count || 0) + 1, last_used_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        await db.from('categorization_patterns').insert({
          tenant_id: tenantId,
          pattern,
          coa_id: body.coa_id,
          hit_count: 1,
        })
      }
    }

    return NextResponse.json({ ok: true, journal_entry_id: entryId })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/finance/bank-transactions/[id]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
