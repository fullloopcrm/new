import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { notify } from '@/lib/notify'

// Internal-only — called by middleware.ts (Edge Runtime, can't run notify()
// itself: that pulls in Node-only deps) when a blocked IP hits the site
// (2026-08-10). Same trust model as every other x-tenant-id consumer: only
// middleware holds the signing secret, so a caller can't forge tenantId here
// any more than they could impersonate a tenant elsewhere.
export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const sig = req.headers.get('x-tenant-sig')
  if (!tenantId || !verifyTenantHeaderSig(tenantId, sig)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null) as { ip?: string; path?: string } | null
  const ip = body?.ip?.slice(0, 45) || 'unknown'
  const path = body?.path?.slice(0, 200) || '/'

  // One alert per tenant+IP per hour — a blocked visitor retrying the same
  // page repeatedly (or a bot hammering it) shouldn't flood staff with
  // duplicate pages/texts for a request that's already being rejected.
  const rl = await rateLimitDb(`blocked-visit-alert:${tenantId}:${ip}`, 1, 60 * 60 * 1000)
  if (!rl.allowed) return NextResponse.json({ ok: true, deduped: true })

  await notify({
    tenantId,
    type: 'security',
    title: 'Blocked visitor attempted access',
    message: `A blocked IP (${ip}) tried to load ${path}.`,
    metadata: { ip, path },
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
