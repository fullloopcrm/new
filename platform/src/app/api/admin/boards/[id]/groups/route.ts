/** Task Board — create a group on a platform-level board (admin). Mirrors /api/boards/[id]/groups/route.ts. */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { DEFAULT_GROUP_COLOR } from '@/lib/boards'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id: boardId } = await params
  const body = await request.json().catch(() => ({}))

  const { data: board } = await supabaseAdmin.from('boards').select('id').is('tenant_id', null).eq('id', boardId).single()
  if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 })

  const { count } = await supabaseAdmin.from('board_groups').select('id', { count: 'exact', head: true }).eq('board_id', boardId)
  const { data: group, error } = await supabaseAdmin
    .from('board_groups')
    .insert({
      tenant_id: null,
      board_id: boardId,
      name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'New Group',
      color: typeof body.color === 'string' && body.color ? body.color : DEFAULT_GROUP_COLOR,
      position: count || 0,
    })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ group })
}
