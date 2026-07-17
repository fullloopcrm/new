import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { protectClientAPI } from '@/lib/client-auth'

// Backed by clients.special_instructions — the column team-portal/jobs and
// team/page.tsx actually read as the client's standing note for the cleaner
// (door codes, pet info, etc). clients.notes is a DIFFERENT column: the
// operator-only field admin edits via the dashboard client form. This route
// (the per-tenant client-dashboard sibling of the already-fixed
// /api/portal/notes) used to read/write .notes, meaning (a) whatever the
// client typed here never reached the cleaner, and (b) the client could read
// and silently overwrite the admin's private notes.
export async function GET(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  if (!clientId) return NextResponse.json({ error: 'Missing client_id' }, { status: 400 })

  const auth = await protectClientAPI(tenant.id, clientId)
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('special_instructions')
    .eq('id', clientId)
    .eq('tenant_id', tenant.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  return NextResponse.json({ notes: data.special_instructions || '' })
}

export async function PUT(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const { client_id, notes } = body as { client_id?: string; notes?: unknown }
  if (!client_id) return NextResponse.json({ error: 'Missing client_id' }, { status: 400 })

  const auth = await protectClientAPI(tenant.id, client_id)
  if (auth instanceof NextResponse) return auth

  if (typeof notes !== 'string' || notes.length > 500) {
    return NextResponse.json({ error: 'Notes must be a string of 500 characters or less' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('clients')
    .update({ special_instructions: notes })
    .eq('id', client_id)
    .eq('tenant_id', tenant.id)

  if (error) return NextResponse.json({ error: 'Failed to save notes' }, { status: 500 })
  return NextResponse.json({ success: true })
}
