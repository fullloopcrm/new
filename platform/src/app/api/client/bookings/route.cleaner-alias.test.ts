import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Item (128): every consuming dashboard (site/book, wash-and-fold-hoboken,
 * wash-and-fold-nyc, the-florida-maid) reads `booking.cleaners?.name` off
 * this route's response. The select() must alias the team_members join as
 * `cleaners`, not leave it under the bare `team_members` key the join
 * itself is named after — otherwise the assigned cleaner's name is always
 * undefined and every booking silently shows "Cleaner TBD"/"To be assigned".
 */

const selectCalls: string[] = []

function builder() {
  const chain: Record<string, unknown> = {
    select: (columns: string) => { selectCalls.push(columns); return chain },
    eq: () => chain,
    ilike: () => chain,
    in: () => chain,
    gte: () => chain,
    lt: () => chain,
    neq: () => chain,
    order: () => chain,
    limit: () => chain,
    single: async () => ({ data: { email: null, phone: null, do_not_service: false }, error: null }),
    then: (resolve: (v: { data: unknown[]; error: null }) => unknown) => resolve({ data: [], error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: () => builder() },
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: 'tenant-A' }),
}))

vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: async () => ({ clientId: 'client-a' }),
}))

import { GET } from './route'

beforeEach(() => {
  selectCalls.length = 0
})

function req(): Request {
  return new Request('http://x/api/client/bookings?client_id=client-a')
}

describe('client/bookings GET — cleaner name join alias', () => {
  it('aliases the team_members join as `cleaners` for both upcoming and past queries', async () => {
    await GET(req())
    const bookingSelects = selectCalls.filter((c) => c.includes('team_members'))
    expect(bookingSelects.length).toBeGreaterThanOrEqual(2)
    for (const c of bookingSelects) {
      expect(c).toContain('cleaners:team_members')
    }
  })
})
