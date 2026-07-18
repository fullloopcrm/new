import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/client/collect is public/unauthenticated. `name`, `address`,
 * `notes`, `referrer_name`, `pet_name`, and `pet_type` had zero length cap.
 * Same bug class already fixed on /api/contact, /api/lead, /api/waitlist,
 * /api/ingest/lead, /api/ingest/application, /api/leads,
 * /api/management-applications, /api/team-applications,
 * /api/sales-applications, and this route's sibling /api/portal/collect this
 * session. Verifies the fix: short fields capped at 200, notes at 2000.
 */

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
    ilike: () => c,
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
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => ({ id: 'tenant-1', name: 'Canary' }) }))
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

function req(body: Record<string, unknown>): Request {
  return new Request('https://x', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/client/collect — free-text length cap', () => {
  it('caps an oversized name and address at 200 chars before the insert', async () => {
    const res = await POST(req({ name: 'A'.repeat(5000), phone: '5559990000', address: 'B'.repeat(5000) }))
    expect(res.status).toBe(200)
    const body = await res.json()
    const created = DB.clients.find((r) => r.id === body.client_id)
    expect((created!.name as string).length).toBeLessThanOrEqual(200)
    expect((created!.address as string).length).toBeLessThanOrEqual(200)
  })

  it('caps oversized notes at 2000 chars before the insert', async () => {
    const res = await POST(req({ name: 'Real Name', phone: '5558887777', notes: 'X'.repeat(50000) }))
    expect(res.status).toBe(200)
    const body = await res.json()
    const created = DB.clients.find((r) => r.id === body.client_id)
    expect((created!.notes as string).length).toBeLessThanOrEqual(2000)
  })
})
