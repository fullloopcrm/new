import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/admin/find-cleaner/send — terminated-crew guard (P1/W2 fresh-ground).
 *
 * Defense-in-depth companion to the preview-route fix: `cleaner_ids` is
 * client-supplied, so a terminated worker's id reaching this route directly
 * (stale picker state, or bypassing the preview call entirely) must still be
 * blocked at actual SMS-send time — same reasoning as routes/[id]/publish
 * re-checking hr_status even though routes POST already checked it.
 *
 * FIX: cross-reference getTerminatedTeamMemberIds and drop terminated ids
 * from the recipients filter alongside the existing phone/TEST_MODE checks.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: { id: A },
      role: 'owner',
    })),
  }
})

const smsHolder = vi.hoisted(() => ({ send: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/sms', () => ({ sendSMS: (...args: Parameters<typeof smsHolder.send>) => smsHolder.send(...args) }))

import { POST } from './route'

// TEST_MODE (preview/route.ts constant) is hard-coded true, so both seeded
// members must match TEST_CLEANER_NAME_SUBSTRING ('jeff tucker') to survive
// that filter and isolate the HR-status check under test.
function seed() {
  return {
    tenants: [{ id: A, name: 'Acme', telnyx_api_key: 'key', telnyx_phone: '+15551234567' }],
    team_members: [
      { id: 'tm-terminated', tenant_id: A, name: 'Jeff Tucker Fired', phone: '+15559990001', preferred_language: 'en', hourly_rate: 25 },
      { id: 'tm-active', tenant_id: A, name: 'Jeff Tucker Employed', phone: '+15559990002', preferred_language: 'en', hourly_rate: 25 },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: A, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: A, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    cleaner_broadcasts: [],
    cleaner_broadcast_recipients: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  smsHolder.send.mockClear()
})

function req(cleanerIds: string[]) {
  return new Request('http://t', {
    method: 'POST',
    body: JSON.stringify({
      job_date: '2026-08-01', start_time: '09:00', duration_hours: 2,
      cleaner_ids: cleanerIds, confirmed: true,
    }),
  })
}

describe('POST /api/admin/find-cleaner/send — terminated-crew guard', () => {
  it('BLOCKED: a terminated worker in cleaner_ids is not texted and gets no broadcast-recipient row', async () => {
    const res = await POST(req(['tm-terminated']))
    expect(res.status).toBe(400)
    expect(smsHolder.send).not.toHaveBeenCalled()
    expect(h.capture.inserts.find((i) => i.table === 'cleaner_broadcast_recipients')).toBeUndefined()
  })

  it('CONTROL: an active worker in cleaner_ids is still texted and recorded', async () => {
    const res = await POST(req(['tm-active']))
    expect(res.status).toBe(200)
    expect(smsHolder.send).toHaveBeenCalledTimes(1)
    const recip = h.capture.inserts.find((i) => i.table === 'cleaner_broadcast_recipients')
    expect(recip).toBeDefined()
    expect(recip!.rows[0].cleaner_id).toBe('tm-active')
  })

  it('MIXED: terminated worker silently dropped, active worker still texted, broadcast still created', async () => {
    const res = await POST(req(['tm-terminated', 'tm-active']))
    expect(res.status).toBe(200)
    expect(smsHolder.send).toHaveBeenCalledTimes(1)
    const body = await res.json()
    expect(body.sent).toBe(1)
    expect(body.results.find((r: { cleaner_id: string }) => r.cleaner_id === 'tm-terminated')).toBeUndefined()
    expect(body.results.find((r: { cleaner_id: string }) => r.cleaner_id === 'tm-active')?.sent).toBe(true)
  })
})
