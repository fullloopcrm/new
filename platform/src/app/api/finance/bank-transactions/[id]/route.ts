/**
 * Categorize a single bank transaction. Assigning coa_id posts a journal
 * entry against the bank's coa and the chosen coa.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { postJournalEntry, normalizeDescription } from '@/lib/ledger'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
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

    await supabaseAdmin
      .from('bank_transactions')
      .update({
        coa_id: body.coa_id,
        memo: body.memo || null,
        status: 'posted',
        journal_entry_id: entryId,
      })
      .eq('id', id)

    // Update learning pattern
    const pattern = normalizeDescription(txn.description).slice(0, 64)
    if (pattern) {
      const { data: existing } = await supabaseAdmin
        .from('categorization_patterns')
        .select('id, hit_count')
        .eq('tenant_id', tenantId)
        .eq('pattern', pattern)
        .eq('coa_id', body.coa_id)
        .maybeSingle()
      if (existing) {
        await supabaseAdmin
          .from('categorization_patterns')
          .update({ hit_count: (existing.hit_count || 0) + 1, last_used_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        await supabaseAdmin.from('categorization_patterns').insert({
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
