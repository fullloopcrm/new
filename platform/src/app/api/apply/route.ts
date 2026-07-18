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
import { verifyUploadedObjectSize } from '@/lib/storage-size-guard'

// Mirrors apply/signed-url's ALLOWED_TYPES maxSize per field — that route can't
// enforce it at sign-time (createSignedUploadUrl has no size param), so it's
// enforced here instead, against the object that actually landed in storage.
const FILE_FIELD_MAX_SIZE: Record<'resumeUrl' | 'portfolioFileUrl' | 'videoUrl', number> = {
  resumeUrl: 10 * 1024 * 1024,
  portfolioFileUrl: 50 * 1024 * 1024,
  videoUrl: 100 * 1024 * 1024,
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

    // resumeUrl/portfolioFileUrl/videoUrl are free-text from this unauthenticated
    // public form and get stored verbatim in `notes` — same bug class already
    // fixed in /api/management-applications and /api/team-portal/video-upload:
    // require each to live inside this tenant's own /apply/signed-url upload
    // prefix for its type, so a forged request can't stash an arbitrary URL
    // (e.g. javascript:, or another tenant's object) for whenever this data
    // gets a link-rendering admin view.
    const bucketBase = supabaseAdmin.storage.from('uploads').getPublicUrl('').data.publicUrl
    const uploadPrefix = (folder: string) =>
      supabaseAdmin.storage.from('uploads').getPublicUrl(`${tenant.id}/applications/${folder}/`).data.publicUrl
    const fileFields: Array<[keyof typeof FILE_FIELD_MAX_SIZE, string]> = [
      ['resumeUrl', uploadPrefix('resumes')],
      ['portfolioFileUrl', uploadPrefix('portfolios')],
      ['videoUrl', uploadPrefix('videos')],
    ]
    for (const [field, prefix] of fileFields) {
      const value = body[field]
      if (value == null) continue
      if (typeof value !== 'string' || !value.startsWith(prefix)) {
        return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 })
      }
      // createSignedUploadUrl has no size cap, so the ALLOWED_TYPES maxSize on
      // apply/signed-url is never actually enforced at upload time — verify
      // the object that landed against it here instead of trusting it.
      const objectPath = value.slice(bucketBase.length)
      const withinSize = await verifyUploadedObjectSize('uploads', objectPath, FILE_FIELD_MAX_SIZE[field])
      if (!withinSize) {
        return NextResponse.json({ error: `${field} is missing or exceeds the size limit` }, { status: 400 })
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
