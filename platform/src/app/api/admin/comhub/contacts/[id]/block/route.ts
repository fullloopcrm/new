import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requireComhubAccess } from '@/lib/comhub-access'
import { setTenantIpBlocked } from '@/lib/ip-block-list'

// PATCH /api/admin/comhub/contacts/[id]/block
//   { blocked: true, reason?: string } | { blocked: false }
// Blocking a contact does two things (2026-08-10):
//   1. Flags comhub_contacts.blocked_at so every inbound channel handler
//      (webchat/SMS/email) rejects further messages from this contact, on
//      whatever identifier they come back with (phone/email/IP).
//   2. If the contact has an IP on file (anonymous webchat visitors), that
//      exact IP is also added to tenants.blocked_ips so middleware blocks
//      them from loading the site at all, not just from messaging.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireComhubAccess()
  if (access instanceof NextResponse) return access
  const tenantId = access.tenantId
  const db = tenantDb(tenantId)
  const { id } = await ctx.params

  const body = await req.json().catch(() => null) as { blocked?: boolean; reason?: string } | null
  if (!body || typeof body.blocked !== 'boolean') {
    return NextResponse.json({ error: 'blocked (boolean) is required' }, { status: 400 })
  }

  const { data: contact } = await db
    .from('comhub_contacts')
    .select('id, ip_address')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()
  if (!contact) return NextResponse.json({ error: 'contact not found' }, { status: 404 })

  const { error } = await db
    .from('comhub_contacts')
    .update({
      blocked_at: body.blocked ? new Date().toISOString() : null,
      blocked_by: body.blocked ? (access.userId ?? null) : null,
      blocked_reason: body.blocked ? (body.reason?.trim().slice(0, 500) || null) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await setTenantIpBlocked(tenantId, contact.ip_address, body.blocked)

  return NextResponse.json({ ok: true })
}
