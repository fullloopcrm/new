import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requireComhubAccess } from '@/lib/comhub-access'

const VALID_TAGS = ['client', 'team', 'lead', 'potential_lead', 'spam', 'vendor', 'other'] as const
type ContactTag = typeof VALID_TAGS[number]

// PATCH /api/admin/comhub/contacts/[id]/tag
//   { tag: 'client'|'team'|'lead'|'potential_lead'|'spam'|'vendor'|'other'|null }
// Manual classification, independent of client_id/team_member_id linkage —
// unlike notes, this works on unlinked contacts (that's the whole point:
// reclassifying automated senders the auto-linker mislabeled "lead").
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireComhubAccess()
  if (access instanceof NextResponse) return access
  const tenantId = access.tenantId
  const db = tenantDb(tenantId)
  const { id } = await ctx.params

  const body = await req.json().catch(() => null) as { tag?: ContactTag | null } | null
  if (!body || !('tag' in body)) return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  if (body.tag !== null && !VALID_TAGS.includes(body.tag as ContactTag)) {
    return NextResponse.json({ error: `tag must be one of ${VALID_TAGS.join(', ')}, or null` }, { status: 400 })
  }

  const { data: contact } = await db
    .from('comhub_contacts')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()
  if (!contact) return NextResponse.json({ error: 'contact not found' }, { status: 404 })

  const { error } = await db
    .from('comhub_contacts')
    .update({ tag: body.tag, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
