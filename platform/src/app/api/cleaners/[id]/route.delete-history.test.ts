import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * DELETE /api/cleaners/[id] — this route always nulled `team_member_id` on
 * EVERY booking that referenced the deleted team member, regardless of
 * status, with zero notification. Two real bugs in one:
 *
 * 1. Completed/paid bookings lost their `team_member_id` too — but
 *    finance/tax-export, finance/cleaner-income, and finance/payroll-prep
 *    all key off that FK for a departed employee's past-work attribution
 *    (1099 generation, income reports). Deleting a team member right when
 *    they leave — the single most common reason to delete one — silently
 *    erased their historical job-attribution exactly when it's needed for
 *    their final payroll/tax export.
 * 2. Upcoming (scheduled/confirmed/in_progress) bookings silently lost
 *    their assigned tech with no one told — a client expecting a specific
 *    cleaner tomorrow would find out only when no one shows up.
 *
 * Proves the fix: historical (completed/paid/cancelled/no_show) bookings
 * keep their team_member_id; only upcoming/in-flight ones get unassigned,
 * and an admin notify() fires listing how many need reassignment.
 */

const holder = vi.hoisted(() => ({
  bookingsUpdateCalls: [] as Array<{ row: Record<string, unknown>; filters: string[] }>,
  bookingRows: [] as Record<string, unknown>[],
}))

const { notifyMock } = vi.hoisted(() => ({ notifyMock: vi.fn(async (_args: Record<string, unknown>) => ({})) }))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'tenant-A' }, error: null }),
}))

function bookingsChain() {
  const filters: string[] = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push(`eq:${col}=${val}`); return c },
    in: (col: string, vals: unknown[]) => { filters.push(`in:${col}=${vals.join(',')}`); return c },
    update: (row: Record<string, unknown>) => {
      const updC: Record<string, unknown> = {
        eq: (col: string, val: unknown) => { filters.push(`eq:${col}=${val}`); return updC },
        in: (col: string, vals: unknown[]) => {
          filters.push(`in:${col}=${vals.join(',')}`)
          holder.bookingsUpdateCalls.push({ row, filters: [...filters] })
          return Promise.resolve({ data: null, error: null })
        },
        then: (res: (v: unknown) => unknown) => {
          holder.bookingsUpdateCalls.push({ row, filters: [...filters] })
          return Promise.resolve({ data: null, error: null }).then(res)
        },
      }
      return updC
    },
    then: (res: (v: unknown) => unknown) => {
      const statusFilter = filters.find((f) => f.startsWith('in:status='))
      const statuses = statusFilter ? statusFilter.replace('in:status=', '').split(',') : null
      const matched = statuses ? holder.bookingRows.filter((b) => statuses.includes(b.status as string)) : holder.bookingRows
      return Promise.resolve({ data: matched, error: null }).then(res)
    },
  }
  return c
}

function teamMembersChain() {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    single: async () => ({ data: { name: 'Tommy Tech' }, error: null }),
    delete: () => c,
    then: (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(res),
  }
  return c
}

function recurringChain() {
  const c: Record<string, unknown> = {
    update: () => c,
    eq: () => c,
    then: (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(res),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'bookings') return bookingsChain()
      if (table === 'team_members') return teamMembersChain()
      if (table === 'recurring_schedules') return recurringChain()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

import { DELETE } from './route'

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  holder.bookingsUpdateCalls.length = 0
  holder.bookingRows = []
  notifyMock.mockClear()
})

describe('DELETE /api/cleaners/[id] — historical bookings keep team_member_id, only upcoming ones unassign + notify', () => {
  it('only nulls team_member_id for bookings in an unassignable (upcoming/in-flight) status', async () => {
    const res = await DELETE(new Request('http://x') as unknown as import('next/server').NextRequest, paramsFor('tech-1'))
    expect(res.status).toBe(200)

    const teamMemberIdNullCall = holder.bookingsUpdateCalls.find((c) => 'team_member_id' in c.row)
    expect(teamMemberIdNullCall).toBeTruthy()
    const statusFilter = teamMemberIdNullCall!.filters.find((f) => f.startsWith('in:status='))
    expect(statusFilter).toBeTruthy()
    const statuses = statusFilter!.replace('in:status=', '').split(',')
    // Historical/terminal statuses must NOT be in the unassign filter.
    expect(statuses).not.toContain('completed')
    expect(statuses).not.toContain('paid')
    expect(statuses).not.toContain('cancelled')
    expect(statuses).not.toContain('no_show')
    // Upcoming/in-flight statuses must be.
    expect(statuses).toEqual(expect.arrayContaining(['scheduled', 'confirmed', 'pending', 'in_progress']))
  })

  it('notifies the admin with the count of upcoming bookings needing reassignment', async () => {
    holder.bookingRows = [
      { id: 'bk-1', status: 'scheduled', start_time: '2099-01-01T10:00:00Z' },
      { id: 'bk-2', status: 'confirmed', start_time: '2099-01-02T10:00:00Z' },
      { id: 'bk-3', status: 'completed', start_time: '2020-01-01T10:00:00Z' }, // must be excluded
    ]
    const res = await DELETE(new Request('http://x') as unknown as import('next/server').NextRequest, paramsFor('tech-1'))
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    const call = notifyMock.mock.calls[0][0] as Record<string, unknown>
    expect(call.recipientType).toBe('admin')
    expect(call.title).toContain('2 job')
    expect(call.message).toContain('2 upcoming booking')
  })

  it('does not notify when the deleted member had no upcoming bookings', async () => {
    holder.bookingRows = [
      { id: 'bk-1', status: 'completed', start_time: '2020-01-01T10:00:00Z' },
    ]
    const res = await DELETE(new Request('http://x') as unknown as import('next/server').NextRequest, paramsFor('tech-1'))
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
  })
})
