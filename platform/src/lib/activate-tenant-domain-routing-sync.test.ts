/**
 * activate-tenant.ts domain_routing step — EXISTING row re-sync.
 *
 * The upsert into tenant_domains uses `ignoreDuplicates: true` (ON CONFLICT DO
 * NOTHING). That's correct for `active`/`is_primary`/`notes` — re-running
 * activation must never clobber a manually-archived domain row — but it means
 * routing_mode on an EXISTING row was never corrected either. A tenant added
 * to BESPOKE_SITE_TENANTS *after* its domain row already existed (the normal
 * order of events: domains are registered long before a tenant goes bespoke)
 * stayed stuck on the stale value forever, since nothing else in this codebase
 * writes routing_mode back — reconcile-tenant-config.mjs only DETECTS that
 * drift, it never fixes it. This is the same 2026-07-10 mis-route class
 * activate-tenant-bespoke-drift.test.ts guards on the INSERT path; this file
 * covers the re-activation / EXISTING-row path.
 *
 * Full integration test (not just static source assertion): supabaseAdmin is
 * mocked repo-wide via fake-supabase, so activateTenant's real dependency
 * chain (provisionTenant, onboarding-gate, seo/onboarding, etc.) all read/write
 * the same in-memory store. No Vercel/geocoding env vars are set in the test
 * environment, so registerCarryingDomain/registerCustomDomain/resolveCoverage
 * all take their documented no-op "skipped" paths without any network call.
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

const TENANT_ID = 'tenant-1'
// 'nyc-tow' is a real entry in BESPOKE_SITE_TENANTS (both middleware.ts and
// activate-tenant.ts's guarded copy) — using a real slug means this test also
// breaks honestly if that set ever drops the slug.
const BESPOKE_SLUG = 'nyc-tow'
const CARRY_HOST = `${BESPOKE_SLUG}.fullloopcrm.com`

function seed() {
  fake._store.clear()
  fake._seed('tenants', [
    {
      id: TENANT_ID,
      name: 'NYC Tow Test Co',
      slug: BESPOKE_SLUG,
      industry: 'towing',
      status: 'pending',
      owner_email: null,
      owner_name: null,
      domain: null,
      domain_name: null,
      address: null,
      service_area_lat: null,
      service_area_lng: null,
      service_radius_miles: null,
      google_place_id: null,
      selena_config: {},
    },
  ])
  // Pre-existing row with the WRONG routing_mode — as if this domain was
  // registered back when the tenant was still template-routed, before it was
  // added to BESPOKE_SITE_TENANTS.
  fake._seed('tenant_domains', [
    {
      id: 'td-1',
      tenant_id: TENANT_ID,
      domain: CARRY_HOST,
      active: true,
      is_primary: true,
      notes: 'Carrying domain — auto-registered on activation',
      routing_mode: 'template',
    },
  ])
}

beforeEach(() => {
  seed()
})

describe('activateTenant — domain_routing re-syncs a stale routing_mode on an EXISTING row', () => {
  it('corrects the pre-existing row to bespoke instead of leaving it stuck on template', async () => {
    await activateTenant(TENANT_ID)

    const rows = fake._all('tenant_domains').filter((r) => r.domain === CARRY_HOST)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.routing_mode).toBe('bespoke')
    }
  })

  it('does not touch active/is_primary/notes on the existing row while correcting it', async () => {
    await activateTenant(TENANT_ID)

    const original = fake._all('tenant_domains').find((r) => r.id === 'td-1')
    expect(original).toBeTruthy()
    expect(original!.active).toBe(true)
    expect(original!.is_primary).toBe(true)
    expect(original!.notes).toBe('Carrying domain — auto-registered on activation')
  })
})
