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
import { activateTenant } from '@/lib/activate-tenant'

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

  // Auto-activate: drive the new tenant all the way to live in one step (seeds the
  // founding team member + review destination, registers domains, runs the gate,
  // flips 'active' when ready). Idempotent; best-effort on external steps — a
  // failure here must not lose the successful conversion above.
  let activation = null
  if (result.tenant && !result.alreadyConverted) {
    try {
      activation = await activateTenant(result.tenant.id)
    } catch (e) {
      console.error('[convert] auto-activate failed:', e)
    }
  }

  return NextResponse.json({
    tenant: result.tenant,
    alreadyConverted: result.alreadyConverted,
    ownerPin: result.ownerPin,
    activation,
  })
}
