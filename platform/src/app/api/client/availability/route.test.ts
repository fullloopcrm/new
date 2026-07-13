import { describe, it, expect, beforeEach, vi } from 'vitest'

/** Zero prior coverage: tenant-context gate, required `date` param, and the
 * duration clamp (1-8, defaulting to 2 on missing/non-numeric input). */

const TENANT = { id: 'aaaaaaaa-0000-0000-0000-000000000001' }

let tenant: unknown = TENANT
const calls: Array<{ tenantId: string; date: string; duration: number }> = []

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => tenant),
}))

vi.mock('@/lib/availability', () => ({
  checkAvailability: vi.fn(async (tenantId: string, date: string, duration: number) => {
    calls.push({ tenantId, date, duration })
    return { slots: [] }
  }),
}))

import { GET } from './route'

beforeEach(() => {
  tenant = TENANT
  calls.length = 0
})

describe('client/availability', () => {
  it('REJECTS (400) when there is no tenant context', async () => {
    tenant = null
    const res = await GET(new Request('https://x/api/client/availability?date=2026-01-01'))
    expect(res.status).toBe(400)
    expect(calls).toHaveLength(0)
  })

  it('REJECTS (400) when date is missing', async () => {
    const res = await GET(new Request('https://x/api/client/availability'))
    expect(res.status).toBe(400)
    expect(calls).toHaveLength(0)
  })

  it('defaults duration to 2 when omitted', async () => {
    await GET(new Request('https://x/api/client/availability?date=2026-01-01'))
    expect(calls[0].duration).toBe(2)
  })

  it('defaults duration to 2 when non-numeric', async () => {
    await GET(new Request('https://x/api/client/availability?date=2026-01-01&duration=abc'))
    expect(calls[0].duration).toBe(2)
  })

  it('clamps a negative duration up to 1', async () => {
    await GET(new Request('https://x/api/client/availability?date=2026-01-01&duration=-5'))
    expect(calls[0].duration).toBe(1)
  })

  it('duration=0 is falsy and defaults to 2 rather than clamping to 1', async () => {
    // parseInt('0') || 2 short-circuits on the falsy 0 before the clamp runs.
    await GET(new Request('https://x/api/client/availability?date=2026-01-01&duration=0'))
    expect(calls[0].duration).toBe(2)
  })

  it('clamps duration above 8 down to 8', async () => {
    await GET(new Request('https://x/api/client/availability?date=2026-01-01&duration=99'))
    expect(calls[0].duration).toBe(8)
  })

  it('passes the resolved tenant id and date through unchanged', async () => {
    await GET(new Request('https://x/api/client/availability?date=2026-03-15&duration=4'))
    expect(calls[0]).toEqual({ tenantId: TENANT.id, date: '2026-03-15', duration: 4 })
  })
})
