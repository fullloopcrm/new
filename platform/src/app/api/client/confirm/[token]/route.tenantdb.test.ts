import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST /api/client/confirm/[token].
 * The token lookup itself has no tenant filter (the token IS the auth boundary),
 * but the subsequent writes only had `.eq('id', booking.id)` — no tenant_id
 * filter at all. Wrapping those follow-up writes in tenantDb(booking.tenant_id)
 * adds defense-in-depth: even if two rows ever shared an id across tenants
 * (e.g. a future non-UUID id scheme, or a bad migration), the write must stay
 * pinned to the resolved booking's own tenant.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let updateValues: Row | null = null
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))

  function applyUpdate(): Row | null {
    if (!updateValues) return null
    const ms = matched()
    DB[table] = rowsOf().map((r) => (ms.includes(r) ? { ...r, ...updateValues } : r))
    return ms.length > 0 ? { ...ms[0], ...updateValues } : null
  }

  const c: Record<string, unknown> = {
    select: () => c,
    update: (values: Row) => { updateValues = values; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    maybeSingle: async () => ({ data: applyUpdate() ?? matched()[0] ?? null, error: null }),
    single: async () => ({ data: applyUpdate() ?? matched()[0] ?? null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      const u = applyUpdate()
      return resolve({ data: u ? [u] : matched(), error: null })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: async () => {} }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))

import { POST } from './route'

beforeEach(() => {
  // Two rows sharing the SAME id across DIFFERENT tenants (worst-case
  // collision) — only the tenant-A row's token should ever be reachable,
  // and only its data should ever change.
  DB.bookings = [
    {
      id: 'bk-shared',
      tenant_id: TENANT_A,
      client_confirm_token: 'token-a',
      start_time: '2099-01-01T10:00:00Z',
      status: 'scheduled',
      client_terms_accepted_at: null,
      client_id: 'client-a',
      notes: 'original A',
      clients: { name: 'Alice', phone: '5551234567' },
    },
    {
      id: 'bk-shared',
      tenant_id: TENANT_B,
      client_confirm_token: 'token-b',
      start_time: '2099-01-01T11:00:00Z',
      status: 'scheduled',
      client_terms_accepted_at: null,
      client_id: 'client-b',
      notes: 'original B',
      clients: { name: 'Bob', phone: '5559998888' },
    },
  ]
})

describe('POST /api/client/confirm/[token] — tenantDb scoping of follow-up writes', () => {
  it("accepting tenant A's token only mutates tenant A's row, never tenant B's same-id row", async () => {
    const res = await POST(new Request('https://x'), { params: Promise.resolve({ token: 'token-a' }) })
    expect(res.status).toBe(200)

    const rowA = DB.bookings.find((r) => r.tenant_id === TENANT_A)
    const rowB = DB.bookings.find((r) => r.tenant_id === TENANT_B)
    expect(rowA?.client_terms_accepted_at).toBeTruthy()
    expect(String(rowA?.notes)).toContain('Client accepted terms')

    // Tenant B's same-id row must be untouched.
    expect(rowB?.client_terms_accepted_at).toBeNull()
    expect(rowB?.notes).toBe('original B')
  })
})
