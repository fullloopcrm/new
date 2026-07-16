/**
 * activate-tenant.ts domain_routing step — tenant_domains.type on
 * INSERT + re-sync (P1/W1 queue item 3 — routing_mode/type mis-classification
 * sweep).
 *
 * ROOT GAP: this exact write path was already fixed for routing_mode
 * (aa97546a/4b5781b5) and vercel_project (e8882436), but never for `type` —
 * despite it being the highest-volume tenant_domains write path (every
 * activation goes through it) and the same mis-classification class already
 * fixed for onboard-tenant-site.ts and the admin POST /api/admin/websites
 * write path. Without setting it explicitly, a newly-inserted row (including
 * a tenant's real customer-facing custom domain, is_primary:true) falls to
 * the 069-enforced column DEFAULT ('generic') instead of 'primary'.
 *
 * Mirrors activate-tenant-vercel-project-sync.test.ts's coverage shape.
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
const SLUG = 'some-type-test-tenant'
const CARRY_HOST = `${SLUG}.fullloopcrm.com`

function seedTenant(id: string, opts: { domain?: string | null } = {}) {
  fake._seed('tenants', [
    {
      id,
      name: `${SLUG} test co`,
      slug: SLUG,
      industry: 'cleaning',
      status: 'pending',
      owner_email: null,
      owner_name: null,
      domain: opts.domain ?? null,
      domain_name: null,
      address: null,
      service_area_lat: null,
      service_area_lng: null,
      service_radius_miles: null,
      google_place_id: null,
      selena_config: {},
    },
  ])
}

beforeEach(() => {
  fake._store.clear()
})

describe('activateTenant — domain_routing sets type on INSERT', () => {
  it('a tenant with no custom domain: the carrying domain is type=primary (it IS the customer-facing domain)', async () => {
    seedTenant('t-no-custom')
    await activateTenant('t-no-custom')
    const row = fake._all('tenant_domains').find((r) => r.domain === CARRY_HOST)
    expect(row?.is_primary).toBe(true)
    expect(row?.type).toBe('primary')
  })

  it('a tenant WITH a custom domain: the custom domain is type=primary, the carrying domain is type=generic', async () => {
    seedTenant('t-custom', { domain: 'example-cleaning.com' })
    await activateTenant('t-custom')
    const carry = fake._all('tenant_domains').find((r) => r.domain === CARRY_HOST)
    const custom = fake._all('tenant_domains').find((r) => r.domain === 'example-cleaning.com')
    expect(carry?.is_primary).toBe(false)
    expect(carry?.type).toBe('generic')
    expect(custom?.is_primary).toBe(true)
    expect(custom?.type).toBe('primary')
  })
})

describe('activateTenant — domain_routing re-syncs type on an EXISTING row', () => {
  it('corrects a primary custom domain stuck on the stale generic default', async () => {
    seedTenant('t-stale', { domain: 'example-cleaning.com' })
    fake._seed('tenant_domains', [
      {
        id: 'td-stale-custom',
        tenant_id: 't-stale',
        domain: 'example-cleaning.com',
        active: true,
        is_primary: true,
        notes: 'Custom domain — auto-registered on activation',
        routing_mode: 'template',
        type: 'generic', // as if inserted before this fix, before 069 backfilled it
      },
    ])

    await activateTenant('t-stale')

    const row = fake._all('tenant_domains').find((r) => r.id === 'td-stale-custom')
    expect(row?.type).toBe('primary')
  })

  it('does not touch active/is_primary/notes/routing_mode while correcting type', async () => {
    seedTenant('t-stale2', { domain: 'example-cleaning2.com' })
    fake._seed('tenant_domains', [
      {
        id: 'td-stale2',
        tenant_id: 't-stale2',
        domain: 'example-cleaning2.com',
        active: true,
        is_primary: true,
        notes: 'Custom domain — auto-registered on activation',
        routing_mode: 'template',
        type: 'generic',
      },
    ])

    await activateTenant('t-stale2')

    const row = fake._all('tenant_domains').find((r) => r.id === 'td-stale2')
    expect(row?.type).toBe('primary')
    expect(row?.active).toBe(true)
    expect(row?.is_primary).toBe(true)
    expect(row?.notes).toBe('Custom domain — auto-registered on activation')
    expect(row?.routing_mode).toBe('template')
  })

  it('leaves an already-correct type untouched (no spurious update)', async () => {
    seedTenant('t-ok')
    fake._seed('tenant_domains', [
      {
        id: 'td-ok',
        tenant_id: 't-ok',
        domain: CARRY_HOST,
        active: true,
        is_primary: true,
        notes: 'Carrying domain — auto-registered on activation',
        routing_mode: 'template',
        type: 'primary',
      },
    ])

    await activateTenant('t-ok')

    const row = fake._all('tenant_domains').find((r) => r.id === 'td-ok')
    expect(row?.type).toBe('primary')
  })
})
