import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Regression: inbound email (Resend email.received) used to write inbound_emails
 * with NO tenant_id — an unscoped, globally-visible row that leaks across
 * tenants. resolveTenantIdForInboundEmail must derive the tenant from the
 * recipient (To) address the same way the app already trusts email identity:
 * email_from (exact) -> resend_domain (domain) -> tenants.domain / tenant_domains.
 *
 * Core assertions:
 *   - an email addressed to tenant B's address/domain resolves to B (not A, not global)
 *   - no resolvable recipient -> null (caller fails closed, writes nothing)
 *
 * We mock @supabase/supabase-js's createClient (which backs both supabaseAdmin
 * and tenant-lookup's client) with a small query builder whose result is decided
 * by a per-test resolver keyed on (table, filters).
 */

type Filters = Record<string, unknown>
let resolveList: (table: string, f: Filters) => unknown[]
let resolveSingle: (table: string, f: Filters) => { data: unknown; error: unknown }

function builder(table: string) {
  const f: Filters = {}
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      f[col] = val
      return chain
    },
    ilike: (col: string, val: unknown) => {
      f[`ilike:${col}`] = val
      return chain
    },
    order: () => chain,
    // `.limit()` terminates the list-returning queries (awaited directly).
    limit: () => Promise.resolve({ data: resolveList(table, f), error: null }),
    single: () => Promise.resolve(resolveSingle(table, f)),
  }
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => builder(table) }),
}))

import { resolveTenantIdForInboundEmail, parseRecipientAddresses, emailDomain } from './inbound-email-tenant'

beforeEach(() => {
  resolveList = () => []
  resolveSingle = () => ({ data: null, error: null })
})

describe('parseRecipientAddresses', () => {
  it('extracts bare, lowercased addresses from a display-name + multi-recipient header', () => {
    expect(parseRecipientAddresses('Support <Hello@Acme.com>, billing@acme.com')).toEqual([
      'hello@acme.com',
      'billing@acme.com',
    ])
  })
  it('returns [] for null/empty/no-@ input', () => {
    expect(parseRecipientAddresses(null)).toEqual([])
    expect(parseRecipientAddresses('   ')).toEqual([])
    expect(parseRecipientAddresses('not-an-address')).toEqual([])
  })
})

describe('emailDomain', () => {
  it('returns the lowercased domain', () => {
    expect(emailDomain('a@Sub.Example.COM')).toBe('sub.example.com')
  })
})

describe('resolveTenantIdForInboundEmail', () => {
  it('scopes an inbound email to tenant B via email_from exact match (not tenant A, not global)', async () => {
    // Only tenant B's email_from matches the recipient.
    resolveList = (table, f) =>
      table === 'tenants' && f['ilike:email_from'] === 'hello@tenant-b.com'
        ? [{ id: 'tenant-B', name: 'Tenant B' }]
        : []

    const id = await resolveTenantIdForInboundEmail('Customer reply <hello@tenant-b.com>')
    expect(id).toBe('tenant-B')
  })

  it('scopes to tenant B via resend_domain when no exact email_from match', async () => {
    resolveList = (table, f) => {
      if (table !== 'tenants') return []
      if (f['ilike:email_from']) return [] // no From match
      if (f['ilike:resend_domain'] === 'tenant-b.com') return [{ id: 'tenant-B', name: 'Tenant B' }]
      return []
    }

    const id = await resolveTenantIdForInboundEmail('inbox@tenant-b.com')
    expect(id).toBe('tenant-B')
  })

  it('falls back to tenants.domain resolver (getTenantByDomain) for the recipient domain', async () => {
    resolveList = () => [] // no email_from / resend_domain matches
    resolveSingle = (table, f) =>
      table === 'tenants' && f.domain === 'tenant-b.com'
        ? { data: { id: 'tenant-B', slug: 'b', name: 'Tenant B', domain: 'tenant-b.com', status: 'active' }, error: null }
        : { data: null, error: null }

    const id = await resolveTenantIdForInboundEmail('hi@tenant-b.com')
    expect(id).toBe('tenant-B')
  })

  it('fails closed (null) when no tenant owns the recipient — caller writes nothing', async () => {
    resolveList = () => []
    resolveSingle = () => ({ data: null, error: null })

    const id = await resolveTenantIdForInboundEmail('stranger@unknown-domain.com')
    expect(id).toBeNull()
  })

  it('returns null for an unparseable recipient', async () => {
    expect(await resolveTenantIdForInboundEmail(null)).toBeNull()
    expect(await resolveTenantIdForInboundEmail('garbage')).toBeNull()
  })
})
