// Per-tenant Terms of Service addendum lookup (P6).
//
// Full Loop CRM's platform Terms of Service (src/app/(marketing)/terms) is
// the same document for every partner by default. A minority of partners
// negotiate overrides (custom pricing, extended trial, bespoke clauses) --
// this reads that override so the terms page can render it as an addendum
// ONLY to the tenant it belongs to, never to anyone else.
//
// Table: src/lib/migrations/2026_07_14_tenant_terms_addenda.sql (not yet
// applied to any database -- see that file). getTenantTermsAddendum() fails
// open (returns null) on ANY query error, including the table not existing
// yet, so the public /terms page never 500s waiting on that migration --
// worst case a partner's addendum silently doesn't render, which is far
// safer than breaking the page for every visitor.

import { tenantDb } from '@/lib/tenant-db'

export interface TenantTermsAddendum {
  id: string
  tenant_id: string
  active: boolean
  effective_date: string
  monthly_rate_override: number | null
  setup_fee_override: number | null
  custom_clauses: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Returns the active addendum for the given tenant, or null if none exists
 * (including when the underlying table hasn't been migrated in yet).
 * Always scoped through tenantDb(tenantId) -- a caller can never fetch
 * another tenant's addendum through this function.
 */
export async function getTenantTermsAddendum(tenantId: string): Promise<TenantTermsAddendum | null> {
  if (!tenantId) return null

  try {
    const { data, error } = await tenantDb(tenantId)
      .from('tenant_terms_addenda')
      .select('*')
      .eq('active', true)
      .order('effective_date', { ascending: false })
      .limit(1)

    if (error || !data) return null
    const rows = data as TenantTermsAddendum[]
    return rows[0] ?? null
  } catch {
    return null
  }
}
