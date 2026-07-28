/**
 * logSchedulingOverrideIfAny — smart-scheduling upgrade spec Part 4 item 4.
 * Pinned:
 *   - logs when the chosen member differs from the scorer's top pick
 *   - does NOT log when the chosen member IS the top pick
 *   - does NOT log when there's no address to score against (nothing to compare)
 *   - never throws, even if the insert itself fails
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({
  scores: [] as Array<{ id: string; available: boolean; score: number }>,
  inserted: [] as unknown[],
  failInsert: false,
}))

vi.mock('@/lib/smart-schedule', () => ({
  scoreTeamForBooking: vi.fn(async () => h.scores),
  pickBestTeam: (scores: Array<{ id: string; available: boolean; score: number }>) => {
    const available = scores.filter((s) => s.available).sort((a, b) => b.score - a.score)
    return { lead: available[0] || null, extras: [], short: available.length ? 0 : 1 }
  },
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: (row: unknown) => {
        h.inserted.push(row)
        return Promise.resolve(h.failInsert ? { error: new Error('insert failed') } : { error: null })
      },
    }),
  },
}))

import { logSchedulingOverrideIfAny } from './scheduling-override-log'

const baseOpts = {
  tenantId: 'tenant-A',
  bookingId: 'booking-1',
  date: '2026-08-01',
  startTime: '09:00',
  durationHours: 2,
  clientAddress: '123 Main St',
  source: 'admin_booking',
}

beforeEach(() => {
  h.scores = []
  h.inserted = []
  h.failInsert = false
})

describe('logSchedulingOverrideIfAny', () => {
  it('logs an override when the chosen member differs from the top-scored candidate', async () => {
    h.scores = [
      { id: 'member-best', available: true, score: 150 },
      { id: 'member-chosen', available: true, score: 100 },
    ]

    await logSchedulingOverrideIfAny({ ...baseOpts, chosenTeamMemberId: 'member-chosen' })

    expect(h.inserted).toHaveLength(1)
    expect(h.inserted[0]).toMatchObject({
      tenant_id: 'tenant-A',
      booking_id: 'booking-1',
      suggested_team_member_id: 'member-best',
      suggested_score: 150,
      chosen_team_member_id: 'member-chosen',
      source: 'admin_booking',
    })
  })

  it('logs nothing when the chosen member IS the top-scored candidate', async () => {
    h.scores = [{ id: 'member-best', available: true, score: 150 }]

    await logSchedulingOverrideIfAny({ ...baseOpts, chosenTeamMemberId: 'member-best' })

    expect(h.inserted).toHaveLength(0)
  })

  it('logs nothing when there is no address to score against', async () => {
    await logSchedulingOverrideIfAny({ ...baseOpts, clientAddress: '', chosenTeamMemberId: 'member-chosen' })

    expect(h.inserted).toHaveLength(0)
  })

  it('never throws even when the insert itself fails', async () => {
    h.scores = [{ id: 'member-best', available: true, score: 150 }]
    h.failInsert = true

    await expect(
      logSchedulingOverrideIfAny({ ...baseOpts, chosenTeamMemberId: 'member-chosen' }),
    ).resolves.toBeUndefined()
  })
})
