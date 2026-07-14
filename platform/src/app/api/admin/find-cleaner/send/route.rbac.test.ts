import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — admin/find-cleaner/send/route.ts.
 * Ported from sibling branch commit d90ea8c3 (was never on this branch):
 * mass-SMS broadcast to team members previously only checked for a valid
 * tenant session via getTenantForRequest(), which succeeds for ANY
 * tenant_members row regardless of role. Proves it now requires
 * campaigns.send and never sends/inserts a broadcast when denied.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let sendSMSCalls = 0
vi.mock('@/lib/sms', () => ({
  sendSMS: async () => {
    sendSMSCalls++
    return { success: true }
  },
}))

let currentTenantId: string
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: currentTenantId }, error: null }
  ),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-A'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(): Request {
  return new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({
      job_date: '2026-08-01',
      start_time: '09:00',
      duration_hours: 2,
      cleaner_ids: ['tm-a1'],
      confirmed: true,
    }),
  })
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_ID
  permissionError = null
  sendSMSCalls = 0
  fake._seed('tenants', [{ id: TENANT_ID, name: 'Acme', telnyx_api_key: 'key', telnyx_phone: '+15551234567' }])
  // TEST_MODE (find-cleaner/preview/route.ts) is hard-coded true, so the
  // seeded recipient must match TEST_CLEANER_NAME_SUBSTRING ('jeff tucker').
  fake._seed('team_members', [
    { id: 'tm-a1', tenant_id: TENANT_ID, name: 'Jeff Tucker', phone: '+15559990001', preferred_language: 'en', hourly_rate: 25 },
  ])
})

describe('admin/find-cleaner/send POST — permission gate', () => {
  it('a caller with campaigns.send can broadcast to team members (positive control)', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(sendSMSCalls).toBe(1)
    expect(fake._store.get('cleaner_broadcasts')?.length).toBe(1)
  })

  it('a role lacking campaigns.send is forbidden and no broadcast is sent', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await POST(req())
    expect(res.status).toBe(403)
    expect(sendSMSCalls).toBe(0)
    expect(fake._store.get('cleaner_broadcasts')?.length ?? 0).toBe(0)
  })
})
