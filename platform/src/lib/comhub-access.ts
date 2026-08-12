import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { verifyAdminToken } from '@/app/api/admin-auth/route'

// /admin/comhub and /dashboard/comhub share the exact same routes/UI --
// but every one of these routes was gated by requireAdmin(), which only
// accepts FullLoop's own platform super-admin token. That's correct for
// FullLoop staff browsing /admin/comhub directly,
// but a tenant's own users (owner, admin, manager, staff, virtual_assistant)
// hitting /dashboard/comhub authenticate a completely different way --
// getTenantForRequest(), the same resolver every other tenant-dashboard
// route already uses. Routes never got the second path added, so any
// non-super-admin tenant login 401'd on every ComHub call (surfaced as "VAs
// can't see ComHub", 2026-08-07, but affects every tenant role that isn't
// the platform owner's own login).
//
// FULL_LOOP_SYSTEM_TENANT_ID mirrors the deleted getComhubAdminTenantId()'s
// own constant (comhub-admin-tenant.ts, removed once this replaced its only
// callers): FullLoop staff viewing /admin/comhub with no tenant impersonated
// have no tenant_members row to resolve via getTenantForRequest() (it throws), but a
// bare valid super-admin token is still enough to show FullLoop's own system
// inbox -- preserves that pre-existing behavior exactly.
const FULL_LOOP_SYSTEM_TENANT_ID = '117968d2-24a1-42b5-96bd-7022e4e838ee'

export type ComhubAccess = { tenantId: string; role: string; userId?: string }

export async function requireComhubAccess(): Promise<ComhubAccess | NextResponse> {
  try {
    const ctx = await getTenantForRequest()
    // userId is 'admin' on the platform-owner login path (no real tenant_members
    // row) — only a real tenant_members id is usable as blocked_by's FK target.
    return { tenantId: ctx.tenantId, role: ctx.role, userId: ctx.userId !== 'admin' ? ctx.userId : undefined }
  } catch (err) {
    if (!(err instanceof AuthError)) throw err
    const cookieStore = await cookies()
    const adminToken = cookieStore.get('admin_token')?.value
    if (adminToken && verifyAdminToken(adminToken)) {
      return { tenantId: FULL_LOOP_SYSTEM_TENANT_ID, role: 'owner' }
    }
    // The bare AuthError message ("Unauthorized") was surfacing verbatim in
    // the ComHub UI on session expiry, reading like a broken feature rather
    // than a login problem. Swap in copy that tells the user what to do.
    const message = err.status === 401
      ? 'Your session has expired or you don’t have access to ComHub messaging. Try signing in again.'
      : err.message
    return NextResponse.json({ error: message }, { status: err.status })
  }
}
