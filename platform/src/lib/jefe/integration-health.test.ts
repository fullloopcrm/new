/**
 * Integration-health sweep — a tenant with no vendor key configured must
 * NOT count as a "failure" (that's the `provisioning` pillar's job); only a
 * key that's PRESENT but comes back invalid from the live check should be
 * recorded and counted. This is the distinction the whole feature rests on,
 * so it's the one behavior this suite pins down.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/secret-crypto', () => ({
  decryptSecret: (v: string | null) => v,
}))

vi.mock('@/lib/onboarding-verify', async () => {
  const actual = await import('@/lib/onboarding-verify')
  return {
    ...actual,
    runAllChecks: vi.fn(async (tenant: { telnyx_api_key?: string | null; stripe_api_key?: string | null; resend_api_key?: string | null }) => ({
      dns_a: { ok: true, detail: '' },
      dns_cname_www: { ok: true, detail: '' },
      mx_records: { ok: true, detail: '' },
      ssl_active: { ok: true, detail: '' },
      resend_domain_verified: tenant.resend_api_key ? { ok: true, detail: '' } : { ok: false, detail: 'no key' },
      telnyx_number_active: tenant.telnyx_api_key ? { ok: false, detail: 'dead key' } : { ok: false, detail: 'no key' },
      stripe_account: tenant.stripe_api_key ? { ok: true, detail: '' } : { ok: false, detail: 'no key' },
      stripe_webhook_configured: tenant.stripe_api_key ? { ok: true, detail: '' } : { ok: false, detail: 'no key' },
    })),
  }
})

import { supabaseAdmin } from '@/lib/supabase'
import { sweepIntegrationHealth } from './integration-health'

const fake = supabaseAdmin as unknown as FakeSupabase

function seedTenants(rows: Row[]) {
  fake._store.clear()
  fake._seed('tenants', rows)
  fake._seed('jefe_integration_health', [])
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('sweepIntegrationHealth', () => {
  it('does not count a missing key as a failure, only a configured key that fails verification', async () => {
    seedTenants([
      {
        id: 't-broken',
        name: 'Broken Telnyx Co',
        status: 'active',
        domain: 'broken.example.com',
        telnyx_api_key: 'live-key',
        telnyx_phone: '+15551234567',
        resend_api_key: null,
        resend_domain: null,
        stripe_api_key: null,
        stripe_account_id: null,
        anthropic_api_key: null,
      },
      {
        id: 't-unprovisioned',
        name: 'Never Set Up Co',
        status: 'active',
        domain: 'noone.example.com',
        telnyx_api_key: null,
        telnyx_phone: null,
        resend_api_key: null,
        resend_domain: null,
        stripe_api_key: null,
        stripe_account_id: null,
        anthropic_api_key: null,
      },
    ])

    const summary = await sweepIntegrationHealth()

    expect(summary.tenants_checked).toBe(2)
    expect(summary.tenants_with_failures).toBe(1)

    const rows = fake._store.get('jefe_integration_health') || []
    const broken = rows.find((r) => r.tenant_id === 't-broken')
    const unprovisioned = rows.find((r) => r.tenant_id === 't-unprovisioned')

    expect(broken?.failed).toEqual(['telnyx_number_active'])
    expect(broken?.failed_count).toBe(1)
    // No keys configured at all → zero failures, even though every check came back ok:false.
    expect(unprovisioned?.failed).toEqual([])
    expect(unprovisioned?.failed_count).toBe(0)
  })

  it('excludes deleted tenants from the sweep', async () => {
    seedTenants([
      { id: 't-gone', name: 'Deleted Co', status: 'deleted', domain: null, telnyx_api_key: null, telnyx_phone: null, resend_api_key: null, resend_domain: null, stripe_api_key: null, stripe_account_id: null, anthropic_api_key: null },
    ])

    const summary = await sweepIntegrationHealth()
    expect(summary.tenants_checked).toBe(0)
  })
})
