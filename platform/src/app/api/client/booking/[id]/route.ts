import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { protectClientAPI } from '@/lib/client-auth'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*, team_members(name)')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const auth = await protectClientAPI(tenant.id, data.client_id)
  if (auth instanceof NextResponse) return auth

  return NextResponse.json(data)
}
