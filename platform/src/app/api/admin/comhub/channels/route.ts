import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { capString } from '@/lib/validate'

// POST /api/admin/comhub/channels
//   { slug, name?, description? }  — creates internal channel for the current tenant.
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const tenantId = await getCurrentTenantId()

  const body = await req.json().catch(() => null) as {
    slug?: string
    name?: string
    description?: string
  } | null
  if (!body?.slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const slug = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '')
  if (!slug) return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
  const name = capString(body.name, 200) || `#${slug}`

  const { data, error } = await supabaseAdmin
    .from('comhub_threads')
    .insert({
      tenant_id: tenantId,
      kind: 'channel',
      channel: 'internal',
      slug,
      name,
      description: capString(body.description, 2000),
      status: 'open',
    })
    .select('id, slug, name, description, kind, channel')
    .single()
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'channel with that slug already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ channel: data })
}
