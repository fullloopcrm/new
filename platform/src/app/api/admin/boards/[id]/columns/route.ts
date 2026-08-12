/** Task Board — create a column on a platform-level board (admin). Mirrors the tenant route. */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { isBoardColumnType, DEFAULT_STATUS_OPTIONS } from '@/lib/boards'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id: boardId } = await params
  const body = await request.json().catch(() => ({}))

  if (!isBoardColumnType(body.type)) return NextResponse.json({ error: 'Invalid column type' }, { status: 400 })
  if (typeof body.name !== 'string' || !body.name.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data: board } = await supabaseAdmin.from('boards').select('id').is('tenant_id', null).eq('id', boardId).single()
  if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 })

  const { count } = await supabaseAdmin.from('board_columns').select('id', { count: 'exact', head: true }).eq('board_id', boardId)
  const { data: column, error } = await supabaseAdmin
    .from('board_columns')
    .insert({
      tenant_id: null,
      board_id: boardId,
      name: body.name.trim(),
      type: body.type,
      options: body.type === 'status' ? (Array.isArray(body.options) ? body.options : DEFAULT_STATUS_OPTIONS) : [],
      position: count || 0,
    })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ column })
}
