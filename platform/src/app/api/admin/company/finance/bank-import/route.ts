/**
 * Bank statement import for Full Loop's own ledger. Same parser as tenant
 * finance (lib/bank-import, lib/ledger) — those are pure functions with no
 * tenant coupling. Dedupes via a unique index on fingerprint; a re-uploaded
 * statement silently skips rows already imported instead of erroring.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { detectAndParse } from '@/lib/bank-import'
import { sha256File, transactionFingerprint } from '@/lib/ledger'

export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const form = await request.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File exceeds 10 MB' }, { status: 400 })

  const bytes = Buffer.from(await file.arrayBuffer())
  const importBatchId = sha256File(bytes).slice(0, 32)
  const text = bytes.toString('utf8')

  let parsed: ReturnType<typeof detectAndParse>
  try {
    parsed = detectAndParse(file.name, text)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not parse file' }, { status: 400 })
  }

  const rows = parsed.txns.map((t) => ({
    txn_date: t.txn_date,
    posted_date: t.posted_date || null,
    description: t.description,
    counterparty: t.counterparty || null,
    amount_cents: t.amount_cents,
    check_number: t.check_number || null,
    external_id: t.external_id || null,
    fingerprint: transactionFingerprint(t.txn_date, t.amount_cents, t.description),
    import_batch_id: importBatchId,
    status: 'pending' as const,
  }))

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No transactions found in file' }, { status: 400 })
  }

  // upsert on fingerprint, ignoring duplicates — a re-upload of the same
  // statement (or an overlapping date range) is a no-op for rows already seen.
  const { data, error } = await supabaseAdmin
    .from('platform_bank_transactions')
    .upsert(rows, { onConflict: 'fingerprint', ignoreDuplicates: true })
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ imported: data?.length || 0, parsed: rows.length, source: parsed.source })
}
