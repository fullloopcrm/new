/**
 * POST /api/admin/requests/:id/agreement
 * Generates the service-agreement PDF for a lead, loads it into the in-house
 * e-sign module under the Full Loop platform tenant, adds the client (signs
 * first) and Full Loop (countersigns) as sequential signers with signature +
 * date fields, marks it sent, and emails the client the signing link.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { buildAgreementPdf } from '@/lib/agreement-pdf'
import { computeMonthly } from '@/lib/billing-pricing'
import { DOCUMENTS_BUCKET, documentOriginalPath, generateSignerToken, sha256Hex } from '@/lib/documents'
import { sendEmail } from '@/lib/email'

// Platform tenant that owns platform-level sales agreements.
const FULL_LOOP_TENANT = '117968d2-24a1-42b5-96bd-7022e4e838ee'
const FULL_LOOP_SIGNER_EMAIL = process.env.ADMIN_EMAIL || 'fullloopcrm@gmail.com'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  const { data: lead } = await supabaseAdmin
    .from('partner_requests')
    .select('id, business_name, contact_name, email, phone, proposal_admins, proposal_team_members, proposal_monthly, territory_id')
    .eq('id', id)
    .single()
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (!lead.email) return NextResponse.json({ error: 'Lead has no email to send to' }, { status: 400 })

  const admins = lead.proposal_admins || 1
  const teamMembers = lead.proposal_team_members || 0
  const monthly = lead.proposal_monthly ?? computeMonthly(admins, teamMembers)

  // Effective date — passed in so this stays deterministic and server-stamped.
  const effectiveDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  let territoryName: string | null = null
  if (lead.territory_id) {
    const { data: terr } = await supabaseAdmin.from('territories').select('name, state_abbr').eq('id', lead.territory_id).single()
    if (terr) territoryName = terr.state_abbr ? `${terr.name}, ${terr.state_abbr}` : terr.name
  }

  const pdf = await buildAgreementPdf({
    businessName: lead.business_name || 'your business',
    contactName: lead.contact_name,
    clientEmail: lead.email,
    clientPhone: lead.phone,
    admins, teamMembers, monthly, territoryName, effectiveDate,
  })

  // Preview: return the PDF bytes directly (no document created, no email).
  if (new URL(request.url).searchParams.get('preview')) {
    return new NextResponse(Buffer.from(pdf.bytes), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="agreement-preview.pdf"' },
    })
  }

  // 1. Document row (sequential: client then Full Loop).
  const { data: doc, error: dErr } = await supabaseAdmin
    .from('documents')
    .insert({
      tenant_id: FULL_LOOP_TENANT,
      title: `Full Loop Service Agreement — ${lead.business_name || lead.email}`,
      message: 'Please review and sign your Full Loop CRM service agreement.',
      sign_order: 'sequential',
      original_path: 'pending',
      page_count: pdf.pageCount,
    })
    .select('id')
    .single()
  if (dErr || !doc) return NextResponse.json({ error: dErr?.message || 'Could not create document' }, { status: 500 })

  // 2. Upload the PDF, then point the doc at it + mark sent.
  const path = documentOriginalPath(FULL_LOOP_TENANT, doc.id)
  const { error: upErr } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, pdf.bytes, { contentType: 'application/pdf', upsert: true })
  if (upErr) {
    await supabaseAdmin.from('documents').delete().eq('id', doc.id)
    return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 })
  }
  const now = new Date().toISOString()
  await supabaseAdmin.from('documents').update({
    original_path: path,
    original_sha256: sha256Hex(Buffer.from(pdf.bytes)),
    status: 'sent',
    sent_at: now,
  }).eq('id', doc.id)

  // 3. Signers — client (order 1) signs first, Full Loop (order 2) countersigns.
  const clientToken = generateSignerToken()
  const loopToken = generateSignerToken()
  const { data: signers, error: sErr } = await supabaseAdmin
    .from('document_signers')
    .insert([
      { tenant_id: FULL_LOOP_TENANT, document_id: doc.id, order_index: 1, name: lead.contact_name || lead.business_name || 'Client', email: lead.email, role: 'client', public_token: clientToken, status: 'sent', sent_at: now },
      { tenant_id: FULL_LOOP_TENANT, document_id: doc.id, order_index: 2, name: 'Full Loop CRM', email: FULL_LOOP_SIGNER_EMAIL, role: 'internal', public_token: loopToken, status: 'pending' },
    ])
    .select('id, order_index')
  if (sErr || !signers) return NextResponse.json({ error: sErr?.message || 'Could not add signers' }, { status: 500 })
  const clientSigner = signers.find(s => s.order_index === 1)!
  const loopSigner = signers.find(s => s.order_index === 2)!

  // 4. Fields — signature + date for each signer, positioned on the block.
  const field = (signerId: string, type: 'signature' | 'date', spot: typeof pdf.clientSignature, required: boolean, label: string) => ({
    tenant_id: FULL_LOOP_TENANT, document_id: doc.id, signer_id: signerId, type, page: spot.page,
    x_pct: spot.xPct, y_pct: spot.yPct, w_pct: spot.wPct, h_pct: spot.hPct, required, label,
  })
  const { error: fErr } = await supabaseAdmin.from('document_fields').insert([
    field(clientSigner.id, 'signature', pdf.clientSignature, true, 'Client signature'),
    field(clientSigner.id, 'date', pdf.clientDate, false, 'Date'),
    field(loopSigner.id, 'signature', pdf.loopSignature, true, 'Full Loop signature'),
    field(loopSigner.id, 'date', pdf.loopDate, false, 'Date'),
  ])
  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 })

  // 5. Email the client their signing link.
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const proto = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : new URL(request.url).origin)
  const signUrl = `${baseUrl}/sign/${clientToken}`
  try {
    await sendEmail({
      to: lead.email,
      subject: `Your Full Loop service agreement — ${lead.business_name || ''}`.trim(),
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;">
          <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#0d9488;margin-bottom:16px;">Full Loop CRM</div>
          <h1 style="font-size:21px;margin:0 0 12px;">Welcome aboard, ${lead.contact_name?.split(' ')[0] || 'there'} — this is the fun part</h1>
          <p style="color:#475569;font-size:14px;line-height:1.65;margin:0 0 14px;">We're genuinely excited to have you${lead.business_name ? ` and <strong>${lead.business_name}</strong>` : ''} on the way in. Your service agreement is ready whenever you are.</p>
          <p style="color:#475569;font-size:14px;line-height:1.65;margin:0 0 20px;">Give it a read and sign right from your phone or laptop — it takes a minute. Once you sign, we countersign, and a fully-signed copy lands in your inbox. Then the real work starts: we get your setup rolling.</p>
          <div style="margin:0 0 22px;">
            <a href="${signUrl}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:14px 30px;border-radius:8px;font-weight:600;font-size:15px;">Review &amp; sign →</a>
          </div>
          <p style="color:#475569;font-size:14px;line-height:1.65;margin:0 0 20px;">Any questions before you sign? Just hit reply — a real person answers, and we're happy to walk through anything.</p>
          <div style="border-top:1px solid #e2e8f0;padding-top:16px;color:#94a3b8;font-size:12px;line-height:1.6;">
            <strong style="color:#64748b;">Full Loop CRM</strong> — automation that runs home-service businesses.<br/>
            <a href="mailto:hello@fullloopcrm.com" style="color:#0d9488;text-decoration:none;">hello@fullloopcrm.com</a> &nbsp;·&nbsp; (212) 202-9220 &nbsp;·&nbsp; <a href="https://fullloopcrm.com" style="color:#0d9488;text-decoration:none;">fullloopcrm.com</a>
          </div>
        </div>`,
    })
  } catch (e) {
    return NextResponse.json({ ok: true, documentId: doc.id, signUrl, warning: `Document created but email failed: ${e instanceof Error ? e.message : 'unknown'}` })
  }

  return NextResponse.json({ ok: true, documentId: doc.id, signUrl, sentTo: lead.email })
}
