/**
 * IndexNow instant-indexing bridge (Bing, Yahoo, DuckDuckGo, Yandex).
 * Per-tenant: each tenant uses its own key stored in selena_config.indexnow_key.
 * The tenant's site hosts /api/indexnow?key=... for ownership verification.
 *
 * GET /api/indexnow?key=... — ownership-verification callback (tenant from host).
 * POST /api/indexnow — submit URLs. Bearer CRON_SECRET OR tenant-scoped admin.
 *   body: { tenantId?, urls: string[] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 404 })

  // Tenant inferred from host. Match against the tenant's stored indexnow_key.
  const tenant = await getTenantFromHeaders()
  const tenantKey = (tenant?.selena_config as Record<string, unknown> | null)?.indexnow_key as string | undefined
  if (tenantKey && key === tenantKey) {
    return new NextResponse(key, { headers: { 'Content-Type': 'text/plain' } })
  }
  return NextResponse.json({ error: 'Invalid key' }, { status: 404 })
}

export async function POST(request: NextRequest) {
  // Two auth modes:
  //   1. Cron-style: Bearer CRON_SECRET + tenantId in body.
  //   2. Admin session via getTenantForRequest().
  let tenantId: string | null = null
  const authHeader = request.headers.get('authorization')
  if (authHeader && process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    const body = await request.clone().json().catch(() => ({}))
    tenantId = body.tenantId || null
  } else {
    try {
      const ctx = await getTenantForRequest()
      tenantId = ctx.tenantId
    } catch (e) {
      if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
      throw e
    }
  }
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const urls: string[] = Array.isArray(body.urls) ? body.urls : []
  if (urls.length === 0) return NextResponse.json({ error: 'No URLs provided' }, { status: 400 })

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('domain, selena_config')
    .eq('id', tenantId)
    .single()

  if (!tenant?.domain) return NextResponse.json({ error: 'Tenant has no domain configured' }, { status: 400 })
  const indexnowKey = (tenant.selena_config as Record<string, unknown> | null)?.indexnow_key as string | undefined
  if (!indexnowKey) return NextResponse.json({ error: 'Tenant missing selena_config.indexnow_key' }, { status: 400 })

  const host = tenant.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        key: indexnowKey,
        keyLocation: `https://${host}/api/indexnow?key=${indexnowKey}`,
        urlList: urls.slice(0, 10000),
      }),
    })

    return NextResponse.json({ success: true, status: res.status, submitted: urls.length })
  } catch (err) {
    console.error('[indexnow] submission error:', err)
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  }
}
