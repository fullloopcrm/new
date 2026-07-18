/**
 * Cross-site application ingest (shared by every standalone tenant site).
 *
 * Standalone tenant sites (wepayyoujunk, etc.) run their own Next.js app and
 * historically wrote applications only to their own DB + email. This route is
 * the single public sink that funnels their job applications into FullLoop's
 * `team_applications` table, scoped by `tenant_slug`.
 *
 * Auth: a shared `INGEST_SECRET` (header `x-ingest-secret`). This secret can
 * ONLY insert applications via this route — it is not the service-role key,
 * so a compromised site cannot read or mutate other tenant data.
 *
 * Public route: must be listed in middleware `isPublicRoute` (`/api/ingest(.*)`).
 */
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantBySlug } from '@/lib/tenant-lookup'
import { notify } from '@/lib/notify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface IngestBody {
  tenant_slug?: string
  name?: string
  email?: string
  phone?: string
  address?: string
  experience?: string
  availability?: string
  referral_source?: string
  references?: string
  notes?: string
  photo_url?: string
  source?: string
}

// The caller here is a sibling standalone site's own public application form
// relay, not a trusted operator — `name` and the free-text fields below are
// ultimately applicant-controlled. Cap both so a single request can't balloon
// the row (or, downstream, an admin SMS built from the resulting team
// member's name — see smsLateCheckInAdmin/smsLateCheckOutAdmin/
// smsRunningLateAdmin) to megabytes of chosen content. Mirrors the
// authenticated /api/clients name cap (200) and the /api/prospects/waitlist
// notes cap (2000).
const MAX_NAME = 200
const MAX_TEXT = 2000
const capText = (v: string | undefined | null, max = MAX_TEXT): string | null => {
  const t = v?.trim()
  return t ? t.slice(0, max) : null
}

function secretMatches(provided: string | null): boolean {
  const expected = process.env.INGEST_SECRET
  if (!expected || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// Escape LIKE/ILIKE wildcards so the dedup lookup only ever matches the
// literal name (Postgres default LIKE escape char is backslash). Same
// pattern already fixed on /api/referrers, /api/client/check, /api/pin-reset.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get('x-ingest-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: IngestBody
  try {
    body = (await request.json()) as IngestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const slug = body.tenant_slug?.trim()
  if (!slug) {
    return NextResponse.json({ error: 'tenant_slug is required' }, { status: 400 })
  }

  const tenant = await getTenantBySlug(slug)
  if (!tenant) {
    return NextResponse.json({ error: `Unknown tenant: ${slug}` }, { status: 400 })
  }

  const name = body.name?.trim().slice(0, MAX_NAME)
  const phone = body.phone?.trim()
  if (!name || !phone) {
    return NextResponse.json({ error: 'name and phone are required' }, { status: 400 })
  }
  const cleanPhone = phone.replace(/\D/g, '')

  // photo_url comes from the calling standalone site's own storage (this
  // route funnels applications from external tenant sites, so it can't be
  // checked against a FullLoop storage-bucket prefix like the direct
  // /api/team-applications route does). It's still stored verbatim and
  // rendered as <img src={app.photo_url}> in the admin dashboard
  // (dashboard/team/page.tsx), so a caller holding INGEST_SECRET could
  // otherwise stash an arbitrary value there. Require a plain http(s) URL.
  if (body.photo_url !== undefined && body.photo_url !== null) {
    if (typeof body.photo_url !== 'string' || !/^https?:\/\//i.test(body.photo_url)) {
      return NextResponse.json({ error: 'Invalid photo_url' }, { status: 400 })
    }
  }

  try {
    // Dedup: a retry or backfill overlap should not create a second row for
    // the same applicant. Match on tenant + phone + name (case-insensitive).
    if (cleanPhone) {
      const { data: existing } = await supabaseAdmin
        .from('team_applications')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('phone', cleanPhone)
        .ilike('name', escapeLike(name))
        .limit(1)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({ success: true, id: existing.id, deduped: true })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('team_applications')
      .insert({
        tenant_id: tenant.id,
        name,
        email: body.email?.trim().toLowerCase() || null,
        phone: cleanPhone,
        address: capText(body.address, MAX_NAME),
        experience: capText(body.experience),
        availability: capText(body.availability, MAX_NAME),
        referral_source: capText(body.referral_source || body.source, MAX_NAME),
        references: capText(body.references),
        notes: capText(body.notes),
        photo_url: body.photo_url || null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) throw error

    await notify({
      tenantId: tenant.id,
      type: 'cleaner_application',
      title: 'New Team Application',
      message: `${name} • ${body.experience || '?'} • ${tenant.name}`,
    }).catch((err) => console.error('[ingest/application] notify failed:', err))

    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    console.error('[ingest/application] error:', err)
    return NextResponse.json({ error: 'Failed to ingest application' }, { status: 500 })
  }
}
