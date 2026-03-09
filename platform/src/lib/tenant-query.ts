import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'
import type { Tenant } from './tenant'

const SUPER_ADMIN_IDS = [process.env.SUPER_ADMIN_CLERK_ID || '']
const IMPERSONATE_COOKIE = 'fl_impersonate'

export type TenantContext = {
  userId: string
  tenantId: string
  tenant: Tenant
  role: string
}

// Auth + tenant lookup — used by every API route
// Supports admin impersonation via cookie
export async function getTenantForRequest(): Promise<TenantContext> {
  const { userId } = await auth()
  if (!userId) {
    throw new AuthError('Unauthorized', 401)
  }

  // Check impersonation: super admin + cookie = use that tenant
  if (SUPER_ADMIN_IDS.includes(userId)) {
    const cookieStore = await cookies()
    const impersonateId = cookieStore.get(IMPERSONATE_COOKIE)?.value

    if (impersonateId) {
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
          role: 'owner', // Admin gets full access when impersonating
        }
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
