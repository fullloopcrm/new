// A single team-to-team DM thread: the caller and one other team_members row.
import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { resolveActorTeamMemberId, UUID_RE } from '@/lib/team-messages'
import { isCrossSiteRequest } from '@/lib/csrf-guard'

export async function GET(request: NextRequest, { params }: { params: Promise<{ teamMemberId: string }> }) {
  try {
    const ctx = await getTenantForRequest()
    const { teamMemberId } = await params
    // teamMemberId is interpolated into a raw .or() filter string below --
    // reject anything that isn't a UUID before it ever reaches PostgREST.
    if (!UUID_RE.test(teamMemberId)) return NextResponse.json({ error: 'Invalid team member id' }, { status: 400 })
    const meId = await resolveActorTeamMemberId(ctx)
    if (!meId) return NextResponse.json({ error: 'No team member profile for this session' }, { status: 409 })

    const db = tenantDb(ctx.tenantId)

    const { data: other } = await db.from('team_members').select('id, name, role').eq('id', teamMemberId).maybeSingle()
    if (!other) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })

    const { data, error } = await db
      .from('team_direct_messages')
      .select('id, sender_team_member_id, recipient_team_member_id, body, created_at, read_at')
      .or(
        `and(sender_team_member_id.eq.${meId},recipient_team_member_id.eq.${teamMemberId}),and(sender_team_member_id.eq.${teamMemberId},recipient_team_member_id.eq.${meId})`
      )
      .order('created_at', { ascending: true })
      .limit(500)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Mark their messages to me as read, same pattern as the Full Loop thread.
    if (!isCrossSiteRequest(request.headers)) {
      await db
        .from('team_direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_team_member_id', meId)
        .eq('sender_team_member_id', teamMemberId)
        .is('read_at', null)
    }

    return NextResponse.json({ other, me: meId, messages: data || [] })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ teamMemberId: string }> }) {
  try {
    const ctx = await getTenantForRequest()
    const { teamMemberId } = await params
    if (!UUID_RE.test(teamMemberId)) return NextResponse.json({ error: 'Invalid team member id' }, { status: 400 })
    const meId = await resolveActorTeamMemberId(ctx)
    if (!meId) return NextResponse.json({ error: 'No team member profile for this session' }, { status: 409 })
    if (meId === teamMemberId) return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })

    const db = tenantDb(ctx.tenantId)
    const { data: other } = await db.from('team_members').select('id').eq('id', teamMemberId).maybeSingle()
    if (!other) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })

    let payload: { body?: string }
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }
    const body = payload.body?.trim()
    if (!body) return NextResponse.json({ error: 'body required' }, { status: 400 })

    const { data: inserted, error } = await db
      .from('team_direct_messages')
      .insert({ sender_team_member_id: meId, recipient_team_member_id: teamMemberId, body })
      .select('id, sender_team_member_id, recipient_team_member_id, body, created_at, read_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, message: inserted })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
  }
}
