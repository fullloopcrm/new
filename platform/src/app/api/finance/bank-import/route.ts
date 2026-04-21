/**
 * Bank statement import. Multipart upload → parse → dedupe → persist.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { detectAndParse } from '@/lib/bank-import'
import { sha256File, transactionFingerprint } from '@/lib/ledger'

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const form = await request.formData()
    const file = form.get('file') as File | null
    const bankAccountId = String(form.get('bank_account_id') || '')
    if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })
    if (!bankAccountId) return NextResponse.json({ error: 'bank_account_id required' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File exceeds 10 MB' }, { status: 400 })

    const { data: acct } = await supabaseAdmin
      .from('bank_accounts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', bankAccountId)
      .single()
    if (!acct) return NextResponse.json({ error: 'Bank account not found' }, { status: 404 })

    const bytes = Buffer.from(await file.arrayBuffer())
    const fileHash = sha256File(bytes)
    const text = bytes.toString('utf8')

    // Reject exact same file re-uploaded
    const { data: existingBatch } = await supabaseAdmin
      .from('bank_import_batches')
      .select('id, row_count, accepted_count, duplicate_count, created_at')
      .eq('bank_account_id', bankAccountId)
      .eq('sha256', fileHash)
      .maybeSingle()
    if (existingBatch) {
      return NextResponse.json({
        error: 'This exact file was already imported',
        previous_batch: existingBatch,
      }, { status: 409 })
    }

    let parsed
    try {
      parsed = detectAndParse(file.name, text)
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Parse failed' }, { status: 400 })
    }
    const rows = parsed.txns
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No transactions found in file' }, { status: 400 })
    }

    const periodStart = rows.reduce((min, t) => t.txn_date < min ? t.txn_date : min, rows[0].txn_date)
    const periodEnd = rows.reduce((max, t) => t.txn_date > max ? t.txn_date : max, rows[0].txn_date)

    // Create batch row
    const { data: batch, error: bErr } = await supabaseAdmin
      .from('bank_import_batches')
      .insert({
        tenant_id: tenantId,
        bank_account_id: bankAccountId,
        source: parsed.source,
        filename: file.name,
        sha256: fileHash,
        row_count: rows.length,
        period_start: periodStart,
        period_end: periodEnd,
      })
      .select('id')
      .single()
    if (bErr) throw bErr

    // Build fingerprints
    const incoming = rows.map(r => ({
      ...r,
      fingerprint: transactionFingerprint(r.txn_date, r.amount_cents, r.description),
    }))

    // Fetch existing fingerprints for this account to detect duplicates across prior imports
    const fps = incoming.map(r => r.fingerprint)
    const { data: existingFps } = await supabaseAdmin
      .from('bank_transactions')
      .select('fingerprint')
      .eq('bank_account_id', bankAccountId)
      .in('fingerprint', fps)
    const existingSet = new Set((existingFps || []).map(x => x.fingerprint as string))

    // Dedupe within the file itself too
    const seen = new Set<string>()
    const toInsert: Array<typeof incoming[number] & { duplicate: boolean }> = []
    for (const r of incoming) {
      if (seen.has(r.fingerprint) || existingSet.has(r.fingerprint)) {
        toInsert.push({ ...r, duplicate: true })
      } else {
        seen.add(r.fingerprint)
        toInsert.push({ ...r, duplicate: false })
      }
    }

    const accepted = toInsert.filter(r => !r.duplicate)
    const duplicates = toInsert.length - accepted.length

    if (accepted.length > 0) {
      const { error: iErr } = await supabaseAdmin.from('bank_transactions').insert(
        accepted.map(r => ({
          tenant_id: tenantId,
          bank_account_id: bankAccountId,
          import_batch_id: batch.id,
          txn_date: r.txn_date,
          posted_date: r.posted_date || null,
          description: r.description,
          counterparty: r.counterparty || null,
          amount_cents: r.amount_cents,
          check_number: r.check_number || null,
          external_id: r.external_id || null,
          fingerprint: r.fingerprint,
          status: 'pending',
        })),
      )
      if (iErr) throw iErr
    }

    await supabaseAdmin
      .from('bank_import_batches')
      .update({ accepted_count: accepted.length, duplicate_count: duplicates })
      .eq('id', batch.id)

    return NextResponse.json({
      ok: true,
      source: parsed.source,
      rows_parsed: rows.length,
      accepted: accepted.length,
      duplicates,
      period_start: periodStart,
      period_end: periodEnd,
      batch_id: batch.id,
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/bank-import', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
