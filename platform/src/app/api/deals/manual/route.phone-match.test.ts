/**
 * POST /api/deals/manual -- fuzzy phone-substring cross-client deal misattribution.
 *
 * The find-or-create client lookup used `.ilike('phone', '%<last-10-digits>%')`
 * gated only by `cleanPhone.length >= 7` -- a malformed 7-9 digit phone
 * entered by staff would substring-match an ARBITRARY unrelated client in
 * this tenant, and the new deal (plus its `clients(id, name, email, phone,
 * address, status)` response embed) got linked to that wrong client instead
 * of creating a fresh one. Same bug class already fixed on ingest/lead (the
 * canonical example of this exact 7-digit-floor mistake).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const UNRELATED_CLIENT = { id: 'unrelated-client-1', tenant_id: 'tenant-1', phone: '12125551234' }

let clients: (typeof UNRELATED_CLIENT)[]
let dealInserts: Record<string, unknown>[] = []
let clientInserts: Record<string, unknown>[] = []

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 'tenant-1' }, error: null })),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: vi.fn(async () => {}) }))

function genericChain(result: { data: unknown; error?: unknown }) {
  const q: Record<string, unknown> = {
    eq: () => q,
    ilike: () => q,
    limit: () => q,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    select: () => q,
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  }
  return q
}

function clientsChain(rows: (typeof UNRELATED_CLIENT)[]) {
  let filtered = rows
  const q: Record<string, unknown> = {
    eq: (col: string, val: unknown) => {
      filtered = filtered.filter((r) => (r as Record<string, unknown>)[col] === val)
      return q
    },
    ilike: (col: string, pattern: string) => {
      const needle = String(pattern).replace(/%/g, '').toLowerCase()
      filtered = filtered.filter((r) => String((r as Record<string, unknown>)[col] ?? '').toLowerCase().includes(needle))
      return q
    },
    limit: () => q,
    single: () => Promise.resolve({ data: filtered[0] ?? null, error: filtered[0] ? null : new Error('not found') }),
    maybeSingle: () => Promise.resolve({ data: filtered[0] ?? null, error: null }),
    select: () => q,
    then: (resolve: (v: unknown) => void) => Promise.resolve({ data: filtered, error: null }).then(resolve),
  }
  return q
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => {
        if (table === 'clients') return clientsChain(clients.filter((c) => c.tenant_id === 'tenant-1'))
        return genericChain({ data: null })
      },
      insert: (row: Record<string, unknown>) => {
        if (table === 'clients') {
          clientInserts.push(row)
          return {
            select: () => ({ single: () => Promise.resolve({ data: { id: 'new-client-1' }, error: null }) }),
          }
        }
        if (table === 'deals') {
          dealInserts.push(row)
          return {
            select: () => ({
              single: () => Promise.resolve({
                data: { id: 'deal-1', ...row, clients: { id: row.client_id, name: 'x' } },
                error: null,
              }),
            }),
          }
        }
        return { then: (resolve: (v: unknown) => void) => resolve({ error: null }) }
      },
    }),
  },
}))

import { POST } from './route'

function req(phone: string): Request {
  const body = { name: 'Attacker Name', phone, email: 'attacker@evil.com' }
  return { json: async () => body } as unknown as Request
}

describe('POST /api/deals/manual — client dedupe phone match', () => {
  beforeEach(() => {
    clients = [{ ...UNRELATED_CLIENT }]
    dealInserts = []
    clientInserts = []
  })

  it('does NOT link the deal to an unrelated client via a malformed 7-digit phone substring (creates new client instead)', async () => {
    const res = await POST(req('5551234'))
    expect(res.status).toBe(200)
    expect(clientInserts).toHaveLength(1)
    expect(dealInserts[0].client_id).toBe('new-client-1')
  })

  it('does NOT link the deal to an unrelated client via a malformed 9-digit phone substring', async () => {
    const res = await POST(req('212555123'))
    expect(res.status).toBe(200)
    expect(clientInserts).toHaveLength(1)
    expect(dealInserts[0].client_id).toBe('new-client-1')
  })

  it('CONTROL: still dedupes when the submitted phone exactly matches the existing client (10-digit national number)', async () => {
    const res = await POST(req('2125551234'))
    expect(res.status).toBe(200)
    expect(clientInserts).toHaveLength(0)
    expect(dealInserts[0].client_id).toBe(UNRELATED_CLIENT.id)
  })

  it('CONTROL: still dedupes when the submitted phone includes a leading US country code (11 digits)', async () => {
    const res = await POST(req('12125551234'))
    expect(res.status).toBe(200)
    expect(clientInserts).toHaveLength(0)
    expect(dealInserts[0].client_id).toBe(UNRELATED_CLIENT.id)
  })
})
