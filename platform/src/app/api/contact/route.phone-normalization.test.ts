import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * lss-01 live audit (2026-07-31): /api/contact's lead branch stored
 * clients.phone/portal_leads.phone as whatever raw string the form
 * submitted, unlike the sibling /api/lead route and lib/lead-intake.ts,
 * both of which normalize to E.164 before writing. Live-verified real
 * consequence in prod: raw 10-digit, malformed, and even unicode-corrupted
 * phone values landing in clients.phone for contact-form-sourced clients
 * while every /api/lead-sourced client was clean E.164. Telnyx rejects
 * non-E.164 numbers, and the inbound-SMS webhook (lss-03) recognizes an
 * existing client via an exact `.eq('phone', from)` match -- an
 * unnormalized stored phone silently breaks both. Proves the fix: every
 * write of a submitted phone number now goes out normalized.
 */

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn().mockResolvedValue({
    id: 'tenant-1',
    name: 'Test Tenant',
    slug: 'test-tenant',
    domain: 'test-tenant.example.com',
    selena_config: null,
  }),
  tenantSiteUrl: () => 'https://test-tenant.example.com',
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn().mockResolvedValue({ allowed: true }),
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: vi.fn().mockResolvedValue(true) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined), tenantSender: vi.fn() }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: vi.fn().mockReturnValue({ subject: '', html: '' }) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/attribution', () => ({ attributeDeal: vi.fn().mockResolvedValue(undefined) }))

const { createPrimaryContact, insertedRows, dealActivityInserts } = vi.hoisted(() => ({
  createPrimaryContact: vi.fn().mockResolvedValue(undefined),
  insertedRows: { clients: [] as Record<string, unknown>[], portal_leads: [] as Record<string, unknown>[] },
  dealActivityInserts: [] as Record<string, unknown>[],
}))
vi.mock('@/lib/client-contacts', () => ({ createPrimaryContact }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        ilike: () => chain,
        in: () => chain,
        limit: () => Promise.resolve({ data: [], error: null }), // no existing client -> insert path
        maybeSingle: () => Promise.resolve({ data: null, error: null }), // no open deal -> new deal path
        order: () => chain,
        insert: (row: Record<string, unknown> | Record<string, unknown>[]) => {
          const r = Array.isArray(row) ? row[0] : row
          if (table === 'clients') insertedRows.clients.push(r)
          if (table === 'portal_leads') insertedRows.portal_leads.push(r)
          if (table === 'deal_activities') dealActivityInserts.push(r)
          return {
            select: () => ({ single: () => Promise.resolve({ data: { id: `${table}-1` }, error: null }) }),
            then: (onFulfilled: (v: unknown) => void) => onFulfilled({ data: null, error: null }),
          }
        },
        update: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) }),
      }
      return chain
    },
  },
}))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('https://x.test/api/contact', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  insertedRows.clients.length = 0
  insertedRows.portal_leads.length = 0
  dealActivityInserts.length = 0
  createPrimaryContact.mockClear()
})

describe('POST /api/contact lead branch -- phone normalization (lss-01 audit fix)', () => {
  it('normalizes a raw 10-digit phone to E.164 before writing clients.phone and portal_leads.phone', async () => {
    const res = await POST(req({ name: 'Ada Client', phone: '9292330178', subject: 'General question' }) as never)
    expect(res.status).toBe(200)
    expect(insertedRows.clients[0].phone).toBe('+19292330178')
    expect(insertedRows.portal_leads[0].phone).toBe('+19292330178')
  })

  it('normalizes a separator-formatted phone ((984) 443-3434) to E.164', async () => {
    await POST(req({ name: 'Bea Client', phone: '(984) 443-3434', subject: 'Quote please' }) as never)
    expect(insertedRows.clients[0].phone).toBe('+19844433434')
  })

  it('passes the normalized phone (not the raw submitted string) to createPrimaryContact', async () => {
    await POST(req({ name: 'Cara Client', phone: '347-607-8016', subject: 'Hi' }) as never)
    expect(createPrimaryContact).toHaveBeenCalledWith('tenant-1', 'clients-1', expect.objectContaining({ phone: '+13476078016' }))
  })

  it('leaves an already-E.164 phone unchanged', async () => {
    await POST(req({ name: 'Dee Client', phone: '+19178375236', subject: 'Hi' }) as never)
    expect(insertedRows.clients[0].phone).toBe('+19178375236')
  })

  it('does not force-normalize the job-application branch (stores raw digits, matching the established /api/lead job-application convention)', async () => {
    await POST(req({ name: 'Evan Applicant', phone: '(212) 555-0100', position: 'Cleaner' }) as never)
    // job-application inserts go through the generic insert path too, but into
    // team_applications, not clients -- clients/portal_leads must stay empty.
    expect(insertedRows.clients.length).toBe(0)
    expect(insertedRows.portal_leads.length).toBe(0)
  })
})
