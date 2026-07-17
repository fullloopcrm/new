import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { protectClientAPI } from '@/lib/client-auth'
import { omit } from '@/lib/validate'

// bookings.team_member_token/token_expires_at — a fresh crypto-random token
// ("Team member token (for portal access)", supabase/schema.sql's legacy
// `worker_token` column comment) generated and stored on every booking
// (client/book, client/recurring, admin/recurring-schedules, bookings/batch
// all write it). admin/recurring-schedules/route.ts's own doc comment
// confirms the live column is named `team_member_token` (nycmaid's
// `cleaner_token` renamed on port) — schema.sql's `worker_token` is the
// stale pre-rename name. Nothing in the repo ever reads/validates either
// name as a credential. Zero legitimate reader — strip both possible names
// before this reaches the client's browser, same invariant as the
// clients.pin/team_members.pin redactions.
const NEVER_RETURNED_BOOKING_FIELDS = ['team_member_token', 'worker_token', 'token_expires_at']

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*, team_members!bookings_team_member_id_fkey(name)')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const auth = await protectClientAPI(tenant.id, data.client_id)
  if (auth instanceof NextResponse) return auth

  return NextResponse.json(omit(data, NEVER_RETURNED_BOOKING_FIELDS))
}
