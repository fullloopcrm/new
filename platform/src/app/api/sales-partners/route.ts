/**
 * Commission Sales Partners. Tenant-scoped. Ported from nycmaid
 * (sales_partners table, src/app/api/sales-partners/route.ts).
 *
 * GET ?code=... — public lookup by referral code (active partners only, no
 *                 financial fields). Used to validate a partner's share link.
 * GET (no params, admin session) — list every partner for the tenant.
 * POST (admin) — onboard a new partner: creates the row (active=false), then
 *                sends them their Commission Sales Partner Agreement to sign
 *                through the existing in-house e-sign module (documents.ts).
 *                Their PIN login (active=true gate) only starts working once
 *                that document completes -- see sales-partner-agreement.ts.
 * PUT (admin) — update tier / active / commission_rate.
 *
 * Partner's own portal data (financials, recruited referrers) lives at
 * GET /api/sales-partners/me, gated by the signed session token from
 * POST /api/sales-partners/login — never by a bare code or id, same bar the
 * referrer portal was already raised to (see referrer-portal-auth.ts).
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { generatePin, generateSalesPartnerReferralCode, hashPin } from '@/lib/sales-partner-auth'
import { buildSalesPartnerAgreementPdf } from '@/lib/sales-partner-agreement-pdf'
import { DOCUMENTS_BUCKET, documentOriginalPath, generateSignerToken, sha256Hex } from '@/lib/documents'
import { sendEmail, tenantSender } from '@/lib/email'
import { getTenantTimezone } from '@/lib/tenant-time'
import { escapeHtml } from '@/lib/escape-html'

const TIER_RATE: Record<string, number> = { standard: 0.10, tier2: 0.12, tier3: 0.15 }

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')

  if (code) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rl = await rateLimitDb(`sales-partner-lookup:${ip}`, 10, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const lookupTenant = await getTenantFromHeaders()
    if (!lookupTenant) return NextResponse.json({ error: 'Unknown business' }, { status: 400 })

    const { data } = await supabaseAdmin
      .from('sales_partners')
      .select('id, name, referral_code')
      .eq('tenant_id', lookupTenant.id)
      .eq('referral_code', code.toUpperCase())
      .eq('active', true)
      .maybeSingle()

    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  const { tenant, error: authError } = await requirePermission('sales_partners.view')
  if (authError) return authError

  const { data, error } = await supabaseAdmin
    .from('sales_partners')
    .select('id, name, email, phone, referral_code, tier, commission_rate, total_earned, total_paid, preferred_payout, zelle_email, zelle_phone, apple_cash_phone, active, approved_at, created_at, agreement_document_id, documents:agreement_document_id(status)')
    .eq('tenant_id', tenant.tenantId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Failed to fetch sales partners' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('sales_partners.manage')
    if (authError) return authError
    const { tenantId } = tenant

    const body = await request.json()
    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim()
    const phone = body.phone ? String(body.phone).trim() : null
    const tier = typeof body.tier === 'string' && ['standard', 'tier2', 'tier3'].includes(body.tier) ? body.tier : 'standard'

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const { data: tenantRow } = await supabaseAdmin
      .from('tenants')
      .select('name, slug, domain, resend_api_key, email_from, timezone')
      .eq('id', tenantId)
      .single()
    if (!tenantRow) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    // Retry a few times on a referral_code collision (sales_partners_ref_code_unique).
    let referralCode = ''
    for (let i = 0; i < 5 && !referralCode; i++) {
      const candidate = generateSalesPartnerReferralCode(name)
      const { data: existing } = await supabaseAdmin
        .from('sales_partners')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('referral_code', candidate)
        .maybeSingle()
      if (!existing) referralCode = candidate
    }
    if (!referralCode) {
      return NextResponse.json({ error: 'Could not generate a unique referral code — try again' }, { status: 500 })
    }

    const { pinHash, pinSalt } = hashPin(generatePin())

    // Created inactive — activateSalesPartnerForDocument() flips this to
    // active once the agreement below is signed (see the completion hook in
    // /api/documents/public/[token]/sign), which is what actually gates PIN
    // login (see /api/sales-partners/login).
    const { data: partner, error: pErr } = await supabaseAdmin
      .from('sales_partners')
      .insert({
        tenant_id: tenantId,
        name, email, phone,
        referral_code: referralCode,
        pin_hash: pinHash,
        pin_salt: pinSalt,
        tier,
        commission_rate: TIER_RATE[tier],
        active: false,
      })
      .select('id, name, email, referral_code, tier, commission_rate, active')
      .single()
    if (pErr || !partner) {
      return NextResponse.json({ error: pErr?.message || 'Could not create sales partner' }, { status: 500 })
    }

    const effectiveDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: getTenantTimezone(tenantRow) })
    const pdf = await buildSalesPartnerAgreementPdf({
      tenantName: tenantRow.name,
      partnerName: name,
      partnerEmail: email,
      referralCode,
      tier,
      commissionRate: TIER_RATE[tier],
      effectiveDate,
    })

    const { data: doc, error: dErr } = await supabaseAdmin
      .from('documents')
      .insert({
        tenant_id: tenantId,
        title: `Commission Sales Partner Agreement — ${name}`,
        message: 'Please review and sign your Commission Sales Partner Agreement.',
        sign_order: 'parallel',
        original_path: 'pending',
        page_count: pdf.pageCount,
      })
      .select('id')
      .single()
    if (dErr || !doc) {
      await supabaseAdmin.from('sales_partners').delete().eq('id', partner.id).eq('tenant_id', tenantId)
      return NextResponse.json({ error: dErr?.message || 'Could not create agreement document' }, { status: 500 })
    }

    const path = documentOriginalPath(tenantId, doc.id)
    const { error: upErr } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, pdf.bytes, { contentType: 'application/pdf', upsert: true })
    if (upErr) {
      await supabaseAdmin.from('documents').delete().eq('id', doc.id).eq('tenant_id', tenantId)
      await supabaseAdmin.from('sales_partners').delete().eq('id', partner.id).eq('tenant_id', tenantId)
      return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 })
    }

    const now = new Date().toISOString()
    await supabaseAdmin.from('documents').update({
      original_path: path,
      original_sha256: sha256Hex(Buffer.from(pdf.bytes)),
      status: 'sent',
      sent_at: now,
    }).eq('id', doc.id).eq('tenant_id', tenantId)

    const token = generateSignerToken()
    const { data: signer, error: sErr } = await supabaseAdmin
      .from('document_signers')
      .insert({
        tenant_id: tenantId, document_id: doc.id, order_index: 1,
        name, email, role: 'partner', public_token: token, status: 'sent', sent_at: now,
      })
      .select('id')
      .single()
    if (sErr || !signer) {
      return NextResponse.json({ error: sErr?.message || 'Could not add signer' }, { status: 500 })
    }

    const field = (type: 'signature' | 'date' | 'full_name', spot: typeof pdf.partnerSignature, required: boolean, label: string) => ({
      tenant_id: tenantId, document_id: doc.id, signer_id: signer.id, type, page: spot.page,
      x_pct: spot.xPct, y_pct: spot.yPct, w_pct: spot.wPct, h_pct: spot.hPct, required, label,
    })
    const { error: fErr } = await supabaseAdmin.from('document_fields').insert([
      field('full_name', pdf.partnerFullName, true, 'Full legal name'),
      field('signature', pdf.partnerSignature, true, 'Partner signature'),
      field('date', pdf.partnerDate, false, 'Date'),
    ])
    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 })

    await supabaseAdmin.from('sales_partners').update({ agreement_document_id: doc.id }).eq('id', partner.id).eq('tenant_id', tenantId)

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
    const proto = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
    const baseUrl = tenantRow.domain ? `https://${tenantRow.domain}` : (process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : new URL(request.url).origin))
    const signUrl = `${baseUrl}/sign/${token}`

    try {
      await sendEmail({
        to: email,
        subject: `${tenantRow.name}: your Commission Sales Partner agreement`,
        from: tenantSender(tenantRow),
        resendApiKey: tenantRow.resend_api_key,
        html: `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;">
            <h1 style="font-size:20px;margin:0 0 12px;">Welcome, ${escapeHtml(name.split(' ')[0])} — one step to activate your Sales Partner account</h1>
            <p style="color:#475569;font-size:14px;line-height:1.65;margin:0 0 14px;">Your referral code is <strong>${escapeHtml(referralCode)}</strong>. Review and sign your Commission Sales Partner Agreement to activate your portal login.</p>
            <div style="margin:0 0 22px;">
              <a href="${signUrl}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:14px 30px;border-radius:8px;font-weight:600;font-size:15px;">Review &amp; sign →</a>
            </div>
          </div>`,
      })
    } catch (e) {
      return NextResponse.json({ ok: true, partner, signUrl, warning: `Partner created but email failed: ${e instanceof Error ? e.message : 'unknown'}` })
    }

    return NextResponse.json({ ok: true, partner, signUrl })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Sales partners POST error:', err)
    return NextResponse.json({ error: 'Failed to create sales partner' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('sales_partners.manage')
    if (authError) return authError
    const { tenantId } = tenant

    const body = await request.json()
    const { id, active, tier, commission_rate } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (typeof active === 'boolean') updates.active = active
    if (typeof tier === 'string' && ['standard', 'tier2', 'tier3'].includes(tier)) updates.tier = tier
    if (typeof commission_rate === 'number' && commission_rate >= 0 && commission_rate <= 1) updates.commission_rate = commission_rate
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('sales_partners')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Sales partners PUT error:', err)
    return NextResponse.json({ error: 'Failed to update sales partner' }, { status: 500 })
  }
}
