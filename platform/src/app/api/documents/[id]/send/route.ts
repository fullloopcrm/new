/**
 * Send document to signers. Computes SHA-256 and locks status.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'
import { decryptSecret } from '@/lib/secret-crypto'
import { DOCUMENTS_BUCKET, isEditableStatus, logDocEvent, sha256Hex } from '@/lib/documents'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params

    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!isEditableStatus(doc.status)) {
      return NextResponse.json({ error: `Already ${doc.status}` }, { status: 400 })
    }

    const { data: signers } = await supabaseAdmin
      .from('document_signers')
      .select('*')
      .eq('document_id', id)
      .order('order_index')
    if (!signers || signers.length === 0) {
      return NextResponse.json({ error: 'Add at least one signer before sending' }, { status: 400 })
    }

    const { count: fieldCount } = await supabaseAdmin
      .from('document_fields')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', id)
    if (!fieldCount || fieldCount === 0) {
      return NextResponse.json({ error: 'Add at least one field before sending' }, { status: 400 })
    }

    // Compute SHA-256 of the stored original PDF
    const { data: pdfBlob, error: dlErr } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .download(doc.original_path)
    if (dlErr || !pdfBlob) {
      return NextResponse.json({ error: `Unable to read original PDF: ${dlErr?.message || 'unknown'}` }, { status: 500 })
    }
    const bytes = new Uint8Array(await pdfBlob.arrayBuffer())
    const hash = sha256Hex(bytes)

    // Transition doc status
    const now = new Date().toISOString()
    await supabaseAdmin
      .from('documents')
      .update({ status: 'sent', sent_at: now, original_sha256: hash })
      .eq('id', id)

    // Look up tenant for sending
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, domain, telnyx_api_key, telnyx_phone, resend_api_key, email_from')
      .eq('id', tenantId)
      .single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const baseUrl = tenant?.domain ? `https://${tenant.domain}` : appUrl
    const telnyxKey = tenant?.telnyx_api_key ? decryptSecret(tenant.telnyx_api_key) : null
    const resendKey = tenant?.resend_api_key ? decryptSecret(tenant.resend_api_key) : null
    const fromEmail = tenant?.email_from || `docs@${tenant?.domain || 'fullloopcrm.com'}`

    // Determine which signers to notify now
    const toNotify = doc.sign_order === 'sequential' ? [signers[0]] : signers

    const results: Array<{ signer_id: string; email?: { ok: boolean; detail?: string }; sms?: { ok: boolean; detail?: string } }> = []
    for (const s of toNotify) {
      const signUrl = `${baseUrl}/sign/${s.public_token}`
      const r: { signer_id: string; email?: { ok: boolean; detail?: string }; sms?: { ok: boolean; detail?: string } } = { signer_id: s.id }

      if (s.email && resendKey) {
        try {
          const html = renderInviteEmail({
            businessName: tenant?.name || '',
            signerName: s.name,
            docTitle: doc.title,
            message: doc.message,
            signUrl,
          })
          await sendEmail({
            to: s.email,
            subject: `${tenant?.name || 'Full Loop'}: please sign — ${doc.title}`,
            html,
            from: fromEmail,
            resendApiKey: resendKey,
          })
          r.email = { ok: true }
        } catch (e) {
          r.email = { ok: false, detail: e instanceof Error ? e.message : 'failed' }
        }
      }

      if (s.phone && telnyxKey && tenant?.telnyx_phone) {
        try {
          const firstName = (s.name || '').split(' ')[0] || 'there'
          const smsBody = `Hi ${firstName}, ${tenant.name} is requesting your signature on "${doc.title}": ${signUrl}`
          await sendSMS({ to: s.phone, body: smsBody, telnyxApiKey: telnyxKey, telnyxPhone: tenant.telnyx_phone })
          r.sms = { ok: true }
        } catch (e) {
          r.sms = { ok: false, detail: e instanceof Error ? e.message : 'failed' }
        }
      }

      if (r.email?.ok || r.sms?.ok) {
        await supabaseAdmin
          .from('document_signers')
          .update({ status: 'sent', sent_at: now })
          .eq('id', s.id)
      }

      results.push(r)
    }

    await logDocEvent({
      document_id: id,
      tenant_id: tenantId,
      event_type: 'sent',
      detail: {
        sign_order: doc.sign_order,
        signers_notified: toNotify.length,
        sha256: hash,
        results,
      },
    })

    return NextResponse.json({ ok: true, results, sha256: hash })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/documents/[id]/send', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

function renderInviteEmail(opts: {
  businessName: string
  signerName: string
  docTitle: string
  message: string | null
  signUrl: string
}): string {
  const msg = opts.message ? `<p style="color:#475569;line-height:1.6;margin:0 0 16px;">${escapeHtml(opts.message)}</p>` : ''
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8fafc;padding:40px 20px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="padding:32px;">
      <p style="color:#64748b;font-size:13px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em;">Signature Request</p>
      <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;">${escapeHtml(opts.docTitle)}</h1>
      <p style="color:#475569;line-height:1.6;margin:0 0 8px;">Hi ${escapeHtml(opts.signerName)},</p>
      <p style="color:#475569;line-height:1.6;margin:0 0 16px;"><strong>${escapeHtml(opts.businessName)}</strong> is requesting your signature.</p>
      ${msg}
      <div style="text-align:center;margin:0 0 16px;">
        <a href="${encodeURI(opts.signUrl)}" style="display:inline-block;background:#0d9488;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Review &amp; Sign</a>
      </div>
      <p style="color:#94a3b8;font-size:11px;margin:24px 0 0;line-height:1.5;">This is a secure signature request. Your consent to sign electronically will be captured along with the time, IP address, and device before any signature is recorded.</p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">Sent by ${escapeHtml(opts.businessName)} via Full Loop</p>
    </div>
  </div>
</body></html>`
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
