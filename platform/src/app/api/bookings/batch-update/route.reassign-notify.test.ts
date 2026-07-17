import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Item (97): this is BookingsAdmin's own "apply to all future bookings"
 * series-edit path (BATCH_UPDATE_FIELDS allows team_member_id, and the
 * caller sends it on every series-wide reassignment). The old code only
 * ever SMS'd the NEW tech, gated on `notify_type === 'rescheduled'` — set
 * by the caller only when the *time* shifted, so a pure reassignment with
 * unchanged times notified no one — and only for the FIRST booking in the
 * batch. The outgoing tech was never notified at all, for any booking, the
 * same "silently vanished" gap items (86)/(89) already fixed on the
 * single-booking PUT path. Proves: a batch that reassigns bookings away
 * from one tech and onto another sends exactly one aggregated SMS to each
 * affected outgoing and incoming tech (not one per booking), a batch with
 * no team_member_id in it sends none, and an unchanged team_member_id in
 * the payload (same id re-sent) triggers neither.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))
vi.mock('@/lib/audit', () => ({ audit: async () => ({ success: true }) }))

const notifyCalls: Array<{ recipientId?: string; title?: string; message?: string }> = []
vi.mock('@/lib/notify', () => ({
  notify: async (opts: { recipientId?: string; title?: string; message?: string }) => {
    notifyCalls.push({ recipientId: opts.recipientId, title: opts.title, message: opts.message })
    return { success: true }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const TENANT_ID = 'tenant-batch-reassign'
const OLD_TECH_ID = 'tm-old'
const NEW_TECH_ID = 'tm-new'
const BOOKING_1 = 'bk-1'
const BOOKING_2 = 'bk-2'
const BOOKING_3 = 'bk-3'
const fake = supabaseAdmin as unknown as FakeSupabase

function seed() {
  fake._store.clear()
  notifyCalls.length = 0
  currentTenantId = TENANT_ID
  fake._seed('bookings', [
    { id: BOOKING_1, tenant_id: TENANT_ID, team_member_id: OLD_TECH_ID, start_time: '2026-08-10T09:00', clients: { name: 'Alice' } },
    { id: BOOKING_2, tenant_id: TENANT_ID, team_member_id: OLD_TECH_ID, start_time: '2026-08-17T09:00', clients: { name: 'Alice' } },
    { id: BOOKING_3, tenant_id: TENANT_ID, team_member_id: OLD_TECH_ID, start_time: '2026-08-24T09:00', clients: { name: 'Alice' } },
  ])
  fake._seed('team_members', [
    { id: OLD_TECH_ID, tenant_id: TENANT_ID, phone: '+15551110000', name: 'Old Tech' },
    { id: NEW_TECH_ID, tenant_id: TENANT_ID, phone: '+15559990000', name: 'New Tech' },
  ])
}

function putReq(body: Record<string, unknown>) {
  return PUT(new Request('http://x', { method: 'PUT', body: JSON.stringify(body) }))
}

describe('bookings/batch-update PUT — series reassignment now notifies both sides (item 97)', () => {
  it('reassigning a 3-booking series to a new tech sends ONE aggregated SMS to the outgoing tech and ONE to the incoming tech', async () => {
    seed()
    const res = await putReq({
      updates: [BOOKING_1, BOOKING_2, BOOKING_3].map((id) => ({ id, data: { team_member_id: NEW_TECH_ID } })),
      notify_type: 'booking_updated',
    })
    expect(res.status).toBe(200)

    const toOld = notifyCalls.filter((c) => c.recipientId === OLD_TECH_ID)
    const toNew = notifyCalls.filter((c) => c.recipientId === NEW_TECH_ID)
    expect(toOld).toHaveLength(1)
    expect(toNew).toHaveLength(1)
    expect(toOld[0].message).toContain('3')
    expect(toNew[0].message).toContain('3')
  })

  it('reassignment fires even when notify_type is NOT "rescheduled" (the old gate that silently swallowed pure reassignments)', async () => {
    seed()
    const res = await putReq({
      updates: [{ id: BOOKING_1, data: { team_member_id: NEW_TECH_ID } }],
      notify_type: 'booking_updated',
    })
    expect(res.status).toBe(200)
    expect(notifyCalls.some((c) => c.recipientId === NEW_TECH_ID)).toBe(true)
    expect(notifyCalls.some((c) => c.recipientId === OLD_TECH_ID)).toBe(true)
  })

  it('a batch with no team_member_id changes sends no reassignment SMS', async () => {
    seed()
    const res = await putReq({
      updates: [{ id: BOOKING_1, data: { notes: 'just a note edit' } }],
      notify_type: 'booking_updated',
    })
    expect(res.status).toBe(200)
    expect(notifyCalls).toHaveLength(0)
  })

  it('re-sending the SAME team_member_id (no-op) triggers no reassignment SMS', async () => {
    seed()
    const res = await putReq({
      updates: [{ id: BOOKING_1, data: { team_member_id: OLD_TECH_ID } }],
      notify_type: 'booking_updated',
    })
    expect(res.status).toBe(200)
    expect(notifyCalls).toHaveLength(0)
  })
})
