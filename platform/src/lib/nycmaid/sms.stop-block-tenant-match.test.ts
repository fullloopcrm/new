import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

/**
 * lib/nycmaid/sms.ts sendSMS()'s STOP-block auto-opt-out fallback (no
 * recipientId supplied) -- same sms_number carry-forward bug class already
 * fixed in webhooks/telnyx/route.ts's inbound tenant lookup, flagged as
 * NOTICED-not-fixed in the 20:32 gap doc, closed this round.
 *
 * BUG (fixed here): the tenant that OWNS the sending number was looked up
 * via `.eq('telnyx_phone', fromNum).single()` only. A tenant whose Telnyx
 * number only ever landed in the legacy `sms_number` column never matched,
 * so a carrier-level STOP block for that tenant's client never flipped
 * `sms_consent` off -- every retry produced a fresh failure notification
 * instead of the intended one-time silence. `.single()` also meant a
 * mis-seeded duplicate number would error the lookup and no-op the whole
 * opt-out.
 *
 * FIX: `.or('telnyx_phone.eq.<num>,sms_number.eq.<num>')` (sanitized via the
 * existing sanitizePostgrestValue() helper -- `from` is attacker-influenced,
 * it's whatever Telnyx echoes back from the outbound send) + `limit(2)`
 * instead of `.single()`, mirroring webhooks/telnyx's own fix.
 */

const state = vi.hoisted(() => ({
  tenants: [] as { id: string; telnyx_phone: string | null; sms_number: string | null }[],
  orFilter: '',
  clientUpdateEq: [] as { column: string; value: unknown }[][],
}))

function tenantsChain() {
  const c: Record<string, unknown> = {}
  c.select = vi.fn(() => c)
  c.or = vi.fn((filter: string) => {
    state.orFilter = filter
    return c
  })
  c.order = vi.fn(() => c)
  c.limit = vi.fn(async () => {
    const parts = state.orFilter.split(',').map((p) => p.split('.eq.'))
    const matches = state.tenants.filter((t) =>
      parts.some(([col, val]) => (t as unknown as Record<string, unknown>)[col] === val),
    )
    return { data: matches, error: null }
  })
  return c
}

function clientsOrCleanersChain(table: 'clients' | 'cleaners') {
  const eqCalls: { column: string; value: unknown }[] = []
  const c: Record<string, unknown> = {}
  c.update = vi.fn(() => c)
  c.eq = vi.fn((column: string, value: unknown) => {
    eqCalls.push({ column, value })
    return c
  })
  c.ilike = vi.fn(() => {
    state.clientUpdateEq.push([...eqCalls, { column: `${table}.ilike`, value: null }])
    return Promise.resolve({ data: null, error: null })
  })
  return c
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return tenantsChain()
      if (table === 'clients') return clientsOrCleanersChain('clients')
      if (table === 'cleaners') return clientsOrCleanersChain('cleaners')
      // notifications insert (logSMSFailure) and everything else
      const c: Record<string, unknown> = {}
      c.insert = vi.fn(async () => ({ data: null, error: null }))
      return c
    },
  },
}))

import { sendSMS } from './sms'

const originalFetch = global.fetch

beforeEach(() => {
  process.env.TELNYX_API_KEY = 'test-key'
  state.tenants = []
  state.orFilter = ''
  state.clientUpdateEq = []
  global.fetch = vi.fn(async () => ({
    ok: false,
    status: 400,
    json: async () => ({ errors: [{ code: '40300' }] }),
  })) as unknown as typeof fetch
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('sendSMS STOP-block auto-opt-out — tenant-match fallback', () => {
  it('telnyx_phone is null but sms_number matches the sending "from" number — opt-out still fires', async () => {
    state.tenants = [{ id: 'tid-a', telnyx_phone: null, sms_number: '+15559990000' }]

    await sendSMS('+15551234567', 'hi', { from: '+15559990000' })

    expect(state.clientUpdateEq.length).toBeGreaterThan(0)
  })

  it('neither telnyx_phone nor sms_number matches — no opt-out write happens (expected, not a regression)', async () => {
    state.tenants = [{ id: 'tid-a', telnyx_phone: null, sms_number: '+15551110001' }]

    await sendSMS('+15551234567', 'hi', { from: '+15559990000' })

    expect(state.clientUpdateEq.length).toBe(0)
  })

  it("wrong-tenant probe: tenant B's sms_number never matches tenant A's sending number", async () => {
    state.tenants = [
      { id: 'tid-a', telnyx_phone: null, sms_number: '+15559990000' },
      { id: 'tid-b', telnyx_phone: null, sms_number: '+15558880000' },
    ]

    await sendSMS('+15551234567', 'hi', { from: '+15559990000' })

    expect(state.clientUpdateEq.length).toBeGreaterThan(0)
    const scopedTo = state.clientUpdateEq[0].find((e) => e.column === 'tenant_id')
    expect(scopedTo?.value).toBe('tid-a')
  })
})
