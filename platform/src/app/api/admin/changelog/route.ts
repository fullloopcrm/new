import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const { data, error } = await supabaseAdmin
    .from('platform_announcements')
    .select('*')
    .eq('type', 'changelog')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entries: data || [] })
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { title, body, published } = await request.json()

  if (!title || !body) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('platform_announcements')
    .insert({
      title,
      body,
      type: 'changelog',
      published: published ?? true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entry: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id, title, body, published } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (title !== undefined) update.title = title
  if (body !== undefined) update.body = body
  if (published !== undefined) update.published = published

  const { error } = await supabaseAdmin
    .from('platform_announcements')
    .update(update)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
