/**
 * Waitlist entry — status transitions. Tenant-scoped.
 *
 * The dedicated `waitlist` table (migrations/051_waitlist.sql) declares
 * status: 'open' | 'contacted' | 'booked' | 'expired', and GET /api/waitlist
 * already filters out 'expired' rows — but nothing anywhere ever wrote any
 * status besides the insert-time default 'open'. Every entry, including ones
 * the admin already booked from the panel, stayed 'open' forever, so the
 * Waiting List kept growing with stale, already-handled leads with no way to
 * clear them short of a manual DB edit.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

type Params = { params: Promise<{ id: string }> }

const ALLOWED_STATUSES = new Set(['open', 'contacted', 'booked', 'expired'])

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json()
    const status = typeof body.status === 'string' ? body.status : ''
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: `status must be one of: ${[...ALLOWED_STATUSES].join(', ')}` }, { status: 400 })
    }

    const { data, error } = await tenantDb(tenantId)
      .from('waitlist')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ entry: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/waitlist/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
