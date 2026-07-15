/**
 * TENANT-CONVERSION RACE — `createTenantFromLead` atomic claim.
 *
 * `createTenantFromLead` is invoked from the Stripe PLATFORM webhook on
 * checkout.session.completed. Stripe redelivers an event whenever the handler
 * doesn't ACK within ~10s or the response is dropped — no attacker required,
 * just a slow/retried delivery under real load (this function does many
 * sequential writes: territory claim, tenant insert, provisioning, owner PIN).
 * The old idempotency check was a plain read-then-branch on
 * `partner_requests.converted_tenant_id` (audit finding, 2026-07-15, same
 * TOCTOU shape already closed elsewhere this session in the Stripe tenant
 * webhook and `createRecurringSeriesFromQuote`): two concurrent redeliveries
 * could both read it NULL and both create a full duplicate tenant, both
 * linked to the same Stripe subscription.
 *
 * The fix adds `conversion_claimed_at` as an atomic UPDATE ... WHERE ...
 * RETURNING claim marker, released on any failure path and cleared on
 * success, with a stale-claim (>5min) reclaim path so a crashed attempt can
 * never permanently wedge a lead.
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
      service_category: null,
      converted_tenant_id: null,
      conversion_claimed_at: null,
      territory_id: null,
      category_id: null,
      proposal_admins: 1,
      proposal_team_members: 0,
      billing_zip: null,
      email: 'owner@example.com',
      phone: '5551234567',
      billing_address: null,
      admin_notes: null,
      fit_bucket: null,
      fit_score: null,
      pain_point: null,
      lead_gen_spend: null,
      automation_comfort: null,
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
      createTenantFromLead(LEAD_ID, { stripeSubscriptionId: 'sub_123' }),
      createTenantFromLead(LEAD_ID, { stripeSubscriptionId: 'sub_123' }),
    ])

    const tenants = fake._all('tenants')
    expect(tenants.length).toBe(1)

    // Both calls resolve (never throw) — the winner creates the tenant; the
    // loser either lost the claim before the winner finished (ok:false,
    // "already in progress") or rechecked after the winner finished
    // (ok:true, alreadyConverted:true pointing at the same tenant). Exactly
    // one duplicate-tenant outcome is NOT acceptable either way.
    const values = results.map((r) => (r.status === 'fulfilled' ? r.value : null))
    expect(values.every(Boolean)).toBe(true)
    const winners = values.filter((v) => v?.ok && !v.alreadyConverted)
    const inProgressLosers = values.filter((v) => v?.ok === false && /already in progress/.test(v.error ?? ''))
    const alreadyConvertedLosers = values.filter((v) => v?.ok && v.alreadyConverted)
    expect(winners.length).toBe(1)
    expect(inProgressLosers.length + alreadyConvertedLosers.length).toBe(1)
    if (alreadyConvertedLosers.length) {
      expect(alreadyConvertedLosers[0]?.tenant?.id).toBe(winners[0]?.tenant?.id)
    }

    // Owner-PIN creation is best-effort (admin-pin.ts reads its HMAC secret at
    // module load, unset in this test env, so it throws and is swallowed) —
    // not part of what this test proves. What matters here is that it never
    // ran twice: at most one tenant_members row, whatever ADMIN_TOKEN_SECRET is.
    const members = fake._all('tenant_members')
    expect(members.length).toBeLessThanOrEqual(1)

    const leadRow = fake._all('partner_requests').find((r) => r.id === LEAD_ID)
    expect(leadRow?.converted_tenant_id).toBe(tenants[0].id)
    expect(leadRow?.conversion_claimed_at).toBeNull()
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
    expect(fake._all('tenant_members').length).toBeLessThanOrEqual(1)
  })

  it('releases the claim on a failed tenant insert so a retry can succeed cleanly', async () => {
    // Force the tenants insert to fail (simulates any downstream failure after
    // the atomic claim UPDATE already succeeded) via a unique slug collision
    // that the retry loop can't resolve within its bounded attempts.
    fake._addUniqueConstraint('tenants', 'slug')
    for (let i = 1; i < 50; i++) {
      fake._seed('tenants', [{ id: `conflict-${i}`, slug: i === 1 ? 'test-co' : `test-co-${i}` }])
    }

    const result = await createTenantFromLead(LEAD_ID)
    expect(result.ok).toBe(false)

    // The claim must be released — otherwise this lead is stuck forever.
    const stuckLead = fake._all('partner_requests').find((r) => r.id === LEAD_ID)
    expect(stuckLead?.conversion_claimed_at).toBeNull()
    expect(stuckLead?.converted_tenant_id).toBeNull()

    // Clear the conflicts and retry — should succeed cleanly now.
    fake._store.set('tenants', [])
    const retried = await createTenantFromLead(LEAD_ID)
    expect(retried.ok).toBe(true)
    expect(retried.alreadyConverted).toBeFalsy()
    expect(fake._all('tenants').length).toBe(1)
  })

  it('reclaims a stale (>5min) claim left by a crashed attempt', async () => {
    const staleTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    seedLead({ conversion_claimed_at: staleTimestamp })

    const result = await createTenantFromLead(LEAD_ID)
    expect(result.ok).toBe(true)
    expect(result.alreadyConverted).toBeFalsy()
    expect(fake._all('tenants').length).toBe(1)
  })

  it('rejects a concurrent attempt while a fresh (<5min) claim is held', async () => {
    const freshTimestamp = new Date(Date.now() - 30 * 1000).toISOString()
    seedLead({ conversion_claimed_at: freshTimestamp })

    const result = await createTenantFromLead(LEAD_ID)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/already in progress/)
    expect(fake._all('tenants').length).toBe(0)
  })
})
