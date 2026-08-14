import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requireComhubAccess } from '@/lib/comhub-access'

// PATCH /api/admin/comhub/contacts/[id]
//   { name?: string|null, address?: string|null, phone?: string|null, email?: string|null }
// Edits the ComHub contact's own name/address/phone/email (works pre-client,
// for leads that haven't booked yet). When the contact is linked to a client
// or team member, the same values are mirrored onto clients.*/team_members.*
// so the rest of the CRM (bookings, client list, team roster) stays in sync
// with what admins set here.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireComhubAccess()
  if (access instanceof NextResponse) return access
  const tenantId = access.tenantId
  const db = tenantDb(tenantId)
  const { id } = await ctx.params

  const body = await req.json().catch(() => null) as {
    name?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
  } | null
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const { data: contact, error: cErr } = await db
    .from('comhub_contacts')
    .select('id, client_id, team_member_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()
  if (cErr || !contact) return NextResponse.json({ error: 'contact not found' }, { status: 404 })

  const patch: { name?: string | null; address?: string | null; phone?: string | null; email?: string | null; updated_at: string } = {
    updated_at: new Date().toISOString(),
  }
  if ('name' in body) patch.name = body.name?.trim() || null
  if ('address' in body) patch.address = body.address?.trim() || null
  if ('phone' in body) patch.phone = body.phone?.trim() || null
  if ('email' in body) patch.email = body.email?.trim() || null
  if (!('name' in patch) && !('address' in patch) && !('phone' in patch) && !('email' in patch)) {
    return NextResponse.json({ ok: true, noop: true })
  }

  const { error } = await db.from('comhub_contacts').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (contact.client_id) {
    const clientPatch: { name?: string; address?: string; phone?: string; email?: string } = {}
    if (patch.name) clientPatch.name = patch.name
    if (patch.address) clientPatch.address = patch.address
    if (patch.phone) clientPatch.phone = patch.phone
    if (patch.email) clientPatch.email = patch.email
    if (Object.keys(clientPatch).length > 0) {
      await db.from('clients').update(clientPatch).eq('id', contact.client_id)
    }
  }

  if (contact.team_member_id) {
    const teamMemberPatch: { name?: string; address?: string; phone?: string; email?: string } = {}
    if (patch.name) teamMemberPatch.name = patch.name
    if (patch.address) teamMemberPatch.address = patch.address
    if (patch.phone) teamMemberPatch.phone = patch.phone
    if (patch.email) teamMemberPatch.email = patch.email
    if (Object.keys(teamMemberPatch).length > 0) {
      await db.from('team_members').update(teamMemberPatch).eq('id', contact.team_member_id)
    }
  }

  return NextResponse.json({ ok: true })
}
