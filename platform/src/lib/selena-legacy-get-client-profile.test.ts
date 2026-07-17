import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * getClientProfile(tenantId, phone) used to ilike-substring-match
 * clients.phone with no minimum length floor. A short/garbage phone (e.g.
 * a single digit) reachable unauthenticated via POST /api/chat's `phone`
 * field on the legacy Selena engine would match an ARBITRARY client and
 * leak their name/address/email/notes/booking history into the AI's
 * system-prompt context. Locks down the fix: exact national-number match
 * only, gated on digits.length >= 10.
 */

let clientRows: Array<{ id: string; name: string; email: string; phone: string; address: string; notes: string; status: string }>

// Supports both the pre-fix ilike-substring shape (.ilike().limit().single())
// and the fixed plain-select shape (awaited directly after .eq()), so the
// SAME mock can prove real RED against the real pre-fix code and real GREEN
// against the fix — not just a shape mismatch crash.
function chain(table: string) {
  let ilikePattern: string | null = null
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    in: () => c,
    order: () => c,
    limit: () => c,
    ilike: (_col: string, pattern: string) => { ilikePattern = pattern; return c },
    single: async () => {
      const rows = filtered()
      return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'not found' } }
    },
    then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
      return Promise.resolve({ data: filtered(), error: null }).then(resolve)
    },
  }
  function filtered() {
    if (table !== 'clients') return []
    if (!ilikePattern) return clientRows
    const needle = ilikePattern.replace(/^%|%$/g, '').toLowerCase()
    return clientRows.filter(c => (c.phone || '').toLowerCase().includes(needle))
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

describe('selena-legacy getClientProfile — phone match floor', () => {
  beforeEach(() => {
    clientRows = [
      { id: 'client-victim', name: 'Victim Client', email: 'victim@example.com', phone: '+12125551234', address: '123 Main St', notes: 'sensitive notes', status: 'active' },
    ]
  })

  it('rejects a short/garbage phone instead of substring-matching an arbitrary client', async () => {
    const { getClientProfile } = await import('./selena-legacy')
    const result = JSON.parse(await getClientProfile('tenant-a', '4'))
    expect(result.error).toBe('Client not found')
  })

  it('rejects a 9-digit phone (below the national-number floor)', async () => {
    const { getClientProfile } = await import('./selena-legacy')
    const result = JSON.parse(await getClientProfile('tenant-a', '212555123'))
    expect(result.error).toBe('Client not found')
  })

  it('resolves the correct client on an exact 10-digit match', async () => {
    const { getClientProfile } = await import('./selena-legacy')
    const result = JSON.parse(await getClientProfile('tenant-a', '2125551234'))
    expect(result.name).toBe('Victim Client')
  })

  it('resolves the correct client on an 11-digit match with leading US "1"', async () => {
    const { getClientProfile } = await import('./selena-legacy')
    const result = JSON.parse(await getClientProfile('tenant-a', '12125551234'))
    expect(result.name).toBe('Victim Client')
  })

  it('derives active from the maintained status column, not the stale unmaintained active column', async () => {
    // clients.active is a real but unmaintained legacy column from a one-time
    // NYC Maid data import (see deploy-prep/w4-broad-hunt-2026-07-17-0128 —
    // 426/957 live clients have status='inactive' but active still reads
    // true). Feeding the raw column to the AI as a client's "active" flag
    // would tell Selena a churned/inactive client is active nearly half the
    // time. This asserts the tool result derives active from status instead.
    clientRows[0].status = 'inactive'
    const { getClientProfile } = await import('./selena-legacy')
    const result = JSON.parse(await getClientProfile('tenant-a', '2125551234'))
    expect(result.active).toBe(false)
  })
})
