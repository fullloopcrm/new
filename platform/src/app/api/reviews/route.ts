import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'

const PUBLIC_REVIEWS_MAX_LIMIT = 200
const PUBLIC_REVIEWS_DEFAULT_LIMIT = 100

/**
 * Public, anonymous read used by the marketing-site ReviewsList widgets
 * (nycmaid/template/legacy) — mirrors the tenant resolution reviews/submit
 * already uses (signed x-tenant-id header from middleware, no auth cookie
 * required) so anonymous visitors can actually load reviews. Only
 * status='approved' rows with real text are public; pending/rejected stay
 * moderation-only and are never exposed here.
 */
async function publicReviewsResponse(tenantId: string, request?: Request) {
  let limit = PUBLIC_REVIEWS_DEFAULT_LIMIT
  if (request) {
    try {
      const limitParam = new URL(request.url).searchParams.get('limit')
      if (limitParam) {
        const n = Number(limitParam)
        if (Number.isFinite(n) && n > 0) limit = Math.min(n, PUBLIC_REVIEWS_MAX_LIMIT)
      }
    } catch {
      // Malformed URL — keep the default limit.
    }
  }

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('id, name, rating, text, verified, images, video_url, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'approved')
    .not('text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const reviews = data || []
  const rated = reviews
    .map(r => r.rating)
    .filter((n): n is number => typeof n === 'number' && n > 0)
  const avgRating = rated.length > 0
    ? Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10
    : 5.0

  return NextResponse.json({ reviews, totalReviews: reviews.length, avgRating })
}

export async function GET(request?: Request) {
  try {
    // Authenticated dashboard/admin access (Clerk session, PIN admin, or
    // impersonation) — unchanged: every review for the tenant, any status,
    // joined with client name, for the owner's moderation queue.
    const { tenantId } = await getTenantForRequest()

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('*, clients(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reviews: data })
  } catch (e) {
    if (!(e instanceof AuthError)) throw e

    // Not an authenticated dashboard request — fall back to the same public
    // tenant-resolution path reviews/submit uses before giving up.
    const tenant = await getTenantFromHeaders()
    if (!tenant) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return publicReviewsResponse(tenant.id, request)
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json()

    const { data: fields, error: vError } = validate(body, {
      client_id: { type: 'uuid' },
      rating: { type: 'number', min: 1, max: 5 },
      comment: { type: 'string', max: 5000 },
      source: { type: 'string', max: 100 },
      status: { type: 'string', max: 50 },
    })
    if (vError || !fields) return NextResponse.json({ error: vError ?? 'Invalid request body' }, { status: 400 })

    // client_id is a caller-supplied FK — clients has no cross-tenant FK
    // check, and GET's clients(name) join on this table is unscoped by
    // tenant, so a foreign client_id would leak another tenant's client
    // name into this tenant's review list. Verify ownership before insert.
    if (fields.client_id) {
      const { data: ownedClient } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('id', fields.client_id as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!ownedClient) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .insert({ ...fields, tenant_id: tenantId })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ review: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
