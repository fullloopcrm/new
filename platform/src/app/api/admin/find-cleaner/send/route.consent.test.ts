import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * find-cleaner/send is the sibling mass-dispatch broadcast to
 * bookings/broadcast (item 48's sms_consent fix) — same "URGENT JOB
 * AVAILABLE"-class page-the-roster mechanism, just admin-initiated per job
 * instead of auto-fired system-wide. It never checked team_members.sms_consent
 * before this fix: an opted-out team member was still texted unconditionally.
 * TEST_MODE (find-cleaner/preview/route.ts) is hard-coded true, so every
 * seeded recipient here must match TEST_CLEANER_NAME_SUBSTRING ('jeff tucker').
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const sentTo: string[] = []
vi.mock('@/lib/sms', () => ({
  sendSMS: async ({ to }: { to: string }) => {
    sentTo.push(to)
    return { success: true }
  },
}))

let currentTenantId: string
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-A'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(cleanerIds: string[]): Request {
  return new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({
      job_date: '2026-08-01',
      start_time: '09:00',
      duration_hours: 2,
      cleaner_ids: cleanerIds,
      confirmed: true,
    }),
  })
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_ID
  sentTo.length = 0
  fake._seed('tenants', [{ id: TENANT_ID, name: 'Acme', telnyx_api_key: 'key', telnyx_phone: '+15551234567' }])
})

describe('admin/find-cleaner/send POST — sms_consent gate', () => {
  it('does not text a team member who opted out of SMS (regression control)', async () => {
    fake._seed('team_members', [
      { id: 'tm-optout', tenant_id: TENANT_ID, name: 'Jeff Tucker', phone: '+15559990001', preferred_language: 'en', hourly_rate: 25, sms_consent: false },
    ])
    const res = await POST(req(['tm-optout']))
    expect(res.status).toBe(400)
    expect(sentTo).toEqual([])
  })

  it('still texts a team member with consent (positive control)', async () => {
    fake._seed('team_members', [
      { id: 'tm-consented', tenant_id: TENANT_ID, name: 'Jeff Tucker', phone: '+15559990002', preferred_language: 'en', hourly_rate: 25, sms_consent: true },
    ])
    const res = await POST(req(['tm-consented']))
    expect(res.status).toBe(200)
    expect(sentTo).toEqual(['+15559990002'])
  })

  it('defaults to opted-in when sms_consent is null/unset (existing rows without the column set)', async () => {
    fake._seed('team_members', [
      { id: 'tm-null', tenant_id: TENANT_ID, name: 'Jeff Tucker', phone: '+15559990003', preferred_language: 'en', hourly_rate: 25 },
    ])
    const res = await POST(req(['tm-null']))
    expect(res.status).toBe(200)
    expect(sentTo).toEqual(['+15559990003'])
  })
})
