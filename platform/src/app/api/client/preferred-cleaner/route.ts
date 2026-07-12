import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPortalToken } from '../../portal/auth/token'

// GET /api/client/preferred-cleaner
// Auth: client portal Bearer token (same as /api/portal/*) — identifies the
// client, no caller-supplied client_id is trusted. Returns the client's
// current preferred team member + the list of team members they've actually
// worked with.
export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  const clientId = auth.id

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('preferred_team_member_id, tenant_id')
    .eq('id', clientId)
    .eq('tenant_id', auth.tid)
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
// Auth: client portal Bearer token. body: { preferred_cleaner_id (or null to clear) }
export async function PUT(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  const clientId = auth.id

  const body = await request.json()

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('tenant_id')
    .eq('id', clientId)
    .eq('tenant_id', auth.tid)
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
    .eq('id', clientId)
    .eq('tenant_id', auth.tid)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
