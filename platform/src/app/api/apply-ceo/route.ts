/**
 * Public founding-CEO / management application (tenant resolved from host).
 * Writes to management_applications and notifies admins. Accepts the payload
 * the tenant FoundingCEOApplicationForm already sends — no form changes.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { notify } from '@/lib/notify'
import { sendEmail } from '@/lib/email'
import { escapeHtml } from '@/lib/escape-html'
import { maxLengthError } from '@/lib/validate'

interface CeoBody {
  name?: string
  email?: string
  phone?: string
  linkedinUrl?: string
  location?: string
  currentRole?: string
  currentCompany?: string
  yearsExperience?: string
  marketplaceBackground?: string
  otherPlatforms?: string
  plExperience?: string
  teamSize?: string
  biggestScale?: string
  whySweatEquity?: string
  plan306090?: string
  anythingElse?: string
  website?: string
  videoUrl?: string | null
  resumeUrl?: string | null
}

function buildNotes(body: CeoBody): string {
  const lines: string[] = []
  if (body.linkedinUrl) lines.push(`LinkedIn: ${body.linkedinUrl}`)
  if (body.currentCompany) lines.push(`Current company: ${body.currentCompany}`)
  if (body.marketplaceBackground) lines.push(`Marketplace background: ${body.marketplaceBackground}`)
  if (body.otherPlatforms) lines.push(`Other platforms: ${body.otherPlatforms}`)
  if (body.plExperience) lines.push(`P&L experience: ${body.plExperience}`)
  if (body.biggestScale) lines.push(`Biggest scale: ${body.biggestScale}`)
  if (body.plan306090) lines.push('', '30/60/90 plan:', body.plan306090.trim())
  if (body.anythingElse) lines.push('', 'Anything else:', body.anythingElse.trim())
  if (body.website) lines.push('', `Website: ${body.website}`)
  return lines.join('\n').trim()
}

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`apply_ceo:${tenant.id}:${ip}`, 3, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })
  }

  try {
    const body = (await request.json()) as CeoBody
    const name = body.name?.trim()
    const email = body.email?.trim().toLowerCase()
    const phone = body.phone?.trim()

    if (!name || !email || !phone) {
      return NextResponse.json({ error: 'Name, email, and phone are required.' }, { status: 400 })
    }

    // rateLimitDb above bounds request COUNT, not the SIZE of this
    // questionnaire's long-form free-text answers -- see maxLengthError's
    // doc comment. This form has 7 such fields (vs. the single `message`
    // field on sibling public forms), all folded into buildNotes() below.
    const lenErr = maxLengthError({
      marketplaceBackground: body.marketplaceBackground,
      otherPlatforms: body.otherPlatforms,
      plExperience: body.plExperience,
      biggestScale: body.biggestScale,
      whySweatEquity: body.whySweatEquity,
      plan306090: body.plan306090,
      anythingElse: body.anythingElse,
    })
    if (lenErr) return NextResponse.json({ error: lenErr }, { status: 400 })

    const cleanPhone = phone.replace(/\D/g, '')

    const { data, error } = await supabaseAdmin
      .from('management_applications')
      .insert({
        tenant_id: tenant.id,
        position: 'founding-ceo',
        name,
        email,
        phone: cleanPhone,
        location: body.location || null,
        current_role: body.currentRole || null,
        years_experience: body.yearsExperience || null,
        management_experience: body.teamSize || null,
        why_this_role: body.whySweatEquity || null,
        notes: buildNotes(body),
        resume_url: body.resumeUrl || null,
        video_url: body.videoUrl || null,
        photo_url: null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    await notify({
      tenantId: tenant.id,
      type: 'new_lead',
      title: 'New Founding CEO Application',
      message: `${escapeHtml(name)} applied for founding-ceo`,
      channel: 'email',
      recipientType: 'admin',
      metadata: { name, email, phone: cleanPhone, resume_url: body.resumeUrl, video_url: body.videoUrl },
    }).catch((err) => console.error('[apply-ceo] notify failed:', err))

    // Applicant confirmation — per-tenant opt-in (selena_config), sent from the
    // tenant's verified email_from. Non-blocking: never fail the submission.
    const cfg = (tenant.selena_config ?? {}) as Record<string, unknown>
    if (email && cfg.lead_confirmation_enabled === true) {
      const color = (tenant as { primary_color?: string | null }).primary_color || '#111111'
      const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
        <h2 style="color:${color};margin:0 0 12px">Thanks for applying, ${escapeHtml(name.split(' ')[0])}!</h2>
        <p style="font-size:15px;line-height:1.5;margin:0 0 12px">We received your Founding CEO application and the founder will personally review it and follow up soon.</p>
        <p style="font-size:14px;color:#555;margin:16px 0 0">— The ${escapeHtml(tenant.name)} team</p>
      </div>`
      await sendEmail({
        to: email,
        from: (tenant as { email_from?: string | null }).email_from || undefined,
        resendApiKey: (tenant as { resend_api_key?: string | null }).resend_api_key,
        subject: `We received your application — ${tenant.name}`,
        html,
      }).catch((err) => console.error('[apply-ceo] applicant confirmation failed:', err))
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    console.error('POST /api/apply-ceo error:', err)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
