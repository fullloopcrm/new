import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requireAdmin } from '@/lib/require-admin'
import { getComhubAdminTenantId as getCurrentTenantId } from '@/lib/comhub-admin-tenant'

// PATCH /api/admin/comhub/contacts/[id]/notes
//   { notes_private?: string|null, notes_public?: string|null }
// Updates the LINKED client's notes_private/notes_public columns (added by
// migration 009_nycmaid_parity_columns.sql). This previously wrote to a
// `clients.notes` column that doesn't exist, so every save 500'd.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const db = tenantDb(tenantId)
  const { id } = await ctx.params

  const body = await req.json().catch(() => null) as {
    notes_private?: string | null
    notes_public?: string | null
  } | null
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const { data: contact } = await db
    .from('comhub_contacts')
    .select('id, client_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()
  if (!contact) return NextResponse.json({ error: 'contact not found' }, { status: 404 })
  if (!contact.client_id) {
    return NextResponse.json({
      error: 'contact not linked to a client — notes are stored on the client record',
    }, { status: 409 })
  }

  // Resolve by which keys are PRESENT in the body, not by value — an explicit
  // `{ notes_private: null }` must clear the field, not be skipped because
  // `null` is nullish too.
  const patch: { notes_private?: string | null; notes_public?: string | null } = {}
  if ('notes_private' in body) patch.notes_private = body.notes_private
  if ('notes_public' in body) patch.notes_public = body.notes_public
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true, noop: true })

  // update-by-client_id GAINS a tenant filter (client_id came from a tenant-scoped contact)
  const { error } = await db
    .from('clients')
    .update(patch)
    .eq('id', contact.client_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
