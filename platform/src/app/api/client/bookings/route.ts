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

export async function GET(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  if (!clientId) return NextResponse.json({ error: 'Missing client_id' }, { status: 400 })

  const auth = await protectClientAPI(tenant.id, clientId)
  if (auth instanceof NextResponse) return auth

  const now = new Date().toISOString()

  const { data: clientRecord } = await supabaseAdmin
    .from('clients')
    .select('email, phone, do_not_service')
    .eq('id', clientId)
    .eq('tenant_id', tenant.id)
    .single()

  // Collect duplicate client rows by email/phone (legacy imports create these).
  const clientIds = [clientId]

  if (clientRecord?.email) {
    const { data: emailMatches } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('tenant_id', tenant.id)
      .ilike('email', clientRecord.email.trim())
    if (emailMatches) {
      for (const m of emailMatches) if (!clientIds.includes(m.id)) clientIds.push(m.id)
    }
  }

  if (clientRecord?.phone) {
    const digits = clientRecord.phone.replace(/\D/g, '')
    if (digits.length >= 10) {
      const { data: allClients } = await supabaseAdmin
        .from('clients')
        .select('id, phone')
        .eq('tenant_id', tenant.id)
      if (allClients) {
        for (const c of allClients) {
          const cDigits = (c.phone || '').replace(/\D/g, '')
          if (cDigits && (cDigits === digits || cDigits.endsWith(digits) || digits.endsWith(cDigits))) {
            if (!clientIds.includes(c.id)) clientIds.push(c.id)
          }
        }
      }
    }
  }

  const { data: upcoming } = await supabaseAdmin
    .from('bookings')
    .select('*, team_members!bookings_team_member_id_fkey(name)')
    .eq('tenant_id', tenant.id)
    .in('client_id', clientIds)
    .gte('start_time', now)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true })

  const { data: past } = await supabaseAdmin
    .from('bookings')
    .select('*, team_members!bookings_team_member_id_fkey(name)')
    .eq('tenant_id', tenant.id)
    .in('client_id', clientIds)
    .lt('start_time', now)
    .order('start_time', { ascending: false })
    .limit(20)

  return NextResponse.json({
    upcoming: (upcoming || []).map(b => omit(b, NEVER_RETURNED_BOOKING_FIELDS)),
    past: (past || []).map(b => omit(b, NEVER_RETURNED_BOOKING_FIELDS)),
    do_not_service: clientRecord?.do_not_service || false,
  })
}
