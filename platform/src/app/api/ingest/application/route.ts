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
import { rateLimitDb } from '@/lib/rate-limit-db'

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

function secretMatches(provided: string | null): boolean {
  const expected = process.env.INGEST_SECRET
  if (!expected || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  // This endpoint is gated by one INGEST_SECRET shared across every
  // standalone tenant site, with no per-caller identity — nothing else
  // bounds how many times an attacker can try to guess it. failClosed:true
  // so a rate-limiter DB outage denies instead of opening unlimited secret
  // brute-force / insert-spam. Keyed by IP, checked before the secret so a
  // guessing attempt still counts against the caller even when it's wrong.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`ingest-application:${ip}`, 30, 10 * 60 * 1000, { failClosed: true })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

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

  const name = body.name?.trim()
  const phone = body.phone?.trim()
  if (!name || !phone) {
    return NextResponse.json({ error: 'name and phone are required' }, { status: 400 })
  }
  const cleanPhone = phone.replace(/\D/g, '')

  try {
    // Dedup: a retry or backfill overlap should not create a second row for
    // the same applicant. Match on tenant + phone + name (case-insensitive).
    if (cleanPhone) {
      const { data: existing } = await supabaseAdmin
        .from('team_applications')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('phone', cleanPhone)
        .ilike('name', name)
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
        address: body.address?.trim() || null,
        experience: body.experience || null,
        availability: body.availability || null,
        referral_source: body.referral_source || body.source || null,
        references: body.references || null,
        notes: body.notes || null,
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
