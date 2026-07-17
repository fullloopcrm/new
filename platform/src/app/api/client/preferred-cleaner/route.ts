import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { protectClientAPI } from '@/lib/client-auth'

// GET /api/client/preferred-cleaner?client_id=X
// Returns the client's current preferred team member + the list of team
// members they've actually worked with.
export async function GET(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  if (!clientId) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

  // Ownership gate: without it, a known client_id leaks that client's preferred
  // and familiar cleaners to anyone. Session must match this tenant + client_id.
  const auth = await protectClientAPI(tenant.id, clientId)
  if (auth instanceof NextResponse) return auth

  const { data: client } = await tenantDb(tenant.id)
    .from('clients')
    .select('preferred_team_member_id, tenant_id')
    .eq('id', clientId)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const { data: pastJobs } = await tenantDb(tenant.id)
    .from('bookings')
    .select('team_member_id, team_members!bookings_team_member_id_fkey(id, name, status)')
    .eq('client_id', clientId)
    .not('team_member_id', 'is', null)
    .order('start_time', { ascending: false })
    .limit(50)

  const seen = new Set<string>()
  const familiar: { id: string; name: string }[] = []
  for (const j of pastJobs || []) {
    const tm = j.team_members as unknown as
      | { id: string; name: string; status: string | null }
      | { id: string; name: string; status: string | null }[]
      | null
    const member = Array.isArray(tm) ? tm[0] : tm
    // Exclude terminated/inactive cleaners -- a client shouldn't be able to
    // re-select someone who no longer works here from their "worked with" list.
    if (member && member.status !== 'inactive' && !seen.has(member.id)) {
      seen.add(member.id)
      familiar.push({ id: member.id, name: member.name })
    }
  }

  return NextResponse.json({
    preferred_cleaner_id: client.preferred_team_member_id || null,
    familiar_cleaners: familiar,
  })
}

// PUT /api/client/preferred-cleaner
// body: { client_id, preferred_cleaner_id (or null to clear) }
export async function PUT(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const body = await request.json()
  if (!body.client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

  // Ownership gate: a forged client_id must not set another client's preferred
  // cleaner. Session must match this tenant + client_id.
  const auth = await protectClientAPI(tenant.id, body.client_id)
  if (auth instanceof NextResponse) return auth

  if (body.preferred_cleaner_id) {
    // Use `status` ('active' | 'inactive' | 'suspended'), not `active`. Correction:
    // team_members.active does exist (added by 010_nycmaid_parity_columns_2.sql, a
    // one-time NYC Maid legacy-data import column) -- verified live against
    // production, contra an earlier assumption in this codebase's history that the
    // column was missing. But nothing in the app writes it, so it silently drifts
    // from reality (confirmed live: ~12% of rows disagree with `status`, including
    // status='inactive' rows still showing active=true). `status` is the field the
    // termination flow and everything else actually keeps current.
    const { data: member } = await tenantDb(tenant.id)
      .from('team_members')
      .select('id, status')
      .eq('id', body.preferred_cleaner_id)
      .single()
    if (!member || member.status !== 'active') {
      return NextResponse.json({ error: 'Cleaner not available' }, { status: 400 })
    }
  }

  const { error } = await tenantDb(tenant.id)
    .from('clients')
    .update({ preferred_team_member_id: body.preferred_cleaner_id || null })
    .eq('id', body.client_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
