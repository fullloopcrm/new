import { getOwnerUserId } from '@/lib/owner-session'
import { cookies, headers } from 'next/headers'
import { supabaseAdmin } from './supabase'
import { verifyAdminToken, verifyTenantAdminToken } from '@/app/api/admin-auth/route'
import { IMPERSONATE_COOKIE, IMPERSONATE_TTL_MS, signImpersonation, verifyImpersonationCookie } from './impersonation'
import { verifyTenantHeaderSig } from './tenant-header-sig'
import type { Tenant } from './tenant'
import { beginAuditActor, setAuditActor, type AuditActorKind } from './audit-context'

const SUPER_ADMIN_IDS = [process.env.SUPER_ADMIN_CLERK_ID || '']

export type TenantContext = {
  userId: string
  tenantId: string
  tenant: Tenant
  role: string
}

type RequestMeta = {
  path: string | null
  method: string | null
  ip: string | null
  userAgent: string | null
}

async function getRequestMeta(): Promise<RequestMeta> {
  const h = await headers()
  return {
    path: h.get('x-invoke-path') || h.get('referer') || null,
    method: h.get('x-invoke-method') || null,
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null,
    userAgent: h.get('user-agent'),
  }
}

// Fills in the actor placeholder that beginAuditActor() already bound at the
// top of getTenantForRequest(), so every subsequent supabaseAdmin write (in
// this function's callers) gets attributed in tenant_audit_log. See
// audit-context.ts for why this can't just be a single setAuditActor(actor)
// call made from here directly.
async function recordAuditActor(
  actorKind: AuditActorKind,
  actorId: string,
  actorRole: string,
  tenantId: string,
): Promise<void> {
  const meta = await getRequestMeta()
  setAuditActor({
    actorKind,
    actorId,
    actorRole,
    tenantId,
    ...meta,
  })
}

// fl_impersonate embeds a hard 1-hour expiry (see impersonation.ts) and
// nothing was resetting it, so a platform admin mid-way through a long task
// (e.g. building a proposal, autosaving for 20+ minutes) would have the
// cookie silently expire while admin_token (24h) was still valid — every
// subsequent tenant-scoped call then throws AuthError with no visible cause.
// Sliding-window renewal on every authenticated hit keeps an active session
// alive indefinitely. Only mutates cookies from a Route Handler / Server
// Action context; called from a Server Component page this throws, so it's
// a best-effort no-op there — the next API call from the client renews it.
async function renewImpersonationCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  tenantId: string,
): Promise<void> {
  try {
    cookieStore.set(IMPERSONATE_COOKIE, signImpersonation(tenantId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: IMPERSONATE_TTL_MS / 1000,
      path: '/',
    })
  } catch {
    // Read-only cookies() context (Server Component) — ignore.
  }
}

async function logImpersonationEvent(
  actorKind: 'pin_admin' | 'clerk_super_admin',
  actorId: string,
  tenantId: string,
): Promise<void> {
  try {
    const meta = await getRequestMeta()
    await supabaseAdmin.from('impersonation_events').insert({
      actor_kind: actorKind,
      actor_id: actorId,
      tenant_id: tenantId,
      path: meta.path,
      method: meta.method,
      ip: meta.ip,
      user_agent: meta.userAgent,
    })
  } catch (e) {
    // Best-effort. Never block a request on audit log failure.
    console.error('[impersonation-audit] insert failed:', e)
  }
}

// Auth + tenant lookup — used by every API route
// Supports admin impersonation via cookie (PIN auth or Clerk super admin)
export async function getTenantForRequest(): Promise<TenantContext> {
  // Must run before any await in this function — see audit-context.ts.
  beginAuditActor()

  const cookieStore = await cookies()
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
        await renewImpersonationCookie(cookieStore, tenant.id)
        await logImpersonationEvent('pin_admin', 'admin', tenant.id)
        await recordAuditActor('pin_admin', 'admin', 'owner', tenant.id)
        return {
          userId: 'admin',
          tenantId: tenant.id,
          tenant,
          role: 'owner',
        }
      }
    }
  }

  // PIN admin on a tenant's OWN domain. Middleware injects a signed x-tenant-id
  // header for the domain; a valid admin_token authorizes that tenant's Loop.
  // (No impersonation cookie exists here — the domain identifies the tenant.)
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
            await recordAuditActor('pin_admin', 'admin', 'owner', tenant.id)
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
            await recordAuditActor('tenant_member_pin', ta.memberId, ta.role, tenant.id)
            return { userId: ta.memberId, tenantId: tenant.id, tenant, role: ta.role }
          }
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
      await recordAuditActor('clerk_super_admin', userId, 'owner', tenant.id)
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

  await recordAuditActor('clerk_user', userId, membership.role, tenant.id)

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
