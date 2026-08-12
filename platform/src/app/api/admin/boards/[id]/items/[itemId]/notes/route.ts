/** Task Board — per-item notes thread on a platform-level board (admin). Mirrors the tenant route. */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

type Params = { params: Promise<{ id: string; itemId: string }> }

export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { itemId } = await params

  const { data: notes, error } = await supabaseAdmin
    .from('board_item_notes')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notes: notes || [] })
}

export async function POST(request: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id: boardId, itemId } = await params
  const body = await request.json().catch(() => ({}))

  if (typeof body.body !== 'string' || !body.body.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }

  const { data: item } = await supabaseAdmin.from('board_items').select('id').eq('board_id', boardId).eq('id', itemId).single()
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  const { data: note, error } = await supabaseAdmin
    .from('board_item_notes')
    .insert({
      tenant_id: null,
      item_id: itemId,
      kind: 'note',
      author_type: 'admin',
      author_name: 'Full Loop Admin',
      body: body.body.trim(),
    })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note }, { status: 201 })
}
