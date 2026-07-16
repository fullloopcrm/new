import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { pick } from '@/lib/validate'

// Columns an admin may edit on an announcement. Whitelist prevents
// mass-assignment of id / created_at via a crafted request body.
const EDITABLE_ANNOUNCEMENT_FIELDS = [
  'title', 'body', 'type', 'target', 'target_value', 'priority', 'published',
]

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await request.json()
  const updates = pick(body, EDITABLE_ANNOUNCEMENT_FIELDS)

  const { error } = await supabaseAdmin
    .from('platform_announcements')
    .update(updates)
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
