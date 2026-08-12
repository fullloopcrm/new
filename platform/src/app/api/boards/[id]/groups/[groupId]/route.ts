/** Task Board — rename/recolor/reorder or delete a single group (tenant-scoped). */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { NO_ROWS_ERROR_CODE } from '@/lib/boards'

type Params = { params: Promise<{ id: string; groupId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('boards.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id: boardId, groupId } = await params
    const body = await request.json()
    const db = tenantDb(tenantId)

    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
    if (typeof body.color === 'string' && body.color) updates.color = body.color
    if (typeof body.position === 'number') updates.position = body.position
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const { data: group, error } = await db
      .from('board_groups')
      .update(updates)
      .eq('board_id', boardId)
      .eq('id', groupId)
      .select('*')
      .single()
    if (error) {
      if (error.code === NO_ROWS_ERROR_CODE) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      throw error
    }
    return NextResponse.json({ group })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/boards/[id]/groups/[groupId]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('boards.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id: boardId, groupId } = await params
    const db = tenantDb(tenantId)

    const { error } = await db.from('board_groups').delete().eq('board_id', boardId).eq('id', groupId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/boards/[id]/groups/[groupId]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
