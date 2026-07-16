/**
 * Public team/stylist job application (tenant resolved from host).
 * Writes to cleaner_applications and notifies admins. Accepts the payload
 * the tenant ApplicationForm already sends — no form changes required.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { notify } from '@/lib/notify'
import { verifySignedUpload, type UploadTypeConfig } from '@/lib/verify-signed-upload'

// Mirrors the ALLOWED_TYPES allow-list in the sibling signed-url endpoint.
const UPLOAD_CONFIGS: Record<string, UploadTypeConfig> = {
  resumes: { mimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], maxSize: 10 * 1024 * 1024 },
  videos: { mimes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'], maxSize: 100 * 1024 * 1024 },
  portfolios: { mimes: ['application/pdf'], maxSize: 50 * 1024 * 1024 },
}

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

    // resumeUrl/portfolioFileUrl/videoUrl are expected to come from the
    // signed-upload flow (/api/apply/signed-url) and are shown to admins as
    // clickable links in the applicant's notes. Nothing previously checked
    // that these are real objects under this tenant's own upload prefix —
    // an unauthenticated applicant could submit any string, or a URL to an
    // object PUT straight to a signed URL with an oversized/wrongly-typed
    // body bypassing the signed-url endpoint's own type/size check. Same
    // verification now applied to the sibling application forms
    // (management-applications, apply-ceo, sales-applications).
    for (const [folder, url] of [
      ['resumes', body.resumeUrl],
      ['portfolios', body.portfolioFileUrl],
      ['videos', body.videoUrl],
    ] as const) {
      if (!url) continue
      const result = await verifySignedUpload('uploads', `${tenant.id}/applications/${folder}`, url, UPLOAD_CONFIGS[folder])
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\D/g, '')

    const { data, error } = await supabaseAdmin
      .from('cleaner_applications')
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
      message: `${name} • ${body.specialty || body.position || 'general'} • ${body.experience || '?'}`,
    }).catch((err) => console.error('[apply] notify failed:', err))

    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    console.error('POST /api/apply error:', err)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
