// HR roster read for the People hub. Tenant-scoped; fuses team_members with
// their HR profile and Stripe Connect status. Global route, one copy.
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { listEmployees } from '@/lib/hr'

export async function GET() {
  const { tenant, error } = await requirePermission('team.view')
  if (error) return error
  try {
    const employees = await listEmployees(tenant.tenantId)
    return NextResponse.json({ employees })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
