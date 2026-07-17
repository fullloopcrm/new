import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Fresh-ground — clientSmsTemplates()/clientSmsTemplatesFor() are the
 * live send paths (booking create/reschedule/cancel/rating-prompt cron) that
 * previously fed tenantBrand() a tenant row with no tenant_domains fallback
 * (see brand.test.ts for the unit-level probe). This file proves the bug at
 * the SMS-body level — through the exact resolver every real send path uses
 * — and locks in that clientSmsTemplates()/clientSmsTemplatesFor() are now
 * async (both became Promise-returning so tenantBrand()'s tenant_domains
 * lookup can complete before the templates are built).
 */

type Eqs = Record<string, unknown>
let tenantRow: Record<string, unknown> | null
let resolveTenantDomains: (eqs: Eqs) => { data: unknown; error?: unknown }

function from(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    single: async () => ({ data: table === 'tenants' ? tenantRow : null, error: null }),
    // getPrimaryTenantDomain() ends on a bare .eq() chain — no .single(). It
    // now also chains .order() first — a no-op pass-through here since
    // resolveTenantDomains controls the returned data directly.
    order: () => chain,
    then: (onFulfilled: (v: { data: unknown; error?: unknown }) => unknown) =>
      Promise.resolve(table === 'tenant_domains' ? resolveTenantDomains(eqs) : { data: null }).then(onFulfilled),
  }
  return chain
}

vi.mock('../supabase', () => ({
  supabaseAdmin: { from },
  supabase: { from },
}))

import { clientSmsTemplates, clientSmsTemplatesFor } from './client-sms'

const booking = { start_time: '2026-08-01T14:00:00Z', client_confirm_token: 'tok-123' }

beforeEach(() => {
  tenantRow = null
  resolveTenantDomains = () => ({ data: [] })
})

describe('clientSmsTemplatesFor domain resolution (fresh-ground, SMS-body-level probe)', () => {
  it('prefers tenant_domains PRIMARY over tenants.domain in the booking-received tap-to-confirm link and portal URL', async () => {
    tenantRow = { id: 't-1', industry: 'cleaning', name: 'Ace Cleaning', domain: 'legacy-ace.com' }
    resolveTenantDomains = (eqs) =>
      eqs.tenant_id === 't-1' ? { data: [{ domain: 'ace.com', is_primary: true }] } : { data: [] }
    const templates = await clientSmsTemplatesFor('t-1')
    expect(templates.bookingReceived(booking)).toContain('https://ace.com/c/tok-123')
    expect(templates.bookingReceived(booking)).not.toContain('legacy-ace.com')
  })

  it('falls back to tenants.domain when the tenant has no tenant_domains rows', async () => {
    tenantRow = { id: 't-2', industry: 'cleaning', name: 'Ace Cleaning', domain: 'legacy-ace.com' }
    const templates = await clientSmsTemplatesFor('t-2')
    expect(templates.bookingReceived(booking)).toContain('https://legacy-ace.com/c/tok-123')
  })

  it('BUG-CLASS PROBE: domain only in tenant_domains previously left the confirm link and Portal: line broken', async () => {
    tenantRow = { id: 't-3', industry: 'cleaning', name: 'Ace Cleaning', domain: null, website_url: null }
    resolveTenantDomains = (eqs) =>
      eqs.tenant_id === 't-3' ? { data: [{ domain: 'onlyintenantdomains.com', is_primary: true }] } : { data: [] }
    const templates = await clientSmsTemplatesFor('t-3')
    const received = templates.bookingReceived(booking)
    expect(received).toContain('https://onlyintenantdomains.com/c/tok-123')
    const confirmed = templates.bookingConfirmation({ start_time: booking.start_time })
    expect(confirmed).toContain('Portal: onlyintenantdomains.com/book')
    expect(confirmed).not.toContain('the booking link we sent you')
  })

  it('WRONG-TENANT PROBE: a different tenant\'s tenant_domains PRIMARY row never leaks into this tenant\'s SMS body', async () => {
    tenantRow = { id: 't-4', industry: 'cleaning', name: 'Ace Cleaning', domain: null, website_url: null }
    resolveTenantDomains = (eqs) =>
      eqs.tenant_id === 't-4' ? { data: [] } : { data: [{ domain: 'other-tenants-domain.com', is_primary: true }] }
    const templates = await clientSmsTemplatesFor('t-4')
    const confirmed = templates.bookingConfirmation({ start_time: booking.start_time })
    expect(confirmed).not.toContain('other-tenants-domain.com')
    expect(confirmed).toContain('the booking link we sent you')
  })

  it('non-cleaning tenants get the neutral templates, unaffected by the domain resolver change', async () => {
    tenantRow = { id: 't-5', industry: 'plumbing', name: 'Ace Plumbing', domain: 'legacy-ace.com' }
    const templates = await clientSmsTemplatesFor('t-5')
    expect(templates.bookingReceived(booking)).not.toContain('legacy-ace.com')
    expect(templates.bookingReceived(booking)).toContain('Ace Plumbing')
    // ratingQ1 also routes through tenantBrand() for every tenant (see
    // client-sms.ts) — confirm it still resolves cleanly for a non-cleaning
    // tenant and doesn't throw despite the now-async brand lookup.
    expect(templates.ratingQ1()).toBe('Ace Plumbing: How was your service today? Reply 1-5 (5 = perfect).\nReply STOP to opt out.')
  })
})

describe('clientSmsTemplates (sync-tenant-object call sites: client/book, client/reschedule)', () => {
  it('resolves tenant_domains for a full tenant row the same way clientSmsTemplatesFor does', async () => {
    resolveTenantDomains = (eqs) =>
      eqs.tenant_id === 't-6' ? { data: [{ domain: 'ace.com', is_primary: true }] } : { data: [] }
    const templates = await clientSmsTemplates({ id: 't-6', industry: 'cleaning', name: 'Ace Cleaning', domain: 'legacy-ace.com' })
    expect(templates.bookingReceived(booking)).toContain('https://ace.com/c/tok-123')
  })
})
