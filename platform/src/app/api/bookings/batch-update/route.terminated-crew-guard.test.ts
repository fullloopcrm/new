import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/bookings/batch-update — terminated-crew guard.
 *
 * BUG (P1/W2 fresh-ground): every other team_member_id assignment surface
 * (POST /api/bookings, PUT /api/bookings/[id], PUT /api/bookings/[id]/team,
 * recurring-schedule/client-portal/staged-import/dispatch-route routes) gates
 * reassignment on hr_status='terminated' -- this route, used by
 * BookingsAdmin.tsx's "apply to all future bookings" recurring-series edit to
 * reassign the whole series in one call, never did. Compounding it: the
 * frontend was sending the reassignment under the wrong key (`cleaner_id`
 * instead of `team_member_id`), so this route's team_member_id branch was
 * silently unreachable in practice -- every future booking in a series kept
 * its OLD assignee no matter what the admin picked, and this guard was dead
 * code. Both are fixed together: the frontend now sends `team_member_id`
 * (making the branch live), and this route now runs it through
 * getTerminatedTeamMemberIds before any write, matching the sibling routes.
 */

const TENANT = 'tid-a'

const holder = vi.hoisted(() => ({
  bookings: new Map<string, Record<string, unknown>>(),
  members: new Map<string, { id: string; tenant_id: string }>(),
  terminatedIds: new Set<string>(),
  updateCalls: [] as { table: string; values: Record<string, unknown>; id: string }[],
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/hr', () => ({
  getTerminatedTeamMemberIds: vi.fn(async (_tid: string, ids: string[]) =>
    ids.filter((id) => holder.terminatedIds.has(id)),
  ),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'team_members') {
        return {
          select: () => ({
            in: (_col: string, ids: string[]) => ({
              eq: async (_c: string, tenantId: string) => ({
                data: ids
                  .map((id) => holder.members.get(id))
                  .filter((m): m is { id: string; tenant_id: string } => !!m && m.tenant_id === tenantId)
                  .map((m) => ({ id: m.id })),
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'bookings') {
        return {
          update: (values: Record<string, unknown>) => {
            let id = ''
            const chain = {
              eq: (col: string, val: string) => {
                if (col === 'id') id = val
                return chain
              },
              select: () => chain,
              single: async () => {
                holder.updateCalls.push({ table, values, id })
                const existing = holder.bookings.get(id)
                if (!existing) return { data: null, error: { message: 'not found' } }
                Object.assign(existing, values)
                return { data: { ...existing, clients: { name: 'Client' } }, error: null }
              },
            }
            return chain
          },
        }
      }
      if (table === 'notifications') {
        return { insert: async () => ({ error: null }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

import { PUT } from './route'

function req(updates: unknown) {
  return new Request('http://t/api/bookings/batch-update', {
    method: 'PUT',
    body: JSON.stringify({ updates }),
  })
}

beforeEach(() => {
  holder.bookings.clear()
  holder.members.clear()
  holder.terminatedIds.clear()
  holder.updateCalls.length = 0
  holder.bookings.set('bk-1', { id: 'bk-1', tenant_id: TENANT, start_time: '2026-08-01T10:00:00Z', status: 'scheduled' })
  holder.bookings.set('bk-2', { id: 'bk-2', tenant_id: TENANT, start_time: '2026-08-08T10:00:00Z', status: 'scheduled' })
  holder.members.set('tm-active', { id: 'tm-active', tenant_id: TENANT })
  holder.members.set('tm-terminated', { id: 'tm-terminated', tenant_id: TENANT })
  holder.terminatedIds.add('tm-terminated')
})

describe('batch-update — terminated-crew guard', () => {
  it('BLOCKED: reassigning any booking in the batch to a terminated team member 400s the whole batch, no writes', async () => {
    const res = await PUT(req([
      { id: 'bk-1', data: { team_member_id: 'tm-active' } },
      { id: 'bk-2', data: { team_member_id: 'tm-terminated' } },
    ]))
    expect(res.status).toBe(400)
    expect(holder.updateCalls.length).toBe(0)
    expect(holder.bookings.get('bk-1')!.team_member_id).toBeUndefined()
    expect(holder.bookings.get('bk-2')!.team_member_id).toBeUndefined()
  })

  it('CONTROL: reassigning the whole series to an active replacement still works', async () => {
    const res = await PUT(req([
      { id: 'bk-1', data: { team_member_id: 'tm-active' } },
      { id: 'bk-2', data: { team_member_id: 'tm-active' } },
    ]))
    expect(res.status).toBe(200)
    expect(holder.bookings.get('bk-1')!.team_member_id).toBe('tm-active')
    expect(holder.bookings.get('bk-2')!.team_member_id).toBe('tm-active')
  })
})
