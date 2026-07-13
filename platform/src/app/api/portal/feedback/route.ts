import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../auth/token'

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { rating, comment, booking_id } = await request.json().catch(() => ({}))

  const { data, error } = await tenantDb(auth.tid)
    .from('reviews')
    .insert({
      client_id: auth.id,
      booking_id: booking_id || null,
      rating: rating || null,
      comment: comment || null,
      source: 'internal',
      status: 'collected',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ review: data }, { status: 201 })
}
