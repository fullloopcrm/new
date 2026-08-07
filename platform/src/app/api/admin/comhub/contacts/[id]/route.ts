import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requireComhubAccess } from '@/lib/comhub-access'

// PATCH /api/admin/comhub/contacts/[id]
//   { name?: string|null, address?: string|null }
// Edits the ComHub contact's own name/address (works pre-client, for leads
// that haven't booked yet). When the contact is linked to a client, the same
// values are mirrored onto clients.name/clients.address so the rest of the
// CRM (bookings, client list) stays in sync with what admins set here.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireComhubAccess()
  if (access instanceof NextResponse) return access
  const tenantId = access.tenantId
  const db = tenantDb(tenantId)
  const { id } = await ctx.params

  const body = await req.json().catch(() => null) as {
    name?: string | null
    address?: string | null
  } | null
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const { data: contact, error: cErr } = await db
    .from('comhub_contacts')
    .select('id, client_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()
  if (cErr || !contact) return NextResponse.json({ error: 'contact not found' }, { status: 404 })

  const patch: { name?: string | null; address?: string | null; updated_at: string } = {
    updated_at: new Date().toISOString(),
  }
  if ('name' in body) patch.name = body.name?.trim() || null
  if ('address' in body) patch.address = body.address?.trim() || null
  if (!('name' in patch) && !('address' in patch)) return NextResponse.json({ ok: true, noop: true })

  const { error } = await db.from('comhub_contacts').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (contact.client_id) {
    const clientPatch: { name?: string; address?: string } = {}
    if (patch.name) clientPatch.name = patch.name
    if (patch.address) clientPatch.address = patch.address
    if (Object.keys(clientPatch).length > 0) {
      await db.from('clients').update(clientPatch).eq('id', contact.client_id)
    }
  }

  return NextResponse.json({ ok: true })
}
