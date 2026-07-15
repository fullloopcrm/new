import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * getClientProfile(phone, tenantId) used to ilike-substring-match
 * clients.phone with no minimum length floor. A short/garbage phone (e.g.
 * a single digit) reachable unauthenticated via POST /api/chat's `phone`
 * field on the Yinez engine would match an ARBITRARY client and leak their
 * name/address/email/notes/do_not_service/booking history/memories into
 * the AI's system-prompt context. Locks down the fix: exact
 * national-number match only, gated on digits.length >= 10.
 */

type Eqs = Record<string, unknown>

let clientRows: Array<{ id: string; name: string; email: string; phone: string; address: string; notes: string; active: boolean; do_not_service: boolean }>

// Supports both the pre-fix ilike-substring shape (.ilike().limit().single())
// and the fixed plain-select shape (awaited directly after .eq()), so the
// SAME mock can prove real RED against the real pre-fix code and real GREEN
// against the fix — not just a shape mismatch crash.
function builder(table: string) {
  const eqs: Eqs = {}
  let ilikePattern: string | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    select: () => chain,
    eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    ilike: (_col: string, pattern: string) => { ilikePattern = pattern; return chain },
    single: async () => {
      const rows = filtered()
      return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'not found' } }
    },
    then: (resolve: (v: { data: unknown; error: null; count?: number }) => unknown) => {
      return Promise.resolve({ data: filtered(), error: null, count: 0 }).then(resolve)
    },
  }
  function filtered() {
    if (table !== 'clients') return []
    if (!ilikePattern) return clientRows
    const needle = ilikePattern.replace(/^%|%$/g, '').toLowerCase()
    return clientRows.filter(c => (c.phone || '').toLowerCase().includes(needle))
  }
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => builder(table) }),
}))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (s: string) => s }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: async () => {} }))
vi.mock('@/lib/nycmaid/smart-schedule', () => ({ scoreCleanersForBooking: async () => [] }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: async () => ({}) }))

describe('selena/core getClientProfile — phone match floor', () => {
  beforeEach(() => {
    clientRows = [
      { id: 'client-victim', name: 'Victim Client', email: 'victim@example.com', phone: '+12125551234', address: '123 Main St', notes: 'sensitive notes', active: true, do_not_service: false },
    ]
  })

  it('rejects a short/garbage phone instead of substring-matching an arbitrary client', async () => {
    const { getClientProfile } = await import('./core')
    const result = JSON.parse(await getClientProfile('4', 'tenant-a'))
    expect(result.error).toBe('Client not found')
  })

  it('rejects a 9-digit phone (below the national-number floor)', async () => {
    const { getClientProfile } = await import('./core')
    const result = JSON.parse(await getClientProfile('212555123', 'tenant-a'))
    expect(result.error).toBe('Client not found')
  })

  it('resolves the correct client on an exact 10-digit match', async () => {
    const { getClientProfile } = await import('./core')
    const result = JSON.parse(await getClientProfile('2125551234', 'tenant-a'))
    expect(result.name).toBe('Victim Client')
  })

  it('resolves the correct client on an 11-digit match with leading US "1"', async () => {
    const { getClientProfile } = await import('./core')
    const result = JSON.parse(await getClientProfile('12125551234', 'tenant-a'))
    expect(result.name).toBe('Victim Client')
  })
})
