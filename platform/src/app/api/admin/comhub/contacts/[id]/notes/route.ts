import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { tenantDb } from '@/lib/tenant-db'

// PATCH /api/admin/comhub/contacts/[id]/notes
//   { notes?: string|null }
// Updates the LINKED client's notes column. (nycmaid had notes_private/public —
// fullloop's clients table has a single `notes` column.)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const db = tenantDb(tenantId)
  const { id } = await ctx.params

  const body = await req.json().catch(() => null) as {
    notes?: string | null
    notes_private?: string | null
    notes_public?: string | null
  } | null
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const { data: contactRow } = await db
    .from('comhub_contacts')
    .select('id, client_id')
    .eq('id', id)
    .single()
  // tenantDb's select() widens the columns literal to `string`, so postgrest-js
  // can't statically parse the result shape here — cast at this boundary.
  const contact = contactRow as unknown as { id: string; client_id: string | null } | null
  if (!contact) return NextResponse.json({ error: 'contact not found' }, { status: 404 })
  if (!contact.client_id) {
    return NextResponse.json({
      error: 'contact not linked to a client — notes are stored on the client record',
    }, { status: 409 })
  }

  const notesValue = body.notes ?? body.notes_private ?? body.notes_public
  if (notesValue === undefined) return NextResponse.json({ ok: true, noop: true })

  const { error } = await db
    .from('clients')
    .update({ notes: notesValue })
    .eq('id', contact.client_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
