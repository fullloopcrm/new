import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { verifyAdminToken } from '@/app/api/admin-auth/route'

// /admin/comhub and /dashboard/comhub share the exact same routes/UI (see
// comhub-admin-tenant.ts) -- but every one of these routes was gated by
// requireAdmin(), which only accepts FullLoop's own platform super-admin
// token. That's correct for FullLoop staff browsing /admin/comhub directly,
// but a tenant's own users (owner, admin, manager, staff, virtual_assistant)
// hitting /dashboard/comhub authenticate a completely different way --
// getTenantForRequest(), the same resolver every other tenant-dashboard
// route already uses. Routes never got the second path added, so any
// non-super-admin tenant login 401'd on every ComHub call (surfaced as "VAs
// can't see ComHub", 2026-08-07, but affects every tenant role that isn't
// the platform owner's own login).
//
// FULL_LOOP_SYSTEM_TENANT_ID mirrors comhub-admin-tenant.ts's own constant:
// FullLoop staff viewing /admin/comhub with no tenant impersonated have no
// tenant_members row to resolve via getTenantForRequest() (it throws), but a
// bare valid super-admin token is still enough to show FullLoop's own system
// inbox -- preserves that pre-existing behavior exactly.
const FULL_LOOP_SYSTEM_TENANT_ID = '117968d2-24a1-42b5-96bd-7022e4e838ee'

export type ComhubAccess = { tenantId: string; role: string }

export async function requireComhubAccess(): Promise<ComhubAccess | NextResponse> {
  try {
    const ctx = await getTenantForRequest()
    return { tenantId: ctx.tenantId, role: ctx.role }
  } catch (err) {
    if (!(err instanceof AuthError)) throw err
    const cookieStore = await cookies()
    const adminToken = cookieStore.get('admin_token')?.value
    if (adminToken && verifyAdminToken(adminToken)) {
      return { tenantId: FULL_LOOP_SYSTEM_TENANT_ID, role: 'owner' }
    }
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
}
