import { NextRequest, NextResponse } from 'next/server'
import { requireComhubAccess } from '@/lib/comhub-access'
import { listComhubThreads } from '@/lib/comhub-threads'

// GET /api/admin/comhub/threads
//   ?kind=contact|channel|all (default contact)
//   &status=open|snoozed|closed|all (default open)
//   &channel=sms|email|voice|all (default all)
//   &filter=all|unread|unresponded (default all)
//   &q=<search>
//   &limit=50&offset=0
export async function GET(req: NextRequest) {
  const access = await requireComhubAccess()
  if (access instanceof NextResponse) return access
  const tenantId = access.tenantId

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

  return NextResponse.json({ threads: threads || [] })
}
