import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST /api/client/collect.
 * Every clients/referrers query in this route used to carry a manual
 * .eq('tenant_id', tenant.id) filter — a dropped filter would let the collect
 * form on tenant A's site match/update a client (or referrer) that actually
 * belongs to tenant B, just because the phone number happens to match.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let updateValues: Row | null = null
  let insertRow: Row | null = null
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))

  function applyMutation(): Row | null {
    if (insertRow) {
      // tenantDb().insert() already stamped tenant_id onto insertRow before this mock sees it.
      const created = { id: `new-${rowsOf().length + 1}`, ...insertRow }
      DB[table] = [...rowsOf(), created]
      return created
    }
    if (updateValues) {
      const ms = matched()
      DB[table] = rowsOf().map((r) => (ms.includes(r) ? { ...r, ...updateValues } : r))
      return ms.length > 0 ? { ...ms[0], ...updateValues } : null
    }
    return null
  }

  const c: Record<string, unknown> = {
    select: () => c,
    insert: (row: Row) => { insertRow = row; return c },
    update: (values: Row) => { updateValues = values; return c },
    delete: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    ilike: (col: string, pattern: string) => {
      const needle = pattern.replace(/%/g, '').toLowerCase()
      filters.push((r) => String(r[col] ?? '').toLowerCase().includes(needle))
      return c
    },
    or: (expr: string) => {
      const m = expr.match(/^phone\.ilike\.%(.+)%$/)
      if (m) {
        const needle = m[1]
        filters.push((r) => String(r.phone ?? '').includes(needle))
      }
      return c
    },
    order: () => c,
    limit: () => c,
    maybeSingle: async () => {
      const m = applyMutation()
      return { data: m ?? matched()[0] ?? null, error: null }
    },
    single: async () => {
      const m = applyMutation()
      return { data: m ?? matched()[0] ?? null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      const m = applyMutation()
      if (insertRow || updateValues) return resolve({ data: m ? [m] : [], error: null })
      return resolve({ data: matched(), error: null })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => ({ id: TENANT_A, name: 'Tenant A' }) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: async () => {} }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/attribution', () => ({ attributeCollectForm: async () => {} }))

import { POST } from './route'

beforeEach(() => {
  DB.clients = []
  DB.referrers = []
  DB.sms_conversations = []
})

describe('POST /api/client/collect — tenantDb scoping', () => {
  it('does NOT update a foreign-tenant client sharing the same phone — inserts a fresh own-tenant client instead', async () => {
    DB.clients.push({ id: 'client-foreign', tenant_id: TENANT_B, phone: '5551234567', status: 'active', name: 'Foreign Existing' })

    const req = new Request('https://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Guy', phone: '5551234567' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()

    // The foreign row must be untouched.
    const foreign = DB.clients.find((r) => r.id === 'client-foreign')
    expect(foreign?.name).toBe('Foreign Existing')

    // A NEW row was inserted for tenant A, not a mutation of the foreign row.
    const created = DB.clients.find((r) => r.id === body.client_id)
    expect(created).toBeDefined()
    expect(created?.id).not.toBe('client-foreign')
  })

  it('does not attribute a lead to a foreign-tenant referrer with a matching phone', async () => {
    DB.referrers.push({ id: 'ref-foreign', tenant_id: TENANT_B, phone: '5559990000', active: true })

    const req = new Request('https://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ref Test', phone: '5551110000', referrer_phone: '5559990000' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    const created = DB.clients.find((r) => r.id === body.client_id)
    expect(created?.referrer_id).toBeFalsy()
  })

  it('ALLOWS an own-tenant existing client to be updated (not duplicated)', async () => {
    DB.clients.push({ id: 'client-mine', tenant_id: TENANT_A, phone: '5552223333', status: 'potential', name: 'Old Name' })

    const req = new Request('https://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Name', phone: '5552223333' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.client_id).toBe('client-mine')
    expect(DB.clients).toHaveLength(1)
    expect(DB.clients[0].name).toBe('New Name')
  })
})
