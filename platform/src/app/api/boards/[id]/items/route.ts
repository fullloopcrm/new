/** Task Board — create an item on a board (tenant-scoped). */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('boards.edit')
    if (_authError) return _authError
    const { tenantId, userId } = _authTenant
    const { id: boardId } = await params
    const body = await request.json().catch(() => ({}))
    const db = tenantDb(tenantId)

    if (typeof body.group_id !== 'string' || !body.group_id) {
      return NextResponse.json({ error: 'group_id is required' }, { status: 400 })
    }

    const { data: group } = await db
      .from('board_groups')
      .select('id')
      .eq('board_id', boardId)
      .eq('id', body.group_id)
      .single()
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

    const { count } = await db
      .from('board_items')
      .select('id', { count: 'exact', head: true })
      .eq('board_id', boardId)
      .eq('group_id', body.group_id)

    const { data: item, error } = await db
      .from('board_items')
      .insert({
        board_id: boardId,
        group_id: body.group_id,
        name: typeof body.name === 'string' ? body.name.trim() : '',
        values: typeof body.values === 'object' && body.values ? body.values : {},
        position: count || 0,
        created_by: userId,
      })
      .select('*')
      .single()
    if (error) throw error

    await db.from('board_item_notes').insert({
      item_id: item.id,
      kind: 'activity',
      author_type: 'team',
      author_id: userId,
      author_name: _authTenant.tenant.owner_name || _authTenant.tenant.name || 'Team',
      body: 'Item created',
    })

    return NextResponse.json({ item })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/boards/[id]/items', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
