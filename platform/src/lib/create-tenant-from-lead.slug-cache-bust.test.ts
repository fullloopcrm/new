import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * createTenantFromLead — tenant-creation slug negative-cache-bust gap.
 *
 * BUG (fixed here): tenant-lookup.ts's getTenantBySlug() caches a "no tenant"
 * result for the full 5-minute TTL on ANY miss (a bot/crawler wildcard-
 * subdomain scan of *.fullloopcrm.com, an admin previewing the URL before
 * conversion, a prior failed conversion attempt that reused this business
 * name). invalidateTenantCache() can't reach that entry — it only sweeps
 * POSITIVE cache entries, matched by tenant id, and a negative entry has no
 * id to match. invalidateSlugCache(slug) exists specifically to close this
 * window and is already wired into tenant DELETE
 * (admin/businesses/[id]/route.ts), but was never wired into EITHER
 * tenant-creation path. Without it, a brand-new tenant born via lead
 * conversion (this function — used by both the paid proposal webhook and the
 * manual/comp admin conversion) could keep resolving to "no tenant" on a warm
 * edge isolate for up to the rest of the TTL immediately after this function
 * reports the conversion as complete.
 *
 * FIX: bust invalidateSlugCache(slug) right after a successful tenant insert.
 *
 * WRONG-TENANT PROBE: never busts a different slug's cache entry.
 */

const LEAD = {
  id: 'lead_1',
  business_name: 'Acme Cleaning',
  contact_name: 'Jane Owner',
  email: 'jane@acme.example',
  service_category: 'residential_cleaning',
  converted_tenant_id: null,
  territory_id: null,
  category_id: null,
  billing_zip: '10001',
  proposal_admins: 1,
  proposal_team_members: 0,
}

const TENANT = { id: 'tenant_1', slug: 'acme-cleaning', name: 'Acme Cleaning', status: 'pending' }

const holder = vi.hoisted(() => ({
  tenantInsertError: null as { message: string } | null,
}))

const invalidateSlugCache = vi.fn()
vi.mock('@/lib/tenant-lookup', () => ({ invalidateSlugCache }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'partner_requests') {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: LEAD, error: null }) }) }),
          update: () => ({ eq: async () => ({ data: null, error: null }) }),
        }
      }
      if (table === 'tenants') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          insert: () => ({
            select: () => ({
              single: async () =>
                holder.tenantInsertError
                  ? { data: null, error: holder.tenantInsertError }
                  : { data: TENANT, error: null },
            }),
          }),
        }
      }
      if (table === 'territory_claims') {
        throw new Error('territory_claims should not be touched — LEAD has no territory_id/category_id')
      }
      if (table === 'crm_notes') {
        return {
          select: () => ({ eq: () => ({ eq: async () => ({ data: [], error: null }) }) }),
          insert: async () => ({ data: null, error: null }),
        }
      }
      if (table === 'tenant_members') {
        return { insert: async () => ({ data: null, error: null }) }
      }
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

vi.mock('@/lib/provision-tenant', () => ({
  provisionTenant: vi.fn(async () => ({ ok: true })),
  mapIndustry: () => 'cleaning',
}))

vi.mock('@/lib/onboarding-tasks', () => ({
  seedOnboardingTasks: vi.fn(async () => {}),
}))

vi.mock('@/lib/admin-pin', () => ({
  hashAdminPin: (pin: string) => `hashed:${pin}`,
}))

import { createTenantFromLead } from './create-tenant-from-lead'

beforeEach(() => {
  holder.tenantInsertError = null
  invalidateSlugCache.mockClear()
})

describe('createTenantFromLead — busts the new tenant\'s own negatively-cached slug', () => {
  it('BUG (fixed): a successful conversion busts invalidateSlugCache with the newly-created tenant\'s own slug', async () => {
    const result = await createTenantFromLead('lead_1')

    expect(result.ok).toBe(true)
    expect(invalidateSlugCache).toHaveBeenCalledTimes(1)
    expect(invalidateSlugCache).toHaveBeenCalledWith('acme-cleaning')
  })

  it('WRONG-TENANT PROBE: never busts an unrelated slug', async () => {
    await createTenantFromLead('lead_1')
    expect(invalidateSlugCache).not.toHaveBeenCalledWith('bravo')
    expect(invalidateSlugCache).not.toHaveBeenCalledWith('acme-cleaning-2')
  })

  it('does not bust the cache when tenant creation fails (no tenant, no slug to bust)', async () => {
    holder.tenantInsertError = { message: 'connection reset' }

    const result = await createTenantFromLead('lead_1')

    expect(result.ok).toBe(false)
    expect(invalidateSlugCache).not.toHaveBeenCalled()
  })
})
