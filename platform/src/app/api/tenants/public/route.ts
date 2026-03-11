import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, logo_url')
    .eq('slug', slug)
    .single()

  if (error || !tenant) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  return NextResponse.json({
    tenant: {
      name: tenant.name,
      slug: tenant.slug,
      logo_url: tenant.logo_url,
    },
  })
}
