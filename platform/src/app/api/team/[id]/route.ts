import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission, overridesFor } from '@/lib/require-permission'
import { hasPermission } from '@/lib/rbac'
import { supabaseAdmin } from '@/lib/supabase'
import { pick } from '@/lib/validate'
import { audit } from '@/lib/audit'

// Fields only a team.edit holder (owner/admin) may read back: pin is the
// portal-login credential (only settable via team.edit's PUT /api/cleaners/[id]),
// pay_rate/notes are payroll/HR data gated elsewhere by the separate
// finance.payroll permission, and tax_* holds SSN last-4 + tax address.
// team.view alone (held down to 'staff', the lowest role) must not see these.
// hourly_rate is intentionally NOT restricted — it's already visible via the
// list endpoints (GET /api/team, /api/cleaners) to the same team.view tier.
const RESTRICTED_MEMBER_FIELDS = [
  'pin', 'pay_rate', 'notes',
  'tax_classification', 'tax_address', 'tax_city', 'tax_state', 'tax_zip',
  'tax_ssn_last4', 'tax_ssn_encrypted', 'tax_ein', 'tax_business_name',
]

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('team.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!hasPermission(tenant.role, 'team.edit', overridesFor(tenant))) {
      for (const field of RESTRICTED_MEMBER_FIELDS) delete (data as Record<string, unknown>)[field]
    }

    return NextResponse.json({ member: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json()
    const fields = pick(body, ['name', 'email', 'phone', 'role', 'hourly_rate', 'pay_rate', 'working_days', 'status', 'preferred_language', 'notes', 'photo_url'])

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'team.updated', entityType: 'team_member', entityId: id })

    return NextResponse.json({ member: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('team.delete')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    const { error } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'team.deleted', entityType: 'team_member', entityId: id })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
