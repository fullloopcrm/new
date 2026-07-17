/**
 * commitBatch — booking_team_members lead-sync gap.
 *
 * Committing a staged 'schedules' batch row with a resolved staff_name match
 * inserts a booking with bookings.team_member_id set, but never inserted a
 * booking_team_members row. GET /api/bookings/:id/team and closeout-summary
 * both source the lead from booking_team_members, not bookings.team_member_id,
 * so a committed, staff-assigned import row showed as unassigned in the admin
 * Team panel and closeout payout attribution. Same booking_team_members-sync
 * gap fixed at every other bookings.team_member_id write site this session.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake, type FakeStoreHandle } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})

import { commitBatch } from './import-staging'

const TENANT_A = 'tenant-A'

beforeEach(() => {
  h.seq = 0
  h.store = {
    import_batches: [
      { id: 'batch-1', tenant_id: TENANT_A, kind: 'schedules', status: 'staged', total_rows: 2, committed_rows: 0 },
    ],
    import_rows: [
      {
        id: 'row-1', batch_id: 'batch-1', tenant_id: TENANT_A, row_index: 0,
        match_status: 'matched', target_table: 'bookings', target_id: null,
        mapped: { client_id: 'client-A1', team_member_id: 'tm-1', service_type: 'Cleaning', start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00', status: 'scheduled', price: 10000, team_size: 1, notes: null },
      },
      {
        id: 'row-2', batch_id: 'batch-1', tenant_id: TENANT_A, row_index: 1,
        match_status: 'matched', target_table: 'bookings', target_id: null,
        mapped: { client_id: 'client-A1', team_member_id: null, service_type: 'Cleaning', start_time: '2026-08-02T10:00:00', end_time: '2026-08-02T12:00:00', status: 'scheduled', price: 10000, team_size: 1, notes: null },
      },
    ],
    bookings: [],
    booking_team_members: [],
  }
})

describe('commitBatch — booking_team_members lead sync', () => {
  it('creates a booking_team_members lead row for a committed booking with a staff match', async () => {
    const result = await commitBatch('batch-1')
    expect(result.committed).toBe(2)

    const withStaff = h.store.bookings.find((b) => b.team_member_id === 'tm-1')
    expect(withStaff).toBeTruthy()
    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === withStaff?.id && r.is_lead)
    expect(leadRows.length).toBe(1)
    expect(leadRows[0].team_member_id).toBe('tm-1')
    expect(leadRows[0].tenant_id).toBe(TENANT_A)
  })

  it('a committed booking with no staff match creates no booking_team_members row', async () => {
    await commitBatch('batch-1')
    const unassigned = h.store.bookings.find((b) => !b.team_member_id)
    expect(unassigned).toBeTruthy()
    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === unassigned?.id)
    expect(leadRows.length).toBe(0)
  })
})
