import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

/** Edit a tip, or flip is_active — the one action that actually ships content to tenants. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await request.json()
  const { title, tip_body, trade_key, state_code, source_citation, review_due_date, is_active } = body

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (title !== undefined) update.title = title
  if (tip_body !== undefined) update.body = tip_body
  if (trade_key !== undefined) update.trade_key = trade_key || null
  if (state_code !== undefined) update.state_code = state_code || null
  if (source_citation !== undefined) update.source_citation = source_citation || null
  if (review_due_date !== undefined) update.review_due_date = review_due_date || null
  if (is_active !== undefined) update.is_active = !!is_active

  const { error } = await supabaseAdmin.from('legal_tips').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const { error } = await supabaseAdmin.from('legal_tips').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
