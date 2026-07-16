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

    // resumeUrl/portfolioFileUrl/videoUrl are free-text from this unauthenticated
    // public form and get stored verbatim in `notes` — same bug class already
    // fixed in /api/management-applications and /api/team-portal/video-upload:
    // require each to live inside this tenant's own /apply/signed-url upload
    // prefix for its type, so a forged request can't stash an arbitrary URL
    // (e.g. javascript:, or another tenant's object) for whenever this data
    // gets a link-rendering admin view.
    const uploadPrefix = (folder: string) =>
      supabaseAdmin.storage.from('uploads').getPublicUrl(`${tenant.id}/applications/${folder}/`).data.publicUrl
    const fileFields: Array<[keyof ApplyBody, string]> = [
      ['resumeUrl', uploadPrefix('resumes')],
      ['portfolioFileUrl', uploadPrefix('portfolios')],
      ['videoUrl', uploadPrefix('videos')],
    ]
    for (const [field, prefix] of fileFields) {
      const value = body[field]
      if (value != null && (typeof value !== 'string' || !value.startsWith(prefix))) {
        return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 })
      }
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
