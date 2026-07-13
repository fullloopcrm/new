import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { protectClientAPI } from '@/lib/client-auth'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const { id } = await params

  const { data, error } = await tenantDb(tenant.id)
    .from('bookings')
    .select('*, team_members!bookings_team_member_id_fkey(name)')
    .eq('id', id)
    .single<{ client_id: string }>()

  if (error || !data) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const auth = await protectClientAPI(tenant.id, data.client_id)
  if (auth instanceof NextResponse) return auth

  return NextResponse.json(data)
}
