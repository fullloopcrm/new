/**
 * TENANT-CONVERSION RACE — `createTenantFromLead` atomic claim.
 *
 * `createTenantFromLead` used to guard duplicate tenant creation with a plain
 * select-then-branch on `partner_requests.converted_tenant_id` (audit finding,
 * 2026-07-13, same TOCTOU shape as the quote/job conversion race): two
 * concurrent callers — an admin double-clicking "convert" while a
 * paid-proposal webhook fires for the same lead — could both read
 * `converted_tenant_id: null`, both pass the check, and both create a full
 * duplicate tenant (billing, seats, territory claim, owner PIN) before either
 * write landed.
 *
 * The fix adds `conversion_claimed_at` (2026_07_13_partner_requests_conversion_claim.sql)
 * as an atomic UPDATE ... WHERE ... RETURNING claim marker — same shape as
 * the quote-conversion claim in jobs.ts. This suite proves the race is
 * closed: only one of two concurrent calls creates a tenant, and a
 * sequential retry after the first lands is idempotent.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { createTenantFromLead } from './create-tenant-from-lead'

const fake = supabaseAdmin as unknown as FakeSupabase

const LEAD_ID = 'lead-1'

function seedLead(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('partner_requests', [
    {
      id: LEAD_ID,
      business_name: 'Test Co',
      contact_name: 'Jane Owner',
      email: 'jane@test.co',
      phone: '5551234567',
      service_category: 'cleaning',
      proposal_admins: 1,
      proposal_team_members: 2,
      proposal_monthly: 500,
      billing_zip: '10001',
      billing_address: '1 Main St',
      admin_notes: null,
      fit_bucket: null,
      fit_score: null,
      pain_point: null,
      lead_gen_spend: null,
      automation_comfort: null,
      territory_id: null,
      category_id: null,
      converted_tenant_id: null,
      conversion_claimed_at: null,
      status: 'new',
      ...overrides,
    },
  ])
}

beforeEach(() => {
  seedLead()
})

describe('createTenantFromLead — concurrent conversion race', () => {
  it('two concurrent conversions produce exactly one tenant, not two', async () => {
    const results = await Promise.allSettled([
      createTenantFromLead(LEAD_ID),
      createTenantFromLead(LEAD_ID),
    ])

    const tenants = fake._all('tenants')
    expect(tenants.length).toBe(1)

    const fulfilled = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof createTenantFromLead>>>).value)

    // Every settled call either created the tenant or observed it already
    // converted (or hit the retryable in-progress conflict) — never a second
    // tenant, and no call silently swallows an error into a fabricated success.
    const created = fulfilled.filter((v) => v.ok && !v.alreadyConverted)
    const seen = fulfilled.filter((v) => v.ok && v.alreadyConverted)
    const conflicted = fulfilled.filter((v) => !v.ok)
    expect(created.length).toBe(1)
    expect(created.length + seen.length + conflicted.length).toBe(fulfilled.length)

    const leadRow = fake._all('partner_requests').find((l) => l.id === LEAD_ID)
    expect(leadRow?.converted_tenant_id).toBe(tenants[0].id)
  })

  it('a sequential retry after the winner lands is idempotent (no second tenant)', async () => {
    const first = await createTenantFromLead(LEAD_ID)
    expect(first.ok).toBe(true)
    expect(first.alreadyConverted).toBeFalsy()

    const second = await createTenantFromLead(LEAD_ID)
    expect(second.ok).toBe(true)
    expect(second.alreadyConverted).toBe(true)
    expect(second.tenant?.id).toBe(first.tenant?.id)

    expect(fake._all('tenants').length).toBe(1)
  })

  it('releases the claim on a failed conversion so a retry can succeed cleanly', async () => {
    // Force the territory-reservation step to fail: seed an existing claim on
    // the same territory already attached to a different tenant, so the
    // reservation is genuinely taken (not an abandoned/reclaimable one).
    // seedLead() clears the whole store, so it must run before this seeding.
    seedLead({ territory_id: 'terr-1', category_id: 'cat-1' })
    fake._addUniqueConstraint('territory_claims', 'territory_id')
    fake._seed('territory_claims', [
      { id: 'claim-existing', territory_id: 'terr-1', category_id: 'cat-1', tenant_id: 'some-other-tenant', status: 'claimed' },
    ])

    const failed = await createTenantFromLead(LEAD_ID)
    expect(failed.ok).toBe(false)
    expect(fake._all('tenants').length).toBe(0)

    // The claim marker must be released — otherwise this lead is stuck forever.
    const stuckRow = fake._all('partner_requests').find((l) => l.id === LEAD_ID)
    expect(stuckRow?.conversion_claimed_at).toBeNull()

    // A retry with the territory conflict cleared now succeeds normally.
    fake._store.set('territory_claims', fake._all('territory_claims').filter((c) => c.id !== 'claim-existing'))
    const retried = await createTenantFromLead(LEAD_ID)
    expect(retried.ok).toBe(true)
    expect(retried.alreadyConverted).toBeFalsy()
    expect(fake._all('tenants').length).toBe(1)
  })
})
