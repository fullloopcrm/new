import { NextResponse } from 'next/server'
import { getTenantForRequest, type TenantContext } from './tenant-query'
import { hasPermission } from './rbac'

type Permission = Parameters<typeof hasPermission>[1]

// Middleware: get tenant + check permission in one call
export async function requirePermission(permission: Permission): Promise<
  { tenant: TenantContext; error: null } | { tenant: null; error: NextResponse }
> {
  try {
    const tenant = await getTenantForRequest()

    if (!hasPermission(tenant.role, permission)) {
      return {
        tenant: null,
        error: NextResponse.json(
          { error: 'Forbidden: insufficient permissions' },
          { status: 403 }
        ),
      }
    }

    return { tenant, error: null }
  } catch {
    return {
      tenant: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
}
