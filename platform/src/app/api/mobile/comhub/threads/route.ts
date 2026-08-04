import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { listComhubThreads } from '@/lib/comhub-threads'

// Mobile-scoped equivalent of /api/admin/comhub/threads — same reasoning as
// /api/mobile/comhub/voice/token: the admin route gates on requireAdmin()
// (platform super-admin only), unreachable with the tenant owner/admin
// bearer token from /api/mobile/auth/login. Shares the actual query logic
// (contact resolution, search, unresponded filter) via lib/comhub-threads.ts
// rather than duplicating it.
export async function GET(req: NextRequest) {
  let tenantId: string
  try {
    const ctx = await getTenantForRequest()
    tenantId = ctx.tenantId
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401
    return NextResponse.json({ error: 'Unauthorized' }, { status })
  }

  const { searchParams } = new URL(req.url)
  const { threads, error } = await listComhubThreads(tenantId, {
    kind: searchParams.get('kind') || 'contact',
    status: searchParams.get('status') || 'open',
    channel: searchParams.get('channel') || 'all',
    filter: searchParams.get('filter') || 'all',
    q: (searchParams.get('q') || '').trim(),
    limit: Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200),
    offset: parseInt(searchParams.get('offset') || '0', 10) || 0,
  })
  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ threads })
}
