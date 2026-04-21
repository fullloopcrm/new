/**
 * Upload a receipt. Runs Claude vision OCR, attempts to match against
 * pending bank transactions by amount + date, stores the image in
 * Supabase Storage (bucket: receipts).
 *
 * Response lets the UI show the extracted data + suggested match + let
 * the user accept (attach) or create a standalone expense.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { decryptSecret } from '@/lib/secret-crypto'
import { extractReceipt, matchReceiptToTransaction, type BankTxnLite } from '@/lib/receipt-ai'
import { randomBytes } from 'crypto'

const RECEIPTS_BUCKET = 'receipts'
type ReceiptMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
const ALLOWED_MEDIA: ReceiptMediaType[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Receipt image required' }, { status: 400 })
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Max 8 MB' }, { status: 400 })
    const mediaType = (file.type || '') as ReceiptMediaType
    if (!ALLOWED_MEDIA.includes(mediaType)) {
      return NextResponse.json({ error: `Unsupported type: ${mediaType}. Use JPG/PNG/WEBP.` }, { status: 400 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const base64 = bytes.toString('base64')

    // Extract via Claude
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('anthropic_api_key')
      .eq('id', tenantId)
      .single()
    const anthropicKey = tenant?.anthropic_api_key ? decryptSecret(tenant.anthropic_api_key as string) : null

    const extracted = await extractReceipt(base64, mediaType, anthropicKey)

    // Upload to storage
    const filename = `${randomBytes(8).toString('hex')}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const path = `tenants/${tenantId}/${filename}`
    const { error: upErr } = await supabaseAdmin.storage
      .from(RECEIPTS_BUCKET)
      .upload(path, bytes, { contentType: mediaType, upsert: false })
    if (upErr) {
      return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 })
    }

    // Match to pending bank txns (amount + date window)
    let match: { txn: BankTxnLite; confidence: number } | null = null
    if (extracted.amount_cents) {
      // Date window: ±7 days around receipt date (or recent 30 days if date null)
      const { data: pending } = await supabaseAdmin
        .from('bank_transactions')
        .select('id, txn_date, amount_cents, description')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .lt('amount_cents', 0)    // outflows only
        .order('txn_date', { ascending: false })
        .limit(200)
      match = matchReceiptToTransaction(extracted, (pending || []) as BankTxnLite[])
    }

    // Short-lived signed URL for preview
    const { data: signed } = await supabaseAdmin.storage
      .from(RECEIPTS_BUCKET)
      .createSignedUrl(path, 3600)

    return NextResponse.json({
      ok: true,
      path,
      preview_url: signed?.signedUrl || null,
      extracted,
      match: match
        ? {
            txn_id: match.txn.id,
            txn_date: match.txn.txn_date,
            txn_description: match.txn.description,
            txn_amount_cents: match.txn.amount_cents,
            confidence: match.confidence,
          }
        : null,
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/receipts', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
