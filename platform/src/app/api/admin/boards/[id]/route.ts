/** Task Board — single platform-level board (admin). Mirrors /api/boards/[id]/route.ts. */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { NO_ROWS_ERROR_CODE } from '@/lib/boards'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params

  const { data: board, error } = await supabaseAdmin.from('boards').select('*').is('tenant_id', null).eq('id', id).single()
  if (error || !board) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [{ data: groups }, { data: columns }, { data: items }] = await Promise.all([
    supabaseAdmin.from('board_groups').select('*').eq('board_id', id).order('position', { ascending: true }),
    supabaseAdmin.from('board_columns').select('*').eq('board_id', id).order('position', { ascending: true }),
    supabaseAdmin.from('board_items').select('*').eq('board_id', id).order('position', { ascending: true }),
  ])

  const itemIds = (items || []).map((i) => i.id)
  let noteCounts: Record<string, number> = {}
  if (itemIds.length > 0) {
    const { data: notes } = await supabaseAdmin.from('board_item_notes').select('item_id, kind').eq('kind', 'note').in('item_id', itemIds)
    noteCounts = (notes || []).reduce((acc: Record<string, number>, n) => {
      acc[n.item_id as string] = (acc[n.item_id as string] || 0) + 1
      return acc
    }, {})
  }
  const itemsWithNoteCounts = (items || []).map((i) => ({ ...i, note_count: noteCounts[i.id] || 0 }))

  return NextResponse.json({ board, groups: groups || [], columns: columns || [], items: itemsWithNoteCounts })
}

export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if (typeof body.position === 'number') updates.position = body.position
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

  const { data: board, error } = await supabaseAdmin
    .from('boards')
    .update(updates)
    .is('tenant_id', null)
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    if (error.code === NO_ROWS_ERROR_CODE) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ board })
}

export async function DELETE(_request: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params

  const { error } = await supabaseAdmin.from('boards').delete().is('tenant_id', null).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
