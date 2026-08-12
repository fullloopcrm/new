/** Task Board — rename/reorder or delete a column (admin). Mirrors the tenant route. */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { NO_ROWS_ERROR_CODE } from '@/lib/boards'

type Params = { params: Promise<{ id: string; columnId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id: boardId, columnId } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if (Array.isArray(body.options)) updates.options = body.options
  if (typeof body.position === 'number') updates.position = body.position
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

  const { data: column, error } = await supabaseAdmin
    .from('board_columns')
    .update(updates)
    .eq('board_id', boardId)
    .eq('id', columnId)
    .select('*')
    .single()
  if (error) {
    if (error.code === NO_ROWS_ERROR_CODE) return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ column })
}

export async function DELETE(_request: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id: boardId, columnId } = await params

  const { error } = await supabaseAdmin.from('board_columns').delete().eq('board_id', boardId).eq('id', columnId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
