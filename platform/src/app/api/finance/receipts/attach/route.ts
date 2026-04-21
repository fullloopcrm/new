/**
 * Attach an uploaded receipt to a bank transaction. Optionally categorize
 * and post in one step.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { postJournalEntry, normalizeDescription } from '@/lib/ledger'

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json()
    const txnId = String(body.bank_transaction_id || '')
    const path = String(body.receipt_path || '')
    const extracted = body.extracted || null
    const coaId = body.coa_id ? String(body.coa_id) : null
    if (!txnId || !path) return NextResponse.json({ error: 'bank_transaction_id + receipt_path required' }, { status: 400 })

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
      updates.coa_id = coaId
      updates.status = 'posted'
      updates.journal_entry_id = entryId

      // Bump pattern
      const pattern = normalizeDescription(txn.description).slice(0, 64)
      if (pattern) {
        const { data: existing } = await supabaseAdmin
          .from('categorization_patterns')
          .select('id, hit_count')
          .eq('tenant_id', tenantId)
          .eq('pattern', pattern)
          .eq('coa_id', coaId)
          .maybeSingle()
        if (existing) {
          await supabaseAdmin
            .from('categorization_patterns')
            .update({ hit_count: (existing.hit_count || 0) + 1, last_used_at: new Date().toISOString() })
            .eq('id', existing.id)
        } else {
          await supabaseAdmin.from('categorization_patterns').insert({
            tenant_id: tenantId, pattern, coa_id: coaId, hit_count: 1,
          })
        }
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
