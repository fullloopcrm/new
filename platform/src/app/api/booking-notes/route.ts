import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('booking_id')
  if (!bookingId) return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })

  let ctx
  try {
    ctx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

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

  let ctx
  try {
    ctx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  // booking_id is a caller-supplied FK — booking_notes has no cross-tenant FK
  // check, so an unvalidated id would let this tenant attach a note to another
  // tenant's booking. Verify ownership before insert.
  const { data: ownedBooking } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('id', booking_id)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()
  if (!ownedBooking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

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
