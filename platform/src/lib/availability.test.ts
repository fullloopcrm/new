import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * availability.ts — the open_365 holiday gate in checkAvailability.
 *
 * This is where isHoliday() actually gates scheduling: a tenant with open_365
 * OFF is CLOSED on a federal holiday (no slots), while an open_365 tenant
 * (e.g. nycmaid) BYPASSES the holiday check entirely and proceeds to normal
 * availability. Getting this backwards either darks a normal tenant's holiday
 * or wrongly closes a 24/7 tenant — real money either way.
 *
 * We isolate the gate by mocking the two collaborators the branch reaches:
 *   - getSettings -> controls the open_365 flag
 *   - supabaseAdmin -> team query resolves to [] so, once PAST the gate,
 *     checkAvailability returns the "No team members" message. That message is
 *     our proof the holiday check was bypassed. isHoliday() runs for real.
 *
 * Real holiday date under test: Christmas of the current year (isHoliday caches
 * current + next year), which is never "today", so the same-day short-circuit
 * can't interfere.
 */

const openState = { open_365: false }

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ open_365: openState.open_365 })),
}))

// Chainable, thenable supabase builder whose team query resolves to no members.
function makeBuilder() {
  const b: Record<string, unknown> = {}
  const self = () => b
  b.select = vi.fn(self)
  b.eq = vi.fn(self)
  b.in = vi.fn(self)
  b.gte = vi.fn(self)
  b.lte = vi.fn(self)
  b.neq = vi.fn(self)
  b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(res, rej)
  return b
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: vi.fn(() => makeBuilder()) },
  supabase: { from: vi.fn(() => makeBuilder()) },
}))

import { checkAvailability } from './availability'

const YEAR = new Date().getFullYear()
const XMAS = `${YEAR}-12-25` // real federal holiday, never today
const ORDINARY = `${YEAR}-06-16` // asserted non-holiday in holidays.test.ts

beforeEach(() => {
  openState.open_365 = false
})

describe('checkAvailability — open_365 holiday gate', () => {
  it('open_365 OFF: a holiday closes the tenant (no slots)', async () => {
    openState.open_365 = false
    const res = await checkAvailability('tenant-1', XMAS, 2)
    expect(res.slots).toEqual([])
    expect(res.message).toBe('Closed for Christmas Day')
  })

  it('open_365 ON: the holiday check is BYPASSED (falls through to team lookup)', async () => {
    openState.open_365 = true
    const res = await checkAvailability('tenant-1', XMAS, 2)
    // Bypassed the holiday close; with no team it reports team absence, NOT closure.
    expect(res.message).not.toMatch(/Closed for/)
    expect(res.message).toMatch(/No team members available/)
    expect(res.slots).toEqual([])
  })

  it('open_365 OFF on an ordinary day does NOT close — only holidays gate', async () => {
    openState.open_365 = false
    const res = await checkAvailability('tenant-1', ORDINARY, 2)
    expect(res.message).not.toMatch(/Closed for/)
    expect(res.message).toMatch(/No team members available/)
  })

  it('same-day requests short-circuit before the holiday gate', async () => {
    const today = new Date().toLocaleDateString('en-CA')
    const res = await checkAvailability('tenant-1', today, 2)
    expect(res.sameDay).toBe(true)
    expect(res.message).toMatch(/Same-day/)
  })
})
