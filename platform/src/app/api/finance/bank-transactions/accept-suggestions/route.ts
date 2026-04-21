/**
 * Accept all suggestions above a confidence threshold in one go.
 * Posts journal entries for each, bumps categorization_patterns.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { normalizeDescription, postJournalEntry } from '@/lib/ledger'

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json().catch(() => ({}))
    const threshold = Math.max(0, Math.min(1, Number(body.threshold) || 0.8))

    const { data: txns } = await supabaseAdmin
      .from('bank_transactions')
      .select('id, txn_date, description, amount_cents, suggested_coa_id, suggested_confidence, bank_account_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .not('suggested_coa_id', 'is', null)
      .gte('suggested_confidence', threshold)
      .limit(500)

    if (!txns || txns.length === 0) {
      return NextResponse.json({ ok: true, accepted: 0 })
    }

    // Pre-fetch bank accounts' coa_ids
    const bankIds = [...new Set(txns.map(t => t.bank_account_id))]
    const { data: bankRows } = await supabaseAdmin
      .from('bank_accounts')
      .select('id, coa_id')
      .eq('tenant_id', tenantId)
      .in('id', bankIds)
    const bankToCoa = new Map<string, string>()
    for (const b of bankRows || []) if (b.coa_id) bankToCoa.set(b.id, b.coa_id)

    let accepted = 0
    let skipped = 0
    for (const t of txns) {
      const bankCoa = bankToCoa.get(t.bank_account_id)
      if (!bankCoa || !t.suggested_coa_id) { skipped++; continue }

      const amount = Math.abs(t.amount_cents)
      const isOutflow = t.amount_cents < 0
      const lines = isOutflow
        ? [{ coa_id: t.suggested_coa_id, debit_cents: amount }, { coa_id: bankCoa, credit_cents: amount }]
        : [{ coa_id: bankCoa, debit_cents: amount }, { coa_id: t.suggested_coa_id, credit_cents: amount }]

      try {
        const entryId = await postJournalEntry({
          tenant_id: tenantId,
          entry_date: t.txn_date,
          memo: t.description,
          source: 'bank_txn',
          source_id: t.id,
          lines,
        })
        await supabaseAdmin
          .from('bank_transactions')
          .update({ coa_id: t.suggested_coa_id, status: 'posted', journal_entry_id: entryId })
          .eq('id', t.id)

        // Bump pattern
        const pattern = normalizeDescription(t.description).slice(0, 64)
        if (pattern) {
          const { data: existing } = await supabaseAdmin
            .from('categorization_patterns')
            .select('id, hit_count')
            .eq('tenant_id', tenantId)
            .eq('pattern', pattern)
            .eq('coa_id', t.suggested_coa_id)
            .maybeSingle()
          if (existing) {
            await supabaseAdmin
              .from('categorization_patterns')
              .update({ hit_count: (existing.hit_count || 0) + 1, last_used_at: new Date().toISOString() })
              .eq('id', existing.id)
          } else {
            await supabaseAdmin.from('categorization_patterns').insert({
              tenant_id: tenantId, pattern, coa_id: t.suggested_coa_id, hit_count: 1,
            })
          }
        }
        accepted++
      } catch (e) {
        console.warn('[accept-suggestions] failed for txn', t.id, e)
        skipped++
      }
    }

    return NextResponse.json({ ok: true, accepted, skipped, threshold })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/bank-transactions/accept-suggestions', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
