import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { clearSettingsCache } from '@/lib/settings'
import { audit } from '@/lib/audit'
import {
  PORTAL_PERMISSION_CATALOG,
  PORTAL_ROLES,
  getPortalRolePermissions,
  resolvePortalPermissions,
  isPortalRole,
  isValidPortalPermission,
  type PortalPermission,
  type PortalRole,
  type PortalRolePermissionOverrides,
} from '@/lib/portal-rbac'

function readOverrides(selenaConfig: unknown): PortalRolePermissionOverrides {
  const raw = (selenaConfig as { portal_role_permissions?: unknown } | null)?.portal_role_permissions
  if (!raw || typeof raw !== 'object') return {}
  return raw as PortalRolePermissionOverrides
}

export async function GET() {
  try {
    const ctx = await getTenantForRequest()
    if (!['owner', 'admin'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const overrides = readOverrides(ctx.tenant?.selena_config)

    const roles = PORTAL_ROLES.map((r) => ({
      value: r.value,
      label: r.label,
      description: r.description,
      editable: true, // every field tier is customizable — no lockout risk in the portal
      defaults: getPortalRolePermissions(r.value),
      effective: resolvePortalPermissions(r.value, overrides),
    }))

    return NextResponse.json({
      catalog: PORTAL_PERMISSION_CATALOG,
      customizableRoles: PORTAL_ROLES.map((r) => r.value),
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

export async function PUT(request: Request) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  if (!['owner', 'admin'].includes(tenant.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { tenantId } = tenant
    const body = await request.json().catch(() => ({}))
    const incoming: IncomingOverrides =
      body && typeof body.overrides === 'object' && body.overrides ? body.overrides : {}

    const cleaned: PortalRolePermissionOverrides = {}

    for (const [role, perms] of Object.entries(incoming)) {
      if (!isPortalRole(role)) {
        return NextResponse.json({ error: `Unknown field role "${role}"` }, { status: 400 })
      }
      if (!perms || typeof perms !== 'object') continue

      const defaults = new Set<PortalPermission>(getPortalRolePermissions(role))
      const roleDelta: Partial<Record<PortalPermission, boolean>> = {}

      for (const [perm, value] of Object.entries(perms)) {
        if (!isValidPortalPermission(perm)) {
          return NextResponse.json({ error: `Unknown permission "${perm}"` }, { status: 400 })
        }
        if (typeof value !== 'boolean') {
          return NextResponse.json({ error: `Permission "${perm}" must be true or false` }, { status: 400 })
        }
        if (value !== defaults.has(perm)) {
          roleDelta[perm] = value
        }
      }

      if (Object.keys(roleDelta).length > 0) {
        cleaned[role as PortalRole] = roleDelta
      }
    }

    // Merge atomically in Postgres, same TOCTOU class + fix as
    // settings/permissions/route.ts's role_permissions merge (see that
    // route for the full race rationale) -- a portal-permissions save
    // racing a role-permissions or persona/service-area save on the same
    // selena_config blob would otherwise silently drop whichever committed
    // first.
    const { error } = await supabaseAdmin.rpc('merge_tenant_selena_config', {
      p_tenant_id: tenantId, p_patch: { portal_role_permissions: cleaned },
    })

    if (error) {
      return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 })
    }

    clearSettingsCache(tenantId)

    await audit({
      tenantId,
      action: 'permissions.updated',
      entityType: 'settings',
      entityId: tenantId,
      details: { portalRoles: Object.keys(cleaned) },
    })

    return NextResponse.json({ overrides: cleaned })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
