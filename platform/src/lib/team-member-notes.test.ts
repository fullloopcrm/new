/**
 * casUpdateTeamMemberNotes — lost-update regression.
 *
 * team_members.notes is a single TEXT column reused as a JSON blob by three
 * independent features (team-portal availability, team-portal preferences,
 * the admin dashboard's schedule/time-off editor). Each did a plain
 * read -> merge -> write of the WHOLE blob with no concurrency guard: a
 * second writer racing the first (even just two rapid saves from the same
 * user) read a stale snapshot and silently reverted the first writer's key
 * on write-back. This CAS helper reasserts the exact notes value it read in
 * the UPDATE's own WHERE clause and retries (re-read + re-merge) on a lost
 * race instead of blindly overwriting.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake }
})

import { casUpdateTeamMemberNotes } from './team-member-notes'

const TENANT_A = 'tenant-A'
const MEMBER_A = 'member-A'

beforeEach(() => {
  h.seq = 0
  h.store = {
    team_members: [{ id: MEMBER_A, tenant_id: TENANT_A, notes: null }],
  }
})

describe('casUpdateTeamMemberNotes', () => {
  it('merges onto an empty/null notes column', async () => {
    const result = await casUpdateTeamMemberNotes(MEMBER_A, TENANT_A, (current) => ({ ...current, availability: { blocked_dates: ['2026-08-01'] } }))
    expect(result).toEqual({ availability: { blocked_dates: ['2026-08-01'] } })
    expect(JSON.parse(h.store.team_members[0].notes as string)).toEqual({ availability: { blocked_dates: ['2026-08-01'] } })
  })

  it('preserves an unrelated key already present', async () => {
    h.store.team_members[0].notes = JSON.stringify({ notification_preferences: { sms_consent: true } })
    await casUpdateTeamMemberNotes(MEMBER_A, TENANT_A, (current) => ({ ...current, availability: { blocked_dates: [] } }))
    const stored = JSON.parse(h.store.team_members[0].notes as string)
    expect(stored.notification_preferences).toEqual({ sms_consent: true })
    expect(stored.availability).toEqual({ blocked_dates: [] })
  })

  it('retries and does NOT lose a concurrent writer that lands between this read and this write', async () => {
    h.store.team_members[0].notes = JSON.stringify({ availability: { blocked_dates: [] } })
    let fired = false

    const result = await casUpdateTeamMemberNotes(MEMBER_A, TENANT_A, (current) => {
      // Simulate a SECOND writer (e.g. team-portal/preferences) completing
      // its own read-merge-write in the gap between OUR read and OUR write,
      // on its first attempt only.
      if (!fired) {
        fired = true
        h.store.team_members[0].notes = JSON.stringify({
          ...(current as object),
          notification_preferences: { sms_consent: false },
        })
      }
      return { ...current, availability: { blocked_dates: ['2026-08-01'] } }
    })

    // Our write must have retried against the concurrent writer's result,
    // not clobbered it.
    expect(result).toEqual({
      availability: { blocked_dates: ['2026-08-01'] },
      notification_preferences: { sms_consent: false },
    })
    const stored = JSON.parse(h.store.team_members[0].notes as string)
    expect(stored).toEqual(result)
  })

  it('gives up after MAX_ATTEMPTS under sustained contention rather than looping forever', async () => {
    h.store.team_members[0].notes = JSON.stringify({})
    await expect(
      casUpdateTeamMemberNotes(MEMBER_A, TENANT_A, (current) => {
        // Every attempt, an "other writer" changes notes again right after
        // our read — our CAS write never matches.
        h.store.team_members[0].notes = JSON.stringify({ churn: Math.random() })
        return { ...current, mine: true }
      }),
    ).rejects.toThrow(/exceeded retry attempts/)
  })

  it('returns null without writing when the team member does not exist / wrong tenant', async () => {
    const result = await casUpdateTeamMemberNotes('nope', TENANT_A, (c) => ({ ...c, x: 1 }))
    expect(result).toBeNull()
  })
})
