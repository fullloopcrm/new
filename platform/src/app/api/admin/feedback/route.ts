import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const { data, error } = await supabaseAdmin
    .from('platform_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { count: unreadCount } = await supabaseAdmin
    .from('platform_feedback')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'unread')

  return NextResponse.json({ feedback: data || [], unread: unreadCount || 0 })
}

export async function PATCH(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id, status, admin_notes } = await request.json()

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const update: Record<string, string> = {}
  if (status) update.status = status
  if (admin_notes !== undefined) update.admin_notes = admin_notes

  const { error } = await supabaseAdmin
    .from('platform_feedback')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
