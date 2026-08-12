/**
 * Task Board — platform-level board list (Full Loop internal ops, not tied
 * to any tenant). Mirrors /api/boards/route.ts but scoped to tenant_id IS
 * NULL and reached via supabaseAdmin directly instead of tenantDb (which
 * requires a tenant id).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { DEFAULT_GROUP_COLOR, DEFAULT_BOARD_COLUMNS } from '@/lib/boards'

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const { data: boards, error } = await supabaseAdmin
    .from('boards')
    .select('*')
    .is('tenant_id', null)
    .order('position', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ boards: boards || [] })
}

export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'New Board'

  const { count } = await supabaseAdmin.from('boards').select('id', { count: 'exact', head: true }).is('tenant_id', null)
  const { data: board, error } = await supabaseAdmin
    .from('boards')
    .insert({ tenant_id: null, name, position: count || 0 })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { error: groupError } = await supabaseAdmin
    .from('board_groups')
    .insert({ tenant_id: null, board_id: board.id, name: 'New Group', color: DEFAULT_GROUP_COLOR, position: 0 })
  if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 })

  const { error: columnsError } = await supabaseAdmin.from('board_columns').insert(
    DEFAULT_BOARD_COLUMNS.map((c, i) => ({ tenant_id: null, board_id: board.id, name: c.name, type: c.type, options: c.options, position: i })),
  )
  if (columnsError) return NextResponse.json({ error: columnsError.message }, { status: 500 })

  return NextResponse.json({ board })
}
