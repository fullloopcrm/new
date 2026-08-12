import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { listComhubThreads } from '@/lib/comhub-threads'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

// Mobile-scoped equivalent of /api/admin/comhub/threads — same query logic
// via lib/comhub-threads.ts, different auth: the admin route gates on
// requireAdmin() (platform super-admin only), which the tenant owner/admin
// mobile bearer token can't satisfy. getTenantForRequest() already resolves
// that bearer token (see lib/tenant-query.ts's mobile bearer-token branch).
export const OPTIONS = corsPreflight

export const GET = withMobileCors(async function GET(req: NextRequest) {
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
  if (error) return NextResponse.json({ error: 'Failed to load threads' }, { status: 500 })

  return NextResponse.json({ threads: threads || [] })
})
