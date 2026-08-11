/** Task Board — create a column on a board (tenant-scoped). */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { isBoardColumnType, DEFAULT_STATUS_OPTIONS } from '@/lib/boards'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('boards.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id: boardId } = await params
    const body = await request.json().catch(() => ({}))
    const db = tenantDb(tenantId)

    if (!isBoardColumnType(body.type)) {
      return NextResponse.json({ error: 'Invalid column type' }, { status: 400 })
    }
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const { data: board } = await db.from('boards').select('id').eq('id', boardId).single()
    if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 })

    const { count } = await db.from('board_columns').select('id', { count: 'exact', head: true }).eq('board_id', boardId)
    const { data: column, error } = await db
      .from('board_columns')
      .insert({
        board_id: boardId,
        name: body.name.trim(),
        type: body.type,
        options: body.type === 'status' ? (Array.isArray(body.options) ? body.options : DEFAULT_STATUS_OPTIONS) : [],
        position: count || 0,
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ column })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/boards/[id]/columns', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
