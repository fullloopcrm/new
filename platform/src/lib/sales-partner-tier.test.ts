import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * nycmaid's TierProgress.tsx only ever displayed a progress bar; the DB
 * `tier` column stayed 100% admin-set. autoPromoteSalesPartnerTier is the
 * new real progression logic -- must promote once a threshold is crossed,
 * never demote, and never clobber an admin's manually customized
 * commission_rate.
 */

const TENANT = 'tenant-a'
const PARTNER = 'partner-1'

vi.mock('./supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from './supabase'
import {
  tierForDirectClientCount,
  computeTierProgress,
  autoPromoteSalesPartnerTier,
  SALES_PARTNER_TIERS,
} from './sales-partner-tier'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
})

function seedPartner(overrides: Record<string, unknown> = {}) {
  fake._seed('sales_partners', [{
    id: PARTNER,
    tenant_id: TENANT,
    name: 'Pat Partner',
    tier: 'standard',
    commission_rate: 0.10,
    ...overrides,
  }])
}

function seedClients(count: number, tenantId = TENANT, partnerId = PARTNER) {
  fake._seed('clients', Array.from({ length: count }, (_, i) => ({
    id: `client-${i}`,
    tenant_id: tenantId,
    sales_partner_id: partnerId,
  })))
}

describe('tierForDirectClientCount', () => {
  it('returns standard below the tier2 threshold', () => {
    expect(tierForDirectClientCount(0).key).toBe('standard')
    expect(tierForDirectClientCount(49).key).toBe('standard')
  })
  it('returns tier2 at and above 50', () => {
    expect(tierForDirectClientCount(50).key).toBe('tier2')
    expect(tierForDirectClientCount(99).key).toBe('tier2')
  })
  it('returns tier3 at and above 100', () => {
    expect(tierForDirectClientCount(100).key).toBe('tier3')
    expect(tierForDirectClientCount(500).key).toBe('tier3')
  })
})

describe('computeTierProgress', () => {
  it('reports remaining clients and progress pct toward the next tier', () => {
    const progress = computeTierProgress('standard', 25)
    expect(progress.next?.key).toBe('tier2')
    expect(progress.remainingToNext).toBe(25)
    expect(progress.progressPct).toBe(50)
  })
  it('reports no next tier at the top', () => {
    const progress = computeTierProgress('tier3', 150)
    expect(progress.next).toBeNull()
    expect(progress.progressPct).toBe(100)
  })
})

describe('autoPromoteSalesPartnerTier', () => {
  it('promotes standard -> tier2 once direct clients cross 50, updating commission_rate', async () => {
    seedPartner()
    seedClients(50)
    const result = await autoPromoteSalesPartnerTier(TENANT, PARTNER)
    expect(result.promoted).toBe(true)
    expect(result.tier).toBe('tier2')
    const row = fake._store.get('sales_partners')?.find((r) => r.id === PARTNER)
    expect(row?.tier).toBe('tier2')
    expect(row?.commission_rate).toBe(SALES_PARTNER_TIERS[1].rate)
  })

  it('does not promote below the threshold', async () => {
    seedPartner()
    seedClients(49)
    const result = await autoPromoteSalesPartnerTier(TENANT, PARTNER)
    expect(result.promoted).toBe(false)
    const row = fake._store.get('sales_partners')?.find((r) => r.id === PARTNER)
    expect(row?.tier).toBe('standard')
  })

  it('never demotes a partner already above their earned tier', async () => {
    seedPartner({ tier: 'tier3', commission_rate: 0.15 })
    seedClients(10) // would only earn 'standard' on count alone
    const result = await autoPromoteSalesPartnerTier(TENANT, PARTNER)
    expect(result.promoted).toBe(false)
    const row = fake._store.get('sales_partners')?.find((r) => r.id === PARTNER)
    expect(row?.tier).toBe('tier3')
  })

  it('advances the tier label but leaves a manually customized commission_rate untouched', async () => {
    // Admin negotiated a custom 20% rate while partner was still 'standard' --
    // that custom rate must survive an automatic tier-label promotion.
    seedPartner({ tier: 'standard', commission_rate: 0.20 })
    seedClients(60)
    const result = await autoPromoteSalesPartnerTier(TENANT, PARTNER)
    expect(result.promoted).toBe(true)
    expect(result.tier).toBe('tier2')
    const row = fake._store.get('sales_partners')?.find((r) => r.id === PARTNER)
    expect(row?.tier).toBe('tier2')
    expect(row?.commission_rate).toBe(0.20)
  })

  it('is tenant-scoped -- another tenant\'s clients never count toward this partner\'s promotion', async () => {
    seedPartner()
    seedClients(50, 'tenant-other', PARTNER)
    const result = await autoPromoteSalesPartnerTier(TENANT, PARTNER)
    expect(result.promoted).toBe(false)
    expect(result.directClientCount).toBe(0)
  })
})
