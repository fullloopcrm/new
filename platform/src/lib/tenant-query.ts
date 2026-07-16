import { getOwnerUserId } from '@/lib/owner-session'
import { cookies, headers } from 'next/headers'
import { supabaseAdmin } from './supabase'
import { verifyAdminToken, verifyTenantAdminToken } from '@/app/api/admin-auth/route'
import { IMPERSONATE_COOKIE, verifyImpersonationCookie } from './impersonation'
import { verifyTenantHeaderSig } from './tenant-header-sig'
import { tenantServesSite } from './tenant-status'
import type { Tenant } from './tenant'

const SUPER_ADMIN_IDS = [process.env.SUPER_ADMIN_CLERK_ID || '']

export type TenantContext = {
  userId: string
  tenantId: string
  tenant: Tenant
  role: string
}

async function logImpersonationEvent(
  actorKind: 'pin_admin' | 'clerk_super_admin',
  actorId: string,
  tenantId: string,
): Promise<void> {
  try {
    const h = await headers()
    await supabaseAdmin.from('impersonation_events').insert({
      actor_kind: actorKind,
      actor_id: actorId,
      tenant_id: tenantId,
      path: h.get('x-invoke-path') || h.get('referer') || null,
      method: h.get('x-invoke-method') || null,
      ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null,
      user_agent: h.get('user-agent'),
    })
  } catch (e) {
    // Best-effort. Never block a request on audit log failure.
    console.error('[impersonation-audit] insert failed:', e)
  }
}

// Auth + tenant lookup — used by every API route
// Supports admin impersonation via cookie (PIN auth or Clerk super admin)
export async function getTenantForRequest(): Promise<TenantContext> {
  const cookieStore = await cookies()

  // PIN admin on a tenant's OWN domain. Middleware injects a signed x-tenant-id
  // header for the domain; a valid admin_token authorizes that tenant's Loop.
  //
  // Checked BEFORE the impersonation cookie (the super-admin PIN works on any
  // host, and neither admin_token nor fl_impersonate carry a cookie `domain`,
  // so both are host-only — a super admin can pick up an admin_token on
  // tenant B's own domain while a STALE fl_impersonate=<tenant A> cookie from
  // an earlier, different session is still set on that same host). Header
  // must win here to match tenant.ts's getCurrentTenant() (header-first) and
  // DashboardLayout's own auth gate, which authorizes this exact header path
  // and renders tenant B's name/branding — if this function resolved
  // impersonation first instead, every /api/dashboard/* write on that page
  // would silently land on tenant A while the UI shows tenant B.
  {
    const h = await headers()
    const headerTenantId = h.get('x-tenant-id')
    const headerSig = h.get('x-tenant-sig')
    if (headerTenantId && verifyTenantHeaderSig(headerTenantId, headerSig)) {
      const adminToken = cookieStore.get('admin_token')?.value
      if (adminToken) {
        // Global super-admin token → owner of whatever tenant this domain is.
        if (verifyAdminToken(adminToken)) {
          const { data: tenant } = await supabaseAdmin
            .from('tenants')
            .select('*')
            .eq('id', headerTenantId)
            .single()
          if (tenant) {
            return { userId: 'admin', tenantId: tenant.id, tenant, role: 'owner' }
          }
        }
        // Per-tenant member token → only valid if minted for THIS tenant.
        const ta = verifyTenantAdminToken(adminToken, headerTenantId)
        if (ta) {
          const { data: tenant } = await supabaseAdmin
            .from('tenants')
            .select('*')
            .eq('id', headerTenantId)
            .single()
          if (tenant) {
            return { userId: ta.memberId, tenantId: tenant.id, tenant, role: ta.role }
          }
        }
      }
    }
  }

  const impersonateId = verifyImpersonationCookie(cookieStore.get(IMPERSONATE_COOKIE)?.value)

  // Admin PIN impersonation — no Clerk needed
  if (impersonateId) {
    const adminToken = cookieStore.get('admin_token')?.value
    if (adminToken && verifyAdminToken(adminToken)) {
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('*')
        .eq('id', impersonateId)
        .single()

      if (tenant) {
        await logImpersonationEvent('pin_admin', 'admin', tenant.id)
        return {
          userId: 'admin',
          tenantId: tenant.id,
          tenant,
          role: 'owner',
        }
      }
    }
  }

  // Clerk auth flow
  const userId = await getOwnerUserId()
  if (!userId) {
    throw new AuthError('Unauthorized', 401)
  }

  // Clerk super admin impersonation
  if (SUPER_ADMIN_IDS.includes(userId) && impersonateId) {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', impersonateId)
      .single()

    if (tenant) {
      await logImpersonationEvent('clerk_super_admin', userId, tenant.id)
      return {
        userId,
        tenantId: tenant.id,
        tenant,
        role: 'owner',
      }
    }
  }

  // Normal flow: look up membership
  const { data: membership } = await supabaseAdmin
    .from('tenant_members')
    .select('tenant_id, role')
    .eq('clerk_user_id', userId)
    .single()

  if (!membership) {
    throw new AuthError('No tenant found', 404)
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', membership.tenant_id)
    .single()

  if (!tenant) {
    throw new AuthError('Tenant not found', 404)
  }

  // Real (non-impersonated) owner login only — admin PIN and Clerk
  // super-admin impersonation above intentionally skip this gate so support
  // can still reach a suspended/cancelled/deleted tenant's account. Mirrors
  // tenant.ts's getCurrentTenant() gate (which authorizes the DashboardLayout
  // render for this exact path) — without it, this function (the auth gate
  // behind ~195 API route importers and requirePermission()) would keep
  // authorizing every write for a tenant already dark everywhere else that
  // enforces tenantServesSite (middleware, ingest routes).
  if (!tenantServesSite(tenant.status)) {
    throw new AuthError('Tenant account is not active', 403)
  }

  return {
    userId,
    tenantId: tenant.id,
    tenant,
    role: membership.role,
  }
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
