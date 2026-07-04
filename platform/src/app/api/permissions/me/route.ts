import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { resolvePermissions, type RolePermissionOverrides } from '@/lib/rbac'

// The caller's own effective dashboard permissions — used client-side to hide
// nav items the role can't use. Enforcement still happens server-side per route;
// this is UX only.
export async function GET() {
  try {
    const ctx = await getTenantForRequest()
    const overrides = (ctx.tenant?.selena_config?.role_permissions ?? null) as RolePermissionOverrides | null
    return NextResponse.json({
      role: ctx.role,
      permissions: resolvePermissions(ctx.role, overrides),
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
