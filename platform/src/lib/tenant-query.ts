import { auth } from '@clerk/nextjs/server'
import { cookies, headers } from 'next/headers'
import { supabaseAdmin } from './supabase'
import { verifyAdminToken } from '@/app/api/admin-auth/route'
import { IMPERSONATE_COOKIE, verifyImpersonationCookie } from './impersonation'
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
  const { userId } = await auth()
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
