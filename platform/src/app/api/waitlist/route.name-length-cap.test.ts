import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/waitlist is public + unauthenticated (tenant resolved from a
 * signed header, no Clerk/PIN auth). Before this fix, the caller-supplied
 * `name` was interpolated verbatim — with zero length cap — into an admin SMS
 * via smsAdmins() on BOTH the success path and the "table missing" fallback
 * path, with no human review in between. An anonymous caller could push
 * arbitrary-length content (a phishing/smishing message, or just enough text
 * to multi-segment-bill every admin's phone) straight to the tenant's staff
 * from the business's own trusted Telnyx number, once per request. Verifies
 * the fix: `name` is capped before it reaches both the DB insert and the SMS
 * body.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
let waitlistInsertShouldError = false

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return c },
    order: () => c,
    limit: () => c,
    insert: (row: Row) => {
      if (table === 'waitlist' && waitlistInsertShouldError) {
        return { then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: null, error: { message: 'relation "waitlist" does not exist' } }) }
      }
      rowsOf().push(row)
      return { then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: null, error: null }) }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

const smsAdminsCalls: string[] = []

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/admin-contacts', () => ({
  smsAdmins: vi.fn((_tenantId: string, message: string) => { smsAdminsCalls.push(message); return Promise.resolve() }),
}))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_A, phone: null }),
}))

import { NextRequest } from 'next/server'
import { POST } from './route'

beforeEach(() => {
  DB.waitlist = []
  waitlistInsertShouldError = false
  smsAdminsCalls.length = 0
})

function req(body: Record<string, unknown>) {
  return new NextRequest('https://x/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  })
}

describe('POST /api/waitlist — name length cap', () => {
  it('truncates an oversized name before it reaches the DB insert', async () => {
    const longName = 'A'.repeat(5000)
    const res = await POST(req({ name: longName, phone: '5551234567' }))
    expect(res.status).toBe(200)
    const inserted = DB.waitlist[0]
    expect((inserted.name as string).length).toBeLessThanOrEqual(200)
  })

  it('truncates an oversized name before it reaches the success-path admin SMS body', async () => {
    const longName = 'CLICK-HERE-VERIFY-NOW '.repeat(500) // ~11.5KB
    const res = await POST(req({ name: longName, phone: '5551234567' }))
    expect(res.status).toBe(200)
    expect(smsAdminsCalls.length).toBe(1)
    expect(smsAdminsCalls[0].length).toBeLessThan(400)
  })

  it('truncates an oversized name before it reaches the fallback-path admin SMS body when the table is missing', async () => {
    waitlistInsertShouldError = true
    const longName = 'CLICK-HERE-VERIFY-NOW '.repeat(500)
    const res = await POST(req({ name: longName, phone: '5551234567' }))
    expect(res.status).toBe(200)
    expect(smsAdminsCalls.length).toBe(1)
    expect(smsAdminsCalls[0].length).toBeLessThan(400)
  })

  it('still accepts and stores a normal-length name unchanged', async () => {
    const res = await POST(req({ name: 'Jane Doe', phone: '5551234567' }))
    expect(res.status).toBe(200)
    expect(DB.waitlist[0].name).toBe('Jane Doe')
  })
})
