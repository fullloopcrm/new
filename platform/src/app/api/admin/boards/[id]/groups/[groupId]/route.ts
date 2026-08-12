/** Task Board — rename/recolor/reorder or delete a group (admin). Mirrors the tenant route. */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { NO_ROWS_ERROR_CODE } from '@/lib/boards'

type Params = { params: Promise<{ id: string; groupId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id: boardId, groupId } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if (typeof body.color === 'string' && body.color) updates.color = body.color
  if (typeof body.position === 'number') updates.position = body.position
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

  const { data: group, error } = await supabaseAdmin
    .from('board_groups')
    .update(updates)
    .eq('board_id', boardId)
    .eq('id', groupId)
    .select('*')
    .single()
  if (error) {
    if (error.code === NO_ROWS_ERROR_CODE) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ group })
}

export async function DELETE(_request: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id: boardId, groupId } = await params

  const { error } = await supabaseAdmin.from('board_groups').delete().eq('board_id', boardId).eq('id', groupId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
