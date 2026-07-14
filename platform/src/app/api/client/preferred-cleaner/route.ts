import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { protectClientAPI, isAdminAuthenticated } from '@/lib/nycmaid/auth'

// `/api/client(.*)` is exempted from the platform's Clerk/session middleware
// (see middleware.ts) — tenant is resolved from a signed header, not a login,
// so each handler must independently verify the caller IS the client whose
// data they're reading/writing. This route took client_id from the query/body
// with no session check at all: any caller who knew (or guessed) a client_id
// could read another client's preferred-cleaner history or reassign it.
// Mirrors the authClient() gate already used by /api/client/properties.
async function authClient(clientId: string | null | undefined): Promise<NextResponse | { isAdmin: boolean }> {
  if (!clientId) return NextResponse.json({ error: 'Missing client_id' }, { status: 400 })
  const isAdmin = await isAdminAuthenticated()
  if (!isAdmin) {
    const auth = await protectClientAPI(clientId)
    if (auth instanceof NextResponse) return auth
  }
  return { isAdmin }
}

// GET /api/client/preferred-cleaner?client_id=X
// Returns the client's current preferred team member + the list of team
// members they've actually worked with.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  const auth = await authClient(clientId)
  if (auth instanceof NextResponse) return auth

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('preferred_team_member_id, tenant_id')
    .eq('id', clientId)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const { data: pastJobs } = await supabaseAdmin
    .from('bookings')
    .select('team_member_id, team_members!bookings_team_member_id_fkey(id, name)')
    .eq('tenant_id', client.tenant_id)
    .eq('client_id', clientId)
    .not('team_member_id', 'is', null)
    .order('start_time', { ascending: false })
    .limit(50)

  const seen = new Set<string>()
  const familiar: { id: string; name: string }[] = []
  for (const j of pastJobs || []) {
    const tm = j.team_members as unknown as { id: string; name: string } | { id: string; name: string }[] | null
    const member = Array.isArray(tm) ? tm[0] : tm
    if (member && !seen.has(member.id)) {
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
  const body = await request.json()
  const auth = await authClient(body.client_id)
  if (auth instanceof NextResponse) return auth

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('tenant_id')
    .eq('id', body.client_id)
    .single()
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  if (body.preferred_cleaner_id) {
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('id, active')
      .eq('id', body.preferred_cleaner_id)
      .eq('tenant_id', client.tenant_id)
      .single()
    if (!member || member.active === false) {
      return NextResponse.json({ error: 'Cleaner not available' }, { status: 400 })
    }
  }

  const { error } = await supabaseAdmin
    .from('clients')
    .update({ preferred_team_member_id: body.preferred_cleaner_id || null })
    .eq('id', body.client_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
