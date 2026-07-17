import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission, overridesFor } from '@/lib/require-permission'
import { hasPermission } from '@/lib/rbac'
import { supabaseAdmin } from '@/lib/supabase'
import { pick } from '@/lib/validate'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'

// Bookings still in one of these statuses have no completed-work history to
// preserve — safe to unassign on delete. Anything else (completed/paid/
// cancelled/no_show) keeps its team_member_id: finance/tax-export,
// finance/cleaner-income, and finance/payroll-prep all key off this FK for a
// departed employee's past-work attribution (1099s, income reports) — nulling
// it on delete would silently erase that history right when it matters most.
// Mirrors the same list on the legacy /api/cleaners/[id] shim (item 118).
const UNASSIGNABLE_ON_DELETE_STATUSES = ['pending', 'scheduled', 'confirmed', 'in_progress']

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

    // Upcoming/in-flight bookings lose their assigned tech and need a human
    // to reassign them — nobody was ever told this happened before now.
    const { data: unassigned } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time')
      .eq('team_member_id', id)
      .eq('tenant_id', tenantId)
      .in('status', UNASSIGNABLE_ON_DELETE_STATUSES)

    await supabaseAdmin.from('bookings').update({ team_member_id: null }).eq('team_member_id', id).eq('tenant_id', tenantId).in('status', UNASSIGNABLE_ON_DELETE_STATUSES)
    await supabaseAdmin.from('bookings').update({ suggested_team_member_id: null }).eq('suggested_team_member_id', id).eq('tenant_id', tenantId)
    await supabaseAdmin.from('recurring_schedules').update({ team_member_id: null }).eq('team_member_id', id).eq('tenant_id', tenantId)

    const { data: memberRow } = await supabaseAdmin.from('team_members').select('name').eq('id', id).eq('tenant_id', tenantId).single()

    const { error } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'team.deleted', entityType: 'team_member', entityId: id })

    if (unassigned && unassigned.length > 0) {
      const memberName = memberRow?.name || 'Deleted team member'
      await notify({
        tenantId,
        type: 'lifecycle_change',
        title: `${memberName} deleted — ${unassigned.length} job${unassigned.length === 1 ? '' : 's'} need reassignment`,
        message: `${unassigned.length} upcoming booking${unassigned.length === 1 ? '' : 's'} lost their assigned team member and now need a new one.`,
        channel: 'email',
        recipientType: 'admin',
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
