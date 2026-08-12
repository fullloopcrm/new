/**
 * Task Board — board list (tenant-scoped). GET lists boards, POST creates one.
 * A new board always gets one default group ("New Group") so it's usable
 * immediately — items require a group_id, so a groupless board is a dead end.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { DEFAULT_GROUP_COLOR, DEFAULT_BOARD_COLUMNS } from '@/lib/boards'

export async function GET() {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('boards.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const db = tenantDb(tenantId)

    const { data: boards, error } = await db
      .from('boards')
      .select('*')
      .order('position', { ascending: true })
    if (error) throw error

    return NextResponse.json({ boards: boards || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/boards', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('boards.edit')
    if (_authError) return _authError
    const { tenantId, userId } = _authTenant
    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'New Board'
    const db = tenantDb(tenantId)

    const { count } = await db.from('boards').select('id', { count: 'exact', head: true })
    const { data: board, error } = await db
      .from('boards')
      .insert({ name, position: count || 0, created_by: userId })
      .select('*')
      .single()
    if (error) throw error

    const { error: groupError } = await db
      .from('board_groups')
      .insert({ board_id: board.id, name: 'New Group', color: DEFAULT_GROUP_COLOR, position: 0 })
    if (groupError) throw groupError

    const { error: columnsError } = await db.from('board_columns').insert(
      DEFAULT_BOARD_COLUMNS.map((c, i) => ({ board_id: board.id, name: c.name, type: c.type, options: c.options, position: i })),
    )
    if (columnsError) throw columnsError

    return NextResponse.json({ board })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/boards', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
