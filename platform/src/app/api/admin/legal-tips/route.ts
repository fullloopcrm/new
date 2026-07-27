/**
 * Admin CRUD for the Legal Overlook tip library. Every tip is created here
 * inactive (is_active: false) by default — it never surfaces to a tenant
 * until a human flips it active, which is meant to happen only after a real
 * attorney has reviewed the content. See migrations/2026_07_27_legal_overlook.sql.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const { data: tips, error } = await supabaseAdmin
    .from('legal_tips')
    .select('*, legal_tip_triggers(*)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tips: tips || [] })
}

export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const body = await request.json()
  const { title, tip_body, trade_key, state_code, source_citation, review_due_date, trigger_type, days_before } = body

  if (!title || !tip_body || !trigger_type) {
    return NextResponse.json({ error: 'title, tip_body, and trigger_type are required' }, { status: 400 })
  }

  const { data: tip, error: tipError } = await supabaseAdmin
    .from('legal_tips')
    .insert({
      title,
      body: tip_body,
      trade_key: trade_key || null,
      state_code: state_code || null,
      source_citation: source_citation || null,
      review_due_date: review_due_date || null,
      is_active: false, // always starts inactive — see file header
    })
    .select()
    .single()

  if (tipError) return NextResponse.json({ error: tipError.message }, { status: 500 })

  const { error: triggerError } = await supabaseAdmin.from('legal_tip_triggers').insert({
    tip_id: tip.id,
    trigger_type,
    days_before: days_before || null,
  })

  if (triggerError) return NextResponse.json({ error: triggerError.message }, { status: 500 })

  return NextResponse.json({ tip })
}
