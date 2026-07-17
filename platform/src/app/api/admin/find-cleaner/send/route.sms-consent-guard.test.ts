import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/admin/find-cleaner/send — never checked team_members.sms_consent
 * before texting a candidate cleaner "Available for a paid shift?" (P1/W2
 * fresh-ground, same missing-check shape as this route's own
 * terminated-crew guard, one column over).
 *
 * team_members.sms_consent is a real, crew-editable column since the
 * team-portal/preferences fix — a crew member who revoked SMS consent still
 * received every job-availability broadcast an admin sent through this
 * picker.
 *
 * FIX: the recipients filter now also drops `sms_consent === false`
 * candidates, alongside the existing phone/terminated/TEST_MODE checks.
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
// that filter and isolate the sms_consent check under test.
function seed() {
  return {
    tenants: [{ id: A, name: 'Acme', telnyx_api_key: 'key', telnyx_phone: '+15551234567' }],
    team_members: [
      { id: 'tm-blocked', tenant_id: A, name: 'Jeff Tucker Blocked', phone: '+15559990001', preferred_language: 'en', hourly_rate: 25, sms_consent: false },
      { id: 'tm-control', tenant_id: A, name: 'Jeff Tucker Control', phone: '+15559990002', preferred_language: 'en', hourly_rate: 25, sms_consent: true },
    ],
    hr_employee_profiles: [],
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

describe('POST /api/admin/find-cleaner/send — sms_consent gate', () => {
  it('BLOCKED: a crew member who revoked sms_consent is not texted and gets no broadcast-recipient row', async () => {
    const res = await POST(req(['tm-blocked']))
    expect(res.status).toBe(400)
    expect(smsHolder.send).not.toHaveBeenCalled()
    expect(h.capture.inserts.find((i) => i.table === 'cleaner_broadcast_recipients')).toBeUndefined()
  })

  it('CONTROL: a consented crew member is still texted and recorded', async () => {
    const res = await POST(req(['tm-control']))
    expect(res.status).toBe(200)
    expect(smsHolder.send).toHaveBeenCalledTimes(1)
    const recip = h.capture.inserts.find((i) => i.table === 'cleaner_broadcast_recipients')
    expect(recip).toBeDefined()
    expect(recip!.rows[0].cleaner_id).toBe('tm-control')
  })
})
