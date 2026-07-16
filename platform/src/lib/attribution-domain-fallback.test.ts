/**
 * attributeByAddress — generic-domain fallback when no neighborhood matches.
 *
 * ROOT BUG: getNeighborhoodFromZip()/getDomainsForNeighborhood() query
 * tenant_domains.neighborhood/zip_codes, columns that never existed until
 * 068_tenant_domains_type_geo.sql (this same fix). Independently of that,
 * attributeByAddress() ALSO hard-returned null the instant no zip was found
 * or no neighborhood matched it — so even once the columns exist, a plain
 * single-domain tenant with no neighborhood data (the overwhelming majority)
 * would still never get an attribution match, because the generic-domain
 * path below it was unreachable. Both halves are fixed together; this file
 * proves the JS-level half (the early-return gap) via the fake-supabase
 * integration harness other activate-tenant/vercel-project sync tests use.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { attributeByAddress } from './attribution'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_ID = 't-single-domain'
const SUBMITTED_AT = '2026-07-16T12:00:00.000Z'

beforeEach(() => {
  fake._store.clear()
})

describe('attributeByAddress — single-domain tenant with no neighborhood data', () => {
  it('still matches via the generic domain instead of bailing out on no-neighborhood', async () => {
    fake._seed('tenant_domains', [
      {
        id: 'td-generic',
        tenant_id: TENANT_ID,
        domain: 'example-cleaning.com',
        active: true,
        is_primary: true,
        type: 'generic',
        neighborhood: null,
        zip_codes: null,
      },
    ])
    fake._seed('lead_clicks', [
      {
        id: 'click-1',
        tenant_id: TENANT_ID,
        domain: 'example-cleaning.com',
        action: 'call',
        created_at: '2026-07-16T11:00:00.000Z', // 1h before submission
      },
    ])

    const result = await attributeByAddress(TENANT_ID, '123 Main St, Brooklyn, NY 11201', SUBMITTED_AT)

    expect(result).not.toBeNull()
    expect(result?.domain).toBe('example-cleaning.com')
    expect(result?.action).toBe('call')
    expect(result?.neighborhood).toBeNull()
  })

  it('still matches via the generic domain when the address has no zip at all', async () => {
    fake._seed('tenant_domains', [
      {
        id: 'td-generic',
        tenant_id: TENANT_ID,
        domain: 'example-cleaning.com',
        active: true,
        is_primary: true,
        type: 'generic',
        neighborhood: null,
        zip_codes: null,
      },
    ])
    fake._seed('lead_clicks', [
      {
        id: 'click-1',
        tenant_id: TENANT_ID,
        domain: 'example-cleaning.com',
        action: 'text',
        created_at: '2026-07-16T11:30:00.000Z',
      },
    ])

    const result = await attributeByAddress(TENANT_ID, 'no zip in this address', SUBMITTED_AT)

    expect(result).not.toBeNull()
    expect(result?.domain).toBe('example-cleaning.com')
    expect(result?.neighborhood).toBeNull()
  })

  it('returns null (not a crash) when the tenant has no matching domain at all', async () => {
    const result = await attributeByAddress(TENANT_ID, '123 Main St, Brooklyn, NY 11201', SUBMITTED_AT)
    expect(result).toBeNull()
  })
})

describe('attributeByAddress — single-domain tenant whose domain is type=primary (068 backfill output)', () => {
  // 068_tenant_domains_type_geo.backfill.sql maps is_primary=true -> type='primary',
  // not 'generic' — the realistic shape for any tenant with a live custom domain
  // (activate-tenant.ts sets is_primary:true on the custom domain). A fallback
  // filter that only accepted type==='generic' silently excluded this domain from
  // matching entirely, reproducing the same "attribution never fires" bug this
  // file's other tests already guard against for the 'generic' case.
  it('still matches via the fallback pool when the domain is type=primary, not generic', async () => {
    fake._seed('tenant_domains', [
      {
        id: 'td-primary',
        tenant_id: TENANT_ID,
        domain: 'realcustomerdomain.com',
        active: true,
        is_primary: true,
        type: 'primary',
        neighborhood: null,
        zip_codes: null,
      },
    ])
    fake._seed('lead_clicks', [
      {
        id: 'click-1',
        tenant_id: TENANT_ID,
        domain: 'realcustomerdomain.com',
        action: 'call',
        created_at: '2026-07-16T11:00:00.000Z',
      },
    ])

    const result = await attributeByAddress(TENANT_ID, '123 Main St, Brooklyn, NY 11201', SUBMITTED_AT)

    expect(result).not.toBeNull()
    expect(result?.domain).toBe('realcustomerdomain.com')
    expect(result?.action).toBe('call')
  })
})

describe('attributeByAddress — multi-domain tenant WITH neighborhood data resolves it correctly', () => {
  const NEIGHBORHOOD_TENANT = 't-multi-domain'

  it('resolves the neighborhood domain via zip/neighborhood data and includes its clicks in matching', async () => {
    fake._seed('tenant_domains', [
      {
        id: 'td-neighborhood',
        tenant_id: NEIGHBORHOOD_TENANT,
        domain: 'parkslopemaid.com',
        active: true,
        is_primary: false,
        type: 'neighborhood',
        neighborhood: 'Park Slope',
        zip_codes: ['11215'],
      },
      {
        id: 'td-generic',
        tenant_id: NEIGHBORHOOD_TENANT,
        domain: 'thenycmaid.com',
        active: true,
        is_primary: true,
        type: 'generic',
        neighborhood: null,
        zip_codes: null,
      },
    ])
    fake._seed('lead_clicks', [
      {
        id: 'click-generic',
        tenant_id: NEIGHBORHOOD_TENANT,
        domain: 'thenycmaid.com',
        action: 'call',
        created_at: '2026-07-16T10:00:00.000Z',
      },
      {
        id: 'click-neighborhood',
        tenant_id: NEIGHBORHOOD_TENANT,
        domain: 'parkslopemaid.com',
        action: 'call',
        created_at: '2026-07-16T11:45:00.000Z', // more recent than the generic click
      },
    ])

    const result = await attributeByAddress(NEIGHBORHOOD_TENANT, '1 Prospect Park West, Brooklyn, NY 11215', SUBMITTED_AT)

    expect(result?.domain).toBe('parkslopemaid.com')
    expect(result?.neighborhood).toBe('Park Slope')
  })
})
