import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { clearSettingsCache } from '@/lib/settings'
import { audit } from '@/lib/audit'
import {
  PERMISSION_CATALOG,
  CUSTOMIZABLE_ROLES,
  ROLES,
  getRolePermissions,
  resolvePermissions,
  isCustomizableRole,
  isValidPermission,
  type Permission,
  type Role,
  type RolePermissionOverrides,
} from '@/lib/rbac'

function readOverrides(selenaConfig: unknown): RolePermissionOverrides {
  const raw = (selenaConfig as { role_permissions?: unknown } | null)?.role_permissions
  if (!raw || typeof raw !== 'object') return {}
  return raw as RolePermissionOverrides
}

// GET — the full picture the customization UI needs:
//   catalog: grouped/labeled permissions
//   roles:   for each role, hard-coded defaults + effective (defaults + overrides)
//   overrides: the raw stored deltas
export async function GET() {
  try {
    const ctx = await getTenantForRequest()
    if (!['owner', 'admin'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const overrides = readOverrides(ctx.tenant?.selena_config)

    const roles = ROLES.map((r) => ({
      value: r.value,
      label: r.label,
      description: r.description,
      editable: isCustomizableRole(r.value),
      defaults: getRolePermissions(r.value),
      effective: resolvePermissions(r.value, overrides),
    }))

    return NextResponse.json({
      catalog: PERMISSION_CATALOG,
      customizableRoles: CUSTOMIZABLE_ROLES,
      roles,
      overrides,
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

type IncomingOverrides = Record<string, Record<string, unknown>>

// PUT — save the tenant's customizations. Body: { overrides: { admin: { 'finance.payroll': false }, ... } }
// The payload is treated as the FULL desired override map (not a patch). We
// validate every role/permission against the hard-coded catalog, drop any delta
// that equals the default (keeps storage minimal), and never accept an owner
// entry (owner is always full access → no lockout).
export async function PUT(request: Request) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  // Editing the role matrix itself is owner/admin only — never delegate it to a
  // lower role even if that role has been granted settings.edit.
  if (!['owner', 'admin'].includes(tenant.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { tenantId } = tenant
    const body = await request.json().catch(() => ({}))
    const incoming: IncomingOverrides =
      body && typeof body.overrides === 'object' && body.overrides ? body.overrides : {}

    // A non-owner admin editing the 'admin' role's own overrides is
    // self-escalation: admin's hard-coded default deliberately withholds
    // team.delete/settings.integrations (see ROLES description), and this
    // endpoint is the only path to grant them without owner involvement.
    // Only owner may touch the 'admin' entry; admin can still re-tune
    // manager/staff.
    if (tenant.role !== 'owner' && Object.prototype.hasOwnProperty.call(incoming, 'admin')) {
      return NextResponse.json(
        { error: 'Only an owner can customize the admin role' },
        { status: 403 },
      )
    }

    const cleaned: RolePermissionOverrides = {}

    for (const [role, perms] of Object.entries(incoming)) {
      if (!isCustomizableRole(role)) {
        return NextResponse.json(
          { error: `Role "${role}" cannot be customized` },
          { status: 400 },
        )
      }
      if (!perms || typeof perms !== 'object') continue

      const defaults = new Set<Permission>(getRolePermissions(role))
      const roleDelta: Partial<Record<Permission, boolean>> = {}

      for (const [perm, value] of Object.entries(perms)) {
        if (!isValidPermission(perm)) {
          return NextResponse.json(
            { error: `Unknown permission "${perm}"` },
            { status: 400 },
          )
        }
        if (typeof value !== 'boolean') {
          return NextResponse.json(
            { error: `Permission "${perm}" must be true or false` },
            { status: 400 },
          )
        }
        // Only store a delta when it actually deviates from the default.
        if (value !== defaults.has(perm)) {
          roleDelta[perm] = value
        }
      }

      if (Object.keys(roleDelta).length > 0) {
        cleaned[role as Exclude<Role, 'owner'>] = roleDelta
      }
    }

    // Merge into selena_config without clobbering other keys.
    const currentConfig =
      (tenant.tenant?.selena_config as Record<string, unknown> | null) || {}

    // This payload is otherwise a full-replace of role_permissions (see PUT
    // docstring). A non-owner admin's request never includes 'admin' (blocked
    // above), so a naive full-replace would silently wipe any admin-role
    // override the owner previously set. Carry it forward untouched.
    if (tenant.role !== 'owner') {
      const existingAdminOverride = readOverrides(currentConfig).admin
      if (existingAdminOverride) cleaned.admin = existingAdminOverride
    }

    const nextConfig = { ...currentConfig, role_permissions: cleaned }

    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ selena_config: nextConfig })
      .eq('id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    clearSettingsCache(tenantId)

    await audit({
      tenantId,
      action: 'permissions.updated',
      entityType: 'settings',
      entityId: tenantId,
      details: { roles: Object.keys(cleaned) },
    })

    return NextResponse.json({ overrides: cleaned })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
