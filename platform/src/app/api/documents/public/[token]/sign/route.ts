/**
 * Submit all fields for this signer + primary signature. Advances the
 * document state. If all signers are done, flattens the PDF + audit cert.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  canSignerAct,
  documentSignedPath,
  DOCUMENTS_BUCKET,
  logDocEvent,
  sha256Hex,
} from '@/lib/documents'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { decryptSecret } from '@/lib/secret-crypto'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'

type Params = { params: Promise<{ token: string }> }

function ipFromRequest(req: Request): string | null {
  const h = req.headers
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params
    const body = await request.json()
    const signaturePng = String(body.signature_png || '')
    const signatureName = String(body.signature_name || '').trim()
    const fieldValues: Array<{ field_id: string; value: string }> = body.field_values || []

    const { data: signer } = await supabaseAdmin
      .from('document_signers')
      .select('*')
      .eq('public_token', token)
      .maybeSingle()
    if (!signer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!signer.consent_accepted_at) {
      return NextResponse.json({ error: 'Consent must be accepted first' }, { status: 400 })
    }
    if (signer.status === 'signed') return NextResponse.json({ ok: true, already_signed: true })
    if (signer.status === 'declined') return NextResponse.json({ error: 'Already declined' }, { status: 400 })

    if (!signaturePng.startsWith('data:image/') || signaturePng.length < 100) {
      return NextResponse.json({ error: 'Signature required' }, { status: 400 })
    }
    if (signaturePng.length > 500_000) {
      return NextResponse.json({ error: 'Signature image too large' }, { status: 400 })
    }
    if (!signatureName) return NextResponse.json({ error: 'Typed name required' }, { status: 400 })

    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('*, tenants(name, domain, telnyx_api_key, telnyx_phone, resend_api_key, email_from)')
      .eq('id', signer.document_id)
      .single()
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const { data: allSigners } = await supabaseAdmin
      .from('document_signers')
      .select('id, order_index, status')
      .eq('document_id', doc.id)
      .order('order_index')

    if (!canSignerAct(
      doc.sign_order as 'parallel' | 'sequential',
      { order_index: signer.order_index, status: signer.status },
      allSigners || [],
    )) {
      return NextResponse.json({ error: 'Waiting for prior signer(s) to complete' }, { status: 400 })
    }

    const ip = ipFromRequest(request)
    const ua = request.headers.get('user-agent')
    const now = new Date().toISOString()

    // Save each field value
    for (const fv of fieldValues) {
      if (!fv.field_id) continue
      await supabaseAdmin
        .from('document_fields')
        .update({ value: String(fv.value || ''), filled_at: now })
        .eq('id', fv.field_id)
        .eq('signer_id', signer.id)
    }

    // Verify every required field for this signer was filled before we let
    // them complete. Signing without filling required fields was silent before.
    const { data: stillEmpty } = await supabaseAdmin
      .from('document_fields')
      .select('id, label, type')
      .eq('document_id', doc.id)
      .eq('signer_id', signer.id)
      .eq('required', true)
      .is('filled_at', null)
    if (stillEmpty && stillEmpty.length > 0) {
      // Signature/initial fields are stamped from signature_png at finalize,
      // so they don't need filled_at. Exclude them from the block.
      const unfilled = stillEmpty.filter(f => f.type !== 'signature' && f.type !== 'initial')
      if (unfilled.length > 0) {
        return NextResponse.json({
          error: 'Required fields are incomplete',
          unfilled: unfilled.map(f => ({ id: f.id, label: f.label, type: f.type })),
        }, { status: 400 })
      }
    }

    // Atomic claim — transition from pending/sent/viewed → signed in one UPDATE.
    // If a concurrent request already flipped this signer, we'll match 0 rows
    // and return the idempotent already-signed response rather than stamping twice.
    const { data: claimed } = await supabaseAdmin
      .from('document_signers')
      .update({
        status: 'signed',
        signed_at: now,
        signed_ip: ip,
        signed_user_agent: ua,
        signature_png: signaturePng,
        signature_name: signatureName,
      })
      .eq('id', signer.id)
      .in('status', ['pending', 'sent', 'viewed'])
      .select('id')
      .maybeSingle()

    if (!claimed) {
      return NextResponse.json({ ok: true, already_signed: true })
    }

    // Sequential post-claim guard — re-verify that no lower-order signer
    // is still unsigned (state is monotonic, so a single post-check is safe).
    if (doc.sign_order === 'sequential') {
      const { data: priorUnfinished } = await supabaseAdmin
        .from('document_signers')
        .select('id')
        .eq('document_id', doc.id)
        .lt('order_index', signer.order_index)
        .not('status', 'eq', 'signed')
        .limit(1)
      if (priorUnfinished && priorUnfinished.length > 0) {
        // Roll back — we won the race but the invariant was violated.
        await supabaseAdmin
          .from('document_signers')
          .update({
            status: 'viewed',
            signed_at: null,
            signed_ip: null,
            signed_user_agent: null,
            signature_png: null,
            signature_name: null,
          })
          .eq('id', signer.id)
        return NextResponse.json({ error: 'Waiting for prior signer(s) to complete' }, { status: 400 })
      }
    }

    await logDocEvent({
      document_id: doc.id,
      tenant_id: doc.tenant_id,
      signer_id: signer.id,
      event_type: 'signed',
      detail: { signer_name: signatureName, field_count: fieldValues.length },
      ip_address: ip,
      user_agent: ua,
    })

    // Check if all signers done
    const { data: freshSigners } = await supabaseAdmin
      .from('document_signers')
      .select('id, order_index, status, name, email, phone')
      .eq('document_id', doc.id)
      .order('order_index')

    const allDone = (freshSigners || []).every(s => s.status === 'signed')
    const nextPending = (freshSigners || []).find(s => s.status === 'pending' || s.status === 'sent' || s.status === 'viewed')

    if (allDone) {
      await finalizeDocument(doc)
      await logDocEvent({
        document_id: doc.id,
        tenant_id: doc.tenant_id,
        event_type: 'completed',
      })
    } else {
      // Partial progress
      await supabaseAdmin
        .from('documents')
        .update({ status: 'in_progress' })
        .eq('id', doc.id)

      // Sequential: notify next signer
      if (doc.sign_order === 'sequential' && nextPending) {
        await sendSigningInviteToSigner(doc, nextPending as { id: string; name: string; email: string | null; phone: string | null; order_index: number; status: string })
      }
    }

    return NextResponse.json({ ok: true, all_done: allDone })
  } catch (err) {
    console.error('POST /api/documents/public/[token]/sign', err)
    return NextResponse.json({ error: 'Signing failed. Please try again.' }, { status: 500 })
  }
}

// ─── finalization ──────────────────────────────────────────────────

async function finalizeDocument(doc: {
  id: string
  tenant_id: string
  title: string
  original_path: string
  original_sha256: string | null
  consent_text: string
  page_count: number
}) {
  // Download original
  const { data: blob } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .download(doc.original_path)
  if (!blob) throw new Error('Original PDF missing')
  const origBytes = new Uint8Array(await blob.arrayBuffer())

  // Integrity check — compare computed hash against the hash captured at send time.
  // If these diverge, the bytes in storage were altered between send and signing
  // and this finalization must not proceed.
  if (doc.original_sha256) {
    const computed = sha256Hex(origBytes)
    if (computed !== doc.original_sha256) {
      throw new Error(`PDF integrity check failed for document ${doc.id}`)
    }
  }

  // Load and edit
  const pdf = await PDFDocument.load(origBytes, { ignoreEncryption: true })
  const helv = await pdf.embedFont(StandardFonts.Helvetica)
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const { data: signers } = await supabaseAdmin
    .from('document_signers')
    .select('*')
    .eq('document_id', doc.id)
    .order('order_index')

  const { data: fields } = await supabaseAdmin
    .from('document_fields')
    .select('*')
    .eq('document_id', doc.id)

  // Pre-embed each unique signature image by signer
  const sigImageBySigner = new Map<string, import('pdf-lib').PDFImage>()
  for (const s of signers || []) {
    if (!s.signature_png) continue
    const m = /^data:image\/(png|jpeg);base64,(.+)$/i.exec(s.signature_png)
    if (!m) continue
    const base64 = m[2]
    const bytes = Buffer.from(base64, 'base64')
    const img = m[1].toLowerCase() === 'jpeg' ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes)
    sigImageBySigner.set(s.id, img)
  }

  const pages = pdf.getPages()

  // Stamp each field
  for (const f of fields || []) {
    if (f.page < 1 || f.page > pages.length) continue
    const page = pages[f.page - 1]
    const pw = page.getWidth()
    const ph = page.getHeight()
    const x = (Number(f.x_pct) / 100) * pw
    const w = (Number(f.w_pct) / 100) * pw
    const h = (Number(f.h_pct) / 100) * ph
    // PDF coords: origin bottom-left; our y_pct is top-down
    const topY = (Number(f.y_pct) / 100) * ph
    const y = ph - topY - h

    if (f.type === 'signature' || f.type === 'initial') {
      const img = sigImageBySigner.get(f.signer_id)
      if (img) {
        const scaled = img.scaleToFit(w, h)
        page.drawImage(img, {
          x: x + (w - scaled.width) / 2,
          y: y + (h - scaled.height) / 2,
          width: scaled.width,
          height: scaled.height,
        })
      }
    } else {
      const text = String(f.value || '').slice(0, 500)
      if (text) {
        const fontSize = Math.min(h * 0.6, 12)
        page.drawText(text, {
          x: x + 2,
          y: y + (h - fontSize) / 2,
          size: fontSize,
          font: helv,
          color: rgb(0.1, 0.1, 0.1),
        })
      }
    }
  }

  // Append audit certificate page
  const cert = pdf.addPage()
  const cw = cert.getWidth()
  let cy = cert.getHeight() - 48
  const draw = (text: string, size = 10, bold = false) => {
    cert.drawText(text, { x: 48, y: cy, size, font: bold ? helvBold : helv, color: rgb(0.1, 0.1, 0.1) })
    cy -= size + 6
  }

  draw('Certificate of Completion', 18, true); cy -= 6
  draw(`Document: ${doc.title}`, 10)
  draw(`Document ID: ${doc.id}`, 9)
  draw(`Original SHA-256: ${doc.original_sha256 || '(not computed)'}`, 9)
  draw(`Completed: ${new Date().toISOString()}`, 9)
  cy -= 8
  draw('ESIGN Act Consent', 12, true)
  cy += 2
  const lines = wrapText(doc.consent_text, helv, 10, cw - 96)
  for (const line of lines) draw(line, 9)
  cy -= 8

  draw('Signers', 12, true); cy += 2
  for (const s of signers || []) {
    draw(`• ${s.name}${s.role ? ` (${s.role})` : ''}${s.email ? ` — ${s.email}` : ''}`, 10, true)
    if (s.consent_accepted_at) draw(`   Consent accepted: ${new Date(s.consent_accepted_at).toISOString()} · IP ${s.consent_ip || '?'}`, 8)
    if (s.signed_at) draw(`   Signed: ${new Date(s.signed_at).toISOString()} · IP ${s.signed_ip || '?'}`, 8)
    if (s.signature_name) draw(`   Typed name: ${s.signature_name}`, 8)
    cy -= 2
  }

  const finalBytes = await pdf.save()
  const finalSha = sha256Hex(finalBytes)
  const signedPath = documentSignedPath(doc.tenant_id, doc.id)

  await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(signedPath, finalBytes, { contentType: 'application/pdf', upsert: true })

  await supabaseAdmin
    .from('documents')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      signed_path: signedPath,
      signed_sha256: finalSha,
    })
    .eq('id', doc.id)
}

function wrapText(text: string, font: import('pdf-lib').PDFFont, size: number, maxWidth: number): string[] {
  const words = (text || '').split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w
    const width = font.widthOfTextAtSize(trial, size)
    if (width > maxWidth && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = trial
    }
  }
  if (cur) lines.push(cur)
  return lines
}

// ─── notify next signer (sequential flow) ──────────────────────────────

async function sendSigningInviteToSigner(
  doc: { id: string; title: string; message: string | null; tenants: { name: string; domain: string | null; telnyx_api_key: string | null; telnyx_phone: string | null; resend_api_key: string | null; email_from: string | null } | null },
  next: { id: string; name: string; email: string | null; phone: string | null },
) {
  const tenant = doc.tenants
  if (!tenant) return
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const baseUrl = tenant.domain ? `https://${tenant.domain}` : appUrl
  const { data: tokenRow } = await supabaseAdmin
    .from('document_signers')
    .select('public_token')
    .eq('id', next.id)
    .single()
  if (!tokenRow) return
  const signUrl = `${baseUrl}/sign/${tokenRow.public_token}`

  const telnyxKey = tenant.telnyx_api_key ? decryptSecret(tenant.telnyx_api_key) : null
  const resendKey = tenant.resend_api_key ? decryptSecret(tenant.resend_api_key) : null
  const fromEmail = tenant.email_from || `docs@${tenant.domain || 'fullloopcrm.com'}`

  if (next.email && resendKey) {
    try {
      await sendEmail({
        to: next.email,
        subject: `${tenant.name}: you're up — ${doc.title}`,
        html: `<p>Hi ${next.name}, the prior signer has completed their portion. Please sign here: <a href="${encodeURI(signUrl)}">${signUrl}</a></p>`,
        from: fromEmail,
        resendApiKey: resendKey,
      })
    } catch { /* noop */ }
  }
  if (next.phone && telnyxKey && tenant.telnyx_phone) {
    try {
      await sendSMS({
        to: next.phone,
        body: `${tenant.name}: you're up on "${doc.title}": ${signUrl}`,
        telnyxApiKey: telnyxKey,
        telnyxPhone: tenant.telnyx_phone,
      })
    } catch { /* noop */ }
  }
  await supabaseAdmin
    .from('document_signers')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', next.id)
}
