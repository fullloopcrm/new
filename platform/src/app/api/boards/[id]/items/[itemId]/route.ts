/**
 * Task Board — update (rename, edit cell values, move group, reorder) or
 * delete a single item (tenant-scoped).
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { describeValueChanges, NO_ROWS_ERROR_CODE } from '@/lib/boards'

type Params = { params: Promise<{ id: string; itemId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('boards.edit')
    if (_authError) return _authError
    const { tenantId, userId, tenant } = _authTenant
    const { id: boardId, itemId } = await params
    const body = await request.json()
    const db = tenantDb(tenantId)

    if (body.group_id) {
      const { data: group } = await db
        .from('board_groups')
        .select('id')
        .eq('board_id', boardId)
        .eq('id', body.group_id)
        .single()
      if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string') updates.name = body.name.trim()
    if (typeof body.group_id === 'string' && body.group_id) updates.group_id = body.group_id
    if (typeof body.position === 'number') updates.position = body.position
    if (typeof body.assigned_to === 'string' || body.assigned_to === null) updates.assigned_to = body.assigned_to
    if (body.values && typeof body.values === 'object') {
      // Merge: PATCH sets/overwrites individual column_id keys, it doesn't
      // replace the whole values object — a cell edit shouldn't clobber
      // sibling columns edited by someone else since the last fetch.
      const { data: existing } = await db.from('board_items').select('values').eq('board_id', boardId).eq('id', itemId).single()
      updates.values = { ...(existing?.values as Record<string, unknown> || {}), ...body.values }
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const { data: item, error } = await db
      .from('board_items')
      .update(updates)
      .eq('board_id', boardId)
      .eq('id', itemId)
      .select('*')
      .single()
    if (error) {
      if (error.code === NO_ROWS_ERROR_CODE) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      throw error
    }

    if (body.values && typeof body.values === 'object') {
      const { data: columns } = await db.from('board_columns').select('id, name, type').eq('board_id', boardId)
      const lines = describeValueChanges(body.values, columns || [])
      if (lines.length > 0) {
        await db.from('board_item_notes').insert(
          lines.map((line) => ({
            item_id: itemId,
            kind: 'activity' as const,
            author_type: 'team' as const,
            author_id: userId,
            author_name: tenant.owner_name || tenant.name || 'Team',
            body: line,
          })),
        )
      }
    }

    return NextResponse.json({ item })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/boards/[id]/items/[itemId]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('boards.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id: boardId, itemId } = await params
    const db = tenantDb(tenantId)

    const { error } = await db.from('board_items').delete().eq('board_id', boardId).eq('id', itemId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/boards/[id]/items/[itemId]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
