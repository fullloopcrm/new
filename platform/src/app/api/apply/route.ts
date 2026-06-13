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
  instagram?: string
  experience?: string
  availability?: string
  message?: string
  website?: string
  videoUrl?: string | null
}

function buildNotes(body: ApplyBody): string {
  const lines: string[] = ['[Stylist / team application]']
  if (body.specialty) lines.push(`Specialty: ${body.specialty}`)
  if (body.instagram) lines.push(`Instagram: ${body.instagram}`)
  if (body.website) lines.push(`Website: ${body.website}`)
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
      message: `${name} • ${body.specialty || 'general'} • ${body.experience || '?'}`,
    }).catch((err) => console.error('[apply] notify failed:', err))

    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    console.error('POST /api/apply error:', err)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
