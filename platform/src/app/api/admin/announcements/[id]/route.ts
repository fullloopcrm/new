import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await request.json()

  // Allowlist writable columns — same set the POST handler accepts. A raw
  // `.update(body)` here would let the caller mass-assign any column
  // (including `id`, `created_at`) since this is a straight passthrough
  // of the parsed request body with no field filtering.
  const ALLOWED_FIELDS = ['title', 'body', 'type', 'target', 'target_value', 'priority', 'published'] as const
  const update: Record<string, unknown> = {}
  for (const field of ALLOWED_FIELDS) {
    if (field in body) update[field] = body[field]
  }

  const { error } = await supabaseAdmin
    .from('platform_announcements')
    .update(update)
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
