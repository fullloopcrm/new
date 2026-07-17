/**
 * PUT /api/cleaners/[id] computed "today" (for filtering unavailable_dates
 * down to future-only entries) via `new Date().toISOString().split('T')[0]`
 * — the server's own default zone, not the tenant's. Same day-boundary bug
 * shape items (70)-(75) already fixed elsewhere in the codebase: on Vercel
 * (UTC-default), a tenant on America/New_York already ticks past UTC
 * midnight ~5-8pm local, so "today" computes as tomorrow's date server-side
 * for a few hours every evening — silently stripping a still-current
 * unavailable_date from the team member's profile one day early on any PUT
 * during that window.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

let currentTenant: string
let currentTimezone: string
let lastUpdate: Record<string, unknown> | null

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({
    tenant: { tenantId: currentTenant, tenant: { timezone: currentTimezone } },
    error: null,
  }),
}))

vi.mock('@/lib/geo', () => ({ geocodeAddress: async () => null }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      update: (row: Record<string, unknown>) => {
        lastUpdate = row
        return {
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'cleaner-1', ...row }, error: null }),
              }),
            }),
          }),
        }
      },
    }),
  },
}))

import { PUT } from './route'

function putRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
  } as unknown as Parameters<typeof PUT>[0]
}

describe('PUT /api/cleaners/[id] — unavailable_dates future filter uses tenant timezone', () => {
  beforeEach(() => {
    currentTenant = 'tenant-A'
    currentTimezone = 'America/New_York'
    lastUpdate = null
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('keeps a date that is still today in the tenant zone, even when the UTC server clock has already ticked into tomorrow', async () => {
    // 2026-01-15 23:30 America/New_York == 2026-01-16 04:30 UTC (ET is UTC-5 in January).
    vi.stubEnv('TZ', 'UTC')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-16T04:30:00.000Z'))

    await PUT(putRequest({ unavailable_dates: ['2026-01-14', '2026-01-15', '2026-01-20'] }), {
      params: Promise.resolve({ id: 'cleaner-1' }),
    })

    expect(lastUpdate?.unavailable_dates).toEqual(['2026-01-15', '2026-01-20'])
  })

  it('falls back to America/New_York when the tenant has no timezone set', async () => {
    currentTimezone = ''
    vi.stubEnv('TZ', 'UTC')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-16T04:30:00.000Z'))

    await PUT(putRequest({ unavailable_dates: ['2026-01-15'] }), {
      params: Promise.resolve({ id: 'cleaner-1' }),
    })

    expect(lastUpdate?.unavailable_dates).toEqual(['2026-01-15'])
  })
})
