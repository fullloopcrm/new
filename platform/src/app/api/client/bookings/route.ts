import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { protectClientAPI } from '@/lib/client-auth'

export async function GET(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  if (!clientId) return NextResponse.json({ error: 'Missing client_id' }, { status: 400 })

  const auth = await protectClientAPI(tenant.id, clientId)
  if (auth instanceof NextResponse) return auth

  const now = new Date().toISOString()

  const { data: clientRecord } = await tenantDb(tenant.id)
    .from('clients')
    .select('email, phone, do_not_service')
    .eq('id', clientId)
    .single()

  // Collect duplicate client rows by email/phone (legacy imports create these).
  const clientIds = [clientId]

  if (clientRecord?.email) {
    // tenantDb's select() takes a non-literal `columns` param, which widens
    // supabase-js's column-string type inference — cast the narrow-select
    // result to the shape actually selected (see portal/connect/unread for
    // the same gap).
    const { data: emailMatches } = (await tenantDb(tenant.id)
      .from('clients')
      .select('id')
      .ilike('email', clientRecord.email.trim())) as { data: { id: string }[] | null }
    if (emailMatches) {
      for (const m of emailMatches) if (!clientIds.includes(m.id)) clientIds.push(m.id)
    }
  }

  if (clientRecord?.phone) {
    const digits = clientRecord.phone.replace(/\D/g, '')
    if (digits.length >= 10) {
      const { data: allClients } = (await tenantDb(tenant.id)
        .from('clients')
        .select('id, phone')) as { data: { id: string; phone: string | null }[] | null }
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

  const { data: upcoming } = await tenantDb(tenant.id)
    .from('bookings')
    .select('*, team_members!bookings_team_member_id_fkey(name)')
    .in('client_id', clientIds)
    .gte('start_time', now)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true })

  const { data: past } = await tenantDb(tenant.id)
    .from('bookings')
    .select('*, team_members!bookings_team_member_id_fkey(name)')
    .in('client_id', clientIds)
    .lt('start_time', now)
    .order('start_time', { ascending: false })
    .limit(20)

  return NextResponse.json({
    upcoming: upcoming || [],
    past: past || [],
    do_not_service: clientRecord?.do_not_service || false,
  })
}
