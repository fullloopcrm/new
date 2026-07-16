import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'

// PATCH /api/admin/comhub/contacts/[id]/notes
//   { notes?: string|null }
// Updates the LINKED client's notes column. (nycmaid had notes_private/public —
// fullloop's clients table has a single `notes` column.)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const { id } = await ctx.params

  const body = await req.json().catch(() => null) as {
    notes?: string | null
    notes_private?: string | null
    notes_public?: string | null
  } | null
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const { data: contact } = await supabaseAdmin
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

  // Resolve by which key is PRESENT in the body, not by value — an explicit
  // `{ notes: null }` must clear the field, not fall through to the next key
  // because `null` is nullish too.
  const notesValue =
    'notes' in body ? body.notes
    : 'notes_private' in body ? body.notes_private
    : 'notes_public' in body ? body.notes_public
    : undefined
  if (notesValue === undefined) return NextResponse.json({ ok: true, noop: true })

  const { error } = await supabaseAdmin
    .from('clients')
    .update({ notes: notesValue })
    .eq('id', contact.client_id)
    .eq('tenant_id', tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
