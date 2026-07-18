/**
 * Shared parent_tenant_id chain-walking helpers — the one place that reads
 * the head/sub-tenant hierarchy, so cycle prevention (create-sub-tenant.ts)
 * and descendant-access checks (tenant.ts) can never drift out of sync.
 */
import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'
import { IMPERSONATE_COOKIE, verifyImpersonationCookie } from './impersonation'
import type { Tenant } from './tenant'

// Defensive loop bound, not a product depth cap — the hierarchy itself has
// no depth limit; this just stops a corrupt/cyclic chain from looping forever.
const MAX_CHAIN_DEPTH = 50

async function fetchParentTenantId(tenantId: string): Promise<string | null> {
  const res = await supabaseAdmin
    .from('tenants')
    .select('parent_tenant_id')
    .eq('id', tenantId)
    .single()
  const row = res.data as { parent_tenant_id: string | null } | null
  return row?.parent_tenant_id ?? null
}

/** Walks parent_tenant_id upward from `tenantId`, returning each ancestor id in order. */
export async function getAncestorChain(tenantId: string): Promise<string[]> {
  const chain: string[] = []
  let current: string | null = tenantId
  const seen = new Set<string>([tenantId])

  for (let i = 0; i < MAX_CHAIN_DEPTH && current; i++) {
    const parentId: string | null = await fetchParentTenantId(current)
    if (!parentId || seen.has(parentId)) break // no parent, or a corrupt loop — stop either way
    chain.push(parentId)
    seen.add(parentId)
    current = parentId
  }
  return chain
}

/** True if `candidateAncestorId` appears anywhere in `tenantId`'s ancestor chain. */
export async function isDescendantOfTenant(tenantId: string, candidateAncestorId: string): Promise<boolean> {
  if (tenantId === candidateAncestorId) return false
  const chain = await getAncestorChain(tenantId)
  return chain.includes(candidateAncestorId)
}

/**
 * True if setting `candidateParentId` as `childId`'s parent would create a
 * cycle. A brand-new tenant id can never already be its own ancestor, so
 * tenant CREATION never needs this — it only matters for re-parenting an
 * EXISTING tenant.
 */
export async function wouldCreateCycle(childId: string, candidateParentId: string): Promise<boolean> {
  if (childId === candidateParentId) return true
  const chain = await getAncestorChain(candidateParentId)
  return chain.includes(childId)
}

/**
 * Resolves the descendant-impersonation cookie for a caller already
 * authenticated AS `headTenantId` (via signed domain header or admin token —
 * either resolver, see tenant.ts's getCurrentTenant and tenant-query.ts's
 * getTenantForRequest). Returns the target tenant ONLY if it is a verified
 * descendant of headTenantId — never a sibling, never upward. Both tenant
 * resolvers call this SAME function so the check can't drift apart between
 * page rendering and API routes.
 */
export async function resolveDescendantImpersonation(headTenantId: string): Promise<Tenant | null> {
  const cookieStore = await cookies()
  const impersonateId = verifyImpersonationCookie(cookieStore.get(IMPERSONATE_COOKIE)?.value)
  if (!impersonateId || impersonateId === headTenantId) return null

  const isDescendant = await isDescendantOfTenant(impersonateId, headTenantId)
  if (!isDescendant) return null

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', impersonateId)
    .single()

  return tenant
}
