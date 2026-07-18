/**
 * Crews CRUD — a crew is a named, reusable group of team members, tenant-scoped.
 * Assignable to a job session/booking so a whole team schedules at once.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { scoreCrewsForBooking } from '@/lib/smart-schedule'

// When date/start_time/duration_hours/address are all present, crews are
// ranked by scoreCrewsForBooking (member availability + zone + rating fit)
// instead of alphabetically, so the scheduler sees the best-fit crew first.
export async function GET(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('schedules.view')
    if (authError) return authError
    const { tenantId } = tenant
    const { data: crews, error } = await supabaseAdmin
      .from('crews')
      .select('id, name, color, active, crew_members(team_member_id, team_members(id, name))')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true })
    if (error) throw error
    type MemberRow = { team_member_id: string; team_members: { name: string | null } | { name: string | null }[] | null }
    const shaped = (crews || []).map((c) => ({
      id: c.id, name: c.name, color: c.color, active: c.active,
      members: ((c.crew_members || []) as MemberRow[]).map((m) => {
        const tm = Array.isArray(m.team_members) ? m.team_members[0] : m.team_members
        return { id: m.team_member_id, name: tm?.name || '—' }
      }),
    }))

    const url = new URL(request.url)
    const date = url.searchParams.get('date')
    const startTime = url.searchParams.get('start_time')
    const durationHours = url.searchParams.get('duration_hours')
    const address = url.searchParams.get('address')
    if (date && startTime && durationHours && address) {
      const ranked = await scoreCrewsForBooking({
        tenantId,
        date,
        startTime,
        durationHours: Number(durationHours) || 1,
        clientAddress: address,
        clientId: url.searchParams.get('client_id') || undefined,
      })
      const rankById = new Map(ranked.map((r) => [r.id, r]))
      const withRecommendation = shaped
        .filter((c) => c.active)
        .map((c) => {
          const r = rankById.get(c.id)
          return {
            ...c,
            member_count: c.members.length,
            recommended_score: r?.score ?? null,
            available_count: r?.available_count ?? null,
            fully_available: r?.fully_available ?? null,
            recommendation_reason: r?.reason ?? null,
          }
        })
        .sort((a, b) => {
          const ra = rankById.get(a.id)
          const rb = rankById.get(b.id)
          if (!ra || !rb) return 0
          if (ra.available_count > 0 && rb.available_count === 0) return -1
          if (ra.available_count === 0 && rb.available_count > 0) return 1
          if (ra.fully_available !== rb.fully_available) return ra.fully_available ? -1 : 1
          return rb.score - ra.score
        })
      return NextResponse.json({ crews: withRecommendation })
    }

    return NextResponse.json({ crews: shaped })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/crews', err)
    return NextResponse.json({ error: 'Failed to load crews' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('schedules.create')
    if (authError) return authError
    const { tenantId } = tenant
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    const memberIds = Array.isArray(body.member_ids) ? (body.member_ids as string[]) : []

    const { data: crew, error } = await supabaseAdmin
      .from('crews')
      .insert({ tenant_id: tenantId, name, color: (body.color as string) || null })
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
    const { tenant, error: authError } = await requirePermission('schedules.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const id = body.id as string | undefined
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string') patch.name = body.name.trim()
    if ('color' in body) patch.color = (body.color as string) || null
    if ('active' in body) patch.active = !!body.active
    if (Object.keys(patch).length) {
      await supabaseAdmin.from('crews').update(patch).eq('id', id).eq('tenant_id', tenantId)
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
    const { tenant, error: authError } = await requirePermission('schedules.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    await supabaseAdmin.from('crews').delete().eq('id', id).eq('tenant_id', tenantId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/crews', err)
    return NextResponse.json({ error: 'Failed to delete crew' }, { status: 500 })
  }
}

// Replace a crew's members with the given set (verified to belong to the tenant).
async function setMembers(tenantId: string, crewId: string, memberIds: string[]) {
  // SECURITY: re-verify the crew belongs to this tenant BEFORE mutating its
  // members. crew_members has no tenant_id column, so a bare
  // `.delete().eq('crew_id', crewId)` would let an owner of tenant A wipe or
  // pollute tenant B's crew by guessing B's crew UUID. Scope the check through
  // the tenant-owned crews table; if the crew isn't in this tenant, do nothing.
  const { data: owned } = await supabaseAdmin
    .from('crews').select('id').eq('id', crewId).eq('tenant_id', tenantId).maybeSingle()
  if (!owned) return
  await supabaseAdmin.from('crew_members').delete().eq('crew_id', crewId)
  if (memberIds.length === 0) return
  const { data: valid } = await supabaseAdmin
    .from('team_members').select('id').eq('tenant_id', tenantId).in('id', memberIds)
  const rows = (valid || []).map((m) => ({ crew_id: crewId, team_member_id: m.id }))
  if (rows.length) await supabaseAdmin.from('crew_members').insert(rows)
}
