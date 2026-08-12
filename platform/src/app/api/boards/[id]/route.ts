/**
 * Task Board — single board (tenant-scoped). GET returns the board plus its
 * groups, columns, and items in one call (everything the board page needs).
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { NO_ROWS_ERROR_CODE } from '@/lib/boards'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('boards.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const db = tenantDb(tenantId)

    const { data: board, error } = await db.from('boards').select('*').eq('id', id).single()
    if (error || !board) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [{ data: groups }, { data: columns }, { data: items }] = await Promise.all([
      db.from('board_groups').select('*').eq('board_id', id).order('position', { ascending: true }),
      db.from('board_columns').select('*').eq('board_id', id).order('position', { ascending: true }),
      db.from('board_items').select('*').eq('board_id', id).order('position', { ascending: true }),
    ])

    // Manual note count (kind='note', not the auto-logged activity lines) per
    // item — the row-level "communication is happening here" signal. One
    // query for the whole board rather than N+1 per item.
    const itemIds = (items || []).map((i) => i.id)
    let noteCounts: Record<string, number> = {}
    if (itemIds.length > 0) {
      const { data: notes } = await db.from('board_item_notes').select('item_id, kind').eq('kind', 'note').in('item_id', itemIds)
      noteCounts = (notes || []).reduce((acc: Record<string, number>, n) => {
        acc[n.item_id as string] = (acc[n.item_id as string] || 0) + 1
        return acc
      }, {})
    }
    const itemsWithNoteCounts = (items || []).map((i) => ({ ...i, note_count: noteCounts[i.id] || 0 }))

    return NextResponse.json({
      board,
      groups: groups || [],
      columns: columns || [],
      items: itemsWithNoteCounts,
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/boards/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('boards.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json()
    const db = tenantDb(tenantId)

    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
    if (typeof body.position === 'number') updates.position = body.position
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const { data: board, error } = await db.from('boards').update(updates).eq('id', id).select('*').single()
    if (error) {
      if (error.code === NO_ROWS_ERROR_CODE) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      throw error
    }
    return NextResponse.json({ board })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/boards/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('boards.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const db = tenantDb(tenantId)

    const { error } = await db.from('boards').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/boards/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
