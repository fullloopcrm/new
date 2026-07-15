import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * requirePermission gate probe — admin/smart-schedule GET.
 * Previously only checked getTenantForRequest() (any authenticated tenant
 * member), unlike its closest sibling travel-times/route.ts which requires
 * bookings.view for the same class of team-routing/availability data.
 */

let currentTenantId: string
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: currentTenantId }, error: null }
  ),
}))

let scoreTeamCalls = 0
vi.mock('@/lib/smart-schedule', () => ({
  scoreTeamForBooking: async () => {
    scoreTeamCalls++
    return []
  },
  pickBestTeam: () => null,
  suggestBookingSlots: async () => [],
}))

import { GET } from './route'

const TENANT_ID = 'tenant-A'

function req(): Request {
  return new Request('http://x/api/admin/smart-schedule?date=2026-08-01&start_time=09:00&address=1+Main+St')
}

beforeEach(() => {
  currentTenantId = TENANT_ID
  permissionError = null
  scoreTeamCalls = 0
})

describe('admin/smart-schedule GET — permission gate', () => {
  it('a caller with bookings.view can request team scores (positive control)', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(scoreTeamCalls).toBe(1)
  })

  it('a role lacking bookings.view is forbidden and never scores the team', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await GET(req())
    expect(res.status).toBe(403)
    expect(scoreTeamCalls).toBe(0)
  })
})
