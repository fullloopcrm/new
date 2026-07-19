import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * nycmaid gap port (6da7b478): the GPS check-in gate rejected cleaners with no
 * server-side trace of why -- console.error on the reject paths (nycmaid's
 * 'log check-in rejections to server') so a blocked cleaner can be diagnosed
 * from Vercel logs instead of waiting for a complaint.
 */

const NYCMAID_TID = 'nycmaid-tenant'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string; role: string } | null
vi.mock('../auth/token', () => ({
  verifyToken: () => currentAuth,
}))

vi.mock('@/lib/nycmaid/tenant', () => ({
  isNycMaid: (tid: string | null | undefined) => tid === NYCMAID_TID,
}))

let mockCoords: { lat: number; lng: number } | null
vi.mock('@/lib/nycmaid/geo', () => ({
  geocodeAddress: vi.fn(async () => mockCoords),
  calculateDistance: (lat1: number, lng1: number, lat2: number, lng2: number) =>
    Math.sqrt((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2) * 69,
  CHECK_IN_MAX_MILES: 0.5,
  CHECK_IN_HARD_BLOCK_MILES: 2,
  CHECK_IN_GPS_ENABLED: true,
}))

vi.mock('@/lib/client-properties', () => ({
  applyPropertyToBookingClient: () => {},
  bookingCoords: () => mockCoords,
  bookingAddress: () => '123 Test St',
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const PAST_START = '2020-01-01T10:00:00'

beforeEach(() => {
  fake._store.clear()
  currentAuth = { id: 'tm-a', tid: NYCMAID_TID, role: 'worker' }
  mockCoords = { lat: 40.75, lng: -73.98 }
  fake._seed('bookings', [
    { id: 'bk1', tenant_id: NYCMAID_TID, team_member_id: 'tm-a', status: 'scheduled', start_time: PAST_START, check_in_time: null, notes: null },
  ])
})

function req(body: Record<string, unknown>): Request {
  return new Request('http://x/api/team-portal/checkin', {
    method: 'POST',
    headers: { authorization: 'Bearer x' },
    body: JSON.stringify(body),
  })
}

describe('team-portal/checkin POST — GPS reject logging (nycmaid)', () => {
  it('logs a [check-in reject] entry with code location_required when no lat/lng is sent', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req({ booking_id: 'bk1' }))
    expect(res.status).toBe(400)
    expect(spy).toHaveBeenCalledWith(
      '[check-in reject]',
      expect.objectContaining({ code: 'location_required', booking_id: 'bk1', team_member_id: 'tm-a' })
    )
    spy.mockRestore()
  })

  it('logs a [check-in reject] entry with code too_far + distance when the cleaner is beyond the hard-block radius', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req({ booking_id: 'bk1', lat: 40.9, lng: -73.98 })) // ~10mi from mockCoords
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('too_far')
    expect(spy).toHaveBeenCalledWith(
      '[check-in reject]',
      expect.objectContaining({
        code: 'too_far',
        booking_id: 'bk1',
        team_member_id: 'tm-a',
        max_miles: 2,
        distance_miles: expect.any(Number),
      })
    )
    spy.mockRestore()
  })

  it('does not log a reject entry for a successful check-in within range', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req({ booking_id: 'bk1', lat: 40.75, lng: -73.98 }))
    expect(res.status).toBe(200)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
