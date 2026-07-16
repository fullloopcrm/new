/**
 * Draft save/load for the management application form. Public routes — tenant
 * resolved from the host header.
 *
 * SECURITY: previously keyed by (tenant, ip_address, position) alone. Any two
 * applicants sharing a public IP (mobile-carrier CGNAT, campus/corporate NAT,
 * coffee-shop wifi, VPN exit node — all common) collided on the same row:
 * GET returned the OTHER applicant's name/email/phone/location/references
 * plus their uploaded photo/video, and POST/DELETE could overwrite or wipe
 * their in-progress draft. Fixed by keying on an opaque client_id the browser
 * generates once and persists (localStorage) instead of the IP wherever the
 * caller supplies one — falls back to IP only if no client_id is given (e.g.
 * JS disabled), matching the prior (weaker) behavior rather than breaking the
 * feature outright. No schema change: the random client_id is stored in the
 * existing `ip_address` column, which was already just an opaque dedup key,
 * never validated as an actual IP shape.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getRequestIp, resolveVisitorKey } from '@/lib/apply-visitor-key'

export async function GET(request: NextRequest) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ draft: null })

  const ip = getRequestIp(request)
  const visitorKey = resolveVisitorKey(request.nextUrl.searchParams.get('client_id'), ip)
  if (!visitorKey) return NextResponse.json({ draft: null })

  const position = request.nextUrl.searchParams.get('position') || 'operations-coordinator'

  const { data } = await supabaseAdmin
    .from('management_application_drafts')
    .select('form_data, photo_url, video_url, resume_url, updated_at')
    .eq('tenant_id', tenant.id)
    .eq('ip_address', visitorKey)
    .eq('position', position)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ draft: data })
}

export async function POST(request: NextRequest) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })

  const ip = getRequestIp(request)
  if (ip === 'unknown') return NextResponse.json({ error: 'Cannot identify client' }, { status: 400 })

  const rl = await rateLimitDb(`mgmt-draft:${ip}`, 30, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Saving too fast. Slow down.' }, { status: 429 })
  }

  try {
    const { form_data, photo_url, video_url, resume_url, position, client_id } = await request.json()
    const visitorKey = resolveVisitorKey(client_id, ip)
    if (!visitorKey) return NextResponse.json({ error: 'Cannot identify client' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('management_application_drafts')
      .upsert(
        {
          tenant_id: tenant.id,
          ip_address: visitorKey,
          position: position || 'operations-coordinator',
          form_data,
          photo_url: photo_url || null,
          video_url: video_url || null,
          resume_url: resume_url || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,ip_address,position' }
      )

    if (error) {
      console.error('[mgmt-app-draft] save error:', error)
      return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mgmt-app-draft] save error:', err)
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ ok: true })

  const ip = getRequestIp(request)
  const visitorKey = resolveVisitorKey(request.nextUrl.searchParams.get('client_id'), ip)
  if (!visitorKey) return NextResponse.json({ ok: true })

  const position = request.nextUrl.searchParams.get('position') || 'operations-coordinator'
  await supabaseAdmin
    .from('management_application_drafts')
    .delete()
    .eq('tenant_id', tenant.id)
    .eq('ip_address', visitorKey)
    .eq('position', position)

  return NextResponse.json({ ok: true })
}
