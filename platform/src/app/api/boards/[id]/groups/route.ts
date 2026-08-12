/** Task Board — create a group on a board (tenant-scoped). */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { DEFAULT_GROUP_COLOR } from '@/lib/boards'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('boards.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id: boardId } = await params
    const body = await request.json().catch(() => ({}))
    const db = tenantDb(tenantId)

    const { data: board } = await db.from('boards').select('id').eq('id', boardId).single()
    if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 })

    const { count } = await db.from('board_groups').select('id', { count: 'exact', head: true }).eq('board_id', boardId)
    const { data: group, error } = await db
      .from('board_groups')
      .insert({
        board_id: boardId,
        name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'New Group',
        color: typeof body.color === 'string' && body.color ? body.color : DEFAULT_GROUP_COLOR,
        position: count || 0,
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ group })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/boards/[id]/groups', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
