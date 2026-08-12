/** Task Board — update or delete an item on a platform-level board (admin). Mirrors the tenant route. */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { describeValueChanges, NO_ROWS_ERROR_CODE } from '@/lib/boards'

type Params = { params: Promise<{ id: string; itemId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id: boardId, itemId } = await params
  const body = await request.json()

  if (body.group_id) {
    const { data: group } = await supabaseAdmin
      .from('board_groups')
      .select('id')
      .eq('board_id', boardId)
      .eq('id', body.group_id)
      .single()
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.name === 'string') updates.name = body.name.trim()
  if (typeof body.group_id === 'string' && body.group_id) updates.group_id = body.group_id
  if (typeof body.position === 'number') updates.position = body.position
  if (body.values && typeof body.values === 'object') {
    const { data: existing } = await supabaseAdmin.from('board_items').select('values').eq('board_id', boardId).eq('id', itemId).single()
    updates.values = { ...(existing?.values as Record<string, unknown> || {}), ...body.values }
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

  const { data: item, error } = await supabaseAdmin
    .from('board_items')
    .update(updates)
    .eq('board_id', boardId)
    .eq('id', itemId)
    .select('*')
    .single()
  if (error) {
    if (error.code === NO_ROWS_ERROR_CODE) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (body.values && typeof body.values === 'object') {
    const { data: columns } = await supabaseAdmin.from('board_columns').select('id, name, type').eq('board_id', boardId)
    const lines = describeValueChanges(body.values, columns || [])
    if (lines.length > 0) {
      await supabaseAdmin.from('board_item_notes').insert(
        lines.map((line) => ({
          tenant_id: null,
          item_id: itemId,
          kind: 'activity' as const,
          author_type: 'admin' as const,
          author_name: 'Full Loop Admin',
          body: line,
        })),
      )
    }
  }

  return NextResponse.json({ item })
}

export async function DELETE(_request: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id: boardId, itemId } = await params

  const { error } = await supabaseAdmin.from('board_items').delete().eq('board_id', boardId).eq('id', itemId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
