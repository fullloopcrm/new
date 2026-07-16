/**
 * Public team/stylist job application (tenant resolved from host).
 * Writes to team_applications — the canonical table the admin reads
 * (GET /api/team-applications) and the approve→provision→PIN flow uses.
 * (Previously wrote the dead cleaner_applications table, so apps never
 * showed in admin — same bug already fixed once in /api/contact.)
 * Accepts the payload the tenant ApplicationForm already sends — no form
 * changes required.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantFromHeaders, tenantSiteUrl } from '@/lib/tenant-site'
import { notify } from '@/lib/notify'
import { escapeHtml, safeUrl } from '@/lib/escape-html'
import { emailAdmins } from '@/lib/admin-contacts'
import { sendEmail } from '@/lib/email'
import { emailShell } from '@/lib/messaging/shell'

interface ApplyBody {
  name?: string
  email?: string
  phone?: string
  specialty?: string
  position?: string
  borough?: string
  driversLicense?: string
  instagram?: string
  experience?: string
  availability?: string
  message?: string
  website?: string
  portfolioUrl?: string
  resumeUrl?: string | null
  portfolioFileUrl?: string | null
  videoUrl?: string | null
}

function buildNotes(body: ApplyBody): string {
  const lines: string[] = ['[Team application]']
  if (body.position) lines.push(`Position: ${body.position}`)
  if (body.specialty) lines.push(`Specialty: ${body.specialty}`)
  if (body.borough) lines.push(`Preferred area: ${body.borough}`)
  if (body.driversLicense) lines.push(`Driver's license: ${body.driversLicense}`)
  if (body.instagram) lines.push(`Instagram: ${body.instagram}`)
  if (body.website) lines.push(`Website: ${body.website}`)
  if (body.portfolioUrl) lines.push(`Portfolio link: ${body.portfolioUrl}`)
  if (body.portfolioFileUrl) lines.push(`Portfolio file: ${body.portfolioFileUrl}`)
  if (body.resumeUrl) lines.push(`Resume: ${body.resumeUrl}`)
  if (body.videoUrl) lines.push(`Video selfie: ${body.videoUrl}`)
  if (body.message) lines.push('', body.message.trim())
  return lines.join('\n').trim()
}

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`apply:${tenant.id}:${ip}`, 3, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })
  }

  try {
    const body = (await request.json()) as ApplyBody
    const name = body.name?.trim()
    const phone = body.phone?.trim()

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required.' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\D/g, '')

    const { data, error } = await supabaseAdmin
      .from('team_applications')
      .insert({
        tenant_id: tenant.id,
        name,
        email: body.email?.trim().toLowerCase() || null,
        phone: cleanPhone,
        experience: body.experience || null,
        availability: body.availability || null,
        notes: buildNotes(body),
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    await notify({
      tenantId: tenant.id,
      type: 'cleaner_application',
      title: 'New Team Application',
      message: `${escapeHtml(name)} • ${escapeHtml(body.specialty || body.position || 'general')} • ${escapeHtml(body.experience || '?')}`,
    }).catch((err) => console.error('[apply] notify failed:', err))

    // Email the tenant's admins too (mirrors /api/lead + /api/contact). notify()
    // alone only fires when an owner tenant_member has an email; emailAdmins
    // also falls back to tenant.email, so this reaches the inbox even for
    // tenants with no member rows (e.g. nyc-mobile-salon had zero). Non-blocking.
    const email = body.email?.trim().toLowerCase() || null
    try {
      const adminUrl = `${tenantSiteUrl(tenant)}/admin/team/applications`
      const subject = `[${tenant.name}] New job application: ${name}`
      const notes = buildNotes(body)
      const html = `<h2>New Job Application</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${email ? escapeHtml(email) : '—'}</p>
        <p><strong>Phone:</strong> ${escapeHtml(cleanPhone)}</p>
        ${notes ? `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(notes)}</pre>` : ''}
        <p><a href="${safeUrl(adminUrl)}">View in admin</a></p>`
      await emailAdmins(tenant, subject, html)
    } catch (emailErr) {
      console.error('[apply] admin email error:', emailErr)
    }

    // Applicant confirmation — same pattern as /api/lead's job-application path.
    try {
      if (email) {
        const t = tenant as Record<string, unknown>
        const html = emailShell({
          brand: {
            name: tenant.name,
            phone: (t.phone as string) || null,
            email: (t.email as string) || null,
            address: (t.address as string) || null,
            logoUrl: tenant.logo_url || null,
            primaryColor: tenant.primary_color || null,
          },
          heading: `Thanks for applying, ${name.split(' ')[0]}`,
          bodyHtml: `<p>We received your application and our team will review it and follow up shortly. If you need to reach us, just reply to this email${t.phone ? ` or call ${t.phone}` : ''}.</p>`,
          preheader: 'We received your application',
        })
        await sendEmail({
          to: email,
          subject: `We received your application — ${tenant.name}`,
          html,
          resendApiKey: (t.resend_api_key as string) || undefined,
          from: (t.email_from as string) || undefined,
        })
      }
    } catch (ackErr) {
      console.error('[apply] applicant confirmation error:', ackErr)
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    console.error('POST /api/apply error:', err)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
