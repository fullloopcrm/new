/**
 * activate-tenant.ts domain_routing step — stale is_primary demotion.
 *
 * `ignoreDuplicates: true` (ON CONFLICT DO NOTHING) on the tenant_domains
 * upsert means an existing row's is_primary is NEVER touched by the insert
 * itself (activate-tenant-domain-routing-sync.test.ts locks that in for the
 * routing_mode-only case). But when a tenant's custom domain CHANGES between
 * activation runs (a rebrand — the old domain row is left in place, a new
 * one is registered), both the stale old-domain row and the fresh
 * new-domain row end up is_primary:true, since nothing ever demoted the old
 * one. Same "at most one is_primary per tenant" invariant as
 * 2026_07_17_tenant_domains_one_primary_per_tenant.sql, reachable from the
 * highest-volume write path (every activation) rather than the admin one.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { activateTenant } from './activate-tenant'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-rebrand'
const SLUG = 'rebrand-co'
const CARRY_HOST = `${SLUG}.fullloopcrm.com`
const OLD_CUSTOM_DOMAIN = 'old-brand.com'
const NEW_CUSTOM_DOMAIN = 'new-brand.com'

function seed() {
  fake._store.clear()
  fake._seed('tenants', [
    {
      id: TENANT_ID,
      name: 'Rebrand Co',
      slug: SLUG,
      industry: 'cleaning',
      status: 'pending',
      owner_email: null,
      owner_name: null,
      // The tenant already has a NEW domain set — activation is running
      // again after the rebrand.
      domain: NEW_CUSTOM_DOMAIN,
      domain_name: null,
      address: null,
      service_area_lat: null,
      service_area_lng: null,
      service_radius_miles: null,
      google_place_id: null,
      selena_config: {},
    },
  ])
  // Rows from the FIRST activation, before the rebrand: both the carrying
  // domain (is_primary:false, since a custom domain existed) and the OLD
  // custom domain (is_primary:true) are already present.
  fake._seed('tenant_domains', [
    {
      id: 'td-carry',
      tenant_id: TENANT_ID,
      domain: CARRY_HOST,
      active: true,
      is_primary: false,
      type: 'generic',
      notes: 'Carrying domain — auto-registered on activation',
      routing_mode: 'template',
    },
    {
      id: 'td-old-custom',
      tenant_id: TENANT_ID,
      domain: OLD_CUSTOM_DOMAIN,
      active: true,
      is_primary: true,
      type: 'primary',
      notes: 'Custom domain — auto-registered on activation',
      routing_mode: 'template',
    },
  ])
}

beforeEach(() => {
  seed()
})

describe('activateTenant — domain_routing demotes a stale is_primary row on rebrand', () => {
  it('clears is_primary on the OLD custom domain once the NEW one is registered as primary', async () => {
    await activateTenant(TENANT_ID)

    const oldRow = fake._all('tenant_domains').find((r) => r.id === 'td-old-custom')
    expect(oldRow).toBeTruthy()
    expect(oldRow!.is_primary).toBe(false)

    const newRow = fake._all('tenant_domains').find((r) => r.domain === NEW_CUSTOM_DOMAIN)
    expect(newRow).toBeTruthy()
    expect(newRow!.is_primary).toBe(true)

    const primaries = fake._all('tenant_domains').filter(
      (r) => r.tenant_id === TENANT_ID && r.is_primary === true
    )
    expect(primaries).toHaveLength(1)
  })
})
