/** Task Board — create an item on a platform-level board (admin). Mirrors the tenant route. */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id: boardId } = await params
  const body = await request.json().catch(() => ({}))

  if (typeof body.group_id !== 'string' || !body.group_id) {
    return NextResponse.json({ error: 'group_id is required' }, { status: 400 })
  }

  const { data: group } = await supabaseAdmin
    .from('board_groups')
    .select('id')
    .eq('board_id', boardId)
    .eq('id', body.group_id)
    .single()
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const { count } = await supabaseAdmin
    .from('board_items')
    .select('id', { count: 'exact', head: true })
    .eq('board_id', boardId)
    .eq('group_id', body.group_id)

  const { data: item, error } = await supabaseAdmin
    .from('board_items')
    .insert({
      tenant_id: null,
      board_id: boardId,
      group_id: body.group_id,
      name: typeof body.name === 'string' ? body.name.trim() : '',
      values: typeof body.values === 'object' && body.values ? body.values : {},
      position: count || 0,
    })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('board_item_notes').insert({
    tenant_id: null,
    item_id: item.id,
    kind: 'activity',
    author_type: 'admin',
    author_name: 'Full Loop Admin',
    body: 'Item created',
  })

  return NextResponse.json({ item })
}
