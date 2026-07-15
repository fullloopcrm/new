import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('booking_id')
  if (!bookingId) return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })

  const { tenant: ctx, error: authError } = await requirePermission('bookings.view')
  if (authError) return authError

  const { data, error } = await tenantDb(ctx.tenantId)
    .from('booking_notes')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const body = await request.json()
  const { booking_id, content, author_type, author_name } = body

  if (!booking_id) return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const { tenant: ctx, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  const { data, error } = await tenantDb(ctx.tenantId)
    .from('booking_notes')
    .insert({
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
