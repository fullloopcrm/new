/**
 * Crews CRUD — a crew is a named, reusable group of team members, tenant-scoped.
 * Assignable to a job session/booking so a whole team schedules at once.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const { data: crews, error } = await tenantDb(tenantId)
      .from('crews')
      .select('id, name, color, active, crew_members(team_member_id, team_members(id, name))')
      .order('name', { ascending: true })
    if (error) throw error
    type MemberRow = { team_member_id: string; team_members: { name: string | null } | { name: string | null }[] | null }
    type CrewRow = { id: string; name: string; color: string | null; active: boolean; crew_members: MemberRow[] | null }
    const shaped = ((crews || []) as unknown as CrewRow[]).map((c) => ({
      id: c.id, name: c.name, color: c.color, active: c.active,
      members: ((c.crew_members || []) as MemberRow[]).map((m) => {
        const tm = Array.isArray(m.team_members) ? m.team_members[0] : m.team_members
        return { id: m.team_member_id, name: tm?.name || '—' }
      }),
    }))
    return NextResponse.json({ crews: shaped })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/crews', err)
    return NextResponse.json({ error: 'Failed to load crews' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('team.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    const memberIds = Array.isArray(body.member_ids) ? (body.member_ids as string[]) : []

    const { data: crew, error } = await tenantDb(tenantId)
      .from('crews')
      .insert({ name, color: (body.color as string) || null })
      .select('id')
      .single()
    if (error || !crew) throw error || new Error('insert failed')

    await setMembers(tenantId, crew.id, memberIds)
    return NextResponse.json({ id: crew.id })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/crews', err)
    return NextResponse.json({ error: 'Failed to create crew' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('team.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const id = body.id as string | undefined
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const db = tenantDb(tenantId)

    // Verify the crew belongs to THIS tenant before any mutation, including
    // member replacement below — crew_members has no tenant_id column of its
    // own, so without this check a caller could pass a foreign tenant's crew
    // id and setMembers() would wipe and rewrite that tenant's roster.
    const { data: owned } = await db.from('crews').select('id').eq('id', id).maybeSingle()
    if (!owned) return NextResponse.json({ error: 'Crew not found' }, { status: 404 })

    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string') patch.name = body.name.trim()
    if ('color' in body) patch.color = (body.color as string) || null
    if ('active' in body) patch.active = !!body.active
    if (Object.keys(patch).length) {
      await db.from('crews').update(patch).eq('id', id)
    }
    if (Array.isArray(body.member_ids)) {
      await setMembers(tenantId, id, body.member_ids as string[])
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/crews', err)
    return NextResponse.json({ error: 'Failed to update crew' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('team.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    await tenantDb(tenantId).from('crews').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/crews', err)
    return NextResponse.json({ error: 'Failed to delete crew' }, { status: 500 })
  }
}

// Replace a crew's members with the given set (verified to belong to the tenant).
// crew_members has no tenant_id column of its own — callers MUST verify the
// crewId belongs to tenantId before calling this (see the PATCH ownership
// check above); this function trusts that check and only re-verifies the
// member ids themselves.
async function setMembers(tenantId: string, crewId: string, memberIds: string[]) {
  await supabaseAdmin.from('crew_members').delete().eq('crew_id', crewId)
  if (memberIds.length === 0) return
  const { data: valid } = await tenantDb(tenantId)
    .from('team_members').select('id').in('id', memberIds)
  const rows = ((valid || []) as unknown as { id: string }[]).map((m) => ({ crew_id: crewId, team_member_id: m.id }))
  if (rows.length) await supabaseAdmin.from('crew_members').insert(rows)
}
