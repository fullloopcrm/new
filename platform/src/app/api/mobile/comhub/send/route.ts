import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { sendComhubMessage, type SendComhubMessageBody } from '@/lib/comhub-send'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

// POST /api/mobile/comhub/send — mobile-scoped equivalent of
// /api/admin/comhub/send. That route gates on requireAdmin() (platform
// SUPER-ADMIN only), unreachable with the tenant owner/admin bearer token
// minted by /api/mobile/unified-login (same reasoning as
// /api/mobile/comhub/threads and /api/mobile/comhub/voice/token). Uses
// getTenantForRequest() instead — role is already owner/admin-only because
// /api/mobile/unified-login's admin resolver rejected anything else at
// login time, and getTenantForRequest() re-checks the member's current role
// live on every request (instant revocation), so no separate role check is
// needed here.
//
// Send logic itself lives in lib/comhub-send.ts, shared with the admin
// route rather than duplicated — same reasoning as comhub-threads.ts for
// the GET list route.
//
// author_id is deliberately NOT read from the request body the way the
// admin route reads it — that route trusts a caller-supplied author_id
// because it's already gated by platform admin auth. Here we have a real
// authenticated tenant_members id from the bearer token, so we use that
// instead of trusting client input for who is speaking.
export const OPTIONS = corsPreflight

export const POST = withMobileCors(async function POST(req: NextRequest) {
  let tenantId: string
  let authorId: string
  let tenant: Awaited<ReturnType<typeof getTenantForRequest>>['tenant']
  try {
    const ctx = await getTenantForRequest()
    tenantId = ctx.tenantId
    authorId = ctx.userId
    tenant = ctx.tenant
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401
    return NextResponse.json({ error: 'Unauthorized' }, { status })
  }

  const body = (await req.json().catch(() => null)) as SendComhubMessageBody | null
  if (!body) {
    return NextResponse.json({ error: 'channel and body are required' }, { status: 400 })
  }

  const result = await sendComhubMessage(tenantId, tenant, body, 'admin', authorId)
  return NextResponse.json(result.json, { status: result.status })
})
