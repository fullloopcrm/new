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
import { PRICING, computeMonthly } from '@/lib/billing-pricing'
import { DOCUMENTS_BUCKET, documentOriginalPath, generateSignerToken, sha256Hex } from '@/lib/documents'
import { sendEmail } from '@/lib/email'
import { escapeHtml, safeUrl } from '@/lib/escape-html'

// Platform tenant that owns platform-level sales agreements.
const FULL_LOOP_TENANT = '117968d2-24a1-42b5-96bd-7022e4e838ee'
const FULL_LOOP_SIGNER_EMAIL = process.env.ADMIN_EMAIL || 'fullloopcrm@gmail.com'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  const { data: lead } = await supabaseAdmin
    .from('partner_requests')
    .select('id, business_name, contact_name, email, phone, proposal_admins, proposal_team_members, proposal_monthly, territory_id, trade')
    .eq('id', id)
    .single()
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (!lead.email) return NextResponse.json({ error: 'Lead has no email to send to' }, { status: 400 })

  const admins = lead.proposal_admins || 1
  const teamMembers = lead.proposal_team_members || 0
  const monthly = lead.proposal_monthly ?? computeMonthly(admins, teamMembers)

  // Effective date — passed in so this stays deterministic and server-stamped.
  // Platform-level agreement (no tenant yet, this IS the onboarding step) — ET,
  // the platform's own default.
  const effectiveDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' })

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
    trade: lead.trade,
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
  const { error: fErr } = await supabaseAdmin.from('document_fields').insert([ // tenant-scope-ok: field() rows carry tenant_id: FULL_LOOP_TENANT (platform agreement doc)
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
    const firstName = escapeHtml(lead.contact_name?.split(' ')[0] || 'there')
    const bizName = escapeHtml(lead.business_name || 'your business')
    const fmt = (n: number) => `$${n.toLocaleString()}`
    const firstYear = PRICING.setupFee + monthly * 12

    const row = (label: string, val: string, strong = false) =>
      `<tr><td style="padding:9px 0;color:#475569;border-top:1px solid #eef2f6;">${label}</td><td style="padding:9px 0;text-align:right;font-weight:${strong ? 700 : 600};color:#0f172a;border-top:1px solid #eef2f6;">${val}</td></tr>`

    const WHAT_YOU_GET = [
      { t: 'A real website, built and launched for you', b: 'Not a template you configure — a finished, branded site live in your market.' },
      { t: 'Selena, your AI front desk', b: 'Answers leads by text and web chat 24/7, quotes jobs, books them, and follows up — so nothing goes cold.' },
      { t: 'Booking, invoicing, and payouts on autopilot', b: 'Card/ACH checkout, automatic crew payouts, a ledger that reconciles itself.' },
      { t: 'Your market, locked to you', b: 'Full Loop is one business per market — no competitor on the platform can take your territory while you hold it.' },
    ]
    const whatYouGetHtml = WHAT_YOU_GET.map(i => `
      <tr>
        <td style="padding:10px 0;vertical-align:top;width:24px;color:#0d9488;font-weight:700;">✓</td>
        <td style="padding:10px 0;">
          <div style="font-weight:600;color:#0f172a;font-size:14px;">${i.t}</div>
          <div style="color:#64748b;font-size:13px;line-height:1.5;margin-top:2px;">${i.b}</div>
        </td>
      </tr>`).join('')

    await sendEmail({
      to: lead.email,
      subject: `Welcome to Full Loop, ${lead.contact_name?.split(' ')[0] || 'there'} — ${lead.business_name || 'your'} agreement is ready`.trim(),
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:28px 24px;color:#0f172a;">
          <div style="font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#0d9488;margin-bottom:18px;">Full Loop CRM</div>

          <h1 style="font-size:23px;line-height:1.3;margin:0 0 10px;">Hey ${firstName} from ${bizName} — welcome aboard!</h1>
          <p style="color:#475569;margin:0 0 20px;font-size:15px;line-height:1.6;">We're genuinely excited to have you as a Full Loop CRM partner. This is where ${bizName} stops running on missed calls and manual admin, and starts running itself. Here's what's about to happen for you:</p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">${whatYouGetHtml}</table>

          <div style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;margin:0 0 6px;">Your pricing</div>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:8px;">
            ${row('One-time setup (100% upfront, bank wire)', fmt(PRICING.setupFee))}
            ${row('Monthly (flat, unlimited admins &amp; team)', `${fmt(monthly)}/mo`)}
            ${row('First charge today (card verification)', '$1')}
            ${row('First-year total', fmt(firstYear), true)}
          </table>
          <p style="color:#64748b;font-size:13px;margin:0 0 22px;">The setup fee is paid by bank wire, kept separate from your card — details come right after you sign. Your monthly starts at $1 today to confirm your card works, then runs at the full rate from month two.</p>

          <div style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;margin:0 0 8px;">What you're about to sign</div>
          <p style="color:#475569;font-size:13.5px;line-height:1.7;margin:0 0 22px;">The short version, so nothing in the agreement surprises you: it's <strong>month-to-month, cancel anytime</strong> — no long-term lock-in. <strong>You own your business data and customer relationships</strong>, always. A few third-party tools (AI, texting, email, payments) run on accounts billed directly to you, at cost, no markup. And setup takes up to 30 days once you've filled out your onboarding questionnaire. The full agreement covers all of this in plain terms below.</p>

          <div style="margin:6px 0 10px;">
            <a href="${safeUrl(signUrl)}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:15px 30px;border-radius:8px;font-weight:600;font-size:15px;">Review &amp; sign →</a>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin:0 0 22px;">Takes about a minute, right from your phone. Once you sign, we countersign, and a fully-signed copy lands in your inbox — then we get to work.</p>

          <hr style="border:none;border-top:1px solid #eef2f6;margin:0 0 16px;" />
          <p style="color:#64748b;font-size:13px;margin:0 0 4px;">Any questions before you sign? Just hit reply — a real person answers.</p>
          <div style="color:#94a3b8;font-size:12px;line-height:1.6;margin-top:10px;">
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
