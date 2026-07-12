// Employee notes log. `id` is the team_member_id. POST appends a note.
import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

const NOTE_KINDS = ['note', 'writeup', 'kudos', 'review']

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { tenant, error: permErr } = await requirePermission('team.edit')
  if (permErr) return permErr
  try {
    const { tenantId } = tenant
    const { id } = await ctx.params
    const db = tenantDb(tenantId)

    const { data: member } = await db
      .from('team_members')
      .select('id')
      .eq('id', id)
      .maybeSingle()
    if (!member) return NextResponse.json({ error: 'employee not found' }, { status: 404 })

    let body: { kind?: string; body?: string; author_name?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }
    const text = body.body?.trim()
    if (!text) return NextResponse.json({ error: 'body required' }, { status: 400 })
    const kind = body.kind && NOTE_KINDS.includes(body.kind) ? body.kind : 'note'

    const { data, error } = await db
      .from('hr_notes')
      .insert({
        team_member_id: id,
        author_id: null, // author_id is UUID-typed; Clerk/PIN ids aren't UUIDs — record the name instead.
        author_name: body.author_name?.trim() || null,
        kind,
        body: text,
      })
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, note: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
