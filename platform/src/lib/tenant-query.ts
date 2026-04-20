import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
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
