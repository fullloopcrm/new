import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * createSubTenant (src/lib/create-sub-tenant.ts) is the clone-on-provision
 * seed step for the head/sub-tenant hierarchy. What matters most here is the
 * NEGATIVE space: everything identity/contact/billing/credential-shaped must
 * come from the input, never from the parent row — a bug that leaked the
 * parent's owner_email or stripe_account_id onto a new child would be a real
 * cross-tenant data/billing incident, not just a cosmetic default.
 */

type Eqs = Record<string, unknown>
let resolveSingle: (table: string, eqs: Eqs) => { data: unknown; error: unknown }
let insertedRow: Record<string, unknown> | null
let existingSlugs: Set<string>

function builder(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    single: async () => resolveSingle(table, eqs),
    maybeSingle: async () => {
      const slug = eqs.slug as string
      return existingSlugs.has(slug) ? { data: { id: 'existing' }, error: null } : { data: null, error: null }
    },
    insert: (row: Record<string, unknown>) => {
      insertedRow = row
      return {
        select: () => ({
          single: async () => ({ data: { id: 'new-child', slug: row.slug, name: row.name }, error: null }),
        }),
      }
    },
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import { createSubTenant } from './create-sub-tenant'

const PARENT_ROW = {
  id: 'head-1',
  industry: 'cleaning',
  primary_category_id: 'cat-cleaning',
  timezone: 'America/New_York',
  logo_url: 'https://cdn.example.com/logo.png',
  primary_color: '#111111',
  secondary_color: '#222222',
  tagline: 'Reliable cleaning',
  website_content: { hero: 'Book now' },
  selena_config: { ai_name: 'Selena', tone: 'warm_friendly' },
  // The dangerous fields — if these ever leak into a child, that's the bug.
  owner_email: 'head-owner@example.com',
  owner_name: 'Head Owner',
  owner_phone: '2125551234',
  address: '123 Head St',
  zip_code: '10001',
  phone: '2125559999',
  email: 'contact@head.example.com',
  billing_status: 'active',
  monthly_rate: 899,
  stripe_account_id: 'acct_head123',
  telnyx_api_key: 'head-telnyx-key',
}

beforeEach(() => {
  insertedRow = null
  existingSlugs = new Set()
  resolveSingle = (table, eqs) => {
    if (table === 'tenants' && eqs.id === 'head-1') return { data: PARENT_ROW, error: null }
    return { data: null, error: null }
  }
})

describe('createSubTenant', () => {
  it('seeds brand/industry/service-catalog fields from the parent', async () => {
    await createSubTenant({ parentTenantId: 'head-1', name: 'Acme Cleaning — Brooklyn' })

    expect(insertedRow?.industry).toBe('cleaning')
    expect(insertedRow?.primary_category_id).toBe('cat-cleaning')
    expect(insertedRow?.timezone).toBe('America/New_York')
    expect(insertedRow?.logo_url).toBe(PARENT_ROW.logo_url)
    expect(insertedRow?.primary_color).toBe('#111111')
    expect(insertedRow?.secondary_color).toBe('#222222')
    expect(insertedRow?.tagline).toBe('Reliable cleaning')
    expect(insertedRow?.website_content).toEqual({ hero: 'Book now' })
    expect(insertedRow?.selena_config).toEqual({ ai_name: 'Selena', tone: 'warm_friendly' })
    expect(insertedRow?.parent_tenant_id).toBe('head-1')
    expect(insertedRow?.status).toBe('pending')
  })

  it('NEVER inherits identity/contact fields from the parent, even when the caller supplies none', async () => {
    await createSubTenant({ parentTenantId: 'head-1', name: 'Acme Cleaning — Queens' })

    expect(insertedRow?.owner_email).not.toBe(PARENT_ROW.owner_email)
    expect(insertedRow?.owner_name).not.toBe(PARENT_ROW.owner_name)
    expect(insertedRow?.owner_phone).not.toBe(PARENT_ROW.owner_phone)
    expect(insertedRow?.address).not.toBe(PARENT_ROW.address)
    expect(insertedRow?.zip_code).not.toBe(PARENT_ROW.zip_code)
    expect(insertedRow?.phone).not.toBe(PARENT_ROW.phone)
    expect(insertedRow?.email).not.toBe(PARENT_ROW.email)
    expect(insertedRow?.owner_email).toBeNull()
  })

  it('NEVER inherits billing_status/monthly_rate/stripe/telnyx — those columns are not even in the insert payload', async () => {
    await createSubTenant({ parentTenantId: 'head-1', name: 'Acme Cleaning — Bronx' })

    expect(insertedRow).not.toHaveProperty('billing_status')
    expect(insertedRow).not.toHaveProperty('monthly_rate')
    expect(insertedRow).not.toHaveProperty('stripe_account_id')
    expect(insertedRow).not.toHaveProperty('telnyx_api_key')
  })

  it('uses the caller-supplied identity/contact fields when given', async () => {
    await createSubTenant({
      parentTenantId: 'head-1',
      name: 'Acme Cleaning — Queens',
      ownerEmail: 'queens-owner@example.com',
      address: '456 Queens Blvd',
    })

    expect(insertedRow?.owner_email).toBe('queens-owner@example.com')
    expect(insertedRow?.address).toBe('456 Queens Blvd')
  })

  it('disambiguates the slug on collision instead of failing', async () => {
    existingSlugs.add('acme-cleaning')
    await createSubTenant({ parentTenantId: 'head-1', name: 'Acme Cleaning' })

    expect(insertedRow?.slug).toBe('acme-cleaning-2')
  })

  it('fails cleanly when the parent tenant does not exist', async () => {
    const result = await createSubTenant({ parentTenantId: 'ghost', name: 'Nobody' })
    expect(result.ok).toBe(false)
    expect(insertedRow).toBeNull()
  })
})
