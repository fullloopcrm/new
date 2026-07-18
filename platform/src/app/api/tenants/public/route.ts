import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  // Lowercase — slugs are always generated lowercase (slugify()/toSlug() in
  // every tenant-creation path, per tenant.ts/tenant-lookup.ts's shared
  // resolver contract), but this route hand-rolls its own tenants.slug
  // lookup instead of going through that resolver, so it never inherited the
  // normalization fix — a mixed-case slug (this route's only caller,
  // /apply/[slug], reads it straight from the URL path param with no
  // normalization) would silently 404 "Business not found" for a real
  // tenant's job-application page.
  const cleanSlug = slug.toLowerCase()

  // maybeSingle() (not single()), error checked explicitly — same
  // masked-error pattern already fixed on the canonical resolver
  // (tenant.ts/tenant-lookup.ts) and its other hand-rolled twins
  // (portal/auth, team-portal/auth, sales-applications, team-applications):
  // slug is UNIQUE NOT NULL at the DB level, so 0 rows legitimately means
  // "unknown business" — the expected case, not an error. single() can't
  // tell that apart from a genuine DB failure (both surface as data:null),
  // so a real outage here used to look identical to "Business not found"
  // instead of surfacing loud.
  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, logo_url')
    .eq('slug', cleanSlug)
    .maybeSingle()

  if (error) {
    console.error(`TENANTS_PUBLIC_SLUG_LOOKUP_ERROR slug=${cleanSlug} error=${error.message}`)
    return NextResponse.json({ error: 'Unable to look up business. Please try again.' }, { status: 500 })
  }

  if (!tenant) {
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
