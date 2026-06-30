/**
 * POST /api/admin/requests/convert  { id }
 *
 * Manual comp / override — create a tenant from a lead WITHOUT payment.
 * Paid proposals create the tenant automatically (Phase 2 payment webhook).
 * Both paths share createTenantFromLead so a tenant is always built the same way.
 *
 * Idempotent: a lead already converted returns its existing tenant.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { createTenantFromLead } from '@/lib/create-tenant-from-lead'

export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await request.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'Lead id is required' }, { status: 400 })

  // Comp path: 'pending' so it lands in Sales → Accounts "Pending Activation".
  const result = await createTenantFromLead(id, { status: 'pending' })
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Convert failed' }, { status: 500 })
  }

  return NextResponse.json({ tenant: result.tenant, alreadyConverted: result.alreadyConverted })
}
