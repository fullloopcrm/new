import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest } from '@/lib/tenant-query'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('booking_id')
  if (!bookingId) return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })

  const ctx = await getTenantForRequest()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('booking_notes')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const body = await request.json()
  const { booking_id, content, author_type, author_name } = body

  if (!booking_id) return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const ctx = await getTenantForRequest()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('booking_notes')
    .insert({
      tenant_id: ctx.tenantId,
      booking_id,
      author_type: author_type || 'admin',
      author_name: author_name || 'Admin',
      content: content.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
