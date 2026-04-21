/**
 * Documents list + create. Create takes multipart form with the PDF.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { documentOriginalPath, logDocEvent, DOCUMENTS_BUCKET } from '@/lib/documents'
import { PDFDocument } from 'pdf-lib'

export async function GET(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const limit = Math.min(500, Number(url.searchParams.get('limit')) || 100)

    let q = supabaseAdmin
      .from('documents')
      .select('*, document_signers(id, name, email, role, status, order_index)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (status) q = q.eq('status', status)

    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ documents: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/documents', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const form = await request.formData()
    const file = form.get('file') as File | null
    const title = String(form.get('title') || '').trim()
    const message = String(form.get('message') || '').trim() || null
    const signOrder = String(form.get('sign_order') || 'parallel') as 'parallel' | 'sequential'

    if (!file) return NextResponse.json({ error: 'PDF file required' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
    if (file.type && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Must be a PDF' }, { status: 400 })
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF exceeds 25 MB' }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())

    // Quick page count via pdf-lib — also serves as encryption check.
    // We reject encrypted PDFs because the sign-time SHA-256 would hash the
    // encrypted bytes but pdf-lib's finalize strips encryption, producing a
    // flattened PDF that no longer matches the integrity hash.
    let pageCount = 0
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: false })
      pageCount = doc.getPageCount()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown'
      if (/encrypted/i.test(msg)) {
        return NextResponse.json({ error: 'Encrypted PDFs are not supported. Remove password protection and re-upload.' }, { status: 400 })
      }
      return NextResponse.json({ error: `Invalid PDF: ${msg}` }, { status: 400 })
    }

    // Insert row first to get id for path
    const { data: doc, error: dErr } = await supabaseAdmin
      .from('documents')
      .insert({
        tenant_id: tenantId,
        title,
        message,
        sign_order: signOrder,
        original_path: 'pending',  // Overwrite after upload
        page_count: pageCount,
      })
      .select('*')
      .single()
    if (dErr) throw dErr

    const path = documentOriginalPath(tenantId, doc.id)
    const { error: upErr } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, bytes, {
        contentType: 'application/pdf',
        upsert: true,
      })
    if (upErr) {
      await supabaseAdmin.from('documents').delete().eq('id', doc.id)
      return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 })
    }

    await supabaseAdmin
      .from('documents')
      .update({ original_path: path })
      .eq('id', doc.id)

    await logDocEvent({
      document_id: doc.id,
      tenant_id: tenantId,
      event_type: 'uploaded',
      detail: { filename: file.name, bytes: file.size, page_count: pageCount },
    })

    return NextResponse.json({ document: { ...doc, original_path: path } })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/documents', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
