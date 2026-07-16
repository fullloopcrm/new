/**
 * activate-tenant.ts domain_routing step — vercel_project assignment + re-sync.
 *
 * 059_backfill_vercel_project.sql was a ONE-TIME backfill of existing rows.
 * Without this behavior, every tenant_domains row inserted by a LATER
 * activation (template tenant, or one of the 4 FL-signal bespoke tenants)
 * would have vercel_project stuck NULL forever, since nothing else in the
 * codebase writes it — the leader would have to remember to re-run 059's SQL
 * by hand after every batch of new tenants. This mirrors
 * activate-tenant-domain-routing-sync.test.ts's coverage of the analogous
 * routing_mode gap, but for vercel_project.
 *
 * Full integration test via the same fake-supabase mock activateTenant's
 * other tests use — no Vercel/geocoding env vars set, so those paths take
 * their documented no-op "skipped" branch.
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
const FL_PROJECT_ID = 'prj_PtBsLFfrCvSYXzo60GlNAjPoPjbj'

// Real slugs so this test also breaks honestly if the sets it exercises ever
// change shape.
const TEMPLATE_SLUG = 'some-template-tenant' // not in BESPOKE_SITE_TENANTS
const FL_SIGNAL_BESPOKE_SLUG = 'the-florida-maid' // determinable bespoke tenant
const UNKNOWN_BESPOKE_SLUG = 'nyc-tow' // undeterminable bespoke tenant

function seedTenant(id: string, slug: string) {
  fake._seed('tenants', [
    {
      id,
      name: `${slug} test co`,
      slug,
      industry: 'cleaning',
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
}

beforeEach(() => {
  fake._store.clear()
})

describe('activateTenant — domain_routing sets vercel_project on INSERT', () => {
  it('a template tenant (not bespoke) gets the FL project id', async () => {
    seedTenant('t-template', TEMPLATE_SLUG)
    await activateTenant('t-template')
    const row = fake._all('tenant_domains').find((r) => r.domain === `${TEMPLATE_SLUG}.fullloopcrm.com`)
    expect(row?.vercel_project).toBe(FL_PROJECT_ID)
  })

  it('an FL-signal bespoke tenant gets the FL project id', async () => {
    seedTenant('t-fl-bespoke', FL_SIGNAL_BESPOKE_SLUG)
    await activateTenant('t-fl-bespoke')
    const row = fake._all('tenant_domains').find((r) => r.domain === `${FL_SIGNAL_BESPOKE_SLUG}.fullloopcrm.com`)
    expect(row?.vercel_project).toBe(FL_PROJECT_ID)
  })

  it('an unknown-standalone bespoke tenant is left NULL, not guessed', async () => {
    seedTenant('t-unknown-bespoke', UNKNOWN_BESPOKE_SLUG)
    await activateTenant('t-unknown-bespoke')
    const row = fake._all('tenant_domains').find((r) => r.domain === `${UNKNOWN_BESPOKE_SLUG}.fullloopcrm.com`)
    expect(row?.vercel_project).toBeNull()
  })
})

describe('activateTenant — domain_routing re-syncs vercel_project on an EXISTING row', () => {
  it('corrects a determinable tenant stuck on the old 055 blanket value ("fullloopcrm")', async () => {
    seedTenant('t-stale', TEMPLATE_SLUG)
    fake._seed('tenant_domains', [
      {
        id: 'td-stale',
        tenant_id: 't-stale',
        domain: `${TEMPLATE_SLUG}.fullloopcrm.com`,
        active: true,
        is_primary: true,
        notes: 'Carrying domain — auto-registered on activation',
        routing_mode: 'template',
        vercel_project: 'fullloopcrm',
      },
    ])

    await activateTenant('t-stale')

    const row = fake._all('tenant_domains').find((r) => r.id === 'td-stale')
    expect(row?.vercel_project).toBe(FL_PROJECT_ID)
  })

  it('never overwrites an existing value for an unknown-standalone bespoke tenant, even if NULL', async () => {
    seedTenant('t-manual', UNKNOWN_BESPOKE_SLUG)
    fake._seed('tenant_domains', [
      {
        id: 'td-manual',
        tenant_id: 't-manual',
        domain: `${UNKNOWN_BESPOKE_SLUG}.fullloopcrm.com`,
        active: true,
        is_primary: true,
        notes: 'Carrying domain — auto-registered on activation',
        routing_mode: 'bespoke',
        vercel_project: null,
      },
    ])

    await activateTenant('t-manual')

    const row = fake._all('tenant_domains').find((r) => r.id === 'td-manual')
    expect(row?.vercel_project).toBeNull()
  })

  it('preserves a manually-set standalone project value for an unknown bespoke tenant', async () => {
    seedTenant('t-standalone', UNKNOWN_BESPOKE_SLUG)
    fake._seed('tenant_domains', [
      {
        id: 'td-standalone',
        tenant_id: 't-standalone',
        domain: `${UNKNOWN_BESPOKE_SLUG}.fullloopcrm.com`,
        active: true,
        is_primary: true,
        notes: 'Carrying domain — auto-registered on activation',
        routing_mode: 'bespoke',
        vercel_project: 'prj_some_standalone_project',
      },
    ])

    await activateTenant('t-standalone')

    const row = fake._all('tenant_domains').find((r) => r.id === 'td-standalone')
    expect(row?.vercel_project).toBe('prj_some_standalone_project')
  })

  it('does not touch active/is_primary/notes/routing_mode while correcting vercel_project', async () => {
    seedTenant('t-stale2', TEMPLATE_SLUG)
    fake._seed('tenant_domains', [
      {
        id: 'td-stale2',
        tenant_id: 't-stale2',
        domain: `${TEMPLATE_SLUG}.fullloopcrm.com`,
        active: true,
        is_primary: true,
        notes: 'Carrying domain — auto-registered on activation',
        routing_mode: 'template',
        vercel_project: 'platform',
      },
    ])

    await activateTenant('t-stale2')

    const row = fake._all('tenant_domains').find((r) => r.id === 'td-stale2')
    expect(row?.vercel_project).toBe(FL_PROJECT_ID)
    expect(row?.active).toBe(true)
    expect(row?.is_primary).toBe(true)
    expect(row?.notes).toBe('Carrying domain — auto-registered on activation')
    expect(row?.routing_mode).toBe('template')
  })
})
