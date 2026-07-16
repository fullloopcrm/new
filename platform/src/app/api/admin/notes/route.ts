/**
 * CRM notes API (admin). Timestamped, authored, image-capable notes attached to
 * a lead or tenant.
 *   GET    ?subject_type=lead|tenant&subject_id=UUID  → list, newest first
 *   POST   { subject_type, subject_id, body?, image_urls? }
 *   PATCH  { id, body?, image_urls? }
 *   DELETE ?id=UUID
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

function validType(t: string | null): t is 'lead' | 'tenant' {
  return t === 'lead' || t === 'tenant'
}

// image_urls is rendered as <a href={u}><img src={u} /></a> in the admin
// sales panel (admin/sales/LeadsPanel.tsx) — a javascript: URI here would
// execute in whichever admin views/clicks the note next. Require plain
// http(s) URLs.
function isHttpUrl(u: unknown): u is string {
  return typeof u === 'string' && /^https?:\/\//i.test(u)
}

export async function GET(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const subjectType = searchParams.get('subject_type')
  const subjectId = searchParams.get('subject_id')
  if (!validType(subjectType) || !subjectId) {
    return NextResponse.json({ error: 'subject_type and subject_id required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('crm_notes')
    .select('*')
    .eq('subject_type', subjectType)
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notes: data || [] })
}

export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { subject_type, subject_id, body, image_urls } = await request.json().catch(() => ({}))
  if (!validType(subject_type) || !subject_id) {
    return NextResponse.json({ error: 'subject_type and subject_id required' }, { status: 400 })
  }
  const text = typeof body === 'string' ? body.trim() : ''
  const imgs = Array.isArray(image_urls) ? image_urls.filter(isHttpUrl) : []
  if (!text && imgs.length === 0) {
    return NextResponse.json({ error: 'A note needs text or an image' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('crm_notes')
    .insert({ subject_type, subject_id, body: text || null, image_urls: imgs, author: 'admin' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}

export async function PATCH(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id, body, image_urls } = await request.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body !== undefined) updates.body = typeof body === 'string' ? body.trim() || null : null
  if (Array.isArray(image_urls)) updates.image_urls = image_urls.filter(isHttpUrl)

  const { data, error } = await supabaseAdmin
    .from('crm_notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}

export async function DELETE(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('crm_notes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
