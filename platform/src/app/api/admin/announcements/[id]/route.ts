import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { pick } from '@/lib/validate'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await request.json()
  // Allow-listed scalars only — never accept id/created_at/updated_at (row-identity
  // fields the client should never control) via raw .update(body).
  const safeBody = pick(body, ['title', 'body', 'type', 'target', 'target_value', 'priority', 'published'])

  const { error } = await supabaseAdmin
    .from('platform_announcements')
    .update(safeBody)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('platform_announcements')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
