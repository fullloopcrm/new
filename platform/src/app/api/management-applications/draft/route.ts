/**
 * Draft save/load for the management application form. Public routes — tenant
 * resolved from the host header. Keyed by (tenant, ip, position).
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'

function getIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function GET(request: NextRequest) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ draft: null })

  const ip = getIp(request)
  if (ip === 'unknown') return NextResponse.json({ draft: null })

  const position = request.nextUrl.searchParams.get('position') || 'operations-coordinator'

  const { data } = await supabaseAdmin
    .from('management_application_drafts')
    .select('form_data, photo_url, video_url, resume_url, updated_at')
    .eq('tenant_id', tenant.id)
    .eq('ip_address', ip)
    .eq('position', position)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ draft: data })
}

export async function POST(request: NextRequest) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })

  const ip = getIp(request)
  if (ip === 'unknown') return NextResponse.json({ error: 'Cannot identify client' }, { status: 400 })

  try {
    const { form_data, photo_url, video_url, resume_url, position } = await request.json()

    const { error } = await supabaseAdmin
      .from('management_application_drafts')
      .upsert(
        {
          tenant_id: tenant.id,
          ip_address: ip,
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

  const ip = getIp(request)
  if (ip === 'unknown') return NextResponse.json({ ok: true })

  const position = request.nextUrl.searchParams.get('position') || 'operations-coordinator'
  await supabaseAdmin
    .from('management_application_drafts')
    .delete()
    .eq('tenant_id', tenant.id)
    .eq('ip_address', ip)
    .eq('position', position)

  return NextResponse.json({ ok: true })
}
