import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../auth/token'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  // Return the full pricing model, not just the legacy hourly columns, so the
  // portal can render flat / per-unit / hourly prices per the tenant's trade.
  const { data, error } = await tenantDb(auth.tid)
    .from('service_types')
    .select('id, name, description, default_duration_hours, default_hourly_rate, pricing_model, price_cents, per_unit, unit_label, min_charge_cents, active')
    .eq('active', true)
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ services: data })
}
